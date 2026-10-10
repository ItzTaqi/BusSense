import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sim.scenarios import SCENARIOS
from sim.synth import bus_path, riders_on

from companions import detect_buses


def rng(seed=0):
    return np.random.default_rng(seed)


def test_three_riders_on_a_bus_make_one_bus():
    pts = riders_on(bus_path(180, rng()), 3, rng(1))
    groups = detect_buses(pts)
    assert len(groups) == 1 and len(groups[0]) == 3


def test_k_min_two_riders_never_make_a_bus():  # privacy rule: k >= 3
    pts = riders_on(bus_path(180, rng()), 2, rng(1))
    assert detect_buses(pts) == []


def test_five_riders_one_bus():
    groups = detect_buses(riders_on(bus_path(180, rng()), 5, rng(2)))
    assert [len(g) for g in groups] == [5]


@pytest.mark.parametrize("name", ["siblings_in_car", "walkers", "two_riders"])
def test_adversarial_zero_buses(name):
    for seed in range(10):
        pts, expected = SCENARIOS[name](rng(seed))
        assert len(detect_buses(pts)) == expected


def test_two_overlapping_buses_give_exactly_two():
    for seed in range(10):
        pts, expected = SCENARIOS["two_buses"](rng(seed))
        assert len(detect_buses(pts)) == expected


def test_car_tailing_does_not_join_the_bus():
    pts, _ = SCENARIOS["car_tailing_bus"](rng(3))
    groups = detect_buses(pts)
    assert len(groups) == 1 and "car0" not in groups[0]
