# Agent AST Project

Agent AST Project is a white-box UI automation toolkit for first-party frontend apps.

It uses source AST at build time to create stable runtime anchors (`data-ai-id`) and index files (`element-index.json`, `action-index.json`). A page runtime SDK then observes and operates the current DOM through controlled tools such as `clickElement`, `fillElement`, `waitForElement`, and `executeAction`.

The goal is simple:

> Give an Agent an executable map of your own app so it can operate UI by source-aware semantic anchors instead of guessing from screenshots or brittle DOM selectors.

## Why This Exists

Traditional UI Agents often depend on vision, text matching, or runtime DOM heuristics. That breaks when:

- many buttons have the same text, such as `确认`
- CSS class names are hashed or unstable
- a modal/dropdown is rendered through a portal
- the Agent cannot know which business action a button represents
- a long flow fails halfway and the system has no source-level context

This project treats your own frontend differently. Since you control the source and build pipeline, the build step can inject stable identifiers and produce indexes that runtime tools can trust.

## Current MVP

The current implementation proves the full loop:

```text
TSX source
  -> ast-plugin scans JSX/TSX
  -> ast-plugin injects data-ai-id
  -> generated/element-index.json
  -> generated/action-index.json
  -> runtime-sdk observe/click/fill/wait
  -> executeAction runs declarative steps
  -> demo creates a knowledge base item in the browser
```

It also validates action indexes at build time. If an action references a missing element id or uses `fill` on a button, the build fails before an Agent can run a broken flow.

## Packages

```text
packages/
  ast-plugin/       Build-time AST scanner, injector, index emitter, validator
  runtime-sdk/      Browser runtime tools and declarative action executor
  demo-app/         Minimal React/Vite app proving the loop end to end
scripts/
  verify-external-project.mjs  Sidecar verification for real Vite projects
```

## Install

```bash
pnpm install
```

## Run The Demo

```bash
pnpm demo:dev
```

Open:

```text
http://127.0.0.1:5173
```

Click `Run Runtime Flow`.

Expected page result:

```text
合同资料库
```

Expected runtime log:

```text
创建个人知识库: ok
1. observe: ok (... visible)
2. click: ok (... visible)
3. wait: ok (... visible)
4. fill: ok (... visible)
5. click: ok (... visible)
```

## Verify

```bash
pnpm test
pnpm check
pnpm build
```

What this verifies:

- `ast-plugin` can generate stable ids, scan source, inject `data-ai-id`, and validate action indexes
- `runtime-sdk` can observe DOM state, click, fill React controlled inputs, wait for elements, and execute declarative actions
- `demo-app` builds with the plugin and generates indexes

## Generated Files

A build emits local generated indexes:

```text
generated/element-index.json
generated/action-index.json
```

`element-index.json` contains build-time discovered UI elements:

```json
{
  "elementId": "knowledge.personal.createButton",
  "route": "/knowledge",
  "type": "button",
  "text": "新增知识库",
  "source": {
    "file": "packages/demo-app/src/pages/KnowledgePage.tsx",
    "line": 41,
    "column": 8,
    "component": "KnowledgePage"
  }
}
```

`action-index.json` contains executable action plans:

```json
{
  "actionId": "knowledge.personal.create",
  "name": "创建个人知识库",
  "route": "/knowledge",
  "steps": [
    { "type": "observe" },
    { "type": "click", "elementId": "knowledge.personal.createButton" },
    { "type": "waitForElement", "elementId": "knowledge.createModal.nameInput", "timeoutMs": 1000 },
    { "type": "fill", "elementId": "knowledge.createModal.nameInput", "value": "合同资料库" },
    { "type": "click", "elementId": "knowledge.createModal.confirmButton" }
  ]
}
```

Generated files are ignored by git because they are local build artifacts.

## Build-Time Plugin

The Vite plugin is exported from `@agent-ast/ast-plugin`:

```ts
import { viteAgentAstPlugin } from '@agent-ast/ast-plugin'

export default {
  plugins: [
    viteAgentAstPlugin({
      root: process.cwd(),
      routeByFile: {
        'src/pages/KnowledgePage.tsx': '/knowledge',
      },
      actionIndex,
    }),
    react(),
  ],
}
```

Important options:

