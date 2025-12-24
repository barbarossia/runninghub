# RunningHub

A comprehensive toolkit for interacting with the RunningHub AI platform, featuring both a command-line interface and a modern web application.

## Overview

RunningHub provides two interfaces for processing images with AI workflows:

- **CLI Tool**: A powerful command-line interface for batch processing and automation
- **Web Application**: A modern Next.js application with an intuitive UI for interactive image processing

---

## CLI Tool

A command-line interface for interacting with the RunningHub API. This tool allows you to upload files, submit AI tasks, and monitor their progress from the comfort of your terminal.

## CLI Installation

### From Source

1. Clone this repository:
```bash
git clone <repository-url>
cd runninghub
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Install the CLI in development mode:
```bash
pip install -e .
```

## Configuration

The CLI requires API credentials to work with RunningHub. Create a `.env` file in the project directory based on `.env.example`:

```bash
cp .env.example .env
```

Edit the `.env` file with your credentials:

```bash
# Required: Your RunningHub API key
RUNNINGHUB_API_KEY=your_api_key_here

# Required: Your workflow ID for the AI application
RUNNINGHUB_WORKFLOW_ID=your_workflow_id_here

# Optional: API host (default: www.runninghub.cn)
RUNNINGHUB_API_HOST=www.runninghub.cn
```

## Usage

### Show Configuration
```bash
runninghub config
```

### List Available Nodes
```bash
runninghub nodes
```

### Upload a File
```bash
runninghub upload ./path/to/file.jpg
```

### Submit a Task
```bash
# Submit with text input
runninghub run --node node_id --input "your text here"

# Submit with different input type
runninghub run --node node_id --input "value" --type STRING
runninghub run --node node_id --input "file_id" --type IMAGE
runninghub run --node node_id --input "option" --type LIST
```

### Check Task Status
```bash
# Human-readable output
runninghub status abc123-task-id

# Raw JSON output
runninghub status abc123-task-id --json
```

### Wait for Task Completion
```bash
# Wait with default timeout (10 minutes)
runninghub wait abc123-task-id

# Wait with custom timeout
runninghub wait abc123-task-id --timeout 1800  # 30 minutes

# Wait with different polling interval
runninghub wait abc123-task-id --poll-interval 10

# Get raw JSON output
runninghub wait abc123-task-id --json
```

### Process a File (Upload + Submit + Wait)
This convenience command uploads a file, submits it for processing, and waits for completion:

```bash
# Process an image
runninghub process ./image.jpg --node image_processing_node

# Process with custom timeout
runninghub process ./document.pdf --node document_node --timeout 1800

# Get raw JSON output
runninghub process ./file.jpg --node node_id --json
```

## Environment Options

You can specify a custom environment file location:

```bash
runninghub --env-file /path/to/custom/.env config
```

## API Status Codes

The CLI uses these status codes from the RunningHub API:

- `0`: Task completed successfully
- `804`: Task is running
- `805`: Task failed
- `813`: Task is queuing

## Error Handling

The CLI provides clear error messages for common issues:

- Missing or invalid API credentials
- Network connectivity problems
- File not found errors
- API response errors
- Task timeouts

## Examples

### Complete Workflow Example

```bash
# 1. Check configuration
runninghub config

# 2. List available nodes
runninghub nodes

# 3. Upload an image
runninghub upload ./photo.jpg

# 4. Submit the image for processing
runninghub run --node image_processor --input "file_id_from_upload"

# 5. Check status
runninghub status your_task_id

