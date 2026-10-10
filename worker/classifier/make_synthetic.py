"""Writes a SYNTHETIC labeled-window CSV so the pipeline runs before real recordings exist.
Accuracy on this data says NOTHING about real rides. Replace with logging-build data.
Run: PYTHONPATH=worker python -m classifier.make_synthetic  (from repo root, .venv active)
"""
import csv
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from sim.synth import bus_path, smooth_path

from classifier.train import FEATURES, window_features


def _window(path: np.ndarray, rng, az_sd: float) -> np.ndarray:
    xy = path[:, 1:3]
    ts = np.arange(path[0, 0], path[-1, 0] - 1, 5)[:36]
    x = np.interp(ts, path[:, 0], xy[:, 0]); y = np.interp(ts, path[:, 0], xy[:, 1])
    v = np.hypot(np.gradient(x, 5), np.gradient(y, 5)) + np.abs(rng.normal(0, 0.25, ts.size))
    hdg = np.degrees(np.arctan2(np.gradient(y, 5), np.gradient(x, 5))) + rng.normal(0, 25, ts.size) * (v < 2)
    az = rng.normal(0, az_sd, ts.size)
    return np.column_stack([v, hdg, az])


def _car(rng) -> np.ndarray:
    t = np.arange(260.0); v = np.full(260, rng.uniform(8, 16))
    for _ in range(rng.integers(0, 3)):  # traffic lights: fewer and irregular
        s = int(rng.integers(20, 220)); v[s:s + int(rng.integers(8, 40))] = 0.0
    x = np.cumsum(v)
    return np.column_stack([t, x, np.zeros_like(x)])


def main(out="eval/data/synthetic_windows.csv", n_trips=60, seed=0) -> None:
    rng = np.random.default_rng(seed)
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", newline="") as fh:
        w = csv.writer(fh); w.writerow(["trip_id", "label", *FEATURES])
        for k in range(n_trips):
            label = ["bus", "car", "walk"][k % 3]
            if label == "bus":
                path, az = bus_path(260, rng, cruise=float(rng.uniform(7, 12))), 0.9
            elif label == "car":
                path, az = _car(rng), 0.5
            else:
                path, az = smooth_path(260, speed=float(rng.uniform(1.1, 1.7))), 1.3
            for s in range(0, 80, 8):  # overlapping windows from one trip share a trip_id
                win = _window(path[s:], rng, az)
                w.writerow([f"{label}-{k}", label, *[f"{f:.5f}" for f in window_features(win)]])
    print("wrote", out)


if __name__ == "__main__":
    main()
