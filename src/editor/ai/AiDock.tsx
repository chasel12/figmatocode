import { useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useEditor } from '../store';
import { CanvasGeometryContext } from '../canvasContext';
import { compilePage } from '../../compiler';
import { generateHtml } from '../../generator';
import type { UIPage } from '../../schema/types';
import { PACKS, getPack, packTokens } from '../../tokens/packs';
import { loadIcons } from '../../assets/icons';
import {
  PROVIDERS,
  aiAvailable,
  createLlmClient,
  describeAiError,
  estimateCostCny,
  getApiKey,
  getBaseURL,
  getModel,
  getProvider,
  isPriced,
  maskKey,
  providerDef,
  setApiKey,
  setBaseURL,
  setModel,
  setProvider,
  type AiUsage,
  type ProviderId,
} from './client';
import { loadFewShots } from './promptPack';
import { runEditPlan, runPageGeneration, type ProgressEvent } from './generate';
import { buildSelectionContext, collectExistingIds } from './selectionContext';
import { opsToStoreActions, projectWithNewPage, type EditDryRun } from './aiActions';
import type { AiEditPlan } from './types';

type Mode = 'page' | 'edit';

interface PageResult {
  kind: 'page';
  page: UIPage;
  attempts: number;
  cost: number;
  firstPass: boolean;
  elapsed: number;
}

interface EditResult {
  kind: 'edit';
  dry: EditDryRun;
  plan: AiEditPlan;
  attempts: number;
  cost: number;
  firstPass: boolean;
  elapsed: number;
}

type Result = PageResult | EditResult;

const STAGE_LABEL: Record<ProgressEvent['stage'], string> = {
  prompt: '提示词',
  request: '请求',
  validate: '校验',
  repair: '自修',
  convert: '归一化',
  done: '完成',
};

/** 预览：直接复用确定性出码（与画布无关，AI 产物只是数据） */
function PreviewFrame({ page }: { page: UIPage }) {
  const html = useMemo(() => {
    try {
      return generateHtml(page, compilePage(page), { title: page.name, fontsBase: '/fonts' });
    } catch (err) {
      return `<!DOCTYPE html><body style="font:13px/1.6 sans-serif;color:#b42318;padding:12px">预览失败：${(err as Error).message}</body>`;
    }
  }, [page]);
  // 页面按 375 宽设计，左栏只有 ~200px：等比缩到 0.4 展示（预览只用于"看结构"，精确对像素请采纳后看画布）
  const scale = Math.min(0.42, 190 / page.viewport.width);
  return (
    <div className="ai-preview" style={{ height: Math.round(page.viewport.height * scale) + 8 }}>
      <iframe
        title="AI 预览"
        className="ai-preview-frame"
        sandbox=""
        srcDoc={html}
        style={{ width: page.viewport.width, height: page.viewport.height, transform: `scale(${scale})` }}
      />
    </div>
  );
}

