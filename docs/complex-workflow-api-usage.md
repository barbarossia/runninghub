# Complex Workflow API Usage Guide

This document shows how to use the Complex Workflow APIs. It is usage-only and does not explain internal behavior.

## Base URL

```
http://localhost:49152
```

## Common Headers

```
Content-Type: application/json
```

## Storage Locations

- Complex workflow templates: `~/Downloads/workspace/complex-workflows/<workflowId>.json`
- Execution state: `${WORKSPACE_PATH}/complex-executions/<executionId>/execution.json`

## API Info (Usage)

| Purpose | Method | Path |
| --- | --- | --- |
| Save complex workflow | POST | `/api/workspace/complex-workflow/save` |
| List complex workflows | GET | `/api/workspace/complex-workflow/list` |
| Get complex workflow | GET | `/api/workspace/complex-workflow/<workflowId>` |
| Update complex workflow | PUT | `/api/workspace/complex-workflow/<workflowId>` |
| Delete complex workflow | DELETE | `/api/workspace/complex-workflow/<workflowId>` |
| Execute complex workflow | POST | `/api/workspace/complex-workflow/execute` |
| Continue complex workflow | POST | `/api/workspace/complex-workflow/continue` |
| List executions | GET | `/api/workspace/complex-workflow/execution/list` |
| Get execution | GET | `/api/workspace/complex-workflow/execution/<executionId>` |
| Stop execution | POST | `/api/workspace/complex-workflow/execution/<executionId>/stop` |

## Save Complex Workflow

### POST /api/workspace/complex-workflow/save

```
curl -X POST "http://localhost:49152/api/workspace/complex-workflow/save" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "id": "complex_1730000000000_demo",
      "name": "Demo Complex Workflow",
      "description": "Two-step pipeline",
      "steps": [
        {
          "id": "step_1",
          "stepNumber": 1,
          "workflowId": "workflow_1768654339955_xxsbhdk22",
          "workflowName": "单图图像反推工作流_api",
          "parameters": [
            {
              "parameterId": "param_40_image",
              "parameterName": "image",
              "valueType": "user-input",
              "required": true
            }
          ]
        },
        {
          "id": "step_2",
          "stepNumber": 2,
          "workflowId": "workflow_1768654339955_xxsbhdk22",
          "workflowName": "单图图像反推工作流_api",
          "parameters": [
            {
              "parameterId": "param_40_image",
              "parameterName": "image",
              "valueType": "previous-input",
              "previousInputMapping": {
                "sourceStepNumber": 1,
                "sourceParameterId": "param_40_image",
                "sourceParameterName": "image"
              }
            }
          ]
        }
      ],
      "createdAt": 1730000000000,
      "updatedAt": 1730000000000
    }
  }'
```

Response:

```
{"success":true,"workflowId":"complex_1730000000000_demo"}
```

Validation rules:
- `workflow.steps` must be non-empty.
- Each step must include `workflowId`, `workflowName`, and `stepNumber`.
- `stepNumber` must be sequential (1..N).
- Parameters:
  - `valueType: dynamic` requires `dynamicMapping`.
  - `valueType: static` requires `staticValue`.

## List Complex Workflows

### GET /api/workspace/complex-workflow/list

```
curl "http://localhost:49152/api/workspace/complex-workflow/list"
```

Response:

```
{"success":true,"workflows":[{"id":"complex_1730000000000_demo","name":"Demo Complex Workflow","steps":[]}]} 
```

## Get / Update / Delete Complex Workflow

### GET /api/workspace/complex-workflow/<workflowId>

```
curl "http://localhost:49152/api/workspace/complex-workflow/complex_1730000000000_demo"
```

Response:

```
{"success":true,"workflow":{"id":"complex_1730000000000_demo","name":"Demo Complex Workflow","steps":[]}}
```

### PUT /api/workspace/complex-workflow/<workflowId>

```
curl -X PUT "http://localhost:49152/api/workspace/complex-workflow/complex_1730000000000_demo" \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": {
      "id": "complex_1730000000000_demo",
      "name": "Demo Complex Workflow (updated)",
      "steps": []
    }
  }'
```

