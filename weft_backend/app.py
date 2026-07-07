import os
import subprocess
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from loguru import logger
from watchfiles import awatch

from weft_backend.dao import Dao, load_dao

_FRONTEND_DIR = Path(__file__).resolve().parent.parent / "weft-frontend"


def _build_link_graph(dao: Dao) -> dict:
    """Pre-transform moai_link into {nodes, links} for the force-graph."""
    links_data: list[dict] = []
    name_to_key = {m.full_name: k for k, m in (dao.moai or {}).items()}
    nodes_map: dict[str, dict] = {}
    for label, link_list in (dao.moai_link or {}).items():
        for link in link_list:
            a, b = link.moais
            sk = name_to_key.get(a.full_name, a.full_name)
            tk = name_to_key.get(b.full_name, b.full_name)
            nodes_map[sk] = {"id": sk, "full_name": a.full_name}
            nodes_map[tk] = {"id": tk, "full_name": b.full_name}
            links_data.append(
                {
                    "source": sk,
                    "target": tk,
                    "label": label,
                    "relations": link.relations,
                    "bidirectional": link.bidirectional,
                }
            )
    return {"nodes": list(nodes_map.values()), "links": links_data}


def _load(yaml_path: str) -> tuple[Dao, dict]:
    """Parse the YAML world and build the link graph (used on boot + reload)."""
    dao = load_dao(yaml_path)
    return dao, _build_link_graph(dao)


def make_app(yaml_path: str, host: str, port: int) -> FastAPI:
    """Build the FastAPI app bound to *yaml_path*, served on host:port."""

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        logger.info("loading DAO from {}", yaml_path)
        app.state.dao, app.state.moai_link_graph = _load(yaml_path)

        proc = None
        if _FRONTEND_DIR.is_dir():
            # ponytail: server components read BACKEND_URL at runtime from the
            # spawned next process env; set it on both build and start.
            fe_env = {**os.environ, "BACKEND_URL": f"http://{host}:{port}"}
            if not (_FRONTEND_DIR / ".next").is_dir():
                logger.info("building frontend")
                subprocess.run(
                    ["npm", "run", "build"],
                    cwd=_FRONTEND_DIR,
                    env=fe_env,
                    check=True,
                )
            logger.info("starting frontend")
            proc = subprocess.Popen(
                ["npm", "run", "start"],
                cwd=_FRONTEND_DIR,
                env=fe_env,
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

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/moai")
    def get_moai(request: Request):
        return request.app.state.dao.moai or {}

    @app.get("/moai/{moai_id}")
    def get_moai_by_id(moai_id: str, request: Request):
        moai = (request.app.state.dao.moai or {}).get(moai_id)
        if moai is None:
            raise HTTPException(status_code=404, detail="moai not found")
        return moai.model_dump()

    @app.get("/moai-link")
    def get_moai_link(request: Request):
        return request.app.state.moai_link_graph

    @app.get("/story")
    def get_story(request: Request):
        return request.app.state.dao.story.model_dump()

    @app.get("/events")
    async def events(request: Request):
        async def stream():
            async for _ in awatch(yaml_path):
                # ponytail: 同步重载, 小 YAML 开发场景够用; 高频/大文件换 run_in_threadpool
                request.app.state.dao, request.app.state.moai_link_graph = _load(
                    yaml_path
                )
                logger.info("reloaded DAO from {}", yaml_path)
                yield "data: reload\n\n"

        return StreamingResponse(stream(), media_type="text/event-stream")

    return app
