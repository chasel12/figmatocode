/**
 * M7 · 契约闸门（W1）：JSON Schema 校验 + 中文违例摘要
 *
 * 分工（plan §3 选型表）：
 *  - **ts-json-schema-generator** 在构建期从 `types.ts` 生成 schema —— 合同与 schema 永不脱节；
 *  - **ajv** 在运行时把模型输出/导入文件挡在门外；
 *  - 本文件只写「违例 → 可喂回自修环的中文摘要」这段粘合逻辑。
 *
 * 生成命令：`npm run ai:schema`（产物 `contract.page.schema.json` / `contract.edit.schema.json` 落库）。
 */
import Ajv, { type ErrorObject } from 'ajv';
import pageSchema from './contract.page.schema.json';
import siteSchema from './contract.site.schema.json';
import editSchema from './contract.edit.schema.json';
import type { AiEditPlan, AiNodeSpec, AiPageDraft, AiSiteDraft, AiViolation } from './types';
import { resolveIconName } from './iconVocab';
import type { StylePack } from '../../tokens/packs/types';

const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });

const validatePageSchema = ajv.compile(pageSchema);
const validateSiteSchema = ajv.compile(siteSchema);
const validateEditSchema = ajv.compile(editSchema);

/** ajv instancePath → 可读路径：`/root/children/0/style` → `root.children[0].style` */
export function readablePath(instancePath: string): string {
  if (!instancePath) return '(根)';
  return instancePath
    .split('/')
    .slice(1)
    .reduce((acc, seg) => {
      if (/^\d+$/.test(seg)) return `${acc}[${seg}]`;
      return acc ? `${acc}.${seg}` : seg;
    }, '');
}

const TYPE_CN: Record<string, string> = {
  string: '字符串',
  number: '数字',
  integer: '整数',
  boolean: '布尔值',
  array: '数组',
  object: '对象',
};

/** 单条 ajv 错误 → 中文短句 */
export function describeAjvError(err: ErrorObject): string {
  const p = err.params as Record<string, unknown>;
  switch (err.keyword) {
    case 'required':
      return `缺少必填字段 "${String(p.missingProperty)}"`;
    case 'additionalProperties':
      return `出现契约外字段 "${String(p.additionalProperty)}"（不允许自由扩展）`;
    case 'enum':
      return `取值必须是 ${(p.allowedValues as unknown[]).map((v) => JSON.stringify(v)).join(' / ')} 之一`;
    case 'type':
      return `类型必须是${TYPE_CN[String(p.type)] ?? String(p.type)}`;
    case 'minItems':
      return `数组元素不能少于 ${String(p.limit)} 个`;
    case 'maxItems':
      return `数组元素不能多于 ${String(p.limit)} 个`;
    case 'minimum':
      return `不能小于 ${String(p.limit)}`;
    case 'maximum':
      return `不能大于 ${String(p.limit)}`;
    case 'minLength':
      return `长度不能小于 ${String(p.limit)}`;
    case 'anyOf':
    case 'oneOf':
      return '结构不匹配契约（字段组合不合法）';
    default:
      return err.message ?? '结构不合契约';
  }
}

