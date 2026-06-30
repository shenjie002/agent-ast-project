import { beforeEach, describe, expect, it } from 'vitest';
import { executeAction } from '../src/action';

beforeEach(() => {
  document.body.innerHTML = '';
  document.title = 'Action Demo';
  window.history.replaceState({}, '', '/knowledge');
});

describe('executeAction', () => {
  it('executes declarative steps and observes after each step', async () => {
    document.body.innerHTML = `
      <button data-ai-id="knowledge.personal.createButton">新增知识库</button>
      <ul data-ai-id="knowledge.personal.list"></ul>
    `;

    document.querySelector('[data-ai-id="knowledge.personal.createButton"]')!.addEventListener('click', () => {
      const dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog');
      dialog.innerHTML = `
        <input data-ai-id="knowledge.createModal.nameInput" />
        <button data-ai-id="knowledge.createModal.confirmButton">确认</button>
      `;
      document.body.appendChild(dialog);
      dialog.querySelector('[data-ai-id="knowledge.createModal.confirmButton"]')!.addEventListener('click', () => {
        const input = document.querySelector<HTMLInputElement>('[data-ai-id="knowledge.createModal.nameInput"]')!;
        const item = document.createElement('li');
        item.textContent = input.value;
        document.querySelector('[data-ai-id="knowledge.personal.list"]')!.appendChild(item);
        dialog.remove();
      });
    });

    const result = await executeAction({
      actionId: 'knowledge.personal.create',
      name: '创建个人知识库',
      steps: [
        { type: 'click', elementId: 'knowledge.personal.createButton' },
        { type: 'waitForElement', elementId: 'knowledge.createModal.nameInput', timeoutMs: 100 },
        { type: 'fill', elementId: 'knowledge.createModal.nameInput', value: '合同资料库' },
        { type: 'click', elementId: 'knowledge.createModal.confirmButton' },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.actionId).toBe('knowledge.personal.create');
    expect(result.steps).toHaveLength(4);
    expect(result.steps.every((step) => step.result.ok)).toBe(true);
    expect(result.steps.every((step) => step.observation.route === '/knowledge')).toBe(true);
    expect(document.querySelector('[data-ai-id="knowledge.personal.list"]')!.textContent).toBe('合同资料库');
  });

  it('stops at the first failed step and returns the failure result', async () => {
    const result = await executeAction({
      actionId: 'knowledge.personal.create',
      name: '创建个人知识库',
      steps: [
        { type: 'click', elementId: 'knowledge.missingButton' },
        { type: 'fill', elementId: 'knowledge.createModal.nameInput', value: '不会执行' },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0].result).toMatchObject({
      ok: false,
      code: 'ELEMENT_NOT_FOUND',
      elementId: 'knowledge.missingButton',
    });
  });
});
