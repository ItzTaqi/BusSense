"""[CORE] Route learning.

THE IDEA: after >= 5 published trips with the same bus label, average them into a route line and
find where the bus usually stops, so we can say "2 stops away" without anyone typing the route.

THE MATH:
  * Shape: resample each trip path to N equally spaced points along its length, then take the
    per-index median x, y (median ignores a trip that took a detour). Optionally snap with OSRM.
  * Stops: collect every pause location (speed < ~1 m/s for >= 8 s) from all trips; run DBSCAN
    (eps = 30 m, min_samples = ceil(0.6 * n_trips)) so a cluster = a place where >= 60% of trips paused.
    Order clusters by distance along the shape -> stop sequence 1..M.
  * Segment times: time between consecutive stops per trip -> rows for segment_times.
"""
from __future__ import annotations

import itertools
import math

import numpy as np
from sklearn.cluster import DBSCAN

MIN_TRIPS = 5


def resample_path(path: np.ndarray, n: int = 200) -> np.ndarray:
    seg = np.linalg.norm(np.diff(path, axis=0), axis=1)
    arc = np.concatenate([[0.0], np.cumsum(seg)])
    target = np.linspace(0.0, arc[-1], n)
    return np.column_stack([np.interp(target, arc, path[:, 0]), np.interp(target, arc, path[:, 1])])


def learn_shape(trips: list[np.ndarray]) -> np.ndarray:
    stack = np.stack([resample_path(t) for t in trips])  # (n_trips, 200, 2)
    return np.median(stack, axis=0)


def learn_stops(pauses_per_trip: list[np.ndarray], shape: np.ndarray) -> np.ndarray:
    """pauses_per_trip: list of (m,2) xy pause points per trip. Returns (k,2) ordered stop xy."""
    n_trips = len(pauses_per_trip)
    pts = [(p, i) for i, ps in enumerate(pauses_per_trip) for p in np.asarray(ps, float).reshape(-1, 2)]
    if not pts:
        return np.empty((0, 2))
    xy = np.array([p for p, _ in pts])
    trip_ids = np.array([i for _, i in pts])
    labels = DBSCAN(eps=30.0, min_samples=2).fit_predict(xy)
    need = math.ceil(0.6 * n_trips)
    centers = [xy[labels == lab].mean(axis=0) for lab in set(labels) - {-1}
               if len(set(trip_ids[labels == lab])) >= need]  # distinct TRIPS, not raw points
    if not centers:
        return np.empty((0, 2))
    along = [int(np.argmin(np.linalg.norm(shape - c, axis=1))) for c in centers]
    return np.array([centers[i] for i in np.argsort(along)])


def segment_durations(stop_times: list[float]) -> list[float]:
    """Seconds between consecutive stop arrivals on ONE trip -> rows for segment_times."""
    return [b - a for a, b in itertools.pairwise(stop_times)]
