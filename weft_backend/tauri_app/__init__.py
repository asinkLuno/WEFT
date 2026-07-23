"""WEFT pytauri desktop app — Path C entry point.

Runs under either pytauri path: **pytauri-wheel** (dev / pip-install, native ext
on disk) or **standalone** (release installer, ext_mod injected in-memory by the
Rust binary). Loads a story file (CLI arg or file dialog) into the shared
:data:`~weft_backend.state.STATE`, then runs the Tauri app whose commands come
from :mod:`weft_backend.commands`.
"""

import os
import sys
import tempfile
from pathlib import Path

# `_PYTAURI_DIST` must be set before importing pytauri — but only on the wheel
# path. In standalone the ext_mod is injected in-memory (`sys._pytauri_standalone`
# is set by pytauri before this module runs), so we must not override it.
if not getattr(sys, "_pytauri_standalone", False):
    os.environ.setdefault("_PYTAURI_DIST", "pytauri-wheel")

from anyio import create_task_group
from anyio.from_thread import start_blocking_portal
from loguru import logger
from pydantic import BaseModel
from pytauri import AppHandle, Emitter, builder_factory, context_factory
from pytauri_plugins.dialog import DialogExt
from watchfiles import awatch

from weft_backend.commands import commands
from weft_backend.state import STATE

SRC_TAURI_DIR = Path(__file__).parent
_DEV_URL = os.getenv("WEFT_DEV_URL")  # live frontend dev server, else ./frontend


def load_story_from_argv(argv: list[str] | None = None) -> None:
    """Load the story path given as the first CLI arg, if any."""

    args = list(sys.argv if argv is None else argv)
    if len(args) <= 1 or not args[1]:
        return
    path = args[1]
    try:
        STATE.load(path)
        logger.warning("loaded story: {}", STATE.story_path)
    except Exception as exc:  # log and continue — the window still opens
        logger.error("failed to load story {}: {}", path, exc)


class DevAck(BaseModel):
    """Headless validation payload (dev only)."""

    story_title: str
    moai_count: int


@commands.command()
async def dev_ack(body: DevAck) -> str:
    """Dev-only marker: proves the real commands reach pyInvoke with loaded data."""

    marker = Path(tempfile.gettempdir()) / "weft_app_ack.txt"
    marker.write_text(
        f"title={body.story_title!r} moai_count={body.moai_count}", encoding="utf-8"
    )
    return "ack"


@commands.command()
async def open_story(app_handle: AppHandle) -> str | None:
    """Native file dialog → load the picked story → return its title (or None)."""

    picked = await DialogExt.file(app_handle).pick_file()
    if picked is None:
        return None
    path = picked.decode() if isinstance(picked, (bytes, bytearray)) else str(picked)
    STATE.load(path)
    return STATE.dao.story.title


class Reload(BaseModel):
    story_title: str


async def watch_story(app_handle: AppHandle) -> None:
    """Background watcher: reload STATE on story-file change and notify the UI."""

    if STATE.story_path is None:
        return
    path = str(STATE.story_path)
    async for _ in awatch(path):
        try:
            STATE.load(path)
        except Exception as exc:  # parse error etc — keep old state, log and continue
            logger.error("reload of {} failed: {}", path, exc)
            continue
        logger.warning("reloaded story: {}", path)
        # dev marker for headless validation
        Path(tempfile.gettempdir(), "weft_reload.txt").write_text(
            STATE.dao.story.title, encoding="utf-8"
        )
        Emitter.emit(app_handle, "weft-reload", Reload(story_title=STATE.dao.story.title))


def main() -> int:
    load_story_from_argv()
    # `context_factory` differs by path: standalone bakes the Tauri config into the
    # Rust binary (no args); the wheel path reads `Tauri.toml` from disk.
    if getattr(sys, "_pytauri_standalone", False):
        context = context_factory()
    else:
        tauri_config = {"build": {"frontendDist": _DEV_URL}} if _DEV_URL else None
        context = context_factory(SRC_TAURI_DIR, tauri_config=tauri_config)

    with start_blocking_portal("asyncio") as portal, \
            portal.wrap_async_context_manager(
                portal.call(create_task_group)
            ) as _task_group:
        app = builder_factory().build(
            context=context,
            invoke_handler=commands.generate_handler(portal),
        )
        if STATE.loaded:
            portal.start_task_soon(watch_story, app.handle())
        return app.run_return()
