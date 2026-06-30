export type RuntimeElementKind =
  | 'button'
  | 'input'
  | 'textarea'
  | 'select'
  | 'tab'
  | 'upload'
  | 'menu-item'
  | 'link'
  | 'region'
  | 'unknown';

export interface VisibleElement {
  elementId: string;
  type: RuntimeElementKind;
  text: string;
  visible: boolean;
  disabled: boolean;
}

export interface PageObservation {
  route: string;
  title: string;
  visibleElements: VisibleElement[];
  dialogs: VisibleElement[];
  loading: boolean;
  errors: string[];
}

export type ToolErrorCode =
  | 'ELEMENT_NOT_FOUND'
  | 'ELEMENT_HIDDEN'
  | 'ELEMENT_DISABLED'
  | 'UNSUPPORTED_ELEMENT_TYPE'
  | 'TIMEOUT';

export type ToolResult =
  | { ok: true; elementId?: string }
  | { ok: false; code: ToolErrorCode; elementId?: string; message: string };
