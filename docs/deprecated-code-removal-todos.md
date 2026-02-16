# Deprecated Code Removal - Implementation TODOs

**Related Plan**: `deprecated-code-removal-plan.md`  
**Status**: Not Started  
**Priority**: Medium  
**Estimated Duration**: 5 weeks

---

## Pre-Removal Analysis Tasks

### Investigation and Mapping

- [ ] **Find all WorkspaceFile usages**
  ```bash
  grep -rn "WorkspaceFile" src/ --include="*.ts" --include="*.tsx"
  ```
  - [ ] Document each usage location
  - [ ] Create replacement mapping
  - [ ] Estimate effort per file

- [ ] **Find all WorkspaceTextContent usages**
  ```bash
  grep -rn "WorkspaceTextContent" src/ --include="*.ts" --include="*.tsx"
  ```
  - [ ] Document each usage location
  - [ ] Identify JobResult.TextContent usage pattern
  - [ ] Plan migration strategy

- [ ] **Find all WorkspaceConfig usages**
  ```bash
  grep -rn "WorkspaceConfig" src/ --include="*.ts" --include="*.tsx"
  ```
  - [ ] Document each usage location
  - [ ] Map to Workflow[] replacement
  - [ ] Plan configuration migration

- [ ] **Use LSP for comprehensive analysis**
  - [ ] `lsp_find_references` for WorkspaceFile
  - [ ] `lsp_find_references` for WorkspaceTextContent
  - [ ] `lsp_find_references` for WorkspaceConfig
  - [ ] Export reference lists

- [ ] **Verify test coverage**
  ```bash
  npm test
  grep -rn "WorkspaceFile\|WorkspaceTextContent\|WorkspaceConfig" src/**/__tests__/
  ```
  - [ ] Identify tests using deprecated types
  - [ ] Plan test updates
  - [ ] Ensure test coverage for replacements

- [ ] **Check API contracts**
  - [ ] List all API endpoints using deprecated types
  - [ ] Identify external clients
  - [ ] Plan backward compatibility if needed

- [ ] **Analyze store usage**
  ```bash
  grep -rn "uploadedFiles" src/ --include="*.ts" --include="*.tsx"
  ```
  - [ ] Document all uploadedFiles usages
  - [ ] Determine if truly legacy or still needed
  - [ ] Create decision document

---

## Phase 1: Documentation Cleanup

**Timeline**: Week 1  
**Risk**: Low  
**Dependencies**: None

### Root README.md

- [ ] **Update Web Application section**
  - [ ] Remove references to gallery page
  - [ ] Update project structure diagram
  - [ ] Update features list to reflect workspace-based architecture
  - [ ] Update screenshots/examples if any

- [ ] **Update API Endpoints section**
  - [ ] Clarify video endpoints are for workspace
  - [ ] Remove any gallery-specific endpoint docs

- [ ] **Verify changes**
  - [ ] Read through entire README
  - [ ] Check all links work
  - [ ] Ensure consistency

### runninghub-nextjs/README.md

- [ ] **Update Project Structure section**
  - [ ] Remove `src/app/gallery/` from structure diagram
  - [ ] Add note that video features are in workspace
  - [ ] Update component descriptions

- [ ] **Update Features section**
  - [ ] Remove "Gallery page" references
  - [ ] Update to "Workspace with media management"
  - [ ] Clarify video processing in workspace tabs

- [ ] **Update Keyboard Shortcuts section**
  - [ ] Ensure shortcuts apply to workspace, not gallery
  - [ ] Update context descriptions

- [ ] **Verify changes**
  - [ ] Build and preview README
  - [ ] Check consistency with root README

### AGENTS.md

- [ ] **Update Line 94** (UI/UX Standards)
  - [ ] Change template reference from gallery to workspace
  - [ ] Update path: `src/app/gallery/page.tsx` → `src/app/workspace/page.tsx`

- [ ] **Update Line 170** (Notes for Agents)
  - [ ] Clarify deprecation status
  - [ ] Change from "Treat Gallery/Videos pages as deprecated"
  - [ ] To: "Gallery and Videos pages have been migrated to Workspace tabs"

