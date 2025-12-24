# RunningHub Next.js Application

A modern web interface for processing and managing images with the RunningHub AI platform. Built with Next.js 16, React 19, TypeScript, and Tailwind CSS v4.

## Features

- **Modern File System Access API**: Secure, cross-platform folder selection directly in the browser
- **Multiple View Modes**: Grid, list, and large grid layouts for image gallery
- **Batch Image Processing**: Process multiple images with RunningHub AI workflows
- **Real-time Progress Tracking**: Live progress updates for processing tasks
- **Dark Mode Support**: Automatic system theme detection with manual override
- **Keyboard Shortcuts**: Full keyboard navigation for power users
- **Responsive Design**: Mobile-first responsive interface
- **Accessibility**: WCAG 2.1 AA compliant with comprehensive ARIA support

## Tech Stack

- **Framework**: Next.js 16 (React 19, TypeScript 5)
- **Styling**: Tailwind CSS v4 + shadcn/ui + Radix UI
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React
- **Testing**: Jest + Testing Library
- **Code Quality**: ESLint + Prettier + Husky

## Project Structure

```
runninghub-nextjs/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── gallery/           # Gallery page
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Home page
│   ├── components/
│   │   ├── folder/            # Folder selection components
│   │   ├── images/            # Image gallery components
│   │   ├── progress/          # Progress tracking components
│   │   ├── selection/         # Selection toolbar components
│   │   ├── theme/             # Theme provider components
│   │   └── ui/                # shadcn/ui components
│   ├── hooks/                  # Custom React hooks
│   ├── store/                  # Zustand state management
│   ├── types/                  # TypeScript type definitions
│   ├── utils/                  # Utility functions
│   └── constants/              # Application constants
├── public/                     # Static assets
├── .env.local                  # Environment variables (local)
├── next.config.ts             # Next.js configuration
├── jest.config.js             # Jest configuration
└── package.json               # Project dependencies
```

## Getting Started

### Prerequisites

- Node.js 18.17.0 or later
- Python 3.8 or later (for RunningHub CLI)
- npm 9.0.0 or later

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
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

## Available Scripts

### Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Testing

```bash
npm test             # Run tests once
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

## Keyboard Shortcuts

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

## API Endpoints

### Folder Operations

- `POST /api/folder/select` - Select a folder by path
- `POST /api/folder/validate-path` - Validate a folder path
- `GET /api/folder/list` - List folder contents
- `POST /api/folder/process-direct` - Process File System Access API data

### Image Operations

- `POST /api/images/process` - Process images with RunningHub CLI
- `DELETE /api/images/delete` - Delete images

### Node Management

- `GET /api/nodes` - Get available RunningHub nodes

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_RUNNINGHUB_API_KEY` | RunningHub API key | Yes |
| `NEXT_PUBLIC_RUNNINGHUB_WORKFLOW_ID` | RunningHub workflow ID | Yes |
| `NEXT_PUBLIC_RUNNINGHUB_API_HOST` | RunningHub API host | No (default: www.runninghub.cn) |
| `RUNNINGHUB_DOWNLOAD_DIR` | Download directory path | Yes |
| `RUNNINGHUB_IMAGE_FOLDER` | Default image folder | Yes |
| `RUNNINGHUB_PREFIX_PATH` | Prefix path for relative paths | Yes |

## Deployment

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

### Quick Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Docker Deployment

```bash
docker build -t runninghub-nextjs .
docker run -p 3000:3000 --env-file .env.production runninghub-nextjs
```

## Browser Compatibility

- **Chrome/Edge**: Full support (including File System Access API)
- **Firefox**: Manual folder input (File System Access API not supported)
- **Safari**: Manual folder input (File System Access API not supported)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Development Workflow

### Code Quality

The project uses Husky for pre-commit hooks:
- ESLint runs on every commit
- Prettier formats code automatically
- Lint-staged ensures only staged files are checked

### Testing

Write tests for new features:
```bash
# Create test file
touch src/components/your-component/__tests__/YourComponent.test.tsx

# Run tests
npm test
```

### Build Verification

Always build before committing:
```bash
npm run build
npm run lint
npm test
```

## Troubleshooting

### Build Errors

**Issue**: Module not found
```bash
rm -rf node_modules package-lock.json
npm install
```

**Issue**: TypeScript errors
```bash
npm run build -- --debug
```

### Runtime Errors

**Issue**: API calls failing
- Check environment variables in `.env.local`
- Verify RunningHub API credentials
- Check browser console for CORS errors

**Issue**: File system access not working
- Use Chrome or Edge for File System Access API
- Ensure the page is served over HTTPS or localhost
- Try manual folder input as fallback

## License

This project is licensed under the MIT License.

## Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [shadcn/ui](https://ui.shadcn.com/) - UI component library
- [RunningHub](https://www.runninghub.cn/) - AI image processing platform
- [Framer Motion](https://www.framer.com/motion/) - Animation library
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework
