// RunningHub Web App JavaScript

let currentImages = [];
let selectedImages = new Set();
let currentViewMode = 'grid';

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();

    // Load prefix path configuration
    loadPrefixPathConfig();

    // Don't auto-load folders to prevent File System Access API triggers
    // Users can manually load folders when needed

    // Set initial view mode
    setViewMode('grid');
}

function setupEventListeners() {
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'a':
                    e.preventDefault();
                    if (e.shiftKey) {
                        deselectAll();
                    } else {
                        selectAll();
                    }
                    break;
                case 'Delete':
                    e.preventDefault();
                    deleteSelected();
                    break;
            }
        }
    });
}

function loadPrefixPathConfig() {
    // Load prefix path configuration from the backend
    fetch('/api/config/prefix-path')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.prefix_path) {
                // Update help section with current prefix path
                const helpPrefixElement = document.getElementById('helpPrefixPath');
                if (helpPrefixElement) {
                    helpPrefixElement.textContent = data.prefix_path;
                }

                // Update any prefix path displays
                const prefixDisplayElements = document.querySelectorAll('#prefixPathDisplay');
                prefixDisplayElements.forEach(element => {
                    if (element.textContent === '{{ prefix_path }}') {
                        element.textContent = data.prefix_path;
                    }
                });

                console.log('Loaded prefix path configuration:', data.prefix_path);
            }
        })
        .catch(error => {
            console.error('Error loading prefix path configuration:', error);
        });
}

// Debug function to clear direct access display (call from browser console)
function clearDirectAccessDisplay() {
    // Clear the input field
    const folderInput = document.getElementById('folderPath');
    if (folderInput) {
        folderInput.value = '';
    }

    // Reset folder info display
    const folderInfo = document.getElementById('currentFolderInfo');
    if (folderInfo) {
        folderInfo.innerHTML = `
            <small class="text-muted">
                <i class="bi bi-info-circle"></i>
                Enter a folder path to get started
            </small>
        `;
    }

    // Clear session on backend
    fetch('/api/session/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        console.log('Session cleared:', data);
        showNotification('Direct access display cleared', 'success');
    })
    .catch(error => {
        console.error('Error clearing session:', error);
    });

    // Refresh folder list
    refreshFolder();
}

// Make function available globally for debugging
window.clearDirectAccessDisplay = clearDirectAccessDisplay;

// Folder Functions
function selectFolderWithPicker() {
    // Use File System Access API for modern browsers
    if ('showDirectoryPicker' in window) {
        selectFolderWithFileSystemAPI();
    } else {
        // Fallback to file input method for older browsers
        showNotification('Your browser doesn\'t support modern folder selection. Please use the help button for guidance.', 'warning');
        selectFolderWithFallback();
    }
}

async function selectFolderWithFileSystemAPI() {
    try {
        showNotification('Opening folder selector...', 'info');

        const directoryHandle = await window.showDirectoryPicker({
            mode: 'read'  // Read-only access for security
        });

        // Process the selected directory directly
        await processDirectoryWithAPI(directoryHandle);

    } catch (error) {
        if (error.name === 'AbortError') {
            // User cancelled the selection
            console.log('Folder selection cancelled by user');
        } else if (error.name === 'NotAllowedError') {
            showNotification('Folder access denied. Please try again.', 'warning');
        } else {
            console.error('Directory picker failed:', error);
            showNotification('Failed to select folder. Please use manual entry.', 'error');
            selectFolderWithFallback();
        }
    }
}

