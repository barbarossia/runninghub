"""Command-line interface for RunningHub API."""

import json
import sys
from pathlib import Path
from typing import List, Optional

import click
from colorama import Fore, Style

from .client import RunningHubClient
from .config import Config
from .utils import (
    format_json,
    format_node_list,
    format_task_status,
    print_error,
    print_info,
    print_success,
    print_warning,
)


@click.group()
@click.option("--env-file", default=".env", help="Path to .env file")
@click.pass_context
def cli(ctx, env_file):
    """RunningHub CLI - A command-line interface for RunningHub API."""
    ctx.ensure_object(dict)

    try:
        config = Config(env_file)
        config.validate()
        ctx.obj["config"] = config
    except ValueError as e:
        print_error(f"Configuration error: {e}")
        print_info("Please check your .env file or environment variables.")
        sys.exit(1)


@cli.command()
@click.pass_context
def config(ctx):
    """Show current configuration."""
    cfg = ctx.obj["config"]

    print_info("Current Configuration:")
    print(f"  API Host: {cfg.api_host}")
    print(f"  Workflow ID: {cfg.workflow_id}")
    print(f"  API Key: {'*' * len(cfg.api_key)} (hidden)")
    print(f"  Download Directory: {cfg.download_dir}")
    print(f"  Image Folder: {cfg.image_folder}")


@cli.command()
@click.pass_context
def nodes(ctx):
    """List available nodes for the workflow."""
    cfg = ctx.obj["config"]
    client = RunningHubClient(cfg.api_key, cfg.api_host)

    try:
        print_info(f"Fetching nodes for workflow: {cfg.workflow_id}")
        nodes = client.get_node_info(cfg.workflow_id)

        if nodes:
            print_success(f"Found {len(nodes)} nodes:")
            print(format_node_list(nodes))
        else:
            print_warning("No nodes found for this workflow.")

    except Exception as e:
        print_error(f"Failed to fetch nodes: {e}")


@cli.command()
@click.argument("file_path", type=click.Path(exists=True))
@click.pass_context
def upload(ctx, file_path):
    """Upload a file to RunningHub."""
    cfg = ctx.obj["config"]
    client = RunningHubClient(cfg.api_key, cfg.api_host)

    try:
        file_id = client.upload_file(file_path)
        print_success(f"File uploaded successfully!")
        print(f"File ID: {file_id}")
        print(f"File path: {file_path}")

    except Exception as e:
        print_error(f"Failed to upload file: {e}")


@cli.command()
@click.option("--node", required=True, help="Node ID to use")
@click.option("--input", "input_value", required=True, help="Input value for the node")
@click.option(
    "--type",
    "input_type",
    default="STRING",
    type=click.Choice(["STRING", "IMAGE", "LIST"]),
    help="Input type (default: STRING)",
)
@click.pass_context
def run(ctx, node, input_value, input_type):
    """Submit a task to RunningHub."""
    cfg = ctx.obj["config"]
    client = RunningHubClient(cfg.api_key, cfg.api_host)

    try:
        # Prepare node configuration using RunningHub API format
        # Based on API response: nodeId, fieldName, fieldValue
        node_config = {
            "nodeId": node,
            "fieldName": "image" if input_type == "IMAGE" else "input",
            "fieldValue": input_value,
            "description": "image" if input_type == "IMAGE" else "input",
        }

        print_info(f"Submitting task to node: {node}")
        task_id = client.submit_task(cfg.workflow_id, [node_config])

        print_success(f"Task submitted successfully!")
        print(f"Task ID: {task_id}")
        print_info("Use 'runninghub status <task_id>' to check progress.")

    except Exception as e:
        print_error(f"Failed to submit task: {e}")


@cli.command()
@click.argument("task_id")
@click.option("--json", "output_json", is_flag=True, help="Output raw JSON")
@click.pass_context
def status(ctx, task_id, output_json):
    """Check the status of a task."""
    cfg = ctx.obj["config"]
    client = RunningHubClient(cfg.api_key, cfg.api_host)

    try:
        status_data = client.get_task_status(task_id)

        if output_json:
            print(format_json(status_data))
        else:
            print_info(f"Task Status: {task_id}")
            print(format_task_status(status_data))

    except Exception as e:
        print_error(f"Failed to get task status: {e}")


@cli.command()
@click.argument("task_id")
@click.option("--timeout", default=600, help="Timeout in seconds (default: 600)")
@click.option(
    "--poll-interval", default=5, help="Poll interval in seconds (default: 5)"
)
@click.option("--json", "output_json", is_flag=True, help="Output raw JSON")
@click.option(
    "--no-download", is_flag=True, help="Skip automatic download of output files"
)
@click.pass_context
def wait(ctx, task_id, timeout, poll_interval, output_json, no_download):
    """Wait for a task to complete."""
    cfg = ctx.obj["config"]
    client = RunningHubClient(cfg.api_key, cfg.api_host)

    try:
        print_info(f"Waiting for task completion: {task_id}")
        final_status = client.wait_for_completion(
            task_id, poll_interval=poll_interval, timeout=timeout
        )

        print_success("Task completed!")

        if output_json:
            print(format_json(final_status))
        else:
            print(format_task_status(final_status))

            # Display results if available
            data = final_status.get("data", {})
            if data:
                print("\nResults:")
                if isinstance(data, list):
                    for i, item in enumerate(data):
                        print(f"  File {i + 1}:")
                        for key, value in item.items():
                            print(f"    {key}: {value}")
                else:
                    for key, value in data.items():
                        if key != "taskId":
                            print(f"  {key}: {value}")

        # Auto-download output files unless disabled
        downloaded_files = []
        if not no_download and not output_json and final_status.get("code") == 0:
            print_info(f"\nDownloading output files to: {cfg.download_dir}")
            try:
                downloaded_files = client.download_task_outputs(
                    final_status, cfg.download_dir
                )
                if downloaded_files:
                    print_success(f"Downloaded {len(downloaded_files)} files:")
                    for file_path in downloaded_files:
                        print(f"  {file_path}")
                else:
                    print_warning("No output files found to download")
            except Exception as e:
                print_error(f"Failed to download files: {e}")

    except TimeoutError as e:
        print_error(f"Timeout waiting for task: {e}")
        sys.exit(1)
    except Exception as e:
        print_error(f"Failed while waiting for task: {e}")
        sys.exit(1)


