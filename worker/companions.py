"""[CORE] Companion detection.

THE IDEA (read this aloud in the video):
  A school bus is a group of phones that stay close AND stop and start at the same moments.
  Cars driving together stay close but do not share a bus's stop-and-go rhythm, so we test both.

THE MATH:
  1. For each token take the last WINDOW_S seconds and linearly interpolate onto a shared
     GRID_S-second time grid. Drop tokens covering < MIN_COVERAGE of the grid.
  2. Build a KD-tree on projected (x, y) metres and only compare pairs within PAIR_RADIUS_M.
  3. Pair (a, b) are companions if
       fraction of grid times with distance(a_t, b_t) <= CLOSE_M     is >= CLOSE_FRACTION  AND
       fraction of a's stop events whose (start, end) are within STOP_MATCH_S of one of b's
       is >= STOP_MATCH_FRACTION.
     A "stop" = speed < 1 m/s for 8-90 s. (Decide: what if there are zero stops? See the tests.)
  4. Companion graph -> networkx connected components. Components with >= K_MIN tokens are buses.

Input points: dict token -> ndarray with columns [t_s, x_m, y_m] (already projected to EPSG:32617).
Output: list of sets of tokens, one set per bus candidate.
"""
from __future__ import annotations

import networkx as nx
import numpy as np
from scipy.spatial import cKDTree

from config import (
    CLOSE_FRACTION,
    CLOSE_M,
    COVERAGE_GAP_S,
    GRID_S,
    K_MIN,
    MIN_COVERAGE,
    MIN_STOPS_TO_MATCH,
    PAIR_RADIUS_M,
    STOP_MATCH_FRACTION,
    STOP_MATCH_S,
    STOP_MAX_S,
    STOP_MIN_S,
    STOP_SPEED_MPS,
    WINDOW_S,
)


def resample_to_grid(trace: np.ndarray, grid: np.ndarray) -> np.ndarray | None:
    """Return (len(grid), 2) xy at grid times, or None if coverage < MIN_COVERAGE."""
    if len(trace) < 2:
        return None
    t = trace[:, 0]
    # nearest real sample distance for every grid time -> coverage and dropout detection
    idx = np.clip(np.searchsorted(t, grid), 1, len(t) - 1)
    gap = np.minimum(np.abs(grid - t[idx - 1]), np.abs(grid - t[idx]))
    covered = gap <= COVERAGE_GAP_S
    if covered.mean() < MIN_COVERAGE:
        return None
    x = np.interp(grid, t, trace[:, 1])
    y = np.interp(grid, t, trace[:, 2])
    return np.column_stack([x, y])


def _smooth_speed(xy: np.ndarray) -> np.ndarray:
    """3-point moving average of position (cuts GPS noise), then central-difference speed."""
    k = np.ones(3) / 3
    sm = np.column_stack([np.convolve(np.pad(xy[:, a], 1, mode="edge"), k, mode="valid") for a in (0, 1)])
    v = np.zeros(len(xy))
    v[1:-1] = np.linalg.norm(sm[2:] - sm[:-2], axis=1) / (2 * GRID_S)
    v[0], v[-1] = v[1], v[-2]
    return v


def find_stops(xy: np.ndarray, grid: np.ndarray) -> list[tuple[float, float]]:
    """Return [(start_t, end_t)] where speed < 1 m/s lasted 8-90 s."""
    slow = _smooth_speed(xy) < STOP_SPEED_MPS
    for i in range(1, len(slow) - 1):  # bridge a single noisy "moving" blip inside a stop
        if not slow[i] and slow[i - 1] and slow[i + 1]:
            slow[i] = True
    stops: list[tuple[float, float]] = []
    i = 0
    while i < len(slow):
        if not slow[i]:
            i += 1
            continue
        j = i
        while j + 1 < len(slow) and slow[j + 1]:
            j += 1
        start, end = float(grid[i]), float(grid[j])
        if i == 0 or j == len(slow) - 1:  # touches window edge: duration is truncated/unreliable
            i = j + 1
            continue
        if STOP_MIN_S <= (end - start + GRID_S) <= STOP_MAX_S:
            stops.append((start, end))
        i = j + 1
    return stops


def _match_fraction(a: list[tuple[float, float]], b: list[tuple[float, float]]) -> float:
    if not a:
        return 0.0
    hit = sum(any(abs(s - s2) <= STOP_MATCH_S and abs(e - e2) <= STOP_MATCH_S for s2, e2 in b)
              for s, e in a)
    return hit / len(a)


def are_companions(a_xy: np.ndarray, b_xy: np.ndarray, grid: np.ndarray) -> bool:
    close = (np.linalg.norm(a_xy - b_xy, axis=1) <= CLOSE_M).mean()
    if close < CLOSE_FRACTION:
        return False
    sa, sb = find_stops(a_xy, grid), find_stops(b_xy, grid)
    if len(sa) < MIN_STOPS_TO_MATCH or len(sb) < MIN_STOPS_TO_MATCH:
        return False
    # Measure against the SHORTER list: GPS noise can hide a short stop for one phone, and that
    # missed stop should not veto two phones that agree on every stop both of them saw.
    short, long_ = (sa, sb) if len(sa) <= len(sb) else (sb, sa)
    return _match_fraction(short, long_) >= STOP_MATCH_FRACTION


def detect_buses(points: dict[str, np.ndarray]) -> list[set[str]]:
    """Grid -> cKDTree pairs -> are_companions -> networkx components with >= K_MIN tokens."""
    usable = [tr for tr in points.values() if len(tr)]
    if len(usable) < K_MIN:
        return []
    t_end = max(float(tr[-1, 0]) for tr in usable)
    grid = np.arange(t_end - WINDOW_S, t_end + 1e-9, GRID_S)
    grids: dict[str, np.ndarray] = {}
    for tok, tr in points.items():
        window = tr[tr[:, 0] >= grid[0] - COVERAGE_GAP_S]
        g = resample_to_grid(window, grid) if len(window) else None
        if g is not None:
            grids[tok] = g
    if len(grids) < K_MIN:
        return []
    toks = list(grids)
    mean_pos = np.array([grids[t].mean(axis=0) for t in toks])
    tree = cKDTree(mean_pos)
    candidate_pairs = tree.query_pairs(PAIR_RADIUS_M)  # coarse filter: mean positions within 200 m
    # a stop-and-go bus moves a lot in 180 s, so use a generous coarse radius on mean position
    graph = nx.Graph()
    graph.add_nodes_from(toks)
    for i, j in candidate_pairs:
        if are_companions(grids[toks[i]], grids[toks[j]], grid):
            graph.add_edge(toks[i], toks[j])
    return [set(c) for c in nx.connected_components(graph) if len(c) >= K_MIN]


def candidate_position(group: set[str], points: dict[str, np.ndarray]) -> np.ndarray:
    """Bus candidate position = median of members' latest positions."""
    last = np.array([points[t][-1, 1:3] for t in group])
    return np.median(last, axis=0)


__all__ = [
    "are_companions",
    "candidate_position",
    "detect_buses",
    "find_stops",
    "resample_to_grid",
]
