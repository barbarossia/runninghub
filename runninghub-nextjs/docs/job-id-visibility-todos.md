# Job ID Visibility TODOs

- [ ] Assess where to surface `job.id` inside `runninghub-nextjs/src/components/workspace/JobList.tsx` without breaking the existing layout.
- [ ] Render the full Job ID string in the Job History card (e.g., a new metadata line under the timestamp) with wrapping styles.
- [ ] Update `runninghub-nextjs/src/components/workspace/JobDetail.tsx` so the header metadata uses the complete job ID instead of slicing.
- [ ] Run `npm run lint` and `npm run build` from `runninghub-nextjs/` after changes and note results.
