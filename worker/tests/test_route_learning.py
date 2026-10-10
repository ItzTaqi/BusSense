import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from route_learning import learn_shape, learn_stops, resample_path


def test_resample_even_spacing():
    p = resample_path(np.array([[0.0, 0], [100, 0]]), 11)
    assert np.allclose(np.diff(p[:, 0]), 10)


def test_shape_ignores_outlier_trip():
    rng = np.random.default_rng(0)
    base = np.column_stack([np.linspace(0, 1000, 50), np.zeros(50)])
    trips = [base + rng.normal(0, 3, base.shape) for _ in range(5)] + [base + [0, 200]]
    shape = learn_shape(trips)
    assert abs(np.median(shape[:, 1])) < 10


def test_stops_need_60_percent_of_trips():
    rng = np.random.default_rng(1)
    shape = np.column_stack([np.linspace(0, 1000, 100), np.zeros(100)])
    common = [np.array([[300.0, 0], [700, 0]]) + rng.normal(0, 5, (2, 2)) for _ in range(5)]
    rare = common[:1] + [np.array([[300.0, 0], [700, 0], [500, 0]]) + rng.normal(0, 5, (3, 2))]
    stops = learn_stops(common + rare[1:], shape)
    assert len(stops) == 2  # the 500 m pause happened on only 1 of 6 trips
    assert stops[0, 0] < stops[1, 0]
