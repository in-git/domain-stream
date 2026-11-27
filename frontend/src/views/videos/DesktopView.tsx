import { motion } from 'motion/react';
import { Star, Heart, Rows3 } from 'lucide-react';
import type { VideoItem } from '../../types/content';
import { SWIFTUI_BOUNCY, SWIFTUI_SMOOTH } from '../../lib/motion';
import { ResilientImage } from '../../components/ResilientImage';
import type { CategoryBarProps, VideoGridProps } from './shared';

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
    <div className="sticky top-14 z-10 hidden bg-app-surface/95 px-2 backdrop-blur-xl dark:bg-black/95 sm:block sm:px-1.5 md:px-2 lg:px-3 xl:px-4 2xl:px-4">
      <div className="flex items-center gap-2 py-2 sm:gap-1.5 sm:py-1.5 md:gap-2 md:py-2 lg:gap-3 lg:py-3 xl:gap-4 xl:py-4 2xl:gap-4 2xl:py-4">
        <div
          role="tablist"
          aria-label="视频分类"
          className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto sm:gap-1.5 md:gap-2 lg:gap-3 xl:gap-4 2xl:gap-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                    ? 'bg-app-primary font-medium text-white dark:bg-app-card dark:text-app-text'
                    : 'bg-black/[0.04] text-app-muted hover:bg-black/[0.07] dark:bg-white/[0.08] dark:text-app-muted'
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
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-app-muted transition-colors hover:bg-black/[0.07] dark:bg-white/[0.08] dark:text-app-muted dark:hover:bg-white/[0.12]"
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
      <div className="group overflow-hidden rounded-app">
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
          <span className="absolute right-2 top-2 rounded-app bg-black/60 px-2 py-0.5 text-[10px] font-mono-tabular text-white">
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
                saved ? 'bg-app-favorite/25 text-app-favorite' : 'bg-black/45 text-white hover:bg-black/60'
              }`}
            >
              <Star className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
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
    <div className="hidden grid-cols-2 gap-2 sm:gap-1.5 md:grid md:grid-cols-3 md:gap-2 lg:gap-3 xl:grid-cols-4 xl:gap-4 2xl:grid-cols-5 2xl:gap-4">
      {videos.map((video, idx) => (
        <DesktopGridCard
          key={`${video.id}-${idx}`}
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

/** 首屏加载中的骨架：列数与卡片比例和真实网格一致 */
export function DesktopGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="hidden grid-cols-2 gap-2 sm:gap-1.5 md:grid md:grid-cols-3 md:gap-2 lg:gap-3 xl:grid-cols-4 xl:gap-4 2xl:grid-cols-5 2xl:gap-4">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="w-full animate-pulse rounded-app bg-white/10"
          style={{ aspectRatio: '16 / 9' }}
        />
      ))}
    </div>
  );
}

