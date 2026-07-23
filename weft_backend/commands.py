"""PyTauri commands exposed to the desktop frontend."""

from pytauri import Commands

from weft_backend.command_handlers import (
    get_drift,
    get_moai,
    get_moai_link,
    get_narrative,
    get_story,
)

commands = Commands()
for handler in (get_story, get_moai, get_drift, get_narrative, get_moai_link):
    commands.command()(handler)
