# RunningHub Web Application

A web interface for managing and processing images using the RunningHub CLI tool.

## Features

### 📁 **File Browser**
- **Folder Selection**: Browse and select any folder containing images
- **Default Folder**: Uses configured folder from `.env` (`RUNNINGHUB_IMAGE_FOLDER`)
- **Navigation**: Click on folders to navigate between directories

### 🖼️ **Image Display**
- **Multiple View Modes**:
  - **List View**: Compact list with thumbnails
  - **Grid View**: Medium-sized thumbnails (default)
  - **Large View**: Large thumbnails for detailed viewing
- **Image Information**: File size, format, and name
- **Responsive Design**: Works on desktop, tablet, and mobile

### ✅ **Batch Selection**
- **Individual Selection**: Click checkboxes to select specific images
- **Select All**: Select all images in current folder
- **Deselect All**: Clear all selections
- **Invert Selection**: Toggle selection state of all images
- **Selection Counter**: Shows number of selected images

### 🗑️ **Batch Operations**
- **Delete Images**: Permanently delete selected images with confirmation
- **Process Images**: Run RunningHub CLI processing on selected images
- **Process All**: Process all images in the current folder

### 🔄 **Integration with RunningHub CLI**
- **Background Processing**: Images are processed in the background
- **Progress Tracking**: Real-time progress updates during processing
- **Automatic Download**: Processed images and text files downloaded automatically
- **Source Cleanup**: Original images deleted after successful processing
- **Input-Based Naming**: Output files use same base name as input files

## Installation

### Prerequisites
- Python 3.7+
- RunningHub CLI (already available in parent directory)
- Valid `.env` configuration for RunningHub

### Setup

1. **Install Dependencies**:
   ```bash
   cd web_app
   pip install -r requirements.txt
   ```

2. **Verify Configuration**:
   Ensure your `.env` file in the parent directory contains:
   ```bash
   RUNNINGHUB_API_KEY=your_api_key_here
   RUNNINGHUB_WORKFLOW_ID=your_workflow_id_here
   RUNNINGHUB_IMAGE_FOLDER=~/ai_coding/runninghub  # Optional
   RUNNINGHUB_DOWNLOAD_DIR=~/Downloads              # Optional
   ```

3. **Run the Application**:
   ```bash
   python app.py
   ```

4. **Access the Web Interface**:
   Open your browser and go to `http://localhost:5000`

## Usage

### 1. **Select a Folder**
- Enter folder path manually (e.g., `/Users/yourname/Pictures`)
- Click "Browse" button (limited by browser security)
- Click "Select" to load folder contents

### 2. **Browse Images**
- Images are displayed in the selected view mode
- Folders can be clicked to navigate
- Use toolbar to change view modes

### 3. **Select Images**
- Click checkboxes to select individual images
- Use "Select All" to select all images
- Selection counter shows how many images are selected

### 4. **Process Images**
- Select desired images
- Click "Process" button
- Confirm processing in dialog
- Monitor progress in real-time
- Images are processed using RunningHub CLI
- Results downloaded to configured directory

### 5. **Manage Images**
- Use "Delete" to remove selected images
- Confirmation dialog prevents accidental deletion
- Refresh button reloads folder contents

## Features Breakdown

### **View Modes**
- **List**: `12` columns per row, shows file details
- **Grid**: `4` columns per row, balanced view
- **Large**: `6` columns per row, bigger thumbnails

### **Keyboard Shortcuts**
- `Ctrl/Cmd + A`: Select all images
- `Ctrl/Cmd + Shift + A`: Deselect all images
- `Delete`: Delete selected images (with confirmation)

### **File Support**
- **Image Formats**: PNG, JPG, JPEG, GIF, BMP, WEBP
- **File Operations**: View, select, delete, process
- **Navigation**: Click folders to browse subdirectories

### **Integration**
- **RunningHub CLI**: Uses existing CLI for processing
- **Background Tasks**: Processing runs in background
- **Progress Monitoring**: Real-time updates during processing
- **Error Handling**: Clear error messages and recovery options

## Configuration

### **Environment Variables**
```bash
# Required (in parent .env)
RUNNINGHUB_API_KEY=your_api_key
RUNNINGHUB_WORKFLOW_ID=your_workflow_id

# Optional (in parent .env)
RUNNINGHUB_API_HOST=www.runninghub.cn
RUNNINGHUB_IMAGE_FOLDER=~/ai_coding/runninghub
RUNNINGHUB_DOWNLOAD_DIR=~/Downloads
```

### **Web App Settings**
- **Host**: `0.0.0.0` (accessible from other devices)
- **Port**: `5000`
- **Debug Mode**: Enabled by default

## Troubleshooting

### **Common Issues**

1. **"Failed to initialize configuration"**
   - Check `.env` file in parent directory
   - Verify `RUNNINGHUB_API_KEY` and `RUNNINGHUB_WORKFLOW_ID`
   - Ensure file permissions are correct

2. **"Folder does not exist"**
   - Verify folder path is correct
   - Check folder permissions
   - Use absolute paths when possible

3. **"No images found"**
   - Confirm folder contains supported image formats
   - Check file extensions (PNG, JPG, JPEG, etc.)
   - Verify files are not corrupted

4. **"Processing failed"**
   - Check RunningHub API connection
   - Verify node availability (click "Available Nodes")
   - Check internet connectivity

### **Debug Mode**
The app runs in debug mode by default. Check the terminal for detailed error messages.

### **Logs**
- **Console**: Web server logs appear in terminal
- **Browser**: Check developer console for JavaScript errors
- **Network**: Monitor API calls in browser dev tools

## Development

### **Project Structure**
```
web_app/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── static/               # Static assets
│   ├── css/
│   │   └── style.css    # Application styles
│   └── js/
│       └── app.js        # Client-side JavaScript
└── templates/            # HTML templates
    ├── index.html       # Main interface
    └── error.html       # Error page
```

### **API Endpoints**
- `GET /` - Main interface
- `POST /api/folder/select` - Select folder
- `GET /api/folder/list` - List folder contents
- `DELETE /api/images/delete` - Delete images
- `POST /api/images/process` - Process images
- `GET /api/nodes` - Get available nodes
- `GET /api/image/<filename>` - Serve images

### **Extending the App**
The application is designed to be easily extensible:
- Add new view modes in CSS and JavaScript
- Implement additional image operations
- Add user authentication if needed
- Integrate with other image processing services

## Security Notes

- Images are served from local filesystem only
- No file uploads are accepted
- Folder operations are restricted to local paths
- Processing uses existing RunningHub CLI authentication

## License

This web application is part of the RunningHub CLI project.