- [ ] **Review entire document**
  - [ ] Check for any other gallery references
  - [ ] Update examples using gallery
  - [ ] Ensure consistency

### runninghub-nextjs/CLAUDE.md

- [ ] **Update RULE 2** (Design System & Styling Standards)
  - [ ] Change template page to workspace
  - [ ] Update path references
  - [ ] Update code examples

- [ ] **Update Page Layout Template section**
  - [ ] Replace gallery example with workspace example
  - [ ] Update component structure example

- [ ] **Update RULE 8** (Gallery Display Style Standard)
  - [ ] Keep the rule but clarify it's for workspace media gallery
  - [ ] Update title: "Media Gallery Display Style Standard"
  - [ ] Clarify MediaGallery.tsx is the template for workspace

- [ ] **Search and replace**
  - [ ] Find all "gallery page" → "workspace page"
  - [ ] Find all `src/app/gallery/` → `src/app/workspace/`
  - [ ] Verify context still makes sense

- [ ] **Verify changes**
  - [ ] Read through entire CLAUDE.md
  - [ ] Check all code examples
  - [ ] Ensure rules still make sense

### Commit and Review

- [ ] **Stage documentation changes**
  ```bash
  git add README.md runninghub-nextjs/README.md AGENTS.md runninghub-nextjs/CLAUDE.md
  ```

- [ ] **Review diff**
  ```bash
  git diff --staged
  ```

- [ ] **Commit**
  ```bash
  git commit -m "docs: remove deprecated gallery/videos page references

  - Update template page reference from gallery to workspace
  - Clarify video functionality is part of workspace, not standalone
  - Update project structure diagrams
  - Update AGENTS.md and CLAUDE.md development rules
  
  Gallery and Videos pages have been migrated to Workspace tabs."
  ```

- [ ] **Push to remote** (if applicable)

---

## Phase 2: Type Migration

**Timeline**: Week 2-3  
**Risk**: Medium  
**Dependencies**: Phase 1 complete, pre-removal analysis done

### 2.1 WorkspaceFile Migration

- [ ] **Preparation**
  - [ ] Review all usages from pre-removal analysis
  - [ ] Create detailed migration checklist per file
  - [ ] Ensure MediaFile type is fully defined and tested

- [ ] **Migrate imports**
  - [ ] Find: `import { WorkspaceFile } from '@/types/workspace'`
  - [ ] Replace: `import { MediaFile } from '@/types'`
  - [ ] Update each file incrementally

- [ ] **Migrate type annotations**
  - [ ] Replace `WorkspaceFile` → `MediaFile` in type annotations
  - [ ] Update function signatures
  - [ ] Update interface/type definitions

- [ ] **Migrate store if needed**
  - [ ] Check workspace-store.ts for WorkspaceFile usage
  - [ ] Update state types
  - [ ] Update action signatures
  - [ ] Verify persistence layer

- [ ] **Update API responses**
  - [ ] Check API endpoints returning WorkspaceFile
  - [ ] Update response types
  - [ ] Add compatibility layer if needed

- [ ] **Verification**
  - [ ] Run `npm run build` - must succeed
  - [ ] Run `npm test` - all tests pass
  - [ ] Run `npm run lint` - no new errors
  - [ ] Manual testing of affected features

- [ ] **Commit**
  ```bash
  git add .
  git commit -m "refactor(types): migrate WorkspaceFile to MediaFile

  - Replace all WorkspaceFile usages with MediaFile
  - Update imports and type annotations
  - Migrate workspace store
  - Update API response types
  
  Verified: build succeeds, tests pass"
  ```

### 2.2 WorkspaceTextContent Migration

- [ ] **Preparation**
  - [ ] Review all usages from pre-removal analysis
  - [ ] Verify TextContent in JobResult is suitable replacement
  - [ ] Plan store migration if needed

- [ ] **Migrate imports**
  - [ ] Find: `import { WorkspaceTextContent } from '@/types/workspace'`
  - [ ] Replace: `import { JobResult } from '@/types'; // Use JobResult.TextContent`

