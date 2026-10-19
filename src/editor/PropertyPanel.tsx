import type {
  AlignMode,
  BlendMode,
  BorderSchema,
  Effect,
  EffectKind,
  FillKind,
  FillLayer,
  HorizontalConstraint,
  ImageAdjustments,
  JustifyMode,
  LayoutMode,
  SizeMode,
  StyleSchema,
  TextAlign,
  UINode,
  VerticalConstraint,
} from '../schema/types';
import { BLEND_MODES, hasText, isContainer } from '../schema/types';
import { findById } from '../schema/factory';
import { NumField } from './NumericField';
import { useEditor } from './store';
import { useCanvasGeometry } from './canvasContext';
import { canvasBus } from './canvasBus';
import { alignPatches, distributePatches, type AlignItem, type AlignMode as AlignToolMode } from './align';
// P1-03：图片 7 项调整映射表单一事实源（面板/出码/画布共用）
import { IMG_ADJ_FIELDS, imageAdjustCanvasParams } from '../compiler/imageAdjust';

/** FR-14 设备预设（P0-20：iPhone SE = 375×667）——常量抽至 framePresets.ts 供单测锁定 */
import { FRAME_PRESETS } from './framePresets';

function FramePresets() {
  return (
    <div className="prop-section frame-presets">
      <div className="prop-heading">框架预设（点击在视口中心创建）</div>
      <div className="preset-grid">
        {FRAME_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            title={`${p.label} ${p.w}×${p.h}`}
            onClick={() => canvasBus.send({ op: 'createFrame', width: p.w, height: p.h, name: p.label })}
          >
            {p.label}
            <span className="preset-size">
              {p.w}×{p.h}
            </span>
          </button>
        ))}
      </div>
      <div className="align-note">或直接在画布拖画；单击空白处创建 100×100</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field-row">
      <label className="field-label">{label}</label>
      <div className="field-body">{children}</div>
    </div>
  );
}

/**
 * FR-20 余项（Wave1 轨道I 实现，Wave2 主线收敛）：图片 7 项调整滑杆（读写 node.imageAdjustments）。
 *
 * 口径报备：
 * - Wave2 起走 store 专用 action UPDATE_IMAGE_ADJUSTMENTS（transient 滑杆过程 + COMMIT 收笔），撤销粒度与 resize 一致。
 * - **映射表迁移到 `src/compiler/imageAdjust.ts` 单一事实源**（P1-03）：面板/出码/画布三处共用，
 *   避免「面板改了出码没跟」的口径漂移。7 项现已全部出码（Exposure/Contrast/Saturation 精确；
 *   Temperature/Tint/Highlights/Shadows 为近似，见该模块文件头报备）。
 * - 画布为 Konva 渲染不吃 DOM CSS filter：Konva 内建滤镜仅能表达 brightness/contrast/saturate 三项，
 *   色温/色调/高光/阴影在画布上**不生效**（`canvasApproximated` 标记，UI 提示）。
 *   Konva 侧接线见 Canvas.tsx `ImageFilters`（P1-03 接入）。
 */

function ImageAdjustSection({ node }: { node: UINode }) {
  const { dispatch } = useEditor();
  const adj: ImageAdjustments = node.imageAdjustments ?? {};

  const write = (next: ImageAdjustments | undefined) => {
    dispatch({ type: 'UPDATE_IMAGE_ADJUSTMENTS', id: node.id, adjustments: next && Object.keys(next).length ? next : undefined, transient: true });
  };

  const clear = () => {
    dispatch({ type: 'UPDATE_IMAGE_ADJUSTMENTS', id: node.id, adjustments: undefined });
  };

  // 画布可表达性：色温/色调/高光/阴影在 Konva 侧无对应滤镜 → 提示用户「仅出码生效」
  const canvasApprox = imageAdjustCanvasParams(adj).canvasApproximated;

  return (
    <>
      <Row label="调整">
        <div className="props-note">
          7 项均出码为 CSS filter（3 项精确、4 项近似）
          {canvasApprox && <span className="props-warn"> · 画布不显示近似项</span>}
        </div>
      </Row>
      {IMG_ADJ_FIELDS.map((f) => (
        <Row key={f.key} label={f.label}>
          <input
            type="range"
            min={f.min}
            max={f.max}
            step={f.step}
            value={adj[f.key] ?? f.def}
            onChange={(e) => write({ ...adj, [f.key]: Number(e.target.value) })}
          />
          <span className="num-suffix">{adj[f.key] ?? f.def}</span>
        </Row>
      ))}
      <button type="button" className="mini-btn" onClick={clear}>
        重置调整
      </button>
      <div className="props-note">
        出码口径：曝光→brightness、对比→contrast、饱和→saturate（编译器主线合成 CSS filter）；色温/色调/高光/阴影本期占位。
      </div>
    </>
  );
}


function SelectField<T extends string>({
  value,
  options,
  onChange,
  disabled,
  title,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  /** 语义上不适用时置灰（如 HUG 文本的「垂直对」），配合 title 说明原因 */
  disabled?: boolean;
  title?: string;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      title={title}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function ColorField({ value, onInput, onCommit }: { value: string; onInput: (v: string) => void; onCommit: () => void }) {
  const isHex = /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <span className="color-field">
      <input
        type="color"
        value={isHex ? value : '#000000'}
        onChange={(e) => onInput(e.target.value)}
        onBlur={onCommit}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onInput(e.target.value)}
        onBlur={onCommit}
      />
    </span>
  );
}

/** FR-18：保留描边扩展字段（宽/色/样式之外） */
function pickBorderKeys(b?: BorderSchema): Partial<BorderSchema> {
  if (!b) return {};
  const { width: _w, color: _c, style: _s, ...rest } = b;
  return rest;
}

/** FR-18：确保 border 字段完整（Figma 默认 1px inside） */
function defaultBorder(b?: BorderSchema): BorderSchema {
  return b ?? { width: 1, color: '#000000', style: 'solid' };
}

const SIZE_OPTIONS: { value: SizeMode; label: string }[] = [
  { value: 'FIXED', label: '固定' },
  { value: 'FILL', label: '填充' },
  { value: 'HUG', label: '包裹' },
];

const MODE_OPTIONS: { value: LayoutMode; label: string }[] = [
  { value: 'VERTICAL', label: '纵向' },
  { value: 'HORIZONTAL', label: '横向' },
  { value: 'ABSOLUTE', label: '绝对定位' },
];

const ALIGN_OPTIONS: { value: AlignMode; label: string }[] = [
  { value: 'START', label: '起始' },
  { value: 'CENTER', label: '居中' },
  { value: 'END', label: '末尾' },
  { value: 'STRETCH', label: '拉伸' },
];

/** FR-36：基线对齐仅横向 auto layout 有意义（纵向隐藏该档） */
const ALIGN_OPTIONS_ROW: { value: AlignMode; label: string }[] = [
  ...ALIGN_OPTIONS,
  { value: 'BASELINE', label: '基线' },
];

const WRAP_OPTIONS: { value: 'NO_WRAP' | 'WRAP'; label: string }[] = [
  { value: 'NO_WRAP', label: '不折行' },
  { value: 'WRAP', label: '折行' },
];

const JUSTIFY_OPTIONS: { value: JustifyMode; label: string }[] = [
  { value: 'START', label: '起始' },
  { value: 'CENTER', label: '居中' },
  { value: 'END', label: '末尾' },
  { value: 'SPACE_BETWEEN', label: '两端分布' },
];

const TEXT_ALIGN_OPTIONS: { value: TextAlign; label: string }[] = [
  { value: 'left', label: '左对齐' },
  { value: 'center', label: '居中' },
  { value: 'right', label: '右对齐' },
  { value: 'justify', label: '两端' },
];

const TEXT_ALIGN_V_OPTIONS: { value: 'TOP' | 'CENTER' | 'BOTTOM'; label: string }[] = [
  { value: 'TOP', label: '顶部' },
  { value: 'CENTER', label: '居中' },
  { value: 'BOTTOM', label: '底部' },
];

