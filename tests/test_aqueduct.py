from weft_backend.aqueduct import gregorian_aqueduct, gregorian_en_aqueduct


def test_humanize_story_origin() -> None:
    assert gregorian_aqueduct.humanize([0, 0, 0, 0, 0, 0]) == "0年0月0日"


def test_english_gregorian_humanize() -> None:
    assert (
        gregorian_en_aqueduct.humanize([2024, 1, 15, 12, 30, 0])
        == "2024 years, 1 month, 15 days, 12 hours, 30 minutes"
    )
    assert (
        gregorian_en_aqueduct.humanize([0, 0, 0, 0, 0, 0])
        == "0 years, 0 months, 0 days"
    )
