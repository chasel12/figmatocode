import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FONT_FACE_CSS, FONT_STACK } from '../src/font';
import { createPage, resetIdSeq } from '../src/schema/factory';
import { compilePage } from '../src/compiler';
import { generateHtml, generateReferenceHtml, generateTaroProject } from '../src/generator';

resetIdSeq(500);

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');

describe('FR-48 Inter 本地托管 + 字体单源', () => {
  it('FONT_FACE_CSS：4 面（latin/ext × normal/italic）、swap、可变字重 100–900、指向 public/fonts', () => {
    const faces = FONT_FACE_CSS.split('@font-face').length - 1;
    expect(faces).toBe(4);
    expect(FONT_FACE_CSS).toContain('font-display:swap');
    expect(FONT_FACE_CSS).toContain('font-weight:100 900');
    expect(FONT_FACE_CSS).toContain("/fonts/inter-latin-wght-normal.woff2");
    expect(FONT_FACE_CSS).toContain('italic');
    expect(FONT_FACE_CSS).toContain('unicode-range');
  });

  it('public/fonts/ 四个 woff2 实体文件齐备', () => {
    const files = readdirSync(join(root, 'public', 'fonts'));
    for (const f of [
      'inter-latin-wght-normal.woff2',
      'inter-latin-wght-italic.woff2',
      'inter-latin-ext-wght-normal.woff2',
      'inter-latin-ext-wght-italic.woff2',
    ]) {
      expect(files).toContain(f);
    }
  });

  it('出码同源：HTML/reference 注入同一 FONT_FACE_CSS + FONT_STACK；Taro app.scss 用 FONT_STACK', () => {
    const page = createPage('FR-48');
    const compiled = compilePage(page);
    const html = generateHtml(page, compiled);
    expect(html).toContain('/fonts/inter-latin-wght-normal.woff2');
    expect(html).toContain(`font-family: ${FONT_STACK}`);
    const ref = generateReferenceHtml(page, compiled, { page: { x: 0, y: 0, width: 375, height: 812 } });
    expect(ref).toContain('/fonts/inter-latin-wght-normal.woff2');
    expect(ref).toContain(`font-family: ${FONT_STACK}`);
    const taro = generateTaroProject(page, compiled);
    const appScss = taro.find((f) => f.path === 'src/app.scss');
    expect(appScss?.content).toContain(FONT_STACK);
  });

  it('styles.css 编辑器主栈以 Inter 打头（与 FONT_STACK 首选一致）', () => {
    const css = readFileSync(join(root, 'src', 'styles.css'), 'utf8');
    expect(css).toMatch(/font-family:\s*Inter,\s*Arial/);
    expect(FONT_STACK.startsWith('Inter,')).toBe(true);
  });

  it('无残留旧字体字面（Arial 裸栈出现在 src/ 声明处）', () => {
    const files = ['compiler/compile.ts', 'compiler/measure.ts', 'editor/Canvas.tsx', 'generator/html.ts', 'generator/reference.ts'];
    for (const f of files) {
      const src = readFileSync(join(root, 'src', f), 'utf8');
      expect(src.includes('Arial, "PingFang SC"')).toBe(false);
      expect(src.includes("'Arial, \"PingFang SC\"")).toBe(false);
    }
  });
});
