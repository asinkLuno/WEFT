"""PyTauri commands exposed to the desktop frontend."""

from pytauri import Commands

from weft_backend.command_handlers import (
    close_story,
    get_app_state,
    get_drift,
    get_load_error,
    get_moai,
    get_moai_link,
    get_narrative,
    get_story,
    has_story,
    reload_story,
)

commands = Commands()
for handler in (
    has_story,
    get_story,
    get_moai,
    get_drift,
    get_narrative,
    get_moai_link,
    get_load_error,
    close_story,
    reload_story,
    get_app_state,
):
    commands.command()(handler)
