import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, X } from 'lucide-react';
import type { VideoItem } from '../../types/content';
import { ResilientImage } from '../../components/ResilientImage';
import { formatTime } from './shared';

/** PC 播放列表卡片固定宽度；高度按视频原始宽高等比换算 */
const CARD_WIDTH = 264;

interface PlaylistPanelProps {
  videos: VideoItem[];
  categories: string[];
  category: string;
  onCategoryChange: (category: string) => void;
  activeIndex: number;
  onSelect: (video: VideoItem) => void;
  onClose: () => void;
  /** 是否还有下一批视频，触底时由外部拉取 */
  hasMore?: boolean;
  loadingMore?: boolean;
  loadMoreError?: string;
  onLoadMore?: () => void;
}

/** PC 沉浸模式播放列表侧边栏：贴顶固定 + 双列瀑布流 + 触底加载更多 */
export function PlaylistPanel({
  videos,
  categories,
  category,
  onCategoryChange,
  activeIndex,
  onSelect,
  onClose,
  hasMore = false,
  loadingMore = false,
  loadMoreError,
  onLoadMore,
}: PlaylistPanelProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  /**
   * 老数据 extJson 里没有宽高时，读取视频文件真实 metadata。
   * 只在卡片接近视口时探测，最多并发 3 个，避免一次性拉取全部视频。
   */
  const [probedSizes, setProbedSizes] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const videosRef = useRef(videos);
  videosRef.current = videos;
  const probeStateRef = useRef({
    queue: [] as string[],
    active: 0,
    pending: new Set<string>(),
    failed: new Set<string>(),
    cancelled: false,
  });
  const pumpProbeRef = useRef<() => void>(() => {});
  pumpProbeRef.current = () => {
    const state = probeStateRef.current;
    while (!state.cancelled && state.active < 3 && state.queue.length > 0) {
      const id = state.queue.shift();
      if (!id || state.failed.has(id)) continue;
      const video = videosRef.current.find((item) => item.id === id);
      if (!video?.src) continue;
      state.active += 1;

      const element = document.createElement('video');
      let settled = false;
      let timer = 0;
      const finish = (width: number, height: number) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        if (width > 0 && height > 0 && !state.cancelled) {
          setProbedSizes((prev) =>
            prev[id] ? prev : { ...prev, [id]: { width, height } }
          );
        } else {
          state.failed.add(id);
        }
        element.onloadedmetadata = null;
        element.onerror = null;
        element.removeAttribute('src');
        element.load();
        state.active -= 1;
        pumpProbeRef.current();
      };

      element.preload = 'metadata';
      element.muted = true;
      element.playsInline = true;
      element.onloadedmetadata = () => finish(element.videoWidth, element.videoHeight);
      element.onerror = () => finish(0, 0);
      timer = window.setTimeout(() => finish(0, 0), 8000);
      element.src = video.src;
    }
  };

  const enqueueProbe = useCallback(
    (id: string) => {
      const state = probeStateRef.current;
      if (!id || state.pending.has(id) || state.failed.has(id) || probedSizes[id]) return;
      state.pending.add(id);
      state.queue.push(id);
      pumpProbeRef.current();
    },
    [probedSizes]
  );

  useEffect(() => {
    probeStateRef.current.cancelled = false;
    return () => {
      probeStateRef.current.cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = (entry.target as HTMLElement).dataset.videoDimId;
          if (id) enqueueProbe(id);
          observer.unobserve(entry.target);
        });
      },
      { root, rootMargin: '300px' }
    );
    root.querySelectorAll<HTMLElement>('[data-video-dim-id]').forEach((node) => {
      observer.observe(node);
    });
    return () => observer.disconnect();
  }, [videos, probedSizes, enqueueProbe]);

  const cardHeightFor = useCallback(
    (video: VideoItem) => {
      const probed = probedSizes[video.id];
      const width = probed?.width ?? video.width;
      const height = probed?.height ?? video.height;
      if (width > 0 && height > 0) {
        return Math.max(148, Math.min(560, Math.round((CARD_WIDTH * height) / width)));
      }
      return Math.round((CARD_WIDTH * 9) / 16);
    },
    [probedSizes]
  );

  // 按当前列高把下一张卡片放进更短的一列，避免长视频集中到同一侧
  const columns = useMemo(() => {
    const result: Array<Array<{ video: VideoItem; index: number }>> = [[], []];
    const columnHeights = [8, 8];
    videos.forEach((video, index) => {
      const target = columnHeights[0] <= columnHeights[1] ? 0 : 1;
      result[target].push({ video, index });
      columnHeights[target] += cardHeightFor(video) + 8;
    });
    return result;
  }, [cardHeightFor, videos]);

  // 分类切换后回到列表顶部
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [category]);

  // 滚动到底部自动拉取下一批视频（以侧边栏滚动区为 root）
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root || !hasMore || loadingMore || loadMoreError || !onLoadMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { root, rootMargin: '120px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadMoreError, onLoadMore, videos.length]);

  return (
    <aside className="fixed bottom-0 right-0 top-0 z-50 flex w-[560px] max-w-[92vw] flex-col border-l border-white/15 bg-[#1C1C1E]/95 shadow-[-12px_0_32px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-white/25 to-transparent"
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
      <div className="shrink-0 border-b border-white/10 px-3 py-2">
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
                    ? 'bg-app-card font-medium text-app-text'
                    : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.14]'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {/* 视频列表（双列固定宽度瀑布流，可滚动，触底加载更多） */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto [scrollbar-width:thin]">
        <div className="flex justify-center gap-2 p-2">
          {columns.map((column, columnIndex) => (
            <div key={columnIndex} className="flex w-[264px] shrink-0 flex-col gap-2">
              {column.map(({ video, index }) => {
                const active = video.id === videos[activeIndex]?.id;
                const height = cardHeightFor(video);
                return (
                  <button
                    key={`${video.id}-${index}`}
                    type="button"
                    data-video-dim-id={video.id}
                    onClick={() => onSelect(video)}
                    style={{ width: CARD_WIDTH, height }}
                    className={`relative block shrink-0 overflow-hidden rounded-app border text-left transition-colors ${
                      active
                        ? 'border-app-primary/70 bg-white/[0.14]'
                        : 'border-white/5 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <ResilientImage
                      src={video.cover}
                      alt={video.title}
                      fallbackTitle={video.title}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <span
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/10"
                      aria-hidden="true"
                    />
                    <span className="absolute right-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] tabular-nums text-white/80">
                      {formatTime(video.durationSeconds ?? 0)}
                    </span>
                    {active && (
                      <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
                        <Play className="h-7 w-7 fill-white text-white" />
                      </span>
                    )}
                    <span className="pointer-events-none absolute bottom-1.5 left-1.5 right-1.5">
                      <span
                        className={`block truncate text-[12px] ${
                          active ? 'font-medium text-white' : 'text-white/90'
                        }`}
                      >
                        {video.title}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-white/55">
                        {video.category} · {video.director}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* 触底哨兵：滚动到这里时自动拉取下一批 */}
        {hasMore && <div ref={loadMoreRef} className="h-px w-full" aria-hidden="true" />}
        <div className="flex min-h-12 flex-col items-center justify-center gap-1 py-3 text-[11px] text-white/45">
          {loadingMore && <span>加载中…</span>}
          {!loadingMore && loadMoreError && (
            <>
              <span className="text-red-300">加载失败：{loadMoreError}</span>
              <button
                type="button"
                onClick={onLoadMore}
                className="rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[11px] text-white/80 transition-colors hover:bg-white/[0.12] hover:text-white"
              >
                重试
              </button>
            </>
          )}
          {!hasMore && videos.length > 0 && <span>没有更多了</span>}
        </div>
      </div>
    </aside>
  );
}
