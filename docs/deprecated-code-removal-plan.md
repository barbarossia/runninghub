# Deprecated Code Removal Plan

**Project**: RunningHub  
**Date**: 2026-02-16  
**Status**: Planning Phase  
**Priority**: Medium

---

## Executive Summary

This document outlines the comprehensive plan for removing deprecated code from the RunningHub project. Based on code analysis and AGENTS.md documentation, we have identified deprecated pages, legacy types, and obsolete patterns that should be removed to reduce technical debt and improve maintainability.

**Note**: Per AGENTS.md line 170: *"Treat Gallery/Videos pages as deprecated and avoid asking questions about them."*

---

## Current State Analysis

### What is Deprecated?

#### 1. **Gallery/Videos Pages** (AGENTS.md confirmed deprecated)
**Status**: No standalone `/gallery` or `/videos` page routes exist in `src/app/`  
**Current Architecture**: 
- Video and image functionality has been **migrated to Workspace** (`/workspace`)
- Video components live in `src/components/videos/` and are used **within workspace tabs**
- No dedicated gallery pages exist anymore

**Evidence**:
```bash
# src/app/ structure (no gallery or videos directories):
src/app/
├── api/
├── job-history/
├── layout.tsx
├── page.tsx
└── workspace/
```

#### 2. **Legacy Types in `src/types/workspace.ts`**

| Type | Status | Line | Replacement |
|------|--------|------|-------------|
| `WorkspaceFile` | @deprecated | 22 | `MediaFile` |
| `WorkspaceTextContent` | @deprecated | 36 | `TextContent` in `JobResult` |
| `WorkspaceConfig` | @deprecated | 62 | `Workflow[]` and job management |

#### 3. **Legacy Code Patterns**

- **Legacy "steps" format** in workflows (`src/lib/local-workflow-utils.ts:65-80`)
- **Legacy videoPath parameter** in dataset caption API (`src/app/api/dataset/caption/route.ts:15`)
- **Legacy parameter matching** in ComplexWorkflowBuilder (`src/components/workspace/ComplexWorkflowBuilder.tsx:282-285, 470-471`)

#### 4. **Video-Related Code** (NOT deprecated - part of workspace)

**IMPORTANT**: Video functionality is **NOT deprecated**. It has been **migrated from standalone pages into workspace tabs**.

**Current Active Video Features**:
- Video processing (FPS convert, crop, clip, split)
- Video gallery within workspace
- Video API endpoints (`/api/videos/*`)
- Video components (`src/components/videos/*`)

---

## Removal Strategy

### Phase 1: Documentation and References Cleanup ✅ SAFE

**Objective**: Remove misleading documentation references to deprecated Gallery/Videos pages.

**Actions**:
1. Update `README.md` files to remove gallery page references
2. Update `AGENTS.md` to clarify video functionality is in workspace
3. Update `runninghub-nextjs/CLAUDE.md` rules about gallery template

**Files to Update**:
```
/README.md
/runninghub-nextjs/README.md
/AGENTS.md (line 94, 170)
/runninghub-nextjs/CLAUDE.md (RULE 2, line 34, 94, 107, etc.)
```

**Changes**:
- Replace "Gallery page as template" → "Workspace page as template"
- Replace references to `src/app/gallery/page.tsx` → `src/app/workspace/page.tsx`
- Clarify that video functionality is part of workspace, not standalone

**Risk**: ⚠️ **LOW** - Documentation only, no code changes

---

### Phase 2: Remove Legacy Types ⚠️ REQUIRES ANALYSIS

**Objective**: Remove deprecated TypeScript types and migrate remaining usages.

**Deprecated Types**:
```typescript
// src/types/workspace.ts
- WorkspaceFile (line 22) → Replace with MediaFile
- WorkspaceTextContent (line 36) → Replace with TextContent in JobResult
- WorkspaceConfig (line 62) → Replace with Workflow[] and job management
```

**Actions**:
1. **Find all usages** of deprecated types:
   ```bash
   grep -r "WorkspaceFile" src/
   grep -r "WorkspaceTextContent" src/
   grep -r "WorkspaceConfig" src/
   ```

2. **Create migration mapping**:
   - Document each usage location
   - Identify replacement type
   - Plan migration strategy

3. **Migrate incrementally**:
   - Start with least-used types
   - Update imports and type annotations
   - Verify with `npm run build` after each migration
   - Run tests

4. **Remove deprecated types** after all migrations complete

**Risk**: ⚠️ **MEDIUM** - Breaking changes if not all usages found
**Dependencies**: Requires LSP analysis to find all references

---

