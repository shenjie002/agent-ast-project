import { describe, expect, it } from 'vitest';
import { injectSource } from '../src/inject';

const source = `
export function KnowledgePage() {
  const handleCreateKnowledge = () => {};

  return (
    <section>
      <Button type="primary" onClick={handleCreateKnowledge}>
        新增知识库
      </Button>
      <Input placeholder="知识库名称" />
      <Button data-ai-id="knowledge.custom.confirmButton">确认</Button>
      <div>普通说明文字</div>
    </section>
  );
}
`;

describe('injectSource', () => {
  it('injects data-ai-id into scanned interactive elements', () => {
    const result = injectSource({
      code: source,
      filePath: 'src/pages/KnowledgePage.tsx',
      route: '/knowledge',
    });

    expect(result.elements).toHaveLength(3);
    expect(result.code).toContain('data-ai-id="knowledge.createKnowledgeButton.');
    expect(result.code).toContain('data-ai-id="knowledge.textInput.');
  });

  it('keeps an existing data-ai-id and does not duplicate it', () => {
    const result = injectSource({
      code: source,
      filePath: 'src/pages/KnowledgePage.tsx',
      route: '/knowledge',
    });

    expect(result.code).toContain('data-ai-id="knowledge.custom.confirmButton"');
    expect(result.code.match(/knowledge\.custom\.confirmButton/g)).toHaveLength(1);
    expect(result.elements[2].elementId).toBe('knowledge.custom.confirmButton');
  });

  it('does not inject data-ai-id into passive layout elements', () => {
    const result = injectSource({
      code: source,
      filePath: 'src/pages/KnowledgePage.tsx',
      route: '/knowledge',
    });

    expect(result.code).toContain('<div>普通说明文字</div>');
    expect(result.code).not.toContain('<div data-ai-id=');
  });
});
