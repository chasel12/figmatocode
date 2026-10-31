import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
import { opsToStoreActions, projectWithNewPage, projectWithSite, type EditDryRun } from './aiActions';
import { describeWiring, runSiteGeneration, type NavLink } from './site';
import {
  MAX_SKILL_COUNT,
  SKILL_FILE_ACCEPT,
  composeDesignRef,
  loadSkills,
  makeSkill,
  onSkillsChanged,
  saveSkills,
  skillNameFromFile,
} from './skills';
import type { AiEditPlan, AiSiteDraft, AiSkill } from './types';

type Mode = 'page' | 'site' | 'edit';

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

interface SiteResult {
  kind: 'site';
  pages: UIPage[];
  site: AiSiteDraft;
  links: NavLink[];
  missing: { pageId: string; pageName: string; missing: string[] }[];
  perPage: { name: string; attempts: number; costCny: number; elapsedMs: number }[];
  attempts: number;
  cost: number;
  firstPass: boolean;
  elapsed: number;
}

type Result = PageResult | SiteResult | EditResult;

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
  /** 整站结果的预览页下标（多页结果要能逐页翻看） */
  const [sitePreview, setSitePreview] = useState(0);
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
  /** 设计参考（skill）：按工程名分桶存本机；工程文件里再带一份便于分享 */
  const [skills, setSkills] = useState<AiSkill[]>(() => loadSkills(state.projectName));
  const [refOpen, setRefOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftText, setDraftText] = useState('');
  const [refError, setRefError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /** 换工程（打开/新建）时重新加载该工程自己的参考列表 */
  useEffect(() => {
    setSkills(loadSkills(state.projectName));
  }, [state.projectName]);

  /** 打开工程时从文件里恢复的参考，本面板也要跟着刷新（工程名可能没变） */
  useEffect(
    () =>
      onSkillsChanged((name, next) => {
        if (name !== state.projectName) return;
        setSkills((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      }),
    [state.projectName],
  );

  const updateSkills = (next: AiSkill[]) => {
    const capped = next.slice(0, MAX_SKILL_COUNT);
    setSkills(capped);
    saveSkills(state.projectName, capped);
  };

  const designRef = useMemo(() => composeDesignRef(skills), [skills]);
  const activeRefCount = skills.filter((s) => s.enabled && s.text.trim()).length;

  const addDraftSkill = () => {
    const text = draftText.trim();
    if (!text) return;
    updateSkills([makeSkill(draftName.trim() || `手写参考 ${skills.length + 1}`, text), ...skills]);
    setDraftName('');
    setDraftText('');
    setRefError(null);
  };

  /** 上传：纯文本一律可读（.md/.txt/.json），不解析结构——只取文字层 */
  const addSkillFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const picked = Array.from(files).slice(0, MAX_SKILL_COUNT);
    try {
      const loaded = await Promise.all(
        picked.map(async (f) => makeSkill(skillNameFromFile(f.name), await f.text())),
      );
      const usable = loaded.filter((s) => s.text.trim().length > 0);
      if (!usable.length) {
        setRefError('这些文件里没有可读文本（可能是二进制或空文件）');
        return;
      }
      updateSkills([...usable, ...skills]);
      setRefError(loaded.length > usable.length ? `${loaded.length - usable.length} 个文件为空，已跳过` : null);
    } catch (e) {
      setRefError(`读取失败：${(e as Error).message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const pack = getPack(packId);
  const prov = providerDef(provider);
  const selectionCount = state.selectedIds.filter((id) => id !== state.page.root.id).length;
  const canRun = hasKey && !running && prompt.trim().length > 0 && (mode !== 'edit' || selectionCount > 0);

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
    /**
     * 防呆：key 输入框是**草稿**语义（`keyDraft`），显式点「保存 key」才落 localStorage。
     * 这里把非空草稿先提交，避免「改了 key 但忘了点保存 → 用旧 key 发请求」。
     * （注意：`canRun` 里的 `hasKey` 是渲染时的快照，所以提交必须放在它之前，
     *  且只对「已有 key 又改了 key」这类可点按钮的情形生效。）
     */
    if (keyDraft.trim()) {
      setApiKey(keyDraft.trim(), provider);
      setKeyDraft('');
      setHasKey(true);
    }
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
        designRef,
        signal: controller.signal,
        onProgress,
        model,
      };
      if (designRef) pushLog(`已注入 ${activeRefCount} 段设计参考（${designRef.length} 字）`);

      if (mode === 'site') {
        const res = await runSiteGeneration(base);
        setResult({
          kind: 'site',
          pages: res.pages,
          site: res.site,
          links: res.links,
          missing: res.missing,
          perPage: res.perPage,
          attempts: res.attempts,
          cost: res.costCny,
          firstPass: res.firstPass,
          elapsed: res.elapsedMs,
        });
        setSitePreview(0);
        setCost((c) => c + res.costCny);
        setUsage(res.usage);
        pushLog(describeWiring(res));
        pushLog(
          `✓ ${res.pages.length} 页（${res.pages.map((p) => p.name).join(' / ')}）· ${(res.elapsedMs / 1000).toFixed(1)}s · ¥${res.costCny.toFixed(3)}`,
        );
      } else if (mode === 'page') {
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

  /**
   * 采纳整站：一次 LOAD_PROJECT 写全部页 + 切到入口页。
   * 分多次 NEW_PAGE 会让每一步都进 undo 栈，用户想撤掉整站要按 N 次。
   */
  const adoptSite = () => {
    if (result?.kind !== 'site') return;
    const { project, replaced, added } = projectWithSite(state, result.pages);
    dispatch({ type: 'LOAD_PROJECT', project });
    dispatch({ type: 'SELECT_PAGE', id: result.pages[0].id });
    pushLog(`已采纳 ${result.pages.length} 页（新增 ${added}、替换同名 ${replaced}），当前页「${result.pages[0].name}」`);
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

  const previewPage =
    result?.kind === 'page'
      ? result.page
      : result?.kind === 'site'
        ? (result.pages[Math.min(sitePreview, result.pages.length - 1)] ?? result.pages[0])
        : result?.kind === 'edit'
          ? result.dry.page
          : null;

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

      {!hasKey && !prov.keyOptional && (
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
              /**
               * 必须同步 `hasKey`：`canRun` 依赖它，不同步的话保存了 key 但「生成」按钮
               * 仍是灰的，用户会以为 key 没生效（早先只有必填区同步，可选区漏了）。
               */
              setHasKey(true);
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
                setHasKey(false);
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
          className={`ai-seg-btn ${mode === 'site' ? 'is-active' : ''}`}
          onClick={() => setMode('site')}
          disabled={running}
          title="先规划 2~6 页，再逐页生成并自动连好页面间跳转"
        >
          整站
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

      <div className={`ai-ref ${refOpen ? 'is-open' : ''}`}>
        <button
          className="ai-ref-head"
          onClick={() => setRefOpen((v) => !v)}
          disabled={running}
          title="把任意前端 skill / 风格说明的文本作为「长什么样」的参考注入提示词；它不会改变输出契约"
        >
          <span className="ai-ref-caret">{refOpen ? '▾' : '▸'}</span>
          <span className="ai-ref-title">设计参考</span>
          <span className={`ai-ref-count ${activeRefCount > 0 ? 'is-on' : ''}`}>
            {activeRefCount > 0 ? `${activeRefCount} 段生效 · ${designRef.length} 字` : skills.length > 0 ? `${skills.length} 段（全部关闭）` : '未使用'}
          </span>
        </button>

        {refOpen && (
          <div className="ai-ref-body">
            <div className="ai-setup-note">
              上传任意前端 skill 或风格说明（<code>.md</code> / <code>.txt</code>，也可以直接粘贴）。
              它只影响审美，<b>不影响输出格式</b>——产物仍然是可编译的 JSON 节点树，不是代码。
            </div>

            {skills.length > 0 && (
              <div className="ai-ref-list">
                {skills.map((s) => (
                  <div key={s.id} className={`ai-ref-item ${s.enabled ? '' : 'is-off'}`}>
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      disabled={running}
                      onChange={() => updateSkills(skills.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)))}
                      title={s.enabled ? '本次会注入' : '本次不注入（保留在列表里）'}
                    />
                    <span className="ai-ref-name" title={s.name}>
                      {s.name}
                    </span>
                    <span className="ai-ref-size">{s.text.length}字</span>
                    <button
                      className="mini-btn"
                      disabled={running}
                      onClick={() => updateSkills(skills.filter((x) => x.id !== s.id))}
                      title="删除这段参考"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              className="ai-key-input"
              placeholder="参考名称（可留空）"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              disabled={running}
            />
            <textarea
              className="ai-prompt"
              rows={4}
              placeholder="把 skill 正文粘在这里：设计原则、间距节奏、阴影层次、配色倾向、字体对比……"
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              disabled={running}
            />
            <div className="ai-ref-actions">
              <button className="mini-btn" disabled={running || !draftText.trim()} onClick={addDraftSkill}>
                添加为参考
              </button>
              <button className="mini-btn" disabled={running} onClick={() => fileInputRef.current?.click()}>
                上传文件
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={SKILL_FILE_ACCEPT}
                multiple
                style={{ display: 'none' }}
                onChange={(e) => void addSkillFiles(e.target.files)}
              />
              {skills.length > 0 && (
                <button className="mini-btn" disabled={running} onClick={() => updateSkills([])} title="清空本工程的全部参考">
                  清空
                </button>
              )}
            </div>
            {refError && <div className="ai-ref-error">{refError}</div>}
          </div>
        )}
      </div>

      <textarea
        className="ai-prompt"
        rows={4}
        placeholder={
          mode === 'page'
            ? '例：做一个健身 App 的训练计划页，顶部显示本周进度，下面 3 张训练卡片，底部固定「开始训练」按钮'
            : mode === 'site'
              ? '例：一个健身打卡 App，要有首页（今日训练）、训练（动作清单）、我的（连续打卡与设置）三页，底部导航互通'
              : '例：把选中的卡片背景改成主色、圆角加大到 16，标题字号提到 20'
        }
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={running}
      />

      <div className="ai-actions">
        <button className="ai-run" onClick={run} disabled={!canRun}>
          {running ? '生成中…' : mode === 'page' ? '生成' : mode === 'site' ? '规划并生成整站' : '生成修改'}
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
                : result?.kind === 'site'
                  ? `预览：${previewPage.name}（${Math.min(sitePreview, result.pages.length - 1) + 1}/${result.pages.length}）`
                  : `预览：${result?.plan.summary ?? '修改结果'}`}
            </span>
            <span className="ai-result-meta">
              {result?.kind === 'edit'
                ? `${result.plan.actions.length} 条指令`
                : result?.kind === 'site'
                  ? `${result.links.length} 条跳转`
                  : `${result?.attempts ?? 0} 轮`}
            </span>
          </div>
          {result?.kind === 'site' && (
            <div className="ai-site-tabs">
              {result.pages.map((p, i) => (
                <button
                  key={p.id}
                  className={`mini-btn ${i === sitePreview ? 'is-active' : ''}`}
                  onClick={() => setSitePreview(i)}
                  title={`${p.name} · ${result.perPage[i]?.attempts ?? 1} 轮`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}
          <PreviewFrame page={previewPage} />
          {result?.kind === 'site' && (
            <div className="ai-diff">
              {result.perPage.map((p, i) => (
                <div key={i} className="ai-diff-line">
                  · {p.name}：{p.attempts} 轮 · {(p.elapsedMs / 1000).toFixed(1)}s · ¥{p.costCny.toFixed(3)}
                </div>
              ))}
              <div className="ai-diff-stat">{describeWiring({ pages: result.pages, links: result.links, missing: result.missing })}</div>
              {result.missing.length > 0 && (
                <div className="ai-diff-line" style={{ opacity: 0.75 }}>
                  导航项缺失的页面，那一项点了不会跳——可以采纳后手动补，或重新生成该页。
                </div>
              )}
            </div>
          )}
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
            <button
              className="ai-adopt"
              onClick={result?.kind === 'page' ? adoptPage : result?.kind === 'site' ? adoptSite : adoptEdit}
            >
              采纳{result?.kind === 'page' ? '为新页面' : result?.kind === 'site' ? `这 ${(result as SiteResult).pages.length} 页` : '修改'}
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
