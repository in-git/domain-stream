/**
 * 视频选择器
 * ------------------------------------------------------------------
 * 从「视频模块」的记录里挑选视频的弹窗，UI 形式与交互对齐文件中心（FilePicker）：
 * 状态 tab（全部 / 已发布 / 私密）+ 视频分类筛选 + 搜索 + 封面网格 + 服务端分页。
 *
 * 用法：
 *   <VideoPicker
 *     open={open}
 *     onClose={() => setOpen(false)}
 *     onSelect={(videos) => ...}   // 返回选中的 VideoItem[]（含 id/title/videoUrl/coverUrl 等）
 *     multiple                      // 默认单选：单击选中、双击确认
 *     title="选择视频"
 *   />
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Clapperboard, Film, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { api } from '../lib/api.ts';
import { normalizeFileUrl } from '../lib/fileCenter.ts';
import { usePublishCategories } from '../lib/usePublishCategories.ts';
import { formatDuration } from '../lib/format.ts';
import { MediaImage } from './MediaImage.tsx';
import type { VideoItem } from '../types/cms.ts';

const PAGE_SIZE = 24;

type StatusTab = 'all' | 'published' | 'draft';

const STATUS_TABS: Array<{ value: StatusTab; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'published', label: '已发布' },
  { value: 'draft', label: '私密' },
];

interface VideoPickerProps {
  open: boolean;
  onClose: () => void;
  /** 确认后回调；multiple 时为全部选中项，否则为单个元素数组 */
  onSelect: (videos: VideoItem[]) => void;
  /** 是否多选，默认 false（单选：单击替换选中项，双击确认） */
  multiple?: boolean;
  /** 弹窗标题 */
  title?: string;
}