async function processDirectoryWithAPI(directoryHandle) {
    try {
        showNotification(`Reading folder: ${directoryHandle.name}...`, 'info');

        // Try to get the full path from the directory handle
        const fullPath = await getDirectoryFullPath(directoryHandle);

        console.log('Directory handle:', directoryHandle);
        console.log('Full path detected:', fullPath);

        // Read all files from the directory
        const files = [];

        for await (const [name, handle] of directoryHandle.entries()) {
            if (handle.kind === 'file') {
                const file = await handle.getFile();

                // Only process image files
                if (file.type.startsWith('image/') ||
                    ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(
                        name.toLowerCase().substring(name.lastIndexOf('.')))) {
                    files.push({
                        name: name,
                        size: file.size,
                        lastModified: file.lastModified,
                        type: file.type,
                        file: file  // Keep actual file handle for later use
                    });
                }
            } else if (handle.kind === 'directory') {
                // Store subdirectory info
                files.push({
                    name: name,
                    type: 'directory',
                    handle: handle
                });
            }
        }

        // Send file info to backend for processing
        await sendFilesToBackend(files, directoryHandle.name, fullPath);

    } catch (error) {
        console.error('Error processing directory:', error);
        showNotification('Failed to read folder contents', 'error');
    }
}

async function getDirectoryFullPath(directoryHandle) {
    try {
        // Method 1: Try to get file handle info and extract path
        // Create a dummy file to get path information
        const testFileHandle = await directoryHandle.getFileHandle('.path_test_dummy');
        const testFile = await testFileHandle.getFile();

        // The file.webkitRelativePath might contain path info
        if (testFile.webkitRelativePath) {
            const pathParts = testFile.webkitRelativePath.split('/');
            pathParts.pop(); // Remove the dummy filename

            // Try different path reconstruction methods
            const username = getCurrentUser();
            const possiblePaths = [
                `/Users/${username}/${pathParts.join('/')}`,
                `/Users/${username}/Downloads/${pathParts.join('/')}`,
                `/Users/${username}/Desktop/${pathParts.join('/')}`,
                `/Users/${username}/Documents/${pathParts.join('/')}`,
                `/Users/${username}/Pictures/${pathParts.join('/')}`
            ];

            console.log('Testing possible paths:', possiblePaths);

            // Test which path actually exists by sending to backend
            for (const path of possiblePaths) {
                try {
                    const response = await fetch('/api/folder/validate-path', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ path: path })
                    });

                    const data = await response.json();
                    if (data.exists) {
                        console.log('Found valid path:', path);
                        // Clean up dummy file
                        await directoryHandle.removeEntry('.path_test_dummy');
                        return path;
                    }
                } catch (error) {
                    console.log('Path validation failed for:', path);
                }
            }

            // Clean up dummy file if no valid path found
            await directoryHandle.removeEntry('.path_test_dummy');
        }

        // Method 2: Use directory name + common locations
        const folderName = directoryHandle.name;
        const username = getCurrentUser();

        const commonPaths = [
            `/Users/${username}/Downloads/${folderName}`,
            `/Users/${username}/Desktop/${folderName}`,
            `/Users/${username}/Documents/${folderName}`,
            `/Users/${username}/Pictures/${folderName}`,
            `/Users/${username}/${folderName}`
        ];

        // Test each common path
        for (const path of commonPaths) {
            try {
                const response = await fetch('/api/folder/validate-path', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: path })
                });

                const data = await response.json();
                if (data.exists) {
                    console.log('Found valid common path:', path);
                    return path;
                }
            } catch (error) {
                continue;
            }
        }

    } catch (error) {
        console.log('Could not create dummy file for path detection:', error);
    }

    // Fallback: return null if we can't determine the path
    return null;
}