/** 把 ajv 错误列表转成违例数组（同路径多错只留首条，避免刷屏） */
export function violationsFromAjv(errors: ErrorObject[] | null | undefined): AiViolation[] {
  const out: AiViolation[] = [];
  const seen = new Set<string>();
  for (const err of errors ?? []) {
    const path = readablePath(err.instancePath) + (err.keyword === 'required' ? '' : '');
    const key = `${path}|${err.keyword}|${JSON.stringify(err.params)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ path, kind: 'schema', message: describeAjvError(err) });
  }
  return out;
}

/* ---------------- 语义检查（schema 管不到的部分） ---------------- */

const COLOR_FIELDS = ['background', 'color'] as const;

function walkSpec(
  spec: AiNodeSpec,
  pack: StylePack,
  icons: Record<string, string> | undefined,
  path: string,
  violations: AiViolation[],
  counter: { nodes: number; depth: number },
  depth = 0,
): void {
  counter.nodes += 1;
  counter.depth = Math.max(counter.depth, depth);
  for (const field of COLOR_FIELDS) {
    const raw = spec.style?.[field];
    if (typeof raw === 'string' && raw.startsWith('@')) {
      const key = raw.slice(1).replace(/^color\./, '');
      if (!pack.colors[key]) {
        violations.push({
          path: `${path}.style.${field}`,
          kind: 'token',
          message: `未知令牌 "${raw}"：${pack.name} 只提供 ${Object.keys(pack.colors).slice(0, 8).join(' / ')} 等 ${Object.keys(pack.colors).length} 个令牌`,
        });
      }
    }
  }
  if (spec.style?.border?.color?.startsWith('@')) {
    const key = spec.style.border.color.slice(1).replace(/^color\./, '');
    if (!pack.colors[key]) {
      violations.push({ path: `${path}.style.border.color`, kind: 'token', message: `未知令牌 "${spec.style.border.color}"` });
    }
  }
  // 契约层表达不了的「按 kind 的条件必填」，在此补齐（schema 是单接口，无法 discriminated-union）
  if ((spec.kind === 'TEXT' || spec.kind === 'BUTTON') && !spec.text) {
    violations.push({ path: `${path}.text`, kind: 'schema', message: `${spec.kind} 节点必须给 text（文案）` });
  }
  if (spec.kind === 'VECTOR' && !spec.icon && !spec.vectorD) {
    violations.push({ path: `${path}`, kind: 'schema', message: 'VECTOR 节点必须给 icon（图标名）或 vectorD（路径）' });
  }
  /**
   * 只有 FRAME 能容纳子项。
   *
   * RECTANGLE 在 AST 里虽然是 ContainerNode（导入 Figma 时矩形确实可能挂子项），
   * 但**布局引擎与出码器都显式跳过它的子项**（layout.ts / html.ts 里那两处
   * `|| node.type === 'RECTANGLE'`）。AI 侧若放行，模型写的图标会被静默丢掉——
   * 实测就是这么丢掉了一整排分类图标。所以这里收紧到只剩 FRAME。
   */
  if (spec.kind !== 'FRAME' && spec.children?.length) {
    violations.push({
      path: `${path}.children`,
      kind: 'schema',
      message:
        spec.kind === 'RECTANGLE'
          ? 'RECTANGLE 是纯形状，不能有 children（子项会被出码器丢弃）；需要「圆底 + 图标」请用 FRAME（className 带 rounded-full bg-muted）'
          : `${spec.kind} 是叶子节点，不能有 children`,
    });
  }
  if (spec.icon) {
    if (!icons) {
      violations.push({ path: `${path}.icon`, kind: 'limit', message: `图标库未加载，无法解析 "${spec.icon}"` });
    } else {
      /**
       * 与 specToPage 走同一个归一器：模型写 `home`/`cart`/`notification` 这类
       * 「它以为存在」的名字时，别名表能兜住（house/shopping-cart/bell）。
       * 两处必须共用，否则 schema 闸门先拒、转换层的宽容永远用不上。
       */
      const hit = resolveIconName(spec.icon, icons);
      if (!hit.name) {
        violations.push({
          path: `${path}.icon`,
          kind: 'limit',
          message: `图标库中不存在 "${spec.icon}"，相近的有：${hit.candidates.join(' / ') || '（无）'}`,
        });
      }
    }
  }
  spec.children?.forEach((child, i) => walkSpec(child, pack, icons, `${path}.children[${i}]`, violations, counter, depth + 1));
}

export const MAX_NODES = 400;
export const MAX_DEPTH = 14;

export interface SemanticCheckOptions {
  pack: StylePack;
  icons?: Record<string, string>;
}

/** 生成草稿的语义检查（令牌/图标/规模上限） */
export function checkDraftSemantics(draft: AiPageDraft, opts: SemanticCheckOptions): AiViolation[] {
  const violations: AiViolation[] = [];
  const counter = { nodes: 0, depth: 0 };
  walkSpec(draft.root, opts.pack, opts.icons, 'root', violations, counter);
  if (counter.nodes > MAX_NODES) {
    violations.push({ path: 'root', kind: 'limit', message: `节点数 ${counter.nodes} 超过上限 ${MAX_NODES}，请合并重复结构` });
  }
  if (counter.depth > MAX_DEPTH) {
    violations.push({ path: 'root', kind: 'limit', message: `嵌套深度 ${counter.depth} 超过上限 ${MAX_DEPTH}，请减少层级` });
  }
  return violations;
}

/** 编辑计划的语义检查：目标节点必须存在（需要页面上下文） */
export function checkEditTargets(
  plan: AiEditPlan,
  existingIds: Set<string>,
  opts: SemanticCheckOptions = { pack: { colors: {} } as unknown as StylePack },
): AiViolation[] {
  const violations: AiViolation[] = [];
  plan.actions.forEach((a, i) => {
    if (a.op === 'add') {
      if (!existingIds.has(a.parentId)) {
        violations.push({ path: `actions[${i}].parentId`, kind: 'ref', message: `父容器 "${a.parentId}" 不存在` });
      }
      // 新增节点同样要过结构语义规则（否则会插进一棵不合规的子树）
      const counter = { nodes: 0, depth: 0 };
      walkSpec(a.node, opts.pack, opts.icons, `actions[${i}].node`, violations, counter);
      return;
    }
    /**
     * `group` 只有 `targetIds`，批量 `updateStyle`/`updateLayout` 两个都可能有。
     * 统一收成一个列表逐个查，避免每加一种批量 op 就在这漏一次（漏了 = 引用不存在也能过）。
     */
    const targets =
      a.op === 'group'
        ? a.targetIds
        : [a.targetId, ...(a.op === 'updateStyle' || a.op === 'updateLayout' ? (a.targetIds ?? []) : [])].filter(
            (id): id is string => typeof id === 'string',
          );
    if (targets.length === 0) {
      violations.push({ path: `actions[${i}]`, kind: 'schema', message: `${a.op} 至少要指定一个目标节点` });
    }
    for (const id of targets) {
      if (!existingIds.has(id)) {
        violations.push({ path: `actions[${i}].targetId`, kind: 'ref', message: `目标节点 "${id}" 不存在` });
      }
    }
    if (a.op === 'move' && !existingIds.has(a.parentId)) {
      violations.push({ path: `actions[${i}].parentId`, kind: 'ref', message: `目标父容器 "${a.parentId}" 不存在` });
    }
    /**
     * `style`/`layout` 改成可选（好让模型只写 className），代价是「两个都没写」也能过 schema——
     * 那是一条什么都不做的空指令，会让用户以为改成功了。这里补上语义检查。
     */
    if (a.op === 'updateStyle' && !a.style && !a.className) {
      violations.push({ path: `actions[${i}]`, kind: 'schema', message: 'updateStyle 至少要给 style 或 className 之一' });
    }
    if (a.op === 'updateLayout' && !a.layout && !a.className) {
      violations.push({ path: `actions[${i}]`, kind: 'schema', message: 'updateLayout 至少要给 layout 或 className 之一' });
    }
  });
  return violations;
}

/* ---------------- 整站规划 ---------------- */

/** 页数上下限：少于 2 不叫整站；多于 6 则单页预算被摊薄，每页都会残 */
export const SITE_MIN_PAGES = 2;
export const SITE_MAX_PAGES = 6;
/** 页面名字符上限（导航项放不下更长的） */
export const SITE_NAME_MAX = 8;

/**
 * 整站规划的语义检查。
 *
 * schema 只能管形状（有没有 name/brief、pages 是不是数组），管不了这三件事：
 *  - 页面名**重复** → 导航串联会连到错的页（`wireNavigation` 按名字匹配，重名必然二选一）；
 *  - 页面名**太长** → 导航栏塞不下，模型会自己缩写，于是文案与页面名对不上、连不上；
 *  - 入口页**不是恰好一个** → 演示时不知道该从哪页开始。
 * 这三条都是「形状合法但语义错」，必须在闸门里拦，不能等用户点了发现跳不过去。
 */
export function checkSitePlan(draft: AiSiteDraft): AiViolation[] {
  const violations: AiViolation[] = [];
  const pages = draft.pages ?? [];

  if (pages.length < SITE_MIN_PAGES) {
    violations.push({ path: 'pages', kind: 'limit', message: `整站至少 ${SITE_MIN_PAGES} 页，当前 ${pages.length} 页` });
  }
  if (pages.length > SITE_MAX_PAGES) {
    violations.push({ path: 'pages', kind: 'limit', message: `整站最多 ${SITE_MAX_PAGES} 页，当前 ${pages.length} 页（请合并次要页）` });
  }

  const seen = new Map<string, number>();
  pages.forEach((p, i) => {
    const name = (p.name ?? '').trim();
    if (!name) {
      violations.push({ path: `pages[${i}].name`, kind: 'schema', message: '页面名不能为空' });
      return;
    }
    if (name.length > SITE_NAME_MAX) {
      violations.push({
        path: `pages[${i}].name`,
        kind: 'limit',
        message: `页面名「${name}」超过 ${SITE_NAME_MAX} 字，导航栏放不下，请改成短名`,
      });
    }
    /**
     * 页面名不允许带空格：模型常把品牌名拼进去写成「零食小铺 首页」。
     *
     * 后果不是难看，是**结构性失配**——导航栏识别（`NAV_WORDS`）和页面跳转
     * （「文案 == 页面名」）都按整串比较，「零食小铺 首页」既进不了 tabBar，
     * 也没有任何按钮会写这五个字，那一页在产物里彻底孤立。
     * 实测：零食商城整站生成把入口页命名成「零食小铺 首页」，6 页里 3 条导航全断。
     */
    if (/\s/.test(name)) {
      violations.push({
        path: `pages[${i}].name`,
        kind: 'schema',
        message: `页面名「${name}」含空格。页面名会原样用作导航文案并参与跳转匹配，请只写页面本身（如「首页」），品牌名放进页面内容里`,
      });
    }
    if (!(p.brief ?? '').trim()) {
      violations.push({ path: `pages[${i}].brief`, kind: 'schema', message: `页面「${name}」缺少 brief（这一页放什么）` });
    }
    const prev = seen.get(name);
    if (prev !== undefined) {
      violations.push({ path: `pages[${i}].name`, kind: 'schema', message: `页面名「${name}」与 pages[${prev}] 重复，导航无法区分` });
    } else {
      seen.set(name, i);
    }
  });

  const entries = pages.filter((p) => p.entry === true);
  if (entries.length > 1) {
    violations.push({ path: 'pages', kind: 'schema', message: `入口页只能有一个，当前标了 ${entries.length} 个` });
  }
  return violations;
}

/** 入口页下标（未标 entry 时取第一页） */
export function entryPageIndex(draft: AiSiteDraft): number {
  const i = (draft.pages ?? []).findIndex((p) => p.entry === true);
  return i >= 0 ? i : 0;
}

/* ---------------- 统一入口 ---------------- */

export interface ValidateOptions {
  /** 期望的输出类型：page=新页面 / site=整站规划 / edit=修改计划 / auto=按 kind 字段判断 */
  expect: 'page' | 'site' | 'edit' | 'auto';
  pack: StylePack;
  icons?: Record<string, string>;
  /** 编辑模式下当前页已有节点 id（校验引用） */
  existingIds?: Set<string>;
}

export interface ValidateResult {
  ok: boolean;
  kind: 'page' | 'site' | 'edit' | 'unknown';
  /** 通过 schema 后的原始对象（未归一化） */
  data?: AiPageDraft | AiSiteDraft | AiEditPlan;
  violations: AiViolation[];
}

export function validateAiOutput(raw: unknown, opts: ValidateOptions): ValidateResult {
  const kindField = (raw as { kind?: unknown } | null)?.kind;
  const kind: 'page' | 'site' | 'edit' | 'unknown' =
    opts.expect === 'auto'
      ? kindField === 'edit'
        ? 'edit'
        : kindField === 'page'
          ? 'page'
          : kindField === 'site'
            ? 'site'
            : 'unknown'
      : opts.expect;

  if (kind === 'unknown') {
    return {
      ok: false,
      kind,
      violations: [{ path: '(根)', kind: 'schema', message: '缺少 kind 字段：必须是 "page" / "site" / "edit"' }],
    };
  }

  const validator = kind === 'page' ? validatePageSchema : kind === 'site' ? validateSiteSchema : validateEditSchema;
  const valid = validator(raw);
  if (!valid) return { ok: false, kind, violations: violationsFromAjv(validator.errors) };

  if (kind === 'page') {
    const draft = raw as unknown as AiPageDraft;
    const semantic = checkDraftSemantics(draft, opts);
    return { ok: semantic.length === 0, kind, data: draft, violations: semantic };
  }

  if (kind === 'site') {
    const draft = raw as unknown as AiSiteDraft;
    const semantic = checkSitePlan(draft);
    return { ok: semantic.length === 0, kind, data: draft, violations: semantic };
  }

  const plan = raw as unknown as AiEditPlan;
  const semantic = opts.existingIds ? checkEditTargets(plan, opts.existingIds, { pack: opts.pack, icons: opts.icons }) : [];
  if (plan.actions.length === 0) {
    semantic.push({ path: 'actions', kind: 'schema', message: 'actions 不能为空' });
  }
  return { ok: semantic.length === 0, kind, data: plan, violations: semantic };
}

/** 违例 → 自修提示词段落（限条数，避免二次超长） */
export function summarizeViolations(violations: AiViolation[], max = 12): string {
  const lines = violations.slice(0, max).map((v) => `- [${v.kind}] ${v.path}: ${v.message}`);
  if (violations.length > max) lines.push(`- …另有 ${violations.length - max} 条同类问题未列出`);
  return lines.join('\n');
}

/** 从模型文本中抠出 JSON（容忍 ```json 围栏与前后寒暄） */
export function extractJson(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return { ok: false, error: '响应中没有 JSON 对象' };
  const body = candidate.slice(start, end + 1);
  try {
    return { ok: true, value: JSON.parse(body) as unknown };
  } catch (err) {
    return { ok: false, error: `JSON 解析失败：${(err as Error).message}` };
  }
}
