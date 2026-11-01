/**
 * D4 设计令牌 —— owner：**W3C DTCG + 现有 StylePack**。
 *
 * C7 的裁决是「显式 hex **放行**」（memory 里那条：skill 参考里的显式 hex 必须放行），
 * 所以这里**不**要求「颜色必须走令牌」，只查一件事：**同页出现一堆肉眼分不出的近似色**
 * （ΔE<3 超过 6 个）。这是「随手调色」的机器可判据，也是令牌化真正要解决的问题。
 */
import { deltaE, normalizeHex } from '../color';
import type { RuleHit, StandardRule } from '../types';

/** 一簇超过这个数量就认为「该令牌化了」 */
const CLUSTER_LIMIT = 6;
/** ΔE < 3：人眼基本分不出（CIE76 下 2~3 是刚可察觉阈值） */
const NEAR = 3;

export const colorDriftRule: StandardRule = {
  id: 'dtcg-color-drift',
  domain: 'D4',
  source: 'W3C DTCG（令牌口径）+ C7 裁决',
  severity: 'warn',
  platform: ['all'],
  fixtures: { pass: ['drift-pass'], fail: ['drift-fail'] },
  check(ctx) {
    /** 收集本页所有**显式**色值（含透明度不同的写法，按不透明 hex 归一） */
    const seen = new Map<string, string>(); // hex → 首次出现的路径
    for (const rn of ctx.nodes) {
      const s = rn.node.style;
      if (!s) continue;
      const push = (c: string | undefined): void => {
        if (!c) return;
        const hex = normalizeHex(c);
        if (!hex.startsWith('#')) return;
        if (!seen.has(hex)) seen.set(hex, rn.path);
      };
      push(s.background);
      push(s.color);
      push(s.border?.color);
      for (const f of s.fills ?? []) push(f.color);
    }

    const colors = [...seen.keys()];
    const used = new Set<string>();
    const hits: RuleHit[] = [];

    for (const base of colors) {
      if (used.has(base)) continue;
      const cluster = [base];
      used.add(base);
      for (const other of colors) {
        if (used.has(other)) continue;
        const d = deltaE(base, other);
        if (d != null && d < NEAR) {
          cluster.push(other);
          used.add(other);
        }
      }
      if (cluster.length <= CLUSTER_LIMIT) continue;
      hits.push({
        path: seen.get(base) ?? 'page',
        message: `同页有 ${cluster.length} 个肉眼难分的近似色（ΔE<${NEAR}），建议收敛为令牌`,
        meta: { size: cluster.length, colors: cluster },
      });
    }
    return hits;
  },
};
