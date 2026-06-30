import type { RuntimeAction } from './action';

export interface IndexedRuntimeAction extends RuntimeAction {
  route?: string;
  goalExamples?: string[];
}

export interface ActionIndexFile {
  version: 1;
  generatedAt: string;
  actions: IndexedRuntimeAction[];
}

export function findActionById(
  index: ActionIndexFile,
  actionId: string,
): IndexedRuntimeAction | undefined {
  return index.actions.find((action) => action.actionId === actionId);
}

export function searchActions(index: ActionIndexFile, query: string): IndexedRuntimeAction[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return [];
  }

  return index.actions.filter((action) => searchableText(action).includes(normalizedQuery));
}

function searchableText(action: IndexedRuntimeAction): string {
  return normalize([
    action.actionId,
    action.name,
    action.route ?? '',
    ...(action.goalExamples ?? []),
  ].join(' '));
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}
