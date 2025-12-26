# RunningHub - Global Development Rules

This document contains the global development rules that apply to the entire RunningHub project, across all subdirectories and components.

## Feature Planning and Documentation Rules

### Documentation-First Development
**RULE 1**: Before implementing any new feature, check the appropriate `docs/` folder for existing plans and TODO lists.
- **Frontend features**: Check `runninghub-nextjs/docs/`
- **Backend/General features**: Check `docs/`

**Process**:
1. **Search for existing documentation**:
   ```bash
   # For frontend features
   ls runninghub-nextjs/docs/                      # List frontend documentation
   grep -r "feature-name" runninghub-nextjs/docs/  # Search frontend docs

   # For backend/general features
   ls docs/                      # List all documentation files
   grep -r "feature-name" docs/  # Search for specific feature docs
   ```

2. **If documentation exists**:
   - Read the plan/TODO list in the appropriate `docs/` folder (frontend: `runninghub-nextjs/docs/`, backend: `docs/`)
   - Follow the implementation steps outlined
   - Check off completed items in the TODO list
   - Update the documentation if requirements change

3. **If no documentation exists**:
   - Create a plan document in the appropriate `docs/` folder first
     - Frontend features: `runninghub-nextjs/docs/`
     - Backend/general: `docs/`
   - Include: requirements, architecture, implementation steps, TODO list
   - Get approval on the plan before implementing
   - Reference: `runninghub-nextjs/docs/workspace-redesign-plan.md` as a template for frontend features

### Requirement Submission Workflow

**CRITICAL**: When you submit a requirement for a new feature, fix, or enhancement, the following workflow MUST be followed:

1. **Documentation First**:
   - Before any code implementation begins, a plan document MUST be created in the appropriate `docs/` folder
   - **UI/Frontend requirements**: Save plan in `runninghub-nextjs/docs/`
   - **Backend/General requirements**: Save plan in `docs/`

2. **Plan Document Requirements**:
   - Document name: `{feature-name}-plan.md` (e.g., `workspace-redesign-plan.md`)
   - Include TODO list: Create `{feature-name}-todos.md` to track implementation progress
   - Must contain:
     - Overview and objectives
     - Current state vs. target state
     - User requirements (if applicable)
     - Technical approach/architecture
     - Implementation phases/steps
     - TODO checklist for tracking progress

3. **Implementation Sequence**:
   ```
   Your Requirement
        ↓
   Create Plan Document in docs/
        ↓
   Review and Approve Plan
        ↓
   Create TODO List
        ↓
   Implement Following Plan
        ↓
   Update TODO as You Progress
        ↓
   Complete Implementation
   ```

4. **Examples**:
   - UI feature request → `runninghub-nextjs/docs/new-feature-plan.md`
   - Backend API change → `docs/api-redesign-plan.md`
   - Bug fix (UI) → `runninghub-nextjs/docs/toolbar-fix-plan.md`
   - Bug fix (backend) → `docs/conversion-fix-plan.md`

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

**See `runninghub-nextjs/CLAUDE.md` for:**
- Phase-based development workflow
- Frontend-specific build requirements
- TypeScript compilation rules

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

## Project Structure

```
runninghub/
├── CLAUDE.md                  # This file - Global rules
├── runninghub-nextjs/         # Next.js frontend
│   ├── CLAUDE.md              # Frontend-specific rules
│   ├── docs/                  # Frontend feature plans and documentation
│   │   ├── workspace-redesign-plan.md
│   │   ├── nextjs-migration-plan.md
│   │   └── ...
│   ├── src/
│   ├── package.json
│   └── ...
├── docs/                      # Backend/general documentation
│   └── video-conversion-guide.md
├── .git/                      # Git repository
└── README.md                  # Project overview
```

**Important**: Always check the appropriate `docs/` folder before implementing features. See RULE 1 above.

## Quick Reference Checklist

Before implementing any feature, verify:

- [ ] Checked appropriate `docs/` folder for existing plan/TODO list
  - Frontend features: `runninghub-nextjs/docs/`
  - Backend/general: `docs/`
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

---

## Related Documentation

- **Backend/General Documentation**: See `docs/` folder for backend-related guides and general project documentation
  - Example: `docs/video-conversion-guide.md` - Video format conversion with FFmpeg
- **Frontend Documentation**: See `runninghub-nextjs/docs/` for Next.js-specific feature plans, implementation guides, and TODO lists
  - Example: `runninghub-nextjs/docs/workspace-redesign-plan.md` - Workspace feature redesign plan
  - Example: `runninghub-nextjs/docs/nextjs-migration-plan.md` - Next.js migration plan
- **Frontend Rules**: See `runninghub-nextjs/CLAUDE.md` for Next.js-specific development rules, design system, and component standards
- **Project README**: See `README.md` for project overview and setup instructions

---

**Last Updated**: 2025-12-26
**Maintained By**: Development Team
