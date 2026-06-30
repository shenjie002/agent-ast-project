import { viteAgentAstPlugin } from '@agent-ast/ast-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import actionIndex from './src/actions/action-index.json';

export default defineConfig({
  plugins: [
    viteAgentAstPlugin({
      root: new URL('../..', import.meta.url).pathname,
      routeByFile: {
        'packages/demo-app/src/pages/KnowledgePage.tsx': '/knowledge',
      },
      actionIndex,
    }),
    react(),
  ],
});
