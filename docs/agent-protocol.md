# Agent Protocol / Agent 接入协议

This document explains how any Agent can use Agent AST Project indexes and runtime tools to operate a first-party frontend app.

本文说明任意 Agent 如何使用 Agent AST Project 生成的索引和运行时工具来操作自有前端应用。

## Core Idea / 核心思想

The Agent should not directly execute arbitrary JavaScript and should not guess UI targets from screenshots when a source-aware index is available.

Agent 不应该直接执行任意 JS，也不应该在已有源码索引时仍然靠截图猜按钮。

The intended loop is:

```text
User goal
  -> load/search action-index
  -> inspect element-index when needed
  -> observe current page
  -> execute one declared step
  -> observe again
  -> continue until done or return a structured failure
```

中文：

```text
用户目标
  -> 加载/检索 action-index
  -> 必要时查看 element-index
  -> observe 当前页面
  -> 执行一个声明式 step
  -> 再 observe
  -> 继续直到完成，或返回结构化失败
```

## Runtime Contract / 运行时契约

The page should expose or import these runtime SDK functions:

页面需要暴露或接入这些 runtime-sdk 函数：

```ts
observePage(): PageObservation
clickElement(elementId: string): ToolResult
fillElement(elementId: string, value: string): ToolResult
waitForElement(elementId: string, timeoutMs?: number): Promise<ToolResult>
executeAction(action: RuntimeAction): Promise<ExecuteActionResult>
findActionById(actionIndex: ActionIndexFile, actionId: string)
searchActions(actionIndex: ActionIndexFile, query: string)
```

A host app can expose them globally if the Agent runs outside the app:

如果 Agent 在页面外部运行，宿主应用可以把它们挂到全局：

```ts
import {
  clickElement,
  executeAction,
  fillElement,
  observePage,
  searchActions,
  waitForElement,
} from '@agent-ast/runtime-sdk'
import actionIndex from './actions/action-index.json'

window.__AGENT_AST__ = {
  actionIndex,
  observePage,
  clickElement,
  fillElement,
  waitForElement,
  executeAction,
  searchActions: (query: string) => searchActions(actionIndex, query),
}
```

Then an external browser Agent can call:

外部浏览器 Agent 可以调用：

```js
window.__AGENT_AST__.observePage()
await window.__AGENT_AST__.executeAction(action)
```

## Index Files / 索引文件

### element-index.json

`element-index.json` is the UI map. It tells the Agent which stable anchors exist.

`element-index.json` 是 UI 地图，告诉 Agent 当前应用有哪些稳定锚点。

```json
{
  "version": 1,
  "generatedAt": "2026-06-30T00:00:00.000Z",
  "elements": [
    {
      "elementId": "knowledge.personal.createButton",
      "route": "/knowledge",
      "type": "button",
      "text": "新增知识库",
      "semantic": "创建个人知识库",
      "source": {
        "file": "src/pages/knowledge/index.tsx",
        "line": 128,
        "column": 6,
        "component": "KnowledgePage"
      }
    }
  ]
}
```

### action-index.json

`action-index.json` is the executable action catalog. It tells the Agent what flows are already known.

`action-index.json` 是可执行动作目录，告诉 Agent 哪些流程已经被声明。

```json
{
  "version": 1,
  "generatedAt": "2026-06-30T00:00:00.000Z",
  "actions": [
    {
      "actionId": "knowledge.personal.create",
      "name": "创建个人知识库",
      "route": "/knowledge",
      "goalExamples": [
        "创建个人知识库",
        "新建一个知识库",
        "帮我建一个合同资料库"
      ],
      "steps": [
        { "type": "observe" },
        { "type": "click", "elementId": "knowledge.personal.createButton" },
        { "type": "waitForElement", "elementId": "knowledge.createModal.nameInput", "timeoutMs": 1000 },
        { "type": "fill", "elementId": "knowledge.createModal.nameInput", "value": "合同资料库" },
        { "type": "click", "elementId": "knowledge.createModal.confirmButton" }
      ]
    }
  ]
}
```

## Agent Decision Procedure / Agent 决策流程

### 1. Read the user goal / 读取用户目标

Example:

```text
帮我创建一个合同资料库
```

