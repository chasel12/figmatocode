/**
 * 设计参考通道（skill 上传）
 *
 * 定位：把**任意前端 skill / 风格说明的纯文本**贴进来，作为「长什么样」的参考注入提示词。
 *
 * 为什么走纯文本而不是结构化解析：
 *   市面上的前端 skill（Workbuddy / Claude / Cursor 各一套目录结构，有的带 YAML frontmatter、
 *   有的带脚本、有的只有一段设计箴言）唯一稳定共有的层就是**文字层**。
 *   我们不需要理解它的结构，只需要它描述审美的那部分文字。这就是「强制兼容所有 skill」的落点
 *   ——不需要把 skill 包装成统一口径。
 *
 * 为什么**不**把它塞进 `system` 稳定前缀：
 *   参考内容按项目变、随时会改；进了稳定前缀就等于每次都让 prompt cache 失效
 *   （缓存命中要求前缀逐字节一致）。所以它走「易变尾部」，见 `promptPack.buildPrompt`。
 *
 * 边界（诚实的部分）：参考只影响审美，**不能**扩展输出契约。
 *   模型看完参考仍然只能输出 `AiPageDraft` 那份 JSON —— 否则「确定性编译」就没了。
 *   所以注入时前面必须加硬隔离句（在 promptPack 里），防止模型跟着 skill 里的代码示例写代码。
 */
import type { AiSkill } from './types';

export type { AiSkill };

/**
 * 单个参考的字符上限。
 *
 * 真实 skill 的量级：`taste-skill` 的 SKILL.md 是 **39.5K 字符**，
 * `web-design-guidelines` 同级。所以这个上限不是「够不够放」，而是「放哪一段」——
 * 见 `selectSkillBody`：直接截前 4K 只能拿到「这是什么/流程几步」，
 * 真正能指导出图的「House rules / Laws」通常在文件末尾，会被整段切掉。
 */
export const MAX_SKILL_CHARS = 12000;
/** 全部启用参考的注入上限。超过部分截断——宁可少给一点，也不要把输出预算挤没 */
export const MAX_SKILL_TOTAL_CHARS = 16000;
/** 最多保留的参考条数（再多也没有意义，只会互相稀释） */
export const MAX_SKILL_COUNT = 12;

/** 文件选择框接受的后缀：纯文本一律可读，不限于 .md */
export const SKILL_FILE_ACCEPT = '.md,.markdown,.mdx,.txt,.json';

const TRUNC_MARK = '\n…（参考过长，以下已截断）';

/** 去掉 YAML frontmatter（skill 的元数据头，对「长什么样」零信息量，白占 token） */
function stripFrontmatter(text: string): string {
  if (!text.startsWith('---')) return text;
  const lines = text.split('\n');
  // 只认「首行 --- 且在 40 行内闭合」这一种形态，避免误伤正文里的分隔线
  const end = lines.findIndex((l, i) => i > 0 && i < 40 && l.trim() === '---');
  return end > 0 ? lines.slice(end + 1).join('\n') : text;
}

/* ------------------------------------------------------------------ */
/* 超长参考的**确定性节选**                                            */
/* ------------------------------------------------------------------ */

/**
 * 「能指导出图」的章节标题特征词。
 *
 * 为什么要做这件事：真实 skill 通常 20~40K 字符，而提示词装不下全部。
 * 朴素的 `slice(0, N)` 拿到的是开头的自我介绍与工作流程（「先读 brief、再跑脚本」），
 * 那些内容对「这一页长什么样」几乎没有指导力；真正有指导力的是末尾的
 * House rules / Laws / 禁忌清单。实测 taste-skill 的 House rules 在 28K 处，
 * 按前 12K 截断**一个字都拿不到**。
 *
 * 所以按标题打分挑章节，而不是按位置切。这是纯字符串启发式，不调模型。
 */
