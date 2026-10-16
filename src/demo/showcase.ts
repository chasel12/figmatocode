/**
 * FR-57 样片三区内容（M6 补齐）：
 *   区① 组件种类陈列 —— 16 类图层每类 ≥1（含 Section/Slice/Oval/Line/Polygon/Star/Vector）
 *   区② 参数矩阵     —— 8 效果 / 4 型渐变 / stroke 三对齐 / 约束 5 档 / AutoLayout 组合 / 文本排版
 *   区④ 原型跳转     —— ≥5 类交互 + ≥3 Flow（interactions/flows 落 page.json，供 showcase 审计）
 *
 * 与既有 16 demo 页并列（`allDemoPages()` 追加），不修改既有页定义。
 * 内容定义在 src/demo/（showcase.mjs 只读审计）；每页均为合法可编译页（进 e2e 环）。
 */
import type { UIPage, PrototypeInteraction, FlowDef } from '../schema/types';
import { makePage, txt, rect, frame, hstack, vstack, C, type Spec } from './dsl';

/* ---------- 区①：16 类图层陈列 ---------- */

function kindsPage(): UIPage {
  // 16 类：PAGE/FRAME/RECTANGLE/SECTION/SLICE/TEXT/IMAGE/BUTTON/OVAL/LINE/POLYGON/STAR/VECTOR
  // + 组件/实例/变体由 components 表与实例节点表达（审计按 kind 覆盖 + components 非空）
  const children: Spec[] = [
    txt('① 图层种类陈列', { fontSize: 16, fontWeight: 600, color: C.text }, { heightMode: 'HUG' }),

    frame(
      '形状组',
      [
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 56, height: 56 }, { background: '#1677FF', borderRadius: 10 }, '矩形'),
        { kind: 'OVAL', name: '椭圆', layout: { widthMode: 'FIXED', heightMode: 'FIXED', width: 56, height: 56 }, style: { background: '#22C55E' } },
        {
          kind: 'POLYGON',
          name: '多边形',
          layout: { widthMode: 'FIXED', heightMode: 'FIXED', width: 56, height: 56 },
          style: { background: '#F59E0B', pointCount: 6 },
        },
        {
          kind: 'STAR',
          name: '星形',
          layout: { widthMode: 'FIXED', heightMode: 'FIXED', width: 56, height: 56 },
          style: { background: '#EF4444', pointCount: 5, innerRadius: 0.42 },
        },
        {
          kind: 'LINE',
          name: '直线',
          layout: { widthMode: 'FIXED', heightMode: 'FIXED', width: 56, height: 0 },
          style: { border: { width: 3, color: '#8B5CF6', align: 'CENTER' } },
        },
      ],
      { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG', gap: 10, align: 'CENTER' },
    ),

    frame(
      '矢量组',
      [
        {
          kind: 'VECTOR',
          name: '钢笔路径',
          layout: { widthMode: 'FIXED', heightMode: 'FIXED', width: 90, height: 70 },
          style: { border: { width: 3, color: '#0EA5E9', align: 'CENTER', join: 'ROUND', cap: 'ROUND' } },
          // d 由下方 vector 字段注入（Spec 不含 vector，故用 assign 补）
        } as Spec,
        txt('VECTOR（钢笔/布尔产出，内联 SVG 出码）', { fontSize: 11, color: C.dim }, { widthMode: 'FILL', heightMode: 'HUG' }),
      ],
      { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG', gap: 12, align: 'CENTER' },
    ),

    frame(
      '容器组',
      [
        frame('Frame', [txt('Frame', { fontSize: 11, color: C.dim })], { widthMode: 'FIXED', heightMode: 'FIXED', width: 72, height: 44, align: 'CENTER', justify: 'CENTER' }, { background: '#EEF2FF', borderRadius: 8 }),
        { kind: 'SECTION', name: 'Section 分组', layout: { widthMode: 'FIXED', heightMode: 'FIXED', width: 130, height: 44 }, style: {} } as Spec,
        { kind: 'SLICE', name: 'Slice 导出区', layout: { widthMode: 'FIXED', heightMode: 'FIXED', width: 72, height: 44 }, style: {} } as Spec,
      ],
      { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG', gap: 10, align: 'CENTER' },
    ),

    frame(
      '内容组',
      [
        txt('Text 文本', { fontSize: 13, color: C.text }, { widthMode: 'HUG', heightMode: 'HUG' }),
        {
          kind: 'BUTTON',
          text: 'Button',
          layout: { widthMode: 'FIXED', heightMode: 'FIXED', width: 80, height: 32, align: 'CENTER', justify: 'CENTER' },
          style: { background: C.primary, color: '#FFFFFF', fontSize: 12, borderRadius: 6, textAlign: 'center' },
        },
        {
          kind: 'IMAGE',
          name: 'Image',
          src: "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='64' height='64' rx='8' fill='%234f46e5'/%3E%3Cpath d='M16 46 L28 30 L38 42 L46 34 L56 46 Z' fill='%23fff'/%3E%3C/svg%3E",
          layout: { widthMode: 'FIXED', heightMode: 'FIXED', width: 64, height: 64 },
          style: { borderRadius: 8 },
        },
      ],
      { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG', gap: 10, align: 'CENTER' },
    ),

    frame(
      '组件组（Component / Instance / Variant）',
      [
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 72, height: 40 }, { background: '#9747FF', borderRadius: 8 }, 'Primary（主组件）'),
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 72, height: 40 }, { background: '#B98CFF', borderRadius: 8 }, 'Primary/Hover（变体）'),
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 72, height: 40 }, { background: '#D9C2FF', borderRadius: 8 }, '实例'),
      ],
      { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG', gap: 10, align: 'CENTER' },
    ),
  ];

  const page = makePage('17-样片-图层种类', children, { rootStyle: { background: C.bg } });
  // VECTOR 需要真实 path（Spec DSL 不承载 vector 字段，构建后注入）。
  // 注意：factory 给 VECTOR 的默认值是占位 `M 0 0`，故不能以 `!n.vector` 判定——
  // 必须识别占位值并替换（曾因此让样片矢量一直是空路径）。
  const REAL_D = 'M 6 64 C 6 20 40 6 84 6 C 60 26 58 44 44 64 Z';
  const inject = (n: import('../schema/types').UINode): void => {
    if (n.type === 'VECTOR' && (!n.vector?.d || n.vector.d.trim() === 'M 0 0')) {
      n.vector = { ...(n.vector ?? {}), d: REAL_D };
    }
    if ('children' in n) n.children.forEach(inject);
  };
  inject(page.root);
  // SECTION 需至少 1 子项（展示分组语义）
  const sec = page.root.children.map((c) => c).flatMap((c) => ('children' in c ? c.children : [])).find((c) => c.type === 'SECTION');
  if (sec && 'children' in sec) sec.children = [];
  return page;
}

