# Agent AST MVP Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Build a small, verifiable MVP that injects stable `data-ai-id` attributes into a demo React/Vite app, emits element and route indexes, and exposes runtime tools that can observe and operate those elements.

**Architecture:** Start with a local monorepo-style TypeScript workspace under this project. The first slice should prove the white-box contract end to end: source JSX/TSX -> compile plugin -> generated indexes -> runtime SDK -> demo page operation. Planner/LLM behavior stays stubbed until the tool contract is reliable.

**Tech Stack:** TypeScript, Vite, React, Babel parser/traverse/generator, Vitest, pnpm or npm scripts.

---

## Core Decision

Implement this as an MVP framework first, not as a full UI agent.

The first useful milestone is not natural-language planning. It is proving that a source component can be indexed, annotated in the DOM, observed at runtime, and clicked/filled through a controlled tool API with structured errors.

## Proposed Package Shape

```text
agentAstProject/
  docs/
    plans/
      2026-06-30-agent-ast-mvp.md
  packages/
    ast-plugin/
      src/
        index.ts
        scan.ts
        inject.ts
        id.ts
        types.ts
      tests/
        scan.test.ts
        inject.test.ts
    runtime-sdk/
      src/
        index.ts
        observe.ts
        tools.ts
        types.ts
      tests/
        observe.test.ts
        tools.test.ts
    demo-app/
      src/
        main.tsx
        App.tsx
        pages/KnowledgePage.tsx
      vite.config.ts
  generated/
    element-index.json
    route-index.json
```

Keep `assistant-ui` and `planner-server` out of the first implementation slice. They depend on the lower contract being stable.

## MVP Acceptance Criteria

1. Running the demo build injects `data-ai-id` onto recognized interactive elements.
2. The plugin emits `generated/element-index.json` with element id, route, type, text, handler, and source location.
3. The runtime SDK `observePage()` returns only visible indexed elements plus route/title/loading/errors.
4. `clickElement(elementId)` and `fillElement(elementId, value)` operate through `data-ai-id` and return structured success/error objects.
5. A demo page can complete a hardcoded flow: open create modal, fill knowledge name, confirm.
6. Tests cover id generation, JSX injection, index emission shape, observe filtering, and not-found/disabled tool errors.

## Task 1: Create Workspace Skeleton

**Objective:** Add a minimal TypeScript workspace layout without implementing behavior yet.

**Files:**
- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `packages/ast-plugin/package.json`
- Create: `packages/runtime-sdk/package.json`
- Create: `packages/demo-app/package.json`
- Create: `packages/demo-app/vite.config.ts`

**Steps:**
1. Add root scripts:
   - `test`: run package tests.
   - `build`: build plugin, runtime SDK, then demo app.
   - `demo:dev`: start the demo app.
2. Use local workspace references if pnpm is available. If not, npm workspaces are fine.
3. Add TypeScript and Vitest dev dependencies.
4. Verify with `npm install` or `pnpm install`, then `npm run test` or `pnpm test`.

**Expected Verification:** Test command runs and reports no tests or empty pass state without TypeScript config errors.

## Task 2: Define Shared Index Types

**Objective:** Lock down the index and runtime tool contracts before code generation begins.

**Files:**
- Create: `packages/ast-plugin/src/types.ts`
- Create: `packages/runtime-sdk/src/types.ts`

**Types To Include:**
```ts
export type ElementKind =
  | 'button'
  | 'input'
  | 'textarea'
  | 'select'
  | 'tab'
  | 'upload'
  | 'menu-item'
  | 'region';

export interface ElementIndexEntry {
  elementId: string;
  route: string;
  type: ElementKind;
  text: string;
  semantic?: string;
  nearbyText?: string;
  handler?: string;
  source: {
    file: string;
    line: number;
    column: number;
    component?: string;
  };
}

export interface ElementIndexFile {
  version: 1;
  generatedAt: string;
  elements: ElementIndexEntry[];
}
```