- [ ] **Migrate type annotations**
  - [ ] Replace `WorkspaceTextContent` → `JobResult['textContent']` or extract type
  - [ ] Update function signatures
  - [ ] Update state types

- [ ] **Update store if needed**
  - [ ] Check for WorkspaceTextContent in stores
  - [ ] Migrate to new structure
  - [ ] Verify persistence

- [ ] **Update API endpoints**
  - [ ] Find endpoints using WorkspaceTextContent
  - [ ] Update request/response types
  - [ ] Test API contracts

- [ ] **Verification**
  - [ ] Run `npm run build` - must succeed
  - [ ] Run `npm test` - all tests pass
  - [ ] Manual testing of text content features
  - [ ] Verify translation still works

- [ ] **Commit**
  ```bash
  git commit -m "refactor(types): migrate WorkspaceTextContent to JobResult.TextContent"
  ```

### 2.3 WorkspaceConfig Migration

- [ ] **Preparation**
  - [ ] Review all WorkspaceConfig usages
  - [ ] Design Workflow[] based replacement
  - [ ] Plan configuration loading migration

- [ ] **Define replacement structure**
  - [ ] Create type for workspace configuration
  - [ ] Use Workflow[] + job management
  - [ ] Document new structure

- [ ] **Migrate configuration loading**
  - [ ] Update configuration file format
  - [ ] Update load/save functions
  - [ ] Add migration for old config files

- [ ] **Migrate store**
  - [ ] Update workspace store configuration
  - [ ] Update selectors
  - [ ] Update actions

- [ ] **Update components**
  - [ ] Find components using WorkspaceConfig
  - [ ] Update to new structure
  - [ ] Test configuration UI

- [ ] **Verification**
  - [ ] Run `npm run build`
  - [ ] Run `npm test`
  - [ ] Test configuration save/load
  - [ ] Test workspace initialization

- [ ] **Commit**
  ```bash
  git commit -m "refactor(types): migrate WorkspaceConfig to Workflow[] based structure"
  ```

### 2.4 Remove Deprecated Types

- [ ] **Verify all migrations complete**
  - [ ] No remaining WorkspaceFile usages
  - [ ] No remaining WorkspaceTextContent usages
  - [ ] No remaining WorkspaceConfig usages
  - [ ] All builds and tests passing

- [ ] **Remove from workspace.ts**
  - [ ] Delete WorkspaceFile interface (line 22)
  - [ ] Delete WorkspaceTextContent interface (line 36)
  - [ ] Delete WorkspaceConfig interface (line 62)
  - [ ] Keep deprecation comments in git history

- [ ] **Clean up related code**
  - [ ] Remove unused imports
  - [ ] Remove unused helper functions
  - [ ] Update type exports

- [ ] **Final verification**
  - [ ] Run `npm run build` - must succeed
  - [ ] Run `npm test` - all tests pass
  - [ ] Run `npm run lint` - clean
  - [ ] Search for any remaining references:
    ```bash
    grep -rn "WorkspaceFile\|WorkspaceTextContent\|WorkspaceConfig" src/
    ```

- [ ] **Commit**
  ```bash
  git commit -m "refactor(types): remove deprecated workspace types

  - Removed WorkspaceFile (replaced with MediaFile)
  - Removed WorkspaceTextContent (replaced with JobResult.TextContent)
  - Removed WorkspaceConfig (replaced with Workflow[] structure)
  
  All migrations complete, verified with build and tests."
  ```

---

## Phase 3: Legacy Code Patterns

**Timeline**: Week 4  
**Risk**: Medium  
**Dependencies**: Phase 2 complete

### 3.1 Legacy Steps Format

- [ ] **Add deprecation warning**
  - [ ] Edit `src/lib/local-workflow-utils.ts`
  - [ ] Add console.warn when legacy format detected
  - [ ] Add toast notification to user
  - [ ] Log to backend if applicable

- [ ] **Document migration path**
  - [ ] Create migration guide for users
  - [ ] Add to README or docs folder
  - [ ] Explain how to convert old workflows

