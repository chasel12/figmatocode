import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { compilePage } from '../../compiler';
import { buildPreviewDom } from '../../generator/html';
import { findById } from '../../schema/factory';
import type { ContainerNode, PrototypeTransition, UINode, UIPage } from '../../schema/types';
import {
  collectHotspots,
  durationOf,
  easingCss,
  framesOf,
  overlayFlex,
  resolveStartNode,
  translateOf,
  triggerMatches,
  usableInteractions,
} from './presentRuntime';

/** OVERLAY 九宫 → CSS 定位（与 runtime.js 的 .uic-pos-* 同口径） */
function overlayScrimStyle(pos?: string): React.CSSProperties {
  const { justify, align } = overlayFlex(pos);
  return {
    position: 'fixed',
    inset: 0,
    zIndex: 10000,
    display: 'flex',
    justifyContent: justify,
    alignItems: align,
    background: 'rgba(0, 0, 0, 0.32)',
    padding: 24,
  };
}

/**
 * FR-44 Present 演示模式（全屏遮罩层）。
 *
 * 选遮罩层而非独立路由的理由（wave1-prototype-plan §3.1）：无路由基建（main.tsx 直接 render）、
 * 状态零拷贝（复用 in-memory 工程）、出码隔离（Present 是编辑器内运行时，与 FR-50 出码各自独立）。
 *
 * 键盘：Esc 退出 / ←→ 历史 / R 重启 / H 热区。Present 期间需 gate 编辑器键盘 effect——
 * 本组件在**捕获阶段**监听并 stopPropagation，且挂载时置 `document.body` 标记供 Editor 判定。
 */

/** Present 挂载标记：Editor 的键盘 effect 据此让路（避免 Esc 误触 SELECT null） */
export const PRESENT_ATTR = 'data-uic-presenting';

export interface PresentOverlayProps {
  page: UIPage;
  /** 初始起点（选中 Frame 有 flowStart 时由 Editor 传入） */
  startId?: string | null;
  onExit: () => void;
  /** FR-39/44：多页浏览——传入后可在顶栏切 Page（切页即重置导航栈到新页首 Frame/flowStart）；缺省单页 */
  pages?: UIPage[];
  /** FR-44：Shift+Space 内联预览小窗模式（同一播放引擎，非全屏容器 + 精简 chrome） */
  inline?: boolean;
  /** inline 模式「进入全屏演示」回调 */
  onGoFullscreen?: () => void;
}

interface NavEntry {
  nodeId: string;
  /** 进入本条目时应用的过渡（FR-41；来源=触发交互的 transition，缺省 INSTANT） */
  tr?: PrototypeTransition | null;
}

/** MOVE/PUSH/SLIDE 入场位移（与 runtime.js offsetOf 同口径：从 direction 侧推入） */
function enterOffset(dir?: PrototypeTransition['direction']): string {
  switch (dir) {
    case 'LEFT': return 'translateX(-100%)';
    case 'RIGHT': return 'translateX(100%)';
    case 'TOP': return 'translateY(-100%)';
    default: return 'translateY(100%)';
  }
}

