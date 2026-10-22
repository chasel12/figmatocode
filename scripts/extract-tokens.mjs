/**
 * M7 · 风格包抽取（W2.5）
 *
 * 把三个开源包里的设计令牌**在构建期**抽成 `src/tokens/packs/*.tokens.json`：
 *   shadcn     ← @radix-ui/colors（MIT）语义色映射 + shadcn 令牌命名
 *   openprops  ← open-props（MIT）色板/字号/间距/圆角/阴影
 *   daisy-dark ← daisyui（MIT）dark 主题（oklch 经 culori 转 hex）
 *
 * 纪律（plan §0 红线③）：只接受 MIT/ISC/OFL 源；产物 JSON 落库，运行时零色彩计算。
 * 用法：node scripts/extract-tokens.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseColor, formatHex } from 'culori';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NM = path.join(root, 'node_modules');
const OUT_DIR = path.join(root, 'src/tokens/packs');

const read = (rel) => fs.readFileSync(path.join(NM, rel), 'utf8');

/** 任意 CSS 色 → #rrggbb（culori 处理 oklch/color()/hsl）；失败返回 undefined */
function toHex(value) {
  try {
    const parsed = parseColor(value.trim());
    if (!parsed) return undefined;
    const hex = formatHex(parsed);
    return hex ? hex.toLowerCase() : undefined;
  } catch {
    return undefined;
  }
}

/** 抓取 CSS 变量首个出现（radix 的 @supports P3 块在后面，取首个即 sRGB hex） */
function varsOf(css, pattern) {
  const out = {};
  const re = new RegExp(pattern, 'gi');
  let m;
  while ((m = re.exec(css))) {
    if (out[m[1]] === undefined) out[m[1]] = m[2];
  }
  return out;
}

const px = (v) => {
  const s = String(v).trim();
  if (s.endsWith('px')) return Number(parseFloat(s));
  if (s.endsWith('rem')) return Number((parseFloat(s) * 16).toFixed(2));
  return Number(parseFloat(s));
};

/* ---------------- 1. 基础数据源 ---------------- */

const radixScale = (name) => {
  const css = read(`@radix-ui/colors/${name}.css`);
  const raw = varsOf(css, `--${name}-(\\d+)\\s*:\\s*(#[0-9a-fA-F]{6})`);
  const out = {};
  for (const [k, v] of Object.entries(raw)) out[Number(k)] = v.toLowerCase();
  return out;
};

const slate = radixScale('slate');
const blue = radixScale('blue');
const red = radixScale('red');
const green = radixScale('green');
const amber = radixScale('amber');

const opColors = varsOf(read('open-props/colors.min.css'), '--([a-z]+-\\d+)\\s*:\\s*(#[0-9a-fA-F]{3,8})');
const opSizes = varsOf(read('open-props/sizes.min.css'), '--size-px-(\\d+)\\s*:\\s*(-?\\d+)px');
const opRadius = varsOf(read('open-props/borders.min.css'), '--radius-(\\d+)\\s*:\\s*([^;}]+)');
const opFontsCss = read('open-props/fonts.min.css');
const opShadowCss = read('open-props/shadows.min.css');

/** open-props 阴影值里带 var()/calc()，把可静态求值的部分折成字面量 */
const shadowStrengths = (() => {
  const base = /--shadow-strength:\s*([\d.]+)%/.exec(opShadowCss);
  const baseVal = base ? Number(base[1]) : 1;
  const map = { '--shadow-strength': `${baseVal}%` };
  for (const m of opShadowCss.matchAll(/--shadow-strength-(\d+):\s*calc\(var\(--shadow-strength\)\s*\+\s*([\d.]+)%\)/g)) {
    map[`--shadow-strength-${m[1]}`] = `${baseVal + Number(m[2])}%`;
  }
  return map;
})();

