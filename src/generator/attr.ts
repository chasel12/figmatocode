/**
 * 属性值转义（唯一实现）。
 *
 * 为什么单独抽出来：`alt` 是**用户/模型写的自然语言**，里面出现 `"` 或 `&` 的概率远高于
 * 类名和路径。四个出口（HTML / JSX / Vue SFC / uni-app SFC）各自手写一遍转义，就是
 * 「同一件事两个 owner」，而且**转义漏一处不会报错，只会把产物拼坏**。
 *
 * 覆盖 5 个字符：`& < > " '`（单引号也转 —— 有的出口用单引号包属性）。
 */
export function escapeAttr(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
