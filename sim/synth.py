"""Trip simulator. Produces projected-meter traces: arrays with columns [t_seconds, x_m, y_m].

Bus: stop-and-go along the x axis (stops every ~300 m, 15-30 s dwell).
Riders: a copy of the bus trace + independent Gaussian noise + random 5-20 s dropouts,
        sampled every ~5 s, boarding/exiting at stops. Each rider gets its own random token.
Car/walker: same road, but no bus-style stops.
"""
from __future__ import annotations

import uuid

import numpy as np

Trace = np.ndarray  # shape (N, 3): t, x, y


def bus_path(duration_s: int, rng: np.random.Generator, start_x: float = 0.0,
             stop_every_m: float = 300.0, cruise: float = 9.0) -> Trace:
    """1 Hz ground-truth bus path with accel limits and dwell at stops."""
    t, x, v = 0, start_x, 0.0
    next_stop = start_x + stop_every_m
    dwell = 0
    out = []
    while t < duration_s:
        if dwell > 0:
            dwell -= 1
            v = 0.0
        else:
            brake_dist = v * v / (2 * 1.2)
            if next_stop - x <= brake_dist + 1:
                v = max(0.0, v - 1.2)
                if v == 0.0 or next_stop - x < 1:
                    dwell = int(rng.integers(15, 31))
                    next_stop += stop_every_m
                    v = 0.0
            else:
                v = min(cruise, v + 1.0)
        x += v
        out.append((t, x, 0.0))
        t += 1
    return np.array(out, dtype=float)


def smooth_path(duration_s: int, speed: float = 9.0, start_x: float = 0.0) -> Trace:
    """Car (or walker with speed=1.4) on the same road: constant speed, no stops."""
    t = np.arange(duration_s, dtype=float)
    return np.column_stack([t, start_x + speed * t, np.zeros_like(t)])


def sample_rider(path: Trace, rng: np.random.Generator, sigma_m: float = 8.0,
                 dropout: bool = True, t_offset: float = 0.0) -> Trace:
    """Noisy 5 s samples from a ground-truth path, with random 5-20 s dropouts."""
    ts = np.arange(path[0, 0] + rng.uniform(0, 5), path[-1, 0], 5.0)
    x = np.interp(ts, path[:, 0], path[:, 1]) + rng.normal(0, sigma_m, ts.size)
    y = np.interp(ts, path[:, 0], path[:, 2]) + rng.normal(0, sigma_m, ts.size)
    keep = np.ones(ts.size, bool)
    if dropout:
        i = 0
        while i < ts.size:
            if rng.random() < 0.03:
                n = int(rng.integers(1, 5))  # 5-20 s
                keep[i:i + n] = False
                i += n
            i += 1
    return np.column_stack([ts[keep] + t_offset, x[keep], y[keep]])


def riders_on(path: Trace, n: int, rng: np.random.Generator, sigma_m: float = 8.0) -> dict[str, Trace]:
    return {uuid.UUID(int=int(rng.integers(0, 2**63)) << 64 | int(rng.integers(0, 2**63))).hex:
            sample_rider(path, rng, sigma_m) for _ in range(n)}
