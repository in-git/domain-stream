import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { VideoItem } from '../../types/content';
import { VideoWaterfall } from './VideoWaterfall';

/** PC 播放列表卡片固定宽度，高度由封面比例决定 */
const CARD_WIDTH = 264;
const CARD_GAP = 8;

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
        <VideoWaterfall
          videos={videos}
          activeId={videos[activeIndex]?.id}
          onSelect={onSelect}
          columns={2}
          gap={CARD_GAP}
          columnWidth={CARD_WIDTH}
          className="justify-center p-2"
        />

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
