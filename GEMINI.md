# Gemini Context & Development Rules for RunningHub

This document consolidates all project rules, standards, and workflows from the global and frontend-specific `CLAUDE.md` files.

## 1. Global Development Rules (Root)

### Documentation & Planning Mandates
**CRITICAL RULE**: **ALL** project plans and TODO lists **MUST** be saved to the relevant `docs/` folder. This is **NOT optional**.

*   **Locations**:
    *   Frontend: `runninghub-nextjs/docs/`
    *   Backend/General: `docs/`
*   **Required Files**:
    *   Plan Document: `{feature-name}-plan.md`
    *   TODO List: `{feature-name}-todos.md`
*   **Workflow**:
    1.  Check existing docs in `docs/` or `runninghub-nextjs/docs/`.
    2.  If none, CREATE documentation first.
    3.  Get approval.
    4.  Implement while updating the TODO list.

### Git Workflow
*   **Branching**: Always create from latest `main` (`git checkout main && git pull origin main`).
*   **Naming**: `feature/`, `fix/`, `refactor/`, `docs/`, `test/`.
*   **Commits**: Use conventional format: `type(scope): subject`.
    *   *Types*: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
*   **Pull Requests**:
    *   Title matches commit format.
    *   Description includes Summary, Testing details, and Checklist.

### Build Verification
*   **Mandatory Check**: Build must pass before any commit.
    *   **Frontend**: `cd runninghub-nextjs && npm run build`
    *   **Backend**: `pytest` or `python setup.py build` (as applicable).

---

## 2. Frontend Development Standards (`runninghub-nextjs/`)

### Mandatory Rules
*   **RULE 1 (Build Verification)**: Run `npm run build` before committing and after each implementation phase.
*   **RULE 2 (Template)**: Use **Gallery page** (`src/app/gallery/page.tsx`) as the template for all new pages (Layout, Spacing, Typography).
*   **RULE 3 (Reusability)**: Always use common **Select Folder**, **Toolbar**, and **Console** components. Keep style and layout consistent.
*   **RULE 4 (Folder Selection)**: All pages with folder selectors must automatically restore the last opened folder on page load (persist in localStorage), validating existence before restoring.
*   **RULE 5 (Global Console)**: The **ConsoleViewer** component MUST be present on all pages requiring feedback or task tracking.
*   **RULE 6 (Refresh Policy)**: Pages should **NOT** auto-refresh on intervals. Refresh only when items are explicitly added or removed. Use `silent: true` for background updates.
*   **RULE 7 (Hydration)**: Prevent hydration errors by ensuring server/client HTML matches. **Never** use conditional early returns based on `mounted` state. Use `useEffect` for browser-only APIs (`localStorage`, `window`).

### Page Structure Template
```tsx
'use client';
import { useState, useEffect } from 'react';
import { ConsoleViewer } from '@/components/ui/ConsoleViewer';
// ... other imports

export default function YourPage() {
  const [activeConsoleTaskId, setActiveConsoleTaskId] = useState<string | null>(null);
  const handleRefresh = async (silent = false) => { /* logic */ };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header, Content, etc. */}
        <ConsoleViewer onRefresh={handleRefresh} taskId={activeConsoleTaskId} defaultVisible={true} />
      </div>
    </div>
  );
}
```

### Design System (OKLCH)
*   **Colors**:
    *   *Light*: `from-blue-50 to-indigo-100` (bg), Blue accents (`blue-500`, `blue-600`).
    *   *Dark*: `oklch(0.145 0 0)` (bg), `oklch(0.985 0 0)` (fg).
*   **Grid**: `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4`.
*   **Typography**: Inter font. Headers (`text-xl`, `text-lg`), Body (`text-sm`).

### Hydration Safety Checklist
- [ ] No conditional returns based on `mounted` state (Render same structure, change attributes).
- [ ] Browser APIs (`localStorage`) only accessed inside `useEffect`.
- [ ] Random values/Dates generated in `useEffect`.
- [ ] `ThemeToggle` follows the `mounted` state pattern (see `ThemeToggle.tsx`).

### Import Order
1. React Core
2. Third-party libs (`framer-motion`, `sonner`, `next/link`)
3. Zustand Stores (`@/store/...`)
4. Custom Hooks (`@/hooks/...`)
5. Components (`@/components/...`)
6. Icons (`lucide-react`)
7. Types & Constants

---

## 3. Tech Stack
*   **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Zustand, Framer Motion, shadcn/ui.
*   **Backend**: Python CLI (`runninghub_cli/`), Flask Web App (`web_app/`).
*   **Processing**: FFmpeg (video), RunningHub AI Workflow (images).
