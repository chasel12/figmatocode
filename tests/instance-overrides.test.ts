import { describe, expect, it } from 'vitest';
import {
  applyOverrides,
  captureOverrideForTarget,
  deriveInstance,
  nodeAtPath,
  nodePathInInstance,
  recordOverride,
} from '../src/editor/instanceSync';
import { createNode, resetIdSeq } from '../src/schema/factory';
import type { ContainerNode, InstanceOverride, UINode } from '../src/schema/types';

resetIdSeq(0);

/**
 * FR-25 组件实例覆盖模型（#3 组件系统补齐）。
 *
 * 背景：原实现实例=深拷贝快照、`instanceOverrides` 从无写入点，
 * 导致「更新主组件其它实例不跟随」「切变体清空一切改动」。
 * 新模型：实例 = 主组件派生 ⊕ 覆盖补丁（路径定位），切变体/更新时重派生再重放。
 */
function makeComponent(): ContainerNode {
  const frame = createNode('FRAME') as ContainerNode;
  frame.name = 'Card';
  const title = createNode('TEXT') as UINode;
  title.name = 'Title';
  const body = createNode('RECTANGLE') as UINode;
  body.name = 'Body';
  frame.children = [title, body];
  return frame;
}

let seq = 0;
const mkId = () => `n${++seq}`;

describe('路径定位 nodePathInInstance / nodeAtPath', () => {
  const root = makeComponent();
  const title = (root as ContainerNode).children[0];
  const body = (root as ContainerNode).children[1];

  it('根自身是空串', () => {
    expect(nodePathInInstance(root, root.id)).toBe('');
  });

  it('一级子节点按下标', () => {
    expect(nodePathInInstance(root, title.id)).toBe('0');
    expect(nodePathInInstance(root, body.id)).toBe('1');
  });

  it('嵌套子节点用点分路径', () => {
    const inner = createNode('TEXT') as UINode;
    (body as ContainerNode).children = [inner];
    expect(nodePathInInstance(root, inner.id)).toBe('1.0');
    expect(nodeAtPath(root, '1.0')?.id).toBe(inner.id);
  });

  it('不在子树内返回 null；越界路径返回 null', () => {
    const outsider = createNode('TEXT') as UINode;
    expect(nodePathInInstance(root, outsider.id)).toBeNull();
    expect(nodeAtPath(root, '9')).toBeNull();
    expect(nodeAtPath(root, '0.0')).toBeNull(); // title 是叶子
  });
});

describe('recordOverride 合并语义', () => {
  it('同 path 多次修改做浅合并（style 累加）', () => {
    let ovs: InstanceOverride[] | undefined;
    ovs = recordOverride(ovs, '0', { style: { color: '#f00' } });
    ovs = recordOverride(ovs, '0', { style: { fontSize: 20 } });
    expect(ovs).toHaveLength(1);
    expect((ovs[0].value as { style: Record<string, unknown> }).style).toEqual({ color: '#f00', fontSize: 20 });
  });

  it('不同 path 各自成条', () => {
    let ovs: InstanceOverride[] | undefined;
    ovs = recordOverride(ovs, '0', { text: 'A' });
    ovs = recordOverride(ovs, '1', { style: { opacity: 0.5 } });
    expect(ovs.map((o) => o.path)).toEqual(['0', '1']);
  });

  it('不修改入参数组（纯函数）', () => {
    const src: InstanceOverride[] = [{ path: '0', value: { text: 'old' } }];
    const out = recordOverride(src, '0', { text: 'new' });
    expect((src[0].value as { text: string }).text).toBe('old');
    expect((out[0].value as { text: string }).text).toBe('new');
  });
});

describe('deriveInstance 派生 = 主组件 ⊕ 覆盖', () => {
  it('无覆盖时等于主组件内容，但 id 全部重排', () => {
    const comp = makeComponent();
    const inst = deriveInstance(comp, undefined, mkId) as ContainerNode;
    expect(inst.children).toHaveLength(2);
    expect(inst.id).not.toBe(comp.id);
    expect(inst.children[0].id).not.toBe((comp as ContainerNode).children[0].id);
  });

  it('派生结果不带组件实例语义字段（避免嵌套污染）', () => {
    const comp = makeComponent();
    (comp as { componentId?: string }).componentId = 'comp-x';
    const inst = deriveInstance(comp, undefined, mkId);
    expect(inst.componentId).toBeUndefined();
    expect(inst.instanceOverrides).toBeUndefined();
  });

  it('根覆盖生效', () => {
    const comp = makeComponent();
    const inst = deriveInstance(comp, [{ path: '', value: { style: { background: '#123456' } } }], mkId);
    expect(inst.style?.background).toBe('#123456');
  });

  it('子节点 style/text 覆盖生效', () => {
    const comp = makeComponent();
    const inst = deriveInstance(
      comp,
      [
        { path: '0', value: { text: '改过的标题', style: { color: '#abcabc' } } },
      ],
      mkId,
    ) as ContainerNode;
    const title = inst.children[0] as { text: string };
    expect(title.text).toBe('改过的标题');
    expect(inst.children[0].style?.color).toBe('#abcabc');
  });

  it('路径失效（变体里节点变少）→ 覆盖被静默丢弃，不抛错', () => {
    const comp = makeComponent();
    (comp as ContainerNode).children = [(comp as ContainerNode).children[0]]; // 只剩 1 个
    const inst = deriveInstance(comp, [{ path: '1', value: { style: { opacity: 0.1 } } }], mkId) as ContainerNode;
    expect(inst.children).toHaveLength(1);
  });
});