/* ---------- 区②：参数矩阵 ---------- */

function matrixPage(): UIPage {
  const g = (type: string, angle: number): Record<string, unknown> => ({
    type,
    angle,
    stops: [
      { position: 0, color: '#1677FF' },
      { position: 1, color: '#EF4444' },
    ],
  });

  const swatch = (label: string, style: Record<string, unknown>): Spec =>
    frame(
      label,
      [txt(label, { fontSize: 10, color: C.dim, textAlign: 'center' }, { widthMode: 'FILL', heightMode: 'HUG' })],
      { mode: 'VERTICAL', widthMode: 'FIXED', heightMode: 'HUG', width: 78, gap: 4, align: 'CENTER' },
      { ...(style as object) },
    );

  const children: Spec[] = [
    txt('② 参数矩阵', { fontSize: 16, fontWeight: 600, color: C.text }, { heightMode: 'HUG' }),

    // 四角独立圆角
    frame(
      '四角圆角',
      [
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 72, height: 56 }, { background: '#1677FF', borderRadius: [16, 0, 16, 0] }, '对角圆角'),
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 72, height: 56 }, { background: '#22C55E', borderRadius: 28 }, '全圆角'),
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 72, height: 56 }, { background: '#F59E0B', borderRadius: 4 }, '小圆角'),
      ],
      { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG', gap: 10, align: 'CENTER' },
    ),

    // stroke 三对齐（INSIDE / CENTER / OUTSIDE）
    frame(
      'Stroke 三对齐',
      [
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 72, height: 48 }, { background: '#FFFFFF', borderRadius: 8, border: { width: 3, color: '#1677FF', align: 'INSIDE' } }, 'Inside'),
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 72, height: 48 }, { background: '#FFFFFF', borderRadius: 8, border: { width: 3, color: '#22C55E', align: 'CENTER' } }, 'Center'),
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 72, height: 48 }, { background: '#FFFFFF', borderRadius: 8, border: { width: 3, color: '#EF4444', align: 'OUTSIDE' } }, 'Outside'),
      ],
      { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG', gap: 10, align: 'CENTER' },
    ),

    // 4 型渐变
    frame(
      '渐变四型',
      [
        swatch('Linear', { fills: [g('GRADIENT_LINEAR', 0)], borderRadius: 8, height: 48, heightMode: 'FIXED' }),
        swatch('Radial', { fills: [g('GRADIENT_RADIAL', 0)], borderRadius: 8, height: 48, heightMode: 'FIXED' }),
        swatch('Angular', { fills: [g('GRADIENT_ANGULAR', 0)], borderRadius: 8, height: 48, heightMode: 'FIXED' }),
        swatch('Diamond', { fills: [g('GRADIENT_DIAMOND', 0)], borderRadius: 8, height: 48, heightMode: 'FIXED' }),
      ],
      { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG', gap: 8, align: 'CENTER' },
    ),

    // 8 类效果（逐个）
    frame(
      '效果八类',
      [
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 56, height: 40 }, { background: '#FFFFFF', borderRadius: 6, effects: [{ kind: 'DROP_SHADOW', x: 0, y: 4, blur: 8, spread: 0, color: 'rgba(0,0,0,0.25)' }] }, 'Drop'),
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 56, height: 40 }, { background: '#FFFFFF', borderRadius: 6, effects: [{ kind: 'INNER_SHADOW', x: 0, y: 2, blur: 6, spread: 1, color: 'rgba(0,0,0,0.3)' }] }, 'Inner'),
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 56, height: 40 }, { background: '#EEF2FF', borderRadius: 6, effects: [{ kind: 'LAYER_BLUR', radius: 3 }] }, 'Layer'),
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 56, height: 40 }, { background: 'rgba(22,119,255,0.25)', borderRadius: 6, effects: [{ kind: 'BACKGROUND_BLUR', radius: 6 }] }, 'BgBlur'),
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 56, height: 40 }, { background: '#FFFFFF', borderRadius: 6, effects: [{ kind: 'PROGRESSIVE_BLUR', radius: 4, startRadius: 1 }] }, 'Prog'),
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 56, height: 40 }, { background: '#FFFFFF', borderRadius: 6, effects: [{ kind: 'NOISE', radius: 8, density: 3, opacity: 0.4 }] }, 'Noise'),
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 56, height: 40 }, { background: '#FFFFFF', borderRadius: 6, effects: [{ kind: 'TEXTURE', radius: 6, density: 2, color: '#1677FF', opacity: 0.5 }] }, 'Texture'),
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 56, height: 40 }, { background: 'rgba(255,255,255,0.35)', borderRadius: 6, effects: [{ kind: 'GLASS', radius: 6, opacity: 0.6 }] }, 'Glass'),
      ],
      { mode: 'HORIZONTAL', widthMode: 'FILL', heightMode: 'HUG', wrap: 'WRAP', gap: 8, gapCross: 8, align: 'CENTER' },
    ),

    // 约束 5 档（绝对定位父内子项，约束生效前提）
    frame(
      '约束档位',
      [
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 44, height: 28, mode: 'ABSOLUTE', x: 8, y: 8, constraints: { horizontal: 'LEFT', vertical: 'TOP' } }, { background: '#1677FF', borderRadius: 4 }, 'Left/Top'),
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 44, height: 28, mode: 'ABSOLUTE', x: 148, y: 8, constraints: { horizontal: 'RIGHT', vertical: 'TOP' } }, { background: '#22C55E', borderRadius: 4 }, 'Right/Top'),
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 44, height: 28, mode: 'ABSOLUTE', x: 78, y: 44, constraints: { horizontal: 'CENTER', vertical: 'CENTER' } }, { background: '#F59E0B', borderRadius: 4 }, 'Center'),
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 44, height: 28, mode: 'ABSOLUTE', x: 8, y: 80, constraints: { horizontal: 'LEFT', vertical: 'BOTTOM' } }, { background: '#8B5CF6', borderRadius: 4 }, 'Left/Bottom'),
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 44, height: 28, mode: 'ABSOLUTE', x: 148, y: 80, constraints: { horizontal: 'SCALE', vertical: 'SCALE' } }, { background: '#EF4444', borderRadius: 4 }, 'Scale'),
      ],
      { mode: 'ABSOLUTE', widthMode: 'FILL', heightMode: 'FIXED', height: 116 },
      { background: '#F8FAFC', borderRadius: 8 },
    ),

    // AutoLayout 组合（多组：方向 × wrap × 对齐/分布）
    frame(
      'AutoLayout 组合',
      [
        vstack('V/START/gap12', [txt('v1', { fontSize: 10, color: C.text }), txt('v2', { fontSize: 10, color: C.text })], { gap: 12, widthMode: 'FILL', align: 'START' as never, padding: [8, 8, 8, 8] }, { background: '#EFF6FF', borderRadius: 6 }),
        hstack('H/CENTER/gap8', [txt('h1', { fontSize: 10, color: C.text }), txt('h2', { fontSize: 10, color: C.text })], { gap: 8, widthMode: 'FILL', justify: 'CENTER' as never, padding: [8, 8, 8, 8] }, { background: '#F0FDF4', borderRadius: 6 }),
        vstack('V/CENTER/gap4', [txt('c1', { fontSize: 10, color: C.text }), txt('c2', { fontSize: 10, color: C.text })], { gap: 4, widthMode: 'FILL', align: 'CENTER' as never, padding: [8, 8, 8, 8] }, { background: '#FFFBEB', borderRadius: 6 }),
        hstack('H/SPACE_BETWEEN', [txt('s1', { fontSize: 10, color: C.text }), txt('s2', { fontSize: 10, color: C.text })], { gap: 0, widthMode: 'FILL', justify: 'SPACE_BETWEEN' as never, padding: [8, 8, 8, 8] }, { background: '#FEF2F2', borderRadius: 6 }),
        hstack('H/WRAP', [
          txt('w1 w2 w3 w4 w5 w6', { fontSize: 10, color: C.text, textWrap: true }, { widthMode: 'FILL', heightMode: 'HUG' }),
        ], { gap: 6, gapCross: 6, wrap: 'WRAP', widthMode: 'FILL', padding: [8, 8, 8, 8] }, { background: '#F5F3FF', borderRadius: 6 }),
      ],
      { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', gap: 8, align: 'START' },
    ),

    // 文本排版对照
    frame(
      '文本排版',
      [
        txt('UPPER CASE', { fontSize: 12, color: C.text, textCase: 'UPPER' }, { widthMode: 'FILL', heightMode: 'HUG' }),
        txt('lower case', { fontSize: 12, color: C.text, textCase: 'LOWER' }, { widthMode: 'FILL', heightMode: 'HUG' }),
        txt('两端对齐文本对齐文本', { fontSize: 12, color: C.text, textAlign: 'justify', textWrap: true }, { widthMode: 'FILL', heightMode: 'HUG' }),
        txt('截断示例文本内容很长很长很长', { fontSize: 12, color: C.text, textTruncation: 'ENDING', maxLines: 1, textWrap: false }, { widthMode: 'FILL', heightMode: 'HUG' }),
        txt('下划线装饰', { fontSize: 12, color: C.text, textDecoration: 'UNDERLINE' }, { widthMode: 'FILL', heightMode: 'HUG' }),
      ],
      { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', gap: 8, align: 'START' },
    ),

    // blend 抽样：叠放必须用**绝对定位**（flow 兄弟重叠违反 viewport-check 的 no-overlap 不变量）
    frame(
      'Blend 抽样',
      [
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 56, height: 40, mode: 'ABSOLUTE', x: 0, y: 0 }, { background: '#1677FF', borderRadius: 6 }, 'base'),
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 56, height: 40, mode: 'ABSOLUTE', x: 26, y: 0 }, { background: '#EF4444', borderRadius: 6, blendMode: 'MULTIPLY' }, 'multiply'),
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 56, height: 40, mode: 'ABSOLUTE', x: 52, y: 0 }, { background: '#22C55E', borderRadius: 6, blendMode: 'SCREEN' }, 'screen'),
        rect({ widthMode: 'FIXED', heightMode: 'FIXED', width: 108, height: 40, mode: 'ABSOLUTE', x: 108, y: 0 }, { background: 'transparent' }, 'spacer'),
      ],
      { mode: 'ABSOLUTE', widthMode: 'FILL', heightMode: 'FIXED', height: 40 },
    ),
  ];

  return makePage('18-样片-参数矩阵', children, { height: 1600, rootStyle: { background: C.bg } });
}