# 6. Wait for completion
runninghub wait your_task_id
```

### Quick File Processing

```bash
# All-in-one command
runninghub process ./photo.jpg --node image_processor --timeout 1800
```

## Development

### Running Tests

```bash
python -m pytest tests/
```

### Code Structure

```
runninghub_cli/
├── __init__.py          # Package initialization
├── cli.py              # Click-based CLI interface
├── client.py           # RunningHub API client
├── config.py           # Configuration management
└── utils.py            # Utility functions
```

## Requirements

- Python 3.7+
- RunningHub API key and workflow ID

## Dependencies

- `requests` - HTTP client library
- `click` - Command-line interface framework
- `python-dotenv` - Environment variable management
- `colorama` - Cross-platform colored terminal text
- `tqdm` - Progress bars

## Troubleshooting

### Configuration Issues

If you get configuration errors:
1. Ensure your `.env` file exists and is readable
2. Check that `RUNNINGHUB_API_KEY` and `RUNNINGHUB_WORKFLOW_ID` are set
3. Verify your API key is valid and has the necessary permissions

### Connection Issues

If you experience connection problems:
1. Check your internet connection
2. Verify the API host is correct
3. Ensure your API key is valid

### Task Issues

If tasks fail or timeout:
1. Check the task status with `runninghub status <task_id>`
2. Verify the node ID is correct using `runninghub nodes`
3. Ensure input values match the expected format for the node
4. Increase timeout if the task takes longer than expected

## License

This project is licensed under the MIT License.

---

## Web Application

A modern web interface for processing and managing images with the RunningHub AI platform. Built with Next.js 16, React 19, TypeScript, and Tailwind CSS v4.

### Features

- **Modern File System Access API**: Secure, cross-platform folder selection directly in the browser
- **Multiple View Modes**: Grid, list, and large grid layouts for image gallery
- **Batch Image Processing**: Process multiple images with RunningHub AI workflows
- **Real-time Progress Tracking**: Live progress updates for processing tasks
- **Dark Mode Support**: Automatic system theme detection with manual override
- **Keyboard Shortcuts**: Full keyboard navigation for power users
- **Responsive Design**: Mobile-first responsive interface
- **Accessibility**: WCAG 2.1 AA compliant with comprehensive ARIA support

### Tech Stack

- **Framework**: Next.js 16 (React 19, TypeScript 5)
- **Styling**: Tailwind CSS v4 + shadcn/ui + Radix UI
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Testing**: Jest + Testing Library

### Installation

#### Prerequisites

- Node.js 18.17.0 or later
- npm 9.0.0 or later

#### Setup

1. **Navigate to the web application directory**
   ```bash
   cd runninghub-nextjs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your RunningHub API credentials:
   ```env
   NEXT_PUBLIC_RUNNINGHUB_API_KEY=your_api_key_here
   NEXT_PUBLIC_RUNNINGHUB_WORKFLOW_ID=your_workflow_id
   NEXT_PUBLIC_RUNNINGHUB_API_HOST=www.runninghub.cn
   RUNNINGHUB_DOWNLOAD_DIR=/path/to/downloads
   RUNNINGHUB_IMAGE_FOLDER=/path/to/images
   RUNNINGHUB_PREFIX_PATH=/path/to/prefix
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm test             # Run tests once
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + A` | Select all images |
| `Esc` | Deselect all images |
| `Enter` | Process selected images |
| `Delete` | Delete selected images |
| `V` | Cycle through view modes |
| `Click` | Select single image |
| `Cmd/Ctrl + Click` | Toggle image selection |
| `Shift + Click` | Select range of images |

### API Endpoints

#### Folder Operations

- `POST /api/folder/select` - Select a folder by path
- `POST /api/folder/validate-path` - Validate a folder path
- `GET /api/folder/list` - List folder contents
- `POST /api/folder/process-direct` - Process File System Access API data

#### Image Operations

- `POST /api/images/process` - Process images with RunningHub CLI
- `DELETE /api/images/delete` - Delete images

#### Node Management

- `GET /api/nodes` - Get available RunningHub nodes

### Deployment

For detailed deployment instructions, see [runninghub-nextjs/DEPLOYMENT.md](./runninghub-nextjs/DEPLOYMENT.md).

#### Quick Deploy to Vercel

```bash
npm install -g vercel
vercel
```

#### Docker Deployment

```bash
cd runninghub-nextjs
docker build -t runninghub-nextjs .
docker run -p 3000:3000 --env-file .env.production runninghub-nextjs
```

### Browser Compatibility

- **Chrome/Edge**: Full support (including File System Access API)
- **Firefox**: Manual folder input (File System Access API not supported)
- **Safari**: Manual folder input (File System Access API not supported)

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.