/**
 * 文件中心（素材库）管理页
 * ------------------------------------------------------------------
 * 对应后端菜单：path = /biz/file，component = biz/file/index
 * 接口：vip.xiaonuo.dev.modular.file（DevFileController）
 *
 * 素材按后端 CATEGORY 分类（IMAGE/VIDEO/AUDIO/DOC/OTHER），分页查询走
 * /dev/file/page（支持 category/searchKey），支持视频/音频在线预览播放。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Film,
  File as FileIcon,
  ImagePlus,
  Images,
  Loader2,
  Music,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  categoryLabel,
  fileCenterApi,
  FILE_CATEGORIES,
  hasFilePerm,
  isAudioFile,
  isImageFile,
  isVideoFile,
  toOpenUrl,
  uploadMaterial,
  type DevFile,
} from '../../../lib/fileCenter.ts';
import { MediaImage } from '../../../components/MediaImage.tsx';
import {
  FileDeleteDialog,
  FileDetailDialog,
  FilePreviewDialog,
} from './dialogs.tsx';

const PAGE_SIZE = 12;

type DialogState =
  | { kind: 'preview'; file: DevFile }
  | { kind: 'detail'; file: DevFile }
  | { kind: 'delete'; files: DevFile[] }
  | null;

interface Toast {
  kind: 'success' | 'error';
  text: string;
}

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

export default function FileCenterView({ permissions }: { permissions?: string[] }) {
  const can = useCallback(
    (action: Parameters<typeof hasFilePerm>[1]) => hasFilePerm(permissions, action),
    [permissions]
  );

  const [records, setRecords] = useState<DevFile[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<DialogState>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  // 分类统计（全部/视频/音频/图片），各取 size=1 的分页 total
  const [stats, setStats] = useState<Record<string, number>>({});
  // 上传状态：进度 + 当前文件名
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [uploadName, setUploadName] = useState('');
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<number | null>(null);

  const notify = useCallback((kind: Toast['kind'], text: string) => {
    setToast({ kind, text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fileCenterApi.page({
        current: page,
        size: PAGE_SIZE,
        category: category || undefined,
        searchKey: search.trim() || undefined,
      });
      setRecords(data.records || []);
      setTotal(Number(data.total || 0));
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, category, search]);

  /** 拉取分类统计，load 完成后或上传/删除后刷新 */
  const loadStats = useCallback(async () => {
    const targets = ['', 'VIDEO', 'AUDIO', 'IMAGE'];
    try {
      const results = await Promise.all(
        targets.map((cat) =>
          fileCenterApi
            .page({ current: 1, size: 1, category: cat || undefined })
            .then((d) => [cat, Number(d.total || 0)] as const)
        )
      );
      setStats(Object.fromEntries(results));
    } catch {
      // 统计失败不阻塞列表
    }
  }, []);

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

  function toggleSelectPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) records.forEach((r) => next.delete(r.id));
      else records.forEach((r) => next.add(r.id));
      return next;
    });
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
          await uploadMaterial(files[i], (percent) => {
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

  const statCards = [
    { label: '全部素材', value: stats[''] ?? 0, icon: Images },
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
          {can('delete') && selected.size > 0 && (
            <button
              type="button"
              onClick={() =>
                setDialog({
                  kind: 'delete',
                  files: records.filter((r) => selected.has(r.id)),
                })
              }
              className="h-9 px-3 rounded-xl bg-white border border-[#FF3B30]/30 text-[#D70015] text-[12px] font-medium inline-flex items-center gap-1.5 hover:bg-[#FF3B30]/8 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              批量删除 ({selected.size})
            </button>
          )}
          {can('upload') && (
            <>
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
                    上传素材
                  </>
                )}
              </button>
            </>
          )}
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
            {search.trim() || category ? '没有匹配的素材' : '素材库还是空的'}
          </h3>
          <p className="text-[13px] text-[#6E6E73] mt-1">
            {search.trim() || category
              ? '试试调整搜索词或切换分类'
              : '上传视频、音频、图片等素材后，即可在此统一管理与选用'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {records.map((file) => {
            const Icon = coverIcon(file);
            const isImage = isImageFile(file) && !!file.thumbnail;
            return (
              <div
                key={file.id}
                className={`group bg-white rounded-2xl border overflow-hidden cursor-pointer transition-all hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] ${
                  selected.has(file.id)
                    ? 'border-[#0071E3] ring-1 ring-[#0071E3]'
                    : 'border-[#E5E5EA]'
                }`}
                onClick={() => toggleSelect(file.id)}
              >
                {/* 封面区 */}
                <div className="relative h-[140px] bg-[#FAFAFC] flex items-center justify-center overflow-hidden">
                  {isImage ? (
                    <MediaImage
                      src={file.thumbnail}
                      alt={file.name || '素材'}
                      fallbackLabel={categoryLabel(file.category)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-[#AEAEB2] select-none">
                      <Icon className="w-9 h-9" strokeWidth={1.5} />
                      <span className="text-[11px] font-medium">{categoryLabel(file.category)}</span>
                    </div>
                  )}
                  <input
                    type="checkbox"
                    aria-label={`选择 ${file.name || file.id}`}
                    checked={selected.has(file.id)}
                    onChange={() => toggleSelect(file.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute top-2 left-2 w-3.5 h-3.5 accent-[#0071E3] cursor-pointer"
                  />
                  {/* 悬浮预览按钮 */}
                  {(isVideoFile(file) || isAudioFile(file) || isImageFile(file)) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (can('detail')) setDialog({ kind: 'preview', file });
                      }}
                      title="预览"
                      className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <span className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-[#1D1D1F]">
                        <Eye className="w-4.5 h-4.5" strokeWidth={1.8} />
                      </span>
                    </button>
                  )}
                </div>
                {/* 信息区 */}
                <div className="px-3 pt-2.5 pb-3">
                  <div className="text-[13px] font-medium text-[#1D1D1F] truncate" title={file.name}>
                    {file.name || '未命名素材'}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#86868B]">
                    <span>{file.sizeInfo || '-'}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-[#F2F2F7] text-[#3A3A3C] font-medium">
                      {(file.suffix || '').toUpperCase() || '-'}
                    </span>
                  </div>
                  {/* 操作行 */}
                  <div
                    className="mt-2.5 pt-2.5 border-t border-[#F2F2F7] flex items-center justify-end gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {(isVideoFile(file) || isAudioFile(file) || isImageFile(file)) && can('detail') && (
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: 'preview', file })}
                        aria-label={`预览 ${file.name}`}
                        title="预览"
                        className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#0071E3] hover:bg-[#F2F2F7] transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {can('detail') && (
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: 'detail', file })}
                        aria-label={`详情 ${file.name}`}
                        title="详情"
                        className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#0071E3] hover:bg-[#F2F2F7] transition-colors"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    )}
                    {file.downloadPath && (
                      <a
                        href={toOpenUrl(file)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`下载 ${file.name}`}
                        title="下载"
                        className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#0071E3] hover:bg-[#F2F2F7] transition-colors"
                      >
                        <svg
                          className="w-4 h-4"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      </a>
                    )}
                    {can('delete') && (
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: 'delete', files: [file] })}
                        aria-label={`删除 ${file.name}`}
                        title="删除"
                        className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#D70015] hover:bg-[#FF3B30]/8 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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

      {/* 轻提示 */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-[60] max-w-[360px] px-4 py-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.14)] text-[13px] font-medium flex items-center gap-2 ${
            toast.kind === 'success' ? 'bg-[#1D1D1F] text-white' : 'bg-[#D70015] text-white'
          }`}
        >
          {toast.text}
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="关闭提示"
            className="ml-2 opacity-70 hover:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