**Verification:** Add a tiny type-only test or build check to ensure both packages compile.

## Task 3: Implement Deterministic Element ID Generation

**Objective:** Generate stable, readable ids from route, element kind, text, and handler name.

**Files:**
- Create: `packages/ast-plugin/src/id.ts`
- Create: `packages/ast-plugin/tests/id.test.ts`

**Rules:**
1. Prefer explicit override if an element already has `data-ai-id`.
2. Otherwise generate from normalized route and semantic clues.
3. Use handler name for action suffix when available, such as `handleCreateKnowledge` -> `createKnowledgeButton`.
4. Fall back to text, such as `新增知识库` -> `xin-zeng-zhi-shi-ku` only if a transliteration helper is already added. For MVP, a stable hash suffix is acceptable for Chinese text.
5. Include a short hash of source file + JSX start position to avoid collisions.

**Verification:** Tests prove ids are stable across formatting changes that do not move the JSX node identity within the file content too much. Avoid line-only ids.

## Task 4: Scan JSX Interactive Elements

**Objective:** Parse TSX/JSX source and extract candidate interactive elements without modifying code.

**Files:**
- Create: `packages/ast-plugin/src/scan.ts`
- Create: `packages/ast-plugin/tests/scan.test.ts`

**Recognized MVP Elements:**
- Native: `button`, `input`, `textarea`, `select`, `a` with click handler.
- Ant Design-style: `Button`, `Input`, `Input.TextArea`, `Select`, `Tabs`, `Upload`.

**Fields To Extract:**
- element type
- visible text from direct JSX text and simple string children
- `onClick` / `onChange` / submit handler names
- source file, line, column
- component function name when easily available

**Verification:** Feed a fixture with a knowledge page and assert 4-6 expected entries are found.

## Task 5: Inject `data-ai-id` Into JSX

**Objective:** Transform TSX/JSX source by adding `data-ai-id` to scanned elements.

**Files:**
- Create: `packages/ast-plugin/src/inject.ts`
- Create: `packages/ast-plugin/tests/inject.test.ts`

**Rules:**
1. Preserve existing `data-ai-id` values.
2. Do not inject duplicate attributes.
3. Only inject recognized interactive elements.
4. For custom components, inject prop name `data-ai-id`; React passes it through only if the component forwards props, so demo components must support this.

**Verification:** Snapshot or string tests confirm transformed JSX contains expected attributes and untouched elements stay untouched.

## Task 6: Build Vite Plugin Wrapper

**Objective:** Expose the scanner/injector as a Vite plugin and emit `element-index.json`.

**Files:**
- Create: `packages/ast-plugin/src/index.ts`
- Modify: `packages/demo-app/vite.config.ts`

**Behavior:**
1. Transform only `.tsx` and `.jsx` files under demo `src`.
2. Collect entries during transform.
3. Emit `generated/element-index.json` on build.
4. Clear stale entries between builds.

**Verification:** Run demo build and inspect generated JSON. It should include the demo page button/input entries.

## Task 7: Create Demo Knowledge Page

**Objective:** Add a small realistic page to prove the MVP flow.

**Files:**
- Create: `packages/demo-app/src/main.tsx`
- Create: `packages/demo-app/src/App.tsx`
- Create: `packages/demo-app/src/pages/KnowledgePage.tsx`

**Demo Behavior:**
1. Page route/state says `/knowledge`.
2. A button opens a create modal.
3. Modal has a name input and confirm button.
4. Confirm adds the knowledge name to a list and closes the modal.

**Verification:** Build output contains injected data attributes. Running the demo page shows the flow works manually.

## Task 8: Implement Runtime Observe

**Objective:** Return current route and visible indexed elements from DOM.

**Files:**
- Create: `packages/runtime-sdk/src/observe.ts`
- Create: `packages/runtime-sdk/tests/observe.test.ts`

**Function:**
```ts
export function observePage(root: ParentNode = document): PageObservation
```