/* ---------- 区④：原型跳转（交互 + Flow） ---------- */

/** 交互构造：targetId 可省（BACK/CLOSE_OVERLAY/OPEN_LINK 免目标） */
function protoInteraction(
  id: string,
  action: PrototypeInteraction['action'],
  targetId?: string,
  over: Partial<PrototypeInteraction> = {},
): PrototypeInteraction {
  const base: PrototypeInteraction = {
    id,
    trigger: 'ON_CLICK',
    action,
    transition: { kind: 'DISSOLVE', duration: 300, easing: 'EASE_IN_OUT' },
    ...over,
  };
  if (targetId) base.targetId = targetId;
  return base;
}

function protoPage(): UIPage {
  const children: Spec[] = [
    frame(
      '首页',
      [
        txt('④ 原型跳转', { fontSize: 16, fontWeight: 600, color: C.text }, { widthMode: 'FILL', heightMode: 'HUG' }),
        txt('点击卡片 → 详情（Dissolve）', { fontSize: 12, color: C.dim }, { widthMode: 'FILL', heightMode: 'HUG' }),
        rect({ widthMode: 'FILL', heightMode: 'FIXED', height: 56 }, { background: C.primary, borderRadius: 10 }, '去详情'),
        rect({ widthMode: 'FILL', heightMode: 'FIXED', height: 56 }, { background: '#22C55E', borderRadius: 10 }, '打开浮层'),
        rect({ widthMode: 'FILL', heightMode: 'FIXED', height: 56 }, { background: '#F59E0B', borderRadius: 10 }, '滚动到底'),
        rect({ widthMode: 'FILL', heightMode: 'FIXED', height: 56 }, { background: '#8B5CF6', borderRadius: 10 }, '悬停变色'),
        rect({ widthMode: 'FILL', heightMode: 'FIXED', height: 56 }, { background: '#EF4444', borderRadius: 10 }, '延时返回'),
      ],
      { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', gap: 12, padding: [16, 16, 16, 16], align: 'START' },
      { background: C.card, borderRadius: 12 },
    ),
    frame(
      '详情页',
      [
        txt('详情页', { fontSize: 16, fontWeight: 600, color: C.text }, { widthMode: 'FILL', heightMode: 'HUG' }),
        txt('返回上一页 / 打开链接', { fontSize: 12, color: C.dim }, { widthMode: 'FILL', heightMode: 'HUG' }),
        rect({ widthMode: 'FILL', heightMode: 'FIXED', height: 56 }, { background: '#0EA5E9', borderRadius: 10 }, '返回'),
        rect({ widthMode: 'FILL', heightMode: 'FIXED', height: 56 }, { background: '#64748B', borderRadius: 10 }, '外链'),
      ],
      { mode: 'VERTICAL', widthMode: 'FILL', heightMode: 'HUG', gap: 12, padding: [16, 16, 16, 16], align: 'START' },
      { background: C.card, borderRadius: 12 },
    ),
    frame(
      '浮层内容',
      [
        txt('浮层', { fontSize: 14, fontWeight: 600, color: C.text }, { widthMode: 'FILL', heightMode: 'HUG' }),
        txt('点击外部或按钮关闭', { fontSize: 11, color: C.dim }, { widthMode: 'FILL', heightMode: 'HUG' }),
        rect({ widthMode: 'FILL', heightMode: 'FIXED', height: 40 }, { background: '#EF4444', borderRadius: 8 }, '关闭浮层'),
      ],
      { mode: 'VERTICAL', widthMode: 'FIXED', heightMode: 'HUG', width: 220, gap: 8, padding: [16, 16, 16, 16], align: 'START' },
      { background: '#FFFFFF', borderRadius: 12 },
    ),
  ];

  const page = makePage('19-样片-原型跳转', children, { height: 900, rootStyle: { background: C.bg } });

  const [home, detail, overlay] = page.root.children;
  home.flowStart = true;

  // ≥5 类交互：Navigate / Back / Scroll / Open link / Open overlay / Close overlay
  home.interactions = [
    protoInteraction('pi-nav', 'NAVIGATE', detail.id, { transition: { kind: 'DISSOLVE', duration: 300, easing: 'EASE_IN_OUT' } }),
    protoInteraction('pi-overlay', 'OPEN_OVERLAY', overlay.id, {
      overlayPosition: 'CENTER',
      overlayCloseOnOutside: true,
      transition: { kind: 'DISSOLVE', duration: 200, easing: 'EASE_OUT' },
    }),
    protoInteraction('pi-scroll', 'SCROLL', detail.id, { scrollBehavior: 'BOTTOM', trigger: 'ON_PRESS' }),
    protoInteraction('pi-hover', 'NAVIGATE', detail.id, { trigger: 'ON_HOVER', transition: { kind: 'MOVE_IN', duration: 250, easing: 'EASE_OUT', direction: 'LEFT' } }),
    protoInteraction('pi-timeout', 'BACK', detail.id, { trigger: 'AFTER_TIMEOUT', timeoutMs: 1500 }),
  ];
  detail.interactions = [
    protoInteraction('pi-back', 'BACK', home.id, { transition: { kind: 'SLIDE_OUT', duration: 250, easing: 'EASE_IN_OUT', direction: 'RIGHT' } }),
    protoInteraction('pi-link', 'OPEN_LINK', undefined, { url: 'https://example.com', transition: { kind: 'INSTANT' } }),
    protoInteraction('pi-close', 'CLOSE_OVERLAY', undefined),
  ];
  overlay.interactions = [protoInteraction('pi-close2', 'CLOSE_OVERLAY', undefined)];

  // ≥3 Flow：UIPage 无 flows 字段（flows 属 UIProject），故挂到页面级旁挂表供 showcase 审计读取。
  // **按页名索引**（不是 page.id）——demo 页共用 createPage 的默认 id:'page'，
  // 按 id 索引会让所有页拿到同一份 flows（已实测踩坑）。
  SHOWCASE_FLOWS[page.name] = [
    { id: 'flow-main', name: '主流程', startNodeId: home.id },
    { id: 'flow-detail', name: '详情流程', startNodeId: detail.id },
    { id: 'flow-overlay', name: '浮层流程', startNodeId: overlay.id },
  ];

  return page;
}

/** FR-57 区④：Flow 定义旁挂（UIPage 不含 flows；build-pages 落 sidecar 供审计）——按**页名**索引 */
export const SHOWCASE_FLOWS: Record<string, FlowDef[]> = {};

export function showcasePages(): UIPage[] {
  return [kindsPage(), matrixPage(), protoPage()];
}