@cli.command()
@click.argument("file_path", type=click.Path(exists=True))
@click.option("--node", required=True, help="Node ID to use")
@click.option("-p", "--param", "params", multiple=True, help="Additional node parameters (format: nodeId:type:value)")
@click.option("--timeout", default=600, help="Timeout in seconds (default: 600)")
@click.option("--json", "output_json", is_flag=True, help="Output raw JSON")
@click.option(
    "--no-download", is_flag=True, help="Skip automatic download of output files"
)
@click.option(
    "--no-cleanup", is_flag=True, help="Skip automatic deletion of source files"
)
@click.option(
    "--workflow-id", help="Override workflow ID from configuration"
)
@click.pass_context
def process(ctx, file_path, node, timeout, output_json, no_download, no_cleanup, params, workflow_id):
    """Upload a file and process it in one command."""
    source_file_path = file_path
    cfg = ctx.obj["config"]
    # Use provided workflow_id or fall back to config
    active_workflow_id = workflow_id if workflow_id else cfg.workflow_id

    client = RunningHubClient(cfg.api_key, cfg.api_host)

    try:
        # Step 1: Upload file
        print_info(f"Uploading file: {file_path}")
        file_id = client.upload_file(file_path)
        print_success(f"File uploaded successfully! File ID: {file_id}")

        # Step 2: Build node configs
        print_info(f"Submitting task to node: {node}")
        node_configs = []

        # Add image node config
        node_configs.append({
            "nodeId": node,
            "fieldName": "image",
            "fieldValue": file_id,
            "description": "image",
        })

        # Add additional parameter node configs
        for param in params:
            try:
                parts = param.split(':', 2)
                if len(parts) != 3:
                    print_error(f"Invalid parameter format: {param}. Expected format: nodeId:type:value")
                    continue

                node_id, field_type, value = parts
                node_configs.append({
                    "nodeId": node_id,
                    "fieldName": "input" if field_type == "text" else "value",
                    "fieldValue": value,
                    "description": field_type,
                })
                print_info(f"  Added parameter: node {node_id} = {value}")
            except Exception as e:
                print_error(f"Failed to parse parameter '{param}': {e}")

        task_id = client.submit_task(active_workflow_id, node_configs)
        print_success(f"Task submitted successfully! Task ID: {task_id}")

        # Step 3: Wait for completion
        print_info("Waiting for task completion...")
        final_status = client.wait_for_completion(task_id, timeout=timeout)

        print_success("Processing completed!")

        if output_json:
            print(format_json(final_status))
        else:
            print(format_task_status(final_status))

            # Display results if available
            data = final_status.get("data", {})
            if data:
                print("\nResults:")
                if isinstance(data, list):
                    for i, item in enumerate(data):
                        print(f"  File {i + 1}:")
                        for key, value in item.items():
                            print(f"    {key}: {value}")
                else:
                    for key, value in data.items():
                        if key != "taskId":
                            print(f"  {key}: {value}")

        # Auto-download output files unless disabled
        downloaded_files = []
        if not no_download and not output_json and final_status.get("code") == 0:
            print_info(f"\nDownloading output files to: {cfg.download_dir}")
            try:
                downloaded_files = client.download_task_outputs(
                    final_status, cfg.download_dir, input_filename=Path(file_path).stem
                )
                if downloaded_files:
                    print_success(f"Downloaded {len(downloaded_files)} files:")
                    for file_path in downloaded_files:
                        print(f"  {file_path}")
                else:
                    print_warning("No output files found to download")
            except Exception as e:
                print_error(f"Failed to download files: {e}")

        # Auto-cleanup source file unless disabled and download was successful
        if not no_cleanup and downloaded_files and final_status.get("code") == 0:
            try:
                source_path = Path(source_file_path)
                if source_path.exists():
                    source_path.unlink()
                    print_success(f"Deleted source file: {source_path}")
                else:
                    print_warning(f"Source file not found for cleanup: {source_path}")
            except Exception as e:
                print_error(f"Failed to delete source file: {e}")

    except Exception as e:
        print_error(f"Failed to process file: {e}")
        sys.exit(1)