const RULE_HINTS = [
  'rule', 'law', 'principle', 'house', 'style', 'guideline', 'constraint', 'convention',
  'checklist', 'must', 'never', 'avoid', 'token', 'palette', 'type', 'colour', 'color',
  '规则', '原则', '规范', '约束', '约定', '禁忌', '禁止', '必须', '清单', '要点', '设计语言', '配色', '字体',
];

interface SkillSection {
  /** 二级标题行（含 `## `），前言段为空串 */
  heading: string;
  body: string;
}

function splitSections(text: string): SkillSection[] {
  const lines = text.split('\n');
  const out: SkillSection[] = [];
  let heading = '';
  let buf: string[] = [];
  const flush = (): void => {
    const body = buf.join('\n').trim();
    if (heading || body) out.push({ heading, body });
  };
  for (const line of lines) {
    if (/^##\s+\S/.test(line)) {
      flush();
      heading = line.trim();
      buf = [];
    } else {
      buf.push(line);
    }
  }
  flush();
  return out;
}

function scoreSection(s: SkillSection): number {
  const title = s.heading.toLowerCase();
  let score = 0;
  for (const hint of RULE_HINTS) if (title.includes(hint)) score += 6;
  // 正文里出现祈使/禁令句式，说明这一段是在给约束，而不是在讲流程
  const body = s.body.toLowerCase();
  for (const hint of ['do not', 'never', 'must ', 'instead', '不要', '禁止', '必须', '避免']) {
    if (body.includes(hint)) score += 1;
  }
  return score;
}

/**
 * 在预算内挑章节：**前言永远留一段**（它通常就是这份参考的立场），
 * 其余按「像不像约束」打分从高到低填，输出仍按原文顺序（顺序乱掉模型会读不懂）。
 */
export function selectSkillBody(text: string, budget = MAX_SKILL_CHARS): string {
  if (text.length <= budget) return text;
  const sections = splitSections(text);
  if (sections.length < 3) return text.slice(0, budget) + TRUNC_MARK;

  const introBudget = Math.floor(budget * 0.3);
  const kept = new Set<number>();
  let used = 0;

  // 前言（第一个 section 若没有标题）或第一节，留一小段立场
  const intro = sections[0];
  const introText = `${intro.heading}\n${intro.body}`.trim();
  if (introText.length <= introBudget) {
    kept.add(0);
    used += introText.length + 2;
  } else {
    return `${introText.slice(0, introBudget)}${TRUNC_MARK}\n\n…`;
  }

  const ranked = sections
    .map((s, i) => ({ i, score: scoreSection(s), len: `${s.heading}\n${s.body}`.trim().length }))
    .slice(1)
    .sort((a, b) => b.score - a.score || a.i - b.i);

  for (const r of ranked) {
    if (r.score <= 0) break; // 没有约束特征的章节不再硬塞
    if (used + r.len > budget) continue;
    kept.add(r.i);
    used += r.len + 2;
  }

  const picked = sections.filter((_, i) => kept.has(i));
  return picked
    .map((s) => `${s.heading}\n${s.body}`.trim())
    .join('\n\n')
    .slice(0, budget) + TRUNC_MARK;
}

/** 归一化：去 BOM / 统一换行 / 去 frontmatter / 压缩空行 / 超长时按章节节选 */
export function normalizeSkillText(raw: string): string {
  let t = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  t = stripFrontmatter(t);
  t = t.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  return selectSkillBody(t);
}

/** 从文件名推一个默认标题（`high-end-visual-design.md` → `high-end-visual-design`） */
export function skillNameFromFile(fileName: string): string {
  return fileName.replace(/\.(md|markdown|mdx|txt|json)$/i, '').trim() || '未命名参考';
}

let seq = 0;
/** 造一条参考。id 只用于 React key 与删除定位，不做持久语义 */
export function makeSkill(name: string, text: string, enabled = true): AiSkill {
  seq += 1;
  return {
    id: `sk_${Date.now().toString(36)}_${seq.toString(36)}`,
    name: (name || '未命名参考').slice(0, 60),
    text: normalizeSkillText(text),
    enabled,
    addedAt: Date.now(),
  };
}