const LINE_H_MODE_OPTIONS: { value: 'AUTO' | 'PIXELS' | 'PERCENT'; label: string }[] = [
  { value: 'PIXELS', label: 'px' },
  { value: 'AUTO', label: '自动' },
  { value: 'PERCENT', label: '%' },
];

const LS_MODE_OPTIONS: { value: 'PIXELS' | 'PERCENT'; label: string }[] = [
  { value: 'PIXELS', label: 'px' },
  { value: 'PERCENT', label: '%' },
];

const TEXT_CASE_OPTIONS: { value: NonNullable<StyleSchema['textCase']>; label: string }[] = [
  { value: 'ORIGINAL', label: '原样' },
  { value: 'UPPER', label: '全部大写' },
  { value: 'LOWER', label: '全部小写' },
  { value: 'TITLE', label: '标题大写' },
  { value: 'SMALL_CAPS', label: '小型大写' },
];

const TEXT_DEC_OPTIONS: { value: NonNullable<StyleSchema['textDecoration']>; label: string }[] = [
  { value: 'NONE', label: '无' },
  { value: 'UNDERLINE', label: '下划线' },
  { value: 'STRIKETHROUGH', label: '删除线' },
];

/** FR-34 混合模式中文标签（ BlendMode 枚举一对一；CSS 值仍由 schema 单源承载） */
const BLEND_LABELS: Record<string, string> = {
  NORMAL: '正常',
  DARKEN: '变暗',
  MULTIPLY: '正片叠底',
  COLOR_BURN: '颜色加深',
  LIGHTEN: '变亮',
  SCREEN: '滤色',
  COLOR_DODGE: '颜色减淡',
  OVERLAY: '叠加',
  SOFT_LIGHT: '柔光',
  HARD_LIGHT: '强光',
  DIFFERENCE: '差值',
  EXCLUSION: '排除',
  HUE: '色相',
  SATURATION: '饱和度',
  COLOR: '颜色',
  LUMINOSITY: '明度',
};

/** FR-15 Auto resize 3 模式（联动 layout widthMode/heightMode） */
const AUTO_RESIZE_OPTIONS: { value: 'WIDTH_AND_HEIGHT' | 'HEIGHT' | 'FIXED'; label: string }[] = [
  { value: 'WIDTH_AND_HEIGHT', label: '自动宽高' },
  { value: 'HEIGHT', label: '定宽自动高' },
  { value: 'FIXED', label: '固定尺寸' },
];

/**
 * 由渲染几何反推 x/y（相对父内容区原点、扣自身 margin，与引擎 assign/layout 落位口径一致）。
 * 用于切「绝对定位」时保持当前视觉位置，避免节点跳到 (0,0)。
 */
function absXYFromGeometry(
  g: { x: number; y: number },
  pg: { x: number; y: number },
  parentPadding: number[] | undefined,
  selfMargin: number[] | undefined,
): { x: number; y: number } {
  const p = parentPadding ?? [0, 0, 0, 0];
  const m = selfMargin ?? [0, 0, 0, 0];
  return { x: Math.round(g.x - pg.x - p[3] - m[3]), y: Math.round(g.y - pg.y - p[0] - m[0]) };
}

/**
 * FR-28：多选时属性面板顶部显示对齐/等距分布按钮。
 * 仅当选中节点共享同一 ABSOLUTE 父级时生效（流式父级由布局算法排布，Figma 语义下不移动）。
 */
function AlignToolbar() {
  const geometry = useCanvasGeometry();
  const { state, dispatch } = useEditor();
  const ids = state.selectedIds.filter((id) => id !== state.page.root.id);
  if (ids.length < 2 || !geometry) return null;

  const parents = ids.map((id) => findById(state.page.root, id)?.parent ?? null);
  const first = parents[0];
  const sameParent = !!first && parents.every((p) => p && p.id === first!.id);
  const absEnabled = sameParent && first!.layout.mode === 'ABSOLUTE';
  const parentId = first?.id;
  const parentGeom = parentId ? geometry[parentId] : undefined;

  const items: AlignItem[] = [];
  for (const id of ids) {
    const g = geometry[id];
    if (!g) return null;
    items.push({ id, rect: g });
  }

  const apply = (patches: { id: string; x?: number; y?: number }[]) => {
    if (!parentGeom) return;
    const p = first!.layout.padding ?? [0, 0, 0, 0];
    const origin = { x: parentGeom.x + p[3], y: parentGeom.y + p[0] };
    const next: { id: string; patch: Record<string, number> }[] = [];
    for (const patch of patches) {
      const found = findById(state.page.root, patch.id);
      const g = geometry[patch.id];
      if (!found || !g) continue;
      const ml = found.node.layout.margin?.[3] ?? 0;
      const mt = found.node.layout.margin?.[0] ?? 0;
      const out: Record<string, number> = {};
      let changed = false;
      if (patch.x != null) {
        const v = Math.round(patch.x - origin.x - ml);
        out.x = v;
        if (v !== Math.round(g.x - origin.x - ml)) changed = true;
      }
      if (patch.y != null) {
        const v = Math.round(patch.y - origin.y - mt);
        out.y = v;
        if (v !== Math.round(g.y - origin.y - mt)) changed = true;
      }
      if (changed) next.push({ id: patch.id, patch: out });
    }
    if (next.length) dispatch({ type: 'UPDATE_LAYOUT_MULTI', patches: next });
  };

  const onAlign = (mode: AlignToolMode) => apply(alignPatches(items, mode));
  const onDistribute = (axis: 'h' | 'v') => apply(distributePatches(items, axis));
  const disabled = !absEnabled;
  const title = disabled ? '多选需同一绝对定位父级（流式父级按布局自动排列）' : undefined;

  const btn = (label: string, t: string, onClick: () => void, off = false) => (
    <button type="button" title={title ?? t} disabled={disabled || off} onClick={onClick}>
      {label}
    </button>
  );

  return (
    <div className="prop-section align-toolbar">
      <div className="prop-heading">对齐 · 分布（{ids.length}）</div>
      <div className="align-buttons">
        {btn('⇤', '左对齐', () => onAlign('left'))}
        {btn('⇔', '水平居中', () => onAlign('hcenter'))}
        {btn('⇥', '右对齐', () => onAlign('right'))}
        {btn('↥', '顶对齐', () => onAlign('top'))}
        {btn('↕', '垂直居中', () => onAlign('vcenter'))}
        {btn('↧', '底对齐', () => onAlign('bottom'))}
        <span className="align-divider" />
        {btn('⋯', '水平等距分布', () => onDistribute('h'), ids.length < 3)}
        {btn('⋮', '垂直等距分布', () => onDistribute('v'), ids.length < 3)}
      </div>
      {disabled && <div className="align-note">流式父级由布局自动排列，对齐仅作用于绝对定位兄弟节点</div>}
    </div>
  );
}