@cli.command("process-multiple")
@click.option("--image", "images", multiple=True, required=True, help="Image input in format <node_id>:<file_path>")
@click.option("-p", "--param", "params", multiple=True, help="Additional node parameters (format: nodeId:type:value)")
@click.option("--timeout", default=600, help="Timeout in seconds (default: 600)")
@click.option("--json", "output_json", is_flag=True, help="Output raw JSON")
@click.option(
    "--no-download", is_flag=True, help="Skip automatic download of output files"
)
@click.option(
    "--workflow-id", help="Override workflow ID from configuration"
)
@click.pass_context
def process_multiple(ctx, images, params, timeout, output_json, no_download, workflow_id):
    """Process multiple files in one workflow."""
    cfg = ctx.obj["config"]
    # Use provided workflow_id or fall back to config
    active_workflow_id = workflow_id if workflow_id else cfg.workflow_id

    client = RunningHubClient(cfg.api_key, cfg.api_host)
    node_configs = []

    try:
        # Step 1: Upload all image files and create node configs
        for image_param in images:
            try:
                node_id, file_path = image_param.split(':', 1)
                if not Path(file_path).exists():
                    print_error(f"Image file not found: {file_path}")
                    return

                print_info(f"Uploading image: {file_path}")
                file_id = client.upload_file(file_path)
                print_success(f"File uploaded successfully! File ID: {file_id}")
                
                node_configs.append({
                    "nodeId": node_id,
                    "fieldName": "image",
                    "fieldValue": file_id,
                    "description": "image",
                })
            except ValueError:
                print_error(f"Invalid image format: {image_param}. Expected <node_id>:<file_path>")
                return
            except Exception as e:
                print_error(f"Failed to upload {image_param}: {e}")
                return

        # Step 2: Add additional text parameter node configs
        for param in params:
            try:
                parts = param.split(':', 2)
                if len(parts) != 3:
                    print_error(f"Invalid parameter format: {param}. Expected format: nodeId:type:value")
                    continue

                node_id, field_type, value = parts
                node_configs.append({
                    "nodeId": node_id,
                    "fieldName": "input" if field_type == "text" else "value",
                    "fieldValue": value,
                    "description": field_type,
                })
                print_info(f"  Added parameter: node {node_id} = {value}")
            except Exception as e:
                print_error(f"Failed to parse parameter '{param}': {e}")

        # Step 3: Submit task
        print_info(f"Submitting task to workflow {active_workflow_id} with multiple inputs...")
        task_id = client.submit_task(active_workflow_id, node_configs)
        print_success(f"Task submitted successfully! Task ID: {task_id}")

        # Step 4: Wait for completion
        print_info("Waiting for task completion...")
        final_status = client.wait_for_completion(task_id, timeout=timeout)
        print_success("Processing completed!")

        if output_json:
            print(format_json(final_status))
        else:
            print(format_task_status(final_status))
            # ... (result printing and download logic can be added here if needed)

    except Exception as e:
        print_error(f"Failed to process multiple files: {e}")
        sys.exit(1)


@cli.command("run-workflow")
@click.option("--image", "images", multiple=True, required=True, help="Image input in format <node_id>:<file_path>")
@click.option("-p", "--param", "params", multiple=True, help="Additional node parameters (format: nodeId:type:value)")
@click.option("--timeout", default=600, help="Timeout in seconds (default: 600)")
@click.option("--json", "output_json", is_flag=True, help="Output raw JSON")
@click.option(
    "--no-download", is_flag=True, help="Skip automatic download of output files"
)
@click.option(
    "--workflow-id", help="Override workflow ID from configuration"
)
@click.pass_context
def run_workflow(ctx, images, params, timeout, output_json, no_download, workflow_id):
    """Run a workflow using /task/openapi/create endpoint."""
    cfg = ctx.obj["config"]
    # Use provided workflow_id or fall back to config
    active_workflow_id = workflow_id if workflow_id else cfg.workflow_id

    client = RunningHubClient(cfg.api_key, cfg.api_host)
    node_configs = []

    try:
        # Step 1: Upload all image files and create node configs
        for image_param in images:
            try:
                node_id, file_path = image_param.split(':', 1)
                if not Path(file_path).exists():
                    print_error(f"Image file not found: {file_path}")
                    return

                print_info(f"Uploading image: {file_path}")
                file_id = client.upload_file(file_path)
                print_success(f"File uploaded successfully! File ID: {file_id}")

                node_configs.append({
                    "nodeId": node_id,
                    "fieldName": "image",
                    "fieldValue": file_id,
                })
            except ValueError:
                print_error(f"Invalid image format: {image_param}. Expected <node_id>:<file_path>")
                return
            except Exception as e:
                print_error(f"Failed to upload {image_param}: {e}")
                return

        # Step 2: Add additional text parameter node configs
        for param in params:
            try:
                parts = param.split(':', 2)
                if len(parts) != 3:
                    print_error(f"Invalid parameter format: {param}. Expected format: nodeId:type:value")
                    continue

                node_id, field_type, value = parts
                node_configs.append({
                    "nodeId": node_id,
                    "fieldName": "text" if field_type == "text" else "value",
                    "fieldValue": value,
                })
                print_info(f"  Added parameter: node {node_id} = {value}")
            except Exception as e:
                print_error(f"Failed to parse parameter '{param}': {e}")

        # Step 3: Submit task using workflow endpoint
        print_info(f"Submitting task to workflow {active_workflow_id} with multiple inputs...")
        task_id = client.submit_workflow_task(active_workflow_id, node_configs)
        print_success(f"Task submitted successfully! Task ID: {task_id}")

        # Step 4: Wait for completion
        print_info("Waiting for task completion...")
        final_status = client.wait_for_completion(task_id, timeout=timeout)
        print_success("Processing completed!")

        if output_json:
            print(format_json(final_status))
        else:
            print(format_task_status(final_status))
            # ... (result printing and download logic can be added here if needed)

    except Exception as e:
        print_error(f"Failed to run workflow: {e}")
        sys.exit(1)


