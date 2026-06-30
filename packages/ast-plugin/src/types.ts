export type ElementKind =
  | 'button'
  | 'input'
  | 'textarea'
  | 'select'
  | 'tab'
  | 'upload'
  | 'menu-item'
  | 'region';

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
  component?: string;
}

export interface ElementIndexEntry {
  elementId: string;
  route: string;
  type: ElementKind;
  text: string;
  semantic?: string;
  nearbyText?: string;
  handler?: string;
  source: SourceLocation;
}

export interface ElementIndexFile {
  version: 1;
  generatedAt: string;
  elements: ElementIndexEntry[];
}
