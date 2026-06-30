import { beforeEach, describe, expect, it } from 'vitest';
import { observePage } from '../src/observe';

beforeEach(() => {
  document.body.innerHTML = '';
  document.title = 'Knowledge Demo';
  window.history.replaceState({}, '', '/knowledge');
});

describe('observePage', () => {
  it('returns route, title, and visible indexed elements', () => {
    document.body.innerHTML = `
      <button data-ai-id="knowledge.createButton">新增知识库</button>
      <input data-ai-id="knowledge.nameInput" placeholder="知识库名称" />
      <div>普通说明文字</div>
    `;

    const observation = observePage();

    expect(observation.route).toBe('/knowledge');
    expect(observation.title).toBe('Knowledge Demo');
    expect(observation.visibleElements).toEqual([
      {
        elementId: 'knowledge.createButton',
        type: 'button',
        text: '新增知识库',
        visible: true,
        disabled: false,
      },
      {
        elementId: 'knowledge.nameInput',
        type: 'input',
        text: '知识库名称',
        visible: true,
        disabled: false,
      },
    ]);
  });

  it('filters hidden indexed elements and marks disabled elements', () => {
    document.body.innerHTML = `
      <button data-ai-id="knowledge.hiddenButton" style="display: none">隐藏按钮</button>
      <button data-ai-id="knowledge.disabledButton" disabled>禁用按钮</button>
      <button data-ai-id="knowledge.ariaDisabledButton" aria-disabled="true">ARIA 禁用</button>
    `;

    const observation = observePage();

    expect(observation.visibleElements).toEqual([
      {
        elementId: 'knowledge.disabledButton',
        type: 'button',
        text: '禁用按钮',
        visible: true,
        disabled: true,
      },
      {
        elementId: 'knowledge.ariaDisabledButton',
        type: 'button',
        text: 'ARIA 禁用',
        visible: true,
        disabled: true,
      },
    ]);
  });

  it('reports dialog elements separately as current modal context', () => {
    document.body.innerHTML = `
      <button data-ai-id="knowledge.createButton">新增知识库</button>
      <div role="dialog" aria-label="创建知识库">
        <input data-ai-id="knowledge.modal.nameInput" placeholder="知识库名称" />
        <button data-ai-id="knowledge.modal.confirmButton">确认</button>
      </div>
    `;

    const observation = observePage();

    expect(observation.dialogs).toEqual([
      {
        elementId: 'knowledge.modal.nameInput',
        type: 'input',
        text: '知识库名称',
        visible: true,
        disabled: false,
      },
      {
        elementId: 'knowledge.modal.confirmButton',
        type: 'button',
        text: '确认',
        visible: true,
        disabled: false,
      },
    ]);
  });
});
