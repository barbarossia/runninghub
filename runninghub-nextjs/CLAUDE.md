# RunningHub Next.js - Frontend Development Rules & Standards

This document outlines the frontend development rules, coding standards, and design patterns that must be followed when working on the RunningHub Next.js application.

**Note**: For Git workflow rules, branch management, and commit guidelines, see the global [CLAUDE.md](../CLAUDE.md) in the project root.

## Table of Contents
1. [Build Verification](#build-verification)
2. [Design System & Styling Standards](#design-system--styling-standards)
3. [Component Reusability Standards](#component-reusability-standards)
4. [Folder Selection Requirements](#folder-selection-requirements)
5. [Global Console Requirement](#global-console-requirement)
6. [Data Refresh Policy](#data-refresh-policy)
7. [Hydration Best Practices](#hydration-best-practices)
8. [Gallery Display Style Standard](#gallery-display-style-standard)
9. [Styling Tokens Reference](#styling-tokens-reference)

---

## Build Verification

**RULE 1**: Run `npm run build` before committing any changes and **after completing each implementation phase**.

```bash
npm run build
```

This ensures:
- TypeScript compilation succeeds
- No build errors are introduced
- Changes don't break existing functionality
- New types and components are properly integrated

**Phase-based Development**: When implementing multi-phase features (e.g., following a plan from `docs/`), run the build after completing each phase to catch issues early. This prevents accumulating errors that are harder to debug later.

**Example Workflow**:
```bash
# After completing Phase 1: Type Definitions
npm run build  # ✓ Should succeed

# After completing Phase 2: Store Redesign
npm run build  # ✓ Should succeed

# After completing Phase 3: Components
npm run build  # ✓ Should succeed

# Only commit when build succeeds
git add .
git commit -m "feat: complete phases 1-3"
```

---

## Design System & Styling Standards

### Template Page Reference
**RULE 2**: Use the **Gallery page** (`src/app/gallery/page.tsx`) as the template for all new pages.

All new pages must follow the same:
- **Layout structure**
- **Color schemes**
- **Typography**
- **Spacing patterns**
- **Component organization**

### Page Layout Template

Based on `src/app/gallery/page.tsx`, every page should follow this structure:

```tsx
'use client';

import { useState, useEffect } from 'react';
// ... imports

export default function YourPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          {/* Navigation and title */}
        </div>

        {/* Error Display (if applicable) */}
        {error && <Alert>...</Alert>}

        {/* Main Content */}
        <div className="space-y-6">
          {/* Page content */}
        </div>

        {/* Console Viewer - GLOBAL COMPONENT */}
        <ConsoleViewer
          onRefresh={handleRefresh}
          taskId={activeConsoleTaskId}
          defaultVisible={true}
        />
      </div>
    </div>
  );
}
```

### Color Scheme
- **Background gradient**: `from-blue-50 to-indigo-100` (light theme)
- **Primary accent**: Blue (`bg-blue-50`, `border-blue-500`, `ring-blue-400`)
- **Selection states**: Blue backgrounds and borders
- **Neutral colors**: Gray scales for text and borders (`text-gray-600`, `border-gray-200`)

### Typography
- **Font family**: Inter (Google Fonts)
- **Hierarchy**:
  - Page titles: `text-lg` or `text-xl`
  - Section headers: `text-base`
  - Body text: `text-sm`
  - Labels: `text-xs`
- **Weights**: `font-normal`, `font-medium`, `font-bold`

### Responsive Grid System
Gallery grid pattern (adaptable for other content):
```tsx
// For gallery/item grids
className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
```

---

## Component Reusability Standards

**RULE 3**: Always use the common **Select Folder**, **Toolbar**, and **Console** components. Keep all pages using these components with the same style, layout, and colors.

### 1. Folder Selection Components
**Location**: `src/components/folder/`

**Key Components**:
- `FolderSelectionLayout.tsx` - Main folder selection interface
- `SelectedFolderHeader.tsx` - Header showing selected folder info

**Usage Pattern**:
```tsx
import { FolderSelectionLayout } from '@/components/folder/FolderSelectionLayout';
import { SelectedFolderHeader } from '@/components/folder/SelectedFolderHeader';

// For initial folder selection
<FolderSelectionLayout
  title="Select Your Folder"
  description="Description here"
  icon={YourIcon}
  iconBgColor="bg-blue-50"
  iconColor="text-blue-600"
  onFolderSelected={handleFolderSelected}
  onError={handleError}
  features={featureCards}
/>

// After folder is selected
<SelectedFolderHeader
  folderName={selectedFolder.folder_name}
  folderPath={selectedFolder.folder_path}
  itemCount={items.length}
  itemType="images" // or "videos"
  isVirtual={selectedFolder.is_virtual}
  isLoading={isLoading}
  onRefresh={() => handleRefresh(false)}
  colorVariant="blue"
/>
```

### 2. Selection Toolbar
**Location**: `src/components/selection/`

**Key Component**: `BaseSelectionToolbar.tsx`

**Features**:
- Two modes: expanded (sticky) and floating (compact)
- Animated transitions with Framer Motion
- Consistent action buttons
- Badge showing selected count

**Usage Pattern**:
```tsx
import { SelectionToolbar } from '@/components/selection';

<SelectionToolbar
  onProcess={handleProcess}
  onDelete={handleDelete}
  nodes={nodes}
  selectedNode={selectedNode}
  onNodeChange={setSelectedNode}
/>
```

**Styling Standards**:
- **Expanded mode**: `bg-white/95 backdrop-blur-md border border-blue-100 rounded-xl`
- **Floating mode**: `bg-gray-900/95 border border-gray-700 rounded-full`
- **Badge color**: `bg-blue-600` (customizable via `badgeColor` prop)

### 3. Console Component
**Location**: `src/components/ui/ConsoleViewer.tsx`

**See [Global Console Requirement](#global-console-requirement) below**

---

## Folder Selection Requirements

**RULE 4**: All pages with folder selectors must automatically restore the last opened folder on page load, unless that folder no longer exists.

### Applies To
- Gallery page (`/gallery`)
- Workspace page (`/workspace`)
- Pages page (`/pages`)
- Any other page with folder selection functionality

### Implementation Requirements

1. **Persist folder selection**: Store the selected folder in localStorage when user selects a folder
2. **Auto-restore on load**: When the page loads, check if there's a previously selected folder in localStorage
3. **Validate folder existence**: Before restoring, verify the folder still exists
4. **Fallback to selection screen**: If the folder no longer exists or validation fails, show the folder selection screen

### Implementation Pattern

```typescript
useEffect(() => {
  const loadLastFolder = async () => {
    // 1. Get last selected folder from localStorage
    const lastFolder = useFolderStore.getState().selectedFolder;

    if (lastFolder) {
      // 2. Validate folder still exists
      try {
        const exists = await validateFolderExists(lastFolder.folder_path);

        if (exists) {
          // 3. Restore the folder
          // Folder is already in store, just need to load contents
          await loadFolderContents(lastFolder.folder_path, lastFolder.session_id);
        } else {
          // 4. Folder doesn't exist, clear selection
          useFolderStore.getState().setSelectedFolder(null);
          toast.info('Previously selected folder no longer exists');
        }
      } catch (error) {
        // Validation failed, show selection screen
        console.error('Folder validation failed:', error);
      }
    }
    // If no last folder, show selection screen (default behavior)
  };

  loadLastFolder();
}, []);
```

### Validation API Endpoint

```typescript
// API endpoint to validate folder exists
// GET /api/folder/validate?path=/path/to/folder

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const path = searchParams.get('path');

  if (!path) {
    return NextResponse.json({ exists: false }, { status: 400 });
  }

  try {
    const exists = await checkDirectoryExists(path);
    return NextResponse.json({ exists });
  } catch (error) {
    return NextResponse.json({ exists: false, error: 'Validation failed' });
  }
}
```

### Store Configuration

Ensure folder selection is persisted in store:

```typescript
// In folder-store.ts
export const useFolderStore = create<FolderStore>()(
  persist(
    (set) => ({
      selectedFolder: null,
      setSelectedFolder: (folder) => set({ selectedFolder: folder }),
      // ... other actions
    }),
    {
      name: 'runninghub-folder-storage',
      partialize: (state) => ({
        selectedFolder: state.selectedFolder, // Persist folder selection
      }),
    }
  )
);
```

### User Experience Considerations

- **Loading state**: Show a loading indicator while validating the folder
- **Error handling**: If validation fails, gracefully fallback to folder selection screen
- **Clear indication**: Show which folder is being restored (e.g., "Restoring /path/to/folder...")
- **Manual override**: Always allow user to manually select a different folder via "Change Folder" button

### Checklist

When implementing pages with folder selectors, verify:
- [ ] Folder selection persists in localStorage
- [ ] Last opened folder auto-restores on page load
- [ ] Folder existence is validated before restoring
- [ ] Fallback to selection screen if folder doesn't exist
- [ ] Loading state shown during validation
- [ ] User can manually change folder at any time

---

## Global Console Requirement

**RULE 5**: The Console should be **global** - present on all pages that need feedback, logging, or task tracking.

### ConsoleViewer Component
**File**: `src/components/ui/ConsoleViewer.tsx`

### Required Implementation
Every page MUST include the ConsoleViewer component:

```tsx
import { ConsoleViewer } from '@/components/ui/ConsoleViewer';

export default function YourPage() {
  const [activeConsoleTaskId, setActiveConsoleTaskId] = useState<string | null>(null);

  // ... rest of your component

  return (
    <div>
      {/* Your page content */}

      {/* Console Viewer - ALWAYS INCLUDE */}
      <ConsoleViewer
        onRefresh={handleRefresh}
        taskId={activeConsoleTaskId}
        defaultVisible={true}
      />
    </div>
  );
}
```

### Props Reference

| Prop | Type | Required | Description |
|-----|------|----------|-------------|
| `onRefresh` | `(silent?: boolean) => void` | No | Refresh callback for page data |
| `taskId` | `string \| null` | No | Active task ID to track in console |
| `defaultVisible` | `boolean` | No | Force console visible by default (default: true) |
| `autoRefreshInterval` | `number` | No | Auto-refresh interval in milliseconds |

### Console Features
- **Fixed position**: Bottom-right corner
- **States**: Visible, Minimized, Hidden
- **Auto-expand**: When `taskId` is provided
- **Auto-minimize**: 3 seconds after task completion
- **Real-time polling**: 1-second intervals for logs and task status
- **Color-coded logs**: error (red), success (green), warning (yellow), info (gray)
- **Task progress**: Progress bar with completion tracking

### Console Styling
- **Background**: Black (`bg-black`)
- **Border**: `border-gray-700`
- **Text**: Monospace (`font-mono`)
- **Opacity**: `opacity-95` for visible state

---

## Data Refresh Policy

**RULE 6**: Pages should **NOT auto-refresh**. Only refresh when items (pages, videos, images) are added or removed.

### Refresh Implementation Pattern

**DO**:
```tsx
// Silent refresh for internal updates
const handleRefresh = async (silent = false) => {
  if (selectedFolder) {
    await loadFolderContents(
      selectedFolder.folder_path,
      selectedFolder.session_id,
      silent  // Pass silent flag
    );
  }
};

// Refresh ONLY on add/remove operations
const handleDelete = async (selectedPaths: string[]) => {
  try {
    // ... delete logic

    // REFRESH AFTER DELETE
    if (selectedFolder) {
      await loadFolderContents(selectedFolder.folder_path, selectedFolder.session_id);
    }

    toast.success(`Deleted ${selectedPaths.length} items`);
  } catch (err) {
    toast.error('Failed to delete');
  }
};

// Refresh after adding items
const handleProcess = async (selectedPaths: string[]) => {
  try {
    // ... process logic

    // Optionally refresh to show new items
    await handleRefresh(false);
  } catch (err) {
    toast.error('Failed to process');
  }
};
```

**DON'T**:
```tsx
// ❌ DON'T: Auto-refresh on interval
useEffect(() => {
  const interval = setInterval(() => {
    handleRefresh();
  }, 5000); // NO auto-refresh intervals!

  return () => clearInterval(interval);
}, []);
```

### Silent Refresh
Use `silent: true` for background updates that don't need user notification:

```tsx
// Console-triggered refresh (no toast)
<ConsoleViewer
  onRefresh={() => handleRefresh(true)}  // Silent
  taskId={activeConsoleTaskId}
/>
```

---

## Hydration Best Practices

**RULE 7**: Prevent hydration errors by ensuring server-rendered HTML matches client-rendered HTML.

Hydration errors occur when React's server-rendered HTML doesn't match the client's initial render. This is common with:
- Theme-dependent components (dark mode)
- Components using browser APIs (`localStorage`, `window`)
- Components with client-only state
- Components using `next-themes` or similar libraries

### Common Hydration Pitfalls

**❌ DON'T: Conditional early return**
```tsx
export function MyComponent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ❌ BAD: Different HTML structure on server vs client
  if (!mounted) {
    return <div>Loading...</div>;
  }

  return <div>Content</div>;
}
```

**✅ DO: Unified render with state-based attributes**
```tsx
export function MyComponent() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ✅ GOOD: Same HTML structure, different content/attributes
  return (
    <div>
      <button disabled={!mounted}>
        {mounted ? 'Click me' : 'Loading...'}
      </button>
    </div>
  );
}
```

### Theme Toggle Pattern (with next-themes)

**Standard Pattern**:
```tsx
'use client';

import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Default to light mode before mounting
  const isDark = mounted && theme === 'dark';

  return (
    <button
      onClick={() => mounted && setTheme(isDark ? 'light' : 'dark')}
      disabled={!mounted}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? '🌙' : '☀️'}
    </button>
  );
}
```

**Key Points**:
1. **Never use early return** based on `mounted` state
2. **Default to predictable values** before mounting (e.g., light mode)
3. **Always render the same structure** - only change content/attributes
4. **Use `disabled={!mounted}`** to prevent interactions before hydration
5. **Keep `aria-label` consistent** - calculate it based on `mounted` state

### localStorage and Browser APIs

**❌ DON'T: Access localStorage directly**
```tsx
export function Settings() {
  // ❌ BAD: localStorage is not available on server
  const value = localStorage.getItem('settings');
  return <div>{value}</div>;
}
```

**✅ DO: Use useEffect with mounted state**
```tsx
export function Settings() {
  const [mounted, setMounted] = useState(false);
  const [value, setValue] = useState<string>('');

  useEffect(() => {
    setMounted(true);
    setValue(localStorage.getItem('settings') || '');
  }, []);

  if (!mounted) {
    return <div>Loading settings...</div>;
  }

  return <div>{value}</div>;
}
```

### Random Values and Dates

**❌ DON'T: Use random values or dates in render**
```tsx
export function RandomComponent() {
  // ❌ BAD: Different value on server vs client
  const id = Math.random();
  const time = Date.now();

  return <div id={id}>{time}</div>;
}
```

**✅ DO: Generate in useEffect**
```tsx
export function RandomComponent() {
  const [id, setId] = useState<string>('');
  const [time, setTime] = useState<number>(0);

  useEffect(() => {
    setId(Math.random().toString());
    setTime(Date.now());
  }, []);

  if (!id) {
    return <div>Loading...</div>;
  }

  return <div id={id}>{time}</div>;
}
```

### Checklist for Hydration Safety

Before committing components that use client-only features, verify:

- [ ] No conditional returns based on `mounted` state
- [ ] Server and client render identical HTML structure
- [ ] Browser APIs only accessed in `useEffect`
- [ ] Default values are predictable and consistent
- [ ] `aria-label` and other attributes are always present
- [ ] Components using `next-themes` follow the pattern above
- [ ] No `Math.random()`, `Date.now()`, or similar in render
- [ ] Test with JavaScript disabled to verify SSR

### Common Error Messages

**"Hydration failed because the server rendered HTML didn't match the client"**
- **Cause**: Different HTML structure between server and client
- **Solution**: Ensure same structure, only change content/attributes

**"Text content did not match"**
- **Cause**: Different text content between server and client
- **Solution**: Use default values that match server render

**"Attribute ... did not match"**
- **Cause**: Different attribute values (className, aria-label, etc.)
- **Solution**: Calculate attributes based on `mounted` state

### Reference Implementation

See `src/components/theme/ThemeToggle.tsx` for the correct pattern implementation.

---

## Gallery Display Style Standard

**RULE 8**: **ALL gallery-style displays MUST reference `src/components/workspace/MediaGallery.tsx` as the template.**

This applies to any page or component that displays items (images, videos, files) in a grid/list format:
- Video Gallery (`src/components/videos/VideoGallery.tsx`)
- Image Gallery (`src/components/images/ImageGallery.tsx`)
- Any future gallery-style components

### Gallery Card Structure

Based on `MediaGallery.tsx`, all gallery cards must follow this structure:

```tsx
<motion.div
  layout
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.9 }}
  transition={{ duration: 0.15, delay: index * 0.02 }}
  className="relative group"
>
  <Card
    className={cn(
      'overflow-hidden cursor-pointer transition-all',
      isSelected
        ? 'ring-4 ring-blue-500 ring-offset-2 bg-blue-50 shadow-lg scale-[1.02] z-10'
        : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-2'
    )}
  >
    {/* Thumbnail area - always aspect-square */}
    <div className="relative bg-gray-100 aspect-square">
      {/* Media element with absolute positioning */}
      <video className="absolute inset-0 w-full h-full object-contain p-1" />
      {/* or */}
      <Image className="absolute inset-0 w-full h-full object-contain p-1" />

      {/* Play button for videos (top-left) */}
      <div className="absolute top-2 left-2 z-20">
        <div className="bg-black/50 rounded-full p-1.5 backdrop-blur-sm">
          <PlayCircle className="h-5 w-5" />
        </div>
      </div>

      {/* Checkbox (below play button for videos, top-left for images) */}
      <div className={cn(
        'absolute transition-opacity pointer-events-auto',
        'top-10 left-2',  // For videos (below play button)
        // 'top-2 left-2',  // For images
        isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      )}>
        <Checkbox checked={isSelected} />
      </div>

      {/* More menu (top-right) */}
      <div className="absolute top-2 right-2">
        {/* Dropdown menu */}
      </div>
    </div>

    {/* Info section */}
    <div className={cn(
      'p-2 border-t',
      isSelected ? 'bg-blue-100 border-blue-200' : 'bg-white border-gray-100'
    )}>
      <p className="text-xs font-bold line-clamp-1">Name</p>
      <p className="text-xs text-gray-500">Size info</p>
    </div>
  </Card>
</motion.div>
```

### Grid Configuration

```tsx
// Grid columns by view mode
const gridCols = {
  grid: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
  large: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
  list: 'grid-cols-1'
};

// Always use gap-3 for consistency
<div className={cn('grid gap-3', gridCols[viewMode])}>
```

### Key Styling Requirements

| Element | Requirement |
|---------|-------------|
| **Thumbnail** | `aspect-square`, `bg-gray-100` |
| **Video element** | `absolute inset-0 w-full h-full object-contain p-1` |
| **Image element** | `absolute inset-0` with `object-contain p-1` |
| **Play button** | `top-2 left-2 z-20`, `h-5 w-5` icon, `p-1.5` padding |
| **Checkbox** | `top-10 left-2` for videos, `top-2 left-2` for images |
| **More menu** | `top-2 right-2`, `bg-white/90` background |
| **Info section** | `p-2 border-t`, blue tint when selected |
| **Grid gap** | Always `gap-3` |
| **Card** | `overflow-hidden`, `ring-4` on selection |

### File Locations

- **Reference Template**: `src/components/workspace/MediaGallery.tsx`
- **Apply To**: `src/components/videos/VideoGallery.tsx`, `src/components/images/ImageGallery.tsx`

### Checklist

When creating or updating gallery-style displays:
- [ ] Thumbnail area uses `aspect-square`
- [ ] Video/image elements use `absolute inset-0` positioning
- [ ] Play button at `top-2 left-2` with `h-5 w-5` icon
- [ ] Checkbox positioned correctly (below play button for videos)
- [ ] Grid uses `gap-3` and correct column breakpoints
- [ ] Card uses `overflow-hidden` and proper selection styling
- [ ] Info section uses `p-2 border-t` with blue tint on selection

---

## Styling Tokens Reference

### Color Palette (OKLCH)
Defined in `src/app/globals.css`

**Light Theme**:
```css
--background: oklch(1 0 0);          /* White */
--foreground: oklch(0.145 0 0);      /* Nearly black */
--primary: oklch(0.205 0 0);         /* Dark gray */
--secondary: oklch(0.97 0 0);        /* Light gray */
--accent: oklch(0.97 0 0);           /* Light gray */
--muted: oklch(0.97 0 0);            /* Light gray */
--border: oklch(0.922 0 0);          /* Gray-200 */
--destructive: oklch(0.577 0.245 27.325); /* Red */
```

**Dark Theme**:
```css
--background: oklch(0.145 0 0);      /* Nearly black */
--foreground: oklch(0.985 0 0);      /* Nearly white */
--primary: oklch(0.922 0 0);         /* Light gray */
--border: oklch(1 0 0 / 10%);        /* Transparent white */
```

### Border Radius Scale
```css
--radius: 0.625rem;                  /* Base: 10px */
--radius-sm: calc(var(--radius) - 4px);  /* 6px */
--radius-md: calc(var(--radius) - 2px);  /* 8px */
--radius-lg: var(--radius);          /* 10px */
--radius-xl: calc(var(--radius) + 4px); /* 14px */
--radius-2xl: calc(var(--radius) + 8px); /* 18px */
--radius-3xl: calc(var(--radius) + 12px); /* 22px */
```

### Typography Hierarchy
```tsx
// Page title
"text-xl font-bold"

// Section header
"text-lg font-semibold"

// Card title
"text-base font-medium"

// Body text
"text-sm"

// Caption/label
"text-xs"

// Monospace (code, console)
"font-mono text-[10px]"  // Console
"font-mono text-xs"      // Inline code
```

### Animation Patterns

**Framer Motion Standard**:
```tsx
// Spring animations (standard)
transition={{ type: 'spring', damping: 20, stiffness: 300 }}

// Stagger animations for lists
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1 }
};
```

**Tailwind Animations**:
- `animate-pulse` - Loading indicators
- `animate-spin` - Spinners
- `transition-all` - Smooth transitions
- `hover:scale-105` - Hover effects

---

## Component Import Patterns

### Recommended Import Order
```tsx
// 1. React core
import { useState, useEffect, useCallback } from 'react';

// 2. Third-party libraries
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import Link from 'next/link';

// 3. Store imports (Zustand)
import { useFolderStore } from '@/store/folder-store';
import { useImageStore } from '@/store/image-store';

// 4. Custom hooks
import { useFolderSelection } from '@/hooks/useFolderSelection';
import { useFileSystem } from '@/hooks';

// 5. Components (grouped by type)
import { Card, Button, Badge } from '@/components/ui';
import { SelectedFolderHeader } from '@/components/folder';
import { SelectionToolbar } from '@/components/selection';
import { ConsoleViewer } from '@/components/ui/ConsoleViewer';

// 6. Icons
import { FolderOpen, Home, Settings } from 'lucide-react';

// 7. Types & Constants
import type { ImageFile } from '@/types';
import { API_ENDPOINTS } from '@/constants';
```

---

## Quick Reference Checklist

Before committing frontend changes, verify:

- [ ] `npm run build` succeeds without errors
- [ ] Page follows Gallery page template structure
- [ ] Uses common folder selection component
- [ ] Uses common selection toolbar (if applicable)
- [ ] Includes global ConsoleViewer component
- [ ] No auto-refresh logic (only refresh on add/remove)
- [ ] Styling matches design system (colors, fonts, spacing)
- [ ] Components follow import order pattern
- [ ] TypeScript types properly defined
- [ ] No hydration errors (follow [Hydration Best Practices](#hydration-best-practices))
- [ ] Gallery-style displays follow [MediaGallery template](#gallery-display-style-standard)
- [ ] Folder selection persists and restores (if applicable) - see [RULE 4](#folder-selection-requirements)

**Note**: For Git workflow rules (branch management, commit messages), see the global [CLAUDE.md](../CLAUDE.md)

---

## Additional Resources

### Key File Locations
- **Template page**: `src/app/gallery/page.tsx`
- **Console component**: `src/components/ui/ConsoleViewer.tsx`
- **Selection toolbar**: `src/components/selection/BaseSelectionToolbar.tsx`
- **Folder components**: `src/components/folder/`
- **Theme toggle (hydration reference)**: `src/components/theme/ThemeToggle.tsx`
- **Global styles**: `src/app/globals.css`
- **Type definitions**: `src/types/`
- **Constants**: `src/constants/`

### Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Components**: shadcn/ui + Radix UI
- **State Management**: Zustand
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Toasts**: Sonner

---

## Related Documentation

- **Feature Documentation**: See `docs/` folder for frontend feature plans, implementation guides, and TODO lists
  - `docs/workspace-redesign-plan.md` - Workspace feature redesign plan
  - `docs/workspace-gallery-toolbar-fix.md` - Gallery toolbar implementation plan
  - `docs/nextjs-migration-plan.md` - Next.js migration from Flask
  - `docs/nextjs-migration-todos.md` - Next.js migration task list
- **Global Rules**: See `../CLAUDE.md` for project-wide Git workflow, documentation rules, and build verification
- **Project README**: See `../README.md` for project overview and setup instructions

---

**Last Updated**: 2025-12-26
**Maintained By**: Development Team
