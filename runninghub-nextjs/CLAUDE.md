# RunningHub Next.js - Frontend Development Rules & Standards

This document outlines the frontend development rules, coding standards, and design patterns that must be followed when working on the RunningHub Next.js application.

**Note**: For Git workflow rules, branch management, and commit guidelines, see the global [CLAUDE.md](../CLAUDE.md) in the project root.

## Table of Contents
1. [Design System & Styling Standards](#design-system--styling-standards)
2. [Component Reusability Standards](#component-reusability-standards)
3. [Global Console Requirement](#global-console-requirement)
4. [Data Refresh Policy](#data-refresh-policy)
5. [Styling Tokens Reference](#styling-tokens-reference)

---

## Build Verification

Before committing frontend changes, always run:
```bash
npm run build
```

This ensures TypeScript compilation succeeds and there are no build errors.

---

## Design System & Styling Standards

### Template Page Reference
**RULE 1**: Use the **Gallery page** (`src/app/gallery/page.tsx`) as the template for all new pages.

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

**RULE 2**: Always use the common **Select Folder**, **Toolbar**, and **Console** components. Keep all pages using these components with the same style, layout, and colors.

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

## Global Console Requirement

**RULE 3**: The Console should be **global** - present on all pages that need feedback, logging, or task tracking.

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

**RULE 4**: Pages should **NOT auto-refresh**. Only refresh when items (pages, videos, images) are added or removed.

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

**Note**: For Git workflow rules (branch management, commit messages), see the global [CLAUDE.md](../CLAUDE.md)

---

## Additional Resources

### Key File Locations
- **Template page**: `src/app/gallery/page.tsx`
- **Console component**: `src/components/ui/ConsoleViewer.tsx`
- **Selection toolbar**: `src/components/selection/BaseSelectionToolbar.tsx`
- **Folder components**: `src/components/folder/`
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

**Last Updated**: 2025-12-25
**Maintained By**: Development Team
