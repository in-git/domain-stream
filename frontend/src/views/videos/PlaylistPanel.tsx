import { useEffect, useMemo, useRef, useState } from 'react';
import { Play, X } from 'lucide-react';
import type { VideoItem } from '../../data/content';
import { ResilientImage } from '../../components/ResilientImage';
import { formatTime, VIDEO_PAGE_SIZE } from './shared';

interface PlaylistPanelProps {
  videos: VideoItem[];
  categories: string[];
  category: string;
  onCategoryChange: (category: string) => void;
  activeIndex: number;
  onSelect: (video: VideoItem) => void;
  onClose: () => void;
  /** 顶栏悬浮时侧栏下移，避免顶部被悬浮顶栏遮挡 */
  headerFloating?: boolean;
}

/** PC 沉浸模式播放列表侧边栏：顶部分类 + 分批加载更多 + 上下结构视频项 */
export function PlaylistPanel({
  videos,
  categories,
  category,
  onCategoryChange,
  activeIndex,
  onSelect,
  onClose,
  headerFloating = false,
}: PlaylistPanelProps) {
  const [visibleCount, setVisibleCount] = useState(VIDEO_PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const visibleVideos = useMemo(
    () => videos.slice(0, visibleCount),
    [videos, visibleCount]
  );
  const hasMore = visibleCount < videos.length;

  // 分类切换后重置分批数量
  useEffect(() => {
    setVisibleCount(VIDEO_PAGE_SIZE);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [category]);

  // 滚动到底部自动加载更多（IntersectionObserver 以侧边栏滚动区为 root）
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    const root = scrollRef.current;
    if (!sentinel || !hasMore || !root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) => Math.min(count + VIDEO_PAGE_SIZE, videos.length));
        }
      },
      { root, rootMargin: '120px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, videos.length]);

  return (
    <aside className={`absolute bottom-0 left-0 z-30 flex w-[320px] max-w-[85vw] flex-col border-r border-white/15 bg-[#1C1C1E]/95 shadow-[12px_0_32px_rgba(0,0,0,0.55)] backdrop-blur-xl ${headerFloating ? 'top-14' : 'top-0'}`}>
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/25 to-transparent"
        aria-hidden="true"
      />

      {/* 顶部：标题 + 关闭 */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <div>
          <h3 className="text-[14px] font-semibold text-white">播放列表</h3>
          <p className="mt-0.5 text-[11px] text-white/50">共 {videos.length} 个视频</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="收起播放列表"
          className="flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 顶部分类条 */}
      <div className="shrink-0 border-b border-white/10 px-3 py-2.5">
        <div
          role="tablist"
          aria-label="播放列表分类"
          className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {(['全部', ...categories] as string[]).map((item) => {
            const active = category === item;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onCategoryChange(item)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] transition-colors ${
                  active
                    ? 'bg-white font-medium text-[#1D1D1F]'
                    : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.14]'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {/* 视频列表（可滚动，触底加载更多） */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-2 [scrollbar-width:thin]">
        {visibleVideos.map((video, idx) => {
          const active = video.id === videos[activeIndex]?.id;
          return (
            <button
              key={video.id}
              type="button"
              onClick={() => onSelect(video)}
              className={`flex w-full flex-col gap-2 px-3 py-2.5 text-left transition-colors ${
                active ? 'bg-white/[0.14]' : 'hover:bg-white/[0.07]'
              }`}
            >
              <span className="relative block w-full overflow-hidden rounded-md bg-white/5 aspect-video">
                <ResilientImage
                  src={video.cover}
                  alt={video.title}
                  fallbackTitle={video.title}
                  className="h-full w-full object-cover"
                />
                <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-[9px] text-white tabular-nums">
                  {formatTime(video.durationSeconds ?? 0)}
                </span>
                {active && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="h-6 w-6 fill-white text-white" />
                  </span>
                )}
              </span>
              <span className="flex items-start gap-2">
                <span className="w-4 shrink-0 text-[11px] tabular-nums text-white/40">
                  {idx + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block truncate text-[12px] ${
                      active ? 'font-medium text-white' : 'text-white/80'
                    }`}
                  >
                    {video.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-white/45">
                    {video.category} · {video.director}
                  </span>
                </span>
              </span>
            </button>
          );
        })}

        {/* 加载更多 / 没有更多了 */}
        {hasMore ? (
          <div ref={loadMoreRef} className="flex justify-center py-4">
            <button
              type="button"
              onClick={() =>
                setVisibleCount((count) => Math.min(count + VIDEO_PAGE_SIZE, videos.length))
              }
              className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-1.5 text-[11px] text-white/75 transition-colors hover:bg-white/[0.12] hover:text-white"
            >
              加载更多
            </button>
          </div>
        ) : (
          videos.length > 0 && (
            <p className="py-4 text-center text-[11px] text-white/35">没有更多了</p>
          )
        )}
      </div>
    </aside>
  );
}
