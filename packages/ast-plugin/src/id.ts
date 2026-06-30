import { createHash } from 'node:crypto';
import type { ElementKind } from './types';

export interface GenerateElementIdInput {
  explicitId?: string;
  route: string;
  kind: ElementKind;
  text?: string;
  handler?: string;
  source: {
    file: string;
    line: number;
    column: number;
    start?: number;
  };
}

export function generateElementId(input: GenerateElementIdInput): string {
  if (input.explicitId?.trim()) {
    return input.explicitId.trim();
  }

  const routePrefix = routeToIdPrefix(input.route);
  const actionName = buildActionName(input);
  const hash = shortHash([
    input.source.file,
    String(input.source.start ?? ''),
    String(input.source.line),
    String(input.source.column),
    input.handler ?? '',
    input.text ?? '',
    input.kind,
  ].join('|'));

  return [routePrefix, actionName, hash].filter(Boolean).join('.');
}

function routeToIdPrefix(route: string): string {
  const pathOnly = route.split(/[?#]/)[0];
  const normalized = pathOnly
    .split('/')
    .map((part) => toIdentifierPart(part))
    .filter(Boolean)
    .join('.');

  return normalized || 'root';
}

function buildActionName(input: GenerateElementIdInput): string {
  if (input.handler) {
    const withoutHandle = input.handler.replace(/^handle/, '');
    const base = lowerFirst(withoutHandle || input.handler);
    return appendKind(base, input.kind);
  }

  const textName = toIdentifierPart(input.text ?? 'element');
  return appendKind(textName || 'element', input.kind);
}

function appendKind(base: string, kind: ElementKind): string {
  const suffix = kindToSuffix(kind);
  if (base.toLowerCase().endsWith(suffix.toLowerCase())) {
    return base;
  }

  return `${base}${upperFirst(suffix)}`;
}

function kindToSuffix(kind: ElementKind): string {
  switch (kind) {
    case 'menu-item':
      return 'MenuItem';
    default:
      return kind;
  }
}

function toIdentifierPart(value: string): string {
  const ascii = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  if (ascii) {
    return ascii.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
  }

  return value.trim() ? 'text' : '';
}

function shortHash(value: string): string {
  return createHash('sha1').update(value).digest('hex').slice(0, 6);
}

function lowerFirst(value: string): string {
  return value ? `${value[0].toLowerCase()}${value.slice(1)}` : value;
}

function upperFirst(value: string): string {
  return value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}
