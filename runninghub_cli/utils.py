"""Utility functions for RunningHub CLI."""

import json
from typing import Any, Dict, List
from colorama import Fore, Style, init

# Initialize colorama
init(autoreset=True)


def format_json(data: Any, indent: int = 2) -> str:
    """Format data as JSON string.

    Args:
        data: Data to format.
        indent: JSON indentation level.

    Returns:
        Formatted JSON string.
    """
    return json.dumps(data, indent=indent, ensure_ascii=False)


def print_success(message: str) -> None:
    """Print success message in green.

    Args:
        message: Message to print.
    """
    print(f"{Fore.GREEN}✓ {message}{Style.RESET_ALL}")


def print_error(message: str) -> None:
    """Print error message in red.

    Args:
        message: Message to print.
    """
    print(f"{Fore.RED}✗ {message}{Style.RESET_ALL}")


def print_warning(message: str) -> None:
    """Print warning message in yellow.

    Args:
        message: Message to print.
    """
    print(f"{Fore.YELLOW}⚠ {message}{Style.RESET_ALL}")


def print_info(message: str) -> None:
    """Print info message in blue.

    Args:
        message: Message to print.
    """
    print(f"{Fore.BLUE}ℹ {message}{Style.RESET_ALL}")


def format_node_list(nodes: List[Dict[str, Any]]) -> str:
    """Format node list for display.

    Args:
        nodes: List of node dictionaries.

    Returns:
        Formatted string representation.
    """
    if not nodes:
        return "No nodes found."

    output = []
    for i, node in enumerate(nodes, 1):
        node_id = node.get("nodeId", "Unknown")
        node_name = node.get("nodeName", "Unknown")
        node_type = node.get("nodeType", "Unknown")
        description = node.get("description", "")

        output.append(f"{i}. {Fore.CYAN}{node_name}{Style.RESET_ALL} ({node_id})")
        output.append(f"   Type: {node_type}")
        if description:
            output.append(f"   Description: {description}")
        output.append("")

    return "\n".join(output)


def format_task_status(status: Dict[str, Any]) -> str:
    """Format task status for display.

    Args:
        status: Task status dictionary.

    Returns:
        Formatted string representation.
    """
    code = status.get("code", "Unknown")
    message = status.get("message", "")
    data = status.get("data", {})

    status_text = {
        0: f"{Fore.GREEN}Completed{Style.RESET_ALL}",
        804: f"{Fore.YELLOW}Running{Style.RESET_ALL}",
        805: f"{Fore.RED}Failed{Style.RESET_ALL}",
        813: f"{Fore.BLUE}Queuing{Style.RESET_ALL}"
    }.get(code, f"{Fore.MAGENTA}Unknown ({code}){Style.RESET_ALL}")

    output = [f"Status: {status_text}"]

    if message:
        output.append(f"Message: {message}")

    if data:
        if isinstance(data, dict):
            # Format key results
            for key, value in data.items():
                if key not in ["taskId"]:
                    output.append(f"{key}: {value}")
        else:
            output.append(f"Data: {data}")

    return "\n".join(output)