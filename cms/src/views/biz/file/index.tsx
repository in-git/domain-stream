/**
 * 文件中心（素材库）管理页
 * ------------------------------------------------------------------
 * 对应后端菜单：path = /biz/file，component = biz/file/index
 * 接口：vip.xiaonuo.dev.modular.file（DevFileController）
 *
 * 素材按后端 CATEGORY 分类（IMAGE/VIDEO/AUDIO/DOC/OTHER），分页查询走
 * /dev/file/page（支持 category/bizType/searchKey），支持视频/音频在线预览播放。
 *
 * BIZ_TYPE 把「素材库」（MATERIAL，可复用）与「用户文件」（USER，业务表单一次性使用）
 * 完全隔离；素材库已独立为素材中心页面，本页只管理用户文件。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Film,
  File as FileIcon,
  ImagePlus,
  Images,
  Loader2,
  Music,
  Play,
  RefreshCw,
  Search,
  Trash2,
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
} from '../../../lib/fileCenter.ts';
import {
  FileDeleteDialog,
  FileDetailDialog,
  FileInvalidDialog,
  FilePreviewDialog,
} from './dialogs.tsx';
import { showToast } from '../../../components/AppToast.tsx';

const PAGE_SIZE = 24;

/** 文件库类型：素材库已独立为单独页面，此处固定为用户文件 */
type LibraryType = 'MATERIAL' | 'USER';

type DialogState =
  | { kind: 'preview'; file: DevFile }
  | { kind: 'detail'; file: DevFile }
  | { kind: 'delete'; files: DevFile[] }
  | { kind: 'invalid'; files: DevFile[] }
  | null;


function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '操作失败，请稍后重试';
}

/** 素材卡片占位图标 */
function coverIcon(file: DevFile) {
  if (isVideoFile(file)) return Film;
  if (isAudioFile(file)) return Music;
  if (isImageFile(file)) return Images;
  if ((file.category || '') === 'DOC') return FileText;
  return FileIcon;
}

/** 占位封面底色：按素材类型区分，接近「文件」App 的彩色图标 */
interface FileCardProps {
  file: DevFile;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (file: DevFile) => void;
  onDetail: (file: DevFile) => void;
  onDelete: (file: DevFile) => void;
}

