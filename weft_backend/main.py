import os
import subprocess
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import click
import uvicorn
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from loguru import logger
from watchfiles import awatch

from weft_backend.dao import load_dao

_FRONTEND_DIR = Path(__file__).resolve().parent.parent / "weft-frontend"


def make_app(yaml_path: str) -> FastAPI:
    """Build the FastAPI app bound to *yaml_path*."""

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        proc = None
        if _FRONTEND_DIR.is_dir():
            if not (_FRONTEND_DIR / ".next").is_dir():
                logger.info("building frontend")
                subprocess.run(
                    ["npm", "run", "build"],
                    cwd=_FRONTEND_DIR,
                    check=True,
                )
            logger.info("starting frontend")
            proc = subprocess.Popen(
                ["npm", "run", "start"],
                cwd=_FRONTEND_DIR,
                stdout=sys.stdout,
                stderr=sys.stderr,
            )
        try:
            yield
        finally:
            if proc:
                proc.terminate()
                proc.wait()

    app = FastAPI(lifespan=lifespan)

    @app.get("/moai")
    def get_moai():
        return load_dao(yaml_path).moai or {}

    @app.get("/moai-link")
    def get_moai_link():
        dao = load_dao(yaml_path)
        if not dao.moai_link:
            return {"nodes": [], "links": []}
        name_to_key = {m.full_name: k for k, m in (dao.moai or {}).items()}
        nodes: dict[str, dict] = {}
        links = []
        for label, link_list in dao.moai_link.items():
            for link in link_list:
                a, b = link.moais
                sk = name_to_key.get(a.full_name, a.full_name)
                tk = name_to_key.get(b.full_name, b.full_name)
                nodes[sk] = {"id": sk, "full_name": a.full_name}
                nodes[tk] = {"id": tk, "full_name": b.full_name}
                links.append({
                    "source": sk,
                    "target": tk,
                    "label": label,
                    "relations": link.relations,
                    "bidirectional": link.bidirectional,
                })
        return {"nodes": list(nodes.values()), "links": links}

    @app.get("/events")
    async def events():
        async def stream():
            async for _ in awatch(yaml_path):
                yield "data: reload\n\n"

        return StreamingResponse(stream(), media_type="text/event-stream")

    return app


@click.command()
@click.argument("yaml", default=os.environ.get("DAO_YAML", "tests/example1.yml"))
@click.option("--host", default="127.0.0.1", show_default=True)
@click.option("--port", default=8000, show_default=True, type=int)
def main(yaml: str, host: str, port: int):
    """WEFT backend – timeline API server.

    Binds a YAML world-definition file and serves the FastAPI + Next.js dev server.
    """
    logger.info("binding YAML: {}", yaml)
    load_dao(yaml)
    app = make_app(yaml)
    logger.info("serving on {}:{}", host, port)
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    main()
