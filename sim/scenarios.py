"""Adversarial scenarios from the spec. Each returns (points_by_token, expected_bus_count)."""
from __future__ import annotations

import numpy as np

from .synth import bus_path, riders_on, sample_rider, smooth_path

WINDOW = 180


def three_siblings_in_car(rng):
    return riders_on(smooth_path(WINDOW), 3, rng), 0


def car_tailing_bus(rng):
    bus = bus_path(WINDOW, rng)
    pts = riders_on(bus, 3, rng)
    tail = smooth_path(WINDOW, speed=float(np.mean(np.diff(bus[:, 1]))))
    tail[:, 1] -= 25.0  # 25 m behind: close, but no matching stops
    pts.update({f"car{i}": sample_rider(tail, rng) for i in range(1)})
    return pts, 1  # the bus is real; the tailing car must NOT join it (checked by size==3)


def two_buses_overlapping(rng):
    a = bus_path(WINDOW + 60, rng)
    b = a.copy()
    b[:, 0] += 60  # same route, 1 minute later
    b = b[b[:, 0] < WINDOW + 60]
    pts = {f"a{k}": v for k, v in riders_on(a, 3, rng).items()}
    pts.update({f"b{k}": v for k, v in riders_on(b, 3, rng).items()})
    return pts, 2


def walkers_after_exit(rng):
    return riders_on(smooth_path(WINDOW, speed=1.4), 3, rng, sigma_m=5), 0


def only_two_riders(rng):
    return riders_on(bus_path(WINDOW, rng), 2, rng), 0  # 0 LIVE buses (ESTIMATE only)


SCENARIOS = {
    "siblings_in_car": three_siblings_in_car,
    "car_tailing_bus": car_tailing_bus,
    "two_buses": two_buses_overlapping,
    "walkers": walkers_after_exit,
    "two_riders": only_two_riders,
}