/** 苹果文件 App 风格素材卡片：大封面 + 名称/大小，悬浮操作，双击打开 */
function FileCard({ file, selected, onToggleSelect, onOpen, onDetail, onDelete }: FileCardProps) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const Icon = coverIcon(file);
  const isMedia = isVideoFile(file) || isAudioFile(file) || isImageFile(file);
  const isVideo = isVideoFile(file);
  const cover = file.thumbnail || (isImageFile(file) ? toOpenUrl(file) : '');
  const showCover = !!cover && !thumbFailed;

  return (
    <div
      title={isMedia ? '双击预览' : '双击查看详情'}
      tabIndex={0}
      onClick={() => onToggleSelect(file.id)}
      onDoubleClick={() => onOpen(file)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(file);
        }
      }}
      className={`group relative p-1.5 rounded-[14px] cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]/40 ${
        selected ? 'bg-[#0071E3]/8' : 'hover:bg-[#F5F5F7]'
      }`}
    >
      {/* 封面 */}
      <div
        className={`relative aspect-[4/3] rounded-[11px] overflow-hidden bg-gradient-to-br from-[#FDFDFE] via-[#F5F5F7] to-[#E9E9ED] text-[#6E6E73] ${
          selected ? 'ring-2 ring-[#0071E3]' : 'ring-1 ring-black/5'
        } transition-shadow group-hover:shadow-[0_10px_26px_rgba(0,0,0,0.10)]`}
      >
        {showCover ? (
          <img
            src={cover}
            alt={file.name || '素材'}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setThumbFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 select-none">
            {isVideo ? (
              <Film className="absolute w-20 h-20 opacity-[0.08]" strokeWidth={1} />
            ) : (
              <>
                <Icon className="w-8 h-8 opacity-80" strokeWidth={1.4} />
                <span className="text-[9px] font-medium uppercase tracking-wide opacity-70">
                  {(file.suffix || '').replace('.', '') || categoryLabel(file.category)}
                </span>
              </>
            )}
          </div>
        )}

        {isVideo && (
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="w-10 h-10 rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-sm text-white flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.28)] transition-transform group-hover:scale-105">
              <Play className="w-4.5 h-4.5 fill-current translate-x-[1px]" />
            </span>
          </span>
        )}

        {/* 选择圈 */}
        <button
          type="button"
          aria-label={`${selected ? '取消选择' : '选择'} ${file.name || file.id}`}
          aria-pressed={selected}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(file.id);
          }}
          className={`absolute top-1.5 left-1.5 w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${
            selected
              ? 'bg-[#0071E3] border-[#0071E3] text-white'
              : 'bg-white/85 border-black/10 text-transparent opacity-0 group-hover:opacity-100'
          }`}
        >
          <Check className="w-2.5 h-2.5" strokeWidth={3} />
        </button>

        {/* 悬浮操作条 */}
        <div
          className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 p-0.5 rounded-lg bg-white/90 backdrop-blur-md shadow-sm opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          {isMedia && (
            <button
              type="button"
              onClick={() => onOpen(file)}
              aria-label={`预览 ${file.name}`}
              title={isVideo || isAudioFile(file) ? '播放' : '预览'}
              className="p-1 rounded-md text-[#3A3A3C] hover:text-[#0071E3] hover:bg-[#F2F2F7] transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onDetail(file)}
            aria-label={`详情 ${file.name}`}
            title="详情"
            className="p-1 rounded-md text-[#3A3A3C] hover:text-[#0071E3] hover:bg-[#F2F2F7] transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
          {file.downloadPath && (
            <a
              href={toOpenUrl(file)}
              target="_blank"
              rel="noreferrer"
              aria-label={`下载 ${file.name}`}
              title="下载"
              className="p-1 rounded-md text-[#3A3A3C] hover:text-[#0071E3] hover:bg-[#F2F2F7] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={() => onDelete(file)}
            aria-label={`删除 ${file.name}`}
            title="删除"
            className="p-1 rounded-md text-[#3A3A3C] hover:text-[#D70015] hover:bg-[#FF3B30]/8 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 名称与元信息 */}
      <div className="mt-1.5 px-0.5 min-w-0">
        <div className="text-[12px] font-medium text-[#1D1D1F] truncate" title={file.name}>
          {file.name || '未命名素材'}
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[#86868B]">
          <span className="truncate">{file.sizeInfo || '-'}</span>
          <span className="w-0.5 h-0.5 rounded-full bg-[#C7C7CC] shrink-0" />
          <span className="shrink-0">{(file.suffix || '').toUpperCase() || categoryLabel(file.category)}</span>
        </div>
      </div>
    </div>
  );
}

export default function FileCenterView() {
  const [records, setRecords] = useState<DevFile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [library, setLibrary] = useState<LibraryType>('USER');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectingAll, setSelectingAll] = useState(false);
  const [checkingInvalid, setCheckingInvalid] = useState(false);
  const [cleaningInvalid, setCleaningInvalid] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);

  // 分类统计（全部/视频/音频/图片），各取 size=1 的分页 total
  const [stats, setStats] = useState<Record<string, number>>({});
  // 上传状态：进度 + 当前文件名
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadName, setUploadName] = useState('');
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<number | null>(null);

  const notify = useCallback(
    (kind: 'success' | 'error', text: string) => showToast(text, kind === 'error' ? 'danger' : 'success'),
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fileCenterApi.page({
        current: page,
        size: PAGE_SIZE,
        category: category || undefined,
        bizType: library,
        searchKey: search.trim() || undefined,
      });
      setRecords(data.records || []);
      setTotal(Number(data.total || 0));
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, category, search, library]);

  /** 拉取分类统计，load 完成后或上传/删除后刷新 */
  const loadStats = useCallback(async () => {
    const targets = ['', 'VIDEO', 'AUDIO', 'IMAGE'];
    try {
      const results = await Promise.all(
        targets.map((cat) =>
          fileCenterApi
            .page({ current: 1, size: 1, category: cat || undefined, bizType: library })
            .then((d) => [cat, Number(d.total || 0)] as const)
        )
      );
      setStats(Object.fromEntries(results));
    } catch {
      // 统计失败不阻塞列表
    }
  }, [library]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  // 搜索防抖：输入停顿 300ms 后回到第一页重新查询
  useEffect(() => {
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => {
      setPage(1);
    }, 300);
    return () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  // 切换库或筛选条件时清空选择，避免跨库误删
  useEffect(() => {
    setSelected(new Set());
  }, [library, category, search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const allPageSelected = records.length > 0 && records.every((r) => selected.has(r.id));
  const somePageSelected = records.some((r) => selected.has(r.id));

  function toggleSelectPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) records.forEach((r) => next.delete(r.id));
      else records.forEach((r) => next.add(r.id));
      return next;
    });
  }

  /** 批量删除前收集跨分页已选文件 */
  async function openBatchDelete() {
    const onPage = records.filter((r) => selected.has(r.id));
    if (onPage.length === selected.size) {
      setDialog({ kind: 'delete', files: onPage });
      return;
    }
    try {
      const data = await fileCenterApi.page({
        current: 1,
        size: Math.max(total, 1),
        category: category || undefined,
        bizType: library,
        searchKey: search.trim() || undefined,
      });
      const targets = (data.records || []).filter((r) => selected.has(r.id));
      if (!targets.length) {
        notify('error', '已选文件已不存在，请刷新后重试');
        return;
      }
      setDialog({ kind: 'delete', files: targets });
    } catch (err) {
      notify('error', `读取已选文件失败：${errorMessage(err)}`);
    }
  }

  /** 全选/取消全选当前筛选条件下的所有文件（跨分页） */
  async function toggleSelectAllResults() {
    if (selected.size >= total) {
      setSelected(new Set());
      return;
    }
    setSelectingAll(true);
    try {
      const data = await fileCenterApi.page({
        current: 1,
        size: Math.max(total, 1),
        category: category || undefined,
        bizType: library,
        searchKey: search.trim() || undefined,
      });
      setSelected(new Set((data.records || []).map((r) => r.id)));
    } catch (err) {
      notify('error', `全选失败：${errorMessage(err)}`);
    } finally {
      setSelectingAll(false);
    }
  }

  /** 顺序上传多个文件，逐个上报进度，结束后刷新列表与统计 */
  async function handleUpload(fileList: FileList) {
    const files = Array.from(fileList);
    if (!files.length) return;
    setUploading(true);
    let success = 0;
    let failed = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        setUploadName(files[i].name);
        try {
          await uploadLibraryFile(files[i], library, (percent) => {
            setUploadPercent(Math.round(((i + percent / 100) / files.length) * 100));
          });
          success += 1;
        } catch (err) {
          failed += 1;
          notify('error', `「${files[i].name}」上传失败：${errorMessage(err)}`);
        }
      }
      if (success) notify('success', `已上传 ${success} 个素材`);
      setPage(1);
      await Promise.all([load(), loadStats()]);
    } finally {
      setUploading(false);
      setUploadPercent(0);
      setUploadName('');
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  }

  async function handleDelete(targets: DevFile[]) {
    try {
      await fileCenterApi.remove(targets.map((t) => t.id));
      setSelected((prev) => {
        const next = new Set(prev);
        targets.forEach((t) => next.delete(t.id));
        return next;
      });
      setDialog(null);
      notify('success', `已删除 ${targets.length} 个素材`);
      // 当前页删空时回到上一页
      if (records.length === targets.length && page > 1) setPage(page - 1);
      else await load();
      void loadStats();
    } catch (err) {
      notify('error', `删除失败：${errorMessage(err)}`);
    }
  }

  async function handleCheckInvalidImages() {
    if (checkingInvalid || cleaningInvalid) return;
    setCheckingInvalid(true);
    try {
      const invalid = await fileCenterApi.checkInvalidImages(library);
      if (!invalid.length) {
        notify('success', '未发现失效图片');
        return;
      }
      setDialog({ kind: 'invalid', files: invalid });
    } catch (err) {
      notify('error', `检测失败：${errorMessage(err)}`);
    } finally {
      setCheckingInvalid(false);
    }
  }

  async function handleCleanInvalidImages() {
    if (dialog?.kind !== 'invalid' || cleaningInvalid) return;
    const targets = dialog.files;
    setCleaningInvalid(true);
    try {
      const removed = await fileCenterApi.deleteInvalidImages(targets.map((file) => file.id));
      const removedIds = new Set(targets.map((file) => file.id));
      setSelected((prev) => {
        const next = new Set(prev);
        removedIds.forEach((id) => next.delete(id));
        return next;
      });
      setDialog(null);
      const skipped = targets.length - removed;
      notify(
        'success',
        `已清理 ${removed} 个失效图片${skipped > 0 ? `，${skipped} 个文件已恢复或检测失败，未删除` : ''}`
      );
      const visibleRemoved = records.filter((file) => removedIds.has(file.id)).length;
      if (visibleRemoved === records.length && page > 1) setPage(page - 1);
      else await load();
      void loadStats();
    } catch (err) {
      notify('error', `清理失败：${errorMessage(err)}`);
    } finally {
      setCleaningInvalid(false);
    }
  }

  const statCards = [
    { label: '全部文件', value: stats[''] ?? 0, icon: Images },
    { label: '视频', value: stats['VIDEO'] ?? 0, icon: Film },
    { label: '音频', value: stats['AUDIO'] ?? 0, icon: Music },
    { label: '图片', value: stats['IMAGE'] ?? 0, icon: ImagePlus },
  ];

  return (
    <div className="space-y-5">
      {/* 概览 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-[#E5E5EA] px-4 py-3.5 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-[#0071E3]/8 flex items-center justify-center shrink-0">
              <stat.icon className="w-4 h-4 text-[#0071E3]" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="text-[20px] font-semibold tabular-nums text-[#1D1D1F] leading-none">
                {stat.value}
              </div>
              <div className="text-[12px] text-[#86868B] mt-1">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 工具栏 */}
      <div className="bg-white rounded-[18px] border border-[#E5E5EA] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          {/* 全选 */}
          <button
            type="button"
            role="checkbox"
            aria-checked={allPageSelected ? true : somePageSelected ? 'mixed' : false}
            aria-label="全选本页文件"
            disabled={!records.length}
            onClick={toggleSelectPage}
            title="全选 / 取消全选本页"
            className="h-8 pl-1.5 pr-2.5 rounded-[10px] inline-flex items-center gap-1.5 text-[12px] font-medium text-[#3A3A3C] hover:bg-[#F5F5F7] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <span
              className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-colors ${
                allPageSelected
                  ? 'bg-[#0071E3] border-[#0071E3] text-white'
                  : somePageSelected
                    ? 'bg-[#0071E3]/12 border-[#0071E3]'
                    : 'bg-white border-[#C7C7CC]'
              }`}
            >
              {allPageSelected ? (
                <Check className="w-2.5 h-2.5" strokeWidth={3} />
              ) : somePageSelected ? (
                <span className="w-2 h-0.5 rounded-full bg-[#0071E3]" />
              ) : null}
            </span>
            全选本页
          </button>
          {total > records.length && (
            <button
              type="button"
              disabled={selectingAll}
              onClick={() => void toggleSelectAllResults()}
              className="h-8 px-2 rounded-[10px] text-[11px] font-medium text-[#0071E3] hover:bg-[#0071E3]/8 disabled:opacity-50 transition-colors"
            >
              {selectingAll
                ? '选择中...'
                : selected.size >= total
                  ? '取消全选'
                  : `选择全部 ${total} 个`}
            </button>
          )}
          {/* 分类 Tab */}
          <div className="flex items-center rounded-xl bg-[#F5F5F7] p-0.5">
            {[{ value: '', label: '全部' }, ...FILE_CATEGORIES].map((cat) => (
              <button
                key={cat.value || 'all'}
                type="button"
                onClick={() => {
                  setCategory(cat.value);
                  setPage(1);
                }}
                className={`h-8 px-3 rounded-[10px] text-[12px] font-medium transition-colors ${
                  category === cat.value
                    ? 'bg-white text-[#1D1D1F] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-[260px] min-w-[180px]">
            <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索素材名称..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#F5F5F7] text-[13px] text-[#1D1D1F] placeholder:text-[#86868B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 transition-all"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void Promise.all([load(), loadStats()])}
            disabled={loading || uploading}
            title="刷新列表"
            className="h-9 w-9 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-center text-[#6E6E73] hover:bg-[#F5F5F7] disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => void handleCheckInvalidImages()}
            disabled={loading || uploading || checkingInvalid || cleaningInvalid}
            title="检测并清理物理文件不存在的图片"
            className="h-9 px-3 rounded-xl bg-white border border-[#E5E5EA] text-[#3A3A3C] text-[12px] font-medium inline-flex items-center gap-1.5 hover:bg-[#F5F5F7] disabled:opacity-50 transition-colors"
          >
            {checkingInvalid ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            {checkingInvalid ? '检测中…' : '检测失效图片'}
          </button>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={() => void openBatchDelete()}
              className="h-9 px-3 rounded-xl bg-white border border-[#FF3B30]/30 text-[#D70015] text-[12px] font-medium inline-flex items-center gap-1.5 hover:bg-[#FF3B30]/8 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              批量删除 ({selected.size})
            </button>
          )}
          <input
            ref={uploadInputRef}
            type="file"
            multiple
            accept="video/*,audio/*,image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void handleUpload(e.target.files);
            }}
          />
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            disabled={uploading}
            className="h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-60"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                上传中 {uploadPercent}%
              </>
            ) : (
              <>
                <ImagePlus className="w-4 h-4" />
                {library === 'MATERIAL' ? '上传素材' : '上传文件'}
              </>
            )}
          </button>
        </div>
      </div>

      {uploading && uploadName && (
        <div className="rounded-xl bg-[#0071E3]/8 border border-[#0071E3]/20 px-4 py-2.5 text-[12px] text-[#0071E3] flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          正在上传：{uploadName}（{uploadPercent}%）
        </div>
      )}

      {loadError && (
        <div className="rounded-xl bg-[#FF3B30]/8 border border-[#FF3B30]/20 px-4 py-3 flex items-center justify-between gap-3 text-[13px] text-[#D70015]">
          <span>素材列表加载失败：{loadError}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="shrink-0 font-medium underline underline-offset-2"
          >
            重试
          </button>
        </div>
      )}

      {/* 素材卡片栅格 */}
      {loading ? (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] py-20 flex flex-col items-center justify-center gap-3 text-[#86868B]">
          <Loader2 className="w-6 h-6 animate-spin text-[#0071E3]" />
          <span className="text-[13px]">正在加载素材数据...</span>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] py-20 px-6 text-center">
          <Images className="w-10 h-10 text-[#C7C7CC] mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-[16px] font-semibold text-[#1D1D1F]">
            {search.trim() || category
              ? '没有匹配的文件'
              : library === 'MATERIAL'
                ? '素材库还是空的'
                : '还没有用户文件'}
          </h3>
          <p className="text-[13px] text-[#6E6E73] mt-1">
            {search.trim() || category
              ? '试试调整搜索词或切换分类'
              : library === 'MATERIAL'
                ? '上传视频、音频、图片等素材后，即可在此统一管理与复用'
                : '业务表单上传的视频、图片、封面等会出现在这里'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-1.5 gap-y-3">
          {records.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              selected={selected.has(file.id)}
              onToggleSelect={toggleSelect}
              onOpen={(target) => {
                if (isVideoFile(target) || isAudioFile(target) || isImageFile(target)) {
                  setDialog({ kind: 'preview', file: target });
                } else {
                  setDialog({ kind: 'detail', file: target });
                }
              }}
              onDetail={(target) => setDialog({ kind: 'detail', file: target })}
              onDelete={(target) => setDialog({ kind: 'delete', files: [target] })}
            />
          ))}
        </div>
      )}

      {/* 分页 */}
      {!loading && total > 0 && (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#86868B]">
          <span>
            共 {total} 条{selected.size ? ` · 已选 ${selected.size} 条` : ''} · 第{' '}
            {currentPage}/{totalPages} 页
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 rounded-lg border border-[#E5E5EA] flex items-center justify-center text-[#3A3A3C] hover:bg-[#F5F5F7] disabled:opacity-40 transition-colors"
              aria-label="上一页"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 tabular-nums text-[#3A3A3C]">{currentPage}</span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 rounded-lg border border-[#E5E5EA] flex items-center justify-center text-[#3A3A3C] hover:bg-[#F5F5F7] disabled:opacity-40 transition-colors"
              aria-label="下一页"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 弹窗 */}
      {dialog?.kind === 'preview' && (
        <FilePreviewDialog file={dialog.file} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'detail' && (
        <FileDetailDialog file={dialog.file} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'delete' && (
        <FileDeleteDialog
          files={dialog.files}
          onClose={() => setDialog(null)}
          onConfirm={() => void handleDelete(dialog.files)}
        />
      )}
      {dialog?.kind === 'invalid' && (
        <FileInvalidDialog
          files={dialog.files}
          busy={cleaningInvalid}
          onClose={() => setDialog(null)}
          onConfirm={() => void handleCleanInvalidImages()}
        />
      )}

    </div>
  );
}
