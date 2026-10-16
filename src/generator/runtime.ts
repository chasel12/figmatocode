/**
 * FR-46 最小运行时（runtime.js）。
 *
 * 边界（PRD 原文）：仅承载**原型行为**——交互绑定、overlay 开关、history、演示导航、
 * 图片加载失败回退；**不含任何布局计算**（布局全部由编译期 CSS 承担）。
 * 可关：无交互的工程不引用本文件，页面仍静态呈现完整首帧（FR-50 无 JS 模式）。
 */
export const RUNTIME_FILE = 'runtime.js';

/** 运行时版本号：出码产物做溯源与回归定位用（与 UIProject.version 无关） */
export const RUNTIME_VERSION = '0.1.0';

const HEADER = `/* UI Compiler 原型运行时 v${RUNTIME_VERSION}（FR-46 / FR-50）
 * 仅原型行为：交互绑定 / overlay 开关 / 内部 history / 演示导航 / 图片回退。
 * 无布局计算——几何与样式全部由编译期 index.css 承担。
 * 删除本文件：页面静态首帧完整（data-interaction 为纯声明式属性）。
 * 已出码触发器：ON_CLICK / ON_HOVER / MOUSE_ENTER / MOUSE_LEAVE / ON_PRESS / AFTER_TIMEOUT / KEYDOWN / ON_LOAD
 * 已出码动作：NAVIGATE / BACK / SCROLL / OPEN_LINK / OPEN_OVERLAY / CLOSE_OVERLAY
 * 未出码（P0 置灰）：ON_DRAG / TOUCH / CHANGE_TO / CLOSE / SMART_ANIMATE
 */
`;

/**
 * 生成纯 JS 运行时（字符串模板，无依赖、无构建、ES5 语法以兼容老浏览器）。
 *
 * 事件绑定表（wave1-prototype-plan §4.2）：
 * - ON_CLICK → click 委托；ON_HOVER/MOUSE_ENTER → mouseover + relatedTarget 判定；
 *   MOUSE_LEAVE → mouseout + relatedTarget 判定；ON_PRESS → mousedown/mouseup；
 *   AFTER_TIMEOUT → setTimeout；KEYDOWN → document keydown；ON_LOAD → DOMContentLoaded。
 * - ON_DRAG / TOUCH 属 P0 未列（schema-decisions §四.5），**不绑定**。
 */