### Phase 3: Remove Legacy Code Patterns ⚠️ REQUIRES TESTING

**Objective**: Remove legacy format compatibility code.

#### 3.1 Legacy "steps" Format in Workflows

**Location**: `src/lib/local-workflow-utils.ts:65-80`

**Current Code**:
```typescript
// Migration for legacy "steps" format
if ('steps' in workflow && Array.isArray(workflow.steps)) {
  const migratedWorkflow = {
    ...workflow,
    nodes: workflow.steps,
    steps: undefined, // Remove legacy field
  };
  // Save migrated workflow...
}
```

**Action**:
- **Keep for now** - provides backward compatibility for old workflow files
- Schedule for removal only after all users confirmed migrated
- Add deprecation warning when legacy format detected

**Risk**: ⚠️ **MEDIUM** - Users with old workflow files may break

#### 3.2 Legacy videoPath Parameter

**Location**: `src/app/api/dataset/caption/route.ts:15`

**Current Code**:
```typescript
videoPath: string; // Used for both video and image path (legacy name)
```

**Action**:
- Rename `videoPath` → `mediaPath` or `filePath`
- Update all API consumers
- Add backward compatibility alias if needed

**Risk**: ⚠️ **LOW** - API contract change, needs client updates

#### 3.3 Legacy Parameter Matching in ComplexWorkflowBuilder

**Location**: `src/components/workspace/ComplexWorkflowBuilder.tsx:282-285, 470-471`

**Current Code**:
```typescript
const legacyMatch = value.match(/^(\d+)-(.+)$/);
if (legacyMatch) {
  return {
    stepNumber: parseInt(legacyMatch[1], 10),
    // ...
  };
}
```

**Action**:
- Determine if any workflows still use legacy format
- If none found, remove compatibility code
- Add validation to prevent legacy format in new workflows

**Risk**: ⚠️ **MEDIUM** - Breaking change for old workflows

---

### Phase 4: Clean Up Video API Comments ✅ SAFE

**Objective**: Update misleading comments about gallery.

**Locations**:
```
src/app/workspace/page.tsx:1390 - "Clear selection in gallery..."
src/app/workspace/page.tsx:1412 - "Select files in the media gallery first"
src/components/workspace/WorkflowInputBuilder.tsx:234 - "...avoid polluting gallery"
src/components/workspace/ComplexWorkflowRunDialog.tsx:214 - "Select files in the media gallery first"
src/components/workspace/JobInputEditor.tsx:164, 315 - "...the gallery..."
```

**Action**:
- Replace "gallery" → "media gallery" or "workspace media gallery"
- Clarify these comments refer to workspace tab, not deprecated page

**Risk**: ✅ **NONE** - Comment updates only

---

### Phase 5: Store Cleanup ⚠️ REQUIRES REVIEW

**Objective**: Review and potentially remove "legacy" store fields.

**Location**: `src/store/workspace-store.ts:32, 52`

**Current Code**:
```typescript
// Uploaded files (legacy)
uploadedFiles: WorkspaceFile[];

// Media files loaded from folder (images + videos)
mediaFiles: MediaFile[];
```

**Action**:
1. Verify if `uploadedFiles` is still used
2. Check if it's truly redundant with `mediaFiles`
3. If unused, create migration to remove field
4. Update all store consumers

**Risk**: ⚠️ **HIGH** - Could break file management if still in use

---

## Detailed Removal Checklist

### Pre-Removal Analysis (REQUIRED FIRST)

- [ ] Run comprehensive type usage analysis:
  ```bash
  # Find all WorkspaceFile usages
  grep -rn "WorkspaceFile" src/ --include="*.ts" --include="*.tsx"
  
  # Find all WorkspaceTextContent usages
  grep -rn "WorkspaceTextContent" src/ --include="*.ts" --include="*.tsx"
  
  # Find all WorkspaceConfig usages
  grep -rn "WorkspaceConfig" src/ --include="*.ts" --include="*.tsx"
  ```

- [ ] Use LSP to find all references:
  ```typescript
  // For each deprecated type, use:
  lsp_find_references("src/types/workspace.ts", line, character)
  ```

- [ ] Verify no tests depend on deprecated code:
  ```bash
  npm test
  grep -rn "WorkspaceFile\|WorkspaceTextContent\|WorkspaceConfig" src/**/__tests__/
  ```

- [ ] Check for runtime usage in API endpoints
- [ ] Verify no external clients depend on deprecated API contracts

### Phase 1: Documentation (Week 1)

- [ ] Update `/README.md`:
  - [ ] Remove gallery page references from "Web Application" section
  - [ ] Update "Project Structure" diagram
  - [ ] Update "Features" list