- [ ] **Set removal timeline**
  - [ ] Add TODO comment with target date (e.g., 6 months)
  - [ ] Add to project roadmap
  - [ ] Notify users via changelog

- [ ] **Commit**
  ```bash
  git commit -m "feat: add deprecation warning for legacy workflow steps format

  - Warn users when legacy 'steps' format detected
  - Direct users to migration guide
  - Scheduled for removal in 6 months"
  ```

### 3.2 Legacy videoPath Parameter

- [ ] **Identify all usages**
  ```bash
  grep -rn "videoPath" src/app/api/ --include="*.ts"
  ```

- [ ] **Plan rename**
  - [ ] Decide on new name: `mediaPath` or `filePath`
  - [ ] Create backward compatibility strategy
  - [ ] Update API documentation

- [ ] **Rename in API endpoint**
  - [ ] Edit `src/app/api/dataset/caption/route.ts`
  - [ ] Rename parameter
  - [ ] Add compatibility alias if needed:
    ```typescript
    const { mediaPath, videoPath } = data;
    const filePath = mediaPath || videoPath; // Backward compat
    ```

- [ ] **Update API consumers**
  - [ ] Find all API calls to /api/dataset/caption
  - [ ] Update to use new parameter name
  - [ ] Test all affected flows

- [ ] **Update types**
  - [ ] Update request/response types
  - [ ] Update TypeScript interfaces

- [ ] **Verification**
  - [ ] Run build and tests
  - [ ] Test caption functionality
  - [ ] Test with old clients if compatibility added

- [ ] **Commit**
  ```bash
  git commit -m "refactor(api): rename videoPath to mediaPath in caption API

  - More accurate parameter name (supports images too)
  - Added backward compatibility for old clients
  - Updated all API consumers"
  ```

### 3.3 Legacy Parameter Matching

- [ ] **Check for workflows using old format**
  - [ ] Query workflow files for legacy pattern: `\d+-.*`
  - [ ] Check user-created workflows
  - [ ] Check example workflows

- [ ] **If no workflows use old format**:
  - [ ] Remove compatibility code from ComplexWorkflowBuilder.tsx (lines 282-285, 470-471)
  - [ ] Add validation to prevent legacy format
  - [ ] Test workflow builder

- [ ] **If workflows still use old format**:
  - [ ] Add deprecation warning
  - [ ] Create migration tool
  - [ ] Schedule for later removal

- [ ] **Verification**
  - [ ] Build and test
  - [ ] Test workflow creation
  - [ ] Test workflow execution
  - [ ] Test parameter linking

- [ ] **Commit**
  ```bash
  git commit -m "refactor: remove legacy parameter matching in workflow builder

  OR

  git commit -m "feat: add deprecation warning for legacy workflow parameters"
  ```

---

## Phase 4: Comment Cleanup

**Timeline**: Week 4 (parallel with Phase 3)  
**Risk**: None  
**Dependencies**: None

### 4.1 Update Workspace Page Comments

- [ ] **File: `src/app/workspace/page.tsx`**
  - [ ] Line 1390: "Clear selection in gallery..." 
    → "Clear selection in media gallery..."
  - [ ] Line 1412: "Select files in the media gallery first"
    → "Select files in the workspace media gallery first"

### 4.2 Update Component Comments

- [ ] **File: `src/components/workspace/WorkflowInputBuilder.tsx`**
  - [ ] Line 234: "...avoid polluting gallery"
    → "...avoid polluting workspace media gallery"

- [ ] **File: `src/components/workspace/ComplexWorkflowRunDialog.tsx`**
  - [ ] Line 214: "Select files in the media gallery first"
    → "Select files in the workspace media gallery first"

- [ ] **File: `src/components/workspace/JobInputEditor.tsx`**
  - [ ] Line 164: "...the gallery..."
    → "...the workspace media gallery..."
  - [ ] Line 315: "...gallery..."
    → "...workspace media gallery..."

### 4.3 Verification and Commit

- [ ] **Review all changes**
  ```bash
  git diff
  ```