@cli.command("run-text-workflow")
@click.option("-p", "--param", "params", multiple=True, help="Node parameters (format: nodeId:value)")
@click.option("--timeout", default=600, help="Timeout in seconds (default: 600)")
@click.option("--json", "output_json", is_flag=True, help="Output raw JSON")
@click.option(
    "--no-download", is_flag=True, help="Skip automatic download of output files"
)
@click.option(
    "--workflow-id", help="Override workflow ID from configuration"
)
@click.pass_context
def run_text_workflow(ctx, params, timeout, output_json, no_download, workflow_id):
    """Run a workflow using text/number parameters only (no image input).

    This command submits workflows that only require text or numeric parameters,
    without requiring any image uploads. Useful for workflows that process
    text input, generate content from prompts, or perform calculations.

    Parameters are specified in format: nodeId:value
    - Type is auto-detected from nodeId suffix (_text, _value, _image)
    - Example: param_187_text:hello (auto-detected as text field)
    - Example: param_386_value:720 (auto-detected as value field)

    Example:
        runninghub run-text-workflow -p "param_187_text:hello" -p "param_386_value:720"

    Requires at least one -p parameter.
    """
    cfg = ctx.obj["config"]
    # Use provided workflow_id or fall back to config
    active_workflow_id = workflow_id if workflow_id else cfg.workflow_id

    client = RunningHubClient(cfg.api_key, cfg.api_host)
    node_configs = []

    try:
        # Validate at least one parameter is provided
        if not params:
            print_error("Error: At least one parameter is required.")
            print_info("Use -p to specify parameters in format: nodeId:value")
            print_info("")
            print_info("Type is auto-detected from nodeId suffix:")
            print_info("  - nodeId_text:value  → text field")
            print_info("  - nodeId_value:value  → value/number field")
            print_info("  - nodeId_image:value  → image field")
            print_info("")
            print_info("Examples:")
            print_info("  runninghub run-text-workflow -p \"param_187_text:hello\"")
            print_info("  runninghub run-text-workflow -p \"param_187_text:prompt\" -p \"param_386_value:720\"")
            sys.exit(1)

        # Step 1: Parse all text/number parameters
        print_info(f"Parsing {len(params)} parameter(s)...")
        for param in params:
            try:
                parts = param.split(':', 1)
                if len(parts) != 2:
                    print_error(f"Invalid parameter format: {param}")
                    print_info("Expected format: nodeId:value or nodeId:type:value")
                    continue

                node_id, value = parts

                # Auto-detect type from nodeId suffix if present
                # Supports formats like: 187_text, 386_value, param_187_text, etc.
                if node_id.endswith('_text'):
                    field_type = 'text'
                    field_name = 'text'
                    # Extract node ID by removing type suffix
                    actual_node_id = node_id.rsplit('_', 1)[0]
                elif node_id.endswith('_value'):
                    field_type = 'value'
                    field_name = 'value'
                    # Extract node ID by removing type suffix
                    actual_node_id = node_id.rsplit('_', 1)[0]
                elif node_id.endswith('_image'):
                    field_type = 'image'
                    field_name = 'image'
                    # Extract node ID by removing type suffix
                    actual_node_id = node_id.rsplit('_', 1)[0]
                else:
                    # No type suffix in nodeId, use default
                    field_type = 'value'
                    field_name = 'value'
                    actual_node_id = node_id

                node_configs.append({
                    "nodeId": actual_node_id,
                    "fieldName": field_name,
                    "fieldValue": value,
                })
                print_success(f"  Added parameter: node {actual_node_id} ({field_name}) = {value}")
            except Exception as e:
                print_error(f"Failed to parse parameter '{param}': {e}")

        # Step 2: Submit task using workflow endpoint
        print_info(f"Submitting task to workflow {active_workflow_id}...")
        task_id = client.submit_workflow_task(active_workflow_id, node_configs)
        print_success(f"Task submitted successfully! Task ID: {task_id}")

        # Step 3: Wait for completion
        print_info("Waiting for task completion...")
        final_status = client.wait_for_completion(task_id, timeout=timeout)
        print_success("Processing completed!")

        # Step 4: Display results
        if output_json:
            print(format_json(final_status))
        else:
            print(format_task_status(final_status))

            # Display results if available
            data = final_status.get("data", {})
            if data:
                print("\nResults:")
                if isinstance(data, list):
                    for i, item in enumerate(data):
                        print(f"  Result {i + 1}:")
                        for key, value in item.items():
                            print(f"    {key}: {value}")
                else:
                    for key, value in data.items():
                        if key != "taskId":
                            print(f"  {key}: {value}")

    except Exception as e:
        print_error(f"Failed to run text workflow: {e}")
        sys.exit(1)


