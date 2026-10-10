"""Precision / recall / F1 / confusion matrix from a CSV of held-out predictions.
Input: eval/data/heldout_predictions.csv with columns trip_id,label,p_bus (label in bus,car,walk).
Output: eval/out/classifier_metrics.csv and eval/out/classifier_confusion.png. Numbers come only from data.
"""
import csv
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

THRESH = 0.7


def main(path: str = "eval/data/heldout_predictions.csv") -> None:
    with open(path) as fh:
        rows = list(csv.DictReader(fh))
    tp = fp = fn = tn = 0
    for r in rows:
        pred, true = float(r["p_bus"]) >= THRESH, r["label"] == "bus"
        tp += pred and true; fp += pred and not true; fn += (not pred) and true; tn += (not pred) and not true
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    out = Path("eval/out"); out.mkdir(exist_ok=True)
    with open(out / "classifier_metrics.csv", "w", newline="") as f:
        w = csv.writer(f); w.writerow(["n", "tp", "fp", "fn", "tn", "precision", "recall", "f1"])
        w.writerow([len(rows), tp, fp, fn, tn, f"{prec:.4f}", f"{rec:.4f}", f"{f1:.4f}"])
    fig, ax = plt.subplots(figsize=(4, 4))
    ax.imshow([[tn, fp], [fn, tp]], cmap="Blues")
    for (i, j), v in {(0, 0): tn, (0, 1): fp, (1, 0): fn, (1, 1): tp}.items():
        ax.text(j, i, v, ha="center", va="center", fontsize=16)
    ax.set_xticks([0, 1], ["pred not bus", "pred bus"]); ax.set_yticks([0, 1], ["not bus", "bus"])
    fig.tight_layout(); fig.savefig(out / "classifier_confusion.png", dpi=150)
    print(f"n={len(rows)} precision={prec:.3f} recall={rec:.3f} f1={f1:.3f}")


if __name__ == "__main__":
    main(*sys.argv[1:])
