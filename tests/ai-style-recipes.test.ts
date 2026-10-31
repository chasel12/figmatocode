import { describe, it, expect } from 'vitest';
import { STYLE_RECIPES, styleRecipeBlock } from '../src/editor/ai/styleRecipes';
import { buildPrompt } from '../src/editor/ai/promptPack';
import { validateAiOutput } from '../src/editor/ai/contract';
import { draftToPage } from '../src/editor/ai/specToPage';
import type { AiPageDraft } from '../src/editor/ai/types';
import { PACKS } from '../src/tokens/packs';

/**
 * 配方示例必须逐条过契约。
 *
 * 这不是「顺手加的测试」：示例是喂给模型的**范本**，一条不合法的示例会教出
 * 一整批不合法的产出（模型会照着抄），比不给示例更糟。所以这里对**每个风格包**
 * 都跑一遍——配方里用了 `@color.primary` / `@color.accent` 这类跨包令牌，
 * 某个包缺一个键就会在真实生成里变成「未知风格令牌」违例。
 *
 * **两段都要跑**（踩过一次）：
 * `validateAiOutput` 只做 ajv schema 校验，`className` 是 string，schema 层永远合法；
 * 真正的「不支持的 class」检查在 `draftToPage` 的转换层。
 * 只跑前者会得到**假绿**——示例里写 `className="grid grid-cols-7"` 也照样通过，
 * 而真实生成时那是一条违例。
 */

/** 把裸节点包进最小合法 page，才能走完整契约校验 */
function wrap(node: unknown): unknown {
  return {
    kind: 'page',
    name: '配方校验',
    width: 375,
    height: 812,
    background: '@color.background',
    root: {
      kind: 'FRAME',
      layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG' },
      children: [node],
    },
  };
}

describe('styleRecipes 的示例本身必须合法', () => {
  it('配方条数与 id 唯一', () => {
    expect(STYLE_RECIPES.length).toBeGreaterThanOrEqual(8);
    const ids = STYLE_RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('每条 json 都是可解析的 JSON', () => {
    for (const r of STYLE_RECIPES) {
      expect(() => JSON.parse(r.json), `${r.id} 不是合法 JSON`).not.toThrow();
    }
  });

  for (const pack of PACKS) {
    it(`每条 json 都过两段校验（风格包 ${pack.id}）`, () => {
      for (const r of STYLE_RECIPES) {
        const raw = JSON.parse(r.json);
        // 第一段：ajv schema
        const checked = validateAiOutput(wrap(raw), { expect: 'page', pack });
        const schemaDetail = checked.violations.map((v) => `${v.path}: ${v.message}`).join(' | ');
        expect(checked.ok, `${r.id} 在 ${pack.id} 下 schema 不合法 → ${schemaDetail}`).toBe(true);
        expect(checked.violations, `${r.id} schema 违例 → ${schemaDetail}`).toHaveLength(0);

        // 第二段：转换层（className 白名单、令牌解析、图标存在性）
        const built = draftToPage(checked.data as AiPageDraft, { pack });
        const buildDetail = built.violations.map((v) => `${v.path}: ${v.message}`).join(' | ');
        expect(built.violations, `${r.id} 在 ${pack.id} 下转换违例 → ${buildDetail}`).toHaveLength(0);
      }
    });
  }

  it('配方覆盖了实测暴露的四个空字段', () => {
    const all = STYLE_RECIPES.map((r) => r.json).join('\n');
    for (const field of ['effects', 'decorations', 'states', 'grid']) {
      expect(all, `配方里没有任何一条示范 ${field}`).toContain(`"${field}"`);
    }
  });

  it('阴影用 rgba 而不是纯 hex', () => {
    const shadowRecipes = STYLE_RECIPES.filter((r) => r.json.includes('DROP_SHADOW'));
    expect(shadowRecipes.length).toBeGreaterThan(0);
    for (const r of shadowRecipes) {
      expect(r.json, `${r.id} 的阴影色必须是 rgba`).toContain('rgba(');
    }
  });
});

describe('styleRecipeBlock 拼装', () => {
  it('包含全部配方的触发语与 JSON', () => {
    const block = styleRecipeBlock('light');
    for (const r of STYLE_RECIPES) {
      expect(block, `缺少 ${r.id} 的触发语`).toContain(r.when);
      expect(block, `缺少 ${r.id} 的 JSON`).toContain(r.json);
    }
    expect(block).toContain('rgba(0,0,0,');
    expect(block).toContain('不算包外色值');
  });

  it('暗色底给更重的 α 提示，亮色底不给', () => {
    const light = styleRecipeBlock('light');
    const dark = styleRecipeBlock('dark');
    expect(dark).toContain('当前是暗色底');
    expect(dark).toContain('0.30~0.60');
    expect(light).toContain('当前是亮色底');
    expect(light).not.toContain('当前是暗色底');
  });
});

describe('提示词真的带上了配方（防回归）', () => {
  const built = buildPrompt({
    mode: 'page',
    pack: PACKS[0],
    userPrompt: '做一个健身计划app',
    viewport: { width: 375, height: 812 },
  });

  it('契约块声明了四个曾被漏掉的字段', () => {
    // 这四个字段在 schema / 转换器 / 编译器里全都有，唯独提示词里没有 →
    // 门禁全过、模型永远不用。这条测试就是防它再次消失。
    for (const field of ['decorations', 'states', 'transform', 'grid']) {
      expect(built.system, `提示词的契约块里没有 ${field}`).toContain(field);
    }
  });

  it('契约块声明了 border.gradient（唯一能表达渐变的地方）', () => {
    expect(built.system).toContain('gradient');
  });

  it('配方块进了稳定前缀（system），不是易变尾部', () => {
    expect(built.system).toContain('视觉配方');
    expect(built.user).not.toContain('视觉配方');
  });

  it('硬规则给阴影开了 rgba 例外', () => {
    expect(built.system).toContain('阴影');
    expect(built.system).toContain('rgba(0,0,0,');
  });

  it('className 的 grid 禁令与 style.grid 指引同时存在', () => {
    expect(built.system).toContain('grid 不能写进 className');
    expect(built.system).toContain('style.grid');
  });
});

describe('反向验证：校验器真的能抓住不合法示例', () => {
  it('className 里写 grid 会被转换层判违例（schema 层抓不到）', () => {
    const bad = {
      kind: 'FRAME',
      name: '日历',
      className: 'grid grid-cols-7 gap-1',
      children: [{ kind: 'TEXT', text: '一' }],
    };
    const pack = PACKS[0];
    const checked = validateAiOutput(wrap(bad), { expect: 'page', pack });
    expect(checked.ok, 'schema 层本来就该通过——这正是它抓不到的原因').toBe(true);

    const built = draftToPage(checked.data as AiPageDraft, { pack });
    const text = built.violations.map((v) => v.message).join(' ');
    expect(built.violations.length).toBeGreaterThan(0);
    expect(text).toMatch(/class|grid/i);
  });

  it('包外令牌会被转换层判违例', () => {
    const bad = { kind: 'FRAME', name: 'x', style: { background: '@color.not-exist' } };
    const checked = validateAiOutput(wrap(bad), { expect: 'page', pack: PACKS[0] });
    const built = draftToPage(checked.data as AiPageDraft, { pack: PACKS[0] });
    expect(built.violations.length).toBeGreaterThan(0);
  });
});
