import pytest

from weft_backend.aqueduct import Aqueduct, Brick, gregorian_aqueduct


def test_gregorian_tick_uses_seconds_as_its_smallest_unit():
    start = [2024, 2, 28, 23, 59, 59]
    end = [2024, 2, 29, 0, 0, 0]

    assert gregorian_aqueduct.distance(start, end) == 1


def test_gregorian_tick_observes_month_lengths_and_leap_years():
    assert gregorian_aqueduct.distance(
        [2023, 2, 1, 0, 0, 0], [2023, 3, 1, 0, 0, 0]
    ) == 28 * 86400
    assert gregorian_aqueduct.distance(
        [2024, 2, 1, 0, 0, 0], [2024, 3, 1, 0, 0, 0]
    ) == 29 * 86400


def test_gregorian_tick_carries_resolved_phase_components():
    assert gregorian_aqueduct.to_tick([2023, 14, 1, 0, 0, 0]) == (
        gregorian_aqueduct.to_tick([2024, 2, 1, 0, 0, 0])
    )
    assert gregorian_aqueduct.to_tick([2024, 1, 1, -1, 0, 0]) == (
        gregorian_aqueduct.to_tick([2023, 12, 31, 23, 0, 0])
    )


def test_aqueduct_without_tick_conversion_is_explicitly_unsupported():
    aqueduct = Aqueduct([Brick("turn", lambda _: 10)])

    with pytest.raises(NotImplementedError):
        aqueduct.to_tick([1])
