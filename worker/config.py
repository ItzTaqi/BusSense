"""Worker parameters. Each value is explained so it can be read aloud in the video."""

# Privacy floor: a bus is published only if this many distinct trip tokens are companions.
# Deliberately a plain constant (no env var, no CLI flag) so it cannot be configured below 3.
K_MIN: int = 3

WINDOW_S = 180            # look back this many seconds of points
GRID_S = 5                # shared resampling grid spacing
MIN_COVERAGE = 0.60       # drop tokens with less than 60% of grid points
PAIR_RADIUS_M = 200       # KD-tree candidate pairs only within this distance
CLOSE_M = 40              # "together" means within 40 m
CLOSE_FRACTION = 0.80     # ...for at least 80% of grid points
STOP_MATCH_S = 10         # stop start/end times must match within +-10 s
STOP_MATCH_FRACTION = 0.70
PROJECTED_CRS = "EPSG:32617"  # UTM zone 17N (Wake County)
STOP_SPEED_MPS = 2.0      # "stopped" threshold on SMOOTHED speed. Spec says 1 m/s on clean data; 8 m GPS noise makes 1 too jumpy.
STOP_MIN_S, STOP_MAX_S = 8, 90
MIN_STOPS_TO_MATCH = 1    # a window with no stop events cannot prove "bus": cars/walkers get no bus
COVERAGE_GAP_S = 10       # a grid time counts as covered if a real sample is within this many seconds
