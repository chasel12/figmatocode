import type { StyleSchema, UINode } from '../schema/types';
import { FONT_STACK } from '../font';

export interface TextMetrics {
  width: number;
  height: number;
  lines: number;
}

export type TextMeasureFn = (text: string, style: StyleSchema, maxWidth?: number) => TextMetrics;

const DEFAULT_FONT_SIZE = 16;

export function effectiveFontSize(style?: StyleSchema): number {
  return style?.fontSize ?? DEFAULT_FONT_SIZE;
}

export function effectiveLineHeight(style?: StyleSchema): number {
  const fs = effectiveFontSize(style);
  if (style?.lineHeightMode === 'AUTO') return Math.round(fs * 1.4);
  if (style?.lineHeightMode === 'PERCENT') return (fs * (style.lineHeight ?? 140)) / 100;
  return style?.lineHeight ?? Math.round(fs * 1.4);
}

/** FR-15 字距换算 px（PERCENT = 字号百分比） */
export function effectiveLetterSpacingPx(style?: StyleSchema): number {
  const raw = style?.letterSpacing ?? 0;
  if (style?.letterSpacingMode === 'PERCENT') return (effectiveFontSize(style) * raw) / 100;
  return raw;
}

/** FR-15 textCase 应用（SMALL_CAPS 近似原样——出码 font-variant-caps 保真；TITLE 按词首大写近似 CSS capitalize） */
export function applyTextCase(text: string, c?: StyleSchema['textCase']): string {
  switch (c) {
    case 'UPPER':
      return text.toUpperCase();
    case 'LOWER':
      return text.toLowerCase();
    case 'TITLE':
      return text.replace(/\b[a-z]/gi, (m) => m.toUpperCase());
    default:
      return text;
  }
}

/** FR-15 测量收尾：Truncate 行上限 + 段落间距（段间距按原始段数，截断不减段） */
function finalizeText(
  lineCount: number,
  lineHeight: number,
  paragraphCount: number,
  style?: StyleSchema,
): { lines: number; height: number } {
  let lines = Math.max(lineCount, 1);
  if (style?.textTruncation === 'ENDING' && style.maxLines != null && style.maxLines > 0 && lines > style.maxLines) {
    lines = style.maxLines;
  }
  let height = lines * lineHeight;
  if (paragraphCount > 1) height += (paragraphCount - 1) * (style?.paragraphSpacing ?? 0);
  return { lines, height };
}

/** DOM/canvas 实现：使用真实字体度量（编辑器与浏览器环境）。 */
export function createCanvasMeasure(): TextMeasureFn {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  return (text, style, maxWidth) => {
    const fontSize = effectiveFontSize(style);
    const fontWeight = style?.fontWeight ?? 400;
    const fontFamily = style?.fontFamily ?? FONT_STACK;
    const letterSpacing = effectiveLetterSpacingPx(style);
    const lineHeight = effectiveLineHeight(style);
    const wrapEnabled = style?.textWrap !== false;
    const indent = style?.paragraphIndent ?? 0;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    const paragraphs = applyTextCase(String(text ?? ''), style?.textCase).split('\n');
    let maxLineWidth = 0;
    let lineCount = 0;

    for (const paragraph of paragraphs) {
      if (!paragraph) {
        lineCount += 1;
        continue;
      }
      const words = splitUnits(paragraph);
      let current = '';
      let currentWidth = 0;
      let lineStarted = false;

      for (const unit of words) {
        const unitWidth = measureUnit(ctx, unit, letterSpacing);
        const candidateWidth = currentWidth + unitWidth;
        if (maxWidth && wrapEnabled && lineStarted && candidateWidth > maxWidth) {
          maxLineWidth = Math.max(maxLineWidth, currentWidth);
          lineCount += 1;
          current = unit;
          currentWidth = measureUnit(ctx, unit, letterSpacing);
        } else {
          current += unit;
          currentWidth = candidateWidth;
          lineStarted = true;
        }
      }
      maxLineWidth = Math.max(maxLineWidth, currentWidth);
      lineCount += 1;
    }

    const fin = finalizeText(lineCount, lineHeight, paragraphs.length, style);
    return {
      // FR-15 首行缩进：全宽加 indent 近似（精确首行判定待矩阵——LOG 报备）
      width: Math.ceil(maxLineWidth + indent),
      height: Math.round(fin.height),
      lines: fin.lines,
    };
  };
}

function splitUnits(paragraph: string): string[] {
  // 优先按空格断行，中文按字断行
  const units: string[] = [];
  let buffer = '';
  for (const char of paragraph) {
    if (char === ' ') {
      if (buffer) units.push(buffer);
      buffer = '';
      units.push(' ');
    } else if (/[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(char)) {
      if (buffer) units.push(buffer);
      buffer = '';
      units.push(char);
    } else {
      buffer += char;
    }
  }
  if (buffer) units.push(buffer);
  return units;
}

function measureUnit(ctx: CanvasRenderingContext2D, unit: string, letterSpacing: number): number {
  return ctx.measureText(unit).width + letterSpacing * unit.length;
}

/**
 * Node 实现：无 DOM 环境下的近似度量（用于单测 / Node 脚本）。
 * 拉丁字符按 0.55em，CJK 按 1em 估算。
 */
export function createApproxMeasure(): TextMeasureFn {
  return (text, style, maxWidth) => {
    const fontSize = effectiveFontSize(style);
    const lineHeight = effectiveLineHeight(style);
    const letterSpacing = effectiveLetterSpacingPx(style);
    const wrapEnabled = style?.textWrap !== false;
    const indent = style?.paragraphIndent ?? 0;

    const charWidth = (char: string): number => {
      const cjk = /[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]/.test(char);
      const wide = /[MW@#%]/.test(char);
      const narrow = /[iljt.,'!|]/.test(char);
      let ratio = 0.55;
      if (cjk) ratio = 1;
      else if (wide) ratio = 0.85;
      else if (narrow) ratio = 0.3;
      return fontSize * ratio + letterSpacing;
    };

    const paragraphs = applyTextCase(String(text ?? ''), style?.textCase).split('\n');
    let maxLineWidth = 0;
    let lineCount = 0;

    for (const paragraph of paragraphs) {
      let currentWidth = 0;
      let lineStarted = false;
      for (const char of paragraph) {
        const w = charWidth(char);
        if (maxWidth && wrapEnabled && lineStarted && currentWidth + w > maxWidth) {
          maxLineWidth = Math.max(maxLineWidth, currentWidth);
          lineCount += 1;
          currentWidth = w;
        } else {
          currentWidth += w;
          lineStarted = true;
        }
      }
      maxLineWidth = Math.max(maxLineWidth, currentWidth);
      lineCount += 1;
    }

    const fin = finalizeText(lineCount, lineHeight, paragraphs.length, style);
    return {
      width: Math.ceil(maxLineWidth + indent),
      height: Math.round(fin.height),
      lines: fin.lines,
    };
  };
}

export function defaultMeasureFor(node: UINode): TextMeasureFn {
  void node;
  return typeof document !== 'undefined' ? createCanvasMeasure() : createApproxMeasure();
}
