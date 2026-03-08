# Dockerfile PEP 668 Plan

## Goal
Allow `pip install -r requirements.txt` to succeed in the backend image when Alpine marks Python as externally managed.

## Non-Goals
- Changing dependency versions.
- Switching to virtual environments.

## Scope
- Update `Dockerfile.backend` to pass `--break-system-packages` to pip.

## Output
- `Dockerfile.backend` updated.
