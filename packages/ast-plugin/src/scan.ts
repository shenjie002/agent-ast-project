import { parse } from '@babel/parser';
import traverseModule, { type NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { generateElementId } from './id';
import type { ElementIndexEntry, ElementKind } from './types';

const traverse = (traverseModule as any).default || traverseModule;

export interface ScanSourceInput {
  code: string;
  filePath: string;
  route: string;
}

export interface ScanSourceResult {
  elements: ElementIndexEntry[];
}

const componentKindByName = new Map<string, ElementKind>([
  ['button', 'button'],
  ['input', 'input'],
  ['textarea', 'textarea'],
  ['select', 'select'],
  ['Button', 'button'],
  ['Input', 'input'],
  ['Input.TextArea', 'textarea'],
  ['Select', 'select'],
  ['Tabs', 'tab'],
  ['Upload', 'upload'],
]);

export function scanSource(input: ScanSourceInput): ScanSourceResult {
  const ast = parse(input.code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });
  const elements: ElementIndexEntry[] = [];
  const componentStack: string[] = [];

  traverse(ast, {
    FunctionDeclaration: {
      enter(path: NodePath<t.FunctionDeclaration>) {
        if (path.node.id && isPascalCase(path.node.id.name)) {
          componentStack.push(path.node.id.name);
        }
      },
      exit(path: NodePath<t.FunctionDeclaration>) {
        if (path.node.id && isPascalCase(path.node.id.name)) {
          componentStack.pop();
        }
      },
    },
    VariableDeclarator: {
      enter(path: NodePath<t.VariableDeclarator>) {
        if (
          t.isIdentifier(path.node.id) &&
          isPascalCase(path.node.id.name) &&
          (t.isArrowFunctionExpression(path.node.init) || t.isFunctionExpression(path.node.init))
        ) {
          componentStack.push(path.node.id.name);
        }
      },
      exit(path: NodePath<t.VariableDeclarator>) {
        if (
          t.isIdentifier(path.node.id) &&
          isPascalCase(path.node.id.name) &&
          (t.isArrowFunctionExpression(path.node.init) || t.isFunctionExpression(path.node.init))
        ) {
          componentStack.pop();
        }
      },
    },
    JSXOpeningElement(path: NodePath<t.JSXOpeningElement>) {
      const name = getJsxName(path.node.name);
      const kind = componentKindByName.get(name);
      if (!kind || !shouldIncludeElement(name, kind, path.node)) {
        return;
      }

      const explicitId = getStringAttribute(path.node, 'data-ai-id');
      const text = getElementText(path.parentPath);
      const handler = getHandlerName(path.node);
      const loc = path.node.loc?.start;
      const source = {
        file: input.filePath,
        line: loc?.line ?? 0,
        column: loc?.column ?? 0,
        component: componentStack.at(-1),
      };

      elements.push({
        elementId: generateElementId({
          explicitId,
          route: input.route,
          kind,
          text,
          handler,
          source: {
            ...source,
            start: path.node.start ?? undefined,
          },
        }),
        route: input.route,
        type: kind,
        text,
        handler,
        source,
      });
    },
  });

  return { elements };
}

function shouldIncludeElement(name: string, kind: ElementKind, node: t.JSXOpeningElement): boolean {
  if (name === 'a') {
    return Boolean(getHandlerName(node) || getStringAttribute(node, 'href'));
  }

  if (kind === 'input' || kind === 'textarea') {
    return true;
  }

  return true;
}

function getJsxName(name: t.JSXNamespacedName | t.JSXMemberExpression | t.JSXIdentifier): string {
  if (t.isJSXIdentifier(name)) {
    return name.name;
  }

  if (t.isJSXMemberExpression(name)) {
    return `${getJsxName(name.object)}.${getJsxName(name.property)}`;
  }

  return `${name.namespace.name}:${name.name.name}`;
}

function getHandlerName(node: t.JSXOpeningElement): string | undefined {
  for (const attribute of node.attributes) {
    if (!t.isJSXAttribute(attribute) || !t.isJSXIdentifier(attribute.name)) {
      continue;
    }

    if (!/^on[A-Z]/.test(attribute.name.name)) {
      continue;
    }

    const expression = attribute.value;
    if (!t.isJSXExpressionContainer(expression)) {
      continue;
    }

    if (t.isIdentifier(expression.expression)) {
      return expression.expression.name;
    }
  }

  return undefined;
}

function getStringAttribute(node: t.JSXOpeningElement, attributeName: string): string | undefined {
  for (const attribute of node.attributes) {
    if (!t.isJSXAttribute(attribute) || !t.isJSXIdentifier(attribute.name)) {
      continue;
    }

    if (attribute.name.name !== attributeName) {
      continue;
    }

    if (t.isStringLiteral(attribute.value)) {
      return attribute.value.value;
    }

    if (
      t.isJSXExpressionContainer(attribute.value) &&
      t.isStringLiteral(attribute.value.expression)
    ) {
      return attribute.value.expression.value;
    }
  }

  return undefined;
}

function getElementText(path: NodePath<t.Node>): string {
  if (!path.isJSXElement()) {
    return '';
  }

  const openingElement = path.node.openingElement;
  const placeholder = getStringAttribute(openingElement, 'placeholder');
  if (placeholder) {
    return placeholder;
  }

  const ariaLabel = getStringAttribute(openingElement, 'aria-label');
  if (ariaLabel) {
    return ariaLabel;
  }

  return path.node.children
    .map((child) => {
      if (t.isJSXText(child)) {
        return child.value;
      }

      if (
        t.isJSXExpressionContainer(child) &&
        t.isStringLiteral(child.expression)
      ) {
        return child.expression.value;
      }

      return '';
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isPascalCase(name: string): boolean {
  return /^[A-Z]/.test(name);
}
