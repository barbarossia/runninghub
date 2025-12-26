# Workflow Tab Separation - TODO List

## Overview
Separate "Select Files & Run Workflow" into its own tab to improve UX and separation of concerns.

## Implementation Checklist

### Phase 1: Type and State Updates
- [ ] Update `activeTab` state type from `'media' | 'workflows' | 'jobs'` to `'media' | 'run-workflow' | 'workflows' | 'jobs'`
- [ ] Update `TabsList` grid layout from 3 columns to 4 columns
- [ ] Add new `TabsTrigger` for "run-workflow" tab with Play/Zap icon
- [ ] Test that tabs switch correctly

### Phase 2: Tab Content Reorganization
- [ ] Move `<h3>Select Files & Run Workflow</h3>` header to Run Workflow tab
- [ ] Move `<WorkflowSelector>` and grid wrapper from Media tab to Run Workflow tab
- [ ] Move `<WorkflowInputBuilder>` from Media tab to Run Workflow tab
- [ ] Remove workflow-related content from Media Gallery tab
- [ ] Keep only `<MediaSelectionToolbar>` and `<MediaGallery>` in Media Gallery tab
- [ ] Verify all components are properly imported

### Phase 3: Styling and Icons
- [ ] Import `Play` or `Zap` icon from lucide-react
- [ ] Update tab triggers with new icon
- [ ] Test tab labels display correctly on mobile (may need to hide text on small screens)
- [ ] Verify 4-column layout works on desktop and tablet
- [ ] Consider responsive behavior for very small screens (stack vertically?)

### Phase 4: Testing and Verification
- [ ] Test folder selection → lands on Media Gallery tab
- [ ] Test selecting files in Media Gallery tab
- [ ] Test switching to Run Workflow tab (file selection should persist)
- [ ] Test workflow selection in Run Workflow tab
- [ ] Test assigning selected files to workflow parameters
- [ ] Test running job from Run Workflow tab
- [ ] Test job appears in Job History tab
- [ ] Test console tracking works across all tabs
- [ ] Test switching back to Media Gallery tab (selection still there)
- [ ] Test Workflows tab (no regressions)
- [ ] Run TypeScript compilation: `npm run build`
- [ ] Fix any TypeScript errors
- [ ] Manual testing in browser: Chrome, Safari, Firefox
- [ ] Mobile testing: Check tab layout on phone screen

## Post-Implementation
- [ ] Verify no console errors in browser DevTools
- [ ] Check all existing functionality still works
- [ ] Update any related documentation if needed
- [ ] Commit changes with descriptive message
- [ ] Test build on clean environment

## Notes
- No backend changes required
- No store changes required (state already global)
- This is purely a UI reorganization
- Follow frontend CLAUDE.md rules for styling and patterns

---

**Created**: 2025-12-26
**Last Updated**: 2025-12-26
