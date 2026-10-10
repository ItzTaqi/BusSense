import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from tracker import Track, associate, measurement_sigma


def mk(x, y, vx=0.0, vy=0.0, seen=0.0):
    return Track("t", np.array([x, y, vx, vy], float), np.eye(4) * 100, seen, 3)


def test_sigma_shrinks_with_riders():
    assert measurement_sigma(1) == pytest.approx(15.0)
    assert measurement_sigma(4) == pytest.approx(7.5)


def test_predict_moves_by_velocity():
    t = mk(0, 0, 10, 0)
    t.predict(15)
    assert t.state[0] == pytest.approx(150)


def test_update_pulls_toward_measurement_and_shrinks_covariance():
    t = mk(0, 0)
    before = np.trace(t.cov)
    t.update(np.array([10.0, 0.0]), 4, 15.0)
    assert 0 < t.state[0] <= 10 and np.trace(t.cov) < before


def test_association_one_to_one_and_gate():
    tracks = [mk(0, 0), mk(1000, 0)]
    cands = np.array([[1005.0, 0.0], [5.0, 0.0], [5000.0, 0.0]])
    assert sorted(associate(tracks, cands)) == [(0, 1), (1, 0)]  # far candidate unmatched


def test_gate_150m():
    assert associate([mk(0, 0)], np.array([[151.0, 0.0]])) == []


def test_lifecycle():
    t = mk(0, 0, seen=100.0)
    assert t.status(150.0) == "LIVE"
    assert t.status(100 + 120) == "RECENT"
    assert t.status(100 + 400) == "DROPPED"
