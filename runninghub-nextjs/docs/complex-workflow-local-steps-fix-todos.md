# Complex Workflow Local Steps Fix TODOs

## Planning
- [x] Confirm complex workflow execution assumes cloud workflows only.
- [x] Identify local workflow storage path and mapping needs.

## Implementation
- [x] Load local workflow definitions in complex workflow execute endpoint.
- [x] Load local workflow definitions in complex workflow continue endpoint.
- [x] Bypass cloud `sourceWorkflowId` resolution for local steps.
- [x] Load local workflows in complex workflow execute UI.
- [x] Prefill complex workflow step inputs (static + dynamic outputs) in execute UI.

## Testing
- [ ] Run a complex workflow with local → cloud steps.
- [ ] Run a complex workflow with cloud → local steps.
