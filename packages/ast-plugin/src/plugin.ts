import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { createUnplugin } from 'unplugin';
import { injectSource } from './inject';
import type { ElementIndexEntry, ElementIndexFile } from './types';
import { formatValidationErrors, validateActionIndex } from './validation';

export interface AgentAstActionIndex {
  version?: 1;
  generatedAt?: string;
  actions: unknown[];
}

export interface AgentAstPluginOptions {
  root?: string;
  include?: RegExp;
  routeByFile?: Record<string, string>;
  outputFile?: string;
  actionIndex?: AgentAstActionIndex;
  actionOutputFile?: string;
  inject?: boolean;
  emitIndex?: boolean;
}

const defaultInclude = /\.[jt]sx$/;

export const agentAstPlugin = createUnplugin<AgentAstPluginOptions | undefined>((options = {}) => {
  const root = resolve(options.root ?? process.cwd());
  const include = options.include ?? defaultInclude;
  const outputFile = resolve(root, options.outputFile ?? 'generated/element-index.json');
  const actionOutputFile = resolve(root, options.actionOutputFile ?? 'generated/action-index.json');
  const shouldInject = options.inject ?? true;
  const shouldEmitIndex = options.emitIndex ?? true;
  const elementsByFile = new Map<string, ElementIndexEntry[]>();

  return {
    name: 'agent-ast-plugin',
    enforce: 'pre',
    buildStart() {
      elementsByFile.clear();
    },
    transform(code, id) {
      const cleanId = id.split('?')[0];
      if (!include.test(cleanId)) {
        return null;
      }

      const route = resolveRoute(cleanId, root, options.routeByFile);
      const result = injectSource({
        code,
        filePath: toProjectPath(cleanId, root),
        route,
      });
      elementsByFile.set(cleanId, result.elements);

      if (!shouldInject) {
        return null;
      }

      return {
        code: result.code,
        map: result.map as any,
      };
    },
    buildEnd() {
      if (!shouldEmitIndex) {
        return;
      }

      const indexFile: ElementIndexFile = {
        version: 1,
        generatedAt: new Date().toISOString(),
        elements: Array.from(elementsByFile.values()).flat(),
      };

      mkdirSync(dirname(outputFile), { recursive: true });
      writeJsonFile(outputFile, indexFile);

      if (options.actionIndex) {
        const validation = validateActionIndex({
          actionIndex: options.actionIndex,
          elementIndex: indexFile,
        });
        if (!validation.ok) {
          throw new Error(`[agent-ast-plugin] action-index validation failed:\n${formatValidationErrors(validation.errors)}`);
        }

        writeJsonFile(actionOutputFile, {
          version: options.actionIndex.version ?? 1,
          generatedAt: new Date().toISOString(),
          actions: options.actionIndex.actions,
        });
      }
    },
  };
});

export const viteAgentAstPlugin = agentAstPlugin.vite;
export const webpackAgentAstPlugin = agentAstPlugin.webpack;
export default agentAstPlugin;

function writeJsonFile(filePath: string, value: unknown): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function resolveRoute(
  filePath: string,
  root: string,
  routeByFile: Record<string, string> | undefined,
): string {
  const projectPath = toProjectPath(filePath, root);
  if (routeByFile?.[projectPath]) {
    return routeByFile[projectPath];
  }

  const pageMatch = projectPath.match(/(?:^|\/)pages\/([^/]+)(?:\/index)?\.[jt]sx$/);
  if (pageMatch) {
    return `/${pageMatch[1]}`;
  }

  return '/';
}

function toProjectPath(filePath: string, root: string): string {
  return relative(root, filePath).replace(/\\/g, '/');
}