export function AiDock() {
  const { state, dispatch } = useEditor();
  const geometry = useContext(CanvasGeometryContext);
  const [mode, setMode] = useState<Mode>('page');
  const [prompt, setPrompt] = useState('');
  const [packId, setPackId] = useState(PACKS[0].id);
  const [provider, setProviderState] = useState<ProviderId>(getProvider());
  const [model, setModelState] = useState(() => getModel());
  const [keyDraft, setKeyDraft] = useState('');
  const [baseDraft, setBaseDraft] = useState(() => getBaseURL());
  const [hasKey, setHasKey] = useState(() => aiAvailable());
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cost, setCost] = useState(0);
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [undoSteps, setUndoSteps] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const pack = getPack(packId);
  const prov = providerDef(provider);
  const selectionCount = state.selectedIds.filter((id) => id !== state.page.root.id).length;
  const canRun = hasKey && !running && prompt.trim().length > 0 && (mode === 'page' || selectionCount > 0);

  /** 切供应商：key / 模型 / 面板状态都按供应商隔离，避免把 A 家的 key 发到 B 家端点 */
  const switchProvider = (id: ProviderId) => {
    setProvider(id);
    setProviderState(id);
    setHasKey(aiAvailable(id));
    setModelState(getModel(id));
    setKeyDraft('');
    setBaseDraft(getBaseURL(id));
    setResult(null);
    setError(null);
  };

  const pushLog = useCallback((line: string) => {
    setLog((prev) => [...prev.slice(-40), line]);
  }, []);

  const onProgress = useCallback(
    (e: ProgressEvent) => {
      pushLog(`[${STAGE_LABEL[e.stage]}] ${e.message}`);
    },
    [pushLog],
  );

  const reset = () => {
    setResult(null);
    setError(null);
    setLog([]);
    setUsage(null);
    setUndoSteps(0);
  };

  const run = async () => {
    if (!canRun) return;
    reset();
    setRunning(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const client = await createLlmClient({ model, provider });
      const [icons, fewShots] = await Promise.all([loadIcons(), loadFewShots()]);
      const iconMap = Object.fromEntries(Object.entries(icons.icons).map(([k, v]) => [k, v.d]));
      const base = {
        userPrompt: prompt.trim(),
        pack,
        viewport: state.page.viewport,
        client,
        icons: iconMap,
        fewShots,
        signal: controller.signal,
        onProgress,
        model,
      };

      if (mode === 'page') {
        const res = await runPageGeneration(base);
        setResult({
          kind: 'page',
          page: res.data,
          attempts: res.attempts,
          cost: res.costCny,
          firstPass: res.firstPass,
          elapsed: res.elapsedMs,
        });
        setCost((c) => c + res.costCny);
        setUsage(res.usage);
        pushLog(`✓ ${res.firstPass ? '一次通过' : `自修 ${res.attempts - 1} 轮后通过`} · ${(res.elapsedMs / 1000).toFixed(1)}s · ¥${res.costCny.toFixed(3)}`);
      } else {
        if (!geometry) {
          throw new Error('画布几何未就绪，请稍后重试');
        }
        const selection = buildSelectionContext(state, geometry);
        const res = await runEditPlan({
          ...base,
          page: state.page,
          selection,
          existingIds: collectExistingIds(state),
        });
        setResult({
          kind: 'edit',
          dry: res.data,
          plan: res.data.plan,
          attempts: res.attempts,
          cost: res.costCny,
          firstPass: res.firstPass,
          elapsed: res.elapsedMs,
        });
        setCost((c) => c + res.costCny);
        setUsage(res.usage);
        pushLog(`✓ ${res.data.plan.actions.length} 条指令 · ${(res.elapsedMs / 1000).toFixed(1)}s · ¥${res.costCny.toFixed(3)}`);
      }
    } catch (err) {
      const e = err as { violations?: unknown[]; message?: string };
      setError(describeAiError(err));
      if (e.violations?.length) pushLog(`✗ ${e.violations.length} 条违例未修复`);
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const cancel = () => {
    abortRef.current?.abort();
    pushLog('已请求取消');
  };

  /** 采纳新页面：整体写工程 + 切到新页（一个 LOAD_PROJECT + 一个 SELECT_PAGE，不产生半成品） */
  const adoptPage = () => {
    if (result?.kind !== 'page') return;
    dispatch({ type: 'LOAD_PROJECT', project: projectWithNewPage(state, result.page) });
    dispatch({ type: 'SELECT_PAGE', id: result.page.id });
    pushLog(`已采纳为新页面「${result.page.name}」`);
    setResult(null);
  };

  /** 采纳编辑：走人点同一条管道（每条指令 = 一条 store action） */
  const adoptEdit = () => {
    if (result?.kind !== 'edit') return;
    const { actions } = opsToStoreActions(result.plan, { pack });
    actions.forEach((a) => dispatch(a));
    setUndoSteps(actions.length);
    pushLog(`已应用 ${actions.length} 条修改（可一键回退）`);
    setResult(null);
  };

  const rollback = () => {
    for (let i = 0; i < undoSteps; i += 1) dispatch({ type: 'UNDO' });
    pushLog(`已回退 ${undoSteps} 步`);
    setUndoSteps(0);
  };

  const applyPackTokens = () => {
    const tokens = packTokens(pack);
    tokens.forEach((t) =>
      dispatch({
        type: 'CREATE_TOKEN',
        kind: t.kind,
        name: t.name,
        style: t.style,
        grids: t.grids,
      }),
    );
    pushLog(`已载入 ${pack.name} 的 ${tokens.length} 条样式到资产面板`);
  };

  const previewPage = result?.kind === 'page' ? result.page : result?.kind === 'edit' ? result.dry.page : null;

  return (
    <div className="ai-dock">
      <div className="ai-head">
        <span className="ai-title">AI 生成</span>
        <span className="ai-cost" title="本次会话累计估算（按参考价折算人民币）">
          ¥{cost.toFixed(3)}
        </span>
      </div>

      <div className="ai-provider">
        <span className="ai-provider-label">供应商</span>
        <select
          className="ai-select"
          value={provider}
          onChange={(e) => switchProvider(e.target.value as ProviderId)}
          disabled={running}
          title={prov.note}
        >
          {PROVIDERS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {prov.baseURLEditable && (
        <div className="ai-setup">
          <div className="ai-setup-note">
            端点地址（OpenAI 兼容，形如 <code>https://your-gateway/v1</code>）：只存本机 localStorage。
          </div>
          <input
            className="ai-key-input"
            placeholder={prov.baseURL ?? 'https://your-gateway/v1'}
            value={baseDraft}
            onChange={(e) => setBaseDraft(e.target.value)}
            onBlur={() => setBaseURL(baseDraft.trim(), provider)}
            disabled={running}
          />
        </div>
      )}

      {!hasKey && (
        <div className="ai-setup">
          <div className="ai-setup-note">
            未配置 {prov.label} API key：AI 功能整体置灰。key 只存本机 localStorage，<b>不进仓库、不进日志</b>；
            生成时只有提示词与选中节点的结构会发给模型。
            {prov.baseURL && <>（{prov.note}）</>}
          </div>
          <input
            className="ai-key-input"
            type="password"
            placeholder={prov.keyPlaceholder}
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
          />
          <button
            className="mini-btn"
            disabled={!keyDraft.trim()}
            onClick={() => {
              setApiKey(keyDraft.trim(), provider);
              setHasKey(true);
              setKeyDraft('');
              pushLog(`已保存 ${prov.label} key（${maskKey(keyDraft.trim())}）`);
            }}
          >
            保存 key
          </button>
        </div>
      )}

      {prov.keyOptional && (
        <div className="ai-setup">
          <div className="ai-setup-note">
            {prov.label} 的 key <b>可选</b>：本地端点留空即可；网关要鉴权时在此填写（同样只存本机，不进日志）。
          </div>
          <input
            className="ai-key-input"
            type="password"
            placeholder={getApiKey(provider) ? maskKey(getApiKey(provider)) : prov.keyPlaceholder}
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            disabled={running}
          />
          <button
            className="mini-btn"
            disabled={!keyDraft.trim()}
            onClick={() => {
              setApiKey(keyDraft.trim(), provider);
              setKeyDraft('');
              pushLog(`已保存 ${prov.label} key（${maskKey(keyDraft.trim())}）`);
            }}
          >
            保存 key
          </button>
          {getApiKey(provider) && (
            <button
              className="mini-btn"
              onClick={() => {
                setApiKey('', provider);
                pushLog(`已清除 ${prov.label} key`);
              }}
            >
              清除
            </button>
          )}
        </div>
      )}

      {hasKey && !prov.keyOptional && (
        <div className="ai-key-row">
          <span title={`${prov.label} key 只存本机 localStorage`}>
            {prov.label} key {maskKey(getApiKey(provider))}
          </span>
          <button
            className="mini-btn"
            onClick={() => {
              setApiKey('', provider);
              setHasKey(false);
              pushLog(`已清除 ${prov.label} key`);
            }}
          >
            清除
          </button>
        </div>
      )}

      <div className="ai-seg">
        <button className={`ai-seg-btn ${mode === 'page' ? 'is-active' : ''}`} onClick={() => setMode('page')} disabled={running}>
          生成新页
        </button>
        <button
          className={`ai-seg-btn ${mode === 'edit' ? 'is-active' : ''}`}
          onClick={() => setMode('edit')}
          disabled={running}
          title={selectionCount === 0 ? '先在画布上选中要修改的节点' : `已选中 ${selectionCount} 个节点`}
        >
          修改选中{selectionCount > 0 ? `（${selectionCount}）` : ''}
        </button>
      </div>

      <select className="ai-select" value={packId} onChange={(e) => setPackId(e.target.value)} disabled={running} title="风格包：决定可用令牌与设计语言">
        {PACKS.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {p.license}
          </option>
        ))}
      </select>

      {prov.modelEditable ? (
        <input
          className="ai-key-input"
          placeholder={`模型名，例：${prov.models[0]}`}
          value={model}
          onChange={(e) => {
            setModelState(e.target.value);
            setModel(e.target.value, provider);
          }}
          disabled={running}
          title={`模型名按端点实际支持的填写（${prov.label} 的模型清单更新很快，写死会过期）`}
        />
      ) : (
        <select
          className="ai-select"
          value={model}
          onChange={(e) => {
            setModelState(e.target.value);
            setModel(e.target.value, provider);
          }}
          disabled={running}
          title={`模型档位（${prov.label}）`}
        >
          {prov.models.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      )}

      <textarea
        className="ai-prompt"
        rows={4}
        placeholder={
          mode === 'page'
            ? '例：做一个健身 App 的训练计划页，顶部显示本周进度，下面 3 张训练卡片，底部固定「开始训练」按钮'
            : '例：把选中的卡片背景改成主色、圆角加大到 16，标题字号提到 20'
        }
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={running}
      />

      <div className="ai-actions">
        <button className="ai-run" onClick={run} disabled={!canRun}>
          {running ? '生成中…' : mode === 'page' ? '生成' : '生成修改'}
        </button>
        {running && (
          <button className="mini-btn" onClick={cancel}>
            取消
          </button>
        )}
        {undoSteps > 0 && (
          <button className="mini-btn" onClick={rollback} title={`回退 ${undoSteps} 步（等价于连按 Ctrl+Z）`}>
            ↶ 回退本次修改
          </button>
        )}
      </div>

      {!hasKey && <div className="ai-hint">配置 {prov.label} key 后可用；模型：{model}</div>}

      {log.length > 0 && (
        <div className="ai-log">
          {log.map((line, i) => (
            <div key={i} className="ai-log-line">
              {line}
            </div>
          ))}
        </div>
      )}

      {error && <div className="ai-error">{error}</div>}

      {previewPage && (
        <>
          <div className="ai-result-head">
            <span>
              {result?.kind === 'page'
                ? `预览：${result.page.name}`
                : `预览：${result?.plan.summary ?? '修改结果'}`}
            </span>
            <span className="ai-result-meta">
              {result?.kind === 'edit' ? `${result.plan.actions.length} 条指令` : `${result?.attempts ?? 0} 轮`}
            </span>
          </div>
          <PreviewFrame page={previewPage} />
          {result?.kind === 'edit' && (
            <div className="ai-diff">
              {result.dry.report.map((r, i) => (
                <div key={i} className="ai-diff-line">
                  · {r.text}
                </div>
              ))}
              <div className="ai-diff-stat">
                节点 {result.dry.stats.nodesBefore} → {result.dry.stats.nodesAfter} · 样式 {result.dry.stats.styleChanges} · 文案{' '}
                {result.dry.stats.textChanges}
              </div>
            </div>
          )}
          <div className="ai-actions">
            <button className="ai-adopt" onClick={result?.kind === 'page' ? adoptPage : adoptEdit}>
              采纳{result?.kind === 'page' ? '为新页面' : '修改'}
            </button>
            <button className="mini-btn" onClick={() => setResult(null)}>
              放弃
            </button>
            <button className="mini-btn" onClick={applyPackTokens} title="把风格包的样式导入资产面板（PAINT/TEXT）">
              载入风格样式
            </button>
          </div>
        </>
      )}

      {usage && (
        <div className="ai-usage">
          输入 {usage.inputTokens}（缓存读 {usage.cacheReadTokens}） · 输出 {usage.outputTokens} · 估算{' '}
          {isPriced(model) ? `¥${estimateCostCny(usage, model).toFixed(3)}` : '未计价（该模型不在参考价表内）'}
        </div>
      )}
    </div>
  );
}
