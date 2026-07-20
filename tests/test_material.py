from types import SimpleNamespace

import pytest

from weft_backend.aqueduct import Phase, gregorian_aqueduct
from weft_backend.material import constellation


@pytest.mark.parametrize(
    ("month", "day", "expected"),
    [
        (1, 1, "摩羯座"),
        (1, 20, "水瓶座"),
        (2, 18, "水瓶座"),
        (2, 19, "双鱼座"),
        (7, 23, "狮子座"),
        (12, 21, "射手座"),
        (12, 22, "摩羯座"),
    ],
)
def test_constellation_boundaries(month: int, day: int, expected: str):
    moai = SimpleNamespace(
        base_time=Phase(base_time=[2000, month, day, 0, 0, 0]),
        aqueduct=gregorian_aqueduct,
    )

    assert constellation(moai) == expected