```ts
type AgentAstPluginOptions = {
  root?: string
  include?: RegExp
  routeByFile?: Record<string, string>
  outputFile?: string
  actionIndex?: { version?: 1; generatedAt?: string; actions: unknown[] }
  actionOutputFile?: string
  inject?: boolean
  emitIndex?: boolean
}
```

The plugin currently supports JSX/TSX. It recognizes common native and Ant Design-style elements:

- `button`
- `input`
- `textarea`
- `select`
- `Button`
- `Input`
- `Input.TextArea`
- `Select`
- `Tabs`
- `Upload`

## Runtime SDK

The runtime SDK is exported from `@agent-ast/runtime-sdk`.

Core APIs:

```ts
observePage()
clickElement(elementId)
fillElement(elementId, value)
waitForElement(elementId, timeoutMs)
executeAction(action)
findActionById(actionIndex, actionId)
searchActions(actionIndex, query)
```

Example:

```ts
const result = await executeAction({
  actionId: 'knowledge.personal.create',
  name: '创建个人知识库',
  steps: [
    { type: 'click', elementId: 'knowledge.personal.createButton' },
    { type: 'waitForElement', elementId: 'knowledge.createModal.nameInput', timeoutMs: 1000 },
    { type: 'fill', elementId: 'knowledge.createModal.nameInput', value: '合同资料库' },
    { type: 'click', elementId: 'knowledge.createModal.confirmButton' },
  ],
})
```

Every step returns a structured result and an observation after execution.

Tool errors are structured:

```text
ELEMENT_NOT_FOUND
ELEMENT_HIDDEN
ELEMENT_DISABLED
UNSUPPORTED_ELEMENT_TYPE
TIMEOUT
```

## Build-Time Validation

`ast-plugin` validates `action-index` against `element-index` during build.

It catches:

- duplicate `elementId`
- duplicate `actionId`
- unknown `elementId` referenced by an action step
- incompatible step target, such as `fill` on a button
- route mismatch between action route and element route

Example failure:

```text
[agent-ast-plugin] action-index validation failed:
UNKNOWN_ELEMENT_ID actionId=knowledge.personal.create stepIndex=2 elementId=knowledge.createModal.missingInput
```

## Verify Against A Real External Project

The repository includes a sidecar verifier that can test the plugin against another Vite project without editing that project's main Vite config.

First build this project:

```bash
pnpm build
```

Then run:

```bash
pnpm verify:external -- \
  --project /absolute/path/to/vite-project \
  --include src/pages/login/index.tsx \
  --mode development
```

This creates a temporary Vite config under the external project, runs a real `vite build`, and writes:

```text
<external-project>/agent-ast-generated/element-index.json
```

This has been verified against:

```text
/Users/shenjie/cursorIDE/xinqiao/copilot-web-app
```

With:

```bash
pnpm verify:external -- \
  --project /Users/shenjie/cursorIDE/xinqiao/copilot-web-app \
  --include src/pages/login/index.tsx \
  --mode development
```

Observed result:

```json
{
  "elementCount": 2,
  "sampleElementIds": [
    "login.textButton.8910a7",
    "login.textButton.2cb9d7"
  ]
}
```

The external build output also contained real injected `data-ai-id` attributes.

## Production Philosophy

This project does not argue for exposing raw source locations in production.

A safer production split is:

```text
Production DOM:
  data-ai-id="knowledge.personal.createButton"

Production/runtime-safe index:
  elementId, route, type, semantic text

Internal/debug index:
  source file, line, column, component, handler
```

The stable `data-ai-id` is the Agent operation protocol. Source paths and line numbers are useful for internal debugging and should be controlled by build mode or deployment policy.

## Roadmap

Near-term:

- support route/hash navigation steps
- support external project validation over multiple include patterns
- report low-quality generated ids, such as many `textButton.*` entries
- add production/internal/dev index modes
- add a minimal assistant UI that searches `action-index` from a user goal and calls `executeAction`

Later:

- richer AST extraction for Ant Design forms, tables, menus, tabs, uploads, and modals
- action draft generation from element clusters
- runtime region tools such as `clickByTextInRegion`
- execution replay logs and failure-to-source debugging
- optional LLM planner layered above the safe runtime tools

## Status

This is an MVP. It is already useful for proving first-party app automation with stable source-aware anchors, but it is not yet a complete general UI Agent framework.
