import type { AgentAstActionIndex } from './plugin';
import type { ElementIndexEntry, ElementIndexFile, ElementKind } from './types';

export type ValidationError =
  | { code: 'DUPLICATE_ELEMENT_ID'; elementId: string }
  | { code: 'DUPLICATE_ACTION_ID'; actionId: string }
  | { code: 'UNKNOWN_ELEMENT_ID'; actionId: string; stepIndex: number; elementId: string }
  | {
      code: 'INCOMPATIBLE_STEP_TARGET';
      actionId: string;
      stepIndex: number;
      elementId: string;
      stepType: string;
      elementType: ElementKind;
    }
  | {
      code: 'ROUTE_MISMATCH';
      actionId: string;
      stepIndex: number;
      elementId: string;
      actionRoute: string;
      elementRoute: string;
    };

export interface ValidationResult {
  ok: boolean;
  errors: ValidationError[];
}

export interface ValidateActionIndexInput {
  actionIndex: AgentAstActionIndex;
  elementIndex: ElementIndexFile;
}

const clickableElementTypes = new Set<ElementKind>([
  'button',
  'tab',
  'upload',
  'menu-item',
]);

const fillableElementTypes = new Set<ElementKind>([
  'input',
  'textarea',
  'select',
]);

export function validateActionIndex(input: ValidateActionIndexInput): ValidationResult {
  const errors: ValidationError[] = [];
  const elementsById = new Map<string, ElementIndexEntry>();
  const seenElementIds = new Set<string>();

  for (const element of input.elementIndex.elements) {
    if (seenElementIds.has(element.elementId)) {
      errors.push({ code: 'DUPLICATE_ELEMENT_ID', elementId: element.elementId });
      continue;
    }

    seenElementIds.add(element.elementId);
    elementsById.set(element.elementId, element);
  }

  const seenActionIds = new Set<string>();
  for (const action of input.actionIndex.actions) {
    if (!isActionLike(action)) {
      continue;
    }

    if (seenActionIds.has(action.actionId)) {
      errors.push({ code: 'DUPLICATE_ACTION_ID', actionId: action.actionId });
    }
    seenActionIds.add(action.actionId);

    action.steps.forEach((step, stepIndex) => {
      if (!isElementStep(step)) {
        return;
      }

      const element = elementsById.get(step.elementId);
      if (!element) {
        errors.push({
          code: 'UNKNOWN_ELEMENT_ID',
          actionId: action.actionId,
          stepIndex,
          elementId: step.elementId,
        });
        return;
      }

      if (action.route && element.route !== action.route) {
        errors.push({
          code: 'ROUTE_MISMATCH',
          actionId: action.actionId,
          stepIndex,
          elementId: step.elementId,
          actionRoute: action.route,
          elementRoute: element.route,
        });
      }

      if (!isStepTargetCompatible(step.type, element.type)) {
        errors.push({
          code: 'INCOMPATIBLE_STEP_TARGET',
          actionId: action.actionId,
          stepIndex,
          elementId: step.elementId,
          stepType: step.type,
          elementType: element.type,
        });
      }
    });
  }

  return { ok: errors.length === 0, errors };
}

export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map(formatValidationError).join('\n');
}

function isStepTargetCompatible(stepType: string, elementType: ElementKind): boolean {
  if (stepType === 'click') {
    return clickableElementTypes.has(elementType);
  }

  if (stepType === 'fill') {
    return fillableElementTypes.has(elementType);
  }

  if (stepType === 'waitForElement') {
    return true;
  }

  return true;
}

function isActionLike(value: unknown): value is {
  actionId: string;
  route?: string;
  steps: unknown[];
} {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const action = value as { actionId?: unknown; steps?: unknown };
  return typeof action.actionId === 'string' && Array.isArray(action.steps);
}

function isElementStep(value: unknown): value is { type: string; elementId: string } {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const step = value as { type?: unknown; elementId?: unknown };
  return typeof step.type === 'string' && typeof step.elementId === 'string';
}

function formatValidationError(error: ValidationError): string {
  switch (error.code) {
    case 'DUPLICATE_ELEMENT_ID':
      return `DUPLICATE_ELEMENT_ID elementId=${error.elementId}`;
    case 'DUPLICATE_ACTION_ID':
      return `DUPLICATE_ACTION_ID actionId=${error.actionId}`;
    case 'UNKNOWN_ELEMENT_ID':
      return `UNKNOWN_ELEMENT_ID actionId=${error.actionId} stepIndex=${error.stepIndex} elementId=${error.elementId}`;
    case 'INCOMPATIBLE_STEP_TARGET':
      return `INCOMPATIBLE_STEP_TARGET actionId=${error.actionId} stepIndex=${error.stepIndex} elementId=${error.elementId} stepType=${error.stepType} elementType=${error.elementType}`;
    case 'ROUTE_MISMATCH':
      return `ROUTE_MISMATCH actionId=${error.actionId} stepIndex=${error.stepIndex} elementId=${error.elementId} actionRoute=${error.actionRoute} elementRoute=${error.elementRoute}`;
  }
}
