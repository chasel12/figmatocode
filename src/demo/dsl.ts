import type { LayoutSchema, StyleSchema, UINode, UIPage, NodeKind } from '../schema/types';
import { isContainer } from '../schema/types';
import { createNode, createPage } from '../schema/factory';

export interface Spec {
  kind: NodeKind;
  name?: string;
  text?: string;
  src?: string;
  layout?: Partial<LayoutSchema>;
  style?: Partial<StyleSchema>;
  children?: Spec[];
}

let seq = 0;

export function resetDemoSeq(): void {
  seq = 0;
}

function build(spec: Spec): UINode {
  seq += 1;
  const node = createNode(spec.kind, { id: `${spec.kind.toLowerCase()}-${seq}` });
  if (spec.name) node.name = spec.name;
  if ((node.type === 'TEXT' || node.type === 'BUTTON') && spec.text != null) node.text = spec.text;
  if (node.type === 'IMAGE' && spec.src != null) node.src = spec.src;
  Object.assign(node.layout, spec.layout ?? {});
  if (spec.style) node.style = { ...(node.style ?? {}), ...spec.style };
  if (isContainer(node) && spec.children) {
    node.children = spec.children.map(build);
  }
  return node;
}

export function makePage(
  name: string,
  children: Spec[],
  options: { width?: number; height?: number; rootLayout?: Partial<LayoutSchema>; rootStyle?: Partial<StyleSchema> } = {},
): UIPage {
  const page = createPage(name, options.width ?? 375, options.height ?? 812);
  page.root.children = children.map(build);
  if (options.rootLayout) Object.assign(page.root.layout, options.rootLayout);
  if (options.rootStyle) page.root.style = { ...(page.root.style ?? {}), ...options.rootStyle };
  return page;
}

/* ---------- 语义化快捷方式 ---------- */

const C = {
  primary: '#1677FF',
  primaryDark: '#0f5ed6',
  bg: '#F5F6F8',
  card: '#FFFFFF',
  text: '#111111',
  dim: '#666666',
  faint: '#999999',
  price: '#FF4D4F',
  success: '#22C55E',
  line: '#EAEAEA',
  dark: '#1F2329',
};

export function txt(text: string, style?: Partial<StyleSchema>, layout?: Partial<LayoutSchema>): Spec {
  return { kind: 'TEXT', text, style, layout };
}

export function frame(name: string, children: Spec[], layout?: Partial<LayoutSchema>, style?: Partial<StyleSchema>): Spec {
  return { kind: 'FRAME', name, children, layout, style };
}

export function rect(layout?: Partial<LayoutSchema>, style?: Partial<StyleSchema>, name?: string): Spec {
  return { kind: 'RECTANGLE', layout, style, name };
}

export function image(layout?: Partial<LayoutSchema>, style?: Partial<StyleSchema>, name?: string): Spec {
  return { kind: 'IMAGE', layout, style, name };
}

export function button(text: string, layout?: Partial<LayoutSchema>, style?: Partial<StyleSchema>): Spec {
  return { kind: 'BUTTON', text, layout, style };
}

const vstack = (name: string, children: Spec[], extra?: Partial<LayoutSchema>, style?: Partial<StyleSchema>): Spec =>
  frame(name, children, { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', gap: 12, padding: [0, 0, 0, 0], align: 'START', ...extra }, style);

const hstack = (name: string, children: Spec[], extra?: Partial<LayoutSchema>, style?: Partial<StyleSchema>): Spec =>
  frame(name, children, { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG', gap: 8, padding: [0, 0, 0, 0], align: 'CENTER', ...extra }, style);

const card = (name: string, children: Spec[], extra?: Partial<LayoutSchema>, style?: Partial<StyleSchema>): Spec =>
  frame(name, children, { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', gap: 10, padding: [14, 14, 14, 14], align: 'START', ...extra }, { background: C.card, borderRadius: 12, ...style });

const fillBtn = (text: string, style?: Partial<StyleSchema>): Spec =>
  button(
    text,
    { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'FIXED', height: 46, padding: [0, 16, 0, 16], align: 'CENTER', justify: 'CENTER' },
    { background: C.primary, color: '#FFFFFF', fontSize: 16, fontWeight: 500, borderRadius: 10, textAlign: 'center', ...style },
  );

const body = (children: Spec[], extra?: Partial<LayoutSchema>, style?: Partial<StyleSchema>): Spec =>
  vstack('内容', children, { padding: [16, 16, 16, 16], gap: 14, ...extra }, style);

const navbar = (title: string): Spec =>
  hstack(
    '导航栏',
    [
      { kind: 'TEXT', text: '‹', style: { fontSize: 24, color: C.text }, layout: { widthMode: 'HUG', heightMode: 'HUG' } },
      txt(title, { fontSize: 17, fontWeight: 600, color: C.text }, { widthMode: 'FILL', heightMode: 'HUG' }),
      { kind: 'TEXT', text: '⋯', style: { fontSize: 18, color: C.text }, layout: { widthMode: 'HUG', heightMode: 'HUG' } },
    ],
    { padding: [14, 16, 14, 16], justify: 'SPACE_BETWEEN', heightMode: 'FIXED', height: 52, widthMode: 'FILL' },
    { background: C.card },
  );

export { C, vstack, hstack, card, fillBtn, body, navbar };