@cli.command()
@click.argument(
    "input_dir", type=click.Path(exists=True, file_okay=False, dir_okay=True)
)
@click.option("--node", required=True, help="Node ID to use")
@click.option("-p", "--param", "params", multiple=True, help="Additional node parameters (format: nodeId:type:value)")
@click.option(
    "--pattern",
    default="*",
    help="File pattern to match (default: * processes all files)",
)
@click.option(
    "--timeout", default=600, help="Timeout per file in seconds (default: 600)"
)
@click.option("--json", "output_json", is_flag=True, help="Output raw JSON")
@click.option(
    "--no-download", is_flag=True, help="Skip automatic download of output files"
)
@click.option(
    "--no-cleanup", is_flag=True, help="Skip automatic deletion of source files"
)
@click.option(
    "--max-concurrent", default=1, help="Maximum concurrent processes (default: 1)"
)
@click.pass_context
def batch(
    ctx,
    input_dir,
    node,
    pattern,
    timeout,
    output_json,
    no_download,
    no_cleanup,
    max_concurrent,
    params,
):
    """Batch process all files in a directory."""
    cfg = ctx.obj["config"]
    client = RunningHubClient(cfg.api_key, cfg.api_host)

    input_path = Path(input_dir)

    # Find all matching files
    files_to_process = []
    for file_path in input_path.glob(pattern):
        if file_path.is_file():
            files_to_process.append(file_path)

    if not files_to_process:
        print_warning(f"No files found matching pattern '{pattern}' in {input_dir}")
        return

    print_info(f"Found {len(files_to_process)} files to process:")
    for file_path in files_to_process:
        print(f"  {file_path.name}")

    # Process files sequentially for now (can be enhanced for concurrent processing later)
    successful_count = 0
    failed_count = 0

    for i, file_path in enumerate(files_to_process, 1):
        print(f"\n{'=' * 60}")
        print_info(f"Processing file {i}/{len(files_to_process)}: {file_path.name}")
        print(f"{'=' * 60}")

        try:
            # Step 1: Upload file
            print_info(f"Uploading file: {file_path}")
            file_id = client.upload_file(str(file_path))
            print_success(f"File uploaded successfully! File ID: {file_id}")

            # Step 2: Build node configs
            print_info(f"Submitting task to node: {node}")
            node_configs = []

            # Add image node config
            node_configs.append({
                "nodeId": node,
                "fieldName": "image",
                "fieldValue": file_id,
                "description": "image",
            })

            # Add additional parameter node configs
            for param in params:
                try:
                    parts = param.split(':', 2)
                    if len(parts) != 3:
                        print_error(f"Invalid parameter format: {param}. Expected format: nodeId:type:value")
                        continue

                    node_id, field_type, value = parts
                    node_configs.append({
                        "nodeId": node_id,
                        "fieldName": "input" if field_type == "text" else "value",
                        "fieldValue": value,
                        "description": field_type,
                    })
                except Exception as e:
                    print_error(f"Failed to parse parameter '{param}': {e}")

            task_id = client.submit_task(cfg.workflow_id, node_configs)
            print_success(f"Task submitted successfully! Task ID: {task_id}")

            # Step 3: Wait for completion
            print_info("Waiting for task completion...")
            final_status = client.wait_for_completion(task_id, timeout=timeout)

            print_success("Processing completed!")

            if not output_json:
                print(format_task_status(final_status))

            # Display results if available
            data = final_status.get("data", {})
            if data and not output_json:
                print("\nResults:")
                if isinstance(data, list):
                    for j, item in enumerate(data):
                        print(f"  File {j + 1}:")
                        for key, value in item.items():
                            print(f"    {key}: {value}")
                else:
                    for key, value in data.items():
                        if key != "taskId":
                            print(f"  {key}: {value}")

            # Auto-download output files unless disabled
            downloaded_files = []
            if not no_download and not output_json and final_status.get("code") == 0:
                print_info(f"\nDownloading output files to: {cfg.download_dir}")
                try:
                    downloaded_files = client.download_task_outputs(
                        final_status, cfg.download_dir, input_filename=file_path.stem
                    )
                    if downloaded_files:
                        print_success(f"Downloaded {len(downloaded_files)} files:")
                        for downloaded_path in downloaded_files:
                            print(f"  {downloaded_path}")
                    else:
                        print_warning("No output files found to download")
                except Exception as e:
                    print_error(f"Failed to download files: {e}")

            # Auto-cleanup source file unless disabled and download was successful
            if not no_cleanup and downloaded_files and final_status.get("code") == 0:
                try:
                    if file_path.exists():
                        file_path.unlink()
                        print_success(f"Deleted source file: {file_path}")
                    else:
                        print_warning(f"Source file not found for cleanup: {file_path}")
                except Exception as e:
                    print_error(f"Failed to delete source file: {e}")

            successful_count += 1
            print_success(f"✓ Successfully processed: {file_path.name}")

        except Exception as e:
            failed_count += 1
            print_error(f"✗ Failed to process {file_path.name}: {e}")
            continue

    # Print summary
    print(f"\n{'=' * 60}")
    print_info("Batch Processing Summary:")
    print_success(f"Successfully processed: {successful_count} files")
    if failed_count > 0:
        print_error(f"Failed to process: {failed_count} files")
    print(f"{'=' * 60}")


