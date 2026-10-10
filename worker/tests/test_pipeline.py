import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pipeline import (
    along_route,
    frechet,
    is_substitute_guess,
    majority_label,
    matches_route,
    round_public,
    stops_away,
)

SHAPE = np.column_stack([np.linspace(0, 1000, 101), np.zeros(101)])
STOPS = np.array([[100.0, 0], [400, 0], [800, 0]])


def test_majority_vote():
    assert majority_label(["12", "12", "7", ""]) == "12"
    assert majority_label([]) is None


def test_round_to_50m():
    assert np.allclose(round_public(np.array([74.0, 26.0])), [50, 50])


def test_stops_away_counts_remaining_stops():
    assert stops_away(SHAPE, STOPS, np.array([50.0, 0]), 3) == 2
    assert stops_away(SHAPE, STOPS, np.array([450.0, 0]), 3) == 0  # 0 = my stop is next


def test_passed_stop_is_none():
    assert stops_away(SHAPE, STOPS, np.array([950.0, 0]), 3) is None


def test_along_route():
    assert along_route(SHAPE, np.array([500.0, 30])) == 500.0


def test_frechet_and_route_match():
    near = SHAPE + [0, 40]
    far = SHAPE + [0, 400]
    assert frechet(SHAPE, near) < 150 and matches_route(near, SHAPE)
    assert not matches_route(far, SHAPE)


def test_substitute_guess():
    assert is_substitute_guess("99", "12") and not is_substitute_guess("12", "12")