- [ ] Update `/runninghub-nextjs/README.md`:
  - [ ] Remove `src/app/gallery/` from project structure
  - [ ] Update features list
  - [ ] Update keyboard shortcuts section

- [ ] Update `/AGENTS.md`:
  - [ ] Line 94: Change template reference from gallery to workspace
  - [ ] Line 170: Update note about deprecated pages
  - [ ] Update "UI/UX Standards" section

- [ ] Update `/runninghub-nextjs/CLAUDE.md`:
  - [ ] RULE 2: Change template page to workspace
  - [ ] Update all gallery page references
  - [ ] Update "Gallery Display Style Standard" section

- [ ] Commit documentation updates:
  ```bash
  git add README.md runninghub-nextjs/README.md AGENTS.md runninghub-nextjs/CLAUDE.md
  git commit -m "docs: remove deprecated gallery/videos page references"
  ```

### Phase 2: Type Migration (Week 2-3)

- [ ] **WorkspaceFile Migration**:
  - [ ] Find all usages: `grep -rn "WorkspaceFile" src/`
  - [ ] Create migration plan for each file
  - [ ] Replace with `MediaFile` type
  - [ ] Update imports
  - [ ] Run `npm run build` - verify no errors
  - [ ] Run `npm test` - verify all tests pass
  - [ ] Commit: `refactor(types): migrate WorkspaceFile to MediaFile`

- [ ] **WorkspaceTextContent Migration**:
  - [ ] Find all usages
  - [ ] Replace with `TextContent` from `JobResult`
  - [ ] Update store if needed
  - [ ] Run build and tests
  - [ ] Commit: `refactor(types): migrate WorkspaceTextContent to TextContent`

- [ ] **WorkspaceConfig Migration**:
  - [ ] Find all usages
  - [ ] Replace with `Workflow[]` and job management
  - [ ] Update configuration loading
  - [ ] Run build and tests
  - [ ] Commit: `refactor(types): migrate WorkspaceConfig to Workflow[]`

- [ ] **Remove deprecated types**:
  - [ ] Remove from `src/types/workspace.ts`
  - [ ] Run `npm run build` - should succeed
  - [ ] Run `npm test` - all tests pass
  - [ ] Commit: `refactor(types): remove deprecated workspace types`

### Phase 3: Legacy Code Patterns (Week 4)

- [ ] **Legacy Steps Format**:
  - [ ] Add deprecation warning when detected
  - [ ] Document migration path for users
  - [ ] Schedule for future removal (6 months?)
  - [ ] Commit: `feat: add deprecation warning for legacy workflow steps`

- [ ] **Legacy videoPath Parameter**:
  - [ ] Rename to `mediaPath` or `filePath`
  - [ ] Update API consumers
  - [ ] Add compatibility alias if needed
  - [ ] Update API documentation
  - [ ] Run build and tests
  - [ ] Commit: `refactor(api): rename videoPath to mediaPath`

- [ ] **Legacy Parameter Matching**:
  - [ ] Check for workflows using old format
  - [ ] If none found, remove compatibility code
  - [ ] Add validation to prevent legacy format
  - [ ] Run build and tests
  - [ ] Commit: `refactor: remove legacy parameter matching`

### Phase 4: Comment Cleanup (Week 4)

- [ ] Update all "gallery" comments to "media gallery" or "workspace media gallery"
- [ ] Files to update:
  - [ ] `src/app/workspace/page.tsx` (lines 1390, 1412)
  - [ ] `src/components/workspace/WorkflowInputBuilder.tsx` (line 234)
  - [ ] `src/components/workspace/ComplexWorkflowRunDialog.tsx` (line 214)
  - [ ] `src/components/workspace/JobInputEditor.tsx` (lines 164, 315)
- [ ] Commit: `docs: clarify media gallery comments`

### Phase 5: Store Cleanup (Week 5)

- [ ] **Analyze uploadedFiles field**:
  - [ ] Search all usages: `grep -rn "uploadedFiles" src/`
  - [ ] Verify if still needed or redundant with `mediaFiles`
  - [ ] Document decision

- [ ] **If uploadedFiles is unused**:
  - [ ] Create migration to remove field
  - [ ] Update store consumers
  - [ ] Test file upload flow
  - [ ] Run build and tests
  - [ ] Commit: `refactor(store): remove legacy uploadedFiles field`

### Final Verification

