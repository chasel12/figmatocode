/** FR-48 Inter 本地托管 + 字体栈单源（编辑器 / 文本测量 / Konva 文本 / 出码 HTML / reference 共用同一字体）。 */
export const FONT_STACK = 'Inter, Arial, "PingFang SC", "Microsoft YaHei", sans-serif';

const LATIN =
  'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const LATIN_EXT =
  'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';

/**
 * Inter 可变字重 woff2（public/fonts/ 本地托管，PRD FR-48）。
 * font-display: swap——未就绪时先用回退字体渲染，避免阻塞（PRD Edge Case 11）。
 * 出码产物与编辑器注入同一段 CSS，保证「同源同字体」。
 * **D2 修复（2026-10-20）**：路径基座参数化——站点根部署用缺省 '/fonts'（dist/pages/e2e 不变）；
 * ZIP 的 preview/ 页用 'fonts'（字体随包走，file:// 与子目录部署不 404，同 Figma 导出物口径）。
 */
export function fontFaceCss(base: string): string {
  return `@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url('${base}/inter-latin-wght-normal.woff2') format('woff2');unicode-range:${LATIN}}
@font-face{font-family:'Inter';font-style:normal;font-weight:100 900;font-display:swap;src:url('${base}/inter-latin-ext-wght-normal.woff2') format('woff2');unicode-range:${LATIN_EXT}}
@font-face{font-family:'Inter';font-style:italic;font-weight:100 900;font-display:swap;src:url('${base}/inter-latin-wght-italic.woff2') format('woff2');unicode-range:${LATIN}}
@font-face{font-family:'Inter';font-style:italic;font-weight:100 900;font-display:swap;src:url('${base}/inter-latin-ext-wght-italic.woff2') format('woff2');unicode-range:${LATIN_EXT}}`;
}

export const FONT_FACE_CSS = fontFaceCss('/fonts');

/** ZIP 内置字体清单（与 public/fonts 同源；CodeModal 导出时抓取为二进制条目） */
export const FONT_FILES = [
  'inter-latin-wght-normal.woff2',
  'inter-latin-ext-wght-normal.woff2',
  'inter-latin-wght-italic.woff2',
  'inter-latin-ext-wght-italic.woff2',
] as const;