function normalizeShadow(raw) {
  let s = raw.replace(/var\(--shadow-color\)/g, '220 3% 15%');
  // 逐个替换已知的强度变量（先长名后短名，避免 --shadow-strength 抢先匹配 --shadow-strength-3）
  for (const key of Object.keys(shadowStrengths).sort((a, b) => b.length - a.length)) {
    s = s.replaceAll(`var(${key})`, shadowStrengths[key]);
  }
  s = s.replace(/calc\((\d+)%\s*\+\s*(\d+)%\)/g, (_, a, b) => `${Number(a) + Number(b)}%`);
  if (/var\(|calc\(/.test(s)) return undefined;
  return s.replace(/\s+/g, ' ').trim();
}

const opShadows = [];
for (let i = 1; i <= 6; i++) {
  const m = new RegExp(`--shadow-${i}\\s*:\\s*([^;}]+)`).exec(opShadowCss);
  if (m) {
    const v = normalizeShadow(m[1]);
    if (v) opShadows.push(v);
  }
}

const fontSizesRaw = varsOf(opFontsCss, '--font-size-(\\d+)\\s*:\\s*([\\d.]+rem)');
const opFontSizes = [...new Set(Object.values(fontSizesRaw)
  .map((v) => Math.round(px(v)))
  .filter((n) => n >= 10 && n <= 72))].sort((a, b) => a - b);

const opSpacings = Object.values(opSizes)
  .map((v) => Number(v))
  .filter((n) => n > 0 && n <= 160)
  .sort((a, b) => a - b);

const opRadii = Object.values(opRadius)
  .map((v) => (/^[\d.]+(px|rem)$/.test(v.trim()) ? px(v) : NaN))
  .filter((n) => Number.isFinite(n) && n <= 64)
  .sort((a, b) => a - b);

/* ---------------- 2. daisyUI dark 主题（oklch → hex） ---------------- */

const daisyDarkCss = read('daisyui/theme/dark.css');
const daisyVars = {};
for (const m of daisyDarkCss.matchAll(/--(color-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
  if (daisyVars[m[1]] === undefined) daisyVars[m[1]] = m[2].trim();
}

const daisyColors = {};
for (const [name, value] of Object.entries(daisyVars)) {
  const hex = toHex(value);
  if (hex) daisyColors[name.replace(/^color-/, '')] = hex;
}

/* ---------------- 3. 三套风格包 ---------------- */

const interStack = 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
const groteskStack = '"Space Grotesk", Inter, "PingFang SC", system-ui, sans-serif';

const shadcn = {
  id: 'shadcn',
  name: 'shadcn / Radix',
  source: '@radix-ui/colors + shadcn 令牌语义',
  license: 'MIT',
  mode: 'light',
  description: '中性灰阶 + 单一强调色的企业级后台语言：大量留白、细边框、8px 圆角、极轻阴影。',
  colors: {
    background: '#ffffff',
    foreground: slate[12],
    card: '#ffffff',
    'card-foreground': slate[12],
    popover: '#ffffff',
    'popover-foreground': slate[12],
    primary: blue[9],
    'primary-foreground': '#ffffff',
    secondary: slate[2],
    'secondary-foreground': slate[11],
    muted: slate[2],
    'muted-foreground': slate[9],
    accent: slate[3],
    'accent-foreground': slate[12],
    destructive: red[9],
    'destructive-foreground': '#ffffff',
    border: slate[4],
    input: slate[4],
    ring: blue[8],
    success: green[9],
    warning: amber[9],
  },
  fontSizes: [12, 13, 14, 16, 18, 20, 24, 30, 36],
  spacings: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64],
  radii: [0, 4, 6, 8, 12, 16, 24, 999],
  shadows: opShadows.slice(0, 4),
  fonts: [
    { family: 'Inter', stack: interStack, weights: [400, 500, 600, 700], source: '@fontsource-variable/inter', license: 'OFL-1.1' },
    { family: 'Space Grotesk', stack: groteskStack, weights: [400, 500, 600, 700], source: '@fontsource-variable/space-grotesk', license: 'OFL-1.1' },
  ],
};

const openprops = {
  id: 'openprops',
  name: 'Open Props',
  source: 'open-props',
  license: 'MIT',
  mode: 'light',
  description: '以尺度系统为核心的实用主义语言：8pt 间距阶、明显色阶差、圆角偏大、阴影分 6 档。',
  colors: {
    background: opColors['gray-0'],
    foreground: opColors['gray-9'],
    card: '#ffffff',
    'card-foreground': opColors['gray-9'],
    primary: opColors['blue-7'],
    'primary-foreground': '#ffffff',
    secondary: opColors['gray-1'],
    'secondary-foreground': opColors['gray-8'],
    muted: opColors['gray-1'],
    'muted-foreground': opColors['gray-6'],
    accent: opColors['orange-6'],
    'accent-foreground': '#ffffff',
    destructive: opColors['red-7'],
    'destructive-foreground': '#ffffff',
    border: opColors['gray-3'],
    input: opColors['gray-3'],
    ring: opColors['blue-5'],
    success: opColors['green-7'],
    warning: opColors['yellow-6'],
  },
  fontSizes: opFontSizes.length ? opFontSizes : [12, 14, 16, 18, 20, 24, 32, 40],
  spacings: opSpacings.length ? opSpacings : [4, 8, 12, 16, 20, 24, 32, 48, 64],
  radii: opRadii.length ? opRadii : [2, 5, 16, 32],
  shadows: opShadows,
  fonts: [
    { family: 'Space Grotesk', stack: groteskStack, weights: [400, 500, 600, 700], source: '@fontsource-variable/space-grotesk', license: 'OFL-1.1' },
    { family: 'Inter', stack: interStack, weights: [400, 500, 600, 700], source: '@fontsource-variable/inter', license: 'OFL-1.1' },
  ],
};

const daisyDark = {
  id: 'daisy-dark',
  name: 'daisyUI Dark',
  source: 'daisyui（dark 主题，oklch → hex by culori）',
  license: 'MIT',
  mode: 'dark',
  description: '暗色底 + 高饱和强调色：卡片比底色亮一档、文字近白、强调色用于主操作与状态。',
  colors: {
    background: daisyColors['base-100'],
    foreground: daisyColors['base-content'],
    card: daisyColors['base-200'],
    'card-foreground': daisyColors['base-content'],
    popover: daisyColors['base-200'],
    'popover-foreground': daisyColors['base-content'],
    primary: daisyColors.primary,
    'primary-foreground': daisyColors['primary-content'],
    secondary: daisyColors.secondary,
    'secondary-foreground': daisyColors['secondary-content'],
    muted: daisyColors['base-300'],
    'muted-foreground': daisyColors['neutral-content'],
    accent: daisyColors.accent,
    'accent-foreground': daisyColors['accent-content'],
    destructive: daisyColors.error,
    'destructive-foreground': daisyColors['error-content'],
    border: daisyColors['base-300'],
    input: daisyColors['base-300'],
    ring: daisyColors.info,
    success: daisyColors.success,
    warning: daisyColors.warning,
    info: daisyColors.info,
    neutral: daisyColors.neutral,
  },
  fontSizes: [12, 13, 14, 16, 18, 20, 24, 30, 36],
  spacings: [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64],
  radii: [0, 4, 8, 12, 16, 24, 999],
  shadows: opShadows.slice(2, 6),
  fonts: [
    { family: 'Space Grotesk', stack: groteskStack, weights: [400, 500, 600, 700], source: '@fontsource-variable/space-grotesk', license: 'OFL-1.1' },
    { family: 'Inter', stack: interStack, weights: [400, 500, 600, 700], source: '@fontsource-variable/inter', license: 'OFL-1.1' },
  ],
};

/* ---------------- 4. 落库 + 自检 ---------------- */

fs.mkdirSync(OUT_DIR, { recursive: true });

const packs = [shadcn, openprops, daisyDark];
for (const pack of packs) {
  // 自检：颜色必须全是合法 hex（否则出码端会静默出错）
  for (const [name, value] of Object.entries(pack.colors)) {
    if (!value || !/^#[0-9a-f]{6}$/.test(value)) {
      throw new Error(`[${pack.id}] 颜色 "${name}" 非法：${value}`);
    }
  }
  if (!pack.colors.background || !pack.colors.foreground) throw new Error(`[${pack.id}] 缺少 background/foreground`);
  const file = path.join(OUT_DIR, `${pack.id}.tokens.json`);
  fs.writeFileSync(file, `${JSON.stringify(pack, null, 2)}\n`, 'utf8');
  console.log(`✓ ${pack.id.padEnd(11)} colors=${Object.keys(pack.colors).length} fontSize=${pack.fontSizes.length} spacing=${pack.spacings.length} shadow=${pack.shadows.length}`);
}

// 字体族核对（OFL 源，本地分发）
const fontPkgs = ['@fontsource-variable/inter', '@fontsource-variable/space-grotesk'];
for (const p of fontPkgs) {
  const exists = fs.existsSync(path.join(NM, p));
  console.log(`${exists ? '✓' : '✗'} 字体包 ${p}`);
}
console.log(`\n产物目录：${path.relative(root, OUT_DIR)}`);
