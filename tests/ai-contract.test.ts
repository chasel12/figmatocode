import { describe, expect, it } from 'vitest';
import pageSchema from '../src/editor/ai/contract.page.schema.json';
import editSchema from '../src/editor/ai/contract.edit.schema.json';
import { extractJson, readablePath, summarizeViolations, validateAiOutput } from '../src/editor/ai/contract';
import { draftToPage } from '../src/editor/ai/specToPage';
import { getPack, PACKS } from '../src/tokens/packs';
import fewshots from '../src/editor/ai/fewshots.json';

const pack = getPack('shadcn');

const basePage = () => ({
  kind: 'page',
  name: '测试页',
  width: 375,
  height: 812,
  background: '@color.background',
  root: {
    kind: 'FRAME',
    layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', padding: [0, 0, 0, 0], gap: 0 },
    children: [{ kind: 'TEXT', text: '标题', style: { fontSize: 24, fontWeight: 700, color: '@color.foreground' } }],
  },
});

describe('M7 W1 契约闸门 · schema 生成物自检', () => {
  it('两份 schema 由生成器产出且为 draft-07、顶层对象关闭额外字段', () => {
    for (const s of [pageSchema, editSchema]) {
      expect(s.$schema).toBe('http://json-schema.org/draft-07/schema#');
      expect((s as { additionalProperties?: boolean }).additionalProperties).toBe(false);
    }
    expect(Object.keys(pageSchema.properties)).toEqual(expect.arrayContaining(['kind', 'name', 'root']));
    expect(Object.keys(editSchema.properties)).toEqual(expect.arrayContaining(['kind', 'summary', 'actions']));
  });

  it('19 个 demo 页归一化语料全部通过 schema（plan W1 验收）', () => {
    expect(fewshots.length).toBe(19);
    for (const entry of fewshots) {
      const parsed = JSON.parse(entry.spec) as unknown;
      const res = validateAiOutput(parsed, { expect: 'page', pack });
      expect(res.ok, `${entry.id}: ${summarizeViolations(res.violations)}`).toBe(true);
    }
  });
});

/**
 * few-shot 语料是模型的**模板**，不是文档。实测（2026-10-26）只改契约文字、
 * 样例仍手写 layout 时，模型输出 className 使用率是 0%——它照抄样例，不读说明。
 * 所以这两条是「表达通道真的被用上」的机械保证，不是风格偏好。
 */
describe('few-shot 语料本身必须用 className 写', () => {
  interface CorpusNode {
    className?: string;
    layout?: unknown;
    children?: CorpusNode[];
  }
  const walk = (n: CorpusNode, cb: (n: CorpusNode) => void): void => {
    cb(n);
    (n.children ?? []).forEach((c) => walk(c, cb));
  };
  const roots = (): CorpusNode[] => fewshots.map((e) => (JSON.parse(e.spec) as { root: CorpusNode }).root);

  it('className 覆盖率 ≥ 90%（低于这个数，模型会按 layout 写）', () => {
    let total = 0;
    let withClass = 0;
    for (const root of roots()) walk(root, (n) => { total += 1; if (n.className) withClass += 1; });
    expect(total).toBeGreaterThan(100);
    expect(withClass / total).toBeGreaterThanOrEqual(0.9);
  });

  it('保留的显式 layout 只出现在反向映射表达不了的地方（ABSOLUTE 坐标）', () => {
    const allowed = new Set(['mode', 'x', 'y']);
    for (const root of roots()) {
      walk(root, (n) => {
        if (!n.layout) return;
        const keys = Object.keys(n.layout as object);
        for (const k of keys) expect(allowed.has(k), `${k} in ${JSON.stringify(n.layout)}`).toBe(true);
        const mode = (n.layout as { mode?: string }).mode;
        if (mode) expect(mode).toBe('ABSOLUTE');
      });
    }
  });

  it('语料里的 className 全在受控子集内，转换零违例（否则等于在教模型写违例）', () => {
    for (const entry of fewshots) {
      const { violations } = draftToPage(JSON.parse(entry.spec) as never, { pack });
      expect(violations, `${entry.id}: ${summarizeViolations(violations)}`).toEqual([]);
    }
  });
});

describe('M7 W1 契约闸门 · 畸形样本必须被拦', () => {
  const cases: { name: string; mutate: (o: Record<string, unknown>) => void; expect: string }[] = [
    { name: '契约外字段', mutate: (o) => ((o.root as Record<string, unknown>).shadow = 'x'), expect: '出现契约外字段' },
    { name: '缺 name', mutate: (o) => delete o.name, expect: '缺少必填字段' },
    { name: '非法节点类型', mutate: (o) => ((o.root as Record<string, unknown>).kind = 'SECTION'), expect: '取值必须是' },
    { name: 'padding 非 4 项', mutate: (o) => (((o.root as Record<string, unknown>).layout as Record<string, unknown>).padding = [1, 2, 3]), expect: '数组元素不能少于 4 个' },
    { name: 'TEXT 缺 text', mutate: (o) => delete ((o.root as Record<string, unknown>).children as Record<string, unknown>[])[0].text, expect: '必须给 text' },
    { name: 'fontSize 类型错', mutate: (o) => ((((o.root as Record<string, unknown>).children as Record<string, unknown>[])[0].style as Record<string, unknown>).fontSize = '24'), expect: '类型必须是数字' },
  ];

  for (const c of cases) {
    it(`${c.name} → 被拒且报错可读`, () => {
      const obj = basePage() as unknown as Record<string, unknown>;
      c.mutate(obj);
      const res = validateAiOutput(obj, { expect: 'page', pack });
      expect(res.ok).toBe(false);
      expect(summarizeViolations(res.violations)).toContain(c.expect);
    });
  }

  it('路径可读化：instancePath → a.b[0].c', () => {
    expect(readablePath('/root/children/0/style/background')).toBe('root.children[0].style.background');
    expect(readablePath('')).toBe('(根)');
  });
});

