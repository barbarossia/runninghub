# Deprecated Code - Quick Reference Summary

**Last Updated**: 2026-02-16  
**Related Documents**:
- `deprecated-code-removal-plan.md` - Full removal strategy
- `deprecated-code-removal-todos.md` - Implementation checklist

---

## TL;DR - What's Deprecated?

### ❌ Actually Deprecated (Should Be Removed)

1. **Gallery/Videos Pages** - Migrated to Workspace
   - **Status**: No standalone pages exist (already removed)
   - **Action**: Update documentation references only

2. **Legacy Types** in `src/types/workspace.ts`:
   - `WorkspaceFile` (line 22) → Use `MediaFile`
   - `WorkspaceTextContent` (line 36) → Use `JobResult.TextContent`
   - `WorkspaceConfig` (line 62) → Use `Workflow[]`

3. **Legacy Code Patterns**:
   - Legacy "steps" workflow format (backward compatibility code)
   - Legacy `videoPath` parameter (should be `mediaPath`)
   - Legacy parameter matching in ComplexWorkflowBuilder

---

## ✅ NOT Deprecated (Keep These)

### Video Functionality

**All video-related code is ACTIVE and part of workspace:**

- ✅ `src/components/videos/*` - Video components for workspace
- ✅ `src/app/api/videos/*` - Video processing APIs
- ✅ Video stores: `video-store.ts`, `video-selection-store.ts`
- ✅ Video types, hooks, utilities

**Why the confusion?**
- AGENTS.md says "Gallery/Videos pages as deprecated"
- This means the **standalone pages**, not the **video functionality**
- Videos are now **integrated into workspace tabs**, not separate pages

---

## Quick Action Plan

### Phase 1: Documentation (1 week, LOW risk)
**What**: Update docs to reference workspace instead of gallery  
**Files**: README.md, AGENTS.md, CLAUDE.md  
**Risk**: None - documentation only

### Phase 2: Types (2-3 weeks, MEDIUM risk)
**What**: Remove deprecated types from workspace.ts  
**Files**: src/types/workspace.ts + all consumers  
**Risk**: Breaking changes if not all usages found

### Phase 3: Legacy Patterns (1 week, MEDIUM risk)
**What**: Remove or deprecate legacy format compatibility  
**Files**: local-workflow-utils.ts, ComplexWorkflowBuilder.tsx, API routes  
**Risk**: May break old user workflows

### Phase 4: Comments (1 day, ZERO risk)
**What**: Clarify "gallery" → "workspace media gallery" in comments  
**Files**: 6 files with misleading comments  
**Risk**: None - comment updates only

### Phase 5: Store (1 week, HIGH risk)
**What**: Remove `uploadedFiles` if truly redundant  
**Files**: workspace-store.ts + consumers  
**Risk**: May break file management

---

## Verification Commands

```bash
# Build must succeed
npm run build

# Tests must pass
npm test

# Find deprecated type usages
grep -rn "WorkspaceFile\|WorkspaceTextContent\|WorkspaceConfig" src/

# Find legacy pattern references
grep -rn "legacy" src/ --include="*.ts" --include="*.tsx"

# Find gallery page references
grep -rn "gallery/page.tsx" .
```

---

## Key Points to Remember

1. **Video features are NOT deprecated** - They're part of workspace now
2. **Gallery pages don't exist anymore** - Already migrated to workspace
3. **Workspace is the new template** - Not gallery
4. **Most work is type migration** - Finding and replacing deprecated types
5. **Store cleanup is risky** - Needs careful analysis before removing `uploadedFiles`

---

## Decision Points

### Should I remove `uploadedFiles` from store?

**Analyze first:**
```bash
grep -rn "uploadedFiles" src/
```

**If all usages can be replaced by `mediaFiles`**: ✅ Remove  
**If uploadedFiles serves unique purpose**: ❌ Keep and update docs

### Should I remove legacy workflow compatibility?

**Check for old workflows:**
- Query user workflow files
- Check for legacy "steps" format
- Check for legacy parameter format `\d+-.*`

**If no workflows use old format**: ✅ Remove  
**If old workflows exist**: ⚠️ Add deprecation warning, schedule removal

---

## Timeline

| Phase | Duration | Risk | Estimated Complete |
|-------|----------|------|-------------------|
| Phase 1: Docs | 1 week | LOW | Week 1 |
| Phase 2: Types | 2-3 weeks | MEDIUM | Week 3-4 |
| Phase 3: Patterns | 1 week | MEDIUM | Week 4 |
| Phase 4: Comments | 1 day | NONE | Week 4 |
| Phase 5: Store | 1 week | HIGH | Week 5 |

**Total**: ~5 weeks

---

## Success Metrics

- [ ] `npm run build` ✅ Zero errors
- [ ] `npm test` ✅ 100% pass
- [ ] Manual testing ✅ All features work
- [ ] Documentation ✅ No gallery references
- [ ] Types ✅ No @deprecated in workspace.ts
- [ ] Store ✅ No redundant fields
- [ ] Comments ✅ Accurate descriptions

---

## Emergency Contacts

**If something breaks:**

1. **Immediate rollback**:
   ```bash
   git revert <commit-hash>
   # or
   git reset --hard <last-good-commit>
   ```

2. **Verify restoration**:
   ```bash
   npm run build && npm test
   ```

3. **Document issue** in removal plan

---

## Related Files

- **Removal Plan**: `docs/deprecated-code-removal-plan.md`
- **Implementation TODOs**: `docs/deprecated-code-removal-todos.md`
- **Type Definitions**: `src/types/workspace.ts`
- **Store**: `src/store/workspace-store.ts`
- **Workspace Page**: `src/app/workspace/page.tsx`

---

**Quick Start**: Read the full plan in `deprecated-code-removal-plan.md`, then follow TODOs in `deprecated-code-removal-todos.md`.
