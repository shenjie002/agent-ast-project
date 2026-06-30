import { observePage } from './observe';
import { clickElement, fillElement, waitForElement } from './tools';
import type { PageObservation, ToolResult } from './types';

export type ActionStep =
  | { type: 'observe' }
  | { type: 'click'; elementId: string }
  | { type: 'fill'; elementId: string; value: string }
  | { type: 'waitForElement'; elementId: string; timeoutMs?: number };

export interface RuntimeAction {
  actionId: string;
  name: string;
  steps: ActionStep[];
}

export interface ExecutedActionStep {
  step: ActionStep;
  result: ToolResult;
  observation: PageObservation;
}

export interface ExecuteActionResult {
  ok: boolean;
  actionId: string;
  name: string;
  steps: ExecutedActionStep[];
}

export async function executeAction(
  action: RuntimeAction,
  root: ParentNode = document,
): Promise<ExecuteActionResult> {
  const executedSteps: ExecutedActionStep[] = [];

  for (const step of action.steps) {
    const result = await executeStep(step, root);
    const observation = observePage(root);
    executedSteps.push({ step, result, observation });

    if (!result.ok) {
      return {
        ok: false,
        actionId: action.actionId,
        name: action.name,
        steps: executedSteps,
      };
    }
  }

  return {
    ok: true,
    actionId: action.actionId,
    name: action.name,
    steps: executedSteps,
  };
}

export async function executeStep(step: ActionStep, root: ParentNode = document): Promise<ToolResult> {
  switch (step.type) {
    case 'observe':
      observePage(root);
      return { ok: true };
    case 'click':
      return clickElement(step.elementId, root);
    case 'fill':
      return fillElement(step.elementId, step.value, root);
    case 'waitForElement':
      return waitForElement(step.elementId, step.timeoutMs, root);
    default:
      return assertNever(step);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unsupported action step: ${JSON.stringify(value)}`);
}