describe('M7 W1 语义检查（schema 管不到的部分）', () => {
  it('未知令牌被拦，并提示可用令牌', () => {
    const obj = basePage();
    obj.root.children[0].style.color = '@color.brand-neon';
    const res = validateAiOutput(obj, { expect: 'page', pack });
    expect(res.ok).toBe(false);
    expect(res.violations[0].kind).toBe('token');
    expect(res.violations[0].message).toContain('未知令牌');
  });

  it('图标库未加载/图标不存在 → limit 违例', () => {
    const obj = basePage();
    (obj.root.children[0] as Record<string, unknown>).kind = 'VECTOR';
    (obj.root.children[0] as Record<string, unknown>).icon = 'house';
    const noLib = validateAiOutput(obj, { expect: 'page', pack });
    expect(noLib.violations.some((v) => v.kind === 'limit' && v.message.includes('未加载'))).toBe(true);
    const withLib = validateAiOutput(obj, { expect: 'page', pack, icons: { house: 'M0 0L1 1' } });
    expect(withLib.ok).toBe(true);
  });

  it('节点数超上限被拦（plan：规模硬规则）', () => {
    const obj = basePage();
    (obj.root as Record<string, unknown>).children = Array.from({ length: 401 }, () => ({ kind: 'TEXT', text: 'x' }));
    const res = validateAiOutput(obj, { expect: 'page', pack });
    expect(res.ok).toBe(false);
    expect(res.violations.some((v) => v.message.includes('超过上限'))).toBe(true);
  });

  it('编辑计划：白名单外动作被 schema 拒', () => {
    const plan = { kind: 'edit', summary: 'x', actions: [{ op: 'recolor', targetId: 'a' }] };
    const res = validateAiOutput(plan, { expect: 'edit', pack, existingIds: new Set(['a']) });
    expect(res.ok).toBe(false);
  });

  it('编辑计划：引用不存在的节点 → ref 违例', () => {
    const plan = { kind: 'edit', summary: 'x', actions: [{ op: 'setText', targetId: 'ghost', text: 'y' }] };
    const res = validateAiOutput(plan, { expect: 'edit', pack, existingIds: new Set(['a']) });
    expect(res.ok).toBe(false);
    expect(res.violations[0].kind).toBe('ref');
  });

  it('actions 为空被拦', () => {
    const res = validateAiOutput({ kind: 'edit', summary: 'x', actions: [] }, { expect: 'edit', pack });
    expect(res.ok).toBe(false);
    expect(summarizeViolations(res.violations)).toContain('actions 不能为空');
  });
});

describe('M7 W1 JSON 抠取（容忍围栏与寒暄）', () => {
  it('```json 围栏', () => {
    const r = extractJson('好的：\n```json\n{"kind":"page"}\n```\n完成');
    expect(r.ok && (r.value as { kind: string }).kind).toBe('page');
  });
  it('裸 JSON', () => {
    const r = extractJson('{"kind":"edit"}');
    expect(r.ok).toBe(true);
  });
  it('无 JSON → 明确报错（喂回自修环）', () => {
    const r = extractJson('抱歉，我无法完成');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('JSON');
  });
});

describe('M7 W1 风格包注册表', () => {
  it('五套包齐备且许可证在白名单内（红线③）', () => {
    /**
     * `blackgreen` 是**手写**包（三个抽取包的主色是紫/蓝/蓝，没有绿色，
     * 而提示词硬规则禁止包外色值 —— 不补包就做不出「黑绿色」这类显式要求）。
     * 它用 CC0-1.0：自己写的，放弃版权，比 MIT 更宽松，故白名单同步加 `CC0`。
     *
     * `forest`（2026-11-02 补）同源：记账小程序的需求稿写「主色是墨绿」，
     * 而 `shadcn` 的 `primary` 是蓝 —— 提示词说绿、令牌给蓝，模型两边都听，
     * 结果同一页里大部分元素是墨绿、**一个按钮变蓝**。
     * 约束要放在令牌层，不能靠提示词加强语气。
     */
    expect(PACKS.map((p) => p.id)).toEqual(['shadcn', 'openprops', 'daisy-dark', 'blackgreen', 'forest']);
    const allowed = ['MIT', 'Apache-2.0', 'ISC', 'OFL', 'CC0'];
    for (const p of PACKS) {
      expect(allowed.some((a) => p.license.includes(a)), `${p.id} license=${p.license}`).toBe(true);
    }
  });

  it('每套包的语义色全为 hex，且必有 background/foreground', () => {
    for (const p of PACKS) {
      for (const [name, value] of Object.entries(p.colors)) {
        expect(value, `${p.id}.${name}`).toMatch(/^#[0-9a-f]{6}$/);
      }
      expect(p.colors.background).toBeTruthy();
      expect(p.colors.foreground).toBeTruthy();
      expect(p.fontSizes.length).toBeGreaterThanOrEqual(5);
    }
  });
});
