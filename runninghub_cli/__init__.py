"""RunningHub CLI - A command-line interface for RunningHub API."""

__version__ = "0.1.0"
__author__ = "RunningHub CLI Team"

from .client import RunningHubClient
from .config import Config

__all__ = ["RunningHubClient", "Config"]