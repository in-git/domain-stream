/**
 * 客户端配置管理页
 * ------------------------------------------------------------------
 * 对应后端菜单：path = /biz/config，component = biz/config/index
 *
 * 可视化配置：数据库存的是 JSON（如 {"title":"..."}），
 * 页面不直接编辑 JSON，而是由 schema.ts 定义属性与控件，用户只填写值，
 * 右侧实时预览效果。新增属性只需改 schema.ts。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Loader2,
  RefreshCw,
  RotateCcw,
  Save,
  SlidersHorizontal,
} from 'lucide-react';
import { pageConfigApi } from '../../../lib/pageConfig.ts';
import {
  CONFIG_FIELDS,
  draftFromItems,
  type ConfigDraft,
} from './schema';
import { PreviewPanel } from './PreviewPanel';

interface Toast {
  kind: 'success' | 'error';
  text: string;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export default function ConfigView() {
  const [draft, setDraft] = useState<ConfigDraft | null>(null);
  const [original, setOriginal] = useState<ConfigDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const items = await pageConfigApi.list();
      const next = draftFromItems(items);
      setDraft(next);
      setOriginal(next);
    } catch (err) {
      setError(errorMessage(err, '加载客户端配置失败'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /** 只保存发生变化或数据库中尚不存在的属性 */
  const pendingKeys = useMemo(() => {
    if (!draft || !original) return [];
    return CONFIG_FIELDS.filter(
      (field) =>
        draft.storedKeys[field.key] === null ||
        draft.values[field.key] !== original.values[field.key]
    ).map((field) => field.key);
  }, [draft, original]);

  const setFieldValue = useCallback((key: string, value: string) => {
    setDraft((prev) =>
      prev ? { ...prev, values: { ...prev.values, [key]: value } } : prev
    );
  }, []);

  async function handleSave() {
    if (!draft || pendingKeys.length === 0) return;
    setSaving(true);
    try {
      /* 后端每次写都是读改写整个 JSON，这里顺序执行避免互相覆盖 */
      for (const key of pendingKeys) {
        const field = CONFIG_FIELDS.find((item) => item.key === key);
        if (!field) continue;
        const storedKey = draft.storedKeys[key];
        const value = draft.values[key];
        if (storedKey) {
          await pageConfigApi.edit(storedKey, value);
        } else {
          await pageConfigApi.add(field.key, value);
        }
      }
      setToast({ kind: 'success', text: '配置已保存，客户端立即生效' });
      await load();
    } catch (err) {
      setToast({ kind: 'error', text: errorMessage(err, '保存失败') });
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (original) setDraft(original);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[22px] font-semibold tracking-tight text-[#1D1D1F]">客户端配置</h2>
       
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="h-9 px-3 rounded-xl bg-white border border-[#E5E5EA] text-[13px] text-[#1D1D1F] hover:bg-[#F5F5F7] disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={saving || pendingKeys.length === 0}
            className="h-9 px-3 rounded-xl bg-white border border-[#E5E5EA] text-[13px] text-[#1D1D1F] hover:bg-[#F5F5F7] disabled:opacity-40 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            撤销
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || pendingKeys.length === 0}
            className="h-9 px-4 rounded-xl bg-[#0071E3] text-white text-[13px] font-medium hover:bg-[#0077ED] disabled:opacity-40 flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            保存配置
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-[#FFF1F0] border border-[#FFCCC7] text-[13px] text-[#CF1322]">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
        <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#E5E5EA] bg-[#FAFAFC]">
            <SlidersHorizontal className="w-4 h-4 text-[#0071E3]" />
            <span className="text-[14px] font-medium text-[#1D1D1F]">属性设置</span>
            <span className="ml-auto text-[11px] text-[#86868B]">
              {pendingKeys.length > 0 ? `${pendingKeys.length} 项未保存` : '已保存'}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[#86868B]">
              <Loader2 className="w-4 h-4 animate-spin" />
              正在加载配置...
            </div>
          ) : !draft ? (
            <div className="py-16 text-center text-[13px] text-[#86868B]">配置加载失败</div>
          ) : (
            <div className="divide-y divide-[#F0F0F2]">
              {CONFIG_FIELDS.map((field) => (
                <div key={field.key} className="px-5 py-4">
                  <div className="mb-2">
                    <span className="text-[13px] font-medium text-[#1D1D1F]">{field.label}</span>
                    <span className="ml-2 text-[11px] font-mono text-[#C7C7CC]">{field.key}</span>
                    {field.description && (
                      <p className="mt-0.5 text-[12px] text-[#86868B]">{field.description}</p>
                    )}
                  </div>
                  <input
                    type="text"
                    value={draft.values[field.key] ?? ''}
                    onChange={(event) => setFieldValue(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    className="w-full h-10 px-3 rounded-xl border border-[#D2D2D7] bg-white text-[13px] text-[#1D1D1F] outline-none focus:border-[#0071E3]"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-20">
          <PreviewPanel values={draft?.values ?? {}} />
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-[13px] text-white ${
            toast.kind === 'success' ? 'bg-[#1D1D1F]' : 'bg-[#CF1322]'
          }`}
        >
          {toast.kind === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.text}
        </div>
      )}
    </div>
  );
}
