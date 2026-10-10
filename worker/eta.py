"""[CORE] ETA with ranges.

THE IDEA: if the bus is on segment i and we want stop s, add up how long each remaining segment
usually takes, then scale by how fast THIS bus is running today versus usual.

THE MATH:
  ETA = delta * sum_{k=i}^{s-1} median_time[k]
  delta = (today's elapsed time on this route) / (sum of median times of the completed segments),
          clipped to [0.7, 1.8].
  eta_lo / eta_hi use the 20th / 80th percentile segment times in place of the medians
  (also scaled by delta). Baseline for evaluation: the scheduled/median arrival time at the stop.
  With no LIVE/RECENT track -> source ESTIMATE from historical medians, or NO_DATA if < 5 trips.
"""
from __future__ import annotations

import numpy as np

DELTA_MIN, DELTA_MAX = 0.7, 1.8
MIN_TRIPS = 5


def compute_delta(elapsed_s: float, completed_medians_s: list[float]) -> float:
    total = float(sum(completed_medians_s))
    if total <= 0:
        return 1.0
    return float(np.clip(elapsed_s / total, DELTA_MIN, DELTA_MAX))


def eta_seconds(seg_times: list[np.ndarray], i: int, s: int, delta: float) -> tuple[float, float, float]:
    """seg_times[k] = observed durations of segment k. Returns (eta, eta_lo, eta_hi) in seconds."""
    segs = seg_times[i:s]
    eta = delta * sum(float(np.median(x)) for x in segs)
    lo = delta * sum(float(np.percentile(x, 20)) for x in segs)
    hi = delta * sum(float(np.percentile(x, 80)) for x in segs)
    return eta, lo, hi


def source_for(n_trips: int, has_live_or_recent: bool) -> str:
    if has_live_or_recent:
        return "LIVE"  # caller downgrades to RECENT using the track's age
    return "ESTIMATE" if n_trips >= MIN_TRIPS else "NO_DATA"
