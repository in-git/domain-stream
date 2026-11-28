import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Film,
  LayoutGrid,
  List,
  Play,
  Plus,
  Search,
  Square,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { api } from '../../../lib/api.ts';
import { DeleteConfirmModal } from '../../../components/DeleteConfirmModal.tsx';
import { MediaImage } from '../../../components/MediaImage.tsx';
import { deleteFilesByUrls, normalizeFileUrl } from '../../../lib/fileCenter.ts';
import { hasModulePerm } from '../../../lib/menu.ts';
import {
  formatDateShort,
  formatDuration,
  formatFileSize,
  formatNumber,
} from '../../../lib/format.ts';
import type { ContentStatus, VideoItem } from '../../../types/cms.ts';
import { publishCategoryName } from '../../../lib/category.ts';
import { usePublishCategories } from '../../../lib/usePublishCategories.ts';
import { toPlayableVideoUrl } from '../../../lib/fileCenter.ts';
import type { VideoPageQuery } from '../../../lib/snowy.ts';
import { SortOrderButton } from '../../../components/SortOrderButton.tsx';

interface VideoManagerViewProps {
  videos: VideoItem[];
  total: number;
  query: VideoPageQuery;
  loading: boolean;
  onQueryChange: (query: VideoPageQuery) => void;
  onRefresh: () => Promise<void>;
  onOpen: (action: 'new' | 'edit' | 'view' | 'delete', id?: string) => void;
  permissions?: string[];
}

/**
 * 视频卡片预览区：默认只显示封面，鼠标移入才挂载 <video> 并自动播放，
 * 移出即卸载，避免打开列表时一次性为所有卡片加载视频流。
 */