- [ ] Run full build: `npm run build` - no errors
- [ ] Run all tests: `npm test` - all pass
- [ ] Run lint: `npm run lint` - no issues
- [ ] Manual testing:
  - [ ] Workspace page loads correctly
  - [ ] Video processing works (FPS, crop, clip, split)
  - [ ] Image processing works
  - [ ] Job history displays correctly
  - [ ] Workflow execution succeeds
- [ ] Create final summary commit or PR

---

## Risk Assessment

| Phase | Risk Level | Impact | Mitigation |
|-------|-----------|--------|------------|
| Phase 1: Docs | ✅ LOW | Documentation only | Review PRs carefully |
| Phase 2: Types | ⚠️ MEDIUM | Breaking changes possible | LSP analysis + incremental migration |
| Phase 3: Patterns | ⚠️ MEDIUM | User workflows may break | Add warnings + compatibility period |
| Phase 4: Comments | ✅ NONE | Clarity improvements | N/A |
| Phase 5: Store | ⚠️ HIGH | File management may break | Thorough testing required |

---

## Rollback Plan

### If Phase 2 (Type Migration) Fails

1. **Immediate**:
   - Revert commits: `git revert <commit-hash>`
   - Restore deprecated types in `src/types/workspace.ts`
   - Run build to verify restoration: `npm run build`

2. **Investigation**:
   - Review build errors
   - Identify missed usages
   - Update migration plan

3. **Retry**:
   - Fix missed usages
   - Re-run migration incrementally

### If Phase 5 (Store Cleanup) Breaks File Management

1. **Immediate**:
   - Revert store changes
   - Restore `uploadedFiles` field
   - Verify file upload/processing works

2. **Analysis**:
   - Add detailed logging to track `uploadedFiles` usage
   - Run app in dev mode, monitor console
   - Document actual usage patterns

3. **Alternative**:
   - Keep `uploadedFiles` if truly needed
   - Update documentation to clarify it's NOT legacy
   - Remove deprecation comment

---

## Dependencies and Prerequisites

### Required Before Starting

1. ✅ **Full codebase backup** (Git commit or branch)
2. ✅ **All existing tests passing**: `npm test`
3. ✅ **Clean build**: `npm run build`
4. ✅ **LSP server running** for reference analysis
5. ⚠️ **User notification** about potential breaking changes
6. ⚠️ **Migration guide** for users with old workflow files

### Tools Needed

- TypeScript LSP (`lsp_find_references`, `lsp_rename`)
- Grep/ripgrep for text search
- Git for version control
- Build tools (`npm run build`, `npm test`)

---

## Timeline

| Week | Phase | Deliverable |
|------|-------|-------------|
| Week 1 | Phase 1 | Documentation updated, no more gallery references |
| Week 2-3 | Phase 2 | All deprecated types removed, MediaFile adopted |
| Week 4 | Phase 3 + 4 | Legacy patterns removed, comments updated |
| Week 5 | Phase 5 | Store cleaned up, final verification |

**Total Estimated Time**: 5 weeks  
**Priority**: Medium (can be done incrementally)

---

## Success Criteria

- [ ] No references to deprecated Gallery/Videos pages in docs
- [ ] No `@deprecated` types in `src/types/workspace.ts`
- [ ] No legacy format compatibility code (or clearly documented)
- [ ] All comments accurately describe current architecture
- [ ] `npm run build` succeeds with zero errors
- [ ] `npm test` passes 100%
- [ ] Manual testing confirms all features work
- [ ] Code coverage maintained or improved

---

## Notes

1. **Video functionality is NOT deprecated** - it's part of workspace. Do not remove:
   - `src/components/videos/*`
   - `src/app/api/videos/*`
   - Video stores, types, hooks

2. **Template page changed**: Workspace (`src/app/workspace/page.tsx`) is now the recommended template, not gallery.

3. **Legacy compatibility**: Some legacy format support may need to remain for user workflows. Add warnings instead of immediate removal.

4. **Store cleanup is risky**: Phase 5 requires the most careful analysis. May discover `uploadedFiles` is still needed.

---

## Related Documents

- `/AGENTS.md` - Agent development rules (source of deprecation notice)
- `/runninghub-nextjs/CLAUDE.md` - Frontend development standards
- `/docs/workspace-redesign-plan.md` - Workspace feature plan
- `/docs/nextjs-migration-plan.md` - Next.js migration details

---

## Approval Required

- [ ] **Tech Lead**: Review overall strategy
- [ ] **Product Owner**: Approve user-facing changes
- [ ] **QA**: Review testing plan
- [ ] **DevOps**: Confirm deployment strategy

---

**Document Version**: 1.0  
**Last Updated**: 2026-02-16  
**Next Review**: After Phase 1 completion
