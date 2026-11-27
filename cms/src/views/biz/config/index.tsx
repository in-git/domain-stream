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
  AtSign,
  ChevronDown,
  Film,
  Image as ImageIcon,
  ListOrdered,
  Loader2,
  Music,
  Palette,
  RefreshCw,
  RotateCcw,
  Save,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { convertToWebp, uploadFileWithProgress } from '../../../lib/api.ts';
import { toOpenUrl, type DevFile } from '../../../lib/fileCenter.ts';
import { FilePicker } from '../../../components/FilePicker.tsx';
import { SwitchField } from '../../../components/SwitchField.tsx';
import { showToast } from '../../../components/AppToast.tsx';
import { pageConfigApi } from '../../../lib/pageConfig.ts';
import {
  CONFIG_FIELDS,
  configSwitchOn,
  draftFromItems,
  SPLASH_AUDIO_KEY,
  SPLASH_CANVAS_KEY,
  SPLASH_DURATION_KEY,
  SPLASH_LAYOUT_KEYS,
  SPLASH_MEDIA_KEYS,
  SPLASH_STYLE_KEYS,
  type ConfigDraft,
  type ConfigFieldDef,
} from './schema';
import { PreviewPanel } from './PreviewPanel';
import { NavItemsEditor } from './NavItemsEditor';
import { ContactLinksEditor } from './ContactLinksEditor';
import { SplashMaterialDialog } from './SplashMaterialDialog';
import { countCanvasNodes, parseSplashCanvas } from './splash-canvas/types';


function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/** 主题配置字段，单独放在「主题配置」Tab 中维护 */
const THEME_FIELD_KEYS = ['themeColor', 'themeRadius'];

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

  if (field.control === 'switch') {
    return (
      <SwitchField
        checked={configSwitchOn(value)}
        onChange={(checked) => onChange(checked ? 'YES' : 'NO')}
        onLabel="允许"
        offLabel="禁止"
        ariaLabel={field.label}
        className="ml-auto"
      />
    );
  }

  if (field.control === 'color') {
    const colorValue = /^#[0-9a-fA-F]{6}$/.test(value) ? value : field.defaultValue;
    return (
      <div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={colorValue}
            onChange={(event) => onChange(event.target.value)}
            aria-label={field.label}
            className="h-10 w-12 shrink-0 rounded-xl border border-[#D2D2D7] bg-white p-1 cursor-pointer"
          />
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={field.defaultValue}
            className="min-w-0 flex-1 h-10 px-3 rounded-xl border border-[#D2D2D7] bg-white text-[13px] text-[#1D1D1F] font-mono outline-none focus:border-[#0071E3]"
          />
        </div>
        {field.presets && field.presets.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {field.presets.map((preset) => {
              const active = value.toLowerCase() === preset.value.toLowerCase();
              return (
                <button
                  key={preset.value}
                  type="button"
                  title={`${preset.label} ${preset.value}`}
                  aria-label={`使用${preset.label}主题色 ${preset.value}`}
                  onClick={() => onChange(preset.value)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] transition-colors ${
                    active
                      ? 'border-[#1D1D1F] bg-[#1D1D1F] text-white'
                      : 'border-[#D2D2D7] bg-white text-[#6E6E73] hover:border-[#8E8E93]'
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-full border border-black/10"
                    style={{ backgroundColor: preset.value }}
                  />
                  {preset.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (field.control === 'number') {
    return (
      <input
        type="number"
        min={0}
        max={64}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder || field.defaultValue}
        className="w-full h-10 px-3 rounded-xl border border-[#D2D2D7] bg-white text-[13px] text-[#1D1D1F] outline-none focus:border-[#0071E3]"
      />
    );
  }

  if (field.control === 'media') {
    const mediaKind = field.mediaAccept ?? 'image';
    const mediaLabel =
      mediaKind === 'video' ? '视频' : mediaKind === 'audio' ? '音频' : '图片';
    const MediaIcon = mediaKind === 'video' ? Film : mediaKind === 'audio' ? Music : ImageIcon;
    const showImagePreview = mediaKind === 'image' && value && !previewFailed;

    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPick}
          title={`选择开屏${mediaLabel}`}
          className="relative w-14 h-14 rounded-xl border border-dashed border-[#C7C7CC] bg-[#FAFAFC] flex items-center justify-center shrink-0 overflow-hidden hover:border-[#0071E3] transition-colors"
        >
          {showImagePreview ? (
            <img
              src={previewUrl(value)}
              alt="开屏图片预览"
              className="w-full h-full object-contain"
              onError={() => setPreviewFailed(true)}
            />
          ) : (
            <MediaIcon className="w-5 h-5 text-[#C7C7CC]" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] text-[#1D1D1F] truncate" title={value || undefined}>
            {value ? `已选择开屏${mediaLabel}` : `未选择开屏${mediaLabel}`}
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
            <button
              type="button"
              onClick={onPick}
              className="text-[#0071E3] hover:underline"
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

  /** 正在通过文件选择器设置的字段（null 表示未打开） */
  const [pickerField, setPickerField] = useState<string | null>(null);
  /** 当前编辑分组：页面配置 / 主题配置 / 客户端导航 / 联系方式 */
  const [tab, setTab] = useState<'basic' | 'theme' | 'nav' | 'contact'>('basic');
  /** 底部折叠区：地址与备案信息默认收起，展开才可见 */
  const [advancedOpen, setAdvancedOpen] = useState(false);
  /** 开屏素材在独立弹窗中设置 */
  const [splashDialogOpen, setSplashDialogOpen] = useState(false);

  /** 主题配置字段：单独 Tab 维护 */
  const themeFields = useMemo(
    () => CONFIG_FIELDS.filter((field) => THEME_FIELD_KEYS.includes(field.key)),
    []
  );
  /** 基础属性字段：排除主题和导航，分别用独立 Tab 维护 */
  const basicFields = useMemo(
    () =>
      CONFIG_FIELDS.filter(
        (field) =>
          field.control !== 'navList' &&
          field.control !== 'contactList' &&
          !THEME_FIELD_KEYS.includes(field.key)
      ),
    []
  );
  /** Logo 与图标同排展示 */
  const brandFields = useMemo(
    () => basicFields.filter((field) => field.key === 'logoUrl' || field.key === 'faviconUrl'),
    [basicFields]
  );
  /** 折叠区：地址 + 备案 */
  const advancedFields = useMemo(
    () =>
      basicFields.filter((field) =>
        ['clientUrl', 'cmsUrl', 'adminUrl', 'icpNo', 'policeNo'].includes(field.key)
      ),
    [basicFields]
  );
  /** 其余基础字段（如网页标题）正常展示 */
  const primaryFields = useMemo(
    () =>
      basicFields.filter(
        (field) =>
          !brandFields.some((f) => f.key === field.key) &&
          !advancedFields.some((f) => f.key === field.key) &&
          field.key !== SPLASH_DURATION_KEY &&
          field.key !== SPLASH_CANVAS_KEY &&
          !SPLASH_MEDIA_KEYS.includes(field.key) &&
          !SPLASH_LAYOUT_KEYS.includes(field.key) &&
          !SPLASH_STYLE_KEYS.includes(field.key)
      ),
    [basicFields, brandFields, advancedFields]
  );
  /** 开屏摘要：按画布背景素材类型显示视频或画布组件数 */
  const splashSummary = useMemo(() => {
    const values = draft?.values ?? {};
    const seconds = (values[SPLASH_DURATION_KEY] || '').trim();
    const durationLabel = seconds ? ` · ${seconds} 秒` : '';

    const nodeCount = countCanvasNodes(values[SPLASH_CANVAS_KEY]);
    const canvasLabel = nodeCount ? `封面画布 · ${nodeCount} 个组件` : '封面画布 · 未设置';
    const doc = parseSplashCanvas(values[SPLASH_CANVAS_KEY]);
    const hasBackgroundVideo = Boolean(
      doc && (doc.pc.backgroundVideo || doc.mobile.backgroundVideo)
    );
    const backgroundLabel = hasBackgroundVideo ? '背景视频 · ' : '';
    const audio = (values[SPLASH_AUDIO_KEY] || '').trim() ? ' · 含音频' : '';
    return `${backgroundLabel}${canvasLabel}${audio}${durationLabel}`;
  }, [draft]);
  /** 当前文件选择器对应的字段与媒体类型 */
  const pickerFieldDef = useMemo(
    () => CONFIG_FIELDS.find((field) => field.key === pickerField) ?? null,
    [pickerField]
  );
  const pickerAccept = pickerFieldDef?.mediaAccept ?? 'image';
  const pickerTitle =
    pickerAccept === 'video'
      ? '选择开屏视频'
      : pickerAccept === 'audio'
        ? '选择开屏音频'
        : '选择图片';
  const pickerBeforeUpload = pickerAccept === 'image' ? convertToWebp : undefined;

  /** 参与当前 Tab 的字段，用于判断是否有未保存改动 */
  const tabFields =
    tab === 'nav'
      ? CONFIG_FIELDS.filter((field) => field.control === 'navList')
      : tab === 'contact'
        ? CONFIG_FIELDS.filter((field) => field.control === 'contactList')
        : tab === 'theme'
          ? themeFields
          : basicFields;

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

  /** 当前 Tab 下发生变化或数据库中尚不存在的属性 */
  const pendingKeys = useMemo(() => {
    if (!draft || !original) return [];
    return tabFields
      .filter(
        (field) =>
          draft.storedKeys[field.key] === null ||
          draft.values[field.key] !== original.values[field.key]
      )
      .map((field) => field.key);
  }, [draft, original, tabFields]);

  /** 全部配置是否有改动（保存时整体覆盖，需按全量判断） */
  const hasAnyChange = useMemo(() => {
    if (!draft || !original) return false;
    return CONFIG_FIELDS.some(
      (field) =>
        draft.storedKeys[field.key] === null ||
        draft.values[field.key] !== original.values[field.key]
    );
  }, [draft, original]);

  const setFieldValue = useCallback((key: string, value: string) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const values = { ...prev.values, [key]: value };
      return { ...prev, values };
    });
  }, []);

  async function handleSave() {
    if (!draft || !hasAnyChange) return;
    setSaving(true);
    try {
      // 一次提交全部属性：后端整体覆盖写入（存在则更新、不存在则新增，允许空值）
      const items = CONFIG_FIELDS.map((field) => ({
        key: field.key,
        value: draft.values[field.key] ?? '',
      }));
      await pageConfigApi.save(items);
      showToast('配置已保存，客户端立即生效', 'success');
      await load();
    } catch (err) {
      showToast(errorMessage(err, '保存失败'), 'danger');
    } finally {
      setSaving(false);
    }
  }

  /** 结构性变更（如删除模块）后立即写回服务器，失败时回滚本地草稿 */
  const syncFieldValue = useCallback(
    async (key: string, value: string) => {
      if (!draft || !original) return;
      const next: ConfigDraft = {
        ...draft,
        values: { ...draft.values, [key]: value },
        storedKeys: { ...draft.storedKeys, [key]: draft.storedKeys[key] ?? key },
      };

      setDraft(next);
      setSaving(true);
      try {
        const items = CONFIG_FIELDS.map((field) => ({
          key: field.key,
          value: next.values[field.key] ?? '',
        }));
        await pageConfigApi.save(items);
        setOriginal(next);
        showToast('模块已删除并同步到服务器', 'success');
      } catch (err) {
        setDraft(original);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [draft, original]
  );

  function handleReset() {
    if (original) setDraft(original);
  }

  /** 渲染单个配置字段（标题、控件、说明） */
  function renderField(field: ConfigFieldDef) {
    const isSwitch = field.control === 'switch';
    return (
      <div key={field.key} className="min-w-0">
        <div className={isSwitch ? 'mb-2 flex items-center justify-between gap-3' : 'mb-2'}>
          <div className="min-w-0">
            <span className="text-[13px] font-medium text-[#1D1D1F]">{field.label}</span>
            <span className="ml-2 text-[11px] font-mono text-[#C7C7CC]">{field.key}</span>
          </div>
          {isSwitch && <FieldControl
            field={field}
            value={draft?.values[field.key] ?? ''}
            onChange={(value) => setFieldValue(field.key, value)}
            onError={(message) => showToast(message, 'danger')}
            onPick={() => setPickerField(field.key)}
          />}
        </div>
        {!isSwitch && (
          <FieldControl
            field={field}
            value={draft?.values[field.key] ?? ''}
            onChange={(value) => setFieldValue(field.key, value)}
            onError={(message) => showToast(message, 'danger')}
            onPick={() => setPickerField(field.key)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col gap-5 h-full">
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
            disabled={saving || !hasAnyChange}
            className="h-9 px-3 rounded-xl bg-white border border-[#E5E5EA] text-[13px] text-[#1D1D1F] hover:bg-[#F5F5F7] disabled:opacity-40 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            撤销
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !hasAnyChange}
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

      {/* 左侧表单可纵向滚动，右侧预览占满剩余高度，整体铺满容器；
          lg 以上预览固定占 2/3，表单占 1/3，窄屏仍上下堆叠。
          auto-rows-fr：栅格行均分容器高度，避免卡片被内容高度「撑不满」而底部露背景 */}
      <div className="flex-1 h-full lg:min-h-0 grid grid-cols-1 auto-rows-fr lg:auto-rows-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-5 items-stretch">
        <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden flex flex-col min-h-0">
          {/* Tab 切换：页面配置 / 侧边栏导航 */}
          <div className="shrink-0 flex items-center gap-1 px-4 pt-3 border-b border-[#E5E5EA] bg-[#FAFAFC]">
            {[
              { key: 'basic' as const, label: '页面配置', icon: SlidersHorizontal },
              { key: 'theme' as const, label: '主题配置', icon: Palette },
              { key: 'nav' as const, label: '导航配置', icon: ListOrdered },
              { key: 'contact' as const, label: '联系方式', icon: AtSign },
            ].map((item) => {
              const active = tab === item.key;
              const Icon = item.icon;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`h-9 px-3.5 rounded-t-xl text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors ${
                    active
                      ? 'bg-white text-[#1D1D1F] border border-[#E5E5EA] border-b-white -mb-px'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-[#0071E3]' : ''}`} />
                  {item.label}
                </button>
              );
            })}
            <span className="ml-auto pb-2 text-[11px] text-[#86868B]">
              {pendingKeys.length > 0 ? `${pendingKeys.length} 项未保存` : '已保存'}
            </span>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center gap-2 py-16 text-[13px] text-[#86868B]">
              <Loader2 className="w-4 h-4 animate-spin" />
              正在加载配置...
            </div>
          ) : !draft ? (
            <div className="flex-1 py-16 text-center text-[13px] text-[#86868B]">配置加载失败</div>
          ) : tab === 'theme' ? (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="divide-y divide-[#F0F0F2]">
                {themeFields.map((field) => (
                  <div key={field.key} className="px-5 py-4">
                    {renderField(field)}
                  </div>
                ))}
              </div>
           
            </div>
          ) : tab === 'contact' ? (
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
              {CONFIG_FIELDS.filter((field) => field.control === 'contactList').map((field) => (
                <div key={field.key}>
                  <div className="mb-3">
                    <span className="text-[13px] font-medium text-[#1D1D1F]">{field.label}</span>
                  </div>
                  <ContactLinksEditor
                    value={draft.values[field.key] ?? ''}
                    onChange={(value) => setFieldValue(field.key, value)}
                  />
                </div>
              ))}
            </div>
          ) : tab === 'nav' ? (
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
              {CONFIG_FIELDS.filter((field) => field.control === 'navList').map((field) => (
                <div key={field.key}>
                  <div className="mb-3">
                    <span className="text-[13px] font-medium text-[#1D1D1F]">{field.label}</span>
                  </div>
                  <NavItemsEditor
                    value={draft.values[field.key] ?? ''}
                    onChange={(value) => setFieldValue(field.key, value)}
                    onSync={(value) => syncFieldValue(field.key, value)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto">
              {/* 常规字段：网页标题等 */}
              <div className="divide-y divide-[#F0F0F2]">
                {primaryFields.map((field) => (
                  <div key={field.key} className="px-5 py-4">
                    {renderField(field)}
                  </div>
                ))}
              </div>

              {/* 网页 Logo 与 favicon 同一排 */}
              {brandFields.length > 0 && (
                <div className="px-5 py-4 border-t border-[#F0F0F2]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {brandFields.map((field) => (
                      <div key={field.key} className="min-w-0 rounded-xl bg-[#FAFAFC] border border-[#E5E5EA] p-3">
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 开屏设置：视频 + 双画布在弹窗中编辑，这里只展示摘要 */}
              <div className="border-t border-[#F0F0F2] px-5 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[#1D1D1F]">开屏设置</p>
                  <p className="mt-0.5 text-[11px] text-[#86868B] truncate">{splashSummary}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSplashDialogOpen(true)}
                  className="shrink-0 h-9 px-3.5 rounded-xl border border-[#D2D2D7] bg-white text-[13px] text-[#1D1D1F] hover:border-[#0071E3] hover:text-[#0071E3] transition-colors"
                >
                  设置开屏
                </button>
              </div>

              {/* 地址与备案信息：底部折叠，展开才看到 */}
              {advancedFields.length > 0 && (
                <div className="border-t border-[#F0F0F2]">
                  <button
                    type="button"
                    onClick={() => setAdvancedOpen((open) => !open)}
                    aria-expanded={advancedOpen}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[#FAFAFC] transition-colors"
                  >
                    <span className="text-[13px] font-medium text-[#1D1D1F]">地址与备案信息</span>
                    <ChevronDown
                      className={`w-4 h-4 text-[#86868B] transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                  {advancedOpen && (
                    <div className="divide-y divide-[#F0F0F2] border-t border-[#F0F0F2]">
                      {advancedFields.map((field) => (
                        <div key={field.key} className="px-5 py-4">
                          {renderField(field)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 属性修改预览：栅格项在 items-stretch 下自动等高，flex-1 撑满内部剩余高度 */}
        <PreviewPanel values={draft?.values ?? {}} className="min-h-0" />
      </div>

      <FilePicker
        open={pickerField !== null}
        onClose={() => setPickerField(null)}
        accept={pickerAccept}
        title={pickerTitle}
        beforeUpload={pickerBeforeUpload}
        onSelect={(files: DevFile[]) => {
          if (!pickerField || !files[0]) return;
          // 文件选择器返回带 /snowy 的地址，存纯后端路径供 frontend 使用
          setFieldValue(pickerField, toOpenUrl(files[0]).replace(/^\/snowy/, ''));
        }}
      />

      <SplashMaterialDialog
        open={splashDialogOpen}
        values={draft?.values ?? {}}
        onChange={setFieldValue}
        onClose={() => setSplashDialogOpen(false)}
      />
    </div>
  );
}
