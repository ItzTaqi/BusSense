"""False buses over 50 randomized runs per scenario (target 0). Needs worker/companions.py implemented.
Output: eval/out/adversarial.csv. Run from repo root: python -m eval.adversarial
"""
import csv
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, "worker")
from companions import detect_buses

from sim.scenarios import SCENARIOS

RUNS = 50


def main() -> None:
    Path("eval/out").mkdir(exist_ok=True)
    with open("eval/out/adversarial.csv", "w", newline="") as f:
        w = csv.writer(f); w.writerow(["scenario", "runs", "wrong", "expected_buses"])
        for name, fn in SCENARIOS.items():
            wrong = 0
            exp = None
            for seed in range(RUNS):
                pts, exp = fn(np.random.default_rng(1000 + seed))
                if len(detect_buses(pts)) != exp:
                    wrong += 1
            w.writerow([name, RUNS, wrong, exp])
            print(f"{name}: {wrong}/{RUNS} wrong")


if __name__ == "__main__":
    main()
