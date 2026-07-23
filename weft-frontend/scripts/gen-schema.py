#!/usr/bin/env python3
"""Dump a JSON schema of the backend pydantic models for TS type generation.

Replaces the old FastAPI OpenAPI dump (FastAPI has been removed). Wraps each
model's ``model_json_schema`` into an OpenAPI-shaped ``components.schemas`` so
``openapi-typescript`` can consume it unchanged.
"""

import json
import sys
from pathlib import Path

from weft_backend.dao import Drift, Moai, Narrative, Story
from weft_backend.graph import GraphLink, GraphNode, LinkGraph

MODELS = {
    "Story": Story,
    "Moai": Moai,
    "Drift": Drift,
    "Narrative": Narrative,
    "LinkGraph": LinkGraph,
    "GraphNode": GraphNode,
    "GraphLink": GraphLink,
}


def main() -> None:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("lib/openapi.json")
    # `mode="serialization"` respects `Field(exclude=True)` (the Aqueduct field
    # can't be JSON-schema'd and is excluded from API output anyway).
    # `ref_template` + merging each model's `$defs` yields OpenAPI-shaped
    # `components.schemas` with `$ref`s that resolve (so openapi-typescript
    # accepts it).
    components: dict[str, dict] = {}
    for name, model in MODELS.items():
        schema = model.model_json_schema(
            mode="serialization", ref_template="#/components/schemas/{model}"
        )
        components.update(schema.pop("$defs", {}))
        components[name] = schema
    doc = {"openapi": "3.1.0", "components": {"schemas": components}}
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()
