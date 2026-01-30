# Job Detail Combined Outputs Fix - TODO List

> **Plan Document**: See [job-detail-combined-outputs-fix-plan.md](./job-detail-combined-outputs-fix-plan.md) for details.

---

## Phase 1: Update Rendering Logic
- [x] Add `hasTextOutputs` and `hasFileOutputs` helpers in JobDetail
- [x] Render text outputs section when `textOutputs` exists
- [x] Render file outputs section when `outputs` exists
- [x] Update empty-state condition to check both sections
- [x] Prevent file outputs section from shrinking under text outputs
- [x] Move file outputs above translation section for visibility
- [x] Fetch outputs when results are missing output files (preserve translations)
- [x] Render outputs from resolved results (merge disk results with store)
- [x] Force initial results fetch for completed jobs

## Phase 2: Verify
- [ ] Check `job_1769350219636_dcd3e466` shows both image and text outputs
- [ ] Verify text-only and file-only jobs still render correctly
- [ ] Run `npm run build`
