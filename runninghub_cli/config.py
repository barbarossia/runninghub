"""Configuration management for RunningHub CLI."""

import os
from pathlib import Path
from dotenv import load_dotenv
from typing import Optional
from typing import Union


class Config:
    """Manages configuration for RunningHub CLI."""

    def __init__(self, env_file: Optional[str] = None):
        """Initialize configuration.

        Args:
            env_file: Path to .env file. If None, looks for .env in current directory.
        """
        self.env_file = env_file or ".env"
        self._load_env()

    def _load_env(self) -> None:
        """Load environment variables from .env file."""
        env_path = Path(self.env_file)
        if env_path.exists():
            load_dotenv(self.env_file)

    @property
    def api_key(self) -> str:
        """Get the RunningHub API key."""
        api_key = os.getenv("RUNNINGHUB_API_KEY")
        if not api_key:
            raise ValueError(
                "RUNNINGHUB_API_KEY not found in environment. "
                "Please set it in your .env file or environment variables."
            )
        return api_key

    @property
    def workflow_id(self) -> str:
        """Get the RunningHub workflow ID."""
        workflow_id = os.getenv("RUNNINGHUB_WORKFLOW_ID")
        if not workflow_id:
            raise ValueError(
                "RUNNINGHUB_WORKFLOW_ID not found in environment. "
                "Please set it in your .env file or environment variables."
            )
        return workflow_id

    @property
    def api_host(self) -> str:
        """Get the RunningHub API host."""
        return os.getenv("RUNNINGHUB_API_HOST", "www.runninghub.cn")

    @property
    def download_dir(self) -> Path:
        """Get the download directory for output files."""
        download_dir = os.getenv("RUNNINGHUB_DOWNLOAD_DIR", "~/Downloads")
        # Expand ~ to user home and resolve to absolute path
        return Path(download_dir).expanduser().resolve()

    @property
    def image_folder(self) -> Path:
        """Get the source folder containing images to process."""
        image_folder = os.getenv("RUNNINGHUB_IMAGE_FOLDER", ".")
        # Expand ~ to user home and resolve to absolute path
        return Path(image_folder).expanduser().resolve()

    @property
    def prefix_path(self) -> Path:
        """Get the root prefix path for relative folder paths."""
        prefix_path = os.getenv("RUNNINGHUB_PREFIX_PATH", "~")
        # Expand ~ to user home and resolve to absolute path
        return Path(prefix_path).expanduser().resolve()

    def validate(self) -> bool:
        """Validate that required configuration is present.

        Returns:
            True if configuration is valid.

        Raises:
            ValueError: If required configuration is missing.
        """
        try:
            _ = self.api_key
            _ = self.workflow_id
            _ = self.api_host
            _ = self.download_dir
            _ = self.image_folder
            _ = self.prefix_path
            # Create download directory if it doesn't exist
            self.download_dir.mkdir(parents=True, exist_ok=True)
            # Check if image folder exists
            if not self.image_folder.exists():
                raise ValueError(f"Image folder does not exist: {self.image_folder}")
            if not self.image_folder.is_dir():
                raise ValueError(f"Image folder is not a directory: {self.image_folder}")
            # Check if prefix path exists
            if not self.prefix_path.exists():
                raise ValueError(f"Prefix path does not exist: {self.prefix_path}")
            if not self.prefix_path.is_dir():
                raise ValueError(f"Prefix path is not a directory: {self.prefix_path}")
            return True
        except ValueError as e:
            raise e

    def __str__(self) -> str:
        """Return string representation of configuration."""
        try:
            return (
                f"Config(api_key={'*' * len(self.api_key)}, "
                f"workflow_id={self.workflow_id}, "
                f"api_host={self.api_host}, "
                f"download_dir={self.download_dir}, "
                f"image_folder={self.image_folder}, "
                f"prefix_path={self.prefix_path})"
            )
        except ValueError:
            return "Config(incomplete)"