/**
 * 设计参考通道（skill 上传）
 *
 * 这一组断言的重点不是「字符串拼对了」，而是三条**边界**：
 *  1. 不带参考时，提示词必须与没有该功能时**逐字节一致**（`system` 尤其重要：
 *     它进了稳定前缀，差一个字节就等于每次请求都让 prompt cache 失效）；
 *  2. 参考**只能**出现在 `user` 段，永远不许渗进 `system`；
 *  3. 隔离句必须在场——skill 正文天然带 HTML/CSS 示例，少了这句话，
 *     模型会把示例当输出格式，契约闸门会把整页判违例（自修两轮也救不回来）。
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  MAX_SKILL_CHARS,
  MAX_SKILL_COUNT,
  MAX_SKILL_TOTAL_CHARS,
  composeDesignRef,
  loadSkills,
  makeSkill,
  normalizeSkillText,
  onSkillsChanged,
  restoreSkillsFromEnvelope,
  sanitizeSkills,
  saveSkills,
  selectSkillBody,
  skillNameFromFile,
} from '../src/editor/ai/skills';
import { buildPrompt, designRefBlock } from '../src/editor/ai/promptPack';
import { parseClassNames } from '../src/editor/ai/tailwind';
import { parseProject, serializeProject, upgradeProjectV1 } from '../src/editor/project';
import { getPack } from '../src/tokens/packs';
import { createPage } from '../src/schema/factory';
import type { AiSkill } from '../src/editor/ai/types';

const pack = getPack('shadcn');

/* ---------------- localStorage 桩（测试环境是 node，没有 DOM） ---------------- */

function installLocalStorage(): void {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: (i: number) => [...store.keys()][i] ?? null,
    get length() {
      return store.size;
    },
  };
}

beforeEach(() => {
  installLocalStorage();
});

/* ---------------- 归一化 ---------------- */

describe('normalizeSkillText', () => {
  it('去 BOM、统一换行、压掉三连空行', () => {
    expect(normalizeSkillText('\uFEFFa\r\n\r\n\r\n\r\nb')).toBe('a\n\nb');
  });

  it('去掉 YAML frontmatter（元数据对「长什么样」零信息量）', () => {
    const raw = ['---', 'name: high-end-visual-design', 'tags: [ui]', '---', '', '# 设计原则', '层次靠阴影'].join('\n');
    expect(normalizeSkillText(raw)).toBe('# 设计原则\n层次靠阴影');
  });

  it('正文里的分隔线不被误当成 frontmatter（只有首行 --- 才认）', () => {
    const raw = ['# 标题', '---', '正文'].join('\n');
    expect(normalizeSkillText(raw)).toBe(raw);
  });

  it('超长截断并留标记', () => {
    const out = normalizeSkillText('字'.repeat(MAX_SKILL_CHARS + 500));
    expect(out.length).toBeLessThan(MAX_SKILL_CHARS + 40);
    expect(out).toContain('已截断');
  });

  it('文件名 → 默认标题', () => {
    expect(skillNameFromFile('high-end-visual-design.md')).toBe('high-end-visual-design');
    expect(skillNameFromFile('风格.TXT')).toBe('风格');
  });
});

/**
 * 超长参考的节选
 *
 * 这一组锁的是「截断位置」而不是「截断长度」：真实 skill 20~40K 字符，
 * 朴素的 slice(0,N) 只拿到开头的自我介绍与流程，末尾的 House rules / Laws 全丢。
 */
describe('selectSkillBody（超长参考按章节节选）', () => {
  const filler = (tag: string, n: number): string => `## ${tag}\n${'流程说明。'.repeat(n)}`;

  it('不超预算时原样返回（不做任何改写）', () => {
    const text = '## 短\n内容';
    expect(selectSkillBody(text, 500)).toBe(text);
  });

  it('超预算时保住「规则/法则」章节，丢掉纯流程章节', () => {
    const text = [
      '## 这份参考的立场\n模型默认会做成平均值。',
      filler('The run', 200),
      filler('Files', 200),
      '## House rules\n不要阴影。不要渐变。',
      '## Laws of the craft\n字号只用两三级。',
    ].join('\n\n');
    const out = selectSkillBody(text, 1200);
    expect(out).toContain('House rules');
    expect(out).toContain('Laws of the craft');
    expect(out).toContain('这份参考的立场');
    expect(out).not.toContain('## Files');
    expect(out.length).toBeLessThan(1400);
  });

  it('输出保持原文顺序（顺序乱掉模型读不懂）', () => {
    const text = [
      '## 前言\n立场。',
      filler('The run', 200),
      '## House rules\n规则。',
      '## Laws\n法则。',
    ].join('\n\n');
    const out = selectSkillBody(text, 900);
    expect(out.indexOf('House rules')).toBeLessThan(out.indexOf('Laws'));
  });

  it('没有可识别章节的长文本退化为硬截断（不留半句空转）', () => {
    const out = selectSkillBody('纯文本'.repeat(4000), 600);
    expect(out.length).toBeLessThan(700);
    expect(out).toContain('已截断');
  });
});

/* ---------------- 合成 ---------------- */

describe('composeDesignRef', () => {
  it('空列表 / 全部关闭 / 全空文本 → 空串（调用方据此完全跳过该段）', () => {
    expect(composeDesignRef([])).toBe('');
    expect(composeDesignRef([makeSkill('a', '内容', false)])).toBe('');
    expect(composeDesignRef([makeSkill('a', '   ')])).toBe('');
  });

  it('多条用分隔线拼接，每条带标题', () => {
    const ref = composeDesignRef([makeSkill('视觉', '阴影要分三层'), makeSkill('排版', '留白要够')]);
    expect(ref).toContain('### 视觉\n阴影要分三层');
    expect(ref).toContain('### 排版\n留白要够');
    expect(ref).toContain('\n\n---\n\n');
  });

  it('总长有上限，超出的被截断而不是整段塞进去', () => {
    const big = makeSkill('大', '字'.repeat(MAX_SKILL_CHARS));
    const ref = composeDesignRef([big, big, big]);
    expect(ref.length).toBeLessThan(MAX_SKILL_TOTAL_CHARS + 200);
  });

  it('只注入启用的那些', () => {
    const on = makeSkill('开', 'AAA');
    const off = { ...makeSkill('关', 'BBB'), enabled: false };
    const ref = composeDesignRef([on, off]);
    expect(ref).toContain('AAA');
    expect(ref).not.toContain('BBB');
  });
});

/* ---------------- 提示词注入（核心边界） ---------------- */

describe('提示词注入', () => {
  const base = { mode: 'page' as const, pack, userPrompt: '做一个健身计划页', viewport: { width: 375, height: 812 } };

  it('不带参考时 user 段不出现参考块，且 system 完全不含参考字样', () => {
    const { system, user } = buildPrompt(base);
    expect(user).not.toContain('设计参考');
    expect(system).not.toContain('设计参考');
  });

  it('带参考时 system **逐字节不变**（稳定前缀 / 缓存前缀不受影响）', () => {
    const plain = buildPrompt(base);
    const withRef = buildPrompt({ ...base, designRef: '阴影分三层：0 1px 2px、0 8px 24px、内发光' });
    expect(withRef.system).toBe(plain.system);
    expect(withRef.user).not.toBe(plain.user);
  });

  it('参考正文进 user 段，并且被隔离句包住', () => {
    const { user } = buildPrompt({ ...base, designRef: '阴影分三层' });
    expect(user).toContain('阴影分三层');
    expect(user).toContain('它不是输出格式示例');
    expect(user).toContain('<<<参考开始');
    expect(user).toContain('参考结束>>>');
    // 顺序：任务头 → 参考 → 收尾指令（参考在收尾指令之前，避免冲掉「只输出 JSON」）
    expect(user.indexOf('阴影分三层')).toBeLessThan(user.indexOf('现在只输出一个 kind=page'));
  });

  it('参考里带 HTML/代码也不会污染 system 段', () => {
    const nasty = '<div class="card" style="box-shadow:0 8px 24px #000">示例</div>\n```css\n.card{color:red}\n```';
    const { system, user } = buildPrompt({ ...base, designRef: nasty });
    expect(user).toContain('<div class="card"');
    expect(system).not.toContain('box-shadow');
    expect(system).not.toContain('<div');
  });

  it('编辑模式同样带参考（否则改同一页时风格会跑掉）', () => {
    const { user } = buildPrompt({
      ...base,
      mode: 'edit',
      designRef: '圆角一律 16',
      selection: { pageId: 'p1', pageName: '首页', targets: [], outline: '- p1 [PAGE] 首页' },
    });
    expect(user).toContain('圆角一律 16');
  });

  it('designRefBlock 空串 → 空串（不留下只有标题的空壳段）', () => {
    expect(designRefBlock('')).toBe('');
    expect(designRefBlock('   \n  ')).toBe('');
  });

  /**
   * 配色放行（2026-10-29）。
   *
   * 原来这里写的是「参考里出现的新色值一律不采纳」，理由是「skill 自带色板会冲掉令牌体系」。
   * 但配色恰恰是风格类 skill 的主要内容，否决它等于让整个通道对风格 skill 失效。
   * 三组 A/B 实测：珊瑚红 #FF4F40 在 A 产物里 0 命中、24 条色条全填成同一个包令牌色。
   *
   * 这条测试锁住两件事：
   *  ① 不许再出现「色值不采纳」这类否决；
   *  ② 但「不是输出格式 / 不许吐代码」的隔离句必须还在——那才是这个函数存在的理由。
   */
  it('配色要放行，但「不是输出格式」的隔离不能松', () => {
    const block = designRefBlock('# 风格\n主色 #FF4F40，圆角 32px');

    // ① 不许否决色值
    expect(block).not.toContain('新色值一律不采纳');
    expect(block).not.toContain('颜色仍然只能用风格包令牌');
    // 要明确「配色是参考的职责范围」
    expect(block).toContain('配色是参考的职责范围');

    // ② 隔离句必须还在（这三句缺一句都可能让模型开始吐 HTML）
    expect(block).toContain('不是输出格式');
    expect(block).toContain('一个字节的代码都不要写');
    expect(block).toContain('不要改写上文令牌表的含义');

    // ③ 「以契约为准」只限定在结构 / 字段 / 格式，不能无限扩张
    expect(block).toContain('结构、字段名、输出格式');

    // ④ 正文原样带上，不裁剪
    expect(block).toContain('主色 #FF4F40，圆角 32px');
  });

  /**
   * 反向验证：显式 hex 真的能过校验，否则「放行」只是句空话。
   * 走的是 className 任意值通道（`bg-[#hex]`），与 `designRefBlock` 引导的写法一致。
   */
  it('放行的 hex 确实能进 AST（不是只改了提示词）', () => {
    const r = parseClassNames('bg-[#FF4F40] text-[#091723]');
    expect(r.unknown).toEqual([]);
    expect(r.style.background).toBe('#FF4F40');
    expect(r.style.color).toBe('#091723');
  });
});

