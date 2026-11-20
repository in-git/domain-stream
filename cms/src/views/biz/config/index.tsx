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
  Image as ImageIcon,
  Loader2,
  FolderOpen,
  RefreshCw,
  RotateCcw,
  Save,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { convertToWebp, uploadFileWithProgress } from '../../../lib/api.ts';
import { toOpenUrl, type DevFile } from '../../../lib/fileCenter.ts';
import { FilePicker } from '../../../components/FilePicker.tsx';
import { pageConfigApi } from '../../../lib/pageConfig.ts';
import {
  CONFIG_FIELDS,
  draftFromItems,
  type ConfigDraft,
  type ConfigFieldDef,
} from './schema';
import { PreviewPanel } from './PreviewPanel';

interface Toast {
  kind: 'success' | 'error';
  text: string;
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/** 配置里存的是纯后端路径，CMS 预览时补回 /snowy 代理前缀 */
function previewUrl(raw: string): string {
  if (!raw) return '';
  if (raw.startsWith('/snowy') || raw.startsWith('http')) return raw;
  return `/snowy${raw}`;
}

/** 文本框 / 图片上传（选中图片 → 前端转 WebP → 文件中心上传 → 存返回 URL） */
function FieldControl({
  field,
  value,
  onChange,
  onError,
  onPick,
}: {
  field: ConfigFieldDef;
  value: string;
  onChange: (value: string) => void;
  onError: (message: string) => void;
  onPick: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);

  async function handleUpload(selected: File | undefined) {
    if (!selected) return;
    if (!selected.type.startsWith('image/')) {
      onError('请选择图片文件');
      return;
    }
    setUploading(true);
    setPreviewFailed(false);
    try {
      const webp = await convertToWebp(selected);
      const { url } = await uploadFileWithProgress(webp);
      // 存纯后端路径（去掉 CMS 的 /snowy 代理前缀），frontend 用自己的 /api 代理访问
      onChange(url.replace(/^\/snowy/, ''));
    } catch (err) {
      onError(err instanceof Error ? err.message : '图片上传失败');
    } finally {
      setUploading(false);
    }
  }

  if (field.control === 'upload') {
    return (
      <div className="flex items-center gap-3">
        <label className="relative w-14 h-14 rounded-xl border border-dashed border-[#C7C7CC] bg-[#FAFAFC] flex items-center justify-center shrink-0 overflow-hidden cursor-pointer hover:border-[#0071E3] transition-colors">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              void handleUpload(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          {uploading ? (
            <Loader2 className="w-5 h-5 text-[#0071E3] animate-spin" />
          ) : value && !previewFailed ? (
            <img
              src={previewUrl(value)}
              alt="预览"
              className="w-full h-full object-contain"
              onError={() => setPreviewFailed(true)}
            />
          ) : (
            <ImageIcon className="w-5 h-5 text-[#C7C7CC]" />
          )}
        </label>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-[#1D1D1F] truncate" title={value || undefined}>
            {uploading ? '正在转换并上传...' : value ? '已上传（点击左侧图标可更换）' : '未设置'}
          </p>
          <p className="mt-0.5 text-[11px] text-[#86868B]">
            上传自动转 WebP，或
            <button
              type="button"
              onClick={onPick}
              className="ml-0.5 text-[#0071E3] hover:underline"
            >
              从文件库选择
            </button>
          </p>
        </div>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setPreviewFailed(false);
            }}
            className="p-1.5 rounded-lg text-[#86868B] hover:bg-[#FFF1F0] hover:text-[#CF1322]"
            title="清除"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }
  return (
    <input
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.placeholder}
      className="w-full h-10 px-3 rounded-xl border border-[#D2D2D7] bg-white text-[13px] text-[#1D1D1F] outline-none focus:border-[#0071E3]"
    />
  );
}

export default function ConfigView() {
  const [draft, setDraft] = useState<ConfigDraft | null>(null);
  const [original, setOriginal] = useState<ConfigDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);
  /** 正在通过文件选择器设置的字段（null 表示未打开） */
  const [pickerField, setPickerField] = useState<string | null>(null);

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
      // 一次提交全部属性：后端整体覆盖写入（存在则更新、不存在则新增，允许空值）
      const items = CONFIG_FIELDS.map((field) => ({
        key: field.key,
        value: draft.values[field.key] ?? '',
      }));
      await pageConfigApi.save(items);
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
                  <FieldControl
                    field={field}
                    value={draft.values[field.key] ?? ''}
                    onChange={(value) => setFieldValue(field.key, value)}
                    onError={(message) => setToast({ kind: 'error', text: message })}
                    onPick={() => setPickerField(field.key)}
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
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-lg text-[13px] text-white ${
            toast.kind === 'success' ? 'bg-[#1D1D1F]' : 'bg-[#CF1322]'
          }`}
        >
          {toast.kind === 'success' ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.text}
        </div>
      )}

      <FilePicker
        open={pickerField !== null}
        onClose={() => setPickerField(null)}
        accept="image"
        title="选择图片"
        beforeUpload={convertToWebp}
        onSelect={(files: DevFile[]) => {
          if (!pickerField || !files[0]) return;
          // 文件选择器返回带 /snowy 的地址，存纯后端路径供 frontend 使用
          setFieldValue(pickerField, toOpenUrl(files[0]).replace(/^\/snowy/, ''));
        }}
      />
    </div>
  );
}
