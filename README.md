# Agent AST Project

中文 | [English](#english)

Agent AST Project 是一个面向自有前端应用的白盒 UI Agent 自动化工具包。它在构建期读取源码 AST，为可操作 UI 元素注入稳定的 `data-ai-id`，同时生成 `element-index.json` 和 `action-index.json`。页面运行时再通过 `runtime-sdk` 的受控工具观察和操作当前 DOM，例如 `observePage`、`clickElement`、`fillElement`、`waitForElement` 和 `executeAction`。

一句话：

> 给 Agent 一张由源码生成的可执行地图，让它用稳定的业务语义锚点操作你的应用，而不是靠截图猜测或脆弱的 DOM 选择器。

## 为什么需要它

传统 UI Agent 经常依赖视觉识别、文本匹配或运行时 DOM 猜测，容易在这些场景失效：

- 页面上有很多同名按钮，例如 `确认`
- CSS class 被 hash，DOM 结构经常变化
- Modal、Dropdown 通过 portal 挂到 `body`
- Agent 不知道某个按钮对应哪个业务动作
- 长链路执行到一半失败时，没有源码级上下文可追踪

如果目标是我们自己的前端项目，情况就不一样了。我们能控制源码、路由、组件和构建链路，所以可以在构建期生成稳定的语义锚点和索引，让运行时工具可信地执行动作。

## 当前 MVP

当前项目已经跑通完整闭环：

```text
TSX 源码
  -> ast-plugin 扫描 JSX/TSX
  -> ast-plugin 注入 data-ai-id
  -> generated/element-index.json
  -> generated/action-index.json
  -> runtime-sdk observe/click/fill/wait
  -> executeAction 执行声明式步骤
  -> demo 在浏览器里真实创建知识库条目
```

它还支持构建期校验。如果 action 引用了不存在的 `elementId`，或者对按钮执行 `fill`，构建会在 Agent 运行前直接失败。

## 包结构

```text
packages/
  ast-plugin/       构建期 AST 扫描、注入、索引生成、action 校验
  runtime-sdk/      浏览器运行时观察、DOM 工具、声明式 action 执行器
  demo-app/         最小 React/Vite 演示应用，验证端到端闭环
scripts/
  verify-external-project.mjs  针对真实 Vite 项目的旁路验证脚本
```

## 安装

```bash
pnpm install
```

## 运行 Demo

```bash
pnpm demo:dev
```

打开：

```text
http://127.0.0.1:5173
```

点击 `Run Runtime Flow`。

预期页面出现：

```text
合同资料库
```

预期日志类似：

```text
创建个人知识库: ok
1. observe: ok (... visible)
2. click: ok (... visible)
3. wait: ok (... visible)
4. fill: ok (... visible)
5. click: ok (... visible)
```

## 验证

```bash
pnpm test
pnpm check
pnpm build
```

这些命令会验证：

- `ast-plugin` 能生成稳定 id、扫描源码、注入 `data-ai-id`、校验 action-index
- `runtime-sdk` 能观察 DOM、点击、填写 React 受控输入、等待元素、执行声明式 action
- `demo-app` 能通过插件构建并生成索引

## 生成文件

构建会生成本地索引：

```text
generated/element-index.json
generated/action-index.json
```

`element-index.json` 记录构建期发现的 UI 元素：

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

`action-index.json` 记录可执行动作：

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

这些生成文件是本地构建产物，默认不提交到 git。

## 构建期插件

Vite 插件由 `@agent-ast/ast-plugin` 导出：

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

主要选项：

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

当前支持 JSX/TSX，并识别常见原生元素和 Ant Design 风格组件：

```text
button, input, textarea, select,
Button, Input, Input.TextArea, Select, Tabs, Upload
```

## Runtime SDK

`runtime-sdk` 由 `@agent-ast/runtime-sdk` 导出。

核心 API：

```ts
observePage()
clickElement(elementId)
fillElement(elementId, value)
waitForElement(elementId, timeoutMs)
executeAction(action)
findActionById(actionIndex, actionId)
searchActions(actionIndex, query)
```

示例：

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

每一步都会返回结构化结果，并在执行后附带一次页面观察。

常见错误码：

```text
ELEMENT_NOT_FOUND
ELEMENT_HIDDEN
ELEMENT_DISABLED
UNSUPPORTED_ELEMENT_TYPE
TIMEOUT
```

## 构建期校验

`ast-plugin` 会在构建期用 `element-index` 校验 `action-index`。

可捕获：

- 重复的 `elementId`
- 重复的 `actionId`
- action step 引用了不存在的 `elementId`
- action step 类型和目标元素不匹配，例如对 button 执行 `fill`
- action route 和 element route 不一致

示例错误：

```text
[agent-ast-plugin] action-index validation failed:
UNKNOWN_ELEMENT_ID actionId=knowledge.personal.create stepIndex=2 elementId=knowledge.createModal.missingInput
```

## 在真实外部项目中验证

仓库提供了旁路验证脚本，可以在不修改外部项目主 `vite.config.ts` 的情况下测试插件。

先构建本项目：

```bash
pnpm build
```

然后执行：

```bash
pnpm verify:external -- \
  --project /absolute/path/to/vite-project \
  --include src/pages/login/index.tsx \
  --mode development
```

脚本会在外部项目下创建临时 Vite config，运行真实 `vite build`，并写入：

```text
<external-project>/agent-ast-generated/element-index.json
```

已经验证过的真实项目：

```text
/Users/shenjie/cursorIDE/xinqiao/copilot-web-app
```

命令：

```bash
pnpm verify:external -- \
  --project /Users/shenjie/cursorIDE/xinqiao/copilot-web-app \
  --include src/pages/login/index.tsx \
  --mode development
```

结果：

```json
{
  "elementCount": 2,
  "sampleElementIds": [
    "login.textButton.8910a7",
    "login.textButton.2cb9d7"
  ]
}
```

真实外部项目的构建产物中也确认包含注入后的 `data-ai-id`。

## 生产环境理念

这个项目并不是主张把原始源码位置全部暴露到生产环境。

更合理的拆分是：

```text
生产 DOM:
  data-ai-id="knowledge.personal.createButton"

生产 / runtime-safe index:
  elementId, route, type, semantic text

内部 / debug index:
  source file, line, column, component, handler
```

稳定的 `data-ai-id` 是 Agent 的操作协议；源码路径和行列号适合内部调试，后续应该通过构建模式或部署策略控制。

## 路线图

近期：

- 支持 route/hash navigate step
- 外部项目验证支持多个 include pattern
- 报告低质量自动生成 id，例如大量 `textButton.*`
- 增加 production/internal/dev 索引模式
- 增加最小 assistant UI：从用户目标检索 `action-index` 并调用 `executeAction`

后续：

- 更丰富的 Ant Design Form、Table、Menu、Tabs、Upload、Modal AST 抽取
- 基于元素簇生成 action 草稿
- 支持 `clickByTextInRegion` 等区域工具
- 执行回放日志和失败到源码的调试链路
- 在安全 runtime tools 之上接入可选 LLM planner

## 当前状态

这是一个 MVP。它已经可以证明“自有前端应用 + 源码语义锚点 + 运行时受控工具”这条路线可行，但还不是完整通用 UI Agent 框架。

---

<a id="english"></a>

# Agent AST Project

Agent AST Project is a white-box UI automation toolkit for first-party frontend applications.

It reads source AST at build time, injects stable `data-ai-id` anchors into actionable UI elements, and emits `element-index.json` plus `action-index.json`. At runtime, `runtime-sdk` observes and operates the current DOM through controlled tools such as `observePage`, `clickElement`, `fillElement`, `waitForElement`, and `executeAction`.

In one sentence:

> Give an Agent an executable map generated from your own source code, so it can operate UI through stable semantic anchors instead of guessing from screenshots or brittle DOM selectors.

## Why It Exists

Traditional UI Agents often depend on vision, text matching, or runtime DOM heuristics. These approaches break when:

- many buttons share the same text, such as `确认`
- CSS classes are hashed or unstable
- modals and dropdowns are rendered through portals
- the Agent cannot know which business action a button represents
- a long flow fails halfway without source-level context

For first-party frontend apps, we control source code, routes, components, and the build pipeline. That means the build step can inject stable identifiers and produce indexes that runtime tools can trust.

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
  -> demo creates a knowledge-base item in the browser
```

It also validates action indexes at build time. If an action references a missing element id or tries to `fill` a button, the build fails before an Agent can run a broken flow.

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

These commands verify that:

- `ast-plugin` can generate stable ids, scan source, inject `data-ai-id`, and validate action indexes
- `runtime-sdk` can observe DOM state, click, fill React controlled inputs, wait for elements, and execute declarative actions
- `demo-app` builds with the plugin and generates indexes

## Generated Files

A build emits local indexes:

```text
generated/element-index.json
generated/action-index.json
```

`element-index.json` contains build-time discovered UI elements.

`action-index.json` contains executable action plans.

Generated files are local build artifacts and are ignored by git.

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

The plugin currently supports JSX/TSX and recognizes common native and Ant Design-style elements:

```text
button, input, textarea, select,
Button, Input, Input.TextArea, Select, Tabs, Upload
```

## Runtime SDK

`runtime-sdk` is exported from `@agent-ast/runtime-sdk`.

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

Each action step returns a structured result and a page observation after execution.

Structured tool errors:

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
- incompatible step targets, such as `fill` on a button
- route mismatches between action route and element route

Example failure:

```text
[agent-ast-plugin] action-index validation failed:
UNKNOWN_ELEMENT_ID actionId=knowledge.personal.create stepIndex=2 elementId=knowledge.createModal.missingInput
```

## Verify Against A Real External Project

The repository includes a sidecar verifier that tests the plugin against another Vite project without editing that project's main Vite config.

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

The script creates a temporary Vite config under the external project, runs a real `vite build`, and writes:

```text
<external-project>/agent-ast-generated/element-index.json
```

It has been verified against:

```text
/Users/shenjie/cursorIDE/xinqiao/copilot-web-app
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

A safer split is:

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
- support multiple include patterns for external project verification
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
