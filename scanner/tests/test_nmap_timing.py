import pytest

from argos_scanner.config import validate_nmap_timing


@pytest.mark.parametrize("timing", ["-T2", "-T3", "-T0", "-T5"])
def test_validate_nmap_timing_allows_template(timing: str) -> None:
    assert validate_nmap_timing(timing) == timing


@pytest.mark.parametrize("timing", ["-T9", "--script=evil", "-T3;id", ""])
def test_validate_nmap_timing_rejects_other_values(timing: str) -> None:
    with pytest.raises(ValueError, match="ARGOS_NMAP_TIMING"):
        validate_nmap_timing(timing)
