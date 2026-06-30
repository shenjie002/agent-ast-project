import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  bundle: true,
  sourcemap: true,
  platform: 'node',
  shims: true,
  external: ['vite', 'webpack', '@farmfe/core', '@rspack/core', 'rolldown'],
});
