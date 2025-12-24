#!/usr/bin/env python3
"""
RunningHub Web Application
A web interface for managing and processing images using the RunningHub CLI.
"""

import os
import sys
import subprocess
import asyncio
import threading
import time
import traceback
from pathlib import Path
from typing import List, Dict, Any, Optional
from flask import Flask, render_template, request, jsonify, send_from_directory, session, redirect, url_for
from flask_cors import CORS
import logging

# Add parent directory to path to import runninghub_cli
sys.path.insert(0, str(Path(__file__).parent.parent))

from runninghub_cli.config import Config
from runninghub_cli.video_utils import rename_video
from utils.path_detector import PathDetector

app = Flask(__name__)
app.secret_key = 'runninghub-web-app-secret-key'
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global variables
current_folder = None
config = None

def init_config():
    """Initialize configuration."""
    global config
    try:
        # Load .env from parent directory
        import sys
        from pathlib import Path
        parent_dir = Path(__file__).parent.parent
        env_file = parent_dir / '.env'

        if env_file.exists():
            from dotenv import load_dotenv
            load_dotenv(str(env_file))
            logger.info(f"Loaded .env from {env_file}")

        config = Config()
        config.validate()
        return True
    except Exception as e:
        logger.error(f"Failed to initialize config: {e}")
        return False

@app.route('/')
def index():
    """Main page."""
    if not init_config():
        return render_template('error.html', error="Failed to initialize configuration. Check your .env file.")

    return render_template('index.html',
                         current_folder=current_folder,
                         image_folder=config.image_folder,
                         prefix_path=config.prefix_path)

@app.route('/api/folder/select', methods=['POST'])
def select_folder():
    """Select a folder to browse."""
    global current_folder

    data = request.get_json()
    folder_path = data.get('folder_path')

    if not folder_path:
        return jsonify({'error': 'No folder path provided'}), 400

    # Try to resolve the folder path with different strategies
    original_path = folder_path
    folder = resolve_folder_path(folder_path)

    if not folder:
        return jsonify({
            'error': f'Folder does not exist: {original_path}',
            'suggestions': generate_folder_suggestions(original_path)
        }), 404

    current_folder = str(folder.resolve())
    session['current_folder'] = current_folder

    # Calculate relative path from prefix
    relative_path = None
    if init_config() and config:
        try:
            relative_path = str(folder.relative_to(config.prefix_path))
        except ValueError:
            # Folder is not under prefix path
            relative_path = None

    response = {
        'success': True,
        'folder_path': current_folder,
        'message': f'Folder selected: {folder.name}',
        'original_input': original_path,
        'folder_name': folder.name
    }

    # Include prefix and relative path information
    if init_config() and config:
        response.update({
            'prefix_path': str(config.prefix_path),
            'relative_path': relative_path,
            'is_under_prefix': relative_path is not None
        })

    return jsonify(response)

def resolve_folder_path(folder_path):
    """Try to resolve a folder path using different strategies."""
    import os
    import pwd

    # Initialize config to get prefix path
    if not init_config():
        logger.error("Failed to initialize config for path resolution")
        return None

    prefix_path = config.prefix_path

    # Expand user home directory
    if folder_path.startswith('~'):
        folder_path = os.path.expanduser(folder_path)

    folder = Path(folder_path)

    # Direct check (absolute path)
    if folder.exists() and folder.is_dir():
        return folder

    # If it's a relative path, combine with prefix path
    if not folder.is_absolute():
        combined_path = prefix_path / folder_path
        if combined_path.exists() and combined_path.is_dir():
            return combined_path

    # Try common user directories as fallback
    try:
        current_user = pwd.getpwuid(os.getuid()).pw_name
    except:
        current_user = os.getenv('USER', 'unknown')

    possible_prefixes = [
        str(prefix_path),  # Use configured prefix path first
        f"/Users/{current_user}",
        "/Users/barbarossia",
        "/Users/username",
        os.path.expanduser("~"),
        "/tmp"
    ]

    # Extract folder name from the path
    folder_name = Path(folder_path).name

    # Try different base directories
    for prefix in possible_prefixes:
        test_path = Path(prefix) / folder_name
        if test_path.exists() and test_path.is_dir():
            return test_path

    # Try with parent directory structure preserved
    for prefix in possible_prefixes:
        test_path = Path(prefix) / folder_path.lstrip('/~')
        if test_path.exists() and test_path.is_dir():
            return test_path

    return None

