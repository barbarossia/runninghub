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

## Upload Then Execute

Use `/api/workspace/upload` to send the image to the server workspace, then pass the returned
`workspacePath` into `/api/workspace/execute`.

### POST /api/workspace/upload

#### Multipart (recommended for large files)

```
curl -X POST "http://localhost:49152/api/workspace/upload" \
  -F "files=@118259777_000.png"
```

Example (tested locally):

```
curl -X POST "http://localhost:49152/api/workspace/upload" \
  -F "files=@/Users/barbarossia/Downloads/52836011_000.png"
```

#### Base64 JSON (small files)

```
BASE64_DATA=$(python3 - <<'PY'
import base64
with open("118259777_000.png", "rb") as f:
    print(base64.b64encode(f.read()).decode())
PY
)

curl -X POST "http://localhost:49152/api/workspace/upload" \
  -H "Content-Type: application/json" \
  -d "{\n    \"files\": [\n      {\n        \"name\": \"118259777_000.png\",\n        \"data\": \"${BASE64_DATA}\"\n      }\n    ]\n  }"
```

### Upload Response (example)

```
{
  "success": true,
  "uploadedFiles": [
    {
      "id": "<file-id>",
      "name": "118259777_000.png",
      "workspacePath": "/data/118259777_000.png",
      "width": 1024,
      "height": 1024
    }
  ]
}
```

Use `uploadedFiles[0].workspacePath` as `fileInputs[].filePath` in the execute call.

### Upload and Execute (combined flow)

```
UPLOAD_JSON=$(curl -sS -X POST "http://localhost:49152/api/workspace/upload" \
  -F "files=@/Users/barbarossia/Downloads/52836011_000.png")

WORKSPACE_PATH=$(python3 - <<'PY'
import json, os
data = json.loads(os.environ["UPLOAD_JSON"])
print(data["uploadedFiles"][0]["workspacePath"])
PY
)

curl -sS -X POST "http://localhost:49152/api/workspace/execute" \
  -H "Content-Type: application/json" \
  -d "{\n    \"workflowId\": \"workflow_1768654339955_xxsbhdk22\",\n    \"sourceWorkflowId\": \"2004081105131192322\",\n    \"workflowName\": \"单图图像反推工作流_api\",\n    \"fileInputs\": [\n      {\n        \"parameterId\": \"param_40_image\",\n        \"filePath\": \"${WORKSPACE_PATH}\",\n        \"fileName\": \"52836011_000.png\",\n        \"fileSize\": 2306455,\n        \"fileType\": \"image\",\n        \"valid\": true\n      }\n    ],\n    \"textInputs\": {},\n    \"deleteSourceFiles\": false\n  }"
```

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

Response:

```
{"success":true,"workflows":[],"count":0}
```

### GET /api/workflow/nodes?workflowId=<id>

```
curl "http://localhost:49152/api/workflow/nodes?workflowId=<workflow-id>"
```

Response:

```
{"workflowId":"workflow_1768654339955_xxsbhdk22","nodes":[],"count":0}
```

### GET /api/workspace/jobs

```
curl "http://localhost:49152/api/workspace/jobs"
```

Response:

```
{"jobs":[{"id":"job_1772947986959_350b36e9","workflowId":"workflow_1768654339955_xxsbhdk22","workflowName":"单图图像反推工作流_api","sourceWorkflowId":"workflow_1768654339955_xxsbhdk22","fileInputs":[{"parameterId":"param_40_image","filePath":"/data/job_1772947986959_350b36e9/118259777_000.png","fileName":"118259777_000.png","fileSize":68,"fileType":"image","valid":true}],"textInputs":{},"status":"failed","taskId":"workspace_job_1772947986959_937309d5","createdAt":1772947986960,"deleteSourceFiles":false,"startedAt":1772947986969,"error":"Exit code 1","completedAt":1772947986982},{"id":"job_1772947933469_3a2ecaec","workflowId":"workflow_1768654339955_xxsbhdk22","workflowName":"单图图像反推工作流_api","sourceWorkflowId":"workflow_1768654339955_xxsbhdk22","fileInputs":[{"parameterId":"param_40_image","filePath":"/data/118259777_000.png","fileName":"118259777_000.png","fileSize":2306455,"fileType":"image","valid":true}],"textInputs":{},"status":"failed","taskId":"workspace_job_1772947933468_be121697","createdAt":1772947933470,"deleteSourceFiles":false,"error":"Missing input file(s): /data/118259777_000.png","completedAt":1772947933474}]}
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
