"""[CORE] Track continuity.

THE IDEA: a bus candidate appears every 15 s. We need to know "is this the same bus as before?"
so the dot on the parent's screen glides instead of jumping or duplicating.

THE MATH:
  * State per track: [x, y, vx, vy]. Constant-velocity Kalman filter:
      predict:  x' = F x,  P' = F P F^T + Q      (F adds vx*dt to x, vy*dt to y)
      update:   K = P H^T (H P H^T + R)^-1;  x = x' + K (z - H x');  P = (I - K H) P'
    Measurement noise  sigma = 15 m / sqrt(n_riders)  (more phones -> trust the average more).
  * Association: cost[i][j] = distance(predicted track i, candidate j); gate at 150 m (cost = inf above).
    scipy.optimize.linear_sum_assignment (Hungarian) picks the best one-to-one matching.
  * Lifecycle: LIVE if a candidate matched within 60 s; RECENT for the next 1-5 min; then dropped.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from scipy.optimize import linear_sum_assignment

GATE_M = 150.0
LIVE_S = 60
DROP_S = 5 * 60


ACCEL_NOISE = 1.0  # m/s^2 process noise: how much a bus's speed may wander between updates


def measurement_sigma(n_riders: int) -> float:
    return 15.0 / float(np.sqrt(max(n_riders, 1)))


@dataclass
class Track:
    track_id: str
    state: np.ndarray       # [x, y, vx, vy]
    cov: np.ndarray         # 4x4
    last_seen_t: float
    n_riders: int

    def predict(self, dt: float) -> None:
        f = np.eye(4)
        f[0, 2] = f[1, 3] = dt
        q = ACCEL_NOISE**2 * np.array([
            [dt**4 / 4, 0, dt**3 / 2, 0], [0, dt**4 / 4, 0, dt**3 / 2],
            [dt**3 / 2, 0, dt**2, 0], [0, dt**3 / 2, 0, dt**2]])
        self.state = f @ self.state
        self.cov = f @ self.cov @ f.T + q

    def update(self, xy: np.ndarray, n_riders: int, t: float) -> None:
        h = np.zeros((2, 4))
        h[0, 0] = h[1, 1] = 1.0
        r = np.eye(2) * measurement_sigma(n_riders) ** 2
        k = self.cov @ h.T @ np.linalg.inv(h @ self.cov @ h.T + r)
        self.state = self.state + k @ (np.asarray(xy, float) - h @ self.state)
        self.cov = (np.eye(4) - k @ h) @ self.cov
        self.last_seen_t, self.n_riders = t, n_riders

    def status(self, now: float) -> str:
        """'LIVE' | 'RECENT' | 'DROPPED'"""
        age = now - self.last_seen_t
        if age <= LIVE_S:
            return "LIVE"
        return "RECENT" if age <= DROP_S else "DROPPED"


def associate(tracks: list[Track], candidates: np.ndarray) -> list[tuple[int, int]]:
    """Return (track_idx, candidate_idx) pairs using the Hungarian algorithm with the 150 m gate.
    Tracks must already be predicted to the candidates' time."""
    if not tracks or len(candidates) == 0:
        return []
    pred = np.array([t.state[:2] for t in tracks])
    dist = np.linalg.norm(pred[:, None, :] - np.asarray(candidates, float)[None, :, :], axis=2)
    cost = np.where(dist <= GATE_M, dist, 1e9)  # gated pairs are made unattractive, then dropped
    rows, cols = linear_sum_assignment(cost)
    return [(int(r), int(c)) for r, c in zip(rows, cols) if dist[r, c] <= GATE_M]
