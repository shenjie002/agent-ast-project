import { beforeEach, describe, expect, it } from 'vitest';
import { createRoot } from 'react-dom/client';
import { useState } from 'react';
import { clickElement, fillElement } from '../src/tools';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('runtime tools with React controlled inputs', () => {
  it('fillElement updates React controlled input state through the native setter and input event', async () => {
    function ControlledInputDemo() {
      const [value, setValue] = useState('');
      return (
        <div>
          <input
            data-ai-id="demo.nameInput"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <button data-ai-id="demo.confirmButton" onClick={() => document.body.setAttribute('data-confirmed', value)}>
            确认
          </button>
        </div>
      );
    }

    const host = document.createElement('div');
    document.body.appendChild(host);
    createRoot(host).render(<ControlledInputDemo />);
    await waitFor(() => document.querySelector('[data-ai-id="demo.nameInput"]'));

    expect(fillElement('demo.nameInput', '合同资料库')).toEqual({
      ok: true,
      elementId: 'demo.nameInput',
    });
    await Promise.resolve();
    expect(clickElement('demo.confirmButton')).toEqual({
      ok: true,
      elementId: 'demo.confirmButton',
    });

    expect(document.body.getAttribute('data-confirmed')).toBe('合同资料库');
  });
});

async function waitFor<T>(read: () => T, timeoutMs = 1000): Promise<T> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = read();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  throw new Error('Timed out waiting for condition');
}
