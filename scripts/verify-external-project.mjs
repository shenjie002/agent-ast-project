#!/usr/bin/env node
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const args = parseArgs(process.argv.slice(2));
const projectRoot = resolve(args.project ?? '');
if (!args.project) {
  fail('Missing --project <path>');
}

const include = args.include ?? 'src/pages/login/index.tsx';
const mode = args.mode ?? 'development';
const generatedDir = args.generatedDir ?? 'agent-ast-generated';
const shouldInject = args.inject !== 'false';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pluginEntry = resolve(repoRoot, 'packages/ast-plugin/dist/index.js');
const tempDir = resolve(projectRoot, '.agent-ast');
const tempConfig = resolve(tempDir, 'vite.agent-ast.generated.config.ts');
const projectViteConfig = resolve(projectRoot, args.config ?? 'vite.config.ts');

mkdirSync(tempDir, { recursive: true });
writeFileSync(tempConfig, buildConfigSource({
  pluginEntry,
  projectRoot,
  projectViteConfig,
  include,
  generatedDir,
  shouldInject,
}), 'utf8');

const build = spawnSync('pnpm', ['exec', 'vite', 'build', '--config', tempConfig, '--mode', mode], {
  cwd: projectRoot,
  stdio: 'pipe',
  encoding: 'utf8',
});

if (build.status !== 0) {
  process.stdout.write(build.stdout);
  process.stderr.write(build.stderr);
  fail(`External project build failed with status ${build.status}`);
}

const elementIndexPath = resolve(projectRoot, generatedDir, 'element-index.json');
const elementIndex = JSON.parse(readFileSync(elementIndexPath, 'utf8'));
const summary = {
  projectRoot,
  include,
  elementIndexPath,
  elementCount: elementIndex.elements?.length ?? 0,
  sampleElementIds: (elementIndex.elements ?? []).slice(0, 10).map((element) => element.elementId),
};

if (args.cleanConfig !== 'false') {
  rmSync(tempConfig, { force: true });
}

console.log(JSON.stringify(summary, null, 2));

function buildConfigSource({ pluginEntry, projectRoot, projectViteConfig, include, generatedDir, shouldInject }) {
  return `import type { ConfigEnv, UserConfig } from 'vite'\n\nimport { viteAgentAstPlugin } from ${JSON.stringify(pluginEntry)}\nimport baseConfig from ${JSON.stringify(projectViteConfig)}\n\nexport default async function agentAstConfig(env: ConfigEnv): Promise<UserConfig> {\n  const resolved = typeof baseConfig === 'function' ? await baseConfig(env) : baseConfig\n  const plugins = Array.isArray(resolved.plugins) ? resolved.plugins : []\n\n  return {\n    ...resolved,\n    plugins: [\n      viteAgentAstPlugin({\n        root: ${JSON.stringify(projectRoot)},\n        include: ${pathPatternToRegexSource(include)},\n        outputFile: ${JSON.stringify(`${generatedDir}/element-index.json`)},\n        inject: ${JSON.stringify(shouldInject)},\n        emitIndex: true,\n      }),\n      ...plugins,\n    ],\n  }\n}\n`;
}

function pathPatternToRegexSource(pattern) {
  const escaped = pattern
    .replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
    .replace(/\\\*/g, '.*')
    .replace(/\\\?/g, '.');
  return `/${escaped}$/`;
}

function parseArgs(rawArgs) {
  const parsed = {};
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = rawArgs[index + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = 'true';
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function fail(message) {
  console.error(`[agent-ast external verify] ${message}`);
  process.exit(1);
}
