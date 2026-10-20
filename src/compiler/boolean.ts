/**
 * FR-22 布尔运算：Union / Intersect / Subtract / Exclude。
 *
 * 口径（有意近似，报备）：**几何布尔是交给浏览器的 SVG 填充规则去算的，本模块不做求交/裁剪**。
 *   Union               → 子路径拼接 + fill-rule: nonzero
 *   Intersect/Subtract/Exclude → 子路径拼接 + fill-rule: evenodd
 * 依据是 SVG 原生语义：evenodd 下「入内次数为奇」的区域被填充，故 B 被扣出 A（A evenodd B = A − B）。
 * 因此这些运算对**同向子路径**（本编译器产出的所有 path 都同向）在多数实际场景下正确；
 * 代价是它们只能表达「A 减掉后加入的路径」，无法表达严格拓扑意义上的
 *   - Intersect：A∩B 的公共外轮廓（非重叠部分应消失，此处保留）
 *   - Exclude：图元两两对称差的完整结果（缺口自身的边界不被描绘，缺口仅在为偶数层重叠时出现）
 *   - Union：严格消去内部边（渲染结果一致，但 d 串里相邻子路径的重复边仍在）
 * 需要严格拓扑时须引入多边形裁剪（Martinez / Clipper）——不在本次范围内，此处按近似口径交付。
 *
 * 纯函数：不依赖 DOM/canvas，可在编辑器与编译器两侧同构复用。
 */
import type { VectorData } from '../schema/types';
import { polyBoolean } from './polyBool';

export type BooleanOp = 'UNION' | 'INTERSECT' | 'SUBTRACT' | 'EXCLUDE';

export const BOOLEAN_OPS: BooleanOp[] = ['UNION', 'INTERSECT', 'SUBTRACT', 'EXCLUDE'];

export interface BooleanResult {
  /** 参集合并后的 SVG path d（子路径顺序 = 参集顺序，自下而上） */
  d: string;
  /** 该运算对应的 fill-rule（Union=nonzero，其余 evenodd） */
  fillRule: 'nonzero' | 'evenodd';
  /** 实际参与合并的有效参集数（空 d 已被剔除） */
  operands: number;
}

/**
 * 各运算的 fill-rule 口径；Intersect 走 evenodd 系（见文件头近似说明）。
 * 导出供编辑器属性面板预设 / 单测锁定，避免两处口径漂移。
 */
export function booleanFillRule(op: BooleanOp): 'nonzero' | 'evenodd' {
  return op === 'UNION' ? 'nonzero' : 'evenodd';
}

/**
 * 路径子路径切分：一个 d 内的多条 M 子路径各自独立参与填充计数，
 * 合并时直接拼串即可（坐标系一致，见 booleanPathOf 的「本地坐标」前提）。
 */
