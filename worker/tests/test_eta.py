import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from eta import compute_delta, eta_seconds, source_for


def test_delta_neutral_and_clipped():
    assert compute_delta(300, [300]) == pytest.approx(1.0)
    assert compute_delta(1000, [300]) == pytest.approx(1.8)
    assert compute_delta(10, [300]) == pytest.approx(0.7)


def test_eta_sums_medians_times_delta():
    segs = [np.array([60.0, 60, 60]), np.array([120.0, 120, 120])]
    eta, lo, hi = eta_seconds(segs, 0, 2, 1.0)
    assert eta == pytest.approx(180)
    assert lo <= eta <= hi


def test_range_uses_20th_80th_percentiles():
    segs = [np.arange(10, 110, 10.0)]
    _, lo, hi = eta_seconds(segs, 0, 1, 1.0)
    assert lo == pytest.approx(np.percentile(segs[0], 20))
    assert hi == pytest.approx(np.percentile(segs[0], 80))


def test_source_estimate_vs_no_data():
    assert source_for(5, False) == "ESTIMATE"
    assert source_for(4, False) == "NO_DATA"
