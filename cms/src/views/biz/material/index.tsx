/**
 * 素材中心
 * ------------------------------------------------------------------
 * 对后端菜单：path = /biz/material，component = biz/material/index
 * 接口：vip.xiaonuo.dev.modular.file（bizType 固定为 MATERIAL）
 *
 * 与「文件中心」的分工：文件中心管理全部文件（用户文件 + 素材库），
 * 素材中心只聚焦可复用素材，提供面向内容生产的浏览、检索、引用与上传能力：
 * 分类统计、排序、网格/列表双视图、拖拽上传、批量复制引用地址、引用代码生成。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  File as FileIcon,
  FileText,
  Film,
  Images,
  ImagePlus,
  Info,
  LayoutGrid,
  List,
  Loader2,
  Music,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  categoryLabel,
  fileCenterApi,
  FILE_CATEGORIES,
  isAudioFile,
  isImageFile,
  isVideoFile,
  toOpenUrl,
  uploadMaterial,
  type DevFile,
} from '../../../lib/fileCenter.ts';
import { useFileThumbSrc } from '../../../lib/useFileThumb.ts';
import { formatDateTime } from '../../../lib/format.ts';
import { FileDeleteDialog, FilePreviewDialog } from '../file/dialogs.tsx';
import { absoluteFileUrl, copyText, MaterialDetailDialog } from './dialogs.tsx';
import { UploadDialog, type UploadSubmitPayload } from './UploadDialog.tsx';
import { SelectField } from '../../../components/SelectField.tsx';
import { showToast } from '../../../components/AppToast.tsx';
import { categoryApi, type BizCategory } from '../../../lib/category.ts';
import { QuickCreateCategory } from '../../../components/QuickCreateCategory.tsx';

const PAGE_SIZE = 24;

/** 图片素材统一灰白底，透明/留白处不再透出其它颜色 */
const IMAGE_TILE_BG = {
  backgroundColor: '#F2F2F7',
  backgroundImage: 'linear-gradient(135deg, #F7F7F9 0%, #EDEDF1 100%)',
} as const;

type ViewMode = 'grid' | 'list';
type SortKey = 'newest' | 'size' | 'name';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'newest', label: '最新上传' },
  { value: 'size', label: '文件大小' },
  { value: 'name', label: '名称排序' },
];

type DialogState =
  | { kind: 'preview'; file: DevFile }
  | { kind: 'detail'; file: DevFile }
  | { kind: 'delete'; files: DevFile[] }
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

/** 占位底色：按素材类型区分 */
function tileTone(file: DevFile): string {
  if (isVideoFile(file)) return 'bg-gradient-to-br from-[#1C1C1E] via-[#2C2C2E] to-[#48484A] text-white';
  if (isAudioFile(file)) return 'bg-gradient-to-br from-[#FF375F]/14 via-[#FF9F0A]/12 to-[#FFD60A]/14 text-[#FF375F]';
  if (isImageFile(file)) return 'text-[#0071E3]';
  if ((file.category || '') === 'DOC') return 'bg-gradient-to-br from-[#5E5CE6]/14 to-[#0071E3]/10 text-[#5E5CE6]';
  return 'bg-gradient-to-br from-[#F2F2F7] to-[#E5E5EA] text-[#8E8E93]';
}

function typeLabel(file: DevFile): string {
  return (file.suffix || '').replace('.', '').toUpperCase() || categoryLabel(file.category);
}

/* ------------------------------------------------------------------ */
/* 网格卡片                                                            */
/* ------------------------------------------------------------------ */

interface CardProps {
  file: DevFile;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (file: DevFile) => void;
  onDetail: (file: DevFile) => void;
  onCopy: (file: DevFile) => void;
  onDelete: (file: DevFile) => void;
  canDelete: boolean;
}

