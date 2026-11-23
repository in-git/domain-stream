import { motion } from 'motion/react';
import { Bookmark, Heart, LayoutGrid, Rows3 } from 'lucide-react';
import type { VideoItem } from '../../data/content';
import { SWIFTUI_BOUNCY, SWIFTUI_SMOOTH } from '../../lib/motion';
import { ResilientImage } from '../../components/ResilientImage';
import type { CategoryBarProps, VideoGridProps } from './shared';

/* ------------------------------------------------------------------ *
 * 沉浸刷看模式：悬浮在播放器顶部的分类条（PC 专属）
 * ------------------------------------------------------------------ */
interface DesktopFeedCategoriesProps extends CategoryBarProps {
  onTogglePlaylist: () => void;
  playlistOpen: boolean;
}

export function DesktopFeedCategories({
  categories,
  category,
  onChange,
  onTogglePlaylist,
  playlistOpen,
}: DesktopFeedCategoriesProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 hidden justify-center sm:flex">
      <div
        role="tablist"
        aria-label="视频分类"
        className="pointer-events-auto mt-4 inline-flex max-w-[calc(100%-2rem)] items-center gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-black/45 p-1.5 backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {(['全部', ...categories] as const).map((item) => {
          const active = category === item;
          return (
            <button
              key={item}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item)}
              className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? 'bg-white text-[#1D1D1F]'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item}
            </button>
          );
        })}
        <span className="mx-1 h-4 w-px shrink-0 bg-white/20" aria-hidden="true" />
        <button
          type="button"
          onClick={onTogglePlaylist}
          aria-label={playlistOpen ? '收起播放列表' : '展开播放列表'}
          title={playlistOpen ? '收起播放列表' : '播放列表'}
          aria-pressed={playlistOpen}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors ${
            playlistOpen
              ? 'bg-white text-[#1D1D1F]'
              : 'text-white/70 hover:bg-white/10 hover:text-white'
          }`}
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 卡片模式：顶部分类与视图切换（PC 专属）
 * ------------------------------------------------------------------ */
interface DesktopGridCategoriesProps extends CategoryBarProps {
  onBackToFeed: () => void;
}

export function DesktopGridCategories({
  categories,
  category,
  onChange,
  onBackToFeed,
}: DesktopGridCategoriesProps) {
  return (
    <div className="sticky top-14 z-10 hidden bg-[#FBFBFD]/95 px-2.5 backdrop-blur-xl dark:bg-black/95 sm:block sm:px-1.5 md:px-2 lg:px-3 xl:px-4 2xl:px-4">
      <div className="flex items-center gap-2.5 py-2.5 sm:gap-1.5 sm:py-1.5 md:gap-2 md:py-2 lg:gap-3 lg:py-3 xl:gap-4 xl:py-4 2xl:gap-4 2xl:py-4">
        <div
          role="tablist"
          aria-label="视频分类"
          className="flex min-w-0 flex-1 items-center gap-2.5 overflow-x-auto sm:gap-1.5 md:gap-2 lg:gap-3 xl:gap-4 2xl:gap-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {(['全部', ...categories] as const).map((item) => {
            const active = category === item;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChange(item)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] transition-colors ${
                  active
                    ? 'bg-[#1D1D1F] font-medium text-white dark:bg-white dark:text-[#1D1D1F]'
                    : 'bg-black/[0.04] text-[#6E6E73] hover:bg-black/[0.07] dark:bg-white/[0.08] dark:text-[#98989D]'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* 切回主视图：卡片模式专用，样式与 chip 条统一 */}
        <button
          type="button"
          onClick={onBackToFeed}
          aria-label="切回主视图"
          title="切回主视图"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-[#6E6E73] transition-colors hover:bg-black/[0.07] dark:bg-white/[0.08] dark:text-[#98989D] dark:hover:bg-white/[0.12]"
        >
          <Rows3 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 卡片模式：PC 网格（标题叠封面 + 右下角点赞收藏）
 * ------------------------------------------------------------------ */
interface DesktopGridCardProps {
  video: VideoItem;
  index: number;
  liked: boolean;
  saved: boolean;
  onOpen: () => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
}

function DesktopGridCard({
  video,
  index,
  liked,
  saved,
  onOpen,
  onToggleLike,
  onToggleSave,
}: DesktopGridCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SWIFTUI_SMOOTH, delay: index * 0.03 }}
      className="min-w-0"
    >
      <div className="group overflow-hidden rounded-md">
        <div className="relative overflow-hidden">
          <button
            type="button"
            onClick={onOpen}
            aria-label={`播放 ${video.title}`}
            className="block w-full text-left focus-visible:outline-none"
          >
            <ResilientImage
              src={video.cover}
              alt={video.title}
              fallbackTitle={video.title}
              className="w-full aspect-[16/9] transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            />
          </button>
          <span className="absolute left-2 top-2 px-2 py-0.5 rounded-full bg-black/45 text-[10px] font-medium text-white backdrop-blur-sm">
            {video.category}
          </span>
          <span className="absolute right-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-mono-tabular text-white">
            {video.durationLabel}
          </span>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
          <div className="pointer-events-none absolute bottom-2 left-2.5 right-[4.75rem] z-10">
            <h3 className="truncate text-[18px] font-semibold leading-snug text-white">
              {video.title.length > 20 ? `${video.title.slice(0, 20)}…` : video.title}
            </h3>
            <p className="mt-0.5 text-[12px] leading-relaxed text-white/75 line-clamp-1">
              {video.description || video.subtitle}
            </p>
          </div>
          <div className="absolute bottom-2 right-2 z-10 flex items-center gap-1.5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              transition={SWIFTUI_BOUNCY}
              onClick={onToggleLike}
              aria-label={liked ? '取消点赞视频' : '点赞视频'}
              aria-pressed={liked}
              className={`flex items-center justify-center w-8 h-8 rounded-full backdrop-blur-sm transition-colors ${
                liked ? 'bg-[#FF2E4D] text-white' : 'bg-black/45 text-white hover:bg-black/60'
              }`}
            >
              <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              transition={SWIFTUI_BOUNCY}
              onClick={onToggleSave}
              aria-label={saved ? '取消收藏视频' : '收藏视频'}
              aria-pressed={saved}
              className={`flex items-center justify-center w-8 h-8 rounded-full backdrop-blur-sm transition-colors ${
                saved ? 'bg-[#0071E3] text-white' : 'bg-black/45 text-white hover:bg-black/60'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function DesktopVideoGrid({
  videos,
  likedIds,
  savedIds,
  onToggleLike,
  onToggleSave,
  onOpen,
}: VideoGridProps) {
  return (
    <div className="hidden grid-cols-2 gap-2.5 sm:gap-1.5 md:grid md:grid-cols-3 md:gap-2 lg:gap-3 xl:grid-cols-4 xl:gap-4 2xl:grid-cols-5 2xl:gap-4">
      {videos.map((video, idx) => (
        <DesktopGridCard
          key={video.id}
          video={video}
          index={idx}
          liked={likedIds.includes(video.id)}
          saved={savedIds.includes(video.id)}
          onToggleLike={() => onToggleLike(video.id)}
          onToggleSave={() => onToggleSave(video.id)}
          onOpen={() => onOpen(video)}
        />
      ))}
    </div>
  );
}
