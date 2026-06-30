import type { PageObservation, RuntimeElementKind, VisibleElement } from './types';

export function observePage(root: ParentNode = document): PageObservation {
  const indexedElements = Array.from(root.querySelectorAll<HTMLElement>('[data-ai-id]'));
  const visibleElements = indexedElements
    .filter(isVisibleElement)
    .map(toVisibleElement);

  return {
    route: window.location.pathname || '/',
    title: document.title,
    visibleElements,
    dialogs: visibleElements.filter((element) => {
      const domElement = findElement(root, element.elementId);
      return Boolean(domElement?.closest('[role="dialog"], dialog, [aria-modal="true"]'));
    }),
    loading: Boolean(root.querySelector('[aria-busy="true"], [data-loading="true"]')),
    errors: Array.from(root.querySelectorAll<HTMLElement>('[role="alert"], [data-error="true"]'))
      .map((element) => normalizeText(element.textContent ?? ''))
      .filter(Boolean),
  };
}

export function findElement(root: ParentNode, elementId: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-ai-id="${cssEscape(elementId)}"]`);
}

export function isVisibleElement(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
    return false;
  }

  if (element.hidden || element.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  return true;
}

export function isDisabledElement(element: HTMLElement): boolean {
  if ('disabled' in element && Boolean((element as HTMLButtonElement).disabled)) {
    return true;
  }

  if (element.getAttribute('aria-disabled') === 'true') {
    return true;
  }

  return element.classList.contains('disabled') || element.classList.contains('is-disabled');
}

export function getElementKind(element: HTMLElement): RuntimeElementKind {
  const tagName = element.tagName.toLowerCase();
  if (tagName === 'button') return 'button';
  if (tagName === 'input') return 'input';
  if (tagName === 'textarea') return 'textarea';
  if (tagName === 'select') return 'select';
  if (tagName === 'a') return 'link';

  const role = element.getAttribute('role');
  if (role === 'button') return 'button';
  if (role === 'tab') return 'tab';
  if (role === 'menuitem') return 'menu-item';

  return 'unknown';
}

export function getElementText(element: HTMLElement): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element.placeholder || element.value || element.getAttribute('aria-label') || '';
  }

  if (element instanceof HTMLSelectElement) {
    return element.getAttribute('aria-label') || normalizeText(element.textContent ?? '');
  }

  return element.getAttribute('aria-label') || normalizeText(element.textContent ?? '');
}

function toVisibleElement(element: HTMLElement): VisibleElement {
  return {
    elementId: element.dataset.aiId ?? '',
    type: getElementKind(element),
    text: getElementText(element),
    visible: true,
    disabled: isDisabledElement(element),
  };
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }

  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
