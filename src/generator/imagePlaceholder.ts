/**
 * 无 `src` 图片的占位样式（唯一权威定义）
 *
 * 为什么单独抽出来：这条规则原来在 4 个出码器里**各抄了一份**
 * （html / react / reference / vue，全是 `background: #e0e0e0`）。
 * 四份拷贝的问题是漂移——改一处、其余三处照旧，而 reference 是像素比的基准图，
 * 它一旦和 render 不一致，`npm run diff` 就会掉分且极难反查「是谁改的」。
 * 现在只有一个常量，所有出口都拼它。
 *
 * 视觉上刻意不用纯色块：纯灰读起来像「图挂了」，而设计评审时这块占位应该读成
 * 「这里要放图」。所以给一点斜向高光 + 居中的图片图标——**纯 CSS**，不引外部资源、
 * 不加 DOM 子节点（加子节点会改变盒子树，四个出口都得跟着改，还影响像素基线）。
 *
 * 图标是 data URI 内联 SVG：`#` 必须写成 `%23`，否则会被当成 URL 片段截断。
 */
export const IMAGE_PLACEHOLDER_CLASS = 'ui-image-placeholder';

export const IMAGE_PLACEHOLDER_CSS = `.${IMAGE_PLACEHOLDER_CLASS} {
  background-color: #ececf1;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23a8a8b4' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='4' width='18' height='16' rx='2'/><circle cx='8.5' cy='9.5' r='1.5'/><path d='M21 15l-5-5L5 20'/></svg>"), linear-gradient(135deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0) 55%);
  background-repeat: no-repeat, no-repeat;
  background-position: center, center;
  background-size: 24px 24px, cover;
}`;