function VideoCardPreview({
  videoUrl,
  coverUrl,
  title,
  hovered,
}: {
  videoUrl: string;
  coverUrl?: string;
  title: string;
  hovered: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!hovered) {
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
      return;
    }
    const video = videoRef.current;
    if (video) void video.play().catch(() => {});
  }, [hovered]);

  return (
    <div className="relative aspect-video bg-black overflow-hidden">
      <MediaImage
        src={normalizeFileUrl(coverUrl)}
        alt={`${title} 封面`}
        fallbackLabel={title}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
          hovered ? 'opacity-0' : 'opacity-100'
        }`}
      />
      {hovered && (
        <video
          ref={videoRef}
          src={toPlayableVideoUrl(videoUrl)}
          muted
          loop
          playsInline
          controls
          autoPlay
          preload="auto"
          className="absolute inset-0 w-full h-full object-contain"
          aria-label={`播放 ${title}`}
        />
      )}
      {!hovered && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <Play className="w-9 h-9 text-white fill-white/90" strokeWidth={1.4} />
        </span>
      )}
    </div>
  );
}

export function VideoManagerView({
  videos,
  total,
  query,
  loading,
  onQueryChange,
  onRefresh,
  onOpen,
  permissions,
}: VideoManagerViewProps) {
  const canAdd = hasModulePerm('videos', 'Add', permissions);
  const canEdit = hasModulePerm('videos', 'Edit', permissions);
  const canDelete = hasModulePerm('videos', 'Delete', permissions);
  const [searchText, setSearchText] = useState(query.searchKey || '');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  /** 批量选择：选中的视频ID集合，翻页或改筛选后清空 */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /** 待删除的视频（单条或批量），非空时打开通用删除确认模态框 */
  const [pendingDelete, setPendingDelete] = useState<VideoItem[]>([]);
  /** 当前悬停预览的视频 ID，同一时刻只有一个卡片加载并播放视频 */
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const { options: categoryOptions } = usePublishCategories('VIDEO');
  const categoryName = (code: string) => publishCategoryName(categoryOptions, code);

  const statusFilter = query.status || 'all';
  const categoryFilter = query.category || 'all';
  const sortOrder = query.sortOrder || 'DESCEND';
  const totalPages = Math.max(1, Math.ceil(total / query.size));
  const currentPage = Math.min(query.current, totalPages);

  /** 分类 chip 使用完整分类字典，避免分页后只剩当前页的分类 */
  const categoryChips = useMemo(
    () => categoryOptions.map((option) => ({
      code: option.code,
      label: option.name || categoryName(option.code) || option.code
    })),
    [categoryOptions]
  );

  useEffect(() => {
    setSearchText(query.searchKey || '');
  }, [query.searchKey]);

  useEffect(() => {
    const keyword = searchText.trim();
    if (keyword === (query.searchKey || '').trim()) return;
    const timer = window.setTimeout(() => {
      onQueryChange({ ...query, searchKey: keyword, current: 1 });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchText, query, onQueryChange]);

  const firstQuery = useRef(true);
  useEffect(() => {
    if (firstQuery.current) {
      firstQuery.current = false;
      return;
    }
    setSelected(new Set());
  }, [query]);

  function changeQuery(patch: Partial<VideoPageQuery>) {
    onQueryChange({ ...query, ...patch });
  }

  /** 当前页全选状态 */
  const allSelected = videos.length > 0 && videos.every((v) => selected.has(v.id));
  const someSelected = videos.some((v) => selected.has(v.id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** 全选/取消全选当前页 */
  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) videos.forEach((v) => next.delete(v.id));
      else videos.forEach((v) => next.add(v.id));
      return next;
    });
  }

  /** 单条删除：改为打开模态框（不再跳转独立页面） */
  function requestDelete(item: VideoItem) {
    setPendingDelete([item]);
  }

  /** 批量删除：打开模态框 */
  function requestBatchDelete() {
    setPendingDelete(videos.filter((v) => selected.has(v.id)));
  }

  /** 确认删除：删记录 + 清理视频与封面文件，最后刷新 */
  async function handleConfirmDelete() {
    const targets = pendingDelete;
    await api.deleteVideos(targets.map((v) => v.id));
    // 清理视频源文件与封面，避免孤儿文件
    void deleteFilesByUrls(targets.flatMap((v) => [v.videoUrl, v.coverUrl]));
    setSelected(new Set());
    await onRefresh();
  }

  async function handleToggleStatus(item: VideoItem) {
    const nextStatus: ContentStatus = item.status === 'published' ? 'draft' : 'published';
    await api.updateVideo(item.id, { status: nextStatus });
    await onRefresh();
  }

  return (
    <>
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="bg-white rounded-[18px] border border-[#E5E5EA] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-[320px]">
            <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="搜索视频标题或分类..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#F5F5F7] text-[13px] text-[#1D1D1F] placeholder:text-[#86868B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 transition-all"
            />
          </div>

          <div className="flex items-center p-0.5 bg-[#F2F2F7] rounded-[10px]">
            {(
              [
                { key: 'all', label: '全部' },
                { key: 'published', label: '已发布' },
                { key: 'draft', label: '私密' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => changeQuery({ status: tab.key === 'all' ? undefined : tab.key, current: 1 })}
                className={`px-3 py-1 text-[12px] font-medium rounded-[8px] transition-all whitespace-nowrap shrink-0 ${
                  statusFilter === tab.key
                    ? 'bg-white text-[#1D1D1F] shadow-xs'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <SortOrderButton
            order={sortOrder}
            onChange={(order) => changeQuery({ sortOrder: order, current: 1 })}
          />

          <div className="flex items-center p-0.5 bg-[#F2F2F7] rounded-[10px]">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="网格视图"
              className={`p-1.5 rounded-[8px] transition-colors ${
                viewMode === 'grid' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#6E6E73]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="列表视图"
              className={`p-1.5 rounded-[8px] transition-colors ${
                viewMode === 'list' ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#6E6E73]'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {canAdd && (
            <button
              type="button"
              onClick={() => onOpen('new')}
              className="h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>上传视频</span>
            </button>
          )}
        </div>
      </div>

      {/* 分类筛选：与图文/文章管理页一致的 chip 条 */}
      {categoryChips.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {[{ code: 'all', label: '全部' }, ...categoryChips].map((chip) => {
            const active = categoryFilter === chip.code;
            return (
              <button
                key={chip.code}
                type="button"
                onClick={() => changeQuery({ category: chip.code === 'all' ? undefined : chip.code, current: 1 })}
                aria-pressed={active}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] transition-colors ${
                  active
                    ? 'bg-[#1D1D1F] font-medium text-white'
                    : 'bg-black/[0.04] text-[#6E6E73] hover:bg-black/[0.07]'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      )}

      {/* 全选、批量操作与分页整合在同一行 */}
      {videos.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[14px] border border-[#E5E5EA] bg-white px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            {canDelete && (
              <>
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  aria-label={allSelected ? '取消全选' : '全选'}
                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                    allSelected
                      ? 'border-[#0071E3] bg-[#0071E3] text-white'
                      : someSelected
                        ? 'border-[#0071E3] text-[#0071E3]'
                        : 'border-[#C7C7CC] text-transparent'
                  }`}
                >
                  {allSelected ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : someSelected ? (
                    <span className="h-0.5 w-2 rounded-full bg-[#0071E3]" />
                  ) : null}
                </button>
                <span
                  className={`text-[13px] font-medium ${
                    selected.size > 0 ? 'text-[#0071E3]' : 'text-[#6E6E73]'
                  }`}
                >
                  全选 · 已选择 {selected.size} 个视频
                </span>
              </>
            )}
            <span className="text-[12px] text-[#86868B]">
              共 {total} 个视频 · 第 {currentPage}/{totalPages} 页
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[12px] text-[#86868B]">
              每页
              <select
                value={query.size}
                disabled={loading}
                onChange={(e) => changeQuery({ size: Number(e.target.value), current: 1 })}
                className="h-8 px-2 rounded-lg border border-[#E5E5EA] bg-white text-[#3A3A3C] text-[12px] disabled:opacity-50"
              >
                {[20, 50, 100].map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              条
            </label>
            <button
              type="button"
              disabled={loading || currentPage <= 1}
              onClick={() => changeQuery({ current: currentPage - 1 })}
              className="h-8 w-8 rounded-lg border border-[#E5E5EA] flex items-center justify-center text-[#3A3A3C] hover:bg-[#F5F5F7] disabled:opacity-40 transition-colors"
              aria-label="上一页"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={loading || currentPage >= totalPages}
              onClick={() => changeQuery({ current: currentPage + 1 })}
              className="h-8 w-8 rounded-lg border border-[#E5E5EA] flex items-center justify-center text-[#3A3A3C] hover:bg-[#F5F5F7] disabled:opacity-40 transition-colors"
              aria-label="下一页"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {canDelete && (
              <>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  disabled={selected.size === 0}
                  className="h-8 px-3 rounded-[10px] text-[12px] font-medium text-[#6E6E73] hover:bg-[#F5F5F7] disabled:opacity-40 disabled:hover:bg-transparent transition-colors inline-flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  取消选择
                </button>
                <button
                  type="button"
                  onClick={requestBatchDelete}
                  disabled={selected.size === 0}
                  className="h-8 px-3 rounded-[10px] bg-[#FF3B30] hover:bg-[#D70015] disabled:opacity-40 text-white text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  批量删除{selected.size > 0 ? ` (${selected.size})` : ''}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {videos.length === 0 ? (
          <div className="bg-white rounded-[18px] border border-[#E5E5EA] py-16 px-6 text-center">
          <Film className="w-10 h-10 text-[#C7C7CC] mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-[16px] font-semibold text-[#1D1D1F]">暂无匹配的视频内容</h3>
          <p className="text-[13px] text-[#6E6E73] mt-1">
            拖拽 MP4、MOV 或 WebM 文件即可快速上传并自动生成视频封面
          </p>
          {canAdd && (
            <button
              type="button"
              onClick={() => onOpen('new')}
              className="mt-5 h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5"
            >
              <UploadCloud className="w-4 h-4" />
              <span>立即上传首个视频</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {videos.map((item) => (
            <article
              key={item.id}
              onClick={canDelete ? () => toggleSelect(item.id) : undefined}
              className={`bg-white rounded-[18px] border overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col transition-colors ${
                selected.has(item.id)
                  ? 'border-[#0071E3] ring-1 ring-[#0071E3]/30'
                  : 'border-[#E5E5EA]'
              } ${canDelete ? 'cursor-pointer' : ''}`}
            >
              <div
                className="relative aspect-video bg-black overflow-hidden group"
                onClick={(event) => event.stopPropagation()}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId((id) => (id === item.id ? null : id))}
              >
                <VideoCardPreview
                  videoUrl={item.videoUrl}
                  coverUrl={item.coverUrl}
                  title={item.title}
                  hovered={hoveredId === item.id}
                />
                {canDelete && (
                  <button
                    type="button"
                    aria-label={selected.has(item.id) ? `取消选择 ${item.title}` : `选择 ${item.title}`}
                    aria-pressed={selected.has(item.id)}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleSelect(item.id);
                    }}
                    className={`absolute left-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-md border shadow-sm backdrop-blur-sm transition-colors ${
                      selected.has(item.id)
                        ? 'border-[#0071E3] bg-[#0071E3] text-white'
                        : 'border-white/70 bg-black/35 text-transparent hover:bg-black/55'
                    }`}
                  >
                    {selected.has(item.id) ? (
                      <Check className="h-4 w-4" strokeWidth={3} />
                    ) : (
                      <Square className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>

              <div className="p-3 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 text-[12px] text-[#6E6E73] mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span>{categoryName(item.category)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{formatDateShort(item.updatedAt)}</span>
                    </div>
                    <span
                      className={`font-medium shrink-0 ${
                        item.status === 'published' ? 'text-[#16A34A]' : 'text-[#D97706]'
                      }`}
                    >
                      {item.status === 'published' ? '已发布' : '私密'}
                    </span>
                  </div>

                  <h3 className="text-[14px] font-semibold text-[#1D1D1F] leading-snug line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="mt-0.5 text-[12px] text-[#6E6E73] line-clamp-1 leading-relaxed">
                    {item.description || '暂无视频简介说明'}
                  </p>
                </div>

                <div className="mt-2 pt-2 border-t border-[#F2F2F7] flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate text-[12px] text-[#86868B] tabular-nums">
                    {formatNumber(item.views)} 次播放 · {formatFileSize(item.fileSizeBytes)}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => void handleToggleStatus(item)}
                        className="px-2 py-1 rounded-lg text-[12px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors whitespace-nowrap"
                      >
                        {item.status === 'published' ? '转私密' : '发布'}
                      </button>
                    )}
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => onOpen('edit', item.id)}
                        aria-label={`编辑 ${item.title}`}
                        className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#0071E3] hover:bg-[#F5F5F7] transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => requestDelete(item)}
                        aria-label={`删除 ${item.title}`}
                        className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#D70015] hover:bg-[#FF3B30]/8 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E5EA] text-[12px] font-medium text-[#86868B]">
                  {canDelete && (
                    <th className="py-3 pl-5 pr-1 w-10">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        aria-label={allSelected ? '取消全选' : '全选'}
                        className={`flex h-4 w-4 items-center justify-center rounded border ${
                          allSelected
                            ? 'border-[#0071E3] bg-[#0071E3] text-white'
                            : someSelected
                              ? 'border-[#0071E3] text-[#0071E3]'
                              : 'border-[#C7C7CC] text-transparent'
                        }`}
                      >
                        {allSelected ? (
                          <Check className="h-3 w-3" strokeWidth={3} />
                        ) : someSelected ? (
                          <span className="h-0.5 w-2 rounded-full bg-[#0071E3]" />
                        ) : null}
                      </button>
                    </th>
                  )}
                  <th className="py-3 px-5">视频内容</th>
                  <th className="py-3 px-4">分类</th>
                  <th className="py-3 px-4">时长 / 画质</th>
                  <th className="py-3 px-4 text-right">播放量</th>
                  <th className="py-3 px-4">状态</th>
                  <th className="py-3 px-5 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F2F7] text-[13px]">
                {videos.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F5F5F7]/60 transition-colors">
                    {canDelete && (
                      <td className="py-3 pl-5 pr-1">
                        <button
                          type="button"
                          onClick={() => toggleSelect(item.id)}
                          aria-label={selected.has(item.id) ? `取消选择 ${item.title}` : `选择 ${item.title}`}
                          aria-pressed={selected.has(item.id)}
                          className={`flex h-4 w-4 items-center justify-center rounded border ${
                            selected.has(item.id)
                              ? 'border-[#0071E3] bg-[#0071E3] text-white'
                              : 'border-[#C7C7CC] text-transparent'
                          }`}
                        >
                          {selected.has(item.id) && <Check className="h-3 w-3" strokeWidth={3} />}
                        </button>
                      </td>
                    )}
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-3 min-w-[240px]">
                        <div className="relative w-20 h-11 rounded-lg overflow-hidden bg-[#F2F2F7] shrink-0">
                          <MediaImage
                            src={normalizeFileUrl(item.coverUrl)}
                            alt={`${item.title} 封面`}
                            fallbackLabel={item.title}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <Play className="w-4 h-4 text-white fill-white/90" strokeWidth={1.6} />
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-[#1D1D1F] truncate max-w-[280px]">
                            {item.title}
                          </div>
                          <div className="text-[12px] text-[#86868B] tabular-nums">
                            {formatDateShort(item.updatedAt)} · {item.authorName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[#6E6E73] whitespace-nowrap">
                      {categoryName(item.category)}
                    </td>
                    <td className="py-3 px-4 text-[#6E6E73] font-mono tabular-nums whitespace-nowrap">
                      {formatDuration(item.durationSec)} · {item.resolution}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-[#1D1D1F] tabular-nums">
                      {formatNumber(item.views)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`font-medium ${
                          item.status === 'published' ? 'text-[#16A34A]' : 'text-[#D97706]'
                        }`}
                      >
                        {item.status === 'published' ? '已发布' : '私密'}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => onOpen('edit', item.id)}
                            className="px-2.5 py-1 rounded-lg text-[12px] text-[#0071E3] hover:bg-[#0071E3]/8 font-medium"
                          >
                            编辑
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => requestDelete(item)}
                            className="px-2.5 py-1 rounded-lg text-[12px] text-[#D70015] hover:bg-[#FF3B30]/8 font-medium"
                          >
                            删除
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>

    {/* 通用删除确认模态框：单条与批量共用 */}
    {pendingDelete.length > 0 && (
      <DeleteConfirmModal
        title={pendingDelete.length === 1 ? '确认删除该视频？' : `确认删除 ${pendingDelete.length} 个视频？`}
        itemTitles={pendingDelete.map((v) => v.title)}
        description="此操作不可撤销，视频记录、封面图与视频源文件将一并永久删除。"
        onConfirm={handleConfirmDelete}
        onClose={() => setPendingDelete([])}
      />
    )}
    </>
  );
}
