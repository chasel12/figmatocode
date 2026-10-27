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
import editSchema from './contract.edit.schema.json';
import type { AiEditPlan, AiNodeSpec, AiPageDraft, AiViolation } from './types';
import { resolveIconName } from './iconVocab';
import type { StylePack } from '../../tokens/packs/types';

const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });

const validatePageSchema = ajv.compile(pageSchema);
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
    if (!existingIds.has(a.targetId)) {
      violations.push({ path: `actions[${i}].targetId`, kind: 'ref', message: `目标节点 "${a.targetId}" 不存在` });
    }
    if (a.op === 'move' && !existingIds.has(a.parentId)) {
      violations.push({ path: `actions[${i}].parentId`, kind: 'ref', message: `目标父容器 "${a.parentId}" 不存在` });
    }
  });
  return violations;
}

/* ---------------- 统一入口 ---------------- */

export interface ValidateOptions {
  /** 期望的输出类型：page=新页面 / edit=修改计划 / auto=按 kind 字段判断 */
  expect: 'page' | 'edit' | 'auto';
  pack: StylePack;
  icons?: Record<string, string>;
  /** 编辑模式下当前页已有节点 id（校验引用） */
  existingIds?: Set<string>;
}

export interface ValidateResult {
  ok: boolean;
  kind: 'page' | 'edit' | 'unknown';
  /** 通过 schema 后的原始对象（未归一化） */
  data?: AiPageDraft | AiEditPlan;
  violations: AiViolation[];
}

export function validateAiOutput(raw: unknown, opts: ValidateOptions): ValidateResult {
  const kindField = (raw as { kind?: unknown } | null)?.kind;
  const kind: 'page' | 'edit' | 'unknown' =
    opts.expect === 'auto' ? (kindField === 'edit' ? 'edit' : kindField === 'page' ? 'page' : 'unknown') : opts.expect;

  if (kind === 'unknown') {
    return {
      ok: false,
      kind,
      violations: [{ path: '(根)', kind: 'schema', message: '缺少 kind 字段：必须是 "page" 或 "edit"' }],
    };
  }

  const validator = kind === 'page' ? validatePageSchema : validateEditSchema;
  const valid = validator(raw);
  if (!valid) return { ok: false, kind, violations: violationsFromAjv(validator.errors) };

  if (kind === 'page') {
    const draft = raw as unknown as AiPageDraft;
    const semantic = checkDraftSemantics(draft, opts);
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
