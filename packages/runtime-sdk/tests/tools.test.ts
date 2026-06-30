import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clickElement, fillElement, waitForElement } from '../src/tools';

beforeEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('runtime tools', () => {
  it('clickElement clicks a visible enabled element', () => {
    document.body.innerHTML = `<button data-ai-id="knowledge.createButton">新增知识库</button>`;
    let clicked = 0;
    document.querySelector('button')?.addEventListener('click', () => {
      clicked += 1;
    });

    const result = clickElement('knowledge.createButton');

    expect(result).toEqual({ ok: true, elementId: 'knowledge.createButton' });
    expect(clicked).toBe(1);
  });

  it('clickElement returns structured errors for missing, hidden, and disabled elements', () => {
    document.body.innerHTML = `
      <button data-ai-id="knowledge.hiddenButton" style="display: none">隐藏按钮</button>
      <button data-ai-id="knowledge.disabledButton" disabled>禁用按钮</button>
    `;

    expect(clickElement('knowledge.missingButton')).toMatchObject({
      ok: false,
      code: 'ELEMENT_NOT_FOUND',
      elementId: 'knowledge.missingButton',
    });
    expect(clickElement('knowledge.hiddenButton')).toMatchObject({
      ok: false,
      code: 'ELEMENT_HIDDEN',
      elementId: 'knowledge.hiddenButton',
    });
    expect(clickElement('knowledge.disabledButton')).toMatchObject({
      ok: false,
      code: 'ELEMENT_DISABLED',
      elementId: 'knowledge.disabledButton',
    });
  });

  it('fillElement sets text field values and dispatches input/change events', () => {
    document.body.innerHTML = `<input data-ai-id="knowledge.nameInput" />`;
    const input = document.querySelector('input')!;
    const events: string[] = [];
    input.addEventListener('input', () => events.push('input'));
    input.addEventListener('change', () => events.push('change'));

    const result = fillElement('knowledge.nameInput', '合同资料库');

    expect(result).toEqual({ ok: true, elementId: 'knowledge.nameInput' });
    expect(input.value).toBe('合同资料库');
    expect(events).toEqual(['input', 'change']);
  });

  it('fillElement rejects unsupported elements', () => {
    document.body.innerHTML = `<button data-ai-id="knowledge.createButton">新增知识库</button>`;

    expect(fillElement('knowledge.createButton', '合同资料库')).toMatchObject({
      ok: false,
      code: 'UNSUPPORTED_ELEMENT_TYPE',
      elementId: 'knowledge.createButton',
    });
  });

  it('waitForElement resolves when the element appears', async () => {
    const waiting = waitForElement('knowledge.delayedButton', 100);
    setTimeout(() => {
      document.body.innerHTML = `<button data-ai-id="knowledge.delayedButton">稍后出现</button>`;
    }, 5);

    await expect(waiting).resolves.toEqual({
      ok: true,
      elementId: 'knowledge.delayedButton',
    });
  });

  it('waitForElement returns TIMEOUT when the element does not appear', async () => {
    await expect(waitForElement('knowledge.neverButton', 10)).resolves.toMatchObject({
      ok: false,
      code: 'TIMEOUT',
      elementId: 'knowledge.neverButton',
    });
  });
});
