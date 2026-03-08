# Backend API Invocation Guide

This document shows how to use the backend APIs. It is usage-only and does not explain internal behavior.

## Base URL

```
http://localhost:49152
```

## Common Headers

```
Content-Type: application/json
```

## Task State Location

Task state is stored under `${WORKSPACE_PATH}/runninghub-tasks` (configured via `WORKSPACE_PATH`).
Restart the backend process after changing `WORKSPACE_PATH`.

## Workflow Storage Location

Workflow JSON files are stored under `${WORKSPACE_PATH}/workflows`.
For Docker, mount your host workspace to `/data` and place workflow JSON files at:

```
<host-workspace>/workflows/<workflow-id>.json
```

## API Info (Usage)

| Purpose | Method | Path |
| --- | --- | --- |
| List saved workflows | GET | `/api/workflow/list` |
| Fetch workflow nodes | GET | `/api/workflow/nodes?workflowId=<id>` |
| Execute a workflow | POST | `/api/workspace/execute` |
| List jobs | GET | `/api/workspace/jobs` |

## Invoke Workflow (First Example)

Workflow name: `单图图像反推工作流_api`
Workflow ID: `workflow_1768654339955_xxsbhdk22`
Image parameter ID: `param_40_image`

### POST /api/workspace/execute

```
curl -X POST "http://localhost:49152/api/workspace/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "workflow_1768654339955_xxsbhdk22",
    "sourceWorkflowId": "2004081105131192322",
    "workflowName": "单图图像反推工作流_api",
    "fileInputs": [
      {
        "parameterId": "param_40_image",
        "filePath": "/data/118259777_000.png",
        "fileName": "118259777_000.png",
        "fileSize": 2306455,
        "fileType": "image",
        "valid": true
      }
    ],
    "textInputs": {},
    "deleteSourceFiles": false
  }'
```

### Recorded Output (earlier run)

```
{"success":true,"taskId":"workspace_job_1772950517612_f507e6a7","jobId":"job_1772950517612_b99e3694","message":"Job started successfully"}
```

### Job Status (earlier run)

```
{"id":"job_1772950517612_b99e3694","status":"completed","runninghubTaskId":"2030527767283634178","completedAt":1772950551643}
```

## Supporting Usage

### GET /api/workflow/list

```
curl "http://localhost:49152/api/workflow/list"
```

### GET /api/workflow/nodes?workflowId=<id>

```
curl "http://localhost:49152/api/workflow/nodes?workflowId=<workflow-id>"
```

### GET /api/workspace/jobs

```
curl "http://localhost:49152/api/workspace/jobs"
```

## Latest API Test Run (2026-03-08)

### GET /api/workflow/list

```
{"success":true,"workflows":["..."],"count":32}
```

### GET /api/workflow/nodes?workflowId=workflow_1768654339955_xxsbhdk22

```
{"workflowId":"workflow_1768654339955_xxsbhdk22","nodes":[],"count":0}
```

### POST /api/workspace/execute

```
{"success":true,"taskId":"workspace_job_1772950517612_f507e6a7","jobId":"job_1772950517612_b99e3694","message":"Job started successfully"}

### GET /api/workspace/jobs (after completion)

```
{"id":"job_1772950517612_b99e3694","status":"completed","runninghubTaskId":"2030527767283634178","results":{"outputs":[{"type":"text","path":"/data/job_1772950517612_b99e3694/result/save_text_00001_ftpqs_1772950548.txt"}]}}
```
```