def generate_folder_suggestions(folder_path):
    """Generate suggestions for similar folder paths."""
    import os
    import pwd

    # Initialize config to get prefix path
    prefix_suggestions = []
    if init_config() and config:
        prefix_path = config.prefix_path
        folder_name = Path(folder_path).name
        prefix_suggestions = [
            str(prefix_path / folder_name),
            str(prefix_path),
            folder_path  # Relative to prefix
        ]

    try:
        current_user = pwd.getpwuid(os.getuid()).pw_name
    except:
        current_user = os.getenv('USER', 'unknown')

    folder_name = Path(folder_path).name

    suggestions = prefix_suggestions + [
        f"/Users/{current_user}/{folder_name}",
        f"/Users/{current_user}/Pictures/{folder_name}",
        f"/Users/{current_user}/Desktop/{folder_name}",
        f"/Users/{current_user}/Downloads/{folder_name}",
        f"/tmp/{folder_name}",
        f"~/{folder_name}",
        folder_path  # Original input
    ]

    # Remove duplicates while preserving order
    seen = set()
    suggestions = [x for x in suggestions if not (x in seen or seen.add(x))]

    return suggestions

@app.route('/api/config/prefix-path', methods=['GET'])
def get_prefix_path():
    """Get the current prefix path configuration."""
    if not init_config():
        return jsonify({'error': 'Failed to initialize configuration'}), 500

    return jsonify({
        'prefix_path': str(config.prefix_path),
        'success': True
    })

@app.route('/api/session/clear', methods=['POST'])
def clear_session():
    """Clear session data to fix direct access issues."""
    try:
        # Clear direct access session data
        session.pop('current_direct_folder', None)
        session.pop('current_folder', None)

        return jsonify({
            'success': True,
            'message': 'Session cleared successfully'
        })
    except Exception as e:
        return jsonify({
            'error': f'Failed to clear session: {str(e)}'
        }), 500

@app.route('/api/folder/validate-path', methods=['POST'])
def validate_path():
    """Validate if a path exists on the filesystem."""
    try:
        data = request.get_json()
        path = data.get('path', '')

        if not path:
            return jsonify({'error': 'No path provided'}), 400

        folder_path = Path(path)
        exists = folder_path.exists() and folder_path.is_dir()

        # Check if it's a relative path and try combining with prefix
        combined_path = None
        combined_exists = False
        relative_info = None

        if init_config() and config:
            # First check if it's an absolute path
            if folder_path.is_absolute():
                # Check if absolute path is under prefix
                try:
                    relative_path = folder_path.relative_to(config.prefix_path)
                    relative_info = {
                        'relative_path': str(relative_path),
                        'is_relative': True,
                        'is_under_prefix': True
                    }
                except ValueError:
                    # Absolute path is not under prefix
                    relative_info = {
                        'relative_path': None,
                        'is_relative': False,
                        'is_under_prefix': False
                    }
            else:
                # It's a relative path, try combining with prefix
                combined_path = config.prefix_path / folder_path
                combined_exists = combined_path.exists() and combined_path.is_dir()

                if combined_exists:
                    relative_info = {
                        'relative_path': str(folder_path),
                        'is_relative': True,
                        'is_under_prefix': True,
                        'combined_path': str(combined_path)
                    }
                else:
                    relative_info = {
                        'relative_path': str(folder_path),
                        'is_relative': True,
                        'is_under_prefix': False,
                        'combined_path': str(combined_path)
                    }

        response = {
            'exists': exists or combined_exists,
            'path': str(folder_path),
            'is_directory': (exists and folder_path.is_dir()) or (combined_exists and combined_path.is_dir()),
            'message': 'Path exists' if (exists or combined_exists) else 'Path does not exist'
        }

        # Add combined path info if it was used
        if combined_path:
            response['combined_path'] = str(combined_path)
            response['used_prefix'] = True

        if relative_info:
            response.update(relative_info)

        return jsonify(response)

    except Exception as e:
        logger.error(f"Error validating path: {e}")
        return jsonify({'error': f'Failed to validate path: {str(e)}'}), 500

