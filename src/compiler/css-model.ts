export type CSSDecl = Record<string, string>;

export interface CompiledNode {
  id: string;
  className: string;
  css: CSSDecl;
}

/**
 * 附加规则（B2 交互态）。
 *
 * `selector` 是**完整选择器**（已含 `.class` 前缀与伪类），编译侧只负责拼字符串。
 * 之所以放在 `CompiledPage` 而不是 `CompiledNode`：伪类规则与节点的「基础声明」
 * 生命周期不同（前者不进 reference DOM 的基准图，后者进），混在一起会让
 * `buildReferenceDom` 误把伪类声明当静态样式渲染。
 */
export interface CompiledRule {
  selector: string;
  decls: CSSDecl;
}

export interface CompiledPage {
  pageId: string;
  viewport: { width: number; height: number };
  nodes: CompiledNode[];
  /** B2 交互态等附加规则；无则为空（旧产物与旧测试不受影响） */
  rules?: CompiledRule[];
}

export function declToString(css: CSSDecl): string {
  return Object.entries(css)
    .map(([prop, value]) => `  ${prop}: ${value};`)
    .join('\n');
}

/**
 * 六个出码器（html / project / prototype / react / vue / taro-project）的**唯一样式出口**。
 *
 * `rules` 在此统一追加 —— 所以 B2 的伪类只改这一处就全端生效，不需要碰任何出码器。
 */
export function scssFromPage(compiled: CompiledPage): string {
  const blocks = compiled.nodes.map((node) => `.${node.className} {\n${declToString(node.css)}\n}`);
  for (const rule of compiled.rules ?? []) {
    if (!Object.keys(rule.decls).length) continue;
    blocks.push(`${rule.selector} {\n${declToString(rule.decls)}\n}`);
  }
  return blocks.join('\n\n') + '\n';
}