**Rules:**
1. Query `[data-ai-id]`.
2. Filter hidden elements using bounding box and computed style.
3. Detect disabled state from native `disabled`, `aria-disabled`, and common disabled class patterns.
4. Include current `location.pathname` and `document.title`.

**Verification:** jsdom tests cover visible, hidden, disabled, and duplicated ids.

## Task 9: Implement Runtime Tools

**Objective:** Add controlled operations with structured errors.

**Files:**
- Create: `packages/runtime-sdk/src/tools.ts`
- Create: `packages/runtime-sdk/tests/tools.test.ts`

**Tools:**
```ts
clickElement(elementId: string): ToolResult
fillElement(elementId: string, value: string): ToolResult
waitForElement(elementId: string, timeoutMs?: number): Promise<ToolResult>
```

**Error Codes:**
- `ELEMENT_NOT_FOUND`
- `ELEMENT_HIDDEN`
- `ELEMENT_DISABLED`
- `UNSUPPORTED_ELEMENT_TYPE`
- `TIMEOUT`

**Verification:** Tests assert each error code and at least one success path for click/fill.

## Task 10: Wire Demo Runtime Panel

**Objective:** Add a tiny debug panel to the demo app to call observe and a hardcoded flow.

**Files:**
- Modify: `packages/demo-app/src/App.tsx`
- Modify: `packages/demo-app/src/pages/KnowledgePage.tsx`

**Behavior:**
1. Show current observation JSON in a collapsible debug area.
2. Add a button named `Run Demo Flow`.
3. The button calls runtime tools:
   - click create button
   - fill modal name input with `合同资料库`
   - click confirm button
4. The list shows `合同资料库`.

**Verification:** Manual browser check plus automated test if Playwright is added. For MVP, Vitest DOM tests are enough unless the demo uses browser-only APIs.

## Task 11: Add Route Index Stub

**Objective:** Emit a simple route index for the demo app.

**Files:**
- Create or modify: `generated/route-index.json`
- Modify: `packages/ast-plugin/src/index.ts`

**MVP Rule:** Hardcode or configure route metadata in Vite plugin options first. Avoid implementing full route AST extraction in the first slice.

**Verification:** `route-index.json` includes `/knowledge`, display name `知识库`, and a component path.

## Task 12: Document MVP Usage

**Objective:** Update README with concrete commands once the MVP works.

**Files:**
- Modify: `README.md`

**Add:**
1. Install command.
2. Test command.
3. Build command.
4. Demo command.
5. Explanation of generated files.
6. Known MVP limits.

**Verification:** Follow README commands from a clean install and confirm they work.

## Implementation Order Recommendation

Do not start with LLM planning, assistant UI, or cross-page intelligence. Start in this order:

1. Static contracts and tests.
2. AST scan and injection.
3. Generated index files.
4. Demo app.
5. Runtime observe/tools.
6. Hardcoded demo flow.
7. Only then add planner/search behavior.

## Key Risks And Mitigations

**Custom component prop forwarding:** React custom components may swallow `data-ai-id`.
Mitigation: MVP demo uses native elements first, then adds adapter rules for Ant Design wrappers.

**Generated ids may drift:** Source-position hashes can move after edits.
Mitigation: prefer explicit `data-ai-id` or handler/text-based semantic ids, with source hash only as collision suffix.

**Portal elements:** Modals/dropdowns render under `document.body`, not page root.
Mitigation: runtime observe defaults to `document`, not a narrow container.

**Dynamic rows:** Table rows are data, not static source elements.
Mitigation: keep row operations as runtime region tools, such as `clickByTextInRegion`, after the base MVP passes.

**Planner overreach:** LLM may try to execute unsupported actions.
Mitigation: planner receives only tool schemas and current observation; execution validates every action.

## First Engineering Slice

The first commit should include only:

1. Workspace skeleton.
2. Shared types.
3. `generateElementId()` with tests.
4. One scan fixture test.

This gives a small proof that the repo can run tests and that the id contract is moving in the right direction before build plugins or UI enter the picture.
