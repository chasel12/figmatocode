import { describe, expect, it } from 'vitest';
import { createNode, createPage, resetIdSeq } from '../src/schema/factory';
import { isContainer } from '../src/schema/types';
import { compilePage } from '../src/compiler';
import { FRAME_PRESETS } from '../src/editor/framePresets';
import type { UINode } from '../src/schema/types';

resetIdSeq(0);

describe('FR-14 设备预设（P0-20 断言）', () => {
  it('四档尺寸逐一锁定：iPhone 15 Pro / SE / iPad / Desktop', () => {
    expect(FRAME_PRESETS).toHaveLength(4);
    expect(FRAME_PRESETS.map((p) => p.label)).toEqual(['iPhone 15 Pro', 'iPhone SE', 'iPad', 'Desktop']);
    expect(FRAME_PRESETS[0]).toEqual({ label: 'iPhone 15 Pro', w: 393, h: 852 });
    expect(FRAME_PRESETS[1]).toEqual({ label: 'iPhone SE', w: 375, h: 667 });
    expect(FRAME_PRESETS[2]).toEqual({ label: 'iPad', w: 820, h: 1180 });
    expect(FRAME_PRESETS[3]).toEqual({ label: 'Desktop', w: 1440, h: 900 });
  });
});

describe('FR-14 Section：包裹容器', () => {
  it('createNode SECTION=容器、ABSOLUTE 自由摆放、默认浅底圆角', () => {
    const s = createNode('SECTION');
    expect(isContainer(s)).toBe(true);
    expect(s.type).toBe('SECTION');
    if (isContainer(s)) expect(s.children).toEqual([]);
    expect(s.layout.mode).toBe('ABSOLUTE');
    expect(s.layout.width).toBe(200);
    expect(s.style?.background).toBeTruthy();
    expect(s.style?.borderRadius).toBe(8);
  });

  it('Section 可容纳 Frame/子节点，出码含自身与子节点', () => {
    const page = createPage('FR14 页面');
    const sec = createNode('SECTION');
    const frame = createNode('FRAME');
    if (isContainer(sec)) sec.children.push(frame);
    page.root.children.push(sec);
    const compiled = compilePage(page);
    expect(compiled.nodes.find((n) => n.id === sec.id)).toBeTruthy();
    expect(compiled.nodes.find((n) => n.id === frame.id)).toBeTruthy();
    expect(compiled.nodes.find((n) => n.id === page.root.id)).toBeTruthy();
  });

  it('Section 在 flow 父中不占位（mode ABSOLUTE 语义）——出码节点集不缺子项', () => {
    const page = createPage('FR14 flow');
    const sec = createNode('SECTION');
    const t = createNode('TEXT');
    page.root.children.push(sec, t);
    const compiled = compilePage(page);
    const ids = compiled.nodes.map((n) => n.id);
    expect(ids).toContain(sec.id);
    expect(ids).toContain(t.id);
    expect(ids).toHaveLength(3);
  });
});

describe('FR-14 Slice：圈定导出区域（无视觉样式，仅影响导出）', () => {
  it('createNode SLICE=非容器叶子、ABSOLUTE、出码整节点跳过', () => {
    const slice = createNode('SLICE');
    expect(isContainer(slice)).toBe(false);
    expect(slice.type).toBe('SLICE');
    expect(slice.layout.mode).toBe('ABSOLUTE');

    const page = createPage('FR14 slice');
    const frame = createNode('FRAME');
    if (isContainer(page.root)) page.root.children.push(frame, slice);
    const compiled = compilePage(page);
    const ids = compiled.nodes.map((n) => n.id);
    expect(ids).not.toContain(slice.id);
    expect(ids).toContain(frame.id); // 兄弟不受影响
  });

  it('Slice 插入 flow 容器内：出码子节点数不变（不占位）', () => {
    const page = createPage('FR14 slice in flow');
    const frame = createNode('FRAME');
    if (isContainer(frame)) {
      const a = createNode('TEXT');
      const sl = createNode('SLICE');
      const b = createNode('TEXT');
      frame.children.push(a, sl, b);
    }
    page.root.children.push(frame);
    const compiled = compilePage(page);
    // root + frame + 2 文本（Slice 跳过）= 4
    expect(compiled.nodes).toHaveLength(4);
    expect(compiled.nodes.find((n) => n.id === frame.id)).toBeTruthy();
  });

  it('Slice 可设 exportSettings（仅影响导出——导出设置字段独立于样式）', () => {
    const slice = createNode('SLICE');
    const withExp: UINode = { ...slice, exportSettings: [{ format: 'PNG', scale: 2, suffix: '@2x' }] };
    const page = createPage('导出');
    page.root.children.push(withExp);
    const round = JSON.parse(JSON.stringify(page));
    const kid = round.root.children[0] as UINode;
    expect(kid.type).toBe('SLICE');
    expect(kid.exportSettings?.[0]?.format).toBe('PNG');
    expect(kid.exportSettings?.[0]?.scale).toBe(2);
    expect(kid.style?.background).toBeUndefined(); // 无视觉样式
  });
});

describe('FR-14 JSON 往返与旧数据', () => {
  it('SECTION/SLICE + exportSettings JSON 往返', () => {
    const page = createPage('往返');
    const sec = createNode('SECTION');
    if (isContainer(sec)) sec.children.push(createNode('SLICE'));
    page.root.children.push(sec);
    const round = JSON.parse(JSON.stringify(page));
    const kid = round.root.children[0];
    expect(kid.type).toBe('SECTION');
    expect(kid.children[0].type).toBe('SLICE');
    expect(kid.layout.mode).toBe('ABSOLUTE');
  });

  it('旧 JSON（无 Section/Slice）可编译不破', () => {
    const legacy = JSON.parse(
      JSON.stringify({
        id: 'p',
        name: '旧',
        viewport: { width: 1, height: 1 },
        root: {
          id: 'r',
          type: 'PAGE',
          layout: { mode: 'VERTICAL', widthMode: 'HUG', heightMode: 'HUG' },
          children: [{ id: 'n1', type: 'FRAME', name: 'f', layout: { mode: 'VERTICAL', widthMode: 'FIXED', heightMode: 'FIXED', width: 10, height: 10 }, style: {}, children: [] }],
        },
      }),
    );
    expect(() => compilePage(legacy)).not.toThrow();
  });
});