@app.route('/api/folder/process-direct', methods=['POST'])
def process_folder_direct():
    """Process folder directly using File System Access API data."""
    try:
        data = request.get_json()
        folder_name = data.get('folder_name', '')
        files = data.get('files', [])
        source = data.get('source', 'filesystem_api')
        full_path = data.get('full_path')

        if not files:
            return jsonify({'error': 'No files provided'}), 400

        logger.info(f"Processing {len(files)} items from {folder_name} via {source}")

        # If we have the full path and it exists, use it directly
        if full_path:
            folder_path = Path(full_path)
            if folder_path.exists() and folder_path.is_dir():
                # Use the actual filesystem path
                session['current_folder'] = str(folder_path)
                current_folder = str(folder_path)

                return jsonify({
                    'success': True,
                    'actual_path': str(folder_path),
                    'folder_name': folder_name,
                    'total_items': len(files),
                    'image_count': len([f for f in files if not f.get('isDirectory', False)]),
                    'message': f'Loaded folder from actual path: {str(folder_path)}'
                })

        # Fallback to virtual session method
        session_id = f"direct_access_{folder_name}_{int(time.time())}"

        # Store the file information in session for later access
        session['current_direct_folder'] = {
            'session_id': session_id,
            'folder_name': folder_name,
            'files': files,
            'source': source,
            'timestamp': time.time()
        }

        # Create virtual path display
        virtual_path = f"[Direct Access] {folder_name}"

        # Count images and directories
        image_files = [f for f in files if not f.get('isDirectory', False)]
        directories = [f for f in files if f.get('isDirectory', False)]

        return jsonify({
            'success': True,
            'virtual_path': virtual_path,
            'session_id': session_id,
            'folder_name': folder_name,
            'total_items': len(files),
            'image_count': len(image_files),
            'directory_count': len(directories),
            'message': f'Loaded {len(image_files)} images and {len(directories)} directories from {folder_name}'
        })

    except Exception as e:
        logger.error(f"Error processing folder directly: {e}")
        return jsonify({'error': f'Failed to process folder: {str(e)}'}), 500

@app.route('/api/folder/list')
def list_folder():
    """List contents of current folder."""
    global current_folder

    # Check if we have a direct access session
    if 'current_direct_folder' in session:
        return list_direct_folder()

    folder_path = session.get('current_folder') or current_folder

    if not folder_path:
        # Use configured image folder as default
        if not init_config():
            return jsonify({'error': 'No folder selected and config not initialized'}), 400
        folder_path = str(config.image_folder)

    folder = Path(folder_path)

    if not folder.exists():
        return jsonify({'error': 'Folder does not exist'}), 404

    # Get folder contents
    contents = {
        'folders': [],
        'images': [],
        'current_path': str(folder),
        'parent_path': str(folder.parent) if folder.parent != folder else None,
        'is_direct_access': False
    }

    try:
        for item in folder.iterdir():
            if item.is_dir():
                contents['folders'].append({
                    'name': item.name,
                    'path': str(item),
                    'type': 'folder'
                })
            elif item.is_file() and item.suffix.lower() in ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']:
                contents['images'].append({
                    'name': item.name,
                    'path': str(item),
                    'size': item.stat().st_size,
                    'type': 'image',
                    'extension': item.suffix.lower()
                })

        # Sort folders and images alphabetically
        contents['folders'].sort(key=lambda x: x['name'].lower())
        contents['images'].sort(key=lambda x: x['name'].lower())

    except PermissionError:
        return jsonify({'error': 'Permission denied accessing folder'}), 403

    return jsonify(contents)

