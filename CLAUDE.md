# RunningHub - Global Development Rules

This document contains the global development rules that apply to the entire RunningHub project, across all subdirectories and components.

## Feature Planning and Documentation Rules

### Documentation-First Development
**RULE 1**: Before implementing any new feature, check the `docs/` folder for existing plans and TODO lists.

**Process**:
1. **Search for existing documentation**:
   ```bash
   ls docs/                      # List all documentation files
   grep -r "feature-name" docs/  # Search for specific feature docs
   ```

2. **If documentation exists**:
   - Read the plan/TODO list in `docs/`
   - Follow the implementation steps outlined
   - Check off completed items in the TODO list
   - Update the documentation if requirements change

3. **If no documentation exists**:
   - Create a plan document in `docs/` first
   - Include: requirements, architecture, implementation steps, TODO list
   - Get approval on the plan before implementing
   - Reference: `docs/workspace-redesign-plan.md` as a template

**Rationale**: Ensures all features are properly planned, documented, and tracked. Prevents duplicate work, provides context for future developers, and maintains a historical record of design decisions.

## Git Workflow Rules

### Branch Management
**RULE 2**: Every new branch must be created from the latest `main` branch.

**Process**:
```bash
# Always pull latest changes before creating a new branch
git checkout main
git pull origin main

# Then create your feature branch
git checkout -b feature/your-feature-name
# Or for fix branches
git checkout -b fix/your-bug-fix
```

**Branch Naming Conventions**:
- `feature/` - New features and functionality
  - Example: `feature/add-video-processing`
  - Example: `feature/enhance-console-ui`
- `fix/` - Bug fixes
  - Example: `fix/console-refresh-issue`
  - Example: `fix/image-gallery-loading`
- `refactor/` - Code refactoring (no functional changes)
  - Example: `refactor/migrate-to-typescript`
- `docs/` - Documentation changes
  - Example: `docs/update-readme`
- `test/` - Test additions or changes
  - Example: `test/add-unit-tests`

**Rationale**: Ensures your branch is based on the most recent code, reducing merge conflicts and incorporating the latest changes from the team.

### Build Verification
**RULE 3**: When a new feature or fix is applied, you must run the appropriate build command to ensure the application compiles successfully.

**For Next.js Frontend** (runninghub-nextjs/):
```bash
cd runninghub-nextjs
npm run build
```

**For Python Backend** (if applicable):
```bash
# Add Python build/test commands here
# Example:
python -m pytest
# or
python setup.py build
```

**Process**:
1. Implement your changes
2. Run the appropriate build command for the component you modified
3. Fix any compilation errors or test failures
4. Only commit when build/tests succeed

**Rationale**: Catches TypeScript errors, build issues, missing dependencies, and test failures early in the development cycle.

### Commit Guidelines

**Commit Message Format**:
```
type(scope): subject

body (optional)

footer (optional)
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(gallery): add video processing workflow

- Implement video selection UI
- Add progress tracking
- Integrate with backend API

Closes #123
```

```
fix(console): resolve auto-refresh issue

Prevent console from auto-refreshing on load.
Only refresh when items are added/removed.

Fixes #456
```

### Pull Request Guidelines

**Before Creating a PR**:
1. Ensure your branch is up to date with `main`
2. Run all build commands and tests
3. Update documentation if needed
4. Review your own changes first

**PR Title Format**: Use the same format as commit messages
- `feat(gallery): Add video processing workflow`
- `fix(console): Resolve auto-refresh issue`

**PR Description Template**:
```markdown
## Summary
- Brief description of changes
- Key features implemented
- Bugs fixed

## Testing
- How was this tested?
- Test environment details
- Screenshots (if UI changes)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Build passes (npm run build)
- [ ] Tests pass (if applicable)
- [ ] Documentation updated
- [ ] No merge conflicts with main
```

## Folder Selection Rules

### Folder Selection Persistence
**RULE 4**: All pages with folder selectors must automatically restore the last opened folder on page load, unless that folder no longer exists.

**Applies To**:
- Gallery page (`/gallery`)
- Workspace page (`/workspace`)
- Pages page (`/pages`)
- Any other page with folder selection functionality

**Implementation Requirements**:
1. **Persist folder selection**: Store the selected folder in localStorage when user selects a folder
2. **Auto-restore on load**: When the page loads, check if there's a previously selected folder in localStorage
3. **Validate folder existence**: Before restoring, verify the folder still exists
4. **Fallback to selection screen**: If the folder no longer exists or validation fails, show the folder selection screen

**Process**:
```typescript
// Example implementation pattern
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

**Validation Implementation**:
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

**Store Configuration**:
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

**User Experience Considerations**:
- **Loading state**: Show a loading indicator while validating the folder
- **Error handling**: If validation fails, gracefully fallback to folder selection screen
- **Clear indication**: Show which folder is being restored (e.g., "Restoring /path/to/folder...")
- **Manual override**: Always allow user to manually select a different folder via "Change Folder" button

**Rationale**: Improves user experience by automatically restoring the user's work context. Returning to the app should feel seamless - users shouldn't have to re-select folders every time. However, we must validate the folder still exists to avoid errors.

## Project Structure

```
runninghub/
├── CLAUDE.md                  # This file - Global rules
├── runninghub-nextjs/         # Next.js frontend
│   ├── CLAUDE.md              # Frontend-specific rules
│   ├── src/
│   ├── package.json
│   └── ...
├── docs/                      # Feature plans and documentation
│   ├── workspace-redesign-plan.md
│   ├── nextjs-migration-plan.md
│   └── ...
├── .git/                      # Git repository
└── README.md                  # Project overview
```

**Important**: Always check `docs/` before implementing features. See RULE 1 above.

## Quick Reference Checklist

Before implementing any feature, verify:

- [ ] Checked `docs/` folder for existing plan/TODO list
- [ ] If no plan exists, created documentation first
- [ ] Followed implementation steps from plan
- [ ] Updated TODO list with completed items

Before committing any changes, verify:

- [ ] Branch created from latest `main`
- [ ] Branch follows naming convention (`feature/`, `fix/`, etc.)
- [ ] Appropriate build command run and succeeds
- [ ] Commit message follows format guidelines
- [ ] Tests pass (if applicable)
- [ ] Documentation updated (if needed)

When implementing pages with folder selectors, verify:

- [ ] Folder selection persists in localStorage
- [ ] Last opened folder auto-restores on page load
- [ ] Folder existence is validated before restoring
- [ ] Fallback to selection screen if folder doesn't exist
- [ ] Loading state shown during validation
- [ ] User can manually change folder at any time

---

## Related Documentation

- **Feature Documentation**: See `docs/` folder for feature plans, architecture designs, and TODO lists
  - Example: `docs/workspace-redesign-plan.md` - Workspace feature redesign plan
- **Frontend Rules**: See `runninghub-nextjs/CLAUDE.md` for Next.js-specific development rules, design system, and component standards
- **Project README**: See `README.md` for project overview and setup instructions

---

**Last Updated**: 2025-12-25
**Maintained By**: Development Team