export function splitSubpaths(d: string): string[] {
  if (!d || !d.trim()) return [];
  return d
    .trim()
    .split(/(?=[Mm])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** 子路径条数（空 d = 0）——布尔结果「可继续编辑参与集」的规模指标 */
export function subpathCount(d: string): number {
  return splitSubpaths(d).length;
}

/**
 * 布尔运算主函数：把若干条 path d 合并成一条结果 d。
 *
 * 前提：所有 d 处于**同一坐标系**（统一取节点本地系，调用方负责 flatten/换算）。
 * 空 d / 纯空白参集被跳过；有效参集 < 1 → 空结果（{ d: '', operands: 0 }）。
 * 确定性：输出仅由输入顺序与内容决定，同输入两次调用字节一致（无时间戳/随机量）。
 *
 * ## 2026-10-20 升级（#2）：从「拼串」改为「真求交」
 *
 * 旧实现只是把各参集的子路径**拼成一串**、靠 `fill-rule` 假装布尔：
 *  - SUBTRACT 用 evenodd 实为 XOR → 想切掉一块得到"两边都空"；
 *  - UNION 用 nonzero → 重叠区内部边线不消失。
 *
 * 现走 `polyBool.polyBoolean`（多边形求交，含展平）：
 *  - **精确层**：不相交 / 一个完全包含另一个（图标相减、形状挖洞等 UI 最常见用法）；
 *  - **近似层**：两形状相交时裁剪缺口未补对方边界段（完整 Greiner–Hormann 未实现），
 *    结果 `degraded=true` 供面板提示，**不谎称精确**（见 `polyBool.ts` 文件头报备）。
 *
 * 单参集保持原样（不做无谓变换），确保既有工程产物字节稳定。
 */
export function booleanPathOf(paths: string[], op: BooleanOp): BooleanResult {
  const valid = paths.filter((p) => typeof p === 'string' && p.trim().length > 0);
  // 空参集：仍按运算返回 fillRule（保持既有可观测行为，勿改成硬编码）
  if (!valid.length) return { d: '', fillRule: booleanFillRule(op), operands: 0 };

  // 单参集：原样规范化输出（拆分子路径并规整间隔），不引入额外变换
  if (valid.length === 1) {
    const parts: string[] = [];
    for (const p of valid) parts.push(...splitSubpaths(p));
    return { d: parts.join(' '), fillRule: booleanFillRule(op), operands: 1 };
  }

  const res = polyBoolean(valid, op);
  if (!res.d) {
    // 求交得到空集（如被完全吃掉）：退回规范化拼接，保证不丢内容且行为可预期
    const parts: string[] = [];
    for (const p of valid) parts.push(...splitSubpaths(p));
    return { d: parts.join(' '), fillRule: booleanFillRule(op), operands: valid.length };
  }
  /**
   * fill-rule 选择：
   *  - UNION 恒用 `nonzero`：并集是"实心相加"，用 evenodd 会把重叠区挖空（语义错误）；
   *  - 其余运算多环时用 `evenodd`：这样才能表达"挖洞"（SUBTRACT 的内环即洞）。
   */
  const rule = op === 'UNION' ? 'nonzero' : res.rings.length > 1 ? 'evenodd' : booleanFillRule(op);
  return { d: res.d, fillRule: rule, operands: valid.length };
}

/**
 * 直接吃 VectorData 的便捷封装（参集节点就是 VECTOR 节点）。
 * width/height 取参集最大值——合并域为各参集本地系的并集包围盒（外接矩形，非紧包围盒，报备）。
 */
export function booleanVectorOf(vectors: (VectorData | undefined)[], op: BooleanOp): VectorData {
  const rule = booleanFillRule(op);
  const ds = vectors.filter((v): v is VectorData => !!v && !!v.d && v.d.trim().length > 0);
  if (!ds.length) return { d: '', fillRule: rule };
  const w = ds.reduce((m, v) => Math.max(m, v.width ?? 0), 0);
  const h = ds.reduce((m, v) => Math.max(m, v.height ?? 0), 0);
  const res = booleanPathOf(ds.map((v) => v.d), op);
  const out: VectorData = { d: res.d, fillRule: rule };
  if (w > 0) out.width = w;
  if (h > 0) out.height = h;
  return out;
}

/**
 * FR-22「可继续编辑参与集」：结果节点回拆成参集条目。
 * 本近似实现无独立结果几何（结果即参集拼接），故回拆 = 按子路径切分 + 各自外接矩形。
 * 供 store/UI 侧展示参与集列表；真正的重算入口仍是 booleanPathOf。
 */
export interface BooleanOperand {
  d: string;
  /** 子路径外接矩形（仅统计 M/L 顶点；C/Q 用控制点近似，报备） */
  bounds: { x: number; y: number; width: number; height: number };
}

/** 结果 d → 参与集条目（含粗略外接盒） */
export function booleanOperandsOf(d: string): BooleanOperand[] {
  return splitSubpaths(d).map((sub) => ({ d: sub, bounds: pathBounds(sub) }));
}

/**
 * 路径外接矩形（顶点 + 控制点的粗略包围盒，不含曲线极值点——仅用于展示与归一化，
 * 不做像素级几何判定，故允许近似）。
 */
export function pathBounds(d: string): { x: number; y: number; width: number; height: number } {
  const nums = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    const x = Number(nums[i]);
    const y = Number(nums[i + 1]);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      xs.push(x);
      ys.push(y);
    }
  }
  if (!xs.length) return { x: 0, y: 0, width: 0, height: 0 };
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
}

/** 布尔运算的中文名（属性面板/图层名复用，单一事实源） */
export const BOOLEAN_OP_LABEL: Record<BooleanOp, string> = {
  UNION: '合并',
  INTERSECT: '交集',
  SUBTRACT: '减去',
  EXCLUDE: '排除',
};

/** 结果节点默认名：Figma 同名「Union / Intersect / Subtract / Exclude」（自动命名属内容数据，不随 UI 语言切换） */
export const BOOLEAN_OP_NAME: Record<BooleanOp, string> = {
  UNION: 'Union',
  INTERSECT: 'Intersect',
  SUBTRACT: 'Subtract',
  EXCLUDE: 'Exclude',
};