Response:

```
{"success":true,"workflowId":"complex_1730000000000_demo"}
```

### DELETE /api/workspace/complex-workflow/<workflowId>

```
curl -X DELETE "http://localhost:49152/api/workspace/complex-workflow/complex_1730000000000_demo"
```

Response:

```
{"success":true,"message":"Complex workflow deleted"}
```

## Execute Complex Workflow

### POST /api/workspace/complex-workflow/execute

```
curl -X POST "http://localhost:49152/api/workspace/complex-workflow/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "complexWorkflowId": "complex_1730000000000_demo",
    "autoContinue": true,
    "initialParameters": {
      "fileInputs": [
        {
          "parameterId": "param_40_image",
          "filePath": "/data/52836011_000.png",
          "fileName": "52836011_000.png",
          "fileSize": 2306455,
          "fileType": "image",
          "valid": true
        }
      ],
      "textInputs": {},
      "deleteSourceFiles": false
    }
  }'
```

Response:

```
{"success":true,"executionId":"complex_exec_1730000000000_demo","jobId":"job_1772953613029_593e5e39","message":"Complex workflow execution started"}
```

Notes:
- The API loads the step-1 workflow definition from `~/Downloads/workspace/workflows/<workflowId>.json`.
- Local workflows (IDs starting with `local_`) are loaded from `~/Downloads/workspace/local-workflows/`.
- The first step is executed via `/api/workspace/execute` with `seriesId` set to `executionId`.

## Continue Complex Workflow

### POST /api/workspace/complex-workflow/continue

```
curl -X POST "http://localhost:49152/api/workspace/complex-workflow/continue" \
  -H "Content-Type: application/json" \
  -d '{
    "executionId": "complex_exec_1730000000000_demo",
    "stepNumber": 1,
    "parameters": {
      "fileInputs": [],
      "textInputs": {
        "prompt": "high detail"
      },
      "deleteSourceFiles": false
    }
  }'
```

Response:

```
{"success":true,"jobId":"job_1772953613029_593e5e39","message":"Step 2 started"}
```

Notes:
- `stepNumber` is the current completed step; the API will start `stepNumber + 1`.
- The API refuses to continue if the current step is not `completed`.
- Dynamic/previous-input mappings are resolved before user parameters are applied.

## List Executions

### GET /api/workspace/complex-workflow/execution/list

```
curl "http://localhost:49152/api/workspace/complex-workflow/execution/list"
```

Response:

```
{"success":true,"executions":[{"id":"complex_exec_1730000000000_demo","complexWorkflowId":"complex_1730000000000_demo","status":"running","currentStep":1}]}
```

## Get Execution Status

### GET /api/workspace/complex-workflow/execution/<executionId>

```
curl "http://localhost:49152/api/workspace/complex-workflow/execution/complex_exec_1730000000000_demo"
```

Response:

```
{"success":true,"execution":{"id":"complex_exec_1730000000000_demo","status":"running","currentStep":1,"steps":[]}}
```

Notes:
- This endpoint backfills missing step inputs/outputs from `job.json` when available.

## Stop Execution

### POST /api/workspace/complex-workflow/execution/<executionId>/stop

```
curl -X POST "http://localhost:49152/api/workspace/complex-workflow/execution/complex_exec_1730000000000_demo/stop"
```

Response:

```
{"success":true,"message":"Execution paused"}
```

## Tested Run (2026-03-08)

Workflow: `短视频生成一键版`
Input video: `/data/67ca02f1-e8f2-4e69-bb50-3ef79d7b1630.mp4`

### 1) Upload video

Request:

```
curl -X POST "http://localhost:49152/api/workspace/upload" \
  -F "files=@/Users/barbarossia/Downloads/67ca02f1-e8f2-4e69-bb50-3ef79d7b1630.mp4"
```

Response:

```
{"success":true,"uploadedFiles":[{"id":"6f1082fe0eab32ecf2fad511417e7703","name":"67ca02f1-e8f2-4e69-bb50-3ef79d7b1630.mp4","workspacePath":"/data/67ca02f1-e8f2-4e69-bb50-3ef79d7b1630.mp4","width":544,"height":704}]}
```

### 2) Execute complex workflow

Request:

```
{
  "complexWorkflowId": "complex_1769762016351_1d75febd",
  "autoContinue": true,
  "initialParameters": {
    "fileInputs": [
      {
        "parameterId": "local_1769695285543_2a4b3725_file",
        "filePath": "/data/67ca02f1-e8f2-4e69-bb50-3ef79d7b1630.mp4",
        "fileName": "67ca02f1-e8f2-4e69-bb50-3ef79d7b1630.mp4",
        "fileSize": 5803572,
        "fileType": "video",
        "valid": true
      }
    ],
    "textInputs": {},
    "deleteSourceFiles": false
  }
}
```

Response:

```
{"success":true,"executionId":"exec_1772975636390_13699c74","jobId":"job_1772975636402_6c209cbc","message":"Complex workflow execution started"}
```

### 3) Continue step 3 after workflow file was available

Request:

```
{"executionId":"exec_1772975636390_13699c74","stepNumber":2,"parameters":{"fileInputs":[],"textInputs":{},"deleteSourceFiles":false}}
```

Response:

```
{"success":true,"jobId":"job_1772975815396_bc55d10e","message":"Step 3 started"}
```

### 4) Final execution status

Response:

