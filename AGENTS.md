# Agent Instructions

This repository builds a white-box UI automation toolkit for first-party frontend apps.

## Mental Model

The core loop is:

```text
TSX source -> ast-plugin -> data-ai-id + element-index/action-index -> runtime-sdk -> executeAction
```

Do not treat this as a generic visual automation project. The goal is source-aware, build-time generated anchors for apps whose source/build pipeline we control.

## Packages

- `packages/ast-plugin`: build-time scanner, injector, index emitter, action-index validator
- `packages/runtime-sdk`: browser runtime observation, DOM tools, action executor, action-index helpers
- `packages/demo-app`: minimal Vite/React proof app
- `scripts/verify-external-project.mjs`: sidecar verification against another Vite project

## Commands

Always run these before claiming a change is complete:

```bash
pnpm test
pnpm check
pnpm build
```

For real external-project verification:

```bash
pnpm build
pnpm verify:external -- --project /absolute/path/to/project --include src/pages/login/index.tsx --mode development
```

## Git Hygiene

Do not commit:

- `node_modules/`
- `packages/*/dist/`
- `packages/demo-app/dist/`
- `generated/`
- `agent-ast-generated/`
- `.agent-ast/`
- external project build outputs

## Design Constraints

- Keep build-time source metadata separate from production-safe runtime anchors.
- `data-ai-id` is allowed to be production-facing; raw source paths and line numbers should be mode-controlled later.
- Runtime tools must return structured results, not throw for normal operation failures.
- `action-index` must be validated against `element-index` at build time.
- Prefer small, test-backed vertical slices.

## Current Known External Verification

Verified against:

```text
/Users/shenjie/cursorIDE/xinqiao/copilot-web-app
```

Using:

```text
src/pages/login/index.tsx
```

Observed generated ids:

```text
login.textButton.8910a7
login.textButton.2cb9d7
```
