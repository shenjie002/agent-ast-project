import { describe, expect, it } from 'vitest';
import { validateActionIndex } from '../src/validation';
import type { ElementIndexFile } from '../src/types';
import type { AgentAstActionIndex } from '../src/plugin';

const elementIndex: ElementIndexFile = {
  version: 1,
  generatedAt: '2026-06-30T00:00:00.000Z',
  elements: [
    {
      elementId: 'knowledge.personal.createButton',
      route: '/knowledge',
      type: 'button',
      text: '新增知识库',
      source: { file: 'KnowledgePage.tsx', line: 1, column: 1 },
    },
    {
      elementId: 'knowledge.createModal.nameInput',
      route: '/knowledge',
      type: 'input',
      text: '知识库名称',
      source: { file: 'KnowledgePage.tsx', line: 2, column: 1 },
    },
    {
      elementId: 'knowledge.createModal.confirmButton',
      route: '/knowledge',
      type: 'button',
      text: '确认',
      source: { file: 'KnowledgePage.tsx', line: 3, column: 1 },
    },
  ],
};

describe('validateActionIndex', () => {
  it('accepts actions whose referenced element ids and step kinds match the element index', () => {
    const actionIndex: AgentAstActionIndex = {
      actions: [
        {
          actionId: 'knowledge.personal.create',
          name: '创建个人知识库',
          route: '/knowledge',
          steps: [
            { type: 'click', elementId: 'knowledge.personal.createButton' },
            { type: 'waitForElement', elementId: 'knowledge.createModal.nameInput' },
            { type: 'fill', elementId: 'knowledge.createModal.nameInput', value: '合同资料库' },
            { type: 'click', elementId: 'knowledge.createModal.confirmButton' },
          ],
        },
      ],
    };

    expect(validateActionIndex({ actionIndex, elementIndex })).toEqual({ ok: true, errors: [] });
  });

  it('reports duplicate action ids and duplicate element ids', () => {
    const duplicatedElementIndex: ElementIndexFile = {
      ...elementIndex,
      elements: [...elementIndex.elements, elementIndex.elements[0]],
    };
    const actionIndex: AgentAstActionIndex = {
      actions: [
        { actionId: 'same.action', name: 'A', steps: [] },
        { actionId: 'same.action', name: 'B', steps: [] },
      ],
    };

    expect(validateActionIndex({ actionIndex, elementIndex: duplicatedElementIndex }).errors).toEqual([
      {
        code: 'DUPLICATE_ELEMENT_ID',
        elementId: 'knowledge.personal.createButton',
      },
      {
        code: 'DUPLICATE_ACTION_ID',
        actionId: 'same.action',
      },
    ]);
  });

  it('reports unknown element ids and incompatible step target types', () => {
    const actionIndex: AgentAstActionIndex = {
      actions: [
        {
          actionId: 'knowledge.personal.create',
          name: '创建个人知识库',
          route: '/knowledge',
          steps: [
            { type: 'click', elementId: 'knowledge.missingButton' },
            { type: 'fill', elementId: 'knowledge.personal.createButton', value: '错误目标' },
            { type: 'click', elementId: 'knowledge.createModal.nameInput' },
          ],
        },
      ],
    };

    expect(validateActionIndex({ actionIndex, elementIndex }).errors).toEqual([
      {
        code: 'UNKNOWN_ELEMENT_ID',
        actionId: 'knowledge.personal.create',
        stepIndex: 0,
        elementId: 'knowledge.missingButton',
      },
      {
        code: 'INCOMPATIBLE_STEP_TARGET',
        actionId: 'knowledge.personal.create',
        stepIndex: 1,
        elementId: 'knowledge.personal.createButton',
        stepType: 'fill',
        elementType: 'button',
      },
      {
        code: 'INCOMPATIBLE_STEP_TARGET',
        actionId: 'knowledge.personal.create',
        stepIndex: 2,
        elementId: 'knowledge.createModal.nameInput',
        stepType: 'click',
        elementType: 'input',
      },
    ]);
  });

  it('reports route mismatches between action route and referenced element route', () => {
    const actionIndex: AgentAstActionIndex = {
      actions: [
        {
          actionId: 'knowledge.personal.create',
          name: '创建个人知识库',
          route: '/chat',
          steps: [{ type: 'click', elementId: 'knowledge.personal.createButton' }],
        },
      ],
    };

    expect(validateActionIndex({ actionIndex, elementIndex }).errors).toEqual([
      {
        code: 'ROUTE_MISMATCH',
        actionId: 'knowledge.personal.create',
        stepIndex: 0,
        elementId: 'knowledge.personal.createButton',
        actionRoute: '/chat',
        elementRoute: '/knowledge',
      },
    ]);
  });
});
