"""Writes app/src/classifier/vectors.json: windows + expected features + expected P(bus) from Python,
so the TypeScript port can be tested to match. Run from repo root: PYTHONPATH=worker python -m classifier.make_vectors
"""
import json

import numpy as np

from classifier.train import sigmoid, window_features


def main() -> None:
    with open("app/src/classifier/model.json") as fh:
        m = json.load(fh)
    rng = np.random.default_rng(42)
    out = []
    for k in range(12):
        v = np.abs(rng.normal(6 if k % 2 else 1, 4, 36)) * (rng.random(36) > (0.3 if k % 3 else 0.05))
        win = np.column_stack([v, rng.uniform(0, 360, 36), rng.normal(0, 1, 36)])
        f = window_features(win)
        z = sum(w * (x - mu) / sc for w, x, mu, sc in zip(m["weights"], f, m["mean"], m["scale"], strict=True)) + m["bias"]
        out.append({"window": win.tolist(), "features": f, "p_bus": float(sigmoid(z))})
    with open("app/src/classifier/vectors.json", "w") as fh:
        json.dump(out, fh)
    print("wrote", len(out), "vectors")


if __name__ == "__main__":
    main()
