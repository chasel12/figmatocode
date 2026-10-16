/**
 * FR-44 Present 演示模式入口总线。
 *
 * 沿 `canvasBus` 先例：Toolbar 只发命令、不持有 Present 状态；Editor 订阅并挂载遮罩。
 * 视图态不进 store 历史（同 `tool` 字段口径）。
 */
export interface PresentRequest {
  /** 起点 Frame id（选中 Frame 且带 flowStart 时由 Toolbar 解析后传入） */
  startId?: string | null;
}

type Handler = (req: PresentRequest) => void;

const target = new EventTarget();

export const presentBus = {
  requestStart(req: PresentRequest = {}): void {
    target.dispatchEvent(new CustomEvent('start', { detail: req }));
  },
  onStart(fn: Handler): () => void {
    const h = (e: Event) => fn((e as CustomEvent<PresentRequest>).detail);
    target.addEventListener('start', h);
    return () => target.removeEventListener('start', h);
  },
};