```
{
  "success": true,
  "execution": {
    "complexWorkflowId": "complex_1769762016351_1d75febd",
    "name": "短视频生成一键版",
    "status": "completed",
    "currentStep": 4,
    "autoContinue": true,
    "baseUrl": "http://0.0.0.0:3000",
    "steps": [
      {
        "stepNumber": 1,
        "workflowId": "local_1769695285543_2a4b3725",
        "jobId": "job_1772975636402_6c209cbc",
        "status": "completed",
        "inputs": {
          "fileInputs": [
            {
              "parameterId": "local_1769695285543_2a4b3725_file",
              "filePath": "/data/67ca02f1-e8f2-4e69-bb50-3ef79d7b1630.mp4",
              "fileName": "67ca02f1-e8f2-4e69-bb50-3ef79d7b1630.mp4",
              "fileSize": 5803572,
              "fileType": "video",
              "valid": true
            }
          ],
          "textInputs": {},
          "deleteSourceFiles": false
        },
        "startedAt": 1772975636407,
        "completedAt": 1772975637979,
        "outputs": {
          "outputs": [
            {
              "type": "file",
              "path": "/data/job_1772975636402_6c209cbc/result/67ca02f1-e8f2-4e69-bb50-3ef79d7b1630_converted.mp4",
              "fileName": "67ca02f1-e8f2-4e69-bb50-3ef79d7b1630_converted.mp4",
              "fileType": "video",
              "workspacePath": "job_1772975636402_6c209cbc/result/67ca02f1-e8f2-4e69-bb50-3ef79d7b1630_converted.mp4"
            }
          ],
          "textOutputs": []
        },
        "workflowName": "视频压缩"
      },
      {
        "stepNumber": 2,
        "workflowId": "local_1769761819812_695997f7",
        "jobId": "job_1772975637993_410f9d96",
        "status": "completed",
        "inputs": {
          "fileInputs": [
            {
              "parameterId": "local_1769761819812_695997f7_file",
              "filePath": "/data/job_1772975636402_6c209cbc/result/67ca02f1-e8f2-4e69-bb50-3ef79d7b1630_converted.mp4",
              "fileName": "67ca02f1-e8f2-4e69-bb50-3ef79d7b1630_converted.mp4",
              "fileSize": 0,
              "fileType": "video",
              "valid": true
            }
          ],
          "textInputs": {
            "local_1769761819812_695997f7_mode": "from-width",
            "local_1769761819812_695997f7_targetWidth": "720",
            "local_1769761819812_695997f7_targetHeight": "",
            "local_1769761819812_695997f7_rounding": "round"
          },
          "deleteSourceFiles": false
        },
        "startedAt": 1772975637995,
        "completedAt": 1772975638242,
        "outputs": {
          "outputs": [
            {
              "type": "text",
              "path": "/data/job_1772975637993_410f9d96/result/aspect_height.txt",
              "fileName": "aspect_height.txt",
              "fileType": "text",
              "workspacePath": "job_1772975637993_410f9d96/result/aspect_height.txt"
            },
            {
              "type": "text",
              "path": "/data/job_1772975637993_410f9d96/result/aspect_width.txt",
              "fileName": "aspect_width.txt",
              "fileType": "text",
              "workspacePath": "job_1772975637993_410f9d96/result/aspect_width.txt"
            }
          ],
          "textOutputs": [
            {
              "fileName": "aspect_height.txt",
              "filePath": "/data/job_1772975637993_410f9d96/result/aspect_height.txt",
              "content": {"original": "933"},
              "autoTranslated": false
            },
            {
              "fileName": "aspect_width.txt",
              "filePath": "/data/job_1772975637993_410f9d96/result/aspect_width.txt",
              "content": {"original": "720"},
              "autoTranslated": false
            }
          ]
        },
        "workflowName": "计算视频比例"
      },
      {
        "stepNumber": 3,
        "workflowId": "workflow_1768471112335_0amgxobq4",
        "jobId": "job_1772975815396_bc55d10e",
        "status": "completed",
        "inputs": {
          "fileInputs": [
            {
              "parameterId": "param_22_video",
              "filePath": "/data/job_1772975636402_6c209cbc/result/67ca02f1-e8f2-4e69-bb50-3ef79d7b1630_converted.mp4",
              "fileName": "67ca02f1-e8f2-4e69-bb50-3ef79d7b1630_converted.mp4",
              "fileSize": 0,
              "fileType": "video",
              "valid": true
            }
          ],
          "textInputs": {
            "param_46_value": "720",
            "param_47_value": "933"
          },
          "deleteSourceFiles": false
        },
        "startedAt": 1772975815409,
        "completedAt": 1772976011482,
        "outputs": {
          "outputs": [
            {
              "type": "file",
              "path": "/data/job_1772975815396_bc55d10e/result/ComfyUI_00001_ueoao_1772976010.png",
              "fileName": "ComfyUI_00001_ueoao_1772976010.png",
              "fileType": "image",
              "workspacePath": "job_1772975815396_bc55d10e/result/ComfyUI_00001_ueoao_1772976010.png"
            }
          ],
          "textOutputs": []
        },
        "workflowName": "video_wan2_2_数字人工作流2-放大_api"
      },
      {
        "stepNumber": 4,
        "workflowId": "local_1770210347180_bfd5ed75",
        "jobId": "job_1772976021356_c7ddbe6b",
        "status": "completed",
        "inputs": {
          "fileInputs": [
            {
              "parameterId": "local_1770210347180_bfd5ed75_file",
              "filePath": "/data/job_1772975815396_bc55d10e/result/ComfyUI_00001_ueoao_1772976010.png",
              "fileName": "ComfyUI_00001_ueoao_1772976010.png",
              "fileSize": 0,
              "fileType": "image",
              "valid": true
            }
          ],
          "textInputs": {},
          "deleteSourceFiles": false
        },
        "startedAt": 1772976021363,
        "completedAt": 1772976022370,
        "outputs": {
          "outputs": [
            {
              "type": "file",
              "path": "/data/67ca02f1-e8f2-4e69-bb50-3ef79d7b1630_processed.mp4",
              "fileName": "67ca02f1-e8f2-4e69-bb50-3ef79d7b1630_processed.mp4",
              "fileType": "video",
              "workspacePath": "/data/67ca02f1-e8f2-4e69-bb50-3ef79d7b1630_processed.mp4"
            }
          ],
          "textOutputs": []
        },
        "workflowName": "Decode"
      }
    ],
    "id": "exec_1772975636390_13699c74",
    "createdAt": 1772975636390
  }
}
```
