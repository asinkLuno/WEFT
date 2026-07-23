"""WEFT MCP server exposed by the standalone binary in ``mcp`` mode."""

from __future__ import annotations

from pathlib import Path
from typing import Any

from mcp.server.fastmcp import FastMCP

from weft_backend.check import inspect_story as _inspect_story
from weft_backend.check import validate_story as _validate_story
from weft_backend.dao import Drift, Moai, Narrative, Story, load_dao
from weft_backend.graph import GraphLink, GraphNode, LinkGraph

mcp = FastMCP(
    "WEFT",
    instructions=(
        "Read, validate, and inspect WEFT story files. Validate a file after "
        "editing it, especially after changing references or timeline values."
    ),
)


@mcp.tool()
def validate_story(path: str) -> dict[str, object]:
    """Validate a WEFT YAML, JSON, or TOML story file."""

    return _validate_story(path)


@mcp.tool()
def inspect_story(path: str) -> dict[str, object]:
    """Return a summary of a valid WEFT story file."""

    return _inspect_story(path)


@mcp.tool()
def get_story_schema() -> dict[str, Any]:
    """Return the serialized backend model schemas used by WEFT."""

    models = (Story, Moai, Drift, Narrative, GraphNode, GraphLink, LinkGraph)
    schemas: dict[str, Any] = {}
    for model in models:
        schema = model.model_json_schema(mode="serialization")
        schemas.update(schema.pop("$defs", {}))
        schemas[model.__name__] = schema
    return {"schemas": schemas}


@mcp.tool()
def resolve_timeline(path: str) -> dict[str, object]:
    """Resolve event dates and per-entity journal offsets for a story."""

    dao = load_dao(path)
    return {
        "path": str(Path(path)),
        "date_mode": dao.story.date_mode,
        "moais": {
            name: {
                "base_time": moai.base_time_display,
                "journal": moai.journal,
            }
            for name, moai in dao.moai.items()
        },
        "drifts": {
            group: [
                {
                    "id": drift.id,
                    "start": drift.start_time_display,
                    "end": drift.end_time_display,
                    "moais": drift.moais or [],
                }
                for drift in events
            ]
            for group, events in dao.drift.items()
        },
    }


@mcp.tool()
def list_moai(path: str) -> dict[str, object]:
    """List the entities in a valid WEFT story."""

    dao = load_dao(path)
    return {
        name: {
            "description": moai.description,
            "base_time": moai.base_time_display,
            "materials": moai.materials,
            "extra_props": moai.extra_props,
        }
        for name, moai in dao.moai.items()
    }


@mcp.tool()
def get_narrative(path: str, name: str) -> dict[str, object]:
    """Return one resolved narrative outline by name."""

    dao = load_dao(path)
    narrative = dao.narrative[name]
    return {
        "name": name,
        "observer": narrative.observer,
        "subject": narrative.subject,
        "drifts": [
            {
                "id": drift.id,
                "start": drift.start_time_display,
                "end": drift.end_time_display,
                "description": drift.description,
                "moais": drift.moais or [],
            }
            for drift in narrative.drifts
        ],
    }


def main() -> None:
    """Run the local MCP server over stdio."""

    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
