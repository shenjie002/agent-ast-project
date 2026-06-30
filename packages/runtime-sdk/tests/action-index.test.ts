import { describe, expect, it } from 'vitest';
import { findActionById, searchActions } from '../src/action-index';
import type { ActionIndexFile } from '../src/action-index';

const index: ActionIndexFile = {
  version: 1,
  generatedAt: '2026-06-30T00:00:00.000Z',
  actions: [
    {
      actionId: 'knowledge.personal.create',
      name: '创建个人知识库',
      route: '/knowledge',
      goalExamples: ['创建个人知识库', '新建一个知识库', '帮我建一个合同资料库'],
      steps: [
        { type: 'observe' },
        { type: 'click', elementId: 'knowledge.personal.createButton' },
        { type: 'waitForElement', elementId: 'knowledge.createModal.nameInput', timeoutMs: 1000 },
        { type: 'fill', elementId: 'knowledge.createModal.nameInput', value: '合同资料库' },
        { type: 'click', elementId: 'knowledge.createModal.confirmButton' },
      ],
    },
    {
      actionId: 'knowledge.personal.open',
      name: '打开个人知识库页面',
      route: '/knowledge',
      goalExamples: ['进入知识库', '打开知识库页面'],
      steps: [{ type: 'observe' }],
    },
  ],
};

describe('action-index helpers', () => {
  it('finds an action by id', () => {
    expect(findActionById(index, 'knowledge.personal.create')?.name).toBe('创建个人知识库');
    expect(findActionById(index, 'missing.action')).toBeUndefined();
  });

  it('searches actions by name, id, route, and goal examples', () => {
    expect(searchActions(index, '合同资料库').map((action) => action.actionId)).toEqual([
      'knowledge.personal.create',
    ]);
    expect(searchActions(index, '/knowledge').map((action) => action.actionId)).toEqual([
      'knowledge.personal.create',
      'knowledge.personal.open',
    ]);
    expect(searchActions(index, 'personal.open').map((action) => action.actionId)).toEqual([
      'knowledge.personal.open',
    ]);
  });
});
