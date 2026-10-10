"""Pure pipeline helpers used by main.py (testable without a database).

* Label = majority vote of members' declared bus numbers.
* Position along the route, stops-away, public coarsening (round to 50 m).
* Discrete Fréchet distance for route matching / substitute detection (< 150 m = same route).
"""
from __future__ import annotations

from collections import Counter

import numpy as np

PUBLIC_GRID_M = 50.0
FRECHET_MATCH_M = 150.0


def majority_label(labels: list[str]) -> str | None:
    labels = [x for x in labels if x]
    return Counter(labels).most_common(1)[0][0] if labels else None


def round_public(xy: np.ndarray) -> np.ndarray:
    return np.round(np.asarray(xy, float) / PUBLIC_GRID_M) * PUBLIC_GRID_M


def along_route(shape: np.ndarray, xy: np.ndarray) -> float:
    """Distance (m) along the shape of the point on the shape nearest to xy."""
    seg = np.linalg.norm(np.diff(shape, axis=0), axis=1)
    arc = np.concatenate([[0.0], np.cumsum(seg)])
    return float(arc[int(np.argmin(np.linalg.norm(shape - xy, axis=1)))])


def stops_away(shape: np.ndarray, stops_xy: np.ndarray, bus_xy: np.ndarray, my_seq: int) -> int | None:
    """Number of stops between the bus and my stop (my_seq is 1-based). None if bus is past it."""
    bus_s = along_route(shape, bus_xy)
    stop_s = [along_route(shape, s) for s in stops_xy]
    if bus_s > stop_s[my_seq - 1] + 100:
        return None  # passed our stop by >= 100 m
    return sum(1 for k in range(my_seq - 1) if stop_s[k] >= bus_s - 1)


def frechet(p: np.ndarray, q: np.ndarray) -> float:
    """Discrete Fréchet distance between two polylines (dynamic programming)."""
    n, m = len(p), len(q)
    d = np.linalg.norm(p[:, None, :] - q[None, :, :], axis=2)
    ca = np.full((n, m), np.inf)
    ca[0, 0] = d[0, 0]
    for i in range(1, n):
        ca[i, 0] = max(ca[i - 1, 0], d[i, 0])
    for j in range(1, m):
        ca[0, j] = max(ca[0, j - 1], d[0, j])
    for i in range(1, n):
        for j in range(1, m):
            ca[i, j] = max(min(ca[i - 1, j], ca[i - 1, j - 1], ca[i, j - 1]), d[i, j])
    return float(ca[-1, -1])


def matches_route(recent_path: np.ndarray, shape: np.ndarray) -> bool:
    return frechet(recent_path, shape) < FRECHET_MATCH_M


def is_substitute_guess(voted_label: str | None, route_label: str | None) -> bool:
    """Path matches route L but riders declared a different bus number -> likely a substitute."""
    return bool(voted_label and route_label and voted_label != route_label)