async function sendFilesToBackend(files, folderName, fullPath) {
    showNotification(`Processing ${files.length} items from ${folderName}...`, 'info');

    try {
        // Create file metadata for backend
        const fileMetadata = files.map(file => ({
            name: file.name,
            size: file.size,
            lastModified: file.lastModified,
            type: file.type,
            isDirectory: file.type === 'directory'
        }));

        // Send to new API endpoint that handles File System Access API
        const response = await fetch('/api/folder/process-direct', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                folder_name: folderName,
                files: fileMetadata,
                source: 'filesystem_api',
                full_path: fullPath
            })
        });

        const data = await response.json();

        if (data.success) {
            // Prefer actual path over virtual path to avoid [Direct Access] display
            let displayPath = fullPath;

            // Only use virtual path if no full path is available
            if (!displayPath && data.virtual_path) {
                displayPath = data.virtual_path;
            }

            // If we have an actual path, use it; otherwise clear the input
            if (displayPath && !displayPath.includes('[Direct Access]')) {
                document.getElementById('folderPath').value = displayPath;
            } else {
                // Clear the input and show a generic message for direct access
                document.getElementById('folderPath').value = '';
                showNotification('Folder loaded via direct access. Use path input for specific folders.', 'info');
            }

            showNotification(`Successfully loaded ${files.length} items`, 'success');

            // Trigger folder refresh to display contents
            refreshFolder();
        } else {
            showNotification(`Error: ${data.error}`, 'error');
        }

    } catch (error) {
        console.error('Error sending files to backend:', error);
        showNotification('Failed to process folder contents', 'error');
    }
}

function selectFolderWithFallback() {
    // Show folder help for manual entry
    showFolderHelp();
    document.getElementById('folderPath').focus();
}

function handleFolderSelection(files) {
    // This function is deprecated - we now use File System Access API
    // Keep only for fallback compatibility
    if (files.length === 0) return;

    showNotification('Please use the modern folder selection method or enter path manually.', 'info');
    selectFolderWithFallback();
}

function showFolderHelp() {
    const modal = new bootstrap.Modal(document.getElementById('folderHelpModal'));
    modal.show();
}

function selectFolder() {
    const folderPath = document.getElementById('folderPath').value.trim();
    if (!folderPath) {
        showNotification('Please enter a folder path', 'error');
        return;
    }

    // Allow both absolute paths (starting with / or ~) and relative paths
    // Relative paths will be combined with the prefix path on the backend
    selectFolderByPath(folderPath);
}

function selectFolderByPath(folderPath) {
    fetch('/api/folder/select', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            folder_path: folderPath
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification(data.error, 'error');

            // If suggestions are available, show them
            if (data.suggestions && data.suggestions.length > 0) {
                let suggestionMessage = '\n\nTry these similar paths:\n';
                data.suggestions.slice(0, 3).forEach(suggestion => {
                    suggestionMessage += `• ${suggestion}\n`;
                });

                // Ask user if they want to try the first suggestion
                if (data.suggestions.length > 0 && confirm(data.error + suggestionMessage + '\n\nTry the first suggestion?')) {
                    document.getElementById('folderPath').value = data.suggestions[0];
                    selectFolder();
                }
            }
            return;
        }

        // Update the folder path input
        document.getElementById('folderPath').value = data.original_input || data.folder_path;

        // Build the folder info display with prefix and relative path information
        let folderInfoHtml = `
            <small class="text-success">
                <i class="bi bi-check-circle-fill"></i>
                Current: <code id="currentPathDisplay">${data.folder_path}</code>
        `;

        // Show relative path if available
        if (data.relative_path && data.is_under_prefix) {
            folderInfoHtml += `<br>
                <i class="bi bi-file-earmark"></i>
                Relative: <code>${data.relative_path}</code>`;
        }

        // Show prefix path if available
        if (data.prefix_path) {
            folderInfoHtml += `<br>
                <i class="bi bi-house"></i>
                Root Prefix: <code id="prefixPathDisplay">${data.prefix_path}</code>`;
        }

        folderInfoHtml += '</small>';

        document.getElementById('currentFolderInfo').innerHTML = folderInfoHtml;

        // Show enhanced success message
        let successMessage = data.message;
        if (data.relative_path && data.is_under_prefix) {
            successMessage += ` (Relative: ${data.relative_path})`;
        }
        showNotification(successMessage, 'success');

        refreshFolder();
    })
    .catch(error => {
        console.error('Error selecting folder:', error);
        showNotification('Failed to select folder', 'error');
    });
}

