"""Bus-vs-car classifier training.

THE IDEA: buses stop often at regular spots, sit still a lot, and accelerate gently; cars and
walkers don't. A logistic regression turns six numbers into P(bus).

WINDOW: rows of [speed_mps, heading_deg, az] sampled every 5 s over a rolling 180 s (36 rows).
FEATURES: stops_per_km (speed<1 m/s lasting 8-90 s), max_speed, mean_accel_out_of_stops,
  frac_stationary, heading_change_rate_low_speed (deg/s while speed<3), accel_vertical_variance.
MODEL: z = w . ((x - mean) / scale) + b ;  P(bus) = 1 / (1 + e^-z)   (sklearn LogisticRegression).
EXPORT: app/src/classifier/model.json {"features","mean","scale","weights","bias"}.
REPORT: precision/recall/F1/confusion on HELD-OUT TRIPS (split by trip, not by window).
Data: CSV with columns trip_id,label,<FEATURES...>. Use real recordings for any reported accuracy.
"""
from __future__ import annotations

import csv
import json

import numpy as np

FEATURES = ["stops_per_km", "max_speed", "mean_accel_out_of_stops", "frac_stationary",
            "heading_change_rate_low_speed", "accel_vertical_variance"]
DT = 5.0
STOP_V = 1.0
THRESHOLD = 0.7


def _stop_runs(slow: np.ndarray) -> list[tuple[int, int]]:
    runs, i = [], 0
    while i < len(slow):
        if slow[i]:
            j = i
            while j + 1 < len(slow) and slow[j + 1]:
                j += 1
            if 8 <= (j - i + 1) * DT <= 90:
                runs.append((i, j))
            i = j + 1
        else:
            i += 1
    return runs


def window_features(window: np.ndarray) -> list[float]:
    """window: (n, 3) columns [speed_mps, heading_deg, az]. Returns the 6 FEATURES."""
    v, hdg, az = window[:, 0], window[:, 1], window[:, 2]
    slow = v < STOP_V
    runs = _stop_runs(slow)
    km = max(float(np.sum(v) * DT) / 1000.0, 0.05)
    accels = [(v[min(j + 3, len(v) - 1)] - v[min(j + 1, len(v) - 1)]) / (2 * DT) for _, j in runs]
    dh = np.abs((np.diff(hdg) + 180.0) % 360.0 - 180.0)
    low = (v[1:] < 3.0) & (v[:-1] < 3.0)
    return [
        len(runs) / km,
        float(np.max(v)),
        float(np.mean(accels)) if accels else 0.0,
        float(np.mean(slow)),
        float(np.mean(dh[low]) / DT) if low.any() else 0.0,
        float(np.var(az)),
    ]


def sigmoid(z: np.ndarray | float) -> np.ndarray | float:
    return 1.0 / (1.0 + np.exp(-z))


def train_and_export(csv_path: str, out_json: str, preds_csv: str | None = None,
                     seed: int = 0, synthetic: bool = False) -> dict:
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import GroupShuffleSplit
    from sklearn.preprocessing import StandardScaler

    with open(csv_path) as fh:
        rows = list(csv.DictReader(fh))
    x = np.array([[float(r[f]) for f in FEATURES] for r in rows])
    y = np.array([1 if r["label"] == "bus" else 0 for r in rows])
    groups = np.array([r["trip_id"] for r in rows])
    tr, te = next(GroupShuffleSplit(n_splits=1, test_size=0.3, random_state=seed).split(x, y, groups))
    scaler = StandardScaler().fit(x[tr])
    clf = LogisticRegression(class_weight="balanced", max_iter=1000).fit(scaler.transform(x[tr]), y[tr])
    p = clf.predict_proba(scaler.transform(x[te]))[:, 1]
    pred = p >= THRESHOLD
    tp = int(np.sum(pred & (y[te] == 1))); fp = int(np.sum(pred & (y[te] == 0)))
    fn = int(np.sum(~pred & (y[te] == 1))); tn = int(np.sum(~pred & (y[te] == 0)))
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    model = {"features": FEATURES, "mean": scaler.mean_.tolist(), "scale": scaler.scale_.tolist(),
             "weights": clf.coef_[0].tolist(), "bias": float(clf.intercept_[0]),
             "synthetic_placeholder": synthetic}
    with open(out_json, "w") as fh:
        json.dump(model, fh, indent=2)
    if preds_csv:
        with open(preds_csv, "w", newline="") as fh:
            w = csv.writer(fh); w.writerow(["trip_id", "label", "p_bus"])
            for i, pi in zip(te, p, strict=True):
                w.writerow([groups[i], rows[i]["label"], f"{pi:.6f}"])
    return {"precision": prec, "recall": rec, "f1": f1, "confusion": [[tn, fp], [fn, tp]],
            "n_test_windows": len(te), "synthetic": synthetic}
