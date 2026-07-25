"""Spec 4: Narrative.from_dict observer 必须在 moai 注册表里。

字符串 observer 通过类型守门后，还要在传入的 ``moais`` 字典里查得到；
否则抛 ``ReferenceError NARRATIVE_OBSERVER_NOT_FOUND``，``details["observer"]``
钉死原名称。
"""

from __future__ import annotations

import pytest

from weft_backend.aqueduct import gregorian_aqueduct
from weft_backend.dao import Moai, Narrative
from weft_backend.errors import ReferenceError


def _registry(*names: str) -> dict:
    return {
        name: Moai.from_dict(name, {"description": "D"}, gregorian_aqueduct)
        for name in names
    }


@pytest.mark.unit
class TestNarrativeObserverNotFound:
    def test_observer_not_in_registry_raises(self):
        with pytest.raises(ReferenceError) as exc_info:
            Narrative.from_dict(
                data={"subject": [], "observer": "ghost"},
                drifts={},
                moais=_registry("real"),
            )
        err = exc_info.value
        assert err.code == "NARRATIVE_OBSERVER_NOT_FOUND"
        assert err.path == ("narrative", "observer")
        assert err.details == {"observer": "ghost"}

    def test_empty_registry_still_raises_for_any_observer(self):
        # 边界：moais={} 时任何 observer 都不在注册表里。
        with pytest.raises(ReferenceError):
            Narrative.from_dict(
                data={"subject": [], "observer": "anyone"},
                drifts={},
                moais={},
            )