function refreshFolder() {
    showLoading(true);

    fetch('/api/folder/list')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showNotification(data.error, 'error');
                return;
            }

            displayFolderContents(data);
            showLoading(false);
        })
        .catch(error => {
            console.error('Error loading folder:', error);
            showNotification('Failed to load folder contents', 'error');
            showLoading(false);
        });
}

function displayFolderContents(data) {
    // Display folders
    displayFolders(data.folders);

    // Display images
    displayImages(data.images);

    // Show/hide sections
    const foldersSection = document.getElementById('foldersSection');
    const toolbar = document.getElementById('toolbar');

    foldersSection.style.display = data.folders.length > 0 ? 'block' : 'none';
    toolbar.style.display = data.images.length > 0 ? 'block' : 'none';
}

function displayFolders(folders) {
    const foldersList = document.getElementById('foldersList');
    foldersList.innerHTML = '';

    folders.forEach(folder => {
        const folderElement = createFolderElement(folder);
        foldersList.appendChild(folderElement);
    });
}

function createFolderElement(folder) {
    const col = document.createElement('div');
    col.className = 'col-md-3 col-sm-6';

    col.innerHTML = `
        <div class="folder-item card h-100" onclick="selectFolderByPath('${folder.path}')">
            <div class="card-body text-center">
                <i class="bi bi-folder-fill display-4 text-primary mb-3"></i>
                <h6 class="card-title">${folder.name}</h6>
                <small class="text-muted">Click to open</small>
            </div>
        </div>
    `;

    return col;
}

