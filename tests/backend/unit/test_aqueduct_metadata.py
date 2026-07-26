"""Calendar metadata exposed to the desktop story page."""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import (
    AQUEDUCTS,
    Aqueduct,
    AqueductMetadata,
    Brick,
    calendar_metadata_for,
)
from weft_backend.command_handlers import get_calendar_metadata
from weft_backend.dao import Dao
from weft_backend.state import STATE


@pytest.mark.unit
class TestCalendarMetadata:
    def test_builtin_metadata(self):
        metadata = calendar_metadata_for("gregorian")

        assert metadata.name == "gregorian"
        assert metadata.title == "格里高利历"
        assert metadata.units == ["年", "月", "日", "时", "分", "秒"]
        assert metadata.source == "builtin"
        assert metadata.description

    def test_plugin_metadata(self):
        AQUEDUCTS["moon"] = Aqueduct(
            [Brick("轮", lambda ctx: 12), Brick("日", lambda ctx: 30)],
            metadata=AqueductMetadata(
                title="月轮历",
                description="以月轮组织时间。",
            ),
        )

        metadata = calendar_metadata_for("moon")

        assert metadata.title == "月轮历"
        assert metadata.description == "以月轮组织时间。"
        assert metadata.units == ["轮", "日"]
        assert metadata.source == "plugin"

    def test_plugin_without_metadata_falls_back_to_registration_name(self):
        AQUEDUCTS["legacy"] = Aqueduct([Brick("turn", lambda ctx: 10)])

        metadata = calendar_metadata_for("legacy")

        assert metadata.title == "legacy"
        assert metadata.description == ""
        assert metadata.units == ["turn"]
        assert metadata.source == "plugin"

    @pytest.mark.anyio
    async def test_command_uses_current_story_date_mode(self, monkeypatch):
        dao = Dao.from_dict(
            {
                "story": {
                    "title": "English story",
                    "date_mode": "gregorian_en",
                }
            }
        )
        monkeypatch.setattr(STATE, "dao", dao)
        monkeypatch.setattr(STATE, "link_graph", object())

        metadata = await get_calendar_metadata()

        assert metadata.name == "gregorian_en"
        assert metadata.title == "Gregorian Calendar"
