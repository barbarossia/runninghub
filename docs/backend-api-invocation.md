# Backend API Invocation Guide

This document shows how to use the backend APIs. It is usage-only and does not explain internal behavior.

## Base URL

```
http://192.168.1.63:49152
```

## Common Headers

```
Content-Type: application/json
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
curl -X POST "http://192.168.1.63:49152/api/workspace/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "workflowId": "workflow_1768654339955_xxsbhdk22",
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

### Recorded Output

```
{"success":true,"taskId":"workspace_job_1772897242991_3990f6bc","jobId":"job_1772897242991_52b702b5","message":"Job started successfully"}
```

### Job Status (from /api/workspace/jobs)

```
{"id":"job_1772897242991_52b702b5","status":"failed","error":"Exit code -2","completedAt":1772897243086}
```

## Supporting Usage

### GET /api/workflow/list

```
curl "http://192.168.1.63:49152/api/workflow/list"
```

### GET /api/workflow/nodes?workflowId=<id>

```
curl "http://192.168.1.63:49152/api/workflow/nodes?workflowId=<workflow-id>"
```

### GET /api/workspace/jobs

```
curl "http://192.168.1.63:49152/api/workspace/jobs"
```