def list_direct_folder():
    """List contents from direct File System Access API session."""
    try:
        direct_folder = session.get('current_direct_folder', {})
        files = direct_folder.get('files', [])
        folder_name = direct_folder.get('folder_name', '')

        # Separate images and directories
        images = []
        folders = []

        for file_info in files:
            if file_info.get('isDirectory', False):
                folders.append({
                    'name': file_info['name'],
                    'path': f"[Direct] {folder_name}/{file_info['name']}",
                    'type': 'folder',
                    'is_virtual': True
                })
            else:
                # Check if it's an image file
                file_name = file_info['name'].lower()
                if any(ext in file_name for ext in ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']):
                    images.append({
                        'name': file_info['name'],
                        'path': f"[Direct] {folder_name}/{file_info['name']}",
                        'size': file_info.get('size', 0),
                        'type': 'image',
                        'extension': file_info['name'].split('.')[-1].lower() if '.' in file_info['name'] else '',
                        'is_virtual': True,
                        'file_handle_info': file_info  # Store file handle info for later access
                    })

        # Sort alphabetically
        folders.sort(key=lambda x: x['name'].lower())
        images.sort(key=lambda x: x['name'].lower())

        return jsonify({
            'folders': folders,
            'images': images,
            'current_path': f"[Direct Access] {folder_name}",
            'parent_path': None,  # No parent for direct access
            'is_direct_access': True,
            'session_id': direct_folder.get('session_id'),
            'message': f'Direct access to {folder_name}'
        })

    except Exception as e:
        logger.error(f"Error listing direct folder: {e}")
        return jsonify({'error': 'Failed to list direct folder contents'}), 500

@app.route('/api/images/delete', methods=['POST'])
def delete_images():
    """Delete selected images."""
    global current_folder

    data = request.get_json()
    image_paths = data.get('images', [])

    if not image_paths:
        return jsonify({'error': 'No images selected for deletion'}), 400

    deleted = []
    failed = []

    for image_path in image_paths:
        try:
            file_path = Path(image_path)
            if file_path.exists() and file_path.is_file():
                file_path.unlink()
                deleted.append(str(file_path))
            else:
                failed.append({'path': image_path, 'error': 'File not found'})
        except Exception as e:
            failed.append({'path': image_path, 'error': str(e)})

    return jsonify({
        'success': True,
        'deleted_count': len(deleted),
        'failed_count': len(failed),
        'deleted': deleted,
        'failed': failed
    })

@app.route('/api/videos/rename', methods=['POST'])
def rename_video_endpoint():
    """Rename a video file."""
    try:
        data = request.get_json()
        video_path = data.get('video_path')
        new_name = data.get('new_name')

        if not video_path or not new_name:
            return jsonify({'error': 'Video path and new name are required'}), 400

        path = Path(video_path)
        # Use the imported rename_video function
        new_path = rename_video(path, new_name)

        return jsonify({
            'success': True,
            'message': f'Renamed to {new_path.name}',
            'new_path': str(new_path),
            'new_name': new_path.name
        })
    except FileNotFoundError:
        return jsonify({'error': 'Video file not found'}), 404
    except FileExistsError:
        return jsonify({'error': 'A file with that name already exists'}), 409
    except Exception as e:
        logger.error(f"Error renaming video: {e}")
        return jsonify({'error': f'Failed to rename video: {str(e)}'}), 500

@app.route('/api/images/process', methods=['POST'])
def process_images():
    """Process selected images using RunningHub CLI."""
    global current_folder

    logger.info("=== PROCESS IMAGES ENDPOINT CALLED ===")

    data = request.get_json()
    logger.info(f"Request data: {data}")

    image_paths = data.get('images', [])
    node_id = data.get('node_id', '203')
    timeout = data.get('timeout', 600)

    logger.info(f"Image paths received: {len(image_paths)} images")
    for i, path in enumerate(image_paths):
        logger.info(f"  Image {i+1}: {path}")
    logger.info(f"Node ID: {node_id}")
    logger.info(f"Timeout: {timeout}")

    if not image_paths:
        logger.error("No images selected for processing")
        return jsonify({'error': 'No images selected for processing'}), 400

    if not init_config():
        logger.error("Failed to initialize RunningHub configuration")
        return jsonify({'error': 'Failed to initialize RunningHub configuration'}), 500

    # Create a background task to process images
    task_id = f"process_{len(image_paths)}_images"
    logger.info(f"Created task ID: {task_id}")

    try:
        # Start background processing in a thread
        logger.info("Starting background processing thread...")
        thread = threading.Thread(
            target=process_images_async,
            args=(image_paths, node_id, timeout, task_id)
        )
        thread.daemon = True
        thread.start()

        logger.info(f"Thread started successfully for task: {task_id}")

        response_data = {
            'success': True,
            'task_id': task_id,
            'message': f'Started processing {len(image_paths)} images',
            'image_count': len(image_paths)
        }
        logger.info(f"Returning response: {response_data}")

        return jsonify(response_data)

    except Exception as e:
        logger.error(f"Failed to start processing: {str(e)}")
        logger.error(f"Exception type: {type(e)}")
        logger.error(f"Exception traceback: {traceback.format_exc()}")
        return jsonify({'error': f'Failed to start processing: {str(e)}'}), 500

def process_images_async(image_paths: List[str], node_id: str, timeout: int, task_id: str):
    """Process images asynchronously using RunningHub CLI."""
    global config

    logger.info(f"=== BACKGROUND PROCESSING STARTED for task: {task_id} ===")
    logger.info(f"Processing {len(image_paths)} images with node {node_id}")

    try:
        for i, image_path in enumerate(image_paths):
            logger.info(f"Processing image {i+1}/{len(image_paths)}: {image_path}")

            # Check if file exists
            if not os.path.exists(image_path):
                logger.error(f"Image file does not exist: {image_path}")
                continue

            # Use runninghub process command
            cmd = [
                sys.executable, '-m', 'runninghub_cli.cli', 'process',
                image_path,
                '--node', node_id,
                '--timeout', str(timeout)
            ]

            logger.info(f"Running command: {' '.join(cmd)}")

            # Set environment for subprocess
            env = os.environ.copy()
            if config:
                env['RUNNINGHUB_API_KEY'] = config.api_key
                env['RUNNINGHUB_WORKFLOW_ID'] = config.workflow_id
                env['RUNNINGHUB_API_HOST'] = config.api_host
                env['RUNNINGHUB_DOWNLOAD_DIR'] = str(config.download_dir)
                logger.info(f"Environment set with API key: {config.api_key[:10]}...")
                logger.info(f"Workflow ID: {config.workflow_id}")
                logger.info(f"API Host: {config.api_host}")
                logger.info(f"Download Dir: {config.download_dir}")
            else:
                logger.warning("No config available for environment variables")

            try:
                # Run the command
                logger.info(f"Starting subprocess for {image_path}...")
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    env=env,
                    timeout=timeout + 60  # Extra time for overhead
                )

                logger.info(f"Subprocess completed for {image_path}")
                logger.info(f"Return code: {result.returncode}")
                logger.info(f"STDOUT: {result.stdout}")
                logger.info(f"STDERR: {result.stderr}")

                if result.returncode != 0:
                    logger.error(f"Failed to process {image_path}: {result.stderr}")
                else:
                    logger.info(f"Successfully processed {image_path}")
                    if result.stdout:
                        logger.info(f"Processing output: {result.stdout}")

            except subprocess.TimeoutExpired:
                logger.error(f"Processing timed out for {image_path} after {timeout + 60} seconds")
            except Exception as cmd_error:
                logger.error(f"Command execution error for {image_path}: {cmd_error}")
                logger.error(f"Command execution traceback: {traceback.format_exc()}")

    except Exception as e:
        logger.error(f"Error in background processing: {e}")
        logger.error(f"Background processing traceback: {traceback.format_exc()}")
    finally:
        logger.info(f"=== BACKGROUND PROCESSING COMPLETED for task: {task_id} ===")

