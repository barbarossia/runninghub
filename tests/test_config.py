"""Tests for configuration management."""

import os
import tempfile
from pathlib import Path
import pytest

from runninghub_cli.config import Config


# Clean up environment variables before each test
@pytest.fixture(autouse=True)
def clean_env():
    """Clean environment variables before each test."""
    env_vars = ["RUNNINGHUB_API_KEY", "RUNNINGHUB_WORKFLOW_ID", "RUNNINGHUB_API_HOST"]
    for var in env_vars:
        if var in os.environ:
            del os.environ[var]
    yield


def test_config_with_env_file():
    """Test configuration loading from .env file."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.env', delete=False) as f:
        f.write("RUNNINGHUB_API_KEY=test_key_123\n")
        f.write("RUNNINGHUB_WORKFLOW_ID=workflow_456\n")
        f.write("RUNNINGHUB_API_HOST=test.host.com\n")
        env_file = f.name

    try:
        config = Config(env_file)
        assert config.api_key == "test_key_123"
        assert config.workflow_id == "workflow_456"
        assert config.api_host == "test.host.com"
        assert config.validate() is True
    finally:
        os.unlink(env_file)


def test_config_missing_api_key():
    """Test error when API key is missing."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.env', delete=False) as f:
        f.write("RUNNINGHUB_WORKFLOW_ID=workflow_456\n")
        env_file = f.name

    try:
        config = Config(env_file)
        with pytest.raises(ValueError, match="RUNNINGHUB_API_KEY not found"):
            _ = config.api_key
    finally:
        os.unlink(env_file)


def test_config_missing_workflow_id():
    """Test error when workflow ID is missing."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.env', delete=False) as f:
        f.write("RUNNINGHUB_API_KEY=test_key_123\n")
        env_file = f.name

    try:
        config = Config(env_file)
        with pytest.raises(ValueError, match="RUNNINGHUB_WORKFLOW_ID not found"):
            _ = config.workflow_id
    finally:
        os.unlink(env_file)


def test_config_default_api_host():
    """Test default API host when not specified."""
    with tempfile.NamedTemporaryFile(mode='w', suffix='.env', delete=False) as f:
        f.write("RUNNINGHUB_API_KEY=test_key_123\n")
        f.write("RUNNINGHUB_WORKFLOW_ID=workflow_456\n")
        env_file = f.name

    try:
        config = Config(env_file)
        assert config.api_host == "www.runninghub.cn"
    finally:
        os.unlink(env_file)


def test_config_nonexistent_file():
    """Test configuration when .env file doesn't exist."""
    config = Config("nonexistent.env")
    # Should not raise error, but should fail when accessing properties
    with pytest.raises(ValueError, match="RUNNINGHUB_API_KEY not found"):
        _ = config.api_key