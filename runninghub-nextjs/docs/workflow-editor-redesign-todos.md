# Workflow Editor Redesign - TODO List

## Phase 1: Type Definitions and Constants

- [x] Step 1.1: Add `CliNode`, `WorkflowTemplate`, `WorkflowV2` types to `src/types/workspace.ts`
- [x] Step 1.2: Create `src/constants/workflows.ts` with available workflow IDs

## Phase 2: API Endpoints

- [x] Step 2.1: Create `/api/workflow/nodes/route.ts` - Fetch nodes from CLI
- [x] Step 2.2: Create `/api/workflow/save/route.ts` - Save workflow to workspace folder
- [x] Step 2.3: Create `/api/workflow/list/route.ts` - List saved workflows

## Phase 3: WorkflowEditor Component

- [x] Step 3.1: Add workflow template selection UI (for new workflows)
- [x] Step 3.2: Implement `handleLoadTemplate` function to fetch nodes
- [x] Step 3.3: Parse CLI node response and populate input parameters
- [x] Step 3.4: Add step indicators (Step 1: Select Template, Step 2: Configure Fields)

## Phase 4: ParameterEditor Component

- [x] Step 4.1: Add `lockedFields` prop to ParameterEditor
- [x] Step 4.2: Implement file type selector (image/video radio buttons)
- [x] Step 4.3: Add visual indicators for locked fields (lock icon, grayed out)
- [x] Step 4.4: Disable editing for locked fields

## Phase 5: Save to Workspace

- [x] Step 5.1: Add save endpoint call to `handleSave` in WorkflowEditor
- [x] Step 5.2: Ensure workflows directory exists in workspace folder
- [x] Step 5.3: Save workflow as JSON file with workflow ID as filename

## Phase 6: Environment Configuration

- [x] Step 6.1: Add `NEXT_PUBLIC_RUNNINGHUB_S_ID=2004098019010199554` to `.env.local`
- [x] Step 6.2: Add `NEXT_PUBLIC_RUNNINGHUB_D_ID=2004104127166726146` to `.env.local`
- [x] Step 6.3: Restart development server to load new env variables

## Phase 7: Testing and Verification

- [ ] Step 7.1: Test CLI nodes command returns valid data for all workflow IDs
- [ ] Step 7.2: Test template selection dropdown shows all configured workflows
- [ ] Step 7.3: Test auto-load template on selection works correctly
- [ ] Step 7.4: Test locked fields cannot be edited
- [ ] Step 7.5: Test unlocked fields can be edited
- [ ] Step 7.6: Test file type selector (image/video) works correctly
- [ ] Step 7.7: Test save creates JSON file in workspace/workflows/
- [ ] Step 7.8: Test edit loads existing workflow correctly
- [ ] Step 7.9: Test backward compatibility with existing workflows
- [ ] Step 7.10: Test error handling for missing/invalid workflow IDs
- [ ] Step 7.11: Test error handling for CLI failures

## Phase 8: UX Enhancement - Auto-Load Template

- [x] Step 8.1: Remove "Load Template" button
- [x] Step 8.2: Auto-load template when workflow ID is selected
- [x] Step 8.3: Show loading state in Select dropdown
- [x] Step 8.4: Update UI description to indicate automatic loading

## Build Verification

- [x] Run `npm run build` to ensure TypeScript compilation succeeds
- [x] Fix any build errors or warnings
