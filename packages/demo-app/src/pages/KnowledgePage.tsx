import { executeAction, findActionById, type ActionIndexFile, type RuntimeAction } from '@agent-ast/runtime-sdk';
import { useState } from 'react';
import rawActionIndex from '../actions/action-index.json';

const actionIndex = rawActionIndex as ActionIndexFile;
const createKnowledgeAction = findActionById(actionIndex, 'knowledge.personal.create') as RuntimeAction;

export function KnowledgePage() {
  const [items, setItems] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const handleCreateKnowledge = () => {
    setOpen(true);
  };

  const handleConfirmCreate = () => {
    if (!name.trim()) return;
    setItems((current) => [...current, name.trim()]);
    setName('');
    setOpen(false);
  };

  const handleRunRuntimeFlow = async () => {
    const result = await executeAction(createKnowledgeAction);
    setLog([
      `${result.name}: ${result.ok ? 'ok' : 'failed'}`,
      ...result.steps.map((step, index) => {
        const label = formatStepLabel(step.step.type);
        const status = step.result.ok ? 'ok' : step.result.code ?? 'error';
        return `${index + 1}. ${label}: ${status} (${step.observation.visibleElements.length} visible)`;
      }),
    ]);
  };

  return (
    <section>
      <h2>知识库</h2>
      <div>
        <button type="button" data-ai-id="knowledge.personal.createButton" onClick={handleCreateKnowledge}>
          新增知识库
        </button>
        <button type="button" data-ai-id="knowledge.runtime.runDemoFlow" onClick={handleRunRuntimeFlow}>
          Run Runtime Flow
        </button>
      </div>

      {open ? (
        <div role="dialog" aria-label="创建知识库">
          <label>
            知识库名称
            <input
              data-ai-id="knowledge.createModal.nameInput"
              placeholder="知识库名称"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <button type="button" data-ai-id="knowledge.createModal.confirmButton" onClick={handleConfirmCreate}>
            确认
          </button>
        </div>
      ) : null}

      <ul data-ai-id="knowledge.personal.list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <pre aria-label="runtime log">{log.join('\n')}</pre>
    </section>
  );
}

function formatStepLabel(type: RuntimeAction['steps'][number]['type']) {
  switch (type) {
    case 'observe':
      return 'observe';
    case 'click':
      return 'click';
    case 'waitForElement':
      return 'wait';
    case 'fill':
      return 'fill';
  }
}