@cli.command()
@click.option("--node", required=True, help="Node ID to use")
@click.option("-p", "--param", "params", multiple=True, help="Additional node parameters (format: nodeId:type:value)")
@click.option(
    "--pattern",
    default="*.png *.jpg *.jpeg",
    help="File patterns to match (default: *.png *.jpg *.jpeg)",
)
@click.option(
    "--timeout", default=600, help="Timeout per file in seconds (default: 600)"
)
@click.option("--json", "output_json", is_flag=True, help="Output raw JSON")
@click.option(
    "--no-download", is_flag=True, help="Skip automatic download of output files"
)
@click.option(
    "--no-cleanup", is_flag=True, help="Skip automatic deletion of source files"
)
@click.pass_context
def folder(ctx, node, pattern, timeout, output_json, no_download, no_cleanup, params):
    """Process all images from the configured folder."""
    cfg = ctx.obj["config"]
    client = RunningHubClient(cfg.api_key, cfg.api_host)

    # Parse patterns (space-separated)
    patterns = pattern.split()

    # Find all matching image files
    files_to_process = []
    for pattern_str in patterns:
        for file_path in cfg.image_folder.glob(pattern_str):
            if file_path.is_file():
                files_to_process.append(file_path)

    # Remove duplicates
    files_to_process = list(dict.fromkeys(files_to_process))

    if not files_to_process:
        print_warning(
            f"No image files found in {cfg.image_folder} matching patterns: {pattern}"
        )
        return

    print_info(f"Found {len(files_to_process)} image files in {cfg.image_folder}:")
    for file_path in files_to_process:
        print(f"  {file_path.name}")

    # Process files sequentially
    successful_count = 0
    failed_count = 0

    for i, file_path in enumerate(files_to_process, 1):
        print(f"\n{'=' * 60}")
        print_info(f"Processing file {i}/{len(files_to_process)}: {file_path.name}")
        print(f"{'=' * 60}")

        try:
            # Step 1: Upload file
            print_info(f"Uploading file: {file_path}")
            file_id = client.upload_file(str(file_path))
            print_success(f"File uploaded successfully! File ID: {file_id}")

            # Step 2: Build node configs
            print_info(f"Submitting task to node: {node}")
            node_configs = []

            # Add image node config
            node_configs.append({
                "nodeId": node,
                "fieldName": "image",
                "fieldValue": file_id,
                "description": "image",
            })

            # Add additional parameter node configs
            for param in params:
                try:
                    parts = param.split(':', 2)
                    if len(parts) != 3:
                        print_error(f"Invalid parameter format: {param}. Expected format: nodeId:type:value")
                        continue

                    node_id, field_type, value = parts
                    node_configs.append({
                        "nodeId": node_id,
                        "fieldName": "input" if field_type == "text" else "value",
                        "fieldValue": value,
                        "description": field_type,
                    })
                except Exception as e:
                    print_error(f"Failed to parse parameter '{param}': {e}")

            task_id = client.submit_task(cfg.workflow_id, node_configs)
            print_success(f"Task submitted successfully! Task ID: {task_id}")

            # Step 3: Wait for completion
            print_info("Waiting for task completion...")
            final_status = client.wait_for_completion(task_id, timeout=timeout)

            print_success("Processing completed!")

            if not output_json:
                print(format_task_status(final_status))

            # Display results if available
            data = final_status.get("data", {})
            if data and not output_json:
                print("\nResults:")
                if isinstance(data, list):
                    for j, item in enumerate(data):
                        print(f"  File {j + 1}:")
                        for key, value in item.items():
                            print(f"    {key}: {value}")
                else:
                    for key, value in data.items():
                        if key != "taskId":
                            print(f"  {key}: {value}")

            # Auto-download output files unless disabled
            downloaded_files = []
            if not no_download and not output_json and final_status.get("code") == 0:
                print_info(f"\nDownloading output files to: {cfg.download_dir}")
                try:
                    downloaded_files = client.download_task_outputs(
                        final_status, cfg.download_dir, input_filename=file_path.stem
                    )
                    if downloaded_files:
                        print_success(f"Downloaded {len(downloaded_files)} files:")
                        for downloaded_path in downloaded_files:
                            print(f"  {downloaded_path}")
                    else:
                        print_warning("No output files found to download")
                except Exception as e:
                    print_error(f"Failed to download files: {e}")

            # Auto-cleanup source file unless disabled and download was successful
            if not no_cleanup and downloaded_files and final_status.get("code") == 0:
                try:
                    if file_path.exists():
                        file_path.unlink()
                        print_success(f"Deleted source file: {file_path}")
                    else:
                        print_warning(f"Source file not found for cleanup: {file_path}")
                except Exception as e:
                    print_error(f"Failed to delete source file: {e}")

            successful_count += 1
            print_success(f"✓ Successfully processed: {file_path.name}")

        except Exception as e:
            failed_count += 1
            print_error(f"✗ Failed to process {file_path.name}: {e}")
            continue

    # Print summary
    print(f"\n{'=' * 60}")
    print_info("Folder Processing Summary:")
    print_success(f"Successfully processed: {successful_count} files")
    if failed_count > 0:
        print_error(f"Failed to process: {failed_count} files")
    print_info(f"Source folder: {cfg.image_folder}")
    print(f"{'=' * 60}")


