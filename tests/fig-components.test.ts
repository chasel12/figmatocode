/**
 * `.fig` 往返：组件实例与项目级资产（FR-25 / FR-27 / FR-39）。
 *
 * ## 这一组测试补的是什么
 *
 * 此前 `exportFig(pages, ...)` 的签名里没有 `components` / `tokens` / `flows`，
 * `grep componentId src/fig/` 在导出与导入两侧零命中。后果是：
 *
 * - 编辑器里做的组件实例，**存 `.fig` 再打开变成普通节点**，切变体/更新主组件的传播全没；
 * - 组件表、命名样式表、原型流程一并消失。
 *
 * 而且这件事在门禁里一直是**绿的**——`fig-normalize.ts` 的口径里没有这些字段，
 * 19 页 demo 也没有组件实例。典型的假绿：修不修都绿，等于从没被验证过。
 *
 * 现在三件事一起做：旁挂层写入 → 读回 → 比对口径纳入。
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { importFig } from '../src/fig/import';
import { exportFig } from '../src/fig/export';
import { loadFigCodec, type FigCodec } from '../src/fig/codec';
import { pagesToProject } from '../src/fig/project';
import { createNode, createPage } from '../src/schema/factory';
import { deepEqual, normalize, roundDeep } from '../scripts/fig-normalize';
import type { ComponentDef, ContainerNode, FlowDef, StyleToken, UINode } from '../src/schema/types';

let codec: FigCodec;
beforeAll(async () => {
  codec = await loadFigCodec();
});

const AT = '2026-01-01T00:00:00.000Z';

/** 一个带实例标记的页面 + 项目级三张表 */
function fixture() {
  const page = createPage('组件实例页', 375, 812);
  const inst = createNode('FRAME') as ContainerNode;
  inst.name = '实例卡';
  Object.assign(inst.layout, { width: 200, height: 100, widthMode: 'FIXED' as const, heightMode: 'FIXED' as const });
  inst.componentId = 'comp-card';
  inst.instanceOverrides = [
    { path: '0', value: { text: '覆盖后的标题' } },
    { path: '', value: { style: { opacity: 0.8 } } },
  ];
  const title = createNode('TEXT') as UINode;
  title.name = '标题';
  (title as { text: string }).text = '原始标题';
  inst.children = [title];
  page.root.children = [inst];

  const compRoot = createNode('FRAME') as ContainerNode;
  compRoot.name = 'Card';
  Object.assign(compRoot.layout, { width: 200, height: 100, widthMode: 'FIXED' as const, heightMode: 'FIXED' as const });

  const components: Record<string, ComponentDef> = {
    'comp-card': { id: 'comp-card', name: 'Card', root: compRoot, createdAt: 1 },
  };
  const tokens: StyleToken[] = [
    { id: 'tok-primary', name: '主色', kind: 'PAINT', style: { background: '#1677FF' }, cssVar: '--color-primary' },
  ];
  const flows: FlowDef[] = [{ id: 'flow-main', name: '主流程', startNodeId: inst.id }];
  return { page, components, tokens, flows };
}

describe('节点级：实例标记与覆盖', () => {
  it('componentId 与 instanceOverrides 完整往返', async () => {
    const { page } = fixture();
    const exported = await exportFig([page], codec.encode, { exportedAt: AT });
    const back = importFig(exported.bytes, codec.decode);
    const before = roundDeep(normalize(page.root.children[0]), 4);
    const after = roundDeep(normalize(back.pages[0].root.children[0]), 4);
    expect(deepEqual(before, after, 'instance')).toBeNull();
  });

  it('覆盖项本身没有被改写（路径与补丁原样）', async () => {
    const { page } = fixture();
    const exported = await exportFig([page], codec.encode, { exportedAt: AT });
    const back = importFig(exported.bytes, codec.decode);
    const inst = back.pages[0].root.children[0];
    expect(inst.componentId).toBe('comp-card');
    expect(inst.instanceOverrides).toEqual([
      { path: '0', value: { text: '覆盖后的标题' } },
      { path: '', value: { style: { opacity: 0.8 } } },
    ]);
  });

  it('没有实例标记的普通节点不会凭空多出字段', async () => {
    const page = createPage('普通页', 375, 812);
    const box = createNode('FRAME') as ContainerNode;
    box.name = '普通框';
    page.root.children = [box];
    const exported = await exportFig([page], codec.encode, { exportedAt: AT });
    const back = importFig(exported.bytes, codec.decode);
    const node = back.pages[0].root.children[0];
    expect(node.componentId).toBeUndefined();
    expect(node.instanceOverrides).toBeUndefined();
  });
});

describe('项目级：组件表 / 样式表 / 原型流程', () => {
  it('三张表都能读回来', async () => {
    const { page, components, tokens, flows } = fixture();
    const exported = await exportFig([page], codec.encode, { exportedAt: AT, components, tokens, flows });
    const back = importFig(exported.bytes, codec.decode);
    expect(back.components).toEqual(components);
    expect(back.tokens).toEqual(tokens);
    expect(back.flows).toEqual(flows);
  });

  it('只给其中一张表时，其它两张不会变成空数组（保持 undefined）', async () => {
    const { page, tokens } = fixture();
    const exported = await exportFig([page], codec.encode, { exportedAt: AT, tokens });
    const back = importFig(exported.bytes, codec.decode);
    expect(back.tokens).toEqual(tokens);
    expect(back.components).toBeUndefined();
    expect(back.flows).toBeUndefined();
  });

  it('什么都不给时，meta 里不出现 project 键（旧文件二进制保持一致）', async () => {
    const { page } = fixture();
    const exported = await exportFig([page], codec.encode, { exportedAt: AT });
    const back = importFig(exported.bytes, codec.decode);
    const extras = (back.meta as { ui_compiler_extras?: { project?: unknown } } | undefined)?.ui_compiler_extras;
    expect(extras?.project).toBeUndefined();
    expect(back.components).toBeUndefined();
  });
});

describe('产品入口：pagesToProject 不再清空项目级资产', () => {
  it('传入 extras 时保留三张表', () => {
    const { page, components, tokens, flows } = fixture();
    const project = pagesToProject([page], '测试', { components, tokens, flows });
    expect(project.components).toEqual(components);
    expect(project.tokens).toEqual(tokens);
    expect(project.flows).toEqual(flows);
  });

  it('不传 extras 时落到空表（旧 .fig 文件的行为不变）', () => {
    const { page } = fixture();
    const project = pagesToProject([page], '测试');
    expect(project.components).toEqual({});
    expect(project.tokens).toEqual([]);
    expect(project.flows).toEqual([]);
  });

  it('端到端：导出带组件表 → 导入 → pagesToProject 后组件表还在', async () => {
    const { page, components, tokens, flows } = fixture();
    const exported = await exportFig([page], codec.encode, { exportedAt: AT, components, tokens, flows });
    const back = importFig(exported.bytes, codec.decode);
    const project = pagesToProject(back.pages, '测试', {
      components: back.components,
      tokens: back.tokens,
      flows: back.flows,
    });
    expect(Object.keys(project.components)).toEqual(['comp-card']);
    expect(project.tokens).toHaveLength(1);
    expect(project.flows).toHaveLength(1);
  });
});
