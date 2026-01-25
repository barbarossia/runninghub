"""Tests for RunningHub API client."""

import json
from unittest.mock import Mock, patch, MagicMock
import pytest
import requests

from runninghub_cli.client import RunningHubClient


def test_client_initialization():
    """Test client initialization."""
    client = RunningHubClient("test_api_key", "test.host.com")
    assert client.api_key == "test_api_key"
    assert client.api_host == "test.host.com"
    assert client.base_url == "https://test.host.com"


def test_client_default_host():
    """Test client with default host."""
    client = RunningHubClient("test_api_key")
    assert client.api_host == "www.runninghub.cn"
    assert client.base_url == "https://www.runninghub.cn"


@patch('runninghub_cli.client.requests.Session.get')
def test_get_node_info_success(mock_get):
    """Test successful node info retrieval."""
    mock_response = Mock()
    mock_response.json.return_value = {
        "code": 0,
        "data": {
            "nodeInfoList": [
                {"nodeId": "node1", "nodeName": "Test Node", "nodeType": "STRING"}
            ]
        }
    }
    mock_response.raise_for_status.return_value = None
    mock_get.return_value = mock_response

    client = RunningHubClient("test_api_key")
    nodes = client.get_node_info("workflow_123")

    assert len(nodes) == 1
    assert nodes[0]["nodeId"] == "node1"
    mock_get.assert_called_once()


@patch('runninghub_cli.client.requests.Session.get')
def test_get_node_info_api_error(mock_get):
    """Test API error in node info retrieval."""
    mock_response = Mock()
    mock_response.json.return_value = {
        "code": 500,
        "message": "API Error"
    }
    mock_response.raise_for_status.return_value = None
    mock_get.return_value = mock_response

    client = RunningHubClient("test_api_key")
    with pytest.raises(Exception, match="API returned error: API Error"):
        client.get_node_info("workflow_123")


@patch('runninghub_cli.client.requests.Session.post')
def test_submit_task_success(mock_post):
    """Test successful task submission."""
    mock_response = Mock()
    mock_response.json.return_value = {
        "code": 0,
        "data": {
            "taskId": "task_123"
        }
    }
    mock_response.raise_for_status.return_value = None
    mock_post.return_value = mock_response

    client = RunningHubClient("test_api_key")
    node_info = [{"nodeId": "node1", "input": {"type": "STRING", "value": "test"}}]
    task_id = client.submit_task("workflow_123", node_info)

    assert task_id == "task_123"
    mock_post.assert_called_once()


@patch('runninghub_cli.client.requests.Session.post')
def test_get_task_status_success(mock_post):
    """Test successful task status retrieval."""
    mock_response = Mock()
    mock_response.json.return_value = {
        "code": 804,
        "message": "Task is running"
    }
    mock_response.raise_for_status.return_value = None
    mock_post.return_value = mock_response

    client = RunningHubClient("test_api_key")
    status = client.get_task_status("task_123")

    assert status["code"] == 804
    assert status["message"] == "Task is running"


def test_upload_file_not_found():
    """Test file upload with non-existent file."""
    client = RunningHubClient("test_api_key")
    with pytest.raises(FileNotFoundError, match="File not found"):
        client.upload_file("nonexistent_file.jpg")