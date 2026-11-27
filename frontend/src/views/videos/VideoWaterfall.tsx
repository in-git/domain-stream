import { useCallback, useMemo, useState } from 'react';
import { Play } from 'lucide-react';
import type { VideoItem } from '../../types/content';
import { ResilientImage } from '../../components/ResilientImage';
import { Waterfall } from '../../components/Waterfall';
import { clampAspectRatio, formatTime } from './shared';

/** 还没拿到封面比例时的占位：9:16 竖版（高 / 宽） */
const FALLBACK_RATIO = 16 / 9;
/** 封面比例的可用区间，避免极端长图把某一列拉爆 */
const MIN_RATIO = 0.6;
const MAX_RATIO = 2;

export interface VideoWaterfallProps {
  videos: VideoItem[];
  onSelect: (video: VideoItem) => void;
  /** 当前播放的视频 id，用于高亮 */
  activeId?: string;
  columns?: number;
  gap?: number;
  /** 固定列宽（PC 侧边栏 264）；不传则各列等分容器宽度 */
  columnWidth?: number;
  /** 列表整体还在加载：先铺 9:16 骨架卡 */
  loading?: boolean;
  skeletonCount?: number;
  className?: string;
}

/**
 * 视频瀑布流卡片墙
 * ------------------------------------------------------------------
 * 卡片高度按封面图自身比例撑开；封面未加载完、拿不到尺寸或没有封面时，
 * 先按 9:16 占位，加载完成后再切到真实比例并重新分配列。
 * PC 播放列表侧边栏与移动端卡片模式共用这一套。
 */
export function VideoWaterfall({
  videos,
  onSelect,
  activeId,
  columns = 2,
  gap = 8,
  columnWidth,
  loading = false,
  skeletonCount = 6,
  className = '',
}: VideoWaterfallProps) {
  /** 封面图比例（高 / 宽），key 为视频 id */
  const [coverRatios, setCoverRatios] = useState<Record<string, number>>({});

  const handleCoverSize = useCallback((id: string, width: number, height: number) => {
    if (!(width > 0) || !(height > 0)) return;
    const ratio = height / width;
    setCoverRatios((prev) => (prev[id] === ratio ? prev : { ...prev, [id]: ratio }));
  }, []);

  const ratioOf = useCallback(
    (video: VideoItem) => clampAspectRatio(coverRatios[video.id] ?? FALLBACK_RATIO, MIN_RATIO, MAX_RATIO),
    [coverRatios]
  );

  const columnClass = columnWidth ? 'shrink-0' : 'flex-1';
  const skeletonPerColumn = useMemo(
    () => Math.max(1, Math.ceil(skeletonCount / Math.max(1, columns))),
    [skeletonCount, columns]
  );

  // 列表还在加载：按列铺 9:16 骨架卡，尺寸与真实卡片一致
  if (loading && videos.length === 0) {
    return (
      <div className={`flex ${className}`} style={{ gap }}>
        {Array.from({ length: Math.max(1, columns) }).map((_, columnIndex) => (
          <div
            key={columnIndex}
            className={`flex min-w-0 flex-col ${columnClass}`}
            style={{ gap, width: columnWidth }}
          >
            {Array.from({ length: skeletonPerColumn }).map((_, index) => (
              <div
                key={index}
                aria-hidden="true"
                className="w-full animate-pulse rounded-app bg-white/10"
                style={{ aspectRatio: '9 / 16' }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <Waterfall
      items={videos}
      columns={columns}
      gap={gap}
      columnWidth={columnWidth}
      getWeight={ratioOf}
      keyOf={(video, index) => `${video.id}-${index}`}
      className={className}
      renderItem={(video) => {
        const active = !!activeId && video.id === activeId;
        return (
          <button
            type="button"
            onClick={() => onSelect(video)}
            style={{ aspectRatio: `${1 / ratioOf(video)}` }}
            className={`relative block w-full overflow-hidden rounded-app border text-left transition-colors ${
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
              onLoadSize={(size) => handleCoverSize(video.id, size.width, size.height)}
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
      }}
    />
  );
}

export default VideoWaterfall;
