/**
 * Canvas 命令/状态总线（FR-25 顶栏缩放控件、FR-26 View 菜单、FR-14 预设创建）。
 * Canvas 在组件内订阅命令并发布当前缩放；其它面板只发命令、不持有画布内部状态。
 */
export type CanvasCommand =
  | { op: 'fit' }
  | { op: 'zoomSet'; scale: number }
  | { op: 'zoomIn' }
  | { op: 'zoomOut' }
  | { op: 'createFrame'; width: number; height: number; name?: string }
  | { op: 'captureRegion'; requestId: number; region: PageRegion; pixelScale: number; mime: 'image/png' | 'image/jpeg' };

/** FR-24 导出区域：page 坐标系（不含画布缩放/平移），由 Canvas 换算到 stage 绝对空间 */
export interface PageRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

type CmdHandler = (cmd: CanvasCommand) => void;
type ScaleHandler = (scale: number) => void;

const cmdTarget = new EventTarget();
const scaleTarget = new EventTarget();

// FR-24：captureRegion 请求-应答（Canvas 侧 toDataURL 后回传 dataURL，超时 15s 拒绝）
const captureWaiters = new Map<number, { resolve: (dataUrl: string) => void; reject: (err: Error) => void; timer: ReturnType<typeof setTimeout> }>();
let captureSeq = 0;

export const canvasBus = {
  send(cmd: CanvasCommand): void {
    cmdTarget.dispatchEvent(new CustomEvent('cmd', { detail: cmd }));
  },
  onCmd(fn: CmdHandler): () => void {
    const handler = (e: Event) => fn((e as CustomEvent<CanvasCommand>).detail);
    cmdTarget.addEventListener('cmd', handler);
    return () => cmdTarget.removeEventListener('cmd', handler);
  },
  publishScale(scale: number): void {
    scaleTarget.dispatchEvent(new CustomEvent('scale', { detail: scale }));
  },
  onScale(fn: ScaleHandler): () => void {
    const handler = (e: Event) => fn((e as CustomEvent<number>).detail);
    scaleTarget.addEventListener('scale', handler);
    return () => scaleTarget.removeEventListener('scale', handler);
  },
  requestCapture(region: PageRegion, pixelScale: number, mime: 'image/png' | 'image/jpeg'): Promise<string> {
    const requestId = ++captureSeq;
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        captureWaiters.delete(requestId);
        reject(new Error('captureRegion timeout'));
      }, 15000);
      captureWaiters.set(requestId, { resolve, reject, timer });
      cmdTarget.dispatchEvent(new CustomEvent('cmd', { detail: { op: 'captureRegion', requestId, region, pixelScale, mime } satisfies CanvasCommand }));
    });
  },
  resolveCapture(requestId: number, dataUrl: string): void {
    const w = captureWaiters.get(requestId);
    if (!w) return;
    clearTimeout(w.timer);
    captureWaiters.delete(requestId);
    w.resolve(dataUrl);
  },
  rejectCapture(requestId: number, err: Error): void {
    const w = captureWaiters.get(requestId);
    if (!w) return;
    clearTimeout(w.timer);
    captureWaiters.delete(requestId);
    w.reject(err);
  },
};