describe('captureOverrideForTarget 把实例内改动转成覆盖', () => {
  function pageWithInstance(): { page: UINode; inst: ContainerNode; titleId: string } {
    const comp = makeComponent();
    (comp as { componentId?: string }).componentId = 'comp-1';
    const inst = JSON.parse(JSON.stringify(comp)) as ContainerNode;
    inst.id = 'inst-1';
    (inst as { componentId?: string }).componentId = 'comp-1';
    inst.children.forEach((c, i) => (c.id = `inst-child-${i}`));
    const page = createNode('PAGE') as ContainerNode;
    page.children = [inst];
    return { page, inst, titleId: inst.children[0].id };
  }

  it('改实例内子节点 → 记录到最近实例祖先，路径相对实例根', () => {
    const { page, inst, titleId } = pageWithInstance();
    const got = captureOverrideForTarget(page, titleId, { style: { color: '#ff0000' } });
    expect(got).not.toBeNull();
    expect(got!.instanceId).toBe(inst.id);
    expect(got!.path).toBe('0');
    expect((got!.overrides[0].value as { style: { color: string } }).style.color).toBe('#ff0000');
  });

  it('改实例根本身 → path 为空串', () => {
    const { page, inst } = pageWithInstance();
    const got = captureOverrideForTarget(page, inst.id, { style: { opacity: 0.4 } });
    expect(got!.path).toBe('');
  });

  it('改非实例节点 → 返回 null（不产生无主覆盖）', () => {
    const plain = createNode('RECTANGLE') as UINode;
    const page = createNode('PAGE') as ContainerNode;
    page.children = [plain];
    expect(captureOverrideForTarget(page, plain.id, { style: { opacity: 0.2 } })).toBeNull();
  });

  it('嵌套实例：记到**最近**的实例祖先（内层），而非外层', () => {
    const outerComp = createNode('FRAME') as ContainerNode;
    const innerComp = createNode('FRAME') as ContainerNode;
    (innerComp as { componentId?: string }).componentId = 'c-inner';
    const leaf = createNode('TEXT') as UINode;
    leaf.id = 'leaf-1';
    innerComp.children = [leaf];
    innerComp.id = 'inst-inner';
    outerComp.id = 'inst-outer';
    (outerComp as { componentId?: string }).componentId = 'c-outer';
    outerComp.children = [innerComp];
    const page = createNode('PAGE') as ContainerNode;
    page.children = [outerComp];

    const got = captureOverrideForTarget(page, 'leaf-1', { text: 'x' });
    expect(got!.instanceId).toBe('inst-inner');
    expect(got!.path).toBe('0');
  });
});

describe('applyOverrides 重放（模拟模型核心场景）', () => {
  it('更新主组件后重派生：覆盖保留、主组件新值生效于未覆盖字段', () => {
    const ovs = recordOverride(undefined, '0', { style: { color: '#ff0000' } });

    // 主组件改版：标题字号变大、颜色变蓝
    const compV2 = makeComponent();
    (compV2 as ContainerNode).children[0].style = { ...(compV2 as ContainerNode).children[0].style, fontSize: 28, color: '#0000ff' };

    const inst = deriveInstance(compV2, ovs, mkId) as ContainerNode;
    // 覆盖字段（颜色）保留实例值；未覆盖字段（字号）跟随主组件
    expect(inst.children[0].style?.color).toBe('#ff0000');
    expect(inst.children[0].style?.fontSize).toBe(28);
  });

  it('切变体：结构换成新变体，覆盖按路径重放', () => {
    const variantB = makeComponent();
    (variantB as ContainerNode).children[0].name = 'TitleB';
    const ovs = recordOverride(undefined, '0', { text: '实例保留的文案' });
    const inst = deriveInstance(variantB, ovs, mkId) as ContainerNode;
    expect((inst.children[0] as { text: string }).text).toBe('实例保留的文案');
    expect(inst.children[0].name).toBe('TitleB'); // 其余跟随变体
  });

  it('applyOverrides 可重复调用且幂等', () => {
    const comp = makeComponent();
    const root = JSON.parse(JSON.stringify(comp)) as UINode;
    const ovs: InstanceOverride[] = [{ path: '0', value: { style: { opacity: 0.3 } } }];
    applyOverrides(root, ovs);
    applyOverrides(root, ovs);
    expect((root as ContainerNode).children[0].style?.opacity).toBe(0.3);
  });
});
