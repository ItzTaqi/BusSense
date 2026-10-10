"""Worker loop (every 15 s): points -> companions -> tracks -> bus_tracks / bus_status.
Uses the goyellow_worker DB role (cannot read account tables).
Run: WORKER_DATABASE_URL=... python main.py   (from worker/)
"""
from __future__ import annotations

import os
import time
import uuid

import numpy as np
import psycopg
from pyproj import Transformer

from companions import candidate_position, detect_buses
from config import K_MIN, PROJECTED_CRS
from eta import compute_delta, eta_seconds, source_for
from pipeline import along_route, majority_label, round_public, stops_away
from tracker import Track, associate

INTERVAL_S = 15
to_m = Transformer.from_crs("EPSG:4326", PROJECTED_CRS, always_xy=True)
to_ll = Transformer.from_crs(PROJECTED_CRS, "EPSG:4326", always_xy=True)
tracks: list[Track] = []
track_label: dict[str, str | None] = {}


def load_points(conn: psycopg.Connection):
    rows = conn.execute(
        "select trip_token::text, extract(epoch from t), st_x(geom::geometry), st_y(geom::geometry), "
        "declared_bus from trip_points where t > now() - interval '240 seconds' order by t").fetchall()
    pts: dict[str, list[list[float]]] = {}
    labels: dict[str, str] = {}
    for tok, t, lon, lat, bus in rows:
        x, y = to_m.transform(lon, lat)
        pts.setdefault(tok, []).append([float(t), x, y])
        labels[tok] = bus
    return {k: np.array(v) for k, v in pts.items()}, labels


def load_route(conn: psycopg.Connection, label: str):
    r = conn.execute("select st_astext(shape::geometry) from routes where route_label=%s", (label,)).fetchone()
    if not r or not r[0]:
        return None
    coords = [tuple(map(float, c.split())) for c in r[0][11:-1].split(",")]
    shape = np.array([to_m.transform(lon, lat) for lon, lat in coords])
    stops = conn.execute("select seq, st_x(geom::geometry), st_y(geom::geometry) from stops "
                         "where route_label=%s order by seq", (label,)).fetchall()
    return shape, np.array([to_m.transform(lon, lat) for _, lon, lat in stops])


def tick(conn: psycopg.Connection) -> None:
    now = time.time()
    points, labels = load_points(conn)
    groups = detect_buses(points)
    cands, members = [], []
    for g in groups:
        assert len(g) >= K_MIN  # privacy floor, double-checked at the publish boundary
        cands.append(candidate_position(g, points)); members.append(g)
    for tr in tracks:
        tr.predict(INTERVAL_S)
    pairs = associate(tracks, np.array(cands)) if cands else []
    matched = set()
    for ti, ci in pairs:
        tracks[ti].update(cands[ci], len(members[ci]), now); matched.add(ci)
    for ci, g in enumerate(members):
        if ci not in matched:
            xy = cands[ci]
            tracks.append(Track(str(uuid.uuid4()), np.array([xy[0], xy[1], 0, 0]), np.eye(4) * 400, now, len(g)))
            matched.add(ci)
            pairs.append((len(tracks) - 1, ci))
    for ti, ci in pairs:
        label = majority_label([labels.get(t, "") for t in members[ci]])
        track_label[tracks[ti].track_id] = label
        lon, lat = to_ll.transform(*round_public(tracks[ti].state[:2]))
        conn.execute(
            "insert into bus_tracks(track_id, route_label, t, centroid_geom, n_riders, source) "
            "values (%s,%s,now(),st_setsrid(st_makepoint(%s,%s),4326)::geography,%s,'live')",
            (tracks[ti].track_id, label, lon, lat, len(members[ci])))
        for tok in members[ci]:
            conn.execute("update trip_ends set published=true, max_riders=greatest(max_riders,%s) "
                         "where trip_token=%s", (len(members[ci]), tok))
        publish_status(conn, tracks[ti], label, now)
    tracks[:] = [t for t in tracks if t.status(now) != "DROPPED"]


def publish_status(conn: psycopg.Connection, tr: Track, label: str | None, now: float) -> None:
    if not label:
        return
    route = load_route(conn, label)
    if route is None:
        return
    shape, stops_xy = route
    segs = conn.execute("select from_seq, array_agg(seconds) from segment_times where route_label=%s "
                        "group by from_seq order by from_seq", (label,)).fetchall()
    seg_times = [np.array(s[1], float) for s in segs]
    status = tr.status(now)
    for seq in range(1, len(stops_xy) + 1):
        away = stops_away(shape, stops_xy, tr.state[:2], seq)
        if away is None:
            continue
        i = max(0, seq - 1 - away)  # segment the bus is on
        if seq - 1 > len(seg_times) or not seg_times:
            eta_min = lo = hi = None
        else:
            eta, lo_s, hi_s = eta_seconds(seg_times, min(i, len(seg_times)), min(seq - 1, len(seg_times)),
                                          compute_delta(1.0, [1.0]))
            eta_min, lo, hi = eta / 60, lo_s / 60, hi_s / 60
        src = "LIVE" if status == "LIVE" else "RECENT"
        conn.execute(
            "insert into bus_status(route_label, stop_id, stops_away, eta_min, eta_lo, eta_hi, source, updated_at) "
            "select %s, stop_id, %s, %s, %s, %s, %s, now() from stops where route_label=%s and seq=%s "
            "on conflict (route_label, stop_id) do update set stops_away=excluded.stops_away, "
            "eta_min=excluded.eta_min, eta_lo=excluded.eta_lo, eta_hi=excluded.eta_hi, "
            "source=excluded.source, updated_at=now()",
            (label, away, eta_min, lo, hi, src, label, seq))


def main() -> None:
    _ = source_for, along_route  # imported for the ESTIMATE path (see TODO in docs/ARCHITECTURE.md)
    with psycopg.connect(os.environ["WORKER_DATABASE_URL"], autocommit=True) as conn:
        while True:
            start = time.time()
            tick(conn)
            time.sleep(max(0.0, INTERVAL_S - (time.time() - start)))


if __name__ == "__main__":
    main()
