import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import type { VideoItem } from '../../types/content';
import { SWIFTUI_SMOOTH } from '../../lib/motion';
import { ResilientImage } from '../../components/ResilientImage';
import type { CategoryBarProps, VideoGridProps } from './shared';
import { VideoWaterfall } from './VideoWaterfall';

/* ------------------------------------------------------------------ *
 * 卡片模式：移动端吸顶分类 chip 条
 * ------------------------------------------------------------------ */
export function MobileGridCategories({ categories, category, onChange }: CategoryBarProps) {
  return (
    <div className="sticky top-14 z-10 bg-black px-2 backdrop-blur-xl sm:hidden">
      <div className="flex items-center gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                active ? 'bg-app-card font-medium text-app-text' : 'bg-white/[0.08] text-app-muted'
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * 卡片模式：移动端顶部 banner（首条视频）
 * ------------------------------------------------------------------ */
function MobileBanner({ video, onOpen }: { video: VideoItem; onOpen: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SWIFTUI_SMOOTH}
      className="relative mb-2 overflow-hidden rounded-app bg-black"
    >
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left focus-visible:outline-none"
        aria-label={`播放视频：${video.title}`}
      >
        <ResilientImage
          src={video.cover}
          alt={video.title}
          fallbackTitle={video.title}
          className="h-48 w-full object-cover transition-transform duration-500 ease-out hover:scale-[1.02]"
        />
      </button>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/25 backdrop-blur-md">
          <Play className="h-6 w-6 fill-white text-white" />
        </span>
      </div>
      <div className="pointer-events-none absolute inset-x-3 bottom-3">
        <h2 className="text-xl font-semibold leading-tight text-white line-clamp-2">
          {video.title}
        </h2>
        {video.subtitle && (
          <p className="mt-1 text-[12px] leading-relaxed text-white/75 line-clamp-2">
            {video.subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ *
 * 卡片模式：移动端瀑布流（与 PC 侧边栏共用 VideoWaterfall）
 * ------------------------------------------------------------------ */
export function MobileVideoGrid({
  videos,
  onOpen,
  loading = false,
}: VideoGridProps & { loading?: boolean }) {
  return (
    <div className="sm:hidden">
      {videos.length > 0 && <MobileBanner video={videos[0]} onOpen={() => onOpen(videos[0])} />}
      <VideoWaterfall
        videos={videos.slice(1)}
        loading={loading}
        onSelect={onOpen}
        columns={2}
        gap={8}
        skeletonCount={8}
      />
    </div>
  );
}
