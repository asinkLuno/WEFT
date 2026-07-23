from weft_backend.aqueduct import gregorian_aqueduct
from weft_backend.dao import Moai


def make_moai(**data: object) -> Moai:
    return Moai.from_dict("测试角色", data, gregorian_aqueduct)


def test_constellation_still_works() -> None:
    moai = make_moai(
        materials=["constellation"],
        base_time=[1983, 1, 20, 0, 0, 0],
    )

    assert moai.extra_props is not None
    assert moai.extra_props["constellation"] == "水瓶座"