@cli.command()
@click.argument("file_path", type=click.Path(exists=True))
@click.option(
    "--timeout",
    default=3600,
    help="Timeout in seconds (default: 3600)"
)
@click.option(
    "--no-overwrite",
    is_flag=True,
    help="Keep original file (default: overwrites with converted .mp4)"
)
@click.pass_context
def convert_video(ctx, file_path, timeout, no_overwrite):
    """Convert a single video file to MP4 format."""
    from .video_utils import (
        is_video_file,
        convert_video_to_mp4,
        check_ffmpeg_available,
        SUPPORTED_VIDEO_FORMATS
    )

    video_path = Path(file_path)
    overwrite = not no_overwrite

    # Check if it's a supported video
    if not is_video_file(video_path):
        print_error(f"Unsupported file format: {video_path.suffix}")
        print_info(f"Supported formats: {', '.join(SUPPORTED_VIDEO_FORMATS)}")
        sys.exit(1)

    # Check FFmpeg availability
    if not check_ffmpeg_available():
        print_error("FFmpeg is not installed or not accessible.")
        print_info("Install with: brew install ffmpeg (macOS)")
        sys.exit(1)

    try:
        print_info(f"Converting: {video_path.name}")

        if overwrite:
            print_warning("Original file will be replaced with converted MP4 version")

        success, stdout, stderr = convert_video_to_mp4(
            video_path,
            overwrite=overwrite,
            timeout=timeout
        )

        if success:
            print_success(f"Successfully converted: {video_path.name}")
        else:
            print_error(f"Failed to convert: {video_path.name}")
            if stderr:
                print(f"Error output: {stderr[-500:]}")  # Last 500 chars
            sys.exit(1)

    except TimeoutError as e:
        print_error(f"Conversion timed out: {e}")
        sys.exit(1)

    except Exception as e:
        print_error(f"Failed to convert: {e}")
        sys.exit(1)


@cli.command()
@click.argument(
    "input_dir",
    type=click.Path(exists=True, file_okay=False, dir_okay=True)
)
@click.option(
    "--pattern",
    default="*",
    help="File pattern to match (default: * processes all video files)",
)
@click.option(
    "--timeout",
    default=3600,
    help="Timeout per video in seconds (default: 3600 = 1 hour)"
)
@click.option(
    "--no-overwrite",
    is_flag=True,
    help="Keep original files (default: overwrites with converted .mp4)"
)
@click.pass_context
def convert_videos(ctx, input_dir, pattern, timeout, no_overwrite):
    """Convert all videos in a directory to MP4 format."""
    from .video_utils import (
        find_videos_in_directory,
        convert_video_to_mp4,
        check_ffmpeg_available,
        SUPPORTED_VIDEO_FORMATS
    )

    input_path = Path(input_dir)
    overwrite = not no_overwrite

    # Check FFmpeg availability
    if not check_ffmpeg_available():
        print_error(
            "FFmpeg is not installed or not accessible. "
            "Please install FFmpeg to use video conversion features."
        )
        print_info("Install with: brew install ffmpeg (macOS)")
        sys.exit(1)

    # Find all matching video files
    videos_to_convert = []
    for file_path in input_path.glob(pattern):
        if file_path.is_file() and file_path.suffix.lower() in SUPPORTED_VIDEO_FORMATS:
            videos_to_convert.append(file_path)

    if not videos_to_convert:
        print_warning(
            f"No supported video files found in {input_dir} matching pattern '{pattern}'"
        )
        print_info(f"Supported formats: {', '.join(SUPPORTED_VIDEO_FORMATS)}")
        return

    print_info(f"Found {len(videos_to_convert)} video files to convert:")
    for file_path in videos_to_convert:
        print(f"  {file_path.name}")

    if overwrite:
        print_warning("Original files will be replaced with converted MP4 versions")
    else:
        print_info("Original files will be kept")

    # Convert files
    successful_count = 0
    failed_count = 0

    for i, video_path in enumerate(videos_to_convert, 1):
        print(f"\n{'=' * 60}")
        print_info(f"Converting video {i}/{len(videos_to_convert)}: {video_path.name}")
        print(f"{'=' * 60}")

        try:
            success, stdout, stderr = convert_video_to_mp4(
                video_path,
                overwrite=overwrite,
                timeout=timeout
            )

            if success:
                successful_count += 1
            else:
                failed_count += 1
                print_error(f"Failed to convert {video_path.name}")
                if stderr:
                    print(f"Error output: {stderr[-500:]}")  # Last 500 chars

        except TimeoutError as e:
            failed_count += 1
            print_error(f"Conversion timed out: {video_path.name}")
            print_info(f"Error: {e}")

        except Exception as e:
            failed_count += 1
            print_error(f"Failed to convert {video_path.name}: {e}")

    # Print summary
    print(f"\n{'=' * 60}")
    print_info("Video Conversion Summary:")
    print_success(f"Successfully converted: {successful_count} videos")
    if failed_count > 0:
        print_error(f"Failed to convert: {failed_count} videos")
    print(f"{'=' * 60}")


