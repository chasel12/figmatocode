/**
 * 转换层的「不可见文字」兜底（`normalizeInvisibleText`）
 *
 * ## 为什么需要这条规则
 *
 * 2026-11-01 全站扫描（demo 19 页 + 商城 6 页，25 页）对比度 < 1.5 的真实命中 1 处：
 * `BUTTON「立即购买」background:#1677FF color:#CC785C` → **1.25:1**，文字基本消失。
 * 成因是显式 hex 与风格包令牌混用（蓝底 + 棕字），schema 不报、字段齐全、CSS 也在，
 * 只有渲染出来才发现。
 *
 * ## 这个文件的重点不是「能修」，是「不乱修」
 *
 * 四个 pass 用例里有三个是**误报防线**：
 *  - `#999999` on 白底（2.85）是刻意的次要文字，不能动
 *  - 渐变头部上的白字**不可判定**，不能当 1.08 处理（第一版诊断脚本就误报了 12 条）
 *  - 深色底白字本来就够，不能改成黑的
 *
 * 误报的代价比不修大：把设计好的白字改黑，渐变上直接糊成一片。
 */
import { describe, expect, it } from 'vitest';
import { draftToPage } from '../src/editor/ai/specToPage';
import { compilePage } from '../src/compiler/compile';
import { PACKS } from '../src/tokens/packs';
import type { AiNodeSpec, AiPageDraft } from '../src/editor/ai/types';
import type { UINode, UIPage } from '../src/schema/types';

const pack = PACKS[0];

function run(children: AiNodeSpec[], rootStyle?: AiNodeSpec['style']): UIPage {
  const draft: AiPageDraft = {
    kind: 'page',
    name: 't',
    root: {
      kind: 'FRAME',
      name: '页面',
      layout: { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'FILL' },
      ...(rootStyle ? { style: rootStyle } : {}),
      children,
    },
  };
  return draftToPage(draft, { pack }).page;
}

/** 按 name 找第一个节点（测试里 name 比 id 稳定） */
function byName(page: UIPage, name: string): UINode {
  const found: UINode[] = [];
  const visit = (n: UINode): void => {
    if (n.name === name) found.push(n);
    if ('children' in n && n.children) (n.children as UINode[]).forEach(visit);
  };
  visit(page.root);
  if (!found.length) throw new Error(`找不到节点 ${name}`);
  return found[0];
}

describe('normalizeInvisibleText · fail（必须修）', () => {
  it('蓝底棕字 1.25:1 → 换成可读色', () => {
    const page = run([
      { kind: 'BUTTON', name: '购买', text: '立即购买', style: { background: '#1677FF', color: '#CC785C' } },
    ]);
    const btn = byName(page, '购买');
    expect(btn.style?.color).not.toBe('#CC785C');
    // 蓝色亮度低 → 取白字
    expect(btn.style?.color).toBe('#FFFFFF');
  });

  it('浅底白字 1.08:1 → 换成黑字', () => {
    const page = run([
      {
        kind: 'FRAME',
        name: '浅灰卡',
        style: { background: '#F5F6F8' },
        children: [{ kind: 'TEXT', name: '标题', text: '旅行的青蛙', style: { color: '#FFFFFF' } }],
      },
    ]);
    expect(byName(page, '标题').style?.color).toBe('#000000');
  });

  it('半透明白字压浅底 → 按合成后的实际色判定并修', () => {
    const page = run([
      {
        kind: 'FRAME',
        name: '浅灰卡',
        style: { background: '#F5F6F8' },
        children: [{ kind: 'TEXT', name: '副文', text: 'ID: 8823', style: { color: 'rgba(255,255,255,0.85)' } }],
      },
    ]);
    expect(byName(page, '副文').style?.color).toBe('#000000');
  });

  it('背景在祖先上（子节点无填充）也要判', () => {
    const page = run([
      {
        kind: 'FRAME',
        name: '蓝底卡',
        style: { background: '#1677FF' },
        children: [
          {
            kind: 'FRAME',
            name: '内层',
            children: [{ kind: 'TEXT', name: '棕字', text: '看不见', style: { color: '#CC785C' } }],
          },
        ],
      },
    ]);
    expect(byName(page, '棕字').style?.color).toBe('#FFFFFF');
  });
});