- [ ] **Ensure no functional changes**
  - [ ] Only comments updated
  - [ ] No code changes
  - [ ] No logic changes

- [ ] **Commit**
  ```bash
  git add src/app/workspace/page.tsx \
         src/components/workspace/WorkflowInputBuilder.tsx \
         src/components/workspace/ComplexWorkflowRunDialog.tsx \
         src/components/workspace/JobInputEditor.tsx
  
  git commit -m "docs: clarify media gallery comments

  - Replace ambiguous 'gallery' with 'workspace media gallery'
  - Improve clarity about which gallery component is referenced
  - No functional changes, comment updates only"
  ```

---

## Phase 5: Store Cleanup

**Timeline**: Week 5  
**Risk**: High  
**Dependencies**: Phases 1-4 complete

### 5.1 Analyze uploadedFiles Field

- [ ] **Find all usages**
  ```bash
  grep -rn "uploadedFiles" src/ --include="*.ts" --include="*.tsx"
  ```

- [ ] **Document each usage**
  - [ ] List all files accessing uploadedFiles
  - [ ] Identify read vs write operations
  - [ ] Determine purpose of each usage

- [ ] **Check for redundancy with mediaFiles**
  - [ ] Compare uploadedFiles and mediaFiles structure
  - [ ] Check if data is duplicated
  - [ ] Identify unique data in uploadedFiles

- [ ] **Make decision**
  - [ ] Document whether to keep or remove
  - [ ] If keeping: update comment (not legacy)
  - [ ] If removing: plan migration

### 5.2 If Removing uploadedFiles

- [ ] **Create migration plan**
  - [ ] Map uploadedFiles data to mediaFiles
  - [ ] Identify any unique fields to preserve
  - [ ] Plan data migration

- [ ] **Update store definition**
  - [ ] Edit `src/store/workspace-store.ts`
  - [ ] Remove uploadedFiles field (line 32)
  - [ ] Remove related actions
  - [ ] Remove selectors

- [ ] **Update store consumers**
  - [ ] Replace uploadedFiles with mediaFiles
  - [ ] Update component logic
  - [ ] Update API calls

- [ ] **Update persistence layer**
  - [ ] Update localStorage schema
  - [ ] Add migration for existing data
  - [ ] Test data persistence

- [ ] **Comprehensive testing**
  - [ ] Test file upload flow
  - [ ] Test file processing
  - [ ] Test workspace initialization
  - [ ] Test store persistence
  - [ ] Manual end-to-end testing

- [ ] **Verification**
  - [ ] Run `npm run build`
  - [ ] Run `npm test`
  - [ ] Run `npm run lint`
  - [ ] Full manual testing of file management

- [ ] **Commit**
  ```bash
  git commit -m "refactor(store): remove legacy uploadedFiles field

  - uploadedFiles was redundant with mediaFiles
  - Migrated all usages to mediaFiles
  - Added data migration for localStorage
  - Verified: file upload and processing work correctly"
  ```

### 5.3 If Keeping uploadedFiles

- [ ] **Update documentation**
  - [ ] Remove "legacy" comment from line 32
  - [ ] Add clear comment explaining purpose
  - [ ] Document difference from mediaFiles

- [ ] **Verify necessity**
  - [ ] Ensure uploadedFiles serves unique purpose
  - [ ] Document why it can't be merged with mediaFiles

- [ ] **Commit**
  ```bash
  git commit -m "docs(store): clarify uploadedFiles is not legacy

  - uploadedFiles serves distinct purpose from mediaFiles
  - Updated comment to explain usage
  - Removed incorrect 'legacy' label"
  ```

---

## Final Verification

**Timeline**: End of Week 5  
**Dependencies**: All phases complete

### Build and Test

- [ ] **Clean build**
  ```bash
  rm -rf .next node_modules
  npm install
  npm run build
  ```
  - [ ] Build succeeds with zero errors
  - [ ] No TypeScript errors
  - [ ] No build warnings

- [ ] **Run all tests**
  ```bash
  npm test
  ```
  - [ ] All tests pass
  - [ ] No test failures
  - [ ] No test warnings