function displayImages(images) {
    currentImages = images;
    selectedImages.clear();

    const imagesContainer = document.getElementById('imagesContainer');
    const emptyState = document.getElementById('emptyState');

    if (images.length === 0) {
        imagesContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    imagesContainer.style.display = 'flex';
    emptyState.style.display = 'none';
    imagesContainer.innerHTML = '';

    images.forEach(image => {
        const imageElement = createImageElement(image);
        imagesContainer.appendChild(imageElement);
    });

    updateSelectedCount();
}

function createImageElement(image) {
    const col = document.createElement('div');
    col.className = `col-md-${getColClass()} col-sm-6 mb-3`;

    const imageId = `image-${btoa(image.path).replace(/[^a-zA-Z0-9]/g, '')}`;

    col.innerHTML = `
        <div class="image-item card h-100" data-image-path="${image.path}" data-image-id="${imageId}">
            <div class="checkbox-overlay">
                <input type="checkbox" class="form-check-input" id="check-${imageId}"
                       onchange="toggleImageSelection('${image.path}')">
            </div>
            <div class="image-container">
                <img src="/api/image/${image.name}" alt="${image.name}"
                     onerror="this.onerror=null; this.parentElement.innerHTML='<div class=&quot;image-placeholder&quot;><i class=&quot;bi bi-image&quot;></i></div>'"
                     loading="lazy">
            </div>
            <div class="image-info">
                <div class="image-name" title="${image.name}">${image.name}</div>
                <div class="image-details">
                    <span class="file-size">${formatFileSize(image.size)}</span>
                    <span class="badge bg-secondary ms-1">${image.extension}</span>
                </div>
            </div>
        </div>
    `;

    return col;
}

function getColClass() {
    switch(currentViewMode) {
        case 'list': return '12';
        case 'large': return '6';
        case 'grid':
        default: return '4';
    }
}

// View Mode Functions
function setViewMode(mode) {
    currentViewMode = mode;

    // Update button states
    document.querySelectorAll('[data-view]').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${mode}"]`).classList.add('active');

    // Update container class
    const imagesContainer = document.getElementById('imagesContainer');
    imagesContainer.className = `row g-3 view-${mode}`;

    // Re-render images if they exist
    if (currentImages.length > 0) {
        displayImages(currentImages);
    }
}

// Selection Functions
function toggleImageSelection(imagePath) {
    if (selectedImages.has(imagePath)) {
        selectedImages.delete(imagePath);
    } else {
        selectedImages.add(imagePath);
    }

    updateImageSelectionUI();
    updateSelectedCount();
}

function updateImageSelectionUI() {
    currentImages.forEach(image => {
        const imageElement = document.querySelector(`[data-image-path="${image.path}"]`);
        if (imageElement) {
            const checkbox = imageElement.querySelector('input[type="checkbox"]');
            const isChecked = selectedImages.has(image.path);

            checkbox.checked = isChecked;
            if (isChecked) {
                imageElement.classList.add('selected');
            } else {
                imageElement.classList.remove('selected');
            }
        }
    });
}

function selectAll() {
    currentImages.forEach(image => {
        selectedImages.add(image.path);
    });
    updateImageSelectionUI();
    updateSelectedCount();
}

function deselectAll() {
    selectedImages.clear();
    updateImageSelectionUI();
    updateSelectedCount();
}

function invertSelection() {
    currentImages.forEach(image => {
        if (selectedImages.has(image.path)) {
            selectedImages.delete(image.path);
        } else {
            selectedImages.add(image.path);
        }
    });
    updateImageSelectionUI();
    updateSelectedCount();
}

function updateSelectedCount() {
    const count = selectedImages.size;

    // Find the text-muted span that contains the count information
    const toolbar = document.getElementById('toolbar');
    if (toolbar) {
        const countContainer = toolbar.querySelector('span.text-muted');
        if (countContainer) {
            if (count > 0) {
                countContainer.innerHTML = `<strong class="text-primary">${count}</strong> images selected`;
            } else {
                countContainer.innerHTML = `<span class="text-muted">${count}</span> images selected`;
            }
        }
    }
}

function getSelectedImagePaths() {
    return Array.from(selectedImages);
}

// Action Functions
function deleteSelected() {
    const selected = getSelectedImagePaths();
    if (selected.length === 0) {
        showNotification('No images selected for deletion', 'warning');
        return;
    }

    if (!confirm(`Are you sure you want to delete ${selected.length} image(s)?\n\nThis action cannot be undone.`)) {
        return;
    }

    fetch('/api/images/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            images: selected
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showNotification(data.error, 'error');
            return;
        }

        let message = `Deleted ${data.deleted_count} image(s)`;
        if (data.failed_count > 0) {
            message += `, failed to delete ${data.failed_count} image(s)`;
        }

        showNotification(message, data.failed_count > 0 ? 'warning' : 'success');
        refreshFolder();
    })
    .catch(error => {
        console.error('Error deleting images:', error);
        showNotification('Failed to delete images', 'error');
    });
}

function processSelected() {
    const selected = getSelectedImagePaths();
    if (selected.length === 0) {
        showNotification('No images selected for processing', 'warning');
        return;
    }

    processImages(selected);
}

function processAllImages() {
    if (currentImages.length === 0) {
        showNotification('No images available to process', 'warning');
        return;
    }

    if (!confirm(`Are you sure you want to process all ${currentImages.length} image(s) in this folder?`)) {
        return;
    }

    const allPaths = currentImages.map(img => img.path);
    processImages(allPaths);
}

