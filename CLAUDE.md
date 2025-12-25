# RunningHub - Global Development Rules

This document contains the global development rules that apply to the entire RunningHub project, across all subdirectories and components.

## Git Workflow Rules

### Branch Management
**RULE 1**: Every new branch must be created from the latest `main` branch.

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
**RULE 2**: When a new feature or fix is applied, you must run the appropriate build command to ensure the application compiles successfully.

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

## Project Structure

```
runninghub/
├── CLAUDE.md                  # This file - Global rules
├── runninghub-nextjs/         # Next.js frontend
│   ├── CLAUDE.md              # Frontend-specific rules
│   ├── src/
│   ├── package.json
│   └── ...
├── docs/                      # Project documentation
├── .git/                      # Git repository
└── README.md                  # Project overview
```

## Quick Reference Checklist

Before committing any changes, verify:

- [ ] Branch created from latest `main`
- [ ] Branch follows naming convention (`feature/`, `fix/`, etc.)
- [ ] Appropriate build command run and succeeds
- [ ] Commit message follows format guidelines
- [ ] Tests pass (if applicable)
- [ ] Documentation updated (if needed)

---

## Related Documentation

- **Frontend Rules**: See `runninghub-nextjs/CLAUDE.md` for Next.js-specific development rules, design system, and component standards
- **Project README**: See `README.md` for project overview and setup instructions

---

**Last Updated**: 2025-12-25
**Maintained By**: Development Team
