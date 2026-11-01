/**
 * D3 排版归一化：白名单（C2）+ 按语言分流（C3）+ **幂等**。
 *
 * 幂等测试是这一组里最重要的：排版类规则最容易互相打架（A 加空格 / B 删空格），
 * `apply(apply(x)) !== apply(x)` 就是震荡的机器可判形态。
 */
import { describe, expect, it } from 'vitest';
import {
  normalizeCjkText,
  normalizeEllipsis,
  normalizePunctuation,
  normalizeSpacing,
} from '../src/standards/rules/d3-typography';

describe('中英文空格（C2 白名单）', () => {
  it('汉字与拉丁字母之间加空格（两个方向）', () => {
    expect(normalizeSpacing('使用iPhone打开')).toBe('使用 iPhone 打开');
    expect(normalizeSpacing('iPhone手机')).toBe('iPhone 手机');
  });

  it('数字+单位是一个整体，内部不加空格', () => {
    expect(normalizeSpacing('剩余 10MB 空间')).toBe('剩余 10MB 空间');
    expect(normalizeSpacing('剩余10MB空间')).toBe('剩余10MB空间');
  });

  it('代码、URL、邮箱、模板占位符原样保留', () => {
    const cases = [
      '`useState` 的用法',
      '打开 https://a.com/x?y=1 看看',
      '联系 dev@example.com 反馈',
      '{{index}}/{{total}} 页',
    ];
    for (const c of cases) expect(normalizeSpacing(c)).toBe(c);
  });

  it('已有空格不重复加', () => {
    expect(normalizeSpacing('使用 iPhone 打开')).toBe('使用 iPhone 打开');
  });
});

describe('省略号（C3 按语言分流）', () => {
  it('中文语境用六点「……」', () => {
    expect(normalizeEllipsis('加载中...')).toBe('加载中……');
  });

  it('英文/数字后用单字符「…」', () => {
    expect(normalizeEllipsis('Loading...')).toBe('Loading…');
  });

  it('已是规范写法时不动', () => {
    expect(normalizeEllipsis('加载中……')).toBe('加载中……');
  });
});

describe('全角标点', () => {
  it('中文语境的半角标点转全角，并吃掉多余空格', () => {
    expect(normalizePunctuation('价格:29 元,包邮')).toBe('价格：29 元，包邮');
    expect(normalizePunctuation('确定吗?真的吗!')).toBe('确定吗？真的吗！');
  });

  it('括号内是中文才转全角', () => {
    expect(normalizePunctuation('说明(中文)')).toBe('说明（中文）');
    expect(normalizePunctuation('版本 (v2) 更新')).toBe('版本 (v2) 更新');
  });

  it('时间与小数不受影响（标点两侧不是汉字）', () => {
    expect(normalizePunctuation('10:30 开始')).toBe('10:30 开始');
    expect(normalizePunctuation('3.5 元')).toBe('3.5 元');
  });
});

describe('幂等（抓规则互相震荡）', () => {
  const corpus = [
    '使用iPhone打开',
    '价格:29 元,包邮',
    '加载中...',
    '已选 3 件，共 ¥ 88',
    '{{index}}/{{total}} 页',
    '打开 https://a.com/x?y=1 看看',
    '`useState` 的用法',
    '剩余 10MB 空间',
    '说明(中文)与版本 (v2)',
    '',
    '纯英文 without cjk',
  ];

  it('normalizeCjkText 跑两遍等于跑一遍', () => {
    for (const s of corpus) {
      const once = normalizeCjkText(s);
      expect(normalizeCjkText(once), `震荡：${JSON.stringify(s)}`).toBe(once);
    }
  });

  it('三个子步骤各自也幂等', () => {
    for (const s of corpus) {
      for (const fn of [normalizeSpacing, normalizePunctuation, normalizeEllipsis]) {
        const once = fn(s);
        expect(fn(once), `震荡：${fn.name}(${JSON.stringify(s)})`).toBe(once);
      }
    }
  });
});
