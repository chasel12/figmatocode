import { copyFileSync, mkdirSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { compilePage, scssFromPage } from '../src/compiler';
import { resolveLayout } from '../src/compiler/layout';
import type { GeometryMap } from '../src/compiler/layout';
import { createApproxMeasure } from '../src/compiler/measure';
import { generateHtml, generateReferenceHtml, generateTaroProject } from '../src/generator';
import { allDemoPages } from '../src/demo/pages';
import type { UIPage, UINode } from '../src/schema/types';

const ROOT = process.cwd();
const PAGES_DIR = join(ROOT, 'dist', 'pages');
const TARO_DIR = join(ROOT, 'dist', 'taro');

function slug(name: string): string {
  return name.replace(/\s+/g, '-');
}

interface GeoNodeEntry {
  id: string;
  name: string;
  type: string;
  depth: number;
  frame: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 节点几何（相对根原点归一化）供 diff.mjs 区域归属使用；与 reference.html 同源（同一 geometry） */
function exportGeometry(page: UIPage, geometry: GeometryMap): {
  viewport: { width: number; height: number };
  nodes: GeoNodeEntry[];
} {
  const rootGeom = geometry[page.root.id];
  const ox = rootGeom ? rootGeom.x : 0;
  const oy = rootGeom ? rootGeom.y : 0;
  const nodes: GeoNodeEntry[] = [];
  const walk = (node: UINode, depth: number): void => {
    const g = geometry[node.id];
    if (g && node.type !== 'PAGE') {
      nodes.push({
        id: node.id,
        name: node.name || node.id,
        type: node.type,
        depth,
        frame: node.type === 'FRAME',
        x: g.x - ox,
        y: g.y - oy,
        width: g.width,
        height: g.height,
      });
    }
    if (node.type === 'PAGE' || node.type === 'FRAME') node.children.forEach((c) => walk(c, depth + 1));
  };
  walk(page.root, 0);
  return { viewport: { width: page.viewport.width, height: page.viewport.height }, nodes };
}

rmSync(PAGES_DIR, { recursive: true, force: true });
rmSync(TARO_DIR, { recursive: true, force: true });
mkdirSync(PAGES_DIR, { recursive: true });
mkdirSync(TARO_DIR, { recursive: true });

const pages = allDemoPages();
const report: { id: string; name: string; nodes: number; files: string[] }[] = [];

for (const page of pages) {
  const id = slug(page.name);
  const compiled = compilePage(page);
  const geometry = resolveLayout(page, createApproxMeasure());

  const previewHtml = generateHtml(page, compiled);
  const referenceHtml = generateReferenceHtml(page, compiled, geometry);
  const taroFiles = generateTaroProject(page, compiled);

  const pageDir = join(PAGES_DIR, id);
  mkdirSync(pageDir, { recursive: true });
  writeFileSync(join(pageDir, 'index.html'), previewHtml, 'utf8');
  writeFileSync(join(pageDir, 'reference.html'), referenceHtml, 'utf8');
  writeFileSync(join(pageDir, 'page.json'), JSON.stringify({ version: 1, page }, null, 2), 'utf8');
  writeFileSync(join(pageDir, 'index.scss'), scssFromPage(compiled), 'utf8');
  writeFileSync(join(pageDir, 'geometry.json'), JSON.stringify(exportGeometry(page, geometry), null, 2), 'utf8');

  const taroDir = join(TARO_DIR, id);
  for (const file of taroFiles) {
    const full = join(taroDir, file.path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, file.content, 'utf8');
  }

  report.push({
    id,
    name: page.name,
    nodes: compiled.nodes.length,
    files: ['index.html', 'reference.html', 'page.json', 'index.scss', 'geometry.json'],
  });

  console.log(`✓ ${page.name}  (${compiled.nodes.length} nodes) → dist/pages/${id}/`);
}

writeFileSync(join(PAGES_DIR, 'report.json'), JSON.stringify(report, null, 2), 'utf8');

// FR-48：出码站点根 /fonts/ ← public/fonts（单源拷贝，file/http 部署均可加载 Inter）
const FONT_SRC = join(ROOT, 'public', 'fonts');
const FONT_OUT = join(ROOT, 'dist', 'fonts');
mkdirSync(FONT_OUT, { recursive: true });
for (const f of readdirSync(FONT_SRC)) {
  copyFileSync(join(FONT_SRC, f), join(FONT_OUT, f));
}
console.log(`\n完成：${report.length} 个测试页面`);
console.log(`预览：dist/pages/<id>/index.html`);
console.log(`Taro：dist/taro/<id>/`);
