# Complex Workflow User-Input Output Prefill Plan

## Overview
On the Complex Workflow Execute page, steps with `user-input` file parameters are not auto-filled with the previous step’s output. This blocks advancing when the next step expects the prior output as its input (e.g., step 3 uses step 2 output). We will add a lightweight fallback: if a step has a user-input file parameter and no mapped inputs, prefill it with the previous step’s primary output file.

## Current State
- `mappedStepInputs` only fills inputs for `dynamic` and `previous-input` mappings.
- Steps with `user-input` file parameters remain empty even if the previous step produced outputs.
- The Execute page validation prevents running a step with empty inputs.

## Target State
- If the next step has a user-input file param and no mapped inputs, it auto-prefills with the previous step’s first output file.
- This enables “Next” → “Run Step” without manual file selection when outputs exist.

## Requirements
- Only prefill when no file inputs are already mapped.
- Do not override manual selections.
- Use previous step output file (path, name, size, type).

## Technical Approach
1. In `mappedStepInputs` on the Execute page, detect user-input file params.
2. If `mappedFileInputs` is empty, read the previous step’s output map and use the first output (alias) to build a file input entry.
3. Clear stale `jobFiles` when advancing steps so prefill can apply to the next step.
4. Load the latest execution for the workflow so outputs are available after reloads.
5. Keep existing dynamic/previous-input behavior intact.

## Files to Update
- `runninghub-nextjs/src/app/workspace/complex-workflow/execute/[id]/page.tsx`

## Risks / Notes
- If the previous step output is not a file, no prefill will occur.
- Multiple user-input file params will receive the same output if more than one exists.
