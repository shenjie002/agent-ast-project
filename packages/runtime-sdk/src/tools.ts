import { findElement, isDisabledElement, isVisibleElement } from './observe';
import type { ToolErrorCode, ToolResult } from './types';

type ActionableElementResult =
  | { ok: true; element: HTMLElement }
  | { ok: false; result: ToolResult };

export function clickElement(elementId: string, root: ParentNode = document): ToolResult {
  const readiness = getActionableElement(elementId, root);
  if (readiness.ok === false) {
    return readiness.result;
  }

  readiness.element.click();
  return { ok: true, elementId };
}

export function fillElement(
  elementId: string,
  value: string,
  root: ParentNode = document,
): ToolResult {
  const readiness = getActionableElement(elementId, root);
  if (readiness.ok === false) {
    return readiness.result;
  }

  const element = readiness.element;
  if (!isFillableElement(element)) {
    return errorResult('UNSUPPORTED_ELEMENT_TYPE', elementId, 'Element does not support text input');
  }

  setElementValue(element, value);
  dispatchFormEvent(element, 'input');
  dispatchFormEvent(element, 'change');

  return { ok: true, elementId };
}

export async function waitForElement(
  elementId: string,
  timeoutMs = 1000,
  root: ParentNode = document,
): Promise<ToolResult> {
  if (findElement(root, elementId)) {
    return { ok: true, elementId };
  }

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (findElement(root, elementId)) {
        observer.disconnect();
        window.clearTimeout(timeoutId);
        resolve({ ok: true, elementId });
      }
    });

    observer.observe(getObserverRoot(root), {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-ai-id', 'style', 'hidden', 'aria-hidden'],
    });

    const timeoutId = window.setTimeout(() => {
      observer.disconnect();
      resolve(errorResult('TIMEOUT', elementId, `Timed out waiting for element ${elementId}`));
    }, timeoutMs);
  });
}

function getActionableElement(
  elementId: string,
  root: ParentNode,
): ActionableElementResult {
  const element = findElement(root, elementId);
  if (!element) {
    return {
      ok: false,
      result: errorResult('ELEMENT_NOT_FOUND', elementId, `Element not found: ${elementId}`),
    };
  }

  if (!isVisibleElement(element)) {
    return {
      ok: false,
      result: errorResult('ELEMENT_HIDDEN', elementId, `Element is hidden: ${elementId}`),
    };
  }

  if (isDisabledElement(element)) {
    return {
      ok: false,
      result: errorResult('ELEMENT_DISABLED', elementId, `Element is disabled: ${elementId}`),
    };
  }

  return { ok: true, element };
}

function isFillableElement(
  element: HTMLElement,
): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  return (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  );
}

function setElementValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string,
): void {
  const prototype = Object.getPrototypeOf(element) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  if (descriptor?.set) {
    descriptor.set.call(element, value);
    return;
  }

  element.value = value;
}

function dispatchFormEvent(element: HTMLElement, eventName: 'input' | 'change'): void {
  element.dispatchEvent(new Event(eventName, { bubbles: true, cancelable: true }));
}

function errorResult(code: ToolErrorCode, elementId: string, message: string): ToolResult {
  return {
    ok: false,
    code,
    elementId,
    message,
  };
}

function getObserverRoot(root: ParentNode): Node {
  if (root instanceof Document) {
    return root.body;
  }

  return root as Node;
}