The Agent should treat this as a goal, not as a JavaScript instruction.

Agent 应把它当成目标，而不是 JS 指令。

### 2. Search candidate actions / 检索候选 action

Use `searchActions(actionIndex, userGoal)` or equivalent retrieval.

使用 `searchActions(actionIndex, userGoal)` 或等价检索方法。

```ts
const candidates = searchActions(actionIndex, '帮我创建一个合同资料库')
```

If there is one high-confidence candidate, select it. If there are several candidates with similar names or routes, ask for clarification.

如果只有一个高置信候选，直接选择。若多个候选相似，应该反问用户。

### 3. Observe the current page / 观察当前页面

Before acting, call:

执行前先调用：

```ts
const state = observePage()
```

The observation tells the Agent:

观察结果会告诉 Agent：

- current route / 当前路由
- visible indexed elements / 当前可见索引元素
- disabled state / 禁用状态
- dialogs / 当前弹窗上下文
- loading and error text / 加载和错误信息

### 4. Execute declared action steps / 执行声明式步骤

The simplest integration is:

最简单的接入方式：

```ts
const result = await executeAction(selectedAction)
```

`executeAction` already executes one step at a time and observes after each step.

`executeAction` 已经按步骤逐个执行，并在每步之后观察页面。

### 5. Report success or failure / 汇报成功或失败

If `result.ok === true`, summarize the completed action.

如果 `result.ok === true`，汇报动作完成。

If `result.ok === false`, inspect the last failed step:

如果 `result.ok === false`，检查最后失败的步骤：

```ts
const failedStep = result.steps.at(-1)
```

Use the structured error code to decide the next move.

根据结构化错误码决定下一步。

## Tool Result Protocol / 工具结果协议

All normal operation failures should be structured. They should not be treated as uncaught exceptions.

所有正常操作失败都应该结构化返回，不应该作为未捕获异常处理。

```ts
type ToolResult =
  | { ok: true; elementId?: string }
  | { ok: false; code: ToolErrorCode; elementId?: string; message: string }
```

Known error codes:

```text
ELEMENT_NOT_FOUND
ELEMENT_HIDDEN
ELEMENT_DISABLED
UNSUPPORTED_ELEMENT_TYPE
TIMEOUT
```

中文含义：

```text
ELEMENT_NOT_FOUND        找不到元素
ELEMENT_HIDDEN           元素存在但不可见
ELEMENT_DISABLED         元素不可用
UNSUPPORTED_ELEMENT_TYPE 工具和元素类型不匹配
TIMEOUT                  等待超时
```

## Recovery Rules / 失败恢复规则

Recommended baseline behavior:

推荐基础行为：

| Error | Agent behavior |
| --- | --- |
| `ELEMENT_NOT_FOUND` | Check whether the action route differs from current route. If navigation is supported, navigate first. Otherwise report missing target. |
| `ELEMENT_HIDDEN` | Observe dialogs/tabs/loading state. The Agent may need to click a tab or wait. |
| `ELEMENT_DISABLED` | Do not force click. Explain the blocking condition or ask for missing input. |
| `UNSUPPORTED_ELEMENT_TYPE` | This is likely an action-index bug. Report it as a build/config issue. |
| `TIMEOUT` | Re-observe page, report what is currently visible, and ask whether to retry. |

中文：

| 错误 | Agent 行为 |
| --- | --- |
| `ELEMENT_NOT_FOUND` | 检查 action route 是否和当前 route 不同；如果支持导航，先导航；否则报告目标缺失。 |
| `ELEMENT_HIDDEN` | 观察弹窗、tab、loading 状态；可能需要点 tab 或等待。 |
| `ELEMENT_DISABLED` | 不要强点；说明阻塞条件或询问缺失输入。 |
| `UNSUPPORTED_ELEMENT_TYPE` | 通常是 action-index 配置错误，应作为构建/配置问题报告。 |
| `TIMEOUT` | 重新 observe，报告当前可见内容，并询问是否重试。 |

## Minimal Agent Loop / 最小 Agent 循环

