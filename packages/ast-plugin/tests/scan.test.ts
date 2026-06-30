import { describe, expect, it } from 'vitest';
import { scanSource } from '../src/scan';

const source = `
import { Button, Input } from 'antd';

export function KnowledgePage() {
  const handleCreateKnowledge = () => {};

  return (
    <section>
      <Button type="primary" onClick={handleCreateKnowledge}>
        新增知识库
      </Button>
      <Input placeholder="知识库名称" onChange={() => {}} />
      <div>普通说明文字</div>
    </section>
  );
}
`;

describe('scanSource', () => {
  it('extracts interactive TSX elements with source and handler metadata', () => {
    const result = scanSource({
      code: source,
      filePath: 'src/pages/KnowledgePage.tsx',
      route: '/knowledge',
    });

    expect(result.elements).toHaveLength(2);
    expect(result.elements[0]).toMatchObject({
      route: '/knowledge',
      type: 'button',
      text: '新增知识库',
      handler: 'handleCreateKnowledge',
      source: {
        file: 'src/pages/KnowledgePage.tsx',
        component: 'KnowledgePage',
      },
    });
    expect(result.elements[0].elementId).toMatch(
      /^knowledge\.createKnowledgeButton\.[a-z0-9]{6}$/,
    );
    expect(result.elements[0].source.line).toBeGreaterThan(0);

    expect(result.elements[1]).toMatchObject({
      route: '/knowledge',
      type: 'input',
      text: '知识库名称',
    });
  });
});