- [ ] **Run linter**
  ```bash
  npm run lint
  ```
  - [ ] No lint errors
  - [ ] No lint warnings

### Manual Testing

- [ ] **Workspace page**
  - [ ] Page loads correctly
  - [ ] Folder selection works
  - [ ] Media gallery displays images
  - [ ] Media gallery displays videos
  - [ ] Selection works
  - [ ] Toolbar actions work

- [ ] **Video processing**
  - [ ] FPS conversion works
  - [ ] Crop functionality works
  - [ ] Clip functionality works
  - [ ] Split functionality works
  - [ ] Progress tracking works
  - [ ] Results appear correctly

- [ ] **Image processing**
  - [ ] Image upload works
  - [ ] Image processing works
  - [ ] Gallery display works
  - [ ] Selection and actions work

- [ ] **Job history**
  - [ ] Job list displays correctly
  - [ ] Job details load
  - [ ] Results are accessible
  - [ ] Actions work (rerun, delete, etc.)

- [ ] **Workflow execution**
  - [ ] Workflows load
  - [ ] Workflow execution succeeds
  - [ ] Input assignment works
  - [ ] Results are correct

### Code Quality

- [ ] **Search for remaining issues**
  ```bash
  # No deprecated types remain
  grep -rn "@deprecated" src/types/
  
  # No legacy comments remain
  grep -rn "legacy" src/ --include="*.ts" --include="*.tsx"
  
  # No gallery page references (except video components)
  grep -rn "gallery/page.tsx" .
  ```

- [ ] **Review git log**
  - [ ] All commits have clear messages
  - [ ] No accidental commits
  - [ ] Commit history is clean

### Documentation Review

- [ ] **Review updated docs**
  - [ ] README.md is accurate
  - [ ] runninghub-nextjs/README.md is accurate
  - [ ] AGENTS.md is accurate
  - [ ] CLAUDE.md is accurate

- [ ] **Create changelog entry**
  - [ ] Document all breaking changes
  - [ ] Document migration paths
  - [ ] Document deprecated features

---

## Success Criteria Verification

- [ ] ✅ No references to deprecated Gallery/Videos pages in docs
- [ ] ✅ No `@deprecated` types in `src/types/workspace.ts`
- [ ] ✅ No legacy format compatibility code (or clearly documented with removal timeline)
- [ ] ✅ All comments accurately describe current architecture
- [ ] ✅ `npm run build` succeeds with zero errors
- [ ] ✅ `npm test` passes 100%
- [ ] ✅ Manual testing confirms all features work
- [ ] ✅ Code coverage maintained or improved

---

## Rollback Procedures (Emergency)

### If Critical Issue Discovered

1. **Immediate Actions**:
   ```bash
   # Stop all changes
   git stash
   
   # Revert to last known good state
   git log --oneline  # Find last good commit
   git revert <commit-hash>
   
   # Or hard reset if needed (use with caution)
   git reset --hard <last-good-commit>
   ```

2. **Verify restoration**:
   ```bash
   npm run build
   npm test
   # Manual testing
   ```

3. **Document issue**:
   - [ ] Create detailed issue report
   - [ ] Identify what broke
   - [ ] Identify why it broke
   - [ ] Plan fix strategy

4. **Update plan**:
   - [ ] Update removal plan with lessons learned
   - [ ] Add additional verification steps
   - [ ] Schedule retry

---

## Notes and Lessons Learned

### During Implementation

_Add notes here as you work through each phase_

**Phase 1**:
- 

**Phase 2**:
- 

**Phase 3**:
- 

**Phase 4**:
- 

**Phase 5**:
- 

### Blockers Encountered

_Document any blockers and how they were resolved_

### Recommended Process Improvements

_Suggestions for future deprecation removal projects_

---

## Completion Checklist

- [ ] All phases complete
- [ ] All verification steps passed
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Changelog created
- [ ] Team notified
- [ ] Production deployment planned

---

**Document Version**: 1.0  
**Created**: 2026-02-16  
**Last Updated**: 2026-02-16  
**Status**: Not Started
