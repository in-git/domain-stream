import { motion } from 'motion/react';
import { Play } from 'lucide-react';
import type { VideoItem } from '../../types/content';
import { SWIFTUI_SMOOTH } from '../../lib/motion';
import { ResilientImage } from '../../components/ResilientImage';
import type { CategoryBarProps, VideoGridProps } from './shared';

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
 * 卡片模式：移动端网格卡片（标题在封面下方）
 * ------------------------------------------------------------------ */
interface MobileGridCardProps {
  video: VideoItem;
  index: number;
  onOpen: () => void;
}

function MobileGridCard({ video, index, onOpen }: MobileGridCardProps) {
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
        </div>
        <div className="px-2 py-2">
          <h3 className="text-[12px] leading-snug text-app-text line-clamp-2">{video.title}</h3>
        </div>
      </div>
    </motion.article>
  );
}

export function MobileVideoGrid({
  videos,
  likedIds,
  savedIds,
  onOpen,
}: VideoGridProps) {
  return (
    <div className="sm:hidden">
      {videos.length > 0 && <MobileBanner video={videos[0]} onOpen={() => onOpen(videos[0])} />}
      <div className="grid grid-cols-2 gap-2">
        {videos.slice(1).map((video, idx) => (
          <MobileGridCard
            key={video.id}
            video={video}
            index={idx + 1}
            onOpen={() => onOpen(video)}
          />
        ))}
      </div>
    </div>
  );
}