/**
 * 合成注入用的参考正文（已启用 + 非空 + 总长截断）。
 * 返回空串表示「这次不带参考」——调用方据此完全跳过该段，提示词与不带功能时逐字节一致。
 */
export function composeDesignRef(skills: AiSkill[]): string {
  const active = skills.filter((s) => s.enabled && s.text.trim());
  if (!active.length) return '';
  const parts: string[] = [];
  let used = 0;
  for (const s of active) {
    const body = normalizeSkillText(s.text);
    if (!body) continue;
    const block = `### ${s.name}\n${body}`;
    const room = MAX_SKILL_TOTAL_CHARS - used;
    if (block.length > room) {
      // 剩余空间太小时直接停，避免注入一段只有标题的残片
      if (room > 240) parts.push(block.slice(0, room) + TRUNC_MARK);
      break;
    }
    parts.push(block);
    used += block.length;
  }
  return parts.join('\n\n---\n\n');
}

/* ------------------------------------------------------------------ */
/* 存储：按工程名分桶存本机。工程文件里再带一份（便于分享）           */
/* ------------------------------------------------------------------ */

const STORAGE_PREFIX = 'ui-compiler.ai.skills.v1';

export function skillsStorageKey(projectName: string): string {
  return `${STORAGE_PREFIX}.${projectName || '未命名项目'}`;
}

/** 宽松校验：外部手改过的 localStorage 不能把面板搞崩 */
export function sanitizeSkills(raw: unknown): AiSkill[] {
  if (!Array.isArray(raw)) return [];
  const out: AiSkill[] = [];
  for (const item of raw) {
    const s = item as Partial<AiSkill> | null;
    if (!s || typeof s !== 'object') continue;
    if (typeof s.text !== 'string' || !s.text.trim()) continue;
    out.push({
      id: typeof s.id === 'string' && s.id ? s.id : `sk_${out.length}`,
      name: typeof s.name === 'string' && s.name ? s.name.slice(0, 60) : '未命名参考',
      text: s.text,
      enabled: s.enabled !== false,
      addedAt: typeof s.addedAt === 'number' ? s.addedAt : 0,
    });
    if (out.length >= MAX_SKILL_COUNT) break;
  }
  return out;
}

export function loadSkills(projectName: string): AiSkill[] {
  try {
    const raw = localStorage.getItem(skillsStorageKey(projectName));
    return raw ? sanitizeSkills(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

/** 落盘；失败（隐私模式/配额）静默——参考丢了不影响出图，不该弹窗打断 */
export function saveSkills(projectName: string, skills: AiSkill[]): void {
  const capped = skills.slice(0, MAX_SKILL_COUNT);
  try {
    const key = skillsStorageKey(projectName);
    if (!capped.length) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(capped));
  } catch {
    /* 静默 */
  }
  for (const fn of listeners) fn(projectName, capped);
}

/* ------------------------------------------------------------------ */
/* 变更订阅：打开工程时从文件恢复的参考，要让已挂载的面板跟着刷新      */
/* （面板只在工程名变化时重读 localStorage，同名工程打开就漏了）       */
/* ------------------------------------------------------------------ */

type SkillsListener = (projectName: string, skills: AiSkill[]) => void;
const listeners = new Set<SkillsListener>();

export function onSkillsChanged(fn: SkillsListener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * 打开工程时把包体里带的参考写回本机。
 *
 * 为什么参考不进 `UIProject`：`UIProject` 是 `.fig` 往返比对的口径（`scripts/fig-normalize.ts`），
 * 往里加键会让往返门禁多一个 Figma 表达不了的字段。参考属于「生成时的输入」而不是文档内容，
 * 放在包体顶层（`{version, project, aiSkills}`）即可分享，且完全不碰 AST 契约。
 */
export function restoreSkillsFromEnvelope(projectName: string, envelope: unknown): void {
  const env = envelope as { aiSkills?: unknown } | null;
  const incoming = sanitizeSkills(env?.aiSkills);
  if (!incoming.length) return;
  saveSkills(projectName, incoming);
}