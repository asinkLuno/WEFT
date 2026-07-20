from weft_backend.aqueduct import gregorian_aqueduct


def test_humanize_story_origin() -> None:
    assert gregorian_aqueduct.humanize([0, 0, 0, 0, 0, 0]) == "0年0月0日"