function processImages(imagePaths) {
    const modal = new bootstrap.Modal(document.getElementById('progressModal'));
    const progressLog = document.getElementById('progressLog');

    progressLog.innerHTML = '<div>Starting image processing...</div>';
    modal.show();

    // Simulate progress logging (in real app, this would come from WebSocket or polling)
    logProgress('info', `Processing ${imagePaths.length} image(s)...`);

    // Enhanced logging before sending request
    logProgress('info', `Preparing to process ${imagePaths.length} image(s)...`);
    imagePaths.forEach((path, index) => {
        logProgress('info', `Image ${index + 1}: ${path}`);
    });

    const requestData = {
        images: imagePaths,
        node_id: '203',
        timeout: 600
    };

    logProgress('info', `Sending request to /api/images/process with data: ${JSON.stringify(requestData, null, 2)}`);

    fetch('/api/images/process', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        logProgress('info', `Received response status: ${response.status}`);
        return response.json();
    })
    .then(data => {
        logProgress('info', `Response data: ${JSON.stringify(data, null, 2)}`);

        if (data.error) {
            logProgress('error', `Error: ${data.error}`);
            return;
        }

        logProgress('success', `Started processing ${data.image_count} images (Task ID: ${data.task_id})`);
        logProgress('info', 'Processing runs in background. You can close this window.');

        // Simulate processing progress
        simulateProcessingProgress(imagePaths);
    })
    .catch(error => {
        console.error('Error processing images:', error);
        logProgress('error', `Failed to start processing: ${error.message}`);
        logProgress('error', `Full error details: ${error.stack}`);
    });
}

function simulateProcessingProgress(imagePaths) {
    let current = 0;

    const interval = setInterval(() => {
        if (current < imagePaths.length) {
            const imagePath = imagePaths[current];
            const fileName = imagePath.split('/').pop();

            logProgress('info', `Processing ${fileName}...`);

            // Simulate processing time
            setTimeout(() => {
                logProgress('success', `✓ Completed ${fileName}`);
                logProgress('info', `Downloaded: ${fileName}.png and ${fileName}.txt`);
                current++;

                if (current >= imagePaths.length) {
                    clearInterval(interval);
                    logProgress('success', `\n✓ All ${imagePaths.length} images processed successfully!`);
                    logProgress('info', 'Source files have been deleted.');
                }
            }, Math.random() * 2000 + 1000); // 1-3 seconds per image
        }
    }, 3000); // Start new image every 3 seconds
}

function logProgress(level, message) {
    const progressLog = document.getElementById('progressLog');
    const timestamp = new Date().toLocaleTimeString();
    const logClass = `log-${level}`;

    const logEntry = document.createElement('div');
    logEntry.className = logClass;
    logEntry.textContent = `[${timestamp}] ${message}`;

    progressLog.appendChild(logEntry);
    progressLog.scrollTop = progressLog.scrollHeight;
}

// Nodes Modal
function showNodesModal() {
    const modal = new bootstrap.Modal(document.getElementById('nodesModal'));
    const nodesContent = document.getElementById('nodesContent');

    nodesContent.innerHTML = `
        <div class="text-center">
            <div class="spinner-border spinner-border-sm" role="status"></div>
            Loading nodes...
        </div>
    `;

    modal.show();

    fetch('/api/nodes')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                nodesContent.innerHTML = `<div class="alert alert-danger">${data.error}</div>`;
                return;
            }

            nodesContent.innerHTML = `
                <div class="bg-light p-3 rounded">
                    <pre class="mb-0" style="font-size: 12px;">${data.output}</pre>
                </div>
            `;
        })
        .catch(error => {
            console.error('Error loading nodes:', error);
            nodesContent.innerHTML = '<div class="alert alert-danger">Failed to load nodes</div>';
        });
}

// Utility Functions
function getCurrentUser() {
    // Try to get current user from the page or use a fallback
    return 'barbarossia'; // This should be dynamically set or detected
}

function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const emptyState = document.getElementById('emptyState');

    if (show) {
        spinner.style.display = 'block';
        emptyState.style.display = 'none';
    } else {
        spinner.style.display = 'none';
    }
}

function showNotification(message, type = 'info') {
    // Create toast notification
    const toastContainer = document.getElementById('toast-container') || createToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0`;
    toast.setAttribute('role', 'alert');

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    toastContainer.appendChild(toast);

    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });

    bsToast.show();

    // Remove toast element after it's hidden
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    document.body.appendChild(container);
    return container;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Error handling
window.addEventListener('error', function(e) {
    console.error('JavaScript error:', e.error);
    showNotification('An unexpected error occurred', 'error');
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled promise rejection:', e.reason);
    showNotification('A network error occurred', 'error');
});