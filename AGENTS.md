# AGENTS.md

This repository contains a Next.js frontend in `runninghub-nextjs/` and a Python CLI in `runninghub_cli/`.
Follow the rules below when working as an agent in this repo.

## Quick Commands

### Frontend (Next.js)
- Install: `cd runninghub-nextjs && npm install`
- Dev server: `cd runninghub-nextjs && npm run dev`
- Build (required after changes): `cd runninghub-nextjs && npm run build`
- Lint: `cd runninghub-nextjs && npm run lint`
- Test all: `cd runninghub-nextjs && npm run test`
- Test watch: `cd runninghub-nextjs && npm run test:watch`
- Test coverage: `cd runninghub-nextjs && npm run test:coverage`
- Single test file: `cd runninghub-nextjs && npm run test -- src/path/to/test.spec.tsx`
- Single test by pattern: `cd runninghub-nextjs && npm run test -- -t "test name"`

### Python CLI
- Dependencies: `python -m pip install -r requirements.txt`
- No formal test/lint commands are defined in the repo. If tests are added,
  prefer `python -m pytest` and document them here.

## Cursor/Copilot Rules
- No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` files found.

## Documentation-First Workflow (Mandatory)
- All features, fixes, refactors, and UX changes require plan + TODO docs.
- Frontend plans: `runninghub-nextjs/docs/{feature-name}-plan.md`
- Frontend TODOs: `runninghub-nextjs/docs/{feature-name}-todos.md`
- Backend/general plans: `docs/{feature-name}-plan.md`
- Backend/general TODOs: `docs/{feature-name}-todos.md`
- Always check for existing docs before implementing.

## Git Workflow (Project Rules)
- New branches must be created from latest `main`.
- Branch prefixes: `feature/`, `fix/`, `refactor/`, `docs/`, `test/`.
- Run `npm run build` after each phase and before committing frontend changes.
- Commit format: `type(scope): subject` (see root `CLAUDE.md`).
- Pull request titles follow the commit format; include Summary, Testing, and Checklist.

## Reference Context Files
- `CLAUDE.md`: global project rules (mandatory).
- `runninghub-nextjs/CLAUDE.md`: frontend-only rules (mandatory).
- `GEMINI.md`: consolidated summary of rules and recent feature context.

## Code Style: TypeScript/Next.js

### Formatting and Lint
- ESLint config: `runninghub-nextjs/eslint.config.mjs` (Next core-web-vitals + TS).
- Prettier is present; keep formatting consistent with existing files.
- Use single quotes in TS/TSX (project usage).
- Prefer trailing commas where the file already uses them.

### Imports and Module Paths
- Prefer absolute imports with `@/` alias (`tsconfig.json` paths).
- Order imports: external libs, then internal modules, then relative paths.
- Avoid unused imports; ESLint enforces this via Next config.

### Types and TypeScript Practices
- `strict: true` in `tsconfig.json`.
- Use explicit types for public APIs, store state, and function return values.
- Prefer `type` for object shapes and unions; `interface` for public class-like APIs.
- Narrow `unknown` with type guards (see `isApiError` in `src/utils/api.ts`).

### Naming Conventions
- Components: `PascalCase` filenames and exports.
- Hooks: `useSomething` in `src/hooks/`.
- Stores: `*-store.ts` in `src/store/` with `useXStore` exports.
- Constants: `UPPER_SNAKE_CASE` for global constants in `src/constants/`.

### Error Handling
- For API calls, throw `ApiError` and rethrow existing `ApiError` instances
  (`src/utils/api.ts`).
- In API routes, `console.error` raw errors and return clean JSON errors.
- Use `writeLog` for background task logging (`src/lib/logger.ts`).
- For UI actions, use `toast` via `src/utils/logger.ts` (info/success/warning/error).
- Never use `early return` patterns based on `mounted` that change HTML structure.

### Import Order (Frontend)
- React core/Next primitives first.
- Third-party libs next.
- Stores (`@/store/...`), then hooks (`@/hooks/...`).
- Components (`@/components/...`), then icons (`lucide-react`).
- Types/constants last.

### Logging Rules (Project Standard)
- Log schema: `{ timestamp, level, source, message, taskId?, metadata? }`.
- UI: `toast.info/success/warning/error` for user-visible feedback.
- API: `writeLog(message, level, taskId)` for background tasks.
- CLI: use `print_info/print_success/print_warning/print_error` (colorama).

### UI/UX Standards (Frontend)
- Use the Gallery page as layout template: `src/app/gallery/page.tsx`.
- Always include `ConsoleViewer` on pages that need task feedback.
- Do not add auto-refresh intervals; refresh only on add/remove operations.
- Follow hydration best practices: no conditional early returns based on `mounted`.
- Gallery layouts must follow `src/components/workspace/MediaGallery.tsx` patterns.

### Styling and Design System
- Tailwind-based. Keep class names consistent with existing components.
- Light gradient background for pages: `from-blue-50 to-indigo-100`.
- Typography hierarchy is set in `runninghub-nextjs/CLAUDE.md`.
- Prefer existing UI components (folder selection, toolbars, console viewer).

### Known Docs (Frontend)
- Plans/TODOs live in `runninghub-nextjs/docs/`; see `workspace-redesign-plan.md` as a template.
- Key docs include: `media-sorting-plan.md`, `workflow-editor-redesign-plan.md`, `youtube-download-feature-plan.md`.

## Code Style: Python CLI

### Imports and Formatting
- Standard library first, then third-party, then local imports.
- Use 4-space indentation, type hints where practical.
- Prefer `Path` from `pathlib` for file paths.

### Logging and Output
- Use `print_info`, `print_success`, `print_warning`, `print_error` in `runninghub_cli/utils.py`.
- For CLI errors, print a message and exit non-zero when appropriate.

### Error Handling
- Raise `ValueError` for validation issues and `FileNotFoundError` for missing files.
- Catch exceptions at CLI boundary, report with `print_error`.

## Docs Index (Backend/General)
- `docs/logging-standards.md`
- `docs/unified-logging-plan.md`
- `docs/unified-logging-todos.md`
- `docs/runninghub-workflow-api.md`
- `docs/video-conversion-guide.md`
- `docs/duck-decode-summary.md`
- `docs/duck-decode-integration.md`
- `docs/duck-decode-quick-reference.md`
- `docs/media-gallery-stuck-analysis.md`

## Docs Index (Frontend)
- `runninghub-nextjs/docs/workspace-redesign-plan.md`
- `runninghub-nextjs/docs/workflow-editor-redesign-plan.md`
- `runninghub-nextjs/docs/workflow-editor-redesign-todos.md`
- `runninghub-nextjs/docs/workflow-tab-separation-plan.md`
- `runninghub-nextjs/docs/workflow-tab-separation-todos.md`
- `runninghub-nextjs/docs/workflow-output-management-todos.md`
- `runninghub-nextjs/docs/media-sorting-plan.md`
- `runninghub-nextjs/docs/media-sorting-todos.md`
- `runninghub-nextjs/docs/gallery-export-feature-plan.md`
- `runninghub-nextjs/docs/gallery-export-feature-todos.md`
- `runninghub-nextjs/docs/youtube-download-feature-plan.md`
- `runninghub-nextjs/docs/youtube-download-feature-todos.md`
- `runninghub-nextjs/docs/job-recreate-feature-plan.md`
- `runninghub-nextjs/docs/job-recreate-feature-todos.md`
- `runninghub-nextjs/docs/toolbar-refactor-plan.md`
- `runninghub-nextjs/docs/local-workflow-import-implementation.md`
- `runninghub-nextjs/docs/workspace-duck-decode-todos.md`
- `runninghub-nextjs/docs/workspace-enhancement-quick-run-custom-id.md`
- `runninghub-nextjs/docs/workspace-gallery-toolbar-fix.md`
- `runninghub-nextjs/docs/workspace-gallery-toolbar-fix-todos.md`
- `runninghub-nextjs/docs/media-gallery-workflow-loading-todos.md`
- `runninghub-nextjs/docs/nextjs-migration-plan.md`
- `runninghub-nextjs/docs/nextjs-migration-todos.md`

## Testing Conventions
- Jest config: `runninghub-nextjs/jest.config.js`.
- Tests live in `src/**/__tests__` or `*.spec|test.*`.
- Use `@/` alias in test imports.

## Notes for Agents
- Do not create new plan/todo docs outside `docs/` or `runninghub-nextjs/docs/`.
- Do not change global rules in `CLAUDE.md` without explicit request.
- Preserve existing patterns and structure when extending components.
