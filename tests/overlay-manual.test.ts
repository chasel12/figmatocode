import { describe, expect, it } from 'vitest';
import { encodeInteractions, projectInteraction, INTERACTION_FIELDS } from '../src/generator/prototype';
import { resetIdSeq } from '../src/schema/factory';
import type { PrototypeInteraction } from '../src/schema/types';

resetIdSeq(0);

/**
 * #4c overlay 自由定位（2026-10-20）。
 *
 * 缺陷背景：`overlayPosition:'MANUAL'` 面板可选，但标注「首版按居中」，runtime 也把
 * MANUAL 与 PRESET 一起回落 CENTER —— 用户选了"手动"却拖不动。
 * 现补 `overlayOffset:{x,y}`（视口百分比）+ runtime `.uic-pos-manual` 绝对定位。
 *
 * 本测试守住两件事：
 *  ① `overlayOffset` 能进**白名单投影**（否则被 `projectInteraction` 丢弃，runtime 读不到）；
 *  ② 编码后在产物串里可解析回来（不被转义破坏）。
 */
function makeIt(patch: Partial<PrototypeInteraction>): PrototypeInteraction {
  return {
    id: 'it-1',
    trigger: 'ON_CLICK',
    action: 'OPEN_OVERLAY',
    targetId: 'frame-1',
    ...patch,
  } as PrototypeInteraction;
}

describe('#4c overlay 自由定位：白名单与编码', () => {
  it('INTERACTION_FIELDS 包含 overlayOffset（漏了就会被投影静默丢弃）', () => {
    expect(INTERACTION_FIELDS).toContain('overlayOffset');
  });

  it('projectInteraction 保留 overlayOffset 坐标', () => {
    const out = projectInteraction(makeIt({ overlayPosition: 'MANUAL', overlayOffset: { x: 30, y: 70 } }));
    expect(out.overlayOffset).toEqual({ x: 30, y: 70 });
  });

  it('编码后可解析回坐标（值不被转义破坏）', () => {
    const raw = encodeInteractions([makeIt({ overlayPosition: 'MANUAL', overlayOffset: { x: 12, y: 88 } })]);
    expect(raw).toContain('overlayOffset');
    // 编码用单引号包裹 JSON → 反转义后应能 JSON.parse
    const decoded = raw.replace(/&quot;/g, '"');
    const parsed = JSON.parse(decoded) as { overlayOffset?: { x: number; y: number } }[];
    expect(parsed[0].overlayOffset).toEqual({ x: 12, y: 88 });
  });

  it('未设置坐标时不写空字段（保持产出确定性）', () => {
    const out = projectInteraction(makeIt({ overlayPosition: 'MANUAL' }));
    expect('overlayOffset' in out).toBe(false);
  });

  it('九宫档位不含坐标语义（CENTER 不写 overlayOffset）', () => {
    const out = projectInteraction(makeIt({ overlayPosition: 'CENTER' }));
    expect(out.overlayPosition).toBe('CENTER');
    expect('overlayOffset' in out).toBe(false);
  });
});
