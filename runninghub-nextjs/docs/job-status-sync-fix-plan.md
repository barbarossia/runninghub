## Overview
Prevent stale status updates from overwriting failed/completed job states in Job History.

## Current State
- Job status is updated from task polling callbacks.
- A job that is already failed/completed can be set back to running if a late status update arrives.

## Target State
- Once a job is failed or completed, it stays in that terminal state in the UI unless explicitly refreshed from disk.

## Requirements
- Keep existing polling and console behavior.
- Only guard against overwriting terminal states.

## Implementation Phases
1. Guard status updates when job is already failed/completed.
2. Manual verify with a failed job.