export function PresentOverlay({ page, startId, onExit, pages, inline = false, onGoFullscreen }: PresentOverlayProps) {
  const pagesList = pages && pages.length ? pages : [page];
  const [activePageId, setActivePageId] = useState(page.id);
  const activePage = pagesList.find((p) => p.id === activePageId) ?? page;
  const root = activePage.root;

  // 起点解析（§3.2-3）；startId 仅对初始页生效（切页后按新页重新解析）
  const initialStart = useMemo(
    () => resolveStartNode(root, activePageId === page.id ? startId : null),
    [root, startId, activePageId, page.id],
  );

  const [stack, setStack] = useState<NavEntry[]>(() => (initialStart ? [{ nodeId: initialStart.id }] : []));
  const [pointer, setPointer] = useState(0); // 当前在 stack 中的位置（← → 导航）
  const [showHotspots, setShowHotspots] = useState(false);
  const [overlay, setOverlay] = useState<{ nodeId: string; pos?: string; closeOutside: boolean } | null>(null);
  const [scale, setScale] = useState(1);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const hotspotTimer = useRef<number | null>(null);

  const current = stack[pointer] ?? null;
  const currentFrame = current ? findById(root, current.nodeId)?.node ?? null : null;

  // FR-41：换帧入场动画（WAAPI——PresentOverlay 是编辑器内运行时，允许动画计算，与出码 runtime 的零布局约束无关）
  useEffect(() => {
    const el = frameRef.current;
    const tr = current?.tr;
    if (!el || !tr || tr.kind === 'INSTANT' || typeof el.animate !== 'function') return;
    const d = durationOf(tr);
    if (d <= 0) return;
    const ease = easingCss(tr);
    const frames: Keyframe[] =
      tr.kind === 'DISSOLVE'
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ transform: enterOffset(tr.direction) }, { transform: 'translate(0px, 0px)' }];
    try {
      el.animate(frames, { duration: d, easing: ease });
    } catch {
      /* WAAPI 异常=无动画（报备） */
    }
  }, [current]);

  // 页面尺寸（设备容器）
  const vw = activePage.viewport?.width ?? 375;
  const vh = activePage.viewport?.height ?? 812;

  // fit 缩放：容器高度不足时按比例缩小（只缩不放大）
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const fit = () => {
      const avail = el.clientHeight;
      const next = avail > 0 && vh > avail ? Math.max(0.2, avail / vh) : 1;
      setScale((prev) => (Math.abs(prev - next) < 0.001 ? prev : next));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [vh]);

  // Present 期间 gate 编辑器键盘（Esc/方向键等不被编辑器消费）
  useEffect(() => {
    document.body.setAttribute(PRESENT_ATTR, '');
    return () => document.body.removeAttribute(PRESENT_ATTR);
  }, []);

  const navigate = useCallback((nodeId: string, tr?: PrototypeTransition | null) => {
    setStack((prev) => {
      const next = [...prev.slice(0, pointer + 1), { nodeId, tr: tr ?? null }];
      setPointer(next.length - 1);
      return next;
    });
  }, [pointer]);

  const goBack = useCallback(() => {
    setPointer((p) => Math.max(0, p - 1));
  }, []);

  const restart = useCallback(() => {
    if (!initialStart) return;
    setStack([{ nodeId: initialStart.id }]);
    setPointer(0);
    setOverlay(null);
  }, [initialStart]);

  const flashHotspots = useCallback(() => {
    setShowHotspots(true);
    if (hotspotTimer.current) window.clearTimeout(hotspotTimer.current);
    hotspotTimer.current = window.setTimeout(() => setShowHotspots(false), 3000);
  }, []);

  // 键盘（捕获阶段 + stopPropagation，避免编辑器抢键）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // KEYDOWN 触发器：先给页面上的交互消费机会
      const consumed = runKeydown(e.key);
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (overlay) setOverlay(null);
        else onExit();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        goBack();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        setPointer((p) => Math.min(stack.length - 1, p + 1));
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        e.stopPropagation();
        restart();
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        e.stopPropagation();
        flashHotspots();
        return;
      }
      if (consumed) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay, stack.length, goBack, restart, flashHotspots, onExit, currentFrame]);

  // KEYDOWN 触发器：当前 Frame 子树中匹配按键的交互
  function runKeydown(key: string): boolean {
    if (!currentFrame) return false;
    let hit = false;
    const walk = (n: UINode): void => {
      for (const it of usableInteractions(n)) {
        if (it.trigger === 'KEYDOWN' && it.key && it.key === key) {
          hit = true;
          execute(it.action, it.targetId, it.url, it.scrollBehavior, it.overlayPosition, it.overlayCloseOnOutside, n.id, it.transition);
        }
      }
      if ('children' in n) n.children.forEach(walk);
    };
    walk(currentFrame);
    return hit;
  }

  function execute(
    action: string,
    targetId?: string,
    url?: string,
    scrollBehavior?: string,
    overlayPosition?: string,
    overlayCloseOnOutside?: boolean,
    selfId?: string,
    tr?: PrototypeTransition | null,
  ): void {
    switch (action) {
      case 'NAVIGATE':
        if (targetId && findById(root, targetId)) navigate(targetId, tr);
        else console.warn('[uic-present] NAVIGATE 目标缺失（broken link），已忽略:', targetId);
        return;
      case 'BACK':
        goBack();
        return;
      case 'OPEN_LINK':
        if (url) window.open(url, '_blank', 'noopener');
        return;
      case 'SCROLL':
        if (selfId) {
          const el = document.querySelector(`[data-present-node="${selfId}"]`);
          el?.scrollIntoView({ behavior: 'smooth', block: scrollBehavior === 'BOTTOM' ? 'end' : 'start' });
        }
        return;
      case 'OPEN_OVERLAY':
        if (targetId && findById(root, targetId)) {
          setOverlay({ nodeId: targetId, pos: overlayPosition, closeOutside: overlayCloseOnOutside ?? true });
        } else {
          console.warn('[uic-present] OPEN_OVERLAY 目标缺失（broken link），已忽略:', targetId);
        }
        return;
      case 'CLOSE_OVERLAY':
        setOverlay(null);
        return;
      default:
        console.warn('[uic-present] 未支持的动作，已忽略:', action);
    }
  }

  // AFTER_TIMEOUT / ON_LOAD：进入当前 Frame 时按序启动（§4.2 的加载即计时简化）
  useEffect(() => {
    if (!currentFrame) return;
    const timers: number[] = [];
    const walk = (n: UINode): void => {
      for (const it of usableInteractions(n)) {
        if (it.trigger === 'AFTER_TIMEOUT') {
          timers.push(
            window.setTimeout(() => {
              execute(it.action, it.targetId, it.url, it.scrollBehavior, it.overlayPosition, it.overlayCloseOnOutside, n.id, it.transition);
            }, Math.max(0, it.timeoutMs ?? 300)),
          );
        } else if (it.trigger === 'ON_LOAD') {
          timers.push(
            window.setTimeout(() => {
              execute(it.action, it.targetId, it.url, it.scrollBehavior, it.overlayPosition, it.overlayCloseOnOutside, n.id, it.transition);
            }, 0),
          );
        }
      }
      if ('children' in n) n.children.forEach(walk);
    };
    walk(currentFrame);
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFrame]);

  // 当前 Frame 的编译产物（含交互节点的 data-node 锚点）
  const frameHtml = useMemo(() => {
    if (!currentFrame) return { html: '', css: '' };
    // 以该 Frame 为临时 root 编译，隔离渲染（Present 只显示当前 Frame）
    const mini: UIPage = {
      ...activePage,
      root: { ...currentFrame, layout: { ...currentFrame.layout, x: 0, y: 0 } } as ContainerNode,
    };
    const compiled = compilePage(mini);
    const { bodyHtml, css } = buildPreviewDom(mini, compiled);
    return { html: bodyHtml, css };
  }, [currentFrame, activePage]);

  const overlayFrame = overlay ? findById(root, overlay.nodeId)?.node ?? null : null;
  const overlayHtml = useMemo(() => {
    if (!overlayFrame) return { html: '', css: '' };
    const mini: UIPage = {
      ...activePage,
      root: { ...overlayFrame, layout: { ...overlayFrame.layout, x: 0, y: 0 } } as ContainerNode,
    };
    const compiled = compilePage(mini);
    const { bodyHtml, css } = buildPreviewDom(mini, compiled);
    return { html: bodyHtml, css };
  }, [overlayFrame, activePage]);

  // 事件委托：按触发器查交互并执行。
  // 注意：`.present-frame` 自身带 data-present-node（根 Frame 可挂交互），
  // 故循环必须**先判定当前元素再上溯**，不能以 e.currentTarget 为排他边界。
  const onStageEvent = (e: React.MouseEvent) => {
    if (!currentFrame) return;
    let el = e.target as HTMLElement | null;
    while (el) {
      const nodeId = el.getAttribute('data-present-node');
      if (nodeId) {
        const found = findById(currentFrame, nodeId)?.node;
        if (found) {
          const usable = usableInteractions(found);
          for (const it of usable) {
            if (
              triggerMatches(
                it.trigger,
                { type: e.type, relatedTarget: (e as unknown as { relatedTarget?: EventTarget }).relatedTarget },
                el,
              )
            ) {
              e.stopPropagation();
              execute(it.action, it.targetId, it.url, it.scrollBehavior, it.overlayPosition, it.overlayCloseOnOutside, found.id, it.transition);
              return;
            }
          }
          // 命中带交互的节点后不再上溯（最近祖先优先，Figma 语义）
          if (usable.length) return;
        }
      }
      if (el === e.currentTarget) break;
      el = el.parentElement;
    }
  };

  const hotspots = useMemo(() => (currentFrame ? collectHotspots(currentFrame) : []), [currentFrame]);
  const frames = useMemo(() => framesOf(root), [root]);

  // FR-39 多页浏览：切页即按新页重新解析起点并重置导航栈（startId 不跨页沿用）
  const switchPage = (pid: string) => {
    const np = pagesList.find((p) => p.id === pid);
    if (!np) return;
    setActivePageId(pid);
    const s = resolveStartNode(np.root, null);
    setStack(s ? [{ nodeId: s.id }] : []);
    setPointer(0);
    setOverlay(null);
  };

  // 空状态：无 Frame 可演示（FR-44）
  if (!initialStart) {
    return (
      <div className={inline ? 'present-inline' : 'present-overlay'} role="dialog" aria-label={inline ? '原型预览' : '演示模式'}>
        <div className="present-empty">
          <div className="present-empty-title">无可演示的 Frame</div>
          <div className="present-empty-note">
            当前页面尚无 Frame，或未配置流程起点。请在画布创建 Frame，或用 Prototype 面板设置 Flow 起点。
          </div>
          <button className="btn" onClick={onExit}>
            {inline ? '关闭预览（Esc）' : '退出演示（Esc）'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={inline ? 'present-inline' : 'present-overlay'} role="dialog" aria-label={inline ? '原型预览' : '演示模式'}>
      <div className="present-bar">
        <span className="present-title">
          {activePage.name} · {inline ? '预览' : '演示'}
        </span>
        {pagesList.length > 1 && (
          <select
            className="present-page-select"
            value={activePage.id}
            onChange={(e) => switchPage(e.target.value)}
            title="切换 Page（FR-39 演示可浏览各页）"
          >
            {pagesList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
        <select
          className="present-flow-select"
          value={current?.nodeId ?? ''}
          onChange={(e) => {
            setStack([{ nodeId: e.target.value }]);
            setPointer(0);
          }}
          title="切换起点（Flows）"
        >
          {frames.map((f) => (
            <option key={f.id} value={f.id}>
              {f.flowStart ? '▶ ' : ''}
              {f.name}
            </option>
          ))}
        </select>
        <span className="present-hint">{inline ? '小窗内点击交互生效 · Esc 关闭' : '← → 历史 · R 重启 · H 热区 · Esc 退出'}</span>
        <button className="btn btn-ghost" onClick={restart} disabled={!initialStart}>
          重启
        </button>
        <button className="btn btn-ghost" onClick={() => setShowHotspots((v) => !v)}>
          热区
        </button>
        {inline && onGoFullscreen && (
          <button className="btn btn-ghost present-to-full" onClick={onGoFullscreen} title="进入全屏演示">
            全屏演示
          </button>
        )}
        <button className="btn btn-ghost present-close" onClick={onExit} title="退出（Esc）">
          ✕
        </button>
      </div>

      <div className="present-stage" ref={stageRef}>
        <div
          className="present-frame"
          ref={frameRef}
          style={{
            width: vw,
            height: vh,
            transform: `scale(${scale})`,
            background: root.style?.background ?? '#FFFFFF',
          }}
          data-present-node={currentFrame?.id}
          onMouseOver={onStageEvent}
          onMouseOut={onStageEvent}
          onClick={onStageEvent}
          onMouseDown={onStageEvent}
        >
          <style>{frameHtml.css}</style>
          <div dangerouslySetInnerHTML={{ __html: frameHtml.html }} />
          {/* 热区可视化（H）：子节点按几何标框；根 Frame 自身挂交互时整帧描边 */}
          {showHotspots && (
            <>
              {hotspots
                .filter((h) => h.id !== currentFrame?.id)
                .map((h) => (
                  <div key={h.id} className="present-hotspot" data-present-node={h.id} style={hotspotStyle(h)} />
                ))}
              {hotspots.some((h) => h.id === currentFrame?.id) && <div className="present-hotspot-root" />}
            </>
          )}
        </div>
      </div>

      {/* Overlay（FR-42）：九宫定位 + 点外关闭 */}
      {overlayFrame && (
        <div
          className="present-overlay-scrim"
          style={overlayScrimStyle(overlay?.pos)}
          onClick={(e) => {
            if (e.target === e.currentTarget && (overlay?.closeOutside ?? true)) setOverlay(null);
          }}
        >
          <div className="present-overlay-panel">
            <style>{overlayHtml.css}</style>
            <div dangerouslySetInnerHTML={{ __html: overlayHtml.html }} />
          </div>
        </div>
      )}
    </div>
  );
}

/** 热区点位：节点在 Frame 内的本地坐标（Frame 自身为整帧，由 .present-frame 承载） */
function hotspotStyle(node: UINode): React.CSSProperties {
  const l = node.layout;
  return {
    left: l.x ?? 0,
    top: l.y ?? 0,
    width: l.width ?? 40,
    height: l.height ?? 24,
  };
}

/** 是否处于 Present 模式（供 Editor 的键盘 effect 判定） */
export function isPresenting(): boolean {
  return typeof document !== 'undefined' && document.body.hasAttribute(PRESENT_ATTR);
}

/** 过渡样式串（供热区/动画扩展复用） */
export function transitionStyle(kind: string, tr?: import('../../schema/types').PrototypeTransition): string {
  if (kind === 'INSTANT') return 'none';
  const d = durationOf(tr);
  const e = easingCss(tr);
  if (kind === 'DISSOLVE') return `opacity ${d}ms ${e}`;
  const from = translateOf(tr);
  return `transform ${d}ms ${e}, opacity ${d}ms ${e}, --uic-from: ${from}`;
}