/* ---------------- 存储 ---------------- */

describe('存储与恢复', () => {
  it('按工程名分桶，互不串味', () => {
    saveSkills('工程A', [makeSkill('a', 'AAA')]);
    saveSkills('工程B', [makeSkill('b', 'BBB')]);
    expect(loadSkills('工程A').map((s) => s.name)).toEqual(['a']);
    expect(loadSkills('工程B').map((s) => s.name)).toEqual(['b']);
    expect(loadSkills('工程C')).toEqual([]);
  });

  it('清空后键被删除（不留空数组占配额）', () => {
    saveSkills('工程A', [makeSkill('a', 'AAA')]);
    saveSkills('工程A', []);
    expect(loadSkills('工程A')).toEqual([]);
  });

  it('脏数据不崩：丢空文本、补默认值、条数封顶', () => {
    const dirty = [
      null,
      { text: '' },
      { name: 'ok', text: '正文' },
      ...Array.from({ length: MAX_SKILL_COUNT + 5 }, (_, i) => ({ name: `n${i}`, text: `t${i}` })),
    ];
    const out = sanitizeSkills(dirty);
    expect(out).toHaveLength(MAX_SKILL_COUNT);
    expect(out[0].name).toBe('ok');
    expect(out[0].enabled).toBe(true);
    expect(sanitizeSkills('不是数组')).toEqual([]);
  });

  it('打开工程时把包体里的参考写回本机；包体没有则不动本机', () => {
    saveSkills('工程A', [makeSkill('本机', 'LOCAL')]);
    restoreSkillsFromEnvelope('工程A', { aiSkills: [{ name: '文件', text: 'FROM_FILE' }] });
    expect(loadSkills('工程A').map((s) => s.text)).toEqual(['FROM_FILE']);

    saveSkills('工程A', [makeSkill('本机', 'LOCAL')]);
    restoreSkillsFromEnvelope('工程A', { version: 2, project: {} });
    expect(loadSkills('工程A').map((s) => s.text)).toEqual(['LOCAL']);
  });

  it('保存/恢复会通知订阅者（面板才能跟着刷新）', () => {
    const seen: string[][] = [];
    const off = onSkillsChanged((name, skills) => seen.push(skills.map((s) => s.text)));
    saveSkills('工程A', [makeSkill('a', 'AAA')]);
    off();
    saveSkills('工程A', [makeSkill('b', 'BBB')]);
    expect(seen).toEqual([['AAA']]);
  });
});

/* ---------------- 工程文件往返 ---------------- */

describe('工程文件往返', () => {
  const project = () => upgradeProjectV1(createPage('首页'), '测试工程');

  it('没有参考时不写 aiSkills 键（老工程文件逐字节不变）', () => {
    const env = serializeProject(project());
    expect('aiSkills' in env).toBe(false);
  });

  it('有参考时写进包体顶层，且**不进 UIProject**', () => {
    const skills: AiSkill[] = [makeSkill('视觉', '阴影分三层')];
    const env = serializeProject(project(), skills);
    expect(env.aiSkills).toHaveLength(1);
    // 关键：UIProject 是 .fig 往返比对的口径，多一个键就等于给门禁加一个 Figma 表达不了的字段
    expect('aiSkills' in env.project).toBe(false);
  });

  it('save → parse 往返拿得回参考', () => {
    const skills: AiSkill[] = [makeSkill('视觉', '阴影分三层'), { ...makeSkill('排版', '留白'), enabled: false }];
    const raw = JSON.stringify(serializeProject(project(), skills));
    const back = parseProject(raw);
    expect(back.aiSkills.map((s) => s.name)).toEqual(['视觉', '排版']);
    expect(back.aiSkills[1].enabled).toBe(false);
    expect(back.project.pages).toHaveLength(1);
  });

  it('老文件（无 aiSkills）解析出空数组，不报错', () => {
    const raw = JSON.stringify(serializeProject(project()));
    expect(parseProject(raw).aiSkills).toEqual([]);
  });
});
