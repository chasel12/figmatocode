export type CSSDecl = Record<string, string>;

export interface CompiledNode {
  id: string;
  className: string;
  css: CSSDecl;
}

export interface CompiledPage {
  pageId: string;
  viewport: { width: number; height: number };
  nodes: CompiledNode[];
}

export function declToString(css: CSSDecl): string {
  return Object.entries(css)
    .map(([prop, value]) => `  ${prop}: ${value};`)
    .join('\n');
}

export function scssFromPage(compiled: CompiledPage): string {
  const blocks = compiled.nodes.map((node) => `.${node.className} {\n${declToString(node.css)}\n}`);
  return blocks.join('\n\n') + '\n';
}