```ts
async function runUserGoal(userGoal: string) {
  const candidates = searchActions(actionIndex, userGoal)
  if (candidates.length === 0) {
    return {
      ok: false,
      reason: 'NO_ACTION_FOUND',
      message: `No action matched goal: ${userGoal}`,
    }
  }

  if (candidates.length > 1) {
    return {
      ok: false,
      reason: 'NEEDS_CLARIFICATION',
      candidates: candidates.map((action) => ({
        actionId: action.actionId,
        name: action.name,
        route: action.route,
      })),
    }
  }

  const before = observePage()
  const result = await executeAction(candidates[0])
  const after = observePage()

  return {
    ok: result.ok,
    actionId: candidates[0].actionId,
    before,
    result,
    after,
  }
}
```

## What Agents Should Not Do / Agent 不应该做什么

Do not:

- execute arbitrary generated JavaScript in the page
- bypass `runtime-sdk` and mutate random DOM directly
- click by raw text when a `data-ai-id` exists
- ignore `disabled`, `hidden`, or `timeout` results
- run long multi-step flows without observing between steps
- invent element ids that are not present in `element-index`

不要：

- 在页面里执行任意生成的 JS
- 绕过 `runtime-sdk` 随意改 DOM
- 已有 `data-ai-id` 时仍按裸文本点击
- 忽略 `disabled`、`hidden`、`timeout` 等结果
- 不观察页面就盲跑长链路
- 编造 `element-index` 中不存在的 elementId

## How To Expose This To Any Agent / 如何让任意 Agent 接入

There are three common integration modes.

常见有三种接入方式。

### 1. In-app Agent / 应用内 Agent

The Agent UI lives inside the frontend app and imports `runtime-sdk` directly.

Agent UI 位于前端应用内部，直接 import `runtime-sdk`。

Best for:

- embedded assistant panels
- internal admin tools
- controlled enterprise apps

### 2. Browser Automation Agent / 浏览器自动化 Agent

The app exposes `window.__AGENT_AST__`, and an external browser Agent calls it through the page context.

应用暴露 `window.__AGENT_AST__`，外部浏览器 Agent 通过 page context 调用。

Best for:

- Playwright-like agents
- browser extensions
- desktop automation shells

### 3. Remote Planner + Local Executor / 远程规划器 + 本地执行器

A remote LLM planner receives only index summaries and tool schemas. The browser-side executor performs the real DOM actions.

远程 LLM planner 只接收索引摘要和工具 schema；浏览器本地 executor 执行真实 DOM 操作。

Best for:

- production systems
- audited operation logs
- enterprise security boundaries

## Prompt Contract For A Generic Agent / 通用 Agent 提示词契约

When giving this system to a generic Agent, include this instruction:

给通用 Agent 接入时，可以加入这段约束：

```text
You operate a first-party web app through Agent AST indexes and runtime tools.
Never generate or execute arbitrary JavaScript.
Use action-index to select known actions.
Use element-index to inspect stable UI anchors.
Before every action, observe the current page.
Execute only controlled tools: observePage, clickElement, fillElement, waitForElement, executeAction.
After every step, inspect the structured result and page observation.
If a required element id is missing, hidden, disabled, timed out, or incompatible, stop and report the structured error.
Do not invent element ids.
Do not click by visual guess when a data-ai-id target exists.
```

中文版本：

```text
你通过 Agent AST 索引和 runtime tools 操作一个自有 Web 应用。
不要生成或执行任意 JavaScript。
使用 action-index 选择已知动作。
使用 element-index 查看稳定 UI 锚点。
每次执行前先 observe 当前页面。
只能调用受控工具：observePage、clickElement、fillElement、waitForElement、executeAction。
每一步后检查结构化结果和页面观察。
如果目标 elementId 缺失、隐藏、禁用、超时或类型不匹配，停止并报告结构化错误。
不要编造 elementId。
当存在 data-ai-id 目标时，不要靠视觉猜测点击。
```

## Current Limitation / 当前限制

The current MVP does not yet include a full natural-language planner. It provides the substrate that any planner or Agent can use safely:

当前 MVP 还没有完整自然语言 planner。它提供的是任意 planner 或 Agent 可以安全使用的底座：

```text
stable anchors + indexes + controlled runtime tools + build-time validation
```

Next layer:

下一层要做的是：

```text
user goal -> action retrieval/ranking -> executeAction -> recovery/reporting
```