export function PropertyPanel() {
  const { state, dispatch } = useEditor();
  const geometry = useCanvasGeometry();
  const primaryId = state.selectedIds[state.selectedIds.length - 1];
  const found = primaryId ? findById(state.page.root, primaryId) : null;
  const node: UINode | null = found?.node ?? null;

  if (!node) {
    return (
      <div className="props">
        <div className="panel-title">属性</div>
        {state.tool === 'frame' && <FramePresets />}
        <div className="props-empty">未选中元素</div>
      </div>
    );
  }

  const L = node.layout;
  const S = node.style ?? {};
  const parent = found?.parent ?? null;
  const absParent = parent?.layout.mode === 'ABSOLUTE';

  const commit = () => dispatch({ type: 'COMMIT' });
  const setLayout = (patch: Partial<typeof L>, transient = false) =>
    dispatch({ type: 'UPDATE_LAYOUT', id: node.id, patch, transient });
  const setStyle = (patch: Partial<typeof S>, transient = false) =>
    dispatch({ type: 'UPDATE_STYLE', id: node.id, patch, transient });

  /** 切「绝对定位」：保留当前视觉位置（x/y 由渲染几何反推）；容器切流→绝对时按当前排版固化直接子项 x/y（与节点变更同一历史记录） */
  const switchToAbsolute = (): void => {
    const ownPatch: Partial<typeof L> = { mode: 'ABSOLUTE' };
    if (parent && parent.layout.mode !== 'ABSOLUTE') {
      ownPatch.prevMode = L.mode === 'ABSOLUTE' ? L.prevMode : L.mode;
    }
    if (L.x == null || L.y == null) {
      const g = geometry?.[node.id];
      const pg = parent ? geometry?.[parent.id] : undefined;
      if (g && pg) {
        const xy = absXYFromGeometry(g, pg, parent!.layout.padding, L.margin);
        ownPatch.x = xy.x;
        ownPatch.y = xy.y;
      } else {
        ownPatch.x = L.x ?? 0;
        ownPatch.y = L.y ?? 0;
      }
    }
    const childrenXY: { id: string; x: number; y: number }[] = [];
    if (L.mode !== 'ABSOLUTE' && isContainer(node) && node.type !== 'RECTANGLE') {
      const cg = geometry?.[node.id];
      if (cg) {
        for (const c of node.children) {
          if (c.layout.x != null && c.layout.y != null) continue;
          const g2 = geometry?.[c.id];
          if (!g2) continue;
          const xy = absXYFromGeometry(g2, cg, L.padding, c.layout.margin);
          childrenXY.push({ id: c.id, ...xy });
        }
      }
    }
    dispatch({ type: 'UPDATE_LAYOUT', id: node.id, patch: ownPatch, ...(childrenXY.length ? { childrenXY } : {}) });
  };

  const pad = L.padding ?? [0, 0, 0, 0];
  const mar = L.margin ?? [0, 0, 0, 0];

  return (
    <div className="props">
      <div className="panel-title">属性</div>
      {state.tool === 'frame' && <FramePresets />}
      <AlignToolbar />

      <div className="prop-section">
        <div className="prop-heading">位置与尺寸</div>
        {/* X/Y：绝对定位父级子项 / 流父内脱流子项（子 mode=ABSOLUTE）均可直接编辑 */}
        {(absParent || L.mode === 'ABSOLUTE') && (
          <>
            <Row label="X">
              <NumField value={L.x ?? 0} min={-1000} max={2400} onInput={(v) => setLayout({ x: v }, true)} onCommit={commit} />
            </Row>
            <Row label="Y">
              <NumField value={L.y ?? 0} min={-1000} max={2400} onInput={(v) => setLayout({ y: v }, true)} onCommit={commit} />
            </Row>
          </>
        )}
        {/* FR-35 约束 4×2（对照 Figma）；Auto Layout 流内子项显示占位语义（约束不生效） */}
        {parent && absParent && (
          <Row label="约束">
            <select
              className="panel-select"
              value={L.constraints?.horizontal ?? 'LEFT'}
              onChange={(e) => {
                setLayout({ constraints: { horizontal: e.target.value as HorizontalConstraint, vertical: L.constraints?.vertical ?? 'TOP' } });
                commit();
              }}
            >
              <option value="LEFT">左</option>
              <option value="RIGHT">右</option>
              <option value="CENTER">水平居中</option>
              <option value="SCALE">水平缩放</option>
            </select>
            <select
              className="panel-select"
              value={L.constraints?.vertical ?? 'TOP'}
              onChange={(e) => {
                setLayout({ constraints: { horizontal: L.constraints?.horizontal ?? 'LEFT', vertical: e.target.value as VerticalConstraint } });
                commit();
              }}
            >
              <option value="TOP">上</option>
              <option value="BOTTOM">下</option>
              <option value="CENTER">垂直居中</option>
              <option value="SCALE">垂直缩放</option>
            </select>
          </Row>
        )}
        {parent && !absParent && (
          <Row label="约束">
            <div className="props-note">Auto layout（约束不生效）</div>
          </Row>
        )}
        <Row label="W">
          <NumField
            value={L.width}
            suffix="px"
            min={0}
            max={2400}
            disabled={L.widthMode !== 'FIXED'}
            onInput={(v) => setLayout({ width: v }, true)}
            onCommit={commit}
          />
        </Row>
        <Row label="H">
          <NumField
            value={L.height}
            suffix="px"
            min={0}
            max={2400}
            disabled={L.heightMode !== 'FIXED'}
            onInput={(v) => setLayout({ height: v }, true)}
            onCommit={commit}
          />
        </Row>
        <Row label="圆角">
          {Array.isArray(S.borderRadius) ? (
            <span className="radius-grid" data-corner-grid>
              {(S.borderRadius as [number, number, number, number]).map((rv, i) => (
                <NumField
                  key={i}
                  label={(['左上', '右上', '右下', '左下'] as const)[i]}
                  value={rv}
                  suffix="px"
                  min={0}
                  max={500}
                  onInput={(v) => {
                    const arr = [...(S.borderRadius as [number, number, number, number])];
                    arr[i] = v;
                    setStyle({ borderRadius: arr as [number, number, number, number] }, true);
                  }}
                  onCommit={commit}
                />
              ))}
            </span>
          ) : (
            <NumField
              value={typeof S.borderRadius === 'number' ? S.borderRadius : undefined}
              suffix="px"
              min={0}
              max={500}
              onInput={(v) => setStyle({ borderRadius: v }, true)}
              onCommit={commit}
            />
          )}
          <button
            type="button"
            className={`radius-toggle ${Array.isArray(S.borderRadius) ? 'is-active' : ''}`}
            title={Array.isArray(S.borderRadius) ? '合并为统一圆角' : '独立圆角（四角分别设置）'}
            onClick={() => {
              if (Array.isArray(S.borderRadius)) {
                setStyle({ borderRadius: S.borderRadius[0] });
              } else {
                const v = typeof S.borderRadius === 'number' ? S.borderRadius : 0;
                setStyle({ borderRadius: [v, v, v, v] as [number, number, number, number] });
              }
              commit();
            }}
          >
            {Array.isArray(S.borderRadius) ? '▣' : '◻'}
          </button>
        </Row>
        <Row label="平滑">
          <NumField
            value={Math.round((S.cornerSmoothing ?? 0) * 100)}
            suffix="%"
            min={0}
            max={100}
            onInput={(v) => setStyle({ cornerSmoothing: Math.max(0, Math.min(1, v / 100)) }, true)}
            onCommit={commit}
          />
        </Row>
        {/* FR-16 形状参数：POLYGON/STAR 点数与内径、OVAL 弧形（起/止角、内径）；0/360/0=整圆等效普通椭圆 */}
        {node.type === 'POLYGON' && (
          <Row label="边数">
            <NumField
              value={S.pointCount ?? 3}
              min={3}
              max={60}
              onInput={(v) => setStyle({ pointCount: Math.max(3, Math.min(60, Math.round(v))) }, true)}
              onCommit={commit}
            />
          </Row>
        )}
        {node.type === 'STAR' && (
          <>
            <Row label="边数">
              <NumField
                value={S.pointCount ?? 5}
                min={3}
                max={60}
                onInput={(v) => setStyle({ pointCount: Math.max(3, Math.min(60, Math.round(v))) }, true)}
                onCommit={commit}
              />
            </Row>
            <Row label="内径">
              <NumField
                value={Math.round((S.innerRadius ?? 0.38) * 100)}
                suffix="%"
                min={1}
                max={99}
                onInput={(v) => setStyle({ innerRadius: Math.max(0.01, Math.min(0.99, v / 100)) }, true)}
                onCommit={commit}
              />
            </Row>
          </>
        )}
        {node.type === 'OVAL' && (
          <>
            <Row label="起始角">
              <NumField
                value={S.arcData?.startingAngle ?? 0}
                suffix="°"
                min={0}
                max={360}
                onInput={(v) =>
                  setStyle(
                    { arcData: { ...(S.arcData ?? { endingAngle: 360, innerRadius: 0 }), startingAngle: Math.max(0, Math.min(360, v)) } },
                    true,
                  )
                }
                onCommit={commit}
              />
            </Row>
            <Row label="结束角">
              <NumField
                value={S.arcData?.endingAngle ?? 360}
                suffix="°"
                min={0}
                max={360}
                onInput={(v) =>
                  setStyle(
                    { arcData: { ...(S.arcData ?? { startingAngle: 0, innerRadius: 0 }), endingAngle: Math.max(0, Math.min(360, v)) } },
                    true,
                  )
                }
                onCommit={commit}
              />
            </Row>
            <Row label="内径">
              <NumField
                value={Math.round((S.arcData?.innerRadius ?? 0) * 100)}
                suffix="%"
                min={0}
                max={99}
                onInput={(v) =>
                  setStyle(
                    { arcData: { ...(S.arcData ?? { startingAngle: 0, endingAngle: 360 }), innerRadius: Math.max(0, Math.min(0.99, v / 100)) } },
                    true,
                  )
                }
                onCommit={commit}
              />
            </Row>
          </>
        )}
      </div>

      {/* Layout */}
      <div className="prop-section">
        <div className="prop-heading">布局</div>
        {isContainer(node) && node.type !== 'RECTANGLE' && (!parent || parent.layout.mode === 'ABSOLUTE' || L.mode !== 'ABSOLUTE') && (
          <Row label="方向">
            <SelectField
              value={L.mode}
              options={MODE_OPTIONS}
              onChange={(v) => {
                if (v === 'ABSOLUTE' && L.mode !== 'ABSOLUTE') switchToAbsolute();
                else setLayout({ mode: v });
              }}
            />
          </Row>
        )}
        {parent && parent.layout.mode !== 'ABSOLUTE' && (
          <Row label="定位">
            <SelectField
              value={L.mode === 'ABSOLUTE' ? 'ABSOLUTE' : 'FLOW'}
              options={[
                { value: 'FLOW', label: '流内' },
                { value: 'ABSOLUTE', label: '绝对定位' },
              ]}
              onChange={(v) => {
                if (v === 'ABSOLUTE') {
                  switchToAbsolute();
                } else {
                  setLayout({ mode: L.prevMode ?? 'VERTICAL', prevMode: undefined, x: undefined, y: undefined });
                }
              }}
            />
          </Row>
        )}
        <Row label="宽模式">
          <SelectField
            value={L.widthMode}
            options={SIZE_OPTIONS}
            onChange={(v) => setLayout({ widthMode: v, ...(v === 'FIXED' && L.width == null ? { width: 100 } : {}) })}
          />
        </Row>
        <Row label="高模式">
          <SelectField
            value={L.heightMode}
            options={SIZE_OPTIONS}
            onChange={(v) => setLayout({ heightMode: v, ...(v === 'FIXED' && L.height == null ? { height: 40 } : {}) })}
          />
        </Row>
        {node.id !== state.page.root.id && (
          <>
            <Row label="宽限">
              <span className="pad-grid">
                <NumField
                  value={L.minWidth}
                  suffix="min"
                  min={0}
                  max={2000}
                  onInput={(v) => setLayout({ minWidth: v }, true)}
                  onClear={() => setLayout({ minWidth: undefined })}
                  onCommit={commit}
                />
                <NumField
                  value={L.maxWidth}
                  suffix="max"
                  min={0}
                  max={2000}
                  onInput={(v) => setLayout({ maxWidth: v }, true)}
                  onClear={() => setLayout({ maxWidth: undefined })}
                  onCommit={commit}
                />
              </span>
            </Row>
            <Row label="高限">
              <span className="pad-grid">
                <NumField
                  value={L.minHeight}
                  suffix="min"
                  min={0}
                  max={2000}
                  onInput={(v) => setLayout({ minHeight: v }, true)}
                  onClear={() => setLayout({ minHeight: undefined })}
                  onCommit={commit}
                />
                <NumField
                  value={L.maxHeight}
                  suffix="max"
                  min={0}
                  max={2000}
                  onInput={(v) => setLayout({ maxHeight: v }, true)}
                  onClear={() => setLayout({ maxHeight: undefined })}
                  onCommit={commit}
                />
              </span>
            </Row>
          </>
        )}
        {isContainer(node) && (
          <>
            <Row label="内边距">
              <span className="pad-grid">
                {(['上', '右', '下', '左'] as const).map((lbl, i) => (
                  <NumField
                    key={i}
                    label={lbl}
                    value={pad[i]}
                    min={0}
                    max={200}
                    onInput={(v) => {
                      const next: [number, number, number, number] = [...pad] as [number, number, number, number];
                      next[i] = v;
                      setLayout({ padding: next }, true);
                    }}
                    onCommit={commit}
                  />
                ))}
              </span>
            </Row>
            {L.mode !== 'ABSOLUTE' && (
              <Row label="间距">
                <NumField value={L.gap ?? 0} suffix="gap" min={0} max={200} onInput={(v) => setLayout({ gap: v }, true)} onCommit={commit} />
              </Row>
            )}
            {L.mode !== 'ABSOLUTE' && (
              <>
                <Row label="对齐">
                  <SelectField
                    value={L.align ?? 'START'}
                    options={L.mode === 'HORIZONTAL' ? ALIGN_OPTIONS_ROW : ALIGN_OPTIONS}
                    onChange={(v) => setLayout({ align: v })}
                  />
                </Row>
                <Row label="分布">
                  <SelectField value={L.justify ?? 'START'} options={JUSTIFY_OPTIONS} onChange={(v) => setLayout({ justify: v })} />
                </Row>
                <Row label="折行">
                  <SelectField
                    value={L.wrap ?? 'NO_WRAP'}
                    options={WRAP_OPTIONS}
                    onChange={(v) => setLayout({ wrap: v })}
                  />
                </Row>
                {L.wrap === 'WRAP' && (
                  <Row label="行间距">
                    <NumField
                      value={L.gapCross ?? L.gap ?? 0}
                      suffix="gap"
                      min={0}
                      max={200}
                      onInput={(v) => setLayout({ gapCross: v }, true)}
                      onCommit={commit}
                    />
                  </Row>
                )}
              </>
            )}
            <Row label="裁剪">
              <button
                type="button"
                className={`radius-toggle ${L.clipContent ? 'is-active' : ''}`}
                title="裁剪溢出：内容超出容器时隐藏"
                onClick={() => {
                  setLayout({ clipContent: !L.clipContent });
                  commit();
                }}
              >
                {L.clipContent ? '▣' : '◻'}
              </button>
            </Row>
          </>
        )}
        <Row label="外边距">
          <span className="pad-grid">
            {(['上', '右', '下', '左'] as const).map((lbl, i) => (
              <NumField
                key={i}
                label={lbl}
                value={mar[i]}
                min={0}
                max={200}
                onInput={(v) => {
                  const next: [number, number, number, number] = [...mar] as [number, number, number, number];
                  next[i] = v;
                  setLayout({ margin: next }, true);
                }}
                onCommit={commit}
              />
            ))}
          </span>
        </Row>
      </div>

      {/* 图层（FR-34：混合模式 20 种 + 不透明度） */}
      <div className="prop-section">
        <div className="prop-heading">图层</div>
        <Row label="混合">
          <select
            className="panel-select"
            value={S.blendMode ?? 'NORMAL'}
            onChange={(e) => {
              setStyle({ blendMode: e.target.value as BlendMode });
              commit();
            }}
          >
            {BLEND_MODES.map((m) => (
              <option key={m} value={m}>
                {BLEND_LABELS[m] ?? m}
              </option>
            ))}
          </select>
        </Row>
        <Row label="不透明度">
          <NumField
            value={Math.round((S.opacity ?? 1) * 100)}
            min={0}
            max={100}
            suffix="%"
            onInput={(v) => setStyle({ opacity: Math.min(1, Math.max(0, v / 100)) }, true)}
            onCommit={commit}
          />
        </Row>
      </div>

      {/* Fill（FR-17 多层：增删/排序/显隐/透明度 + 五型） */}
      <div className="prop-section">
        <div className="prop-heading">填充</div>
        {(() => {
          const fills: FillLayer[] =
            S.fills ?? (S.background && S.background !== 'transparent' ? [{ type: 'SOLID', color: S.background }] : []);
          const commitFills = (next: FillLayer[]) => setStyle({ fills: next, background: undefined }, true);
          const changeType = (f: FillLayer, type: FillKind): FillLayer => {
            if (type === 'SOLID') return { ...f, type, color: f.stops?.[0]?.color ?? f.color ?? '#E8E8E8' };
            const base = f.color ?? f.stops?.[0]?.color ?? '#E8E8E8';
            return {
              ...f,
              type,
              stops: f.stops && f.stops.length ? f.stops : [
                { position: 0, color: base },
                { position: 1, color: '#FFFFFF' },
              ],
              angle: f.angle ?? 0,
            };
          };
          return (
            <>
              {fills.map((f, i) => (
                <div className="fill-layer" key={`fill-${i}`}>
                  <div className="fill-layer-head">
                    <button
                      type="button"
                      className="mini-btn"
                      title={f.visible === false ? '显示该层' : '隐藏该层'}
                      onClick={() => commitFills(fills.map((x, j) => (j === i ? { ...x, visible: x.visible === false } : x)))}
                    >
                      {f.visible === false ? '隐' : '显'}
                    </button>
                    {f.type === 'SOLID' ? (
                      <ColorField
                        value={f.color ?? '#E8E8E8'}
                        onInput={(v) => commitFills(fills.map((x, j) => (j === i ? { ...x, color: v } : x)))}
                        onCommit={commit}
                      />
                    ) : (
                      <span className="fill-gradient-chip" title={f.type}>
                        渐变
                      </span>
                    )}
                    <SelectField
                      value={f.type}
                      options={[
                        { value: 'SOLID', label: '纯色' },
                        { value: 'GRADIENT_LINEAR', label: '线性' },
                        { value: 'GRADIENT_RADIAL', label: '径向' },
                        { value: 'GRADIENT_ANGULAR', label: '角度' },
                        { value: 'GRADIENT_DIAMOND', label: '菱形' },
                      ]}
                      onChange={(v) => commitFills(fills.map((x, j) => (j === i ? changeType(x, v as FillKind) : x)))}
                    />
                    <NumField
                      value={Math.round((f.opacity ?? 1) * 100)}
                      min={0}
                      max={100}
                      suffix="%"
                      onInput={(v) => commitFills(fills.map((x, j) => (j === i ? { ...x, opacity: Math.min(1, Math.max(0, v / 100)) } : x)))}
                      onCommit={commit}
                    />
                    <button
                      type="button"
                      className="mini-btn"
                      title="上移"
                      disabled={i === 0}
                      onClick={() => {
                        const next = [...fills];
                        [next[i - 1], next[i]] = [next[i], next[i - 1]];
                        commitFills(next);
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="mini-btn"
                      title="下移"
                      disabled={i === fills.length - 1}
                      onClick={() => {
                        const next = [...fills];
                        [next[i + 1], next[i]] = [next[i], next[i + 1]];
                        commitFills(next);
                      }}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="mini-btn"
                      title="删除该层"
                      onClick={() => commitFills(fills.filter((_, j) => j !== i))}
                    >
                      ×
                    </button>
                  </div>
                  {f.type !== 'SOLID' && (
                  <div className="eff-params">
                      <Row label="角度">
                        <NumField
                          value={f.angle ?? 0}
                          min={-360}
                          max={360}
                          suffix="°"
                          onInput={(v) => commitFills(fills.map((x, j) => (j === i ? { ...x, angle: v } : x)))}
                          onCommit={commit}
                        />
                      </Row>
                      {(f.stops ?? []).map((s, si) => (
                        <div className="fill-stop" key={`stop-${i}-${si}`}>
                          <NumField
                            value={Math.round(s.position * 100)}
                            min={0}
                            max={100}
                            suffix="%"
                            onInput={(v) =>
                              commitFills(
                                fills.map((x, j) =>
                                  j === i
                                    ? { ...x, stops: (x.stops ?? []).map((y, k) => (k === si ? { ...y, position: Math.min(1, Math.max(0, v / 100)) } : y)) }
                                    : x,
                                ),
                              )
                            }
                            onCommit={commit}
                          />
                          <ColorField
                            value={s.color}
                            onInput={(v) =>
                              commitFills(
                                fills.map((x, j) =>
                                  j === i ? { ...x, stops: (x.stops ?? []).map((y, k) => (k === si ? { ...y, color: v } : y)) } : x,
                                ),
                              )
                            }
                            onCommit={commit}
                          />
                          <NumField
                            value={Math.round((s.opacity ?? 1) * 100)}
                            min={0}
                            max={100}
                            suffix="%"
                            onInput={(v) =>
                              commitFills(
                                fills.map((x, j) =>
                                  j === i
                                    ? { ...x, stops: (x.stops ?? []).map((y, k) => (k === si ? { ...y, opacity: Math.min(1, Math.max(0, v / 100)) } : y)) }
                                    : x,
                                ),
                              )
                            }
                            onCommit={commit}
                          />
                          <button
                            type="button"
                            className="mini-btn"
                            title="删除停靠点"
                            disabled={(f.stops ?? []).length <= 2}
                            onClick={() =>
                              commitFills(
                                fills.map((x, j) => (j === i ? { ...x, stops: (x.stops ?? []).filter((_, k) => k !== si) } : x)),
                              )
                            }
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="mini-btn"
                        onClick={() =>
                          commitFills(
                            fills.map((x, j) =>
                              j === i ? { ...x, stops: [...(x.stops ?? []), { position: 1, color: '#FFFFFF' }].sort((a, b2) => a.position - b2.position) } : x,
                            ),
                          )
                        }
                      >
                        + 停靠点
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="mini-btn add-layer-btn"
                onClick={() => commitFills([...fills, { type: 'SOLID', color: '#E8E8E8' }])}
              >
                + 添加填充
              </button>
              {!S.fills && !S.background && <div className="props-note">当前无填充（点击添加）</div>}
            </>
          );
        })()}
      </div>

      {/* Stroke（FR-18 宽度/四边独立/三对齐/dash/cap/join/miter/透明度） */}
      <div className="prop-section">
        <div className="prop-heading">描边</div>
        <Row label={S.border?.widths ? '四边宽' : '宽度'}>
          {S.border?.widths ? (
            <div className="radius-grid">
              {(['border-top', 'border-right', 'border-bottom', 'border-left'] as const).map((k, idx) => (
                <NumField
                  key={k}
                  label={(['上', '右', '下', '左'] as const)[idx]}
                  value={S.border?.widths?.[idx] ?? 0}
                  min={0}
                  max={40}
                  suffix="w"
                  onInput={(v) => {
                    const widths = [...(S.border?.widths ?? [0, 0, 0, 0])] as [number, number, number, number];
                    widths[idx] = Math.max(0, v);
                    setStyle({ border: { ...S.border, width: S.border?.width ?? 1, color: S.border?.color ?? '#000000', widths } }, true);
                  }}
                  onCommit={commit}
                />
              ))}
            </div>
          ) : (
            <NumField
              value={S.border?.width ?? 0}
              suffix="w"
              min={0}
              max={40}
              onInput={(v) =>
                setStyle({ border: { width: v, color: S.border?.color ?? '#000000', style: S.border?.style ?? 'solid', ...pickBorderKeys(S.border) } }, true)
              }
              onCommit={commit}
            />
          )}
          <ColorField
            value={S.border?.color ?? '#000000'}
            onInput={(v) =>
              setStyle({ border: { width: S.border?.width ?? 1, color: v, style: S.border?.style ?? 'solid', ...pickBorderKeys(S.border) } }, true)
            }
            onCommit={commit}
          />
          <button
            type="button"
            className="mini-btn"
            title={S.border?.widths ? '回到单值宽度' : '四边独立宽度'}
            onClick={() => {
              const cur = S.border ?? { width: 1, color: '#000000' };
              if (cur.widths) {
                const { widths: _d, ...rest } = cur;
                setStyle({ border: rest }, true);
              } else {
                setStyle({ border: { ...cur, widths: [cur.width, cur.width, cur.width, cur.width] } }, true);
              }
              commit();
            }}
          >
            {S.border?.widths ? '▣' : '◻'}
          </button>
        </Row>
        <Row label="对齐">
          <SelectField
            value={S.border?.align ?? 'INSIDE'}
            options={[
              { value: 'INSIDE', label: '内侧' },
              { value: 'CENTER', label: '居中' },
              { value: 'OUTSIDE', label: '外侧' },
            ]}
            onChange={(v) => setStyle({ border: { ...defaultBorder(S.border), align: v as 'INSIDE' | 'CENTER' | 'OUTSIDE' } }, true)}
          />
        </Row>
        <Row label="透明度">
          <NumField
            value={Math.round((S.border?.opacity ?? 1) * 100)}
            min={0}
            max={100}
            suffix="%"
            onInput={(v) => setStyle({ border: { ...defaultBorder(S.border), opacity: Math.min(1, Math.max(0, v / 100)) } }, true)}
            onCommit={commit}
          />
        </Row>
        <Row label="虚线">
          <NumField
            value={S.border?.dash?.[0] ?? 0}
            suffix="d"
            min={0}
            max={100}
            onInput={(v) => setStyle({ border: { ...defaultBorder(S.border), ...(v > 0 ? { dash: [v, S.border?.dash?.[1] ?? v] as [number, number] } : { dash: undefined }) } }, true)}
            onCommit={commit}
          />
          <NumField
            value={S.border?.dash?.[1] ?? 0}
            suffix="g"
            min={0}
            max={100}
            onInput={(v) => setStyle({ border: { ...defaultBorder(S.border), ...(S.border?.dash ? { dash: [S.border.dash[0], Math.max(0, v)] as [number, number] } : {}) } }, true)}
            onCommit={commit}
          />
        </Row>
        <Row label="端点">
          <SelectField
            value={S.border?.cap ?? 'NONE'}
            options={[
              { value: 'NONE', label: '无端点' },
              { value: 'ROUND', label: '圆角' },
              { value: 'SQUARE', label: '方角' },
              { value: 'ARROW_LINES', label: '线形箭头' },
              { value: 'ARROW_TRIANGLED', label: '三角箭头' },
              { value: 'ARROW_DIAMOND', label: '菱形箭头' },
              { value: 'ARROW_POLYGON', label: '多边形箭头' },
              { value: 'ARROW_CIRCLE', label: '圆形箭头' },
            ]}
            onChange={(v) => setStyle({ border: { ...defaultBorder(S.border), cap: v as NonNullable<BorderSchema['cap']> } }, true)}
          />
        </Row>
        <Row label="连接">
          <SelectField
            value={S.border?.join ?? 'MITER'}
            options={[
              { value: 'MITER', label: '尖角' },
              { value: 'ROUND', label: '圆角' },
              { value: 'BEVEL', label: '斜切' },
            ]}
            onChange={(v) => setStyle({ border: { ...defaultBorder(S.border), join: v as NonNullable<BorderSchema['join']> } }, true)}
          />
          {(S.border?.join ?? 'MITER') === 'MITER' && (
            <NumField
              value={S.border?.miterLimit ?? 4}
              min={1}
              max={100}
              suffix="m"
              onInput={(v) => setStyle({ border: { ...defaultBorder(S.border), miterLimit: Math.max(1, v) } }, true)}
              onCommit={commit}
            />
          )}
        </Row>
      </div>

      {/* Effects（FR-19 8 类：增删/排序/显隐 + 分类参数） */}
      <div className="prop-section">
        <div className="prop-heading">效果</div>
        {(() => {
          const effects: Effect[] = S.effects ?? [];
          const commitEffects = (next: Effect[]) => {
            setStyle({ effects: next.length ? next : undefined, ...(next.length ? { boxShadow: undefined } : {}) }, true);
            commit();
          };
          const swap = (i: number, dir: -1 | 1) => {
            const j = i + dir;
            if (j < 0 || j >= effects.length) return;
            const next = [...effects];
            [next[i], next[j]] = [next[j], next[i]];
            commitEffects(next);
          };
          /** 效果参数滑条区间（key 由 effNum 调用点传入） */
          const EFF_RANGES: Record<string, [number, number]> = {
            x: [-100, 100],
            y: [-100, 100],
            blur: [0, 100],
            spread: [0, 50],
            radius: [0, 200],
            startRadius: [0, 200],
            density: [0, 20],
            opacity: [0, 100],
            refraction: [0, 200],
            depth: [0, 100],
            dispersion: [0, 50],
            highlight: [0, 100],
            saturation: [0, 300],
            particleSize: [0, 40],
          };
          const effNum = (e: Effect, i: number, key: keyof Effect, label: string, def: number, suffix?: string, pct = false) => (
            <label className="eff-field" key={`${i}-${String(key)}`}>
              <span>{label}</span>
              <NumField
                value={pct ? Math.round(((e[key] as number | undefined) ?? def) * 100) : (e[key] as number | undefined) ?? def}
                min={EFF_RANGES[String(key)]?.[0] ?? 0}
                max={EFF_RANGES[String(key)]?.[1] ?? 100}
                suffix={suffix}
                onInput={(v) => commitEffects(effects.map((x, j) => (j === i ? { ...x, [key]: pct ? v / 100 : v } : x)))}
                onCommit={commit}
              />
            </label>
          );
          const shadowLabel: Record<string, string> = {
            DROP_SHADOW: '投影',
            INNER_SHADOW: '内阴影',
            LAYER_BLUR: '图层模糊',
            BACKGROUND_BLUR: '背景模糊',
            PROGRESSIVE_BLUR: '渐进模糊',
            NOISE: '噪点',
            TEXTURE: '纹理',
            GLASS: '玻璃',
          };
          return (
            <>
              {effects.map((e, i) => (
                <div className="fill-layer" key={`eff-${i}`}>
                  <div className="fill-layer-head">
                    <button
                      type="button"
                      className="mini-btn"
                      title={e.visible === false ? '显示' : '隐藏'}
                      onClick={() => commitEffects(effects.map((x, j) => (j === i ? { ...x, visible: x.visible === false ? undefined : false } : x)))}
                    >
                      {e.visible === false ? '○' : '●'}
                    </button>
                    <select
                      className="panel-select fill-type"
                      value={e.kind}
                      onChange={(ev) => commitEffects(effects.map((x, j) => (j === i ? { ...x, kind: ev.target.value as EffectKind } : x)))}
                    >
                      {(Object.keys(shadowLabel) as EffectKind[]).map((k) => (
                        <option key={k} value={k}>
                          {shadowLabel[k]}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="mini-btn" title="上移" disabled={i === 0} onClick={() => swap(i, -1)}>
                      ↑
                    </button>
                    <button type="button" className="mini-btn" title="下移" disabled={i === effects.length - 1} onClick={() => swap(i, 1)}>
                      ↓
                    </button>
                    <button type="button" className="mini-btn" title="删除" onClick={() => commitEffects(effects.filter((_, j) => j !== i))}>
                      ✕
                    </button>
                  </div>
                  <div className="fill-gradient">
                    {(e.kind === 'DROP_SHADOW' || e.kind === 'INNER_SHADOW') && (
                      <>
                        {effNum(e, i, 'x', 'X', 0)}
                        {effNum(e, i, 'y', 'Y', 4)}
                        {effNum(e, i, 'blur', '模糊', 4)}
                        {effNum(e, i, 'spread', '扩展', 0)}
                        <label className="eff-field">
                          <span>颜色</span>
                          <input
                            type="text"
                            value={e.color ?? 'rgba(0,0,0,0.2)'}
                            onChange={(ev) => commitEffects(effects.map((x, j) => (j === i ? { ...x, color: ev.target.value } : x)))}
                            onBlur={commit}
                          />
                        </label>
                      </>
                    )}
                    {(e.kind === 'LAYER_BLUR' || e.kind === 'BACKGROUND_BLUR') && effNum(e, i, 'radius', '半径', 8, 'px')}
                    {e.kind === 'PROGRESSIVE_BLUR' && (
                      <>
                        {effNum(e, i, 'radius', '半径', 16, 'px')}
                        {effNum(e, i, 'startRadius', '起始', 0, 'px')}
                      </>
                    )}
                    {(e.kind === 'NOISE' || e.kind === 'TEXTURE') && (
                      <>
                        {effNum(e, i, 'radius', '粒径', 8)}
                        {effNum(e, i, 'density', '密度', 2)}
                        {effNum(e, i, 'opacity', '强度', 0.5, undefined, true)}
                        <label className="eff-field">
                          <span>颜色</span>
                          <input
                            type="text"
                            value={e.color ?? '#000000'}
                            onChange={(ev) => commitEffects(effects.map((x, j) => (j === i ? { ...x, color: ev.target.value } : x)))}
                            onBlur={commit}
                          />
                        </label>
                      </>
                    )}
                    {e.kind === 'GLASS' && (
                      <>
                        {effNum(e, i, 'refraction', '折射', 10)}
                        {effNum(e, i, 'depth', '深度', 8)}
                        {effNum(e, i, 'dispersion', '色散', 0)}
                        {effNum(e, i, 'highlight', '高光', 0)}
                        {effNum(e, i, 'saturation', '饱和', 140, '%')}
                      </>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                className="mini-btn add-layer-btn"
                onClick={() => commitEffects([...effects, { kind: 'DROP_SHADOW', x: 0, y: 4, blur: 12, spread: 0, color: 'rgba(0,0,0,0.2)' }])}
              >
                + 添加效果
              </button>
              {!S.effects && S.boxShadow && <div className="props-note">旧阴影字段生效中（添加效果后自动迁移）</div>}
            </>
          );
        })()}
      </div>

      {/* FR-27 样式：样式引用 / 从选中创建 / 应用 */}
      <div className="prop-section">
        <div className="prop-heading">样式</div>
        {(() => {
          const refId = node.styleTokenId;
          const refToken = refId ? state.tokens.find((t) => t.id === refId) : undefined;
          const isRootNode = node.id === state.page.root.id;
          return (
            <>
              {refToken ? (
                <Row label="已引用">
                  <span className="pad-grid">
                    <span className="props-note" title={refToken.cssVar}>
                      {refToken.name}
                    </span>
                    <button
                      className="mini-btn"
                      title="分离样式（保留当前值，仅解除联动）"
                      onClick={() => dispatch({ type: 'DETACH_TOKEN', id: node.id })}
                    >
                      分离
                    </button>
                  </span>
                </Row>
              ) : (
                <div className="props-note">未引用样式</div>
              )}
              <Row label="创建">
                <span className="pad-grid">
                  <button
                    className="mini-btn"
                    title="从当前填充创建颜色样式并应用"
                    onClick={() =>
                      dispatch({
                        type: 'CREATE_TOKEN',
                        kind: 'PAINT',
                        style: { background: S.background, fills: S.fills },
                        nodeId: isRootNode ? undefined : node.id,
                      })
                    }
                  >
                    ＋ 颜色
                  </button>
                  <button
                    className="mini-btn"
                    title="从当前排版创建文本样式并应用"
                    onClick={() =>
                      dispatch({
                        type: 'CREATE_TOKEN',
                        kind: 'TEXT',
                        style: {
                          fontFamily: S.fontFamily,
                          fontSize: S.fontSize,
                          fontWeight: S.fontWeight,
                          color: S.color,
                          lineHeight: S.lineHeight,
                          letterSpacing: S.letterSpacing,
                        },
                        nodeId: isRootNode ? undefined : node.id,
                      })
                    }
                  >
                    ＋ 文本
                  </button>
                </span>
              </Row>
              {state.tokens.length > 0 && (
                <Row label="应用">
                  <SelectField
                    value={refId ?? ''}
                    options={[
                      { value: '', label: '（不应用）' },
                      ...state.tokens.map((t) => ({ value: t.id, label: t.name })),
                    ]}
                    onChange={(v) => {
                      if (!v) {
                        if (refId) dispatch({ type: 'DETACH_TOKEN', id: node.id });
                        return;
                      }
                      dispatch({ type: 'APPLY_TOKEN', tokenId: v, nodeId: node.id });
                    }}
                  />
                </Row>
              )}
            </>
          );
        })()}
      </div>

      {/* Typography（FR-15 全字段） */}
      {hasText(node) && (
        <div className="prop-section">
          <div className="prop-heading">排版</div>
          <Row label="字号">
            <NumField value={S.fontSize ?? 16} suffix="px" min={1} max={200} onInput={(v) => setStyle({ fontSize: v }, true)} onCommit={commit} />
          </Row>
          <Row label="字重">
            <NumField
              value={S.fontWeight ?? 400}
              min={100}
              max={900}
              onInput={(v) => setStyle({ fontWeight: v }, true)}
              onCommit={commit}
            />
          </Row>
          <Row label="行高">
            <span className="pad-grid">
              <SelectField
                value={S.lineHeightMode ?? 'PIXELS'}
                options={LINE_H_MODE_OPTIONS}
                onChange={(v) => setStyle({ lineHeightMode: v })}
              />
              <NumField
                value={S.lineHeight ?? (S.lineHeightMode === 'PERCENT' ? 140 : Math.round((S.fontSize ?? 16) * 1.4))}
                suffix={S.lineHeightMode === 'PERCENT' ? '%' : 'px'}
                min={0}
                max={S.lineHeightMode === 'PERCENT' ? 500 : 300}
                disabled={S.lineHeightMode === 'AUTO'}
                onInput={(v) => setStyle({ lineHeight: v }, true)}
                onCommit={commit}
              />
            </span>
          </Row>
          <Row label="字距">
            <span className="pad-grid">
              <SelectField
                value={S.letterSpacingMode ?? 'PIXELS'}
                options={LS_MODE_OPTIONS}
                onChange={(v) => setStyle({ letterSpacingMode: v })}
              />
              <NumField
                value={S.letterSpacing ?? 0}
                suffix={S.letterSpacingMode === 'PERCENT' ? '%' : 'px'}
                min={S.letterSpacingMode === 'PERCENT' ? 0 : -20}
                max={S.letterSpacingMode === 'PERCENT' ? 300 : 200}
                onInput={(v) => setStyle({ letterSpacing: v }, true)}
                onCommit={commit}
              />
            </span>
          </Row>
          <Row label="段间距">
            <NumField value={S.paragraphSpacing ?? 0} suffix="px" min={0} max={200} onInput={(v) => setStyle({ paragraphSpacing: v }, true)} onCommit={commit} />
          </Row>
          <Row label="首行缩">
            <NumField value={S.paragraphIndent ?? 0} suffix="px" min={0} max={400} onInput={(v) => setStyle({ paragraphIndent: v }, true)} onCommit={commit} />
          </Row>
          <Row label="颜色">
            <ColorField value={S.color ?? '#111111'} onInput={(v) => setStyle({ color: v }, true)} onCommit={commit} />
          </Row>
          <Row label="对齐">
            <SelectField
              value={S.textAlign ?? 'left'}
              options={TEXT_ALIGN_OPTIONS}
              onChange={(v) => setStyle({ textAlign: v })}
            />
          </Row>
          <Row label="垂直对">
            {/**
             * 垂直对齐仅对「高度固定」的文本生效（compile.ts:635-646 要求
             * `heightMode==='FIXED' && height != null`）——HUG 文本没有多余竖直空间，
             * 对齐语义为空，这与 Figma 一致（Figma 在 auto-height 下也禁用此控件）。
             *
             * 但若仍保持可点而不给提示，用户改完会发现**产物毫无变化**（静默空转），
             * 属 2026-10-18 审计发现的同类 UX 缺口。故 HUG 下置灰 + tooltip 说明。
             */}
            <SelectField
              value={S.textAlignVertical ?? 'TOP'}
              options={TEXT_ALIGN_V_OPTIONS}
              disabled={L.heightMode !== 'FIXED' || L.height == null}
              title={
                L.heightMode !== 'FIXED' || L.height == null
                  ? '垂直对齐仅在「高度模式=固定」时生效（自动高度无多余竖直空间，同 Figma 口径）'
                  : undefined
              }
              onChange={(v) => setStyle({ textAlignVertical: v })}
            />
          </Row>
          <Row label="自动换行">
            <button
              type="button"
              className={`radius-toggle ${S.textWrap !== false ? 'is-active' : ''}`}
              title="自动换行（关闭=保留原行不折）"
              onClick={() => {
                setStyle({ textWrap: S.textWrap === false });
                commit();
              }}
            >
              {S.textWrap !== false ? '▣' : '◻'}
            </button>
          </Row>
          <Row label="自动大小">
            <SelectField
              value={
                L.widthMode === 'HUG' && L.heightMode === 'HUG'
                  ? 'WIDTH_AND_HEIGHT'
                  : L.heightMode === 'HUG'
                    ? 'HEIGHT'
                    : 'FIXED'
              }
              options={AUTO_RESIZE_OPTIONS}
              onChange={(v) => {
                const g = geometry?.[node.id];
                if (v === 'WIDTH_AND_HEIGHT') setLayout({ widthMode: 'HUG', heightMode: 'HUG', width: undefined, height: undefined });
                else if (v === 'HEIGHT') setLayout({ widthMode: 'FIXED', heightMode: 'HUG', width: L.width ?? Math.round(g?.width ?? 100), height: undefined });
                else setLayout({ widthMode: 'FIXED', heightMode: 'FIXED', width: L.width ?? Math.round(g?.width ?? 100), height: L.height ?? Math.round(g?.height ?? 40) });
                commit();
              }}
            />
          </Row>
          <Row label="截断">
            <button
              type="button"
              className={`radius-toggle ${S.textTruncation === 'ENDING' ? 'is-active' : ''}`}
              title="截断：超行末尾加省略号"
              onClick={() => {
                /**
                 * 开启截断时必须**同时落 maxLines**（缺省 2），否则出码不生效：
                 * compile.ts:620 的判据是 `textTruncation === 'ENDING' && maxLines > 0`，
                 * 而「最大行」输入框只显示 `S.maxLines ?? 2` 的**回退值**、不回写 store。
                 * 历史缺陷（2026-10-18 参数审计）：开关点亮、面板显示「2」，但产物无任何
                 * -webkit-line-clamp —— 用户以为开了截断，实际无效。
                 */
                const on = S.textTruncation !== 'ENDING';
                setStyle({ textTruncation: on ? 'ENDING' : 'DISABLED', maxLines: on ? (S.maxLines ?? 2) : S.maxLines });
                commit();
              }}
            >
              {S.textTruncation === 'ENDING' ? '▣' : '◻'}
            </button>
          </Row>
          {S.textTruncation === 'ENDING' && (
            <Row label="最大行">
              <NumField value={S.maxLines ?? 2} min={1} max={20} onInput={(v) => setStyle({ maxLines: v }, true)} onCommit={commit} />
            </Row>
          )}
          <Row label="形态">
            <SelectField
              value={S.textCase ?? 'ORIGINAL'}
              options={TEXT_CASE_OPTIONS}
              onChange={(v) => setStyle({ textCase: v })}
            />
          </Row>
          <Row label="装饰">
            <SelectField
              value={S.textDecoration ?? 'NONE'}
              options={TEXT_DEC_OPTIONS}
              onChange={(v) => setStyle({ textDecoration: v })}
            />
          </Row>
          <Row label="字形增强">
            <span className="pad-grid">
              {(['liga', 'kern', 'dlig'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  className={`radius-toggle ${S.openType?.[k] ? 'is-active' : ''}`}
                  title={k === 'liga' ? '标准连字' : k === 'kern' ? '字距对' : '自由连字'}
                  onClick={() => {
                    setStyle({ openType: { ...S.openType, [k]: !S.openType?.[k] } });
                    commit();
                  }}
                >
                  {k}
                </button>
              ))}
            </span>
          </Row>
        </div>
      )}

      {/* 导出（FR-24 节点导出设置：format/scale/suffix 列表 + ZIP 导出） */}
      <div className="prop-section">
        <div className="prop-heading">导出</div>
        {(() => {
          const settings = node.exportSettings ?? [];
          const commitSettings = (next: typeof settings): void =>
            dispatch({ type: 'UPDATE_EXPORT_SETTINGS', id: node.id, settings: next });
          return (
            <>
              {settings.map((s, i) => {
                const fixed1x = s.format === 'SVG' || s.format === 'PDF';
                return (
                  <div className="fill-layer" key={`exp-${i}`}>
                    <div className="fill-layer-head">
                      <select
                        className="panel-select fill-type"
                        value={s.format}
                        onChange={(e) =>
                          commitSettings(
                            settings.map((x, j) =>
                              j === i
                                ? { ...x, format: e.target.value as typeof s.format, scale: e.target.value === 'SVG' || e.target.value === 'PDF' ? 1 : x.scale }
                                : x,
                            ),
                          )
                        }
                      >
                        <option value="PNG">PNG</option>
                        <option value="JPG">JPG</option>
                        <option value="SVG">SVG</option>
                        <option value="PDF">PDF</option>
                      </select>
                      <select
                        className="panel-select"
                        value={String(s.scale)}
                        onChange={(e) =>
                          commitSettings(settings.map((x, j) => (j === i ? { ...x, scale: Number(e.target.value) as 1 | 2 | 3 } : x)))
                        }
                      >
                        <option value="1">1x</option>
                        <option value="2" disabled={fixed1x}>
                          2x
                        </option>
                        <option value="3" disabled={fixed1x}>
                          3x
                        </option>
                      </select>
                      <button type="button" className="mini-btn" title="删除" onClick={() => commitSettings(settings.filter((_, j) => j !== i))}>
                        ✕
                      </button>
                    </div>
                    <Row label="后缀">
                      <input
                        type="text"
                        placeholder="如 @2x、-dark（可空）"
                        value={s.suffix ?? ''}
                        onChange={(e) => commitSettings(settings.map((x, j) => (j === i ? { ...x, suffix: e.target.value || undefined } : x)))}
                      />
                    </Row>
                    {fixed1x && <div className="props-note">SVG/PDF 恒 1x（对照 Figma 限制）</div>}
                  </div>
                );
              })}
              <button type="button" className="mini-btn add-layer-btn" onClick={() => commitSettings([...settings, { format: 'PNG', scale: 1 }])}>
                + 添加导出设置
              </button>
              {!settings.length && <div className="props-note">无导出设置（文件 → 导出所选将跳过该节点）</div>}
            </>
          );
        })()}
      </div>

      {/* 内容（附加区：名称/文本/图片，位于 FR-28 规定分区之后） */}
      <div className="prop-section">
        <div className="prop-heading">内容</div>
        <Row label="名称">
          <input
            type="text"
            value={node.name ?? ''}
            onChange={(e) => dispatch({ type: 'UPDATE_NAME', id: node.id, name: e.target.value })}
          />
        </Row>
        {hasText(node) && (
          <Row label="文本">
            <textarea
              rows={2}
              value={node.text}
              onChange={(e) => dispatch({ type: 'UPDATE_TEXT', id: node.id, text: e.target.value, transient: true })}
              onBlur={commit}
            />
          </Row>
        )}
        {node.type === 'IMAGE' && (
          <Row label="图片源">
            <input
              type="text"
              placeholder="图片 URL 或 data:image/...;base64,..."
              value={node.src ?? ''}
              onChange={(e) => dispatch({ type: 'UPDATE_SRC', id: node.id, src: e.target.value, transient: true })}
              onBlur={commit}
            />
          </Row>
        )}
        {node.type === 'IMAGE' && (
          <Row label="填充">
            <SelectField
              value={node.style?.imageScaleMode ?? 'FILL'}
              options={[
                { value: 'FILL', label: '填满' },
                { value: 'FIT', label: '适应' },
                { value: 'CROP', label: '裁剪' },
                { value: 'TILE', label: '平铺' },
              ]}
              onChange={(v) => dispatch({ type: 'UPDATE_STYLE', id: node.id, patch: { imageScaleMode: v as 'FILL' | 'FIT' | 'CROP' | 'TILE' }, transient: true })}
            />
          </Row>
        )}
        {node.type === 'IMAGE' && <ImageAdjustSection node={node} />}
      </div>

      {state.selectedIds.length > 1 && (
        <div className="props-empty">已多选 {state.selectedIds.length} 个（编辑最后一个）</div>
      )}
    </div>
  );
}
