"""Python entry point embedded in the standalone Tauri application."""

import sys
import tempfile
from pathlib import Path

from anyio import create_task_group, sleep
from anyio.from_thread import start_blocking_portal
from loguru import logger
from pydantic import BaseModel
from pytauri import AppHandle, Emitter, builder_factory, context_factory
from pytauri_plugins.dialog import DialogExt
from watchfiles import awatch

from weft_backend.commands import commands
from weft_backend.state import STATE


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

    picked = DialogExt.file(app_handle).blocking_pick_file(
        add_filter=("YAML story", ("yaml", "yml")),
        set_title="Open WEFT story",
    )
    if picked is None:
        return None
    path = picked.decode() if isinstance(picked, (bytes, bytearray)) else str(picked)
    STATE.load(path)
    if STATE.dao is None:  # STATE.load either succeeds fully or raises.
        raise RuntimeError("story did not load")
    return STATE.dao.story.title


class Reload(BaseModel):
    story_title: str


async def watch_story(app_handle: AppHandle) -> None:
    """Reload the current story on change and follow newly opened story paths."""

    while True:
        if STATE.story_path is None:
            await sleep(0.1)
            continue

        watched_path = STATE.story_path.resolve()
        async for changes in awatch(
            watched_path.parent,
            recursive=False,
            rust_timeout=500,
            yield_on_timeout=True,
        ):
            current_path = STATE.story_path
            if current_path is None or current_path.resolve() != watched_path:
                break
            if not any(Path(changed_path).resolve() == watched_path
                       for _, changed_path in changes):
                continue

            try:
                STATE.load(watched_path)
            except Exception as exc:  # parse error etc — keep old state
                logger.error("reload of {} failed: {}", watched_path, exc)
                continue
            if STATE.dao is None:  # STATE.load either succeeds fully or raises.
                continue
            story_title = STATE.dao.story.title
            logger.warning("reloaded story: {}", watched_path)
            # dev marker for headless validation
            Path(tempfile.gettempdir(), "weft_reload.txt").write_text(
                story_title, encoding="utf-8"
            )
            Emitter.emit(
                app_handle,
                "weft-reload",
                Reload(story_title=story_title),
            )


def main() -> int:
    load_story_from_argv()
    context = context_factory()

    with start_blocking_portal("asyncio") as portal, \
            portal.wrap_async_context_manager(
                portal.call(create_task_group)
            ) as _task_group:
        app = builder_factory().build(
            context=context,
            invoke_handler=commands.generate_handler(portal),
        )
        portal.start_task_soon(watch_story, app.handle())
        return app.run_return()