describe('normalizeInvisibleText · pass（一个字节都不能改）', () => {
  it('#999999 on 白底 2.85:1 是刻意的次要文字 → 不动', () => {
    const page = run([{ kind: 'TEXT', name: '次要', text: '库存充足', style: { color: '#999999' } }]);
    expect(byName(page, '次要').style?.color).toBe('#999999');
  });

  it('渐变背景上的白字 → 背景不可判定，跳过（第一版诊断脚本在这里误报 12 条）', () => {
    const page = run([
      {
        kind: 'FRAME',
        name: '渐变头部',
        style: {
          fills: [
            {
              type: 'GRADIENT_LINEAR',
              angle: 135,
              stops: [
                { position: 0, color: '#7F77DD' },
                { position: 1, color: '#378ADD' },
              ],
            },
          ],
        },
        children: [{ kind: 'TEXT', name: '用户名', text: '旅行的青蛙', style: { color: '#FFFFFF' } }],
      },
    ]);
    expect(byName(page, '用户名').style?.color).toBe('#FFFFFF');
  });

  it('深色底白字 18:1 → 不动', () => {
    const page = run([
      {
        kind: 'FRAME',
        name: '深色卡',
        style: { background: '#111111' },
        children: [{ kind: 'TEXT', name: '标题', text: '夜间模式', style: { color: '#FFFFFF' } }],
      },
    ]);
    expect(byName(page, '标题').style?.color).toBe('#FFFFFF');
  });

  it('深色底中灰字（3.3:1，能读但不达标）→ 不动', () => {
    const page = run([
      {
        kind: 'FRAME',
        name: '深色卡',
        style: { background: '#111111' },
        children: [{ kind: 'TEXT', name: '灰字', text: 'x', style: { color: '#666666' } }],
      },
    ]);
    // #666 on #111 ≈ 3.3，高于 1.5 —— 归 WCAG 规则管，不归这条兜底管
    expect(byName(page, '灰字').style?.color).toBe('#666666');
  });

  it('深色底深灰字（1.49:1）会被修 —— 阈值附近的边界是有意保留的', () => {
    const page = run([
      {
        kind: 'FRAME',
        name: '深色卡',
        style: { background: '#111111' },
        children: [{ kind: 'TEXT', name: '深灰', text: 'x', style: { color: '#333333' } }],
      },
    ]);
    // 1.49 在视觉上等于「消失」，即使它是刻意的禁用态，看不见也没有意义
    expect(byName(page, '深灰').style?.color).toBe('#FFFFFF');
  });

  it('背景画在同级绝对定位层上（海报结构）→ 跳过', () => {
    const page = run([
      {
        kind: 'FRAME',
        name: '海报',
        layout: { heightMode: 'FIXED', height: 420 },
        children: [
          {
            kind: 'RECTANGLE',
            name: '背景',
            layout: { position: 'ABSOLUTE', widthMode: 'FILL', heightMode: 'FIXED', height: 420, x: 0, y: 0 },
            style: {
              fills: [
                {
                  type: 'GRADIENT_LINEAR',
                  angle: 70,
                  stops: [
                    { position: 0, color: '#534AB7' },
                    { position: 1, color: '#7c5cff' },
                  ],
                },
              ],
            },
          },
          {
            kind: 'FRAME',
            name: '文案',
            layout: { position: 'ABSOLUTE', x: 24, y: 140 },
            children: [{ kind: 'TEXT', name: '白字', text: 'SPRING SALE', style: { color: '#FFFFFF' } }],
          },
        ],
      },
    ]);
    // 铺满的绝对定位背景层 → 文字实际压在渐变上，不可判定
    expect(byName(page, '白字').style?.color).toBe('#FFFFFF');
  });

  it('同级只有小角标（不铺满）→ 不算背景层，仍按父背景判', () => {
    const page = run([
      {
        kind: 'FRAME',
        name: '浅灰卡',
        style: { background: '#F5F6F8' },
        layout: { heightMode: 'FIXED', height: 100 },
        children: [
          {
            kind: 'FRAME',
            name: '角标',
            layout: { position: 'ABSOLUTE', widthMode: 'FIXED', width: 18, heightMode: 'FIXED', height: 18, x: 60, y: 0 },
            style: { background: '#FF4D4F' },
          },
          { kind: 'TEXT', name: '白字', text: 'x', style: { color: '#FFFFFF' } },
        ],
      },
    ]);
    // 18×18 的角标不是背景层，白字仍压在 #F5F6F8 上 → 必须修
    expect(byName(page, '白字').style?.color).toBe('#000000');
  });

  it('root 深色底时，页面上的白字不动', () => {
    const page = run([{ kind: 'TEXT', name: '白字', text: '标题', style: { color: '#FFFFFF' } }], {
      background: '#0B0B0F',
    });
    expect(byName(page, '白字').style?.color).toBe('#FFFFFF');
  });
});

describe('normalizeInvisibleText · 全链路', () => {
  it('修好之后 compilePage 出的是可读色', () => {
    const page = run([
      { kind: 'BUTTON', name: '购买', text: '立即购买', style: { background: '#1677FF', color: '#CC785C' } },
    ]);
    const css = JSON.stringify(compilePage(page));
    expect(css).toContain('#FFFFFF');
    expect(css).not.toContain('#CC785C');
  });
});