@cli.command()
@click.argument("file_path", type=click.Path(exists=True))
@click.option(
    "--mode",
    type=click.Choice(['left', 'right', 'center', 'top', 'bottom', 'custom'],
                      case_sensitive=False),
    default='left',
    help="Crop mode: left, right, center, top, bottom, or custom"
)
@click.option(
    "--output-suffix",
    default="_cropped",
    help="Suffix for output file (default: _cropped)"
)
@click.option(
    "--width",
    help="Custom width (for custom mode, e.g., iw*0.5 for 50%)"
)
@click.option(
    "--height",
    help="Custom height (for custom mode, e.g., ih*0.5 for 50%)"
)
@click.option(
    "--x",
    help="Custom X position (for custom mode, e.g., iw*0.25 for 25%)"
)
@click.option(
    "--y",
    help="Custom Y position (for custom mode, e.g., ih*0.25 for 25%)"
)
@click.option(
    "--preserve-audio",
    is_flag=True,
    help="Preserve audio track"
)
@click.option(
    "--timeout",
    default=3600,
    help="Timeout in seconds (default: 3600)"
)
@click.pass_context
def crop(ctx, file_path, mode, output_suffix, width, height, x, y, preserve_audio, timeout):
    """Crop a single video file using FFmpeg."""
    from .video_utils import crop_video, check_ffmpeg_available

    video_path = Path(file_path)

    # Check FFmpeg availability
    if not check_ffmpeg_available():
        print_error("FFmpeg is not installed or not accessible.")
        print_info("Install with: brew install ffmpeg (macOS)")
        sys.exit(1)

    # Validate custom mode parameters
    if mode == 'custom':
        if not all([width, height]):
            print_error("Custom mode requires --width and --height")
            sys.exit(1)

    try:
        print_info(f"Cropping: {video_path.name} (mode: {mode})")
        print_info(f"Output: {video_path.stem}{output_suffix}{video_path.suffix}")

        success, stdout, stderr = crop_video(
            video_path,
            mode=mode,
            output_suffix=output_suffix,
            width=width,
            height=height,
            x=x,
            y=y,
            preserve_audio=preserve_audio,
            timeout=timeout
        )

        if success:
            print_success(f"Successfully cropped: {video_path.name}")
        else:
            print_error(f"Failed to crop: {video_path.name}")
            if stderr:
                print(f"Error output: {stderr[-500:]}")  # Last 500 chars
            sys.exit(1)

    except TimeoutError as e:
        print_error(f"Cropping timed out: {e}")
        sys.exit(1)

    except Exception as e:
        print_error(f"Failed to crop: {e}")
        sys.exit(1)


@cli.command()
@click.argument("file_path", type=click.Path(exists=True))
@click.option("--mode", default="last_frame", help="Extraction mode")
@click.option("--format", "image_format", default="png", type=click.Choice(["png", "jpg"]), help="Output image format")
@click.option("--quality", default=95, type=int, help="Image quality (for JPG)")
@click.option("--frame-count", default=5, type=int, help="Number of frames (for last_frames mode)")
@click.option("--interval", "interval_seconds", default=10, type=float, help="Interval in seconds")
@click.option("--frame-interval", default=1, type=int, help="Interval in frames")
@click.option("--organize/--no-organize", default=True, help="Organize images by video name")
@click.option("--delete/--no-delete", default=False, help="Delete video after processing")
@click.option("--output-dir", type=click.Path(), required=True, help="Output directory")
@click.option("--timeout", default=3600, help="Timeout in seconds")
@click.pass_context
def clip(ctx, file_path, mode, image_format, quality, frame_count, interval_seconds, 
         frame_interval, organize, delete, output_dir, timeout):
    """Extract frames from a video file."""
    from .video_utils import clip_video

    video_path = Path(file_path)
    out_dir = Path(output_dir)

    clip_config = {
        'mode': mode,
        'imageFormat': image_format,
        'quality': quality,
        'frameCount': frame_count,
        'intervalSeconds': interval_seconds,
        'intervalFrames': frame_interval,
        'organizeByVideo': organize,
        'deleteOriginal': delete
    }

    try:
        success, stdout, stderr = clip_video(
            video_path,
            clip_config,
            out_dir,
            timeout=timeout
        )

        if success:
            if stdout:
                print(stdout)
        else:
            if stderr:
                print_error(stderr)
            sys.exit(1)

    except Exception as e:
        print_error(f"Failed to clip: {e}")
        sys.exit(1)


@cli.command("duck-decode")
@click.argument("duck_image", type=click.Path(exists=True))
@click.option(
    "--password",
    help="Password for decryption (if required)"
)
@click.option(
    "--out",
    "output",
    help="Output file path or directory (default: auto-generate)"
)
@click.option(
    "--output-dir",
    help="Output directory (alternative to --out)"
)
@click.option(
    "--quiet",
    is_flag=True,
    help="Suppress verbose output"
)
@click.pass_context
def duck_decode(ctx, duck_image, password, output, output_dir, quiet):
    """Decode hidden media from a duck image.

    Extracts images, videos, or other files hidden in cartoon duck images
    using LSB steganography.

    Example:
        runninghub duck-decode my_duck.png
        runninghub duck-decode my_duck.png --password "secret123"
        runninghub duck-decode my_duck.png --out recovered.jpg
        runninghub duck-decode my_duck.png --output-dir ./recovered/
    """
    from .duck_utils import decode_duck_image

    try:
        result = decode_duck_image(
            duck_path=duck_image,
            password=password or "",
            output=output,
            output_dir=output_dir,
            quiet=quiet
        )

        if result['success']:
            if not quiet:
                print_success(f"Successfully decoded duck image!")
                print(f"Output file: {result['output_path']}")
                print(f"File type: {result['file_type']}")
                print(f"Data size: {result['data_size']} bytes")
            sys.exit(0)
        else:
            print_error(f"Failed to decode duck image: {result['error']}")
            sys.exit(1)

    except Exception as e:
        print_error(f"Decoding failed: {e}")
        sys.exit(1)


def main():
    """Main entry point for the CLI."""
    cli()


if __name__ == "__main__":
    main()