@app.route('/api/image/<path:filename>')
def serve_image(filename):
    """Serve images from the current folder."""
    global current_folder

    folder_path = session.get('current_folder') or current_folder

    if not folder_path:
        return jsonify({'error': 'No folder selected'}), 400

    return send_from_directory(folder_path, filename)

@app.route('/api/nodes')
def get_nodes():
    """Get available RunningHub nodes."""
    if not init_config():
        return jsonify({'error': 'Failed to initialize configuration'}), 500

    try:
        # Use runninghub nodes command
        cmd = [sys.executable, '-m', 'runninghub_cli.cli', 'nodes']
        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            return jsonify({'error': 'Failed to fetch nodes'}), 500

        return jsonify({'success': True, 'output': result.stdout})

    except Exception as e:
        return jsonify({'error': f'Failed to fetch nodes: {str(e)}'}), 500

@app.route('/static/<path:filename>')
def static_files(filename):
    """Serve static files."""
    return send_from_directory('static', filename)

if __name__ == '__main__':
    print("Starting RunningHub Web Application...")
    print("Open http://localhost:8080 in your browser")

    # Initialize config on startup
    if init_config():
        print(f"Configuration loaded successfully")
        print(f"Image folder: {config.image_folder}")
        print(f"Download directory: {config.download_dir}")
    else:
        print("Warning: Configuration not loaded. Check your .env file.")

    app.run(host='0.0.0.0', port=8080, debug=True)