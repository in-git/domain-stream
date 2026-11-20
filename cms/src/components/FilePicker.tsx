/**
 * 公共文件选择器
 * ------------------------------------------------------------------
 * 读取当前用户上传的全部文件，同时覆盖两个文件库：
 *   - USER     文件中心的用户文件
 *   - MATERIAL 素材中心的素材
 *
 * 用法：
 *   <FilePicker
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     onSelect={(files) => ...}          // 返回选中的 DevFile[]
 *     multiple                            // 默认单选
 *     accept={['image', 'video']}         // 限定类型：预设 / MIME / 扩展名，不传则全部
 *     beforeUpload={convertToWebp}        // 可选：上传前转换（如转 WebP）
 *   />
 *
 * accept 支持：
 *   - 预设：'image' | 'video' | 'audio' | 'document' | 'all'
 *   - MIME：'image/png'、'video/mp4'
 *   - 扩展名：'.png'、'.mp4'、'.pdf'
 *
 * 返回的文件对象可用 fileCenter.ts 的 toOpenUrl / toStreamUrl 得到可访问地址。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  File as FileIcon,
  FileText,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Images,
  Loader2,
  Music,
  RefreshCw,
  Search,
  Upload,
  X,
} from 'lucide-react';
import {
  categoryLabel,
  fileCenterApi,
  FILE_CATEGORIES,
  isAudioFile,
  isImageFile,
  isVideoFile,
  toOpenUrl,
  uploadLibraryFile,
  type DevFile,
} from '../lib/fileCenter.ts';
import { categoryApi, type BizCategory } from '../lib/category.ts';

type Library = 'ALL' | 'USER' | 'MATERIAL';
/** 预设类型 / MIME 类型 / 扩展名（如 .png）均可作为 accept 项 */
export type FileAccept =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'all'
  | (string & {});

const PAGE_SIZE = 24;

const LIBRARY_TABS: Array<{ value: Library; label: string }> = [
  { value: 'ALL', label: '全部文件' },
  { value: 'USER', label: '用户文件' },
  { value: 'MATERIAL', label: '素材库' },
];

interface FilePickerProps {
  open: boolean;
  onClose: () => void;
  /** 选中后回调；multiple 时为全部选中项，否则为单个元素数组 */
  onSelect: (files: DevFile[]) => void;
  /** 是否多选，默认 false（单选：单击替换选中项，双击确认） */
  multiple?: boolean;
  /** 限定可选文件类型，默认全部；可传单个或数组（预设 / MIME / 扩展名） */
  accept?: FileAccept | FileAccept[];
  /** 弹窗标题 */
  title?: string;
  /** 上传前转换文件（如前端转 WebP）；不传则原样上传 */
  beforeUpload?: (file: File) => Promise<File> | File;
  /** 允许上传新文件，默认 true */
  allowUpload?: boolean;
}

function coverIcon(file: DevFile) {
  if (isVideoFile(file)) return Film;
  if (isAudioFile(file)) return Music;
  if (isImageFile(file)) return Images;
  if ((file.category || '') === 'DOC') return FileText;
  return FileIcon;
}

function tileTone(file: DevFile): string {
  if (isVideoFile(file)) return 'bg-gradient-to-br from-[#1C1C1E] via-[#2C2C2E] to-[#48484A] text-white';
  if (isAudioFile(file)) return 'bg-gradient-to-br from-[#FF375F]/14 via-[#FF9F0A]/12 to-[#FFD60A]/14 text-[#FF375F]';
  if (isImageFile(file)) return 'bg-gradient-to-br from-[#30D158]/14 via-[#0071E3]/10 to-[#5E5CE6]/14 text-[#0071E3]';
  if ((file.category || '') === 'DOC') return 'bg-gradient-to-br from-[#5E5CE6]/14 to-[#0071E3]/10 text-[#5E5CE6]';
  return 'bg-gradient-to-br from-[#F2F2F7] to-[#E5E5EA] text-[#8E8E93]';
}

/** 单个 accept 规则的匹配 */
function matchesOne(file: DevFile, rule: FileAccept): boolean {
  const preset = (rule || '').toLowerCase();
  if (preset === 'all' || preset === '*' || preset === '*/*') return true;
  if (preset === 'image') return isImageFile(file);
  if (preset === 'video') return isVideoFile(file);
  if (preset === 'audio') return isAudioFile(file);
  if (preset === 'document') return (file.category || '') === 'DOC';

  const suffix = (file.suffix || '').toLowerCase().replace('.', '');
  // 扩展名规则，如 .png / png
  if (preset.startsWith('.')) return suffix === preset.slice(1);
  // MIME 规则，如 image/png；同时用后缀兜底（如 image/jpeg 匹配 jpg/jpeg）
  if (preset.includes('/')) {
    const subtype = preset.split('/')[1];
    if (subtype === '*') {
      if (preset.startsWith('image/')) return isImageFile(file);
      if (preset.startsWith('video/')) return isVideoFile(file);
      if (preset.startsWith('audio/')) return isAudioFile(file);
      return true;
    }
    if (subtype === 'jpeg') return suffix === 'jpg' || suffix === 'jpeg';
    return suffix === subtype;
  }
  // 直接写后缀，如 png / mp4
  return suffix === preset;
}

/** 多条 accept 规则取并集；空数组视为全部 */
function matchesAccept(file: DevFile, accept: FileAccept | FileAccept[] | undefined): boolean {
  if (!accept) return true;
  const rules = Array.isArray(accept) ? accept : [accept];
  if (rules.length === 0) return true;
  return rules.some((rule) => matchesOne(file, rule));
}

/** 把 accept 转成 <input type=file> 的 accept 属性值（预设映射为 MIME 前缀） */
function acceptForInput(accept: FileAccept | FileAccept[] | undefined): string | undefined {
  if (!accept) return undefined;
  const rules = Array.isArray(accept) ? accept : [accept];
  if (rules.length === 0) return undefined;
  return rules
    .map((rule) =>
      ['image', 'video', 'audio'].includes(rule.toLowerCase())
        ? `${rule.toLowerCase()}/*`
        : rule === 'document'
          ? '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt'
          : rule
    )
    .join(',');
}

/** 单张文件卡片 */
function PickerCard({
  file,
  selected,
  onToggle,
  onConfirm,
}: {
  file: DevFile;
  selected: boolean;
  onToggle: () => void;
  onConfirm: () => void;
}) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const Icon = coverIcon(file);
  const cover = file.thumbnail || (isImageFile(file) ? toOpenUrl(file) : '');
  const showCover = !!cover && !thumbFailed;

  return (
    <div
      role="button"
      tabIndex={0}
      title={`${file.name || file.objName || file.id}${file.sizeInfo ? ` · ${file.sizeInfo}` : ''}`}
      onClick={onToggle}
      onDoubleClick={onConfirm}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onToggle();
        }
      }}
      className={`group relative p-1.5 rounded-[14px] cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]/40 ${
        selected ? 'bg-[#0071E3]/8' : 'hover:bg-[#F5F5F7]'
      }`}
    >
      <div
        className={`relative aspect-[4/3] rounded-[11px] overflow-hidden ${
          showCover ? 'bg-[#F2F2F7]' : tileTone(file)
        } ${selected ? 'ring-2 ring-[#0071E3]' : 'ring-1 ring-black/5'}`}
      >
        {showCover ? (
          <img
            src={cover}
            alt={file.name || '文件'}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setThumbFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 select-none">
            <Icon className="w-8 h-8 opacity-80" strokeWidth={1.4} />
            <span className="text-[9px] font-medium uppercase tracking-wide opacity-70">
              {categoryLabel(file.category)}
            </span>
          </div>
        )}

        {selected && (
          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#0071E3] text-white flex items-center justify-center shadow-sm">
            <Check className="w-3 h-3" strokeWidth={3} />
          </span>
        )}
        <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/55 text-white text-[9px] leading-none">
          {file.bizType === 'MATERIAL' ? '素材' : '文件'}
        </span>
      </div>

      <p className="mt-1.5 px-0.5 text-[11px] text-[#1D1D1F] truncate" title={file.name || file.objName}>
        {file.name || file.objName || file.id}
      </p>
    </div>
  );
}

export function FilePicker({
  open,
  onClose,
  onSelect,
  multiple = false,
  accept = 'all',
  title = '选择文件',
  beforeUpload,
  allowUpload = true,
}: FilePickerProps) {
  const [library, setLibrary] = useState<Library>('ALL');
  const [category, setCategory] = useState('');
  /** 素材分类（通用分类 MATERIAL 模块编码），仅在素材库有分类时展示 */
  const [categoryCode, setCategoryCode] = useState('');
  const [materialCategories, setMaterialCategories] = useState<BizCategory[]>([]);
  const [search, setSearch] = useState('');
  const [files, setFiles] = useState<DevFile[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        category: category || undefined,
        searchKey: search.trim() || undefined,
      };
      const libraries: Array<'USER' | 'MATERIAL'> =
        library === 'ALL' ? ['USER', 'MATERIAL'] : [library];
      // 逐页拉取，避免一次性请求大分页
      const fetchLibrary = async (bizType: 'USER' | 'MATERIAL') => {
        const rows: DevFile[] = [];
        // 素材分类只对素材库生效，用户文件没有该维度的分类
        const categoryCodeParam =
          bizType === 'MATERIAL' && categoryCode ? categoryCode : undefined;
        for (let current = 1; ; current++) {
          const page = await fileCenterApi.page({
            ...params,
            categoryCode: categoryCodeParam,
            bizType,
            current,
            size: 20,
          });
          const records = page?.records || [];
          rows.push(...records);
          if (records.length < 20 || rows.length >= (page?.total ?? rows.length)) break;
          if (current >= 500) break;
        }
        return rows;
      };
      const results = await Promise.all(libraries.map(fetchLibrary));
      let all: DevFile[] = results.flat();
      all = all.filter((file) => matchesAccept(file, accept));
      all.sort((a, b) => (b.createTime || '').localeCompare(a.createTime || ''));
      setFiles(all);
      setPage(1);
    } catch (err) {
      setFiles([]);
      setError(err instanceof Error ? err.message : '文件加载失败');
    } finally {
      setLoading(false);
    }
  }, [library, category, categoryCode, search, accept, reloadToken]);

  /** 加载素材模块的通用分类（逐页拉全量），无分类时筛选行不展示 */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const all: BizCategory[] = [];
        for (let current = 1; ; current++) {
          const result = await categoryApi.page({ current, size: 20 });
          const records = result?.records || [];
          all.push(...records);
          if (records.length < 20 || all.length >= (result?.total ?? all.length)) break;
          if (current >= 500) break;
        }
        if (cancelled) return;
        setMaterialCategories(
          all
            .filter((item) => item.module === 'MATERIAL' && (item.status || 'ENABLE') === 'ENABLE')
            .sort((a, b) => (a.sortCode ?? 0) - (b.sortCode ?? 0))
        );
      } catch {
        if (!cancelled) setMaterialCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    void load();
    return undefined;
  }, [open, load]);

  useEffect(() => {
    if (!open) {
      setSelected([]);
      setSearch('');
      setCategory('');
      setCategoryCode('');
      setLibrary('ALL');
    }
  }, [open]);

  const totalPages = Math.max(1, Math.ceil(files.length / PAGE_SIZE));
  const visibleFiles = useMemo(
    () => files.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [files, page]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      if (!multiple) return prev.includes(id) ? [] : [id];
      return prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
    });
  }

  function confirmSelection() {
    const chosen = files.filter((file) => selected.includes(file.id));
    if (!chosen.length) return;
    onSelect(chosen);
    onClose();
  }

  async function handleUpload(picked: File | undefined) {
    if (!picked) return;
    setUploading(true);
    setError('');
    try {
      const target = beforeUpload ? await beforeUpload(picked) : picked;
      const bizType: 'USER' | 'MATERIAL' = library === 'MATERIAL' ? 'MATERIAL' : 'USER';
      const { url } = await uploadLibraryFile(target, bizType);
      setReloadToken((value) => value + 1);
      // 上传完成后尝试按地址选中新文件
      const fresh = await fileCenterApi.page({ size: 1, bizType, searchKey: picked.name });
      const uploaded = fresh.records?.find((file) => toOpenUrl(file) === url);
      if (uploaded) setSelected((prev) => (multiple ? [...prev, uploaded.id] : [uploaded.id]));
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4 py-6">
      <div className="w-full max-w-4xl min-h-[60vh] max-h-[86vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-[#E5E5EA] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5EA]">
          <div>
            <h3 className="text-[16px] font-semibold text-[#1D1D1F] flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[#0071E3]" />
              {title}
            </h3>
            <p className="mt-0.5 text-[11px] text-[#86868B]">
              包含文件中心的用户文件与素材中心的素材 · 单击选择，双击确认
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#86868B] hover:bg-[#F5F5F7]"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 工具栏 */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-[#E5E5EA] bg-[#FAFAFC]">
          <div className="flex items-center p-0.5 rounded-lg bg-[#EDEDF1]">
            {LIBRARY_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setLibrary(tab.value);
                  // 素材分类只在素材库维度有效，切到其他库时清空避免结果为空
                  if (tab.value !== 'MATERIAL') setCategoryCode('');
                }}
                className={`px-2.5 py-1 rounded-md text-[12px] transition-colors ${
                  library === tab.value
                    ? 'bg-white text-[#1D1D1F] shadow-sm'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#86868B]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="搜索文件名"
              className="h-8 w-40 pl-7 pr-2 rounded-lg border border-[#D2D2D7] bg-white text-[12px] outline-none focus:border-[#0071E3]"
            />
          </div>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="h-8 px-2 rounded-lg border border-[#D2D2D7] bg-white text-[#6E6E73] hover:text-[#1D1D1F] disabled:opacity-50"
            title="刷新"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {allowUpload && (
            <label className="ml-auto h-8 px-3 rounded-lg bg-[#0071E3] text-white text-[12px] font-medium flex items-center gap-1.5 cursor-pointer hover:bg-[#0077ED]">
              <input
                type="file"
                className="hidden"
                disabled={uploading}
                multiple={multiple}
                accept={acceptForInput(accept)}
                onChange={(event) => {
                  void handleUpload(event.target.files?.[0]);
                  event.target.value = '';
                }}
              />
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              {uploading ? '上传中' : '上传新文件'}
            </label>
          )}
        </div>

        {/* 文件类型单选组 */}
        <div
          role="radiogroup"
          aria-label="按文件类型筛选"
          className="flex flex-wrap items-center gap-1.5 px-5 py-2.5 border-b border-[#E5E5EA] bg-white"
        >
          <span className="mr-1 text-[12px] text-[#86868B]">文件类型</span>
          {[{ value: '', label: '全部' }, ...FILE_CATEGORIES].map((item) => {
            const active = category === item.value;
            return (
              <button
                key={item.value || 'all'}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setCategory(item.value)}
                className={`h-7 px-2.5 rounded-lg text-[12px] transition-colors ${
                  active
                    ? 'bg-[#0071E3]/10 text-[#0071E3] font-medium'
                    : 'text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* 素材分类单选组：仅在选择素材库且存在素材分类时出现 */}
        {library === 'MATERIAL' && materialCategories.length > 0 && (
          <div
            role="radiogroup"
            aria-label="按素材分类筛选"
            className="flex flex-wrap items-center gap-1.5 px-5 py-2.5 border-b border-[#E5E5EA] bg-white"
          >
            <span className="mr-1 text-[12px] text-[#86868B]">素材分类</span>
            {[{ id: '__all__', code: '', name: '全部' }, ...materialCategories].map((item) => {
              const value = item.code || '';
              const active = categoryCode === value;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setCategoryCode(value)}
                  className={`h-7 px-2.5 rounded-lg text-[12px] transition-colors ${
                    active
                      ? 'bg-[#0071E3]/10 text-[#0071E3] font-medium'
                      : 'text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
                  }`}
                >
                  {item.name || '未命名分类'}
                </button>
              );
            })}
          </div>
        )}

        {error && (
          <div className="mx-5 mt-3 px-3 py-2 rounded-lg bg-[#FFF1F0] text-[12px] text-[#CF1322]">
            {error}
          </div>
        )}

        {/* 文件网格 */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-[#86868B]">
              <Loader2 className="w-4 h-4 animate-spin" />
              正在加载文件...
            </div>
          ) : visibleFiles.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-20 text-[13px] text-[#86868B]">
              <ImageIcon className="w-8 h-8 text-[#C7C7CC]" />
              没有符合条件的文件
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-1.5">
              {visibleFiles.map((file) => (
                <PickerCard
                  key={file.id}
                  file={file}
                  selected={selected.includes(file.id)}
                  onToggle={() => toggle(file.id)}
                  onConfirm={() => {
                    onSelect([file]);
                    onClose();
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#E5E5EA] bg-[#FAFAFC]">
          <div className="flex items-center gap-3 text-[12px] text-[#6E6E73]">
            <span>共 {files.length} 个文件</span>
            <span className="text-[#0071E3]">已选 {selected.length}</span>
            {totalPages > 1 && (
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={page <= 1}
                  className="p-1 rounded-md border border-[#D2D2D7] disabled:opacity-40"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {page}/{totalPages}
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={page >= totalPages}
                  className="p-1 rounded-md border border-[#D2D2D7] disabled:opacity-40"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl border border-[#D2D2D7] text-[13px] text-[#1D1D1F] hover:bg-white"
            >
              取消
            </button>
            <button
              type="button"
              onClick={confirmSelection}
              disabled={!selected.length}
              className="h-9 px-4 rounded-xl bg-[#0071E3] text-white text-[13px] font-medium hover:bg-[#0077ED] disabled:opacity-40"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FilePicker;