export function buildRuntimeJs(): string {
  return `${HEADER}(function () {
  'use strict';

  /** 根容器：只用于事件委托，不做任何几何读写（不读 offsetWidth/getBoundingClientRect） */
  var root = document.querySelector('[data-uic-root]');
  if (!root) return;

  var pages = [].slice.call(root.querySelectorAll('[data-uic-page]'));
  if (!pages.length) return;

  var warns = {};

  function warnOnce(key, message) {
    if (warns[key]) return;
    warns[key] = 1;
    if (typeof console !== 'undefined' && console.warn) console.warn('[uic-runtime] ' + message);
  }

  function readInteractions(el) {
    var raw = el.getAttribute('data-interaction');
    if (!raw) return [];
    try {
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      warnOnce('parse', 'data-interaction 解析失败，已忽略：' + raw);
      return [];
    }
  }

  function findPage(id) {
    if (!id) return null;
    for (var i = 0; i < pages.length; i += 1) {
      if (pages[i].getAttribute('data-uic-page') === id) return pages[i];
    }
    return null;
  }

  function findAnchor(id) {
    if (!id) return null;
    for (var i = 0; i < pages.length; i += 1) {
      var hit = pages[i].querySelector('[data-node="' + id + '"]');
      if (hit) return hit;
    }
    return null;
  }

  /* ---------- 过渡（§2.3）：INSTANT 无 CSS；DISSOLVE 走 opacity；MOVE/PUSH/SLIDE 走 transform translate ---------- */
  var EASING = {
    LINEAR: 'linear',
    EASE_IN: 'cubic-bezier(0.42, 0, 1, 1)',
    EASE_OUT: 'cubic-bezier(0, 0, 0.58, 1)',
    EASE_IN_OUT: 'cubic-bezier(0.42, 0, 0.58, 1)',
    EASE_IN_BACK: 'cubic-bezier(0.36, 0, 0.66, -0.56)'
  };

  function easingOf(tr) {
    if (!tr) return 'ease';
    if (tr.easing === 'CUSTOM' && tr.bezier && tr.bezier.length === 4) {
      return 'cubic-bezier(' + tr.bezier.join(', ') + ')';
    }
    return EASING[tr.easing] || 'ease';
  }

  function durationOf(tr) {
    if (!tr || typeof tr.duration !== 'number') return 300;
    return Math.max(0, tr.duration);
  }

  function offsetOf(tr) {
    switch (tr && tr.direction) {
      case 'LEFT': return 'translateX(-100%)';
      case 'RIGHT': return 'translateX(100%)';
      case 'TOP': return 'translateY(-100%)';
      case 'BOTTOM': return 'translateY(100%)';
      default: return 'translateY(100%)';
    }
  }

  function clearAnim(node) {
    if (!node) return;
    node.classList.remove('uic-enter');
    node.style.opacity = '';
    node.style.transform = '';
  }

  var animating = false;

  function showPage(node) {
    for (var i = 0; i < pages.length; i += 1) {
      var p = pages[i];
      if (p === node) continue;
      p.hidden = true;
      p.removeAttribute('data-uic-active');
      clearAnim(p);
    }
    if (node) {
      node.hidden = false;
      node.setAttribute('data-uic-active', '');
    }
  }

  /** 切页 + 过渡：INSTANT / 无 transition 直接切（零 CSS 开销） */
  function switchPage(node, tr) {
    if (!node) return;
    var kind = tr && tr.kind;
    if (!tr || kind === 'INSTANT' || kind === 'SMART_ANIMATE') {
      showPage(node);
      animating = false;
      return;
    }
    var duration = durationOf(tr);
    if (duration <= 0) {
      showPage(node);
      animating = false;
      return;
    }
    var ease = easingOf(tr);
    var outgoing = null;
    for (var i = 0; i < pages.length; i += 1) {
      if (!pages[i].hidden) outgoing = pages[i];
    }
    node.hidden = false;
    node.setAttribute('data-uic-active', '');
    animating = true;
    if (kind === 'DISSOLVE') {
      node.style.transition = 'none';
      node.style.opacity = '0';
      if (outgoing && outgoing !== node) outgoing.style.transition = 'opacity ' + duration + 'ms ' + ease;
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            node.style.transition = 'opacity ' + duration + 'ms ' + ease;
            node.style.opacity = '1';
            if (outgoing && outgoing !== node) outgoing.style.opacity = '0';
          });
        });
      } else {
        node.style.transition = 'opacity ' + duration + 'ms ' + ease;
        node.style.opacity = '1';
        if (outgoing && outgoing !== node) outgoing.style.opacity = '0';
      }
    } else {
      // MOVE_IN / MOVE_OUT / PUSH / SLIDE_IN / SLIDE_OUT：transform translate
      node.classList.add('uic-enter');
      node.style.transition = 'none';
      node.style.transform = offsetOf(tr);
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            node.style.transition = 'transform ' + duration + 'ms ' + ease;
            node.style.transform = 'translate(0, 0)';
          });
        });
      } else {
        node.classList.remove('uic-enter');
        node.style.transition = 'transform ' + duration + 'ms ' + ease;
        node.style.transform = 'translate(0, 0)';
      }
    }
    window.setTimeout(function () {
      if (outgoing && outgoing !== node) {
        outgoing.hidden = true;
        outgoing.removeAttribute('data-uic-active');
        clearAnim(outgoing);
      }
      clearAnim(node);
      animating = false;
    }, duration + 20);
  }

  /* ---------- 内部 history 栈（BACK 语义；不碰浏览器 history，避免污染宿主页） ---------- */
  function activePageId() {
    for (var i = 0; i < pages.length; i += 1) {
      if (!pages[i].hidden) return pages[i].getAttribute('data-uic-page');
    }
    return null;
  }

  function currentPageNode() {
    for (var i = 0; i < pages.length; i += 1) {
      if (!pages[i].hidden) return pages[i];
    }
    return null;
  }

  var stack = [];

  function navigate(targetId, tr) {
    if (animating) return;
    var node = findPage(targetId);
    if (!node) {
      warnOnce('nav-' + targetId, 'NAVIGATE 目标页不存在（broken link）：' + targetId);
      return;
    }
    var from = activePageId();
    if (from === targetId) return;
    if (from) stack.push(from);
    switchPage(node, tr);
  }

  function goBack() {
    if (animating) return;
    var prev = stack.pop();
    if (!prev) {
      warnOnce('back', 'BACK 栈为空，忽略');
      return;
    }
    var node = findPage(prev);
    if (!node) {
      warnOnce('back-' + prev, 'BACK 目标页不存在：' + prev);
      return;
    }
    switchPage(node, null);
  }

  /* ---------- Overlay 九宫定位（纯 CSS 类，不含尺寸计算） ---------- */
  var POS_CLASS = {
    TOP_LEFT: 'uic-pos-top-left',
    TOP_CENTER: 'uic-pos-top-center',
    TOP_RIGHT: 'uic-pos-top-right',
    CENTER: 'uic-pos-center',
    BOTTOM_LEFT: 'uic-pos-bottom-left',
    BOTTOM_CENTER: 'uic-pos-bottom-center',
    BOTTOM_RIGHT: 'uic-pos-bottom-right'
  };

  var overlaySeq = 0;
  var openOverlays = [];

  function openOverlay(targetId, it) {
    var node = findAnchor(targetId);
    if (!node) {
      warnOnce('ov-' + targetId, 'OPEN_OVERLAY 目标锚点不存在（broken link）：' + targetId);
      return;
    }
    var id = 'uic-ov-' + (overlaySeq += 1);
    var wrap = document.createElement('div');
    wrap.className = 'uic-overlay';
    var pos = POS_CLASS[it.overlayPosition];
    if (pos) wrap.classList.add(pos);
    else wrap.classList.add(POS_CLASS.CENTER); // MANUAL / PRESET 首版按 CENTER（PRD「+手动」为 P1）
    var panel = node.cloneNode(true);
    panel.removeAttribute('hidden');
    panel.classList.add('uic-overlay-panel');
    wrap.appendChild(panel);
    document.body.appendChild(wrap);
    openOverlays.push({ id: id, wrap: wrap, closeOnOutside: it.overlayCloseOnOutside !== false });
    return id;
  }

  function closeTopOverlay() {
    var top = openOverlays.pop();
    if (!top) {
      warnOnce('ov-close', 'CLOSE_OVERLAY 无已打开浮层，忽略');
      return;
    }
    if (top.wrap.parentNode) top.wrap.parentNode.removeChild(top.wrap);
  }

  /* ---------- 动作执行 ---------- */
  function runAction(it, el) {
    switch (it.action) {
      case 'NAVIGATE':
        navigate(it.targetId, it.transition);
        break;
      case 'BACK':
        goBack();
        break;
      case 'SCROLL': {
        var behavior = it.scrollBehavior || 'TOP';
        var reduce = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var smooth = reduce ? 'auto' : 'smooth';
        if (behavior === 'TOP') window.scrollTo({ top: 0, behavior: smooth });
        else if (behavior === 'BOTTOM') window.scrollTo({ top: document.documentElement.scrollHeight, behavior: smooth });
        else {
          var anchor = findAnchor(it.targetId);
          if (anchor && anchor.scrollIntoView) anchor.scrollIntoView({ behavior: smooth, block: 'start' });
          else warnOnce('scroll-' + it.targetId, 'SCROLL POINT 目标锚点不存在：' + it.targetId);
        }
        break;
      }
      case 'OPEN_LINK':
        if (it.url) window.open(it.url, '_blank', 'noopener,noreferrer');
        else warnOnce('link', 'OPEN_LINK 缺 url，已忽略');
        break;
      case 'OPEN_OVERLAY':
        openOverlay(it.targetId, it);
        break;
      case 'CLOSE_OVERLAY':
        closeTopOverlay();
        break;
      default:
        warnOnce('act-' + it.action, '未出码动作（P0 置灰）：' + it.action);
    }
  }

  function run(el) {
    var list = readInteractions(el);
    for (var i = 0; i < list.length; i += 1) runAction(list[i] || {}, el);
  }

  /* ---------- 事件委托 ---------- */
  function findInteractive(event, match) {
    var node = event.target;
    var guard = 0;
    while (node && node !== root && guard < 64) {
      if (node.nodeType === 1 && node.hasAttribute && node.hasAttribute('data-interaction')) {
        var list = readInteractions(node);
        for (var i = 0; i < list.length; i += 1) {
          if (match(list[i] || {})) return { el: node, list: list };
        }
      }
      node = node.parentNode;
      guard += 1;
    }
    return null;
  }

  function runMatching(event, match) {
    var hit = findInteractive(event, match);
    if (!hit) return;
    for (var i = 0; i < hit.list.length; i += 1) {
      var it = hit.list[i] || {};
      if (match(it)) runAction(it, hit.el);
    }
  }

  function isClick(tr) {
    return tr === 'ON_CLICK';
  }

  root.addEventListener('click', function (event) {
    runMatching(event, function (it) { return isClick(it.trigger); });
  });

  // mouseover/mouseout 冒泡 + relatedTarget 判定 = mouseenter/mouseleave 语义（委托可用）
  function insideOf(event, el) {
    return !!(el && event.relatedTarget && el.contains(event.relatedTarget));
  }

  function runHover(event) {
    var hit = findInteractive(event, function (it) {
      return it.trigger === 'ON_HOVER' || it.trigger === 'MOUSE_ENTER';
    });
    if (!hit) return;
    // 同源内部移动（relatedTarget 仍在命中元素内）不算一次进入，避免子元素间穿梭重复触发
    if (insideOf(event, hit.el)) return;
    for (var i = 0; i < hit.list.length; i += 1) {
      var it = hit.list[i] || {};
      if (it.trigger === 'ON_HOVER' || it.trigger === 'MOUSE_ENTER') runAction(it, hit.el);
    }
  }

  root.addEventListener('mouseover', runHover);

  root.addEventListener('mouseout', function (event) {
    runMatching(event, function (it) { return it.trigger === 'MOUSE_LEAVE'; });
    // 点外关闭：指针离开浮层且 relatedTarget 不在浮层内 → 自上而下全部收起
    for (var i = 0; i < openOverlays.length; i += 1) {
      var ov = openOverlays[i];
      if (!ov.closeOnOutside) continue;
      if (ov.wrap !== event.target && !ov.wrap.contains(event.target)) continue;
      if (!ov.wrap.contains(event.relatedTarget)) {
        while (openOverlays.length) closeTopOverlay();
      }
      return;
    }
  });

  root.addEventListener('mousedown', function (event) {
    runMatching(event, function (it) { return it.trigger === 'ON_PRESS'; });
  });

  root.addEventListener('mouseup', function (event) {
    runMatching(event, function (it) { return it.trigger === 'ON_PRESS'; });
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && openOverlays.length) closeTopOverlay();
    var list = [].slice.call(root.querySelectorAll('[data-interaction]'));
    for (var i = 0; i < list.length; i += 1) {
      var items = readInteractions(list[i]);
      for (var j = 0; j < items.length; j += 1) {
        var it = items[j] || {};
        if (it.trigger !== 'KEYDOWN') continue;
        if (it.key && it.key !== event.key) continue;
        runAction(it, list[i]);
      }
    }
  });

  function start() {
    // ON_LOAD：DOMContentLoaded 直接触发（脚本以 defer 引入，DOM 已就绪即立即跑）
    var all = [].slice.call(root.querySelectorAll('[data-interaction]'));
    for (var i = 0; i < all.length; i += 1) {
      var items = readInteractions(all[i]);
      for (var j = 0; j < items.length; j += 1) {
        var it = items[j] || {};
        if (it.trigger === 'ON_LOAD') runAction(it, all[i]);
      }
      for (var k = 0; k < items.length; k += 1) {
        var t = items[k] || {};
        if (t.trigger !== 'AFTER_TIMEOUT') continue;
        (function (node, item) {
          window.setTimeout(function () { runAction(item, node); }, Math.max(0, item.timeoutMs || 300));
        })(all[i], t);
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  // 图片加载失败回退（FR-46 运行时职责之一）
  var imgs = [].slice.call(document.querySelectorAll('img'));
  for (var m = 0; m < imgs.length; m += 1) {
    imgs[m].addEventListener('error', function () {
      this.classList.add('uic-img-fallback');
      this.removeAttribute('src');
    });
  }
})();
`;
}