export function VideoPicker({ open, onClose, onSelect, multiple = false, title = '选择视频' }: VideoPickerProps) {
  const [status, setStatus] = useState<StatusTab>('all');
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  /** 已加载过的视频，翻页后仍能确认之前选中的项 */
  const videoCache = useRef<Map<string, VideoItem>>(new Map());

  // 视频模块的发布分类，与发布表单共用同一份缓存
  const { options: categories } = usePublishCategories('VIDEO');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.getVideos({
        current: page,
        size: PAGE_SIZE,
        searchKey: search.trim() || undefined,
        category: category || undefined,
        status: status === 'all' ? undefined : status,
      });
      (result.items || []).forEach((item) => videoCache.current.set(item.id, item));
      setVideos(result.items || []);
      setTotal(result.total || 0);
    } catch (err) {
      setVideos([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : '视频加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, status, category, search]);

  useEffect(() => {
    if (!open) return undefined;
    void load();
    return undefined;
  }, [open, load]);

  // 关闭时复位到默认状态，下次打开与首次一致
  useEffect(() => {
    if (open) return;
    setSelected([]);
    setSearch('');
    setCategory('');
    setStatus('all');
    setPage(1);
  }, [open]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function toggle(id: string) {
    setSelected((prev) => {
      if (!multiple) return prev.includes(id) ? [] : [id];
      return prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
    });
  }

  function confirmSelection() {
    const chosen = selected
      .map((id) => videoCache.current.get(id))
      .filter((item): item is VideoItem => Boolean(item));
    if (!chosen.length) return;
    onSelect(chosen);
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100010] flex items-center justify-center bg-black/50 px-4 py-4">
      <div className="w-full max-w-[min(1440px,96vw)] h-[min(94vh,1000px)] flex flex-col bg-white rounded-2xl shadow-[0_40px_120px_rgba(0,0,0,0.45)] border border-[#E5E5EA] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5EA]">
          <div>
            <h3 className="text-[16px] font-semibold text-[#1D1D1F] flex items-center gap-2">
              <Clapperboard className="w-4 h-4 text-[#0071E3]" />
              {title}
            </h3>
            <p className="mt-0.5 text-[11px] text-[#86868B]">
              来自视频模块的发布记录 · 单击选择，双击确认
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

        {/* 工具栏：状态 tab + 搜索 + 刷新 */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-[#E5E5EA] bg-[#FAFAFC]">
          <div className="flex items-center p-0.5 rounded-lg bg-[#EDEDF1]">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  setStatus(tab.value);
                  setPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-[12px] transition-colors ${
                  status === tab.value
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
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="搜索视频标题"
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
        </div>

        {/* 视频分类筛选：与发布表单同一份分类 */}
        {categories.length > 0 && (
          <div
            role="radiogroup"
            aria-label="按视频分类筛选"
            className="flex flex-wrap items-center gap-1.5 px-5 py-2.5 border-b border-[#E5E5EA] bg-white"
          >
            <span className="mr-1 text-[12px] text-[#86868B]">视频分类</span>
            {[{ code: '', name: '全部' }, ...categories].map((item) => {
              const active = category === item.code;
              return (
                <button
                  key={item.code || 'all'}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setCategory(item.code);
                    setPage(1);
                  }}
                  className={`h-7 px-2.5 rounded-lg text-[12px] transition-colors ${
                    active
                      ? 'bg-[#0071E3]/10 text-[#0071E3] font-medium'
                      : 'text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
                  }`}
                >
                  {item.name}
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

        {/* 视频网格 */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-[13px] text-[#86868B]">
              <Loader2 className="w-4 h-4 animate-spin" />
              正在加载视频...
            </div>
          ) : videos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-20 text-[13px] text-[#86868B]">
              <Film className="w-8 h-8 text-[#C7C7CC]" />
              没有符合条件的视频
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-1.5">
              {videos.map((video) => {
                const selectedVideo = selected.includes(video.id);
                return (
                  <div
                    key={video.id}
                    role="button"
                    tabIndex={0}
                    title={`${video.title}${video.durationSec ? ` · ${formatDuration(video.durationSec)}` : ''}`}
                    onClick={() => toggle(video.id)}
                    onDoubleClick={() => {
                      toggle(video.id);
                      confirmSelection();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggle(video.id);
                      }
                    }}
                    className={`group relative p-1.5 rounded-[14px] cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]/40 ${
                      selectedVideo ? 'bg-[#0071E3]/8' : 'hover:bg-[#F5F5F7]'
                    }`}
                  >
                    <div
                      className={`relative aspect-video rounded-[11px] overflow-hidden ${
                        selectedVideo ? 'ring-2 ring-[#0071E3]' : 'ring-1 ring-black/5'
                      }`}
                    >
                      <MediaImage
                        src={normalizeFileUrl(video.coverUrl)}
                        alt={video.title}
                        fallbackLabel="视频"
                        className="w-full h-full object-cover"
                      />

                      {selectedVideo && (
                        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#0071E3] text-white flex items-center justify-center shadow-sm">
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </span>
                      )}
                      {/* 视频标题：绝对定位在左上角，过长截断，给右上角选中勾留出空间 */}
                      <span
                        title={video.title}
                        className="absolute top-1.5 left-1.5 max-w-[calc(100%-44px)] truncate px-1.5 py-0.5 rounded-md bg-black/55 text-white text-[9px] leading-none"
                      >
                        {video.title || video.id}
                      </span>
                      <span
                        className={`absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] leading-none ${
                          video.status === 'published'
                            ? 'bg-black/55 text-white'
                            : 'bg-[#D97706]/85 text-white'
                        }`}
                      >
                        {video.status === 'published' ? '已发布' : '私密'}
                      </span>
                      {video.durationSec > 0 && (
                        <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-black/55 text-white text-[9px] leading-none tabular-nums">
                          {formatDuration(video.durationSec)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部：计数 + 分页 + 操作 */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-[#E5E5EA] bg-[#FAFAFC]">
          <div className="flex items-center gap-3 text-[12px] text-[#6E6E73]">
            <span>共 {total} 个视频</span>
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

export default VideoPicker;
