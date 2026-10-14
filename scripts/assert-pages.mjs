import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// FR-12 产物结构断言：npm run pages 之后校验 dist/pages 与 dist/taro 完整性
const root = process.cwd();
const pagesDir = join(root, 'dist', 'pages');
const taroDir = join(root, 'dist', 'taro');

const REQUIRED_PAGE_FILES = ['index.html', 'reference.html', 'page.json', 'index.scss', 'geometry.json'];
const REQUIRED_TARO_FILES = [
  'package.json',
  'project.json',
  'src/app.config.ts',
  'src/app.ts',
  'src/app.scss',
  'src/pages/index/index.config.ts',
  'src/pages/index/index.tsx',
  'src/pages/index/index.scss',
];

const failures = [];
let checked = 0;

const report = JSON.parse(readFileSync(join(pagesDir, 'report.json'), 'utf8'));

for (const row of report) {
  for (const f of REQUIRED_PAGE_FILES) {
    checked += 1;
    if (!existsSync(join(pagesDir, row.id, f))) failures.push(`缺少 dist/pages/${row.id}/${f}`);
  }
  checked += 1;
  try {
    const pageJson = JSON.parse(readFileSync(join(pagesDir, row.id, 'page.json'), 'utf8'));
    if (pageJson.version !== 1 || !pageJson.page || !pageJson.page.root) {
      failures.push(`dist/pages/${row.id}/page.json 结构非法（version/root）`);
    }
  } catch (e) {
    failures.push(`dist/pages/${row.id}/page.json 无法解析: ${e.message}`);
  }
  for (const f of REQUIRED_TARO_FILES) {
    checked += 1;
    if (!existsSync(join(taroDir, row.id, f))) failures.push(`缺少 dist/taro/${row.id}/${f}`);
  }
}

for (const f of failures) console.error(`FAIL  ${f}`);
console.log(`assert-pages: ${checked - failures.length}/${checked} checks pass (${report.length} pages)`);
if (failures.length > 0) process.exitCode = 1;