/** 运行时注入的过渡/浮层辅助 CSS（仅出码含交互时写入 index.css 末尾） */
export function buildRuntimeCss(): string {
  return `/* ---- FR-50 原型运行时辅助样式（无布局计算：定位/过渡仅辅助类） ---- */
[data-uic-page][hidden] { display: none !important; }
[data-uic-page][data-uic-active] { display: block; }
.uic-enter { opacity: 0.01; }
.uic-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.32); z-index: 9999; }
.uic-overlay-panel { position: absolute; background: #ffffff; border-radius: 8px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.24); overflow: hidden; }
.uic-pos-top-left { display: flex; align-items: flex-start; justify-content: flex-start; padding: 24px; }
.uic-pos-top-center { display: flex; align-items: flex-start; justify-content: center; padding: 24px; }
.uic-pos-top-right { display: flex; align-items: flex-start; justify-content: flex-end; padding: 24px; }
.uic-pos-center { display: flex; align-items: center; justify-content: center; padding: 24px; }
.uic-pos-bottom-left { display: flex; align-items: flex-end; justify-content: flex-start; padding: 24px; }
.uic-pos-bottom-center { display: flex; align-items: flex-end; justify-content: center; padding: 24px; }
.uic-pos-bottom-right { display: flex; align-items: flex-end; justify-content: flex-end; padding: 24px; }
.uic-img-fallback { background: #e0e0e0; }
`;
}
