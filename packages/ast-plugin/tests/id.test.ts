import { describe, expect, it } from 'vitest';
import { generateElementId } from '../src/id';

const baseInput = {
  route: '/knowledge/personal',
  kind: 'button' as const,
  text: '新增知识库',
  handler: 'handleCreateKnowledge',
  source: {
    file: 'src/pages/KnowledgePage.tsx',
    line: 12,
    column: 7,
    start: 248,
  },
};

describe('generateElementId', () => {
  it('uses an explicit data-ai-id when one already exists', () => {
    expect(
      generateElementId({
        ...baseInput,
        explicitId: 'knowledge.personal.createButton',
      }),
    ).toBe('knowledge.personal.createButton');
  });

  it('builds a readable id from route, handler, kind, and source hash', () => {
    expect(generateElementId(baseInput)).toMatch(
      /^knowledge\.personal\.createKnowledgeButton\.[a-z0-9]{6}$/,
    );
  });

  it('is stable for equivalent input', () => {
    expect(generateElementId(baseInput)).toBe(generateElementId({ ...baseInput }));
  });
});
