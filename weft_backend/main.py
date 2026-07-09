import os

import click
import uvicorn
from loguru import logger

from weft_backend.app import make_app


@click.group()
def cli():
    """WEFT – World-building, Era, and Fantasy Timeline."""


@cli.command()
@click.argument("yaml", default=os.environ.get("DAO_YAML", "tests/example1.yml"))
@click.option("--host", default="127.0.0.1", show_default=True)
@click.option("--port", default=8001, show_default=True, type=int)
def serve(yaml: str, host: str, port: int):
    """Start the timeline API server."""
    app = make_app(yaml, host, port)
    logger.info("serving on {}:{}", host, port)
    uvicorn.run(app, host=host, port=port)


if __name__ == "__main__":
    cli()