function MaterialCard({
  file,
  selected,
  onToggleSelect,
  onOpen,
  onDetail,
  onCopy,
  onDelete,
  canDelete,
}: CardProps) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const Icon = coverIcon(file);
  const isImage = isImageFile(file);
  const isVideo = isVideoFile(file);
  const media = isImage || isVideo || isAudioFile(file);
  const cover = useFileThumbSrc(file, isImage ? toOpenUrl(file) : '');
  const showCover = !!cover && !thumbFailed;

  useEffect(() => {
    setThumbFailed(false);
  }, [file.id]);

  return (
    <div
      title={media ? '双击预览素材' : '双击查看详情'}
      tabIndex={0}
      onClick={() => onToggleSelect(file.id)}
      onDoubleClick={() => onOpen(file)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(file);
        }
      }}
      className={`group relative p-1.5 rounded-[16px] cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]/40 ${
        selected ? 'bg-[#0071E3]/8' : 'hover:bg-[#F5F5F7]'
      }`}
    >
      <div
        className={`relative aspect-[4/3] rounded-[12px] overflow-hidden ${
          isImage ? '' : showCover ? 'bg-[#F2F2F7]' : tileTone(file)
        } ${selected ? 'ring-2 ring-[#0071E3]' : 'ring-1 ring-black/5'} transition-shadow group-hover:shadow-[0_10px_26px_rgba(0,0,0,0.10)]`}
        style={isImage ? IMAGE_TILE_BG : undefined}
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
            <Icon className="w-8 h-8 opacity-80" strokeWidth={1.4} />
            <span className="text-[9px] font-medium uppercase tracking-wide opacity-70">
              {typeLabel(file)}
            </span>
          </div>
        )}

        {isVideo && (
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="w-10 h-10 rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-sm text-white flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.28)] transition-transform group-hover:scale-105">
              <Film className="w-4 h-4" />
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

        {/* 悬浮操作 */}
        <div
          className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 p-0.5 rounded-lg bg-white/90 backdrop-blur-md shadow-sm opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          {media && (
            <button
              type="button"
              onClick={() => onOpen(file)}
              aria-label={`预览 ${file.name}`}
              title="预览"
              className="p-1 rounded-md text-[#3A3A3C] hover:text-[#0071E3] hover:bg-[#F2F2F7] transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onCopy(file)}
            aria-label={`复制 ${file.name} 的直链`}
            title="复制直链"
            className="p-1 rounded-md text-[#3A3A3C] hover:text-[#0071E3] hover:bg-[#F2F2F7] transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDetail(file)}
            aria-label={`详情 ${file.name}`}
            title="详情与引用"
            className="p-1 rounded-md text-[#3A3A3C] hover:text-[#0071E3] hover:bg-[#F2F2F7] transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(file)}
              aria-label={`删除 ${file.name}`}
              title="删除"
              className="p-1 rounded-md text-[#3A3A3C] hover:text-[#D70015] hover:bg-[#FF3B30]/8 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="mt-1.5 px-0.5 min-w-0">
        <div className="text-[12px] font-medium text-[#1D1D1F] truncate" title={file.name}>
          {file.name || '未命名素材'}
        </div>
        <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[#86868B]">
          <span className="truncate">{file.sizeInfo || '-'}</span>
          <span className="w-0.5 h-0.5 rounded-full bg-[#C7C7CC] shrink-0" />
          <span className="shrink-0">{typeLabel(file)}</span>
        </div>
      </div>
    </div>
  );
}

/** 表格行缩略图：与网格卡片共用同一套封面地址，失败时回退类型图标 */
function MaterialTableThumb({ file }: { file: DevFile }) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const Icon = coverIcon(file);
  const cover = useFileThumbSrc(file, isImageFile(file) ? toOpenUrl(file) : '');
  const showCover = !!cover && !thumbFailed;

  useEffect(() => {
    setThumbFailed(false);
  }, [file.id]);

  return (
    <span
      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${tileTone(file)}`}
      style={isImageFile(file) ? IMAGE_TILE_BG : undefined}
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
        <Icon className="w-4 h-4" strokeWidth={1.6} />
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* 主页面                                                              */
/* ------------------------------------------------------------------ */

export default function MaterialCenterView({ permissions }: { permissions?: string[] }) {
  const [records, setRecords] = useState<DevFile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  /** 素材分类（通用分类 MATERIAL 模块的编码），空表示不限 */
  const [categoryCode, setCategoryCode] = useState('');
  const [materialCategories, setMaterialCategories] = useState<BizCategory[]>([]);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<DialogState>(null);

  const [stats, setStats] = useState<Record<string, number>>({});
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingDropFiles, setPendingDropFiles] = useState<File[] | undefined>(undefined);
  const [uploadName, setUploadName] = useState('');
  const [dragging, setDragging] = useState(false);

  const searchTimerRef = useRef<number | null>(null);
  const dragDepthRef = useRef(0);

  /**
   * 操作权限：若后端为该菜单配置了 bizMaterial* 按钮权限则严格校验，
   * 未配置时（新菜单常见情况）不隐藏入口，避免素材中心变成只读页。
   */
  const perms = permissions || [];
  const hasConfiguredPerms = perms.some((code) => code.startsWith('bizMaterial'));
  const canUpload = !hasConfiguredPerms || perms.includes('bizMaterialAdd');
  const canDelete = !hasConfiguredPerms || perms.includes('bizMaterialDelete');

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
        categoryCode: categoryCode || undefined,
        bizType: 'MATERIAL',
        searchKey: search.trim() || undefined,
        sortField: sort === 'size' ? 'sizeKb' : sort === 'name' ? 'name' : 'createTime',
        sortOrder: sort === 'name' ? 'ASCEND' : 'DESCEND',
      });
      setRecords(data.records || []);
      setTotal(Number(data.total || 0));
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, category, categoryCode, search, sort]);

  /** 分类统计：素材库固定 bizType=MATERIAL，各分类取 size=1 的 total */
  const loadStats = useCallback(async () => {
    const targets = ['', 'IMAGE', 'VIDEO', 'AUDIO', 'DOC'];
    try {
      const results = await Promise.all(
        targets.map((cat) =>
          fileCenterApi
            .page({ current: 1, size: 1, category: cat || undefined, bizType: 'MATERIAL' })
            .then((d) => [cat || 'ALL', Number(d.total || 0)] as const)
        )
      );
      setStats(Object.fromEntries(results));
    } catch {
      // 统计失败不阻塞列表
    }
  }, []);

  /** 加载素材模块的通用分类（逐页拉全量） */
  const loadMaterialCategories = useCallback(async () => {
    try {
      const all: BizCategory[] = [];
      for (let current = 1; ; current++) {
        const result = await categoryApi.page({
          current,
          size: 20,
          module: 'MATERIAL',
          status: 'ENABLE',
        });
        const records = result?.records || [];
        all.push(...records);
        if (records.length < 20 || all.length >= (result?.total ?? all.length)) break;
      }
      setMaterialCategories(all);
    } catch {
      setMaterialCategories([]);
    }
  }, []);

  useEffect(() => {
    void loadMaterialCategories();
  }, [loadMaterialCategories]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  // 搜索防抖
  useEffect(() => {
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => setPage(1), 300);
    return () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  // 切换筛选时清空选择
  useEffect(() => {
    setSelected(new Set());
  }, [category, categoryCode, search]);

  /** 切换文件类型时重置素材分类，避免两个维度的筛选互相干扰 */
  const handleTypeChange = useCallback((next: string) => {
    setCategory(next);
    setCategoryCode('');
    setPage(1);
  }, []);

  /** 排序已由服务端处理，当前页直接展示后端返回顺序 */
  const visibleRecords = records;

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

  /** 批量删除：先补齐跨分页中已选但不在当前页的记录 */
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
        bizType: 'MATERIAL',
        searchKey: search.trim() || undefined,
      });
      const targets = (data.records || []).filter((r) => selected.has(r.id));
      if (!targets.length) {
        notify('error', '已选素材已不存在，请刷新后重试');
        return;
      }
      setDialog({ kind: 'delete', files: targets });
    } catch (err) {
      notify('error', `读取已选素材失败：${errorMessage(err)}`);
    }
  }

  /** 复制单个素材直链 */
  async function copyFileLink(file: DevFile) {
    const url = absoluteFileUrl(file);
    if (!url) {
      notify('error', '该素材没有公开访问地址');
      return;
    }
    try {
      await copyText(url);
      notify('success', '直链已复制');
    } catch (err) {
      notify('error', errorMessage(err));
    }
  }

  /** 批量复制直链（每行一个），便于粘贴到文档或第三方平台 */
  async function copySelectedLinks() {
    const urls = records
      .filter((r) => selected.has(r.id))
      .map((r) => absoluteFileUrl(r))
      .filter(Boolean);
    if (!urls.length) {
      notify('error', '所选素材没有公开访问地址');
      return;
    }
    try {
      await copyText(urls.join('\n'));
      notify('success', `已复制 ${urls.length} 条直链`);
    } catch (err) {
      notify('error', errorMessage(err));
    }
  }

  /** 打开上传模态框（选择文件与分类后才会真正上传） */
  function openUploadDialog(fileList?: FileList | File[]) {
    if (!canUpload) {
      notify('error', '当前账号没有上传素材权限');
      return;
    }
    if (fileList?.length) setPendingDropFiles(Array.from(fileList));
    setUploadOpen(true);
  }

  /**
   * 模态框保存：多个文件共用同一分类，顺序上传并汇总整体进度。
   * 返回上传失败的文件，便于模态框保留它们重试。
   */
  async function handleUploadSubmit(
    { files, categoryCode }: UploadSubmitPayload,
    onProgress: (percent: number) => void
  ): Promise<File[]> {
    const failedFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      setUploadName(files[i].name);
      try {
        await uploadMaterial(
          files[i],
          // 整体进度 = 已完成文件数 + 当前文件进度
          (percent) => onProgress(Math.round(((i + percent / 100) / files.length) * 100)),
          categoryCode
        );
      } catch (err) {
        failedFiles.push(files[i]);
        notify('error', `「${files[i].name}」上传失败：${errorMessage(err)}`);
      }
    }
    setUploadName('');
    const success = files.length - failedFiles.length;
    if (success > 0) {
      notify('success', `已上传 ${success} 个素材`);
      setPage(1);
      await Promise.all([load(), loadStats()]);
    }
    return failedFiles;
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
      if (records.length === targets.length && page > 1) setPage(page - 1);
      else await load();
      void loadStats();
    } catch (err) {
      notify('error', `删除失败：${errorMessage(err)}`);
    }
  }

  function openFile(file: DevFile) {
    if (isVideoFile(file) || isAudioFile(file) || isImageFile(file)) {
      setDialog({ kind: 'preview', file });
    } else {
      setDialog({ kind: 'detail', file });
    }
  }

  const statCards = [
    { key: 'ALL', label: '全部素材', icon: Images },
    { key: 'IMAGE', label: '图片', icon: ImagePlus },
    { key: 'VIDEO', label: '视频', icon: Film },
    { key: 'AUDIO', label: '音频', icon: Music },
    { key: 'DOC', label: '文档', icon: FileText },
  ];

  const categoryTabs = [
    { value: '', label: '全部', count: stats.ALL },
    ...FILE_CATEGORIES.map((cat) => ({
      value: cat.value as string,
      label: cat.label,
      count: stats[cat.value],
    })),
  ];

  return (
    <div
      className="space-y-5 relative"
      onDragEnter={(e) => {
        if (!canUpload) return;
        const hasFiles = Array.from(e.dataTransfer.types || []).includes('Files');
        if (!hasFiles) return;
        dragDepthRef.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => {
        if (!canUpload) return;
        e.preventDefault();
      }}
      onDragLeave={() => {
        if (!canUpload) return;
        dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
        if (dragDepthRef.current === 0) setDragging(false);
      }}
      onDrop={(e) => {
        if (!canUpload) return;
        e.preventDefault();
        dragDepthRef.current = 0;
        setDragging(false);
        if (e.dataTransfer.files?.length) openUploadDialog(e.dataTransfer.files);
      }}
    >
      {dragging && (
        <div className="fixed inset-0 z-40 bg-[#0071E3]/8 backdrop-blur-[1px] pointer-events-none" />
      )}

      {/* 概览 */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {statCards.map((stat) => (
          <button
            key={stat.key}
            type="button"
            onClick={() => handleTypeChange(stat.key === 'ALL' ? '' : stat.key)}
            className={`text-left bg-white rounded-2xl border px-4 py-3.5 flex items-center gap-3 transition-colors ${
              (stat.key === 'ALL' ? '' : stat.key) === category
                ? 'border-[#0071E3]/40 ring-1 ring-[#0071E3]/20'
                : 'border-[#E5E5EA] hover:border-[#D1D1D6]'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-[#0071E3]/8 flex items-center justify-center shrink-0">
              <stat.icon className="w-4 h-4 text-[#0071E3]" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="text-[20px] font-semibold tabular-nums text-[#1D1D1F] leading-none">
                {stats[stat.key] ?? 0}
              </div>
              <div className="text-[12px] text-[#86868B] mt-1 truncate">{stat.label}</div>
            </div>
          </button>
        ))}
      </div>

      {/* 工具栏 */}
      <div className="bg-white rounded-[18px] border border-[#E5E5EA] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1 max-w-[320px] min-w-[180px]">
              <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索素材名称..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#F5F5F7] text-[13px] text-[#1D1D1F] placeholder:text-[#86868B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 transition-all"
              />
            </div>

            <SelectField
              ariaLabel="排序方式"
              value={sort}
              onChange={(value) => setSort(value as SortKey)}
              options={SORT_OPTIONS}
              className="w-36"
            />

            <div className="flex items-center rounded-xl bg-[#F5F5F7] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="网格视图"
                aria-pressed={viewMode === 'grid'}
                className={`h-8 w-8 rounded-[10px] flex items-center justify-center transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#1D1D1F] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="列表视图"
                aria-pressed={viewMode === 'list'}
                className={`h-8 w-8 rounded-[10px] flex items-center justify-center transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-[#1D1D1F] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void Promise.all([load(), loadStats()])}
              disabled={loading}
              title="刷新素材"
              className="h-9 w-9 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-center text-[#6E6E73] hover:bg-[#F5F5F7] disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            {canUpload && (
              <button
                type="button"
                onClick={() => openUploadDialog()}
                className="h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors"
              >
                <ImagePlus className="w-4 h-4" />
                上传素材
              </button>
            )}
          </div>
        </div>

        {/* 分类 Tab */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#F2F2F7]">
          <div className="flex flex-wrap items-center gap-1 pt-2">
            {categoryTabs.map((cat) => (
              <button
                key={cat.value || 'all'}
                type="button"
                onClick={() => handleTypeChange(cat.value)}
                className={`h-8 px-3 rounded-[10px] text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors ${
                  category === cat.value
                    ? 'bg-[#0071E3]/10 text-[#0071E3]'
                    : 'text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
                }`}
              >
                {cat.label}
                {cat.count !== undefined && (
                  <span
                    className={`text-[11px] tabular-nums ${
                      category === cat.value ? 'text-[#0071E3]/70' : 'text-[#AEAEB2]'
                    }`}
                  >
                    {cat.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 素材分类筛选：通用分类中 MODULE=MATERIAL 的分类 */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F2F2F7]">
          <span className="text-[12px] text-[#86868B]">素材分类</span>
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setCategoryCode('');
                setPage(1);
              }}
              className={`h-8 px-3 rounded-[10px] text-[12px] font-medium transition-colors ${
                categoryCode === ''
                  ? 'bg-[#0071E3]/10 text-[#0071E3]'
                  : 'text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
              }`}
            >
              全部
            </button>
            {materialCategories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setCategoryCode(item.code || '');
                  setPage(1);
                }}
                className={`h-8 px-3 rounded-[10px] text-[12px] font-medium transition-colors ${
                  categoryCode === (item.code || '')
                    ? 'bg-[#0071E3]/10 text-[#0071E3]'
                    : 'text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
                }`}
              >
                {item.name || '未命名分类'}
              </button>
            ))}
            {materialCategories.length === 0 && (
              <span className="text-[11px] text-[#AEAEB2]">
                暂无素材分类
              </span>
            )}
            <button
              type="button"
              onClick={() => setQuickCreateOpen(true)}
              title="快速新建分类"
              aria-label="快速新建分类"
              className="h-8 w-8 rounded-[10px] inline-flex items-center justify-center text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#0071E3] transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1 pt-2 ml-auto">
            <button
              type="button"
              role="checkbox"
              aria-checked={allPageSelected ? true : somePageSelected ? 'mixed' : false}
              aria-label="全选本页素材"
              disabled={!records.length}
              onClick={toggleSelectPage}
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
            {selected.size > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => void copySelectedLinks()}
                  className="h-8 px-3 rounded-[10px] bg-[#0071E3]/8 text-[#0071E3] text-[12px] font-medium inline-flex items-center gap-1.5 hover:bg-[#0071E3]/12 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  复制直链 ({selected.size})
                </button>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => void openBatchDelete()}
                    className="h-8 px-3 rounded-[10px] bg-white border border-[#FF3B30]/30 text-[#D70015] text-[12px] font-medium inline-flex items-center gap-1.5 hover:bg-[#FF3B30]/8 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    删除 ({selected.size})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="h-8 px-2 rounded-[10px] text-[12px] font-medium text-[#6E6E73] hover:bg-[#F5F5F7] transition-colors"
                >
                  取消选择
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {uploadOpen && uploadName && (
        <div className="rounded-xl bg-[#0071E3]/8 border border-[#0071E3]/20 px-4 py-2.5 text-[12px] text-[#0071E3] flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          正在上传：{uploadName}
        </div>
      )}

      {loadError && (
        <div className="rounded-xl bg-[#FF3B30]/8 border border-[#FF3B30]/20 px-4 py-3 flex items-center justify-between gap-3 text-[13px] text-[#D70015]">
          <span>素材加载失败：{loadError}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="shrink-0 font-medium underline underline-offset-2"
          >
            重试
          </button>
        </div>
      )}

      {/* 内容区 */}
      {loading ? (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] py-20 flex flex-col items-center justify-center gap-3 text-[#86868B]">
          <Loader2 className="w-6 h-6 animate-spin text-[#0071E3]" />
          <span className="text-[13px]">正在加载素材数据...</span>
        </div>
      ) : records.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] py-20 px-6 text-center">
          <Images className="w-10 h-10 text-[#C7C7CC] mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-[16px] font-semibold text-[#1D1D1F]">
            {search.trim() || category ? '没有匹配的素材' : '素材中心还是空的'}
          </h3>
          <p className="text-[13px] text-[#6E6E73] mt-1">
            {search.trim() || category
              ? '试试调整搜索词或切换素材分类'
              : canUpload
                ? '上传图片、视频、音频或文档，即可在此统一检索与引用'
                : '当前账号暂无上传权限，可联系管理员开通'}
          </p>
          {canUpload && !(search.trim() || category) && (
            <button
              type="button"
              onClick={() => openUploadDialog()}
              className="mt-5 h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5"
            >
              <UploadCloud className="w-4 h-4" />
              上传首个素材
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-1.5 gap-y-3">
          {visibleRecords.map((file) => (
            <MaterialCard
              key={file.id}
              file={file}
              selected={selected.has(file.id)}
              onToggleSelect={toggleSelect}
              onOpen={openFile}
              onDetail={(target) => setDialog({ kind: 'detail', file: target })}
              onCopy={(target) => void copyFileLink(target)}
              onDelete={(target) => setDialog({ kind: 'delete', files: [target] })}
              canDelete={canDelete}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] overflow-hidden">
          <div className="hidden sm:grid grid-cols-[32px_minmax(0,3fr)_90px_90px_140px_120px] gap-3 px-4 py-2.5 border-b border-[#F2F2F7] text-[11px] font-medium text-[#86868B]">
            <span />
            <span>素材名称</span>
            <span>分类</span>
            <span>大小</span>
            <span>上传时间</span>
            <span className="text-right">操作</span>
          </div>
          {visibleRecords.map((file) => {
            const isSelected = selected.has(file.id);
            return (
              <div
                key={file.id}
                className={`grid grid-cols-[28px_minmax(0,1fr)] sm:grid-cols-[32px_minmax(0,3fr)_90px_90px_140px_120px] gap-3 items-center px-4 py-2.5 border-b border-[#F2F2F7] last:border-b-0 transition-colors ${
                  isSelected ? 'bg-[#0071E3]/6' : 'hover:bg-[#FAFAFC]'
                }`}
              >
                <button
                  type="button"
                  aria-label={`${isSelected ? '取消选择' : '选择'} ${file.name || file.id}`}
                  aria-pressed={isSelected}
                  onClick={() => toggleSelect(file.id)}
                  className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-[#0071E3] border-[#0071E3] text-white'
                      : 'bg-white border-[#C7C7CC] text-transparent hover:border-[#8E8E93]'
                  }`}
                >
                  <Check className="w-2.5 h-2.5" strokeWidth={3} />
                </button>

                <button
                  type="button"
                  onClick={() => openFile(file)}
                  className="flex items-center gap-2.5 min-w-0 text-left"
                >
                  <MaterialTableThumb file={file} />
                  <span className="min-w-0">
                    <span className="block text-[13px] text-[#1D1D1F] truncate">
                      {file.name || '未命名素材'}
                    </span>
                    <span className="block text-[11px] text-[#86868B] truncate sm:hidden">
                      {categoryLabel(file.category)} · {file.sizeInfo || '-'}
                    </span>
                  </span>
                </button>

                <span className="hidden sm:block text-[12px] text-[#6E6E73] truncate">
                  {categoryLabel(file.category)}
                </span>
                <span className="hidden sm:block text-[12px] text-[#6E6E73] tabular-nums">
                  {file.sizeInfo || '-'}
                </span>
                <span className="hidden sm:block text-[12px] text-[#86868B] tabular-nums">
                  {file.createTime ? formatDateTime(file.createTime) : '-'}
                </span>
                <span className="hidden sm:flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => void copyFileLink(file)}
                    aria-label={`复制 ${file.name} 的直链`}
                    title="复制直链"
                    className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#0071E3] hover:bg-[#F5F5F7] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDialog({ kind: 'detail', file })}
                    aria-label={`详情 ${file.name}`}
                    title="详情与引用"
                    className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#0071E3] hover:bg-[#F5F5F7] transition-colors"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </button>
                  {toOpenUrl(file) && (
                    <a
                      href={toOpenUrl(file)}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`下载 ${file.name}`}
                      title="下载"
                      className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#0071E3] hover:bg-[#F5F5F7] transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDialog({ kind: 'delete', files: [file] })}
                      aria-label={`删除 ${file.name}`}
                      title="删除"
                      className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#D70015] hover:bg-[#FF3B30]/8 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 分页 */}
      {!loading && total > 0 && (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#86868B]">
          <span>
            共 {total} 个素材{selected.size ? ` · 已选 ${selected.size} 个` : ''} · 第{' '}
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
        <MaterialDetailDialog
          file={dialog.file}
          onClose={() => setDialog(null)}
          onPreview={() => setDialog({ kind: 'preview', file: dialog.file })}
          onDelete={
            canDelete
              ? () => setDialog({ kind: 'delete', files: [dialog.file] })
              : undefined
          }
        />
      )}
      {dialog?.kind === 'delete' && (
        <FileDeleteDialog
          files={dialog.files}
          onClose={() => setDialog(null)}
          onConfirm={() => void handleDelete(dialog.files)}
        />
      )}
      <UploadDialog
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setPendingDropFiles(undefined);
        }}
        onSubmit={handleUploadSubmit}
        initialFiles={pendingDropFiles}
      />

      <QuickCreateCategory
        open={quickCreateOpen}
        module="MATERIAL"
        title="新建素材分类"
        onClose={() => setQuickCreateOpen(false)}
        onCreated={(category) => {
          void loadMaterialCategories();
          if (category.code) {
            setCategoryCode(category.code);
            setPage(1);
          }
          showToast('分类创建成功', 'success');
        }}
      />
    </div>
  );
}
