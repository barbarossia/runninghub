# Next.js Migration Plan for RunningHub Web Application

## Project Overview
Migrate the Flask-based web application (`web_app/`) to Next.js 14 while maintaining the Python CLI for backend processing. Focus on enhanced developer experience, Next.js features, and modern UI/UX redesign.

## Current State
- **Backend**: Flask app (716 lines) with 12 API routes
- **Frontend**: Vanilla JavaScript (950 lines) with Bootstrap 5.1.3
- **CLI Integration**: Python subprocess calls via Flask
- **Features**: File browsing, image processing (3 view modes), bulk operations, progress tracking

## Migration Strategy

### 1. Technology Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **State Management**: Zustand
- **CLI Integration**: Python subprocess via Next.js API routes
- **Animations**: Framer Motion

### 2. Project Structure
```
runninghub-nextjs/
├── src/app/
│   ├── api/           # API routes (12 endpoints)
│   ├── components/    # React components
│   ├── hooks/         # Custom hooks
│   ├── lib/           # Utilities & types
│   └── store/         # Zustand stores
├── package.json
├── next.config.js
└── tailwind.config.js
```

### 3. Key Implementation Phases

#### Phase 1: Project Setup (Days 1-2)
- Initialize Next.js with TypeScript
- Set up Tailwind CSS and shadcn/ui
- Configure environment variables (.env.local)
- Create basic project structure

#### Phase 2: API Migration (Days 3-5)
- Migrate all Flask routes to Next.js API routes
- Implement subprocess integration for Python CLI
- Maintain same request/response format
- Critical routes: `/api/folder/select`, `/api/images/process`, `/api/nodes`

#### Phase 3: Core Components (Days 6-10)
- Build folder selection with File System Access API
- Create image gallery with 3 view modes (grid/list/large)
- Implement selection system with keyboard shortcuts
- Add progress tracking modal

#### Phase 4: State Management (Days 11-13)
- Set up Zustand stores
- Implement custom hooks
- Connect components to API routes
- Add real-time progress updates

#### Phase 5: Modern UI/UX (Days 14-16)
- Add Framer Motion animations
- Implement dark mode support
- Enhance accessibility
- Add skeleton loading states

#### Phase 6: Testing & Optimization (Days 17-18)
- Set up testing framework
- Optimize images with Next.js Image component
- Implement code splitting
- Performance optimization

#### Phase 7: Deployment (Days 19-20)
- Production build configuration
- Update documentation
- Test CLI integration in production

### 4. Critical Files to Create

#### API Routes
1. `/src/app/api/folder/select/route.ts` - Folder selection & validation
2. `/src/app/api/images/process/route.ts` - Image processing via Python CLI
3. `/src/app/api/nodes/route.ts` - Available processing nodes
4. `/src/app/api/images/delete/route.ts` - Bulk image deletion

#### Core Components
1. `/src/components/folder/FolderSelector.tsx` - File System Access API integration
2. `/src/components/images/ImageGallery.tsx` - Main image display component
3. `/src/components/selection/SelectionToolbar.tsx` - Bulk operations interface
4. `/src/components/progress/ProgressModal.tsx` - Real-time progress tracking

#### Custom Hooks
1. `/src/hooks/useFileSystem.ts` - File System Access API & folder operations
2. `/src/hooks/useImageSelection.ts` - Image selection state management
3. `/src/hooks/useProgressTracking.ts` - Real-time progress monitoring

#### State Management
1. `/src/store/folder-slice.ts` - Folder navigation state
2. `/src/store/image-slice.ts` - Image data management
3. `/src/store/selection-slice.ts` - Selection state

### 5. Environment Configuration
```env
# RunningHub Configuration (copied from existing .env)
RUNNINGHUB_API_KEY=your_api_key
RUNNINGHUB_WORKFLOW_ID=your_workflow_id
RUNNINGHUB_API_HOST=www.runninghub.cn
RUNNINGHUB_DOWNLOAD_DIR=~/Downloads
RUNNINGHUB_IMAGE_FOLDER=~/ai_coding/runninghub

# Next.js Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. CLI Integration Strategy
- **Approach**: Next.js API routes call Python CLI via subprocess
- **Benefits**: Maintains existing CLI functionality, minimal risk
- **Implementation**: Same subprocess pattern as Flask app
- **Environment**: Pass all CLI environment variables to subprocess

### 7. Enhanced Features
- **Modern UI**: shadcn/ui components with Tailwind CSS
- **Animations**: Smooth transitions with Framer Motion
- **Accessibility**: ARIA labels, keyboard navigation
- **Performance**: Image optimization, code splitting
- **Developer Experience**: TypeScript, hot reloading, debugging tools

### 8. Migration Benefits
- **Enhanced Developer Experience**: TypeScript, hot reloading, modern tooling
- **Next.js Features**: API routes, image optimization, server components
- **Modern UI/UX**: Responsive design, dark mode, animations
- **Performance**: Optimized bundles, lazy loading, caching
- **Deployment**: Easy deployment to Vercel, Netlify, etc.

### 9. Risk Mitigation
- **Preserve CLI**: Keep Python CLI unchanged to avoid breaking core functionality
- **Gradual Migration**: Phase-by-phase approach allows testing at each step
- **API Compatibility**: Maintain same request/response format
- **Rollback Plan**: Keep Flask app as backup during migration

### 10. Success Criteria
- All existing functionality preserved
- Improved developer experience with modern tooling
- Enhanced UI/UX with modern React patterns
- Maintained CLI integration without changes
- Easy deployment and maintenance

## Implementation Progress
- [x] Project planning and architecture design
- [x] Documentation folder creation
- [ ] Next.js project initialization
- [ ] API route migration
- [ ] Component development
- [ ] Testing and deployment