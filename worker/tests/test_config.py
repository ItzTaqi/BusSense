import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import config


def test_k_min_is_at_least_three() -> None:
    assert config.K_MIN >= 3


def test_k_min_not_overridable_by_env(monkeypatch) -> None:
    monkeypatch.setenv("K_MIN", "1")
    import importlib

    importlib.reload(config)
    assert config.K_MIN == 3
