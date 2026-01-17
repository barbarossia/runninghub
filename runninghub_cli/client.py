"""RunningHub API client."""

import json
import time
import os
import urllib.parse
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
import requests
from tqdm import tqdm


class RunningHubClient:
    """Client for interacting with RunningHub API."""

    def __init__(self, api_key: str, api_host: str = "www.runninghub.cn"):
        """Initialize the API client.

        Args:
            api_key: Your RunningHub API key.
            api_host: RunningHub API host (default: www.runninghub.cn).
        """
        self.api_key = api_key
        self.api_host = api_host
        self.base_url = f"https://{api_host}"
        self.session = requests.Session()
        self.session.headers.update({"Host": api_host})

    def get_node_info(self, webapp_id: str) -> List[Dict[str, Any]]:
        """Get node information for a webapp.

        Args:
            webapp_id: The webapp ID (from ai-detail URL).

        Returns:
            List of node information dictionaries.

        Raises:
            requests.RequestException: If the API request fails.
        """
        url = f"{self.base_url}/api/webapp/apiCallDemo"
        params = {
            "apiKey": self.api_key,
            "webappId": webapp_id
        }

        response = self.session.get(url, params=params)
        response.raise_for_status()

        data = response.json()
        if data.get("code") != 0:
            # Include more details from the API response
            raise Exception(f"API returned error: {data.get('message', 'Unknown error')}. Response: {data}")

        # RunningHub API returns nodeInfoList inside data object
        return data.get("data", {}).get("nodeInfoList", [])

    def upload_file(self, file_path: Union[str, Path], silent: bool = False) -> str:
        """Upload a file to RunningHub.

        Args:
            file_path: Path to the file to upload.
            silent: If True, suppress upload progress output (default: False).

        Returns:
            The file ID returned by the API.

        Raises:
            FileNotFoundError: If the file doesn't exist.
            requests.RequestException: If the upload fails.
        """
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        url = f"{self.base_url}/task/openapi/upload"

        # Open file for upload
        with open(file_path, "rb") as file:
            files = {
                "file": (file_path.name, file, "application/octet-stream")
            }

            # Create form data
            data = {
                "apiKey": self.api_key,
                "fileType": "input"
            }

            if not silent:
                print(f"Uploading {file_path.name}...")
            response = self.session.post(url, files=files, data=data)

        response.raise_for_status()

        result = response.json()
        if result.get("code") != 0:
            raise Exception(f"Upload failed: {result.get('message', 'Unknown error')} - Full response: {json.dumps(result)}")

        # RunningHub API returns fileName instead of fileId
        return result.get("data", {}).get("fileName", "")

    def submit_task(
        self,
        webapp_id: str,
        node_info_list: List[Dict[str, Any]]
    ) -> str:
        """Submit a task to RunningHub.

        Args:
            webapp_id: The webapp ID.
            node_info_list: List of node configurations.

        Returns:
            The task ID.

        Raises:
            requests.RequestException: If the submission fails.
        """
        url = f"{self.base_url}/task/openapi/ai-app/run"

        payload = {
            "webappId": webapp_id,
            "apiKey": self.api_key,
            "nodeInfoList": node_info_list
        }

        print(f"Submitting task payload: {json.dumps(node_info_list, indent=2, ensure_ascii=False)}")

        response = self.session.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()

        result = response.json()
        if result.get("code") != 0:
            raise Exception(f"Task submission failed: {result.get('message', 'Unknown error')} - Full response: {json.dumps(result)}")

        return result.get("data", {}).get("taskId", "")

    def submit_workflow_task(
        self,
        workflow_id: str,
        node_info_list: List[Dict[str, Any]]
    ) -> str:
        """Submit a workflow task to RunningHub.

        Args:
            workflow_id: The workflow ID.
            node_info_list: List of node configurations.

        Returns:
            The task ID.

        Raises:
            requests.RequestException: If the submission fails.
        """
        url = f"{self.base_url}/task/openapi/create"

        payload = {
            "apiKey": self.api_key,
            "workflowId": workflow_id,
            "nodeInfoList": node_info_list
        }

        print(f"Submitting workflow task payload: {json.dumps(node_info_list, indent=2, ensure_ascii=False)}")

        response = self.session.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()

        result = response.json()
        if result.get("code") != 0:
            raise Exception(f"Workflow task submission failed: {result.get('message', 'Unknown error')} - Full response: {json.dumps(result)}")

        return result.get("data", {}).get("taskId", "")

    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Get the status of a task.

        Args:
            task_id: The task ID.

        Returns:
            Dictionary containing task status information.

        Raises:
            requests.RequestException: If the status check fails.
        """
        url = f"{self.base_url}/task/openapi/outputs"

        payload = {
            "apiKey": self.api_key,
            "taskId": task_id
        }

        response = self.session.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()

        result = response.json()
        return result

    def wait_for_completion(
        self,
        task_id: str,
        poll_interval: int = 5,
        timeout: Optional[int] = None,
        silent: bool = False
    ) -> Dict[str, Any]:
        """Wait for a task to complete.

        Args:
            task_id: The task ID.
            poll_interval: Seconds between status checks (default: 5).
            timeout: Maximum time to wait in seconds (None for no timeout).
            silent: If True, suppress progress bar output (default: False).

        Returns:
            Final task status dictionary.

        Raises:
            TimeoutError: If the task doesn't complete within timeout.
            requests.RequestException: If status checks fail.
        """
        start_time = time.time()

        # Use a dummy file object to suppress tqdm output when silent
        class DummyFile:
            def write(self, x): pass
            def flush(self): pass

        pbar_file = DummyFile() if silent else None
        pbar = tqdm(desc="Waiting for completion", unit="s", file=pbar_file)
        try:
            while True:
                status = self.get_task_status(task_id)
                status_code = status.get("code")

                if status_code == 0:
                    # Task completed successfully
                    pbar.set_description("Task completed")
                    return status
                elif status_code in [804, 813]:
                    # Task still running (804: running, 813: queuing)
                    pass
                elif status_code == 805:
                    # Task failed
                    raise Exception(f"Task failed: {status.get('message', 'Unknown error')}")
                else:
                    # Unknown status code
                    raise Exception(f"Unknown status code: {status_code}")

                # Check timeout
                if timeout and (time.time() - start_time) > timeout:
                    raise TimeoutError(f"Task did not complete within {timeout} seconds")

                # Update progress bar and wait
                pbar.update(poll_interval)
                time.sleep(poll_interval)
        finally:
            pbar.close()

    def download_file(self, file_url: str, download_path: Path) -> Path:
        """Download a file from RunningHub to local path.

        Args:
            file_url: The URL of the file to download.
            download_path: Local path where the file should be saved.

        Returns:
            Path to the downloaded file.

        Raises:
            requests.RequestException: If the download fails.
        """
        # Ensure the download directory exists
        download_path.parent.mkdir(parents=True, exist_ok=True)

        # If file_url is a relative path, construct full URL
        if file_url.startswith('/'):
            file_url = f"{self.base_url}{file_url}"

        # Create a clean session for downloads (without Host header that breaks cross-domain requests)
        download_session = requests.Session()

        # Try simple requests first (these URLs seem to be public)
        response = download_session.get(file_url, stream=True)

        # If that fails, try with API key as query parameter
        if response.status_code == 404 or response.status_code == 403:
            if '?' in file_url:
                separator = '&'
            else:
                separator = '?'
            authenticated_url = f"{file_url}{separator}apiKey={self.api_key}"
            response = download_session.get(authenticated_url, stream=True)

        response.raise_for_status()

        total_size = int(response.headers.get('content-length', 0))

        with open(download_path, 'wb') as file, tqdm(
            desc=f"Downloading {download_path.name}",
            total=total_size,
            unit='B',
            unit_scale=True,
            unit_divisor=1024,
        ) as pbar:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    file.write(chunk)
                    pbar.update(len(chunk))

        return download_path

    def download_task_outputs(self, task_status: Dict[str, Any], download_dir: Path, input_filename: Optional[str] = None) -> List[Path]:
        """Download all output files from a completed task.

        Args:
            task_status: The task status dictionary from get_task_status.
            download_dir: Directory where files should be downloaded.
            input_filename: Optional input filename to use as base name for output files.

        Returns:
            List of paths to downloaded files.

        Raises:
            requests.RequestException: If downloads fail.
        """
        downloaded_files = []

        if task_status.get("code") != 0:
            raise Exception(f"Task not completed successfully: {task_status.get('message', 'Unknown error')}")

        data = task_status.get("data", {})
        if not data:
            return downloaded_files

        # Handle both list and dict formats
        if isinstance(data, list):
            # Process list format
            return self._download_from_list_format(data, download_dir, input_filename)
        elif isinstance(data, dict):
            # Process dict format (legacy)
            return self._download_from_dict_format(data, download_dir, input_filename)
        else:
            return downloaded_files

    def _download_from_list_format(self, data_list: List[Dict[str, Any]], download_dir: Path, input_filename: Optional[str] = None) -> List[Path]:
        """Download files from list format response."""
        downloaded_files = []
        image_files = []
        text_files = []

        # Separate image and text files
        for item in data_list:
            file_url = item.get("fileUrl", "")
            file_type = item.get("fileType", "")

            if file_type == "png" and file_url:
                image_files.append(("output", file_url))
            elif file_type == "txt" and file_url:
                text_files.append(("output", file_url))

        # Determine base filename - use input filename if provided, otherwise extract from first image
        output_base_name = None
        if input_filename:
            output_base_name = input_filename
        elif image_files:
            # Extract from first image URL as fallback
            img_url = image_files[0][1]
            parsed_url = urllib.parse.urlparse(img_url)
            original_filename = Path(parsed_url.path).name
            if "_" in original_filename:
                parts = original_filename.split("_")
                if len(parts) >= 3:
                    output_base_name = "_".join(parts[:-2])
                else:
                    output_base_name = parts[0]
            else:
                output_base_name = Path(original_filename).stem

        # Download image files first
        for img_key, img_url in image_files:
            try:
                # Use input filename as base name if provided, otherwise extract from URL
                if output_base_name:
                    img_filename = f"{output_base_name}.png"
                else:
                    # Extract filename from URL as fallback
                    parsed_url = urllib.parse.urlparse(img_url)
                    original_filename = Path(parsed_url.path).name
                    if "_" in original_filename:
                        # Try to extract the base name (remove timestamp and random suffix)
                        parts = original_filename.split("_")
                        if len(parts) >= 3:
                            base_name = "_".join(parts[:-2])
                        else:
                            base_name = parts[0]
                    else:
                        base_name = Path(original_filename).stem
                    img_filename = f"{base_name}.png"

                img_path = download_dir / img_filename

                # Download if file doesn't exist
                if not img_path.exists():
                    self.download_file(img_url, img_path)
                else:
                    print(f"File already exists, skipping: {img_path}")

                downloaded_files.append(img_path)
                print(f"Downloaded image: {img_path}")
            except Exception as e:
                print(f"Failed to download image: {e}")

        # Download text files
        for txt_key, txt_url in text_files:
            try:
                # Use same base name as the corresponding image
                if output_base_name:
                    txt_filename = f"{output_base_name}.txt"
                elif downloaded_files:
                    # Use the first image's base name
                    base_name = downloaded_files[0].stem
                    txt_filename = f"{base_name}.txt"
                else:
                    # Extract from URL as last resort
                    parsed_url = urllib.parse.urlparse(txt_url)
                    original_filename = Path(parsed_url.path).name
                    base_name = Path(original_filename).stem
                    txt_filename = f"{base_name}.txt"

                txt_path = download_dir / txt_filename

                # Download if file doesn't exist
                if not txt_path.exists():
                    # Download text content using the same method as images
                    download_session = requests.Session()
                    response = download_session.get(txt_url)
                    response.raise_for_status()
                    text_content = response.text

                    with open(txt_path, 'w', encoding='utf-8') as f:
                        f.write(text_content)
                    downloaded_files.append(txt_path)
                    print(f"Saved text: {txt_path}")
                else:
                    print(f"File already exists, skipping: {txt_path}")

            except Exception as e:
                print(f"Failed to download text file: {e}")

        return downloaded_files

    def _download_from_dict_format(self, data_dict: Dict[str, Any], download_dir: Path, input_filename: Optional[str] = None) -> List[Path]:
        """Download files from dict format response (legacy)."""
        downloaded_files = []
        image_files = []
        text_files = []

        for key, value in data_dict.items():
            if key.endswith("Image") and isinstance(value, str):
                image_files.append((key, value))
            elif key.endswith("Text") and isinstance(value, str):
                text_files.append((key, value))

        for img_key, img_url in image_files:
            # Use input filename as base name if provided, otherwise extract from key
            if input_filename:
                base_name = input_filename
            else:
                base_name = img_key[:-5]

            img_ext = self._get_file_extension(img_url) or ".png"
            img_filename = f"{base_name}{img_ext}"
            img_path = download_dir / img_filename

            try:
                self.download_file(img_url, img_path)
                downloaded_files.append(img_path)
                print(f"Downloaded image: {img_path}")
            except Exception as e:
                print(f"Failed to download image {img_key}: {e}")

            # Find corresponding text file
            txt_key = f"{img_key[:-5]}Text"
            for t_key, t_content in text_files:
                if t_key == txt_key:
                    txt_filename = f"{base_name}.txt"
                    txt_path = download_dir / txt_filename

                    try:
                        with open(txt_path, 'w', encoding='utf-8') as f:
                            f.write(t_content)
                        downloaded_files.append(txt_path)
                        print(f"Saved text: {txt_path}")
                    except Exception as e:
                        print(f"Failed to save text {txt_key}: {e}")
                    break

        return downloaded_files

    def _get_file_extension(self, url: str) -> Optional[str]:
        """Extract file extension from URL or content type.

        Args:
            url: The file URL.

        Returns:
            File extension including the dot (e.g., '.png') or None.
        """
        # Try to extract from URL path
        parsed_url = urllib.parse.urlparse(url)
        path = parsed_url.path
        if '.' in path:
            return Path(path).suffix

        # If no extension in URL, try to make a request to get Content-Type
        try:
            response = self.session.head(url)
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'image/png' in content_type:
                    return '.png'
                elif 'image/jpeg' in content_type:
                    return '.jpg'
                elif 'image/webp' in content_type:
                    return '.webp'
        except:
            pass

        return None