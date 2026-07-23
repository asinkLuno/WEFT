import asyncio

from weft_backend.mcp_server import mcp, resolve_timeline, validate_story


def test_mcp_tools_use_real_domain_models() -> None:
    assert validate_story("examples/红楼梦.yml")["valid"] is True
    timeline = resolve_timeline("examples/红楼梦.yml")
    assert timeline["date_mode"] == "gregorian"
    assert timeline["moais"]
    assert timeline["drifts"]


def test_mcp_server_registers_expected_tools() -> None:
    tools = asyncio.run(mcp.list_tools())
    assert {tool.name for tool in tools} == {
        "get_narrative",
        "get_story_schema",
        "inspect_story",
        "list_moai",
        "resolve_timeline",
        "validate_story",
    }
