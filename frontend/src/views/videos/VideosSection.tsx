import type { VideoItem } from '../../data/content';
import { VideosView } from './VideosView';
import { PortalError, SectionSkeleton } from '../../components/PortalStates';

interface VideosSectionProps {
  active: boolean;
  loading: boolean;
  error?: string;
  videos: VideoItem[];
  categories: string[];
  category: string;
  onCategoryChange: (category: string) => void;
  savedIds: string[];
  likedIds: string[];
  searchQuery: string;
  progressById: Record<string, number>;
  resumeVideoId?: string;
  resumeMuted: boolean;
  resumePlaybackRate: number;
  isMini: boolean;
  onRetry: () => void;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  onPlayVideo: (video: VideoItem, opts?: { muted?: boolean; playbackRate?: number }) => void;
  onSaveProgress: (id: string, time: number) => void;
  onMiniClose: () => void;
  onMiniExpand: () => void;
  viewMode?: 'feed' | 'grid';
  onViewModeChange?: (mode: 'feed' | 'grid') => void;
}

/**
 * 视频板块常驻挂载：切换板块时只改变播放器容器形态，
 * <video> 元素不会被销毁重建，避免重新加载造成的卡顿与黑屏。
 */
export function VideosSection({
  active,
  loading,
  error,
  videos,
  categories,
  category,
  onCategoryChange,
  savedIds,
  likedIds,
  searchQuery,
  progressById,
  resumeVideoId,
  resumeMuted,
  resumePlaybackRate,
  isMini,
  onRetry,
  onToggleSave,
  onToggleLike,
  onPlayVideo,
  onSaveProgress,
  onMiniClose,
  onMiniExpand,
  viewMode,
  onViewModeChange,
}: VideosSectionProps) {
  const mode = !active ? (isMini ? 'mini' : 'hidden') : 'immersive';

  return (
    <div className={active ? 'relative block h-full' : 'contents'}>
      <VideosView
        videos={videos}
        categories={categories}
        category={category}
        onCategoryChange={onCategoryChange}
        savedIds={savedIds}
        likedIds={likedIds}
        searchQuery={searchQuery}
        onToggleSave={onToggleSave}
        onToggleLike={onToggleLike}
        onPlayVideo={onPlayVideo}
        progressById={progressById}
        onSaveProgress={onSaveProgress}
        resumeVideoId={resumeVideoId}
        resumeMuted={resumeMuted}
        resumePlaybackRate={resumePlaybackRate}
        mode={mode}
        onMiniClose={onMiniClose}
        onMiniExpand={onMiniExpand}
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
      />

      {active && loading && videos.length === 0 && (
        <div className="absolute inset-0 z-20 bg-[#F5F5F7] dark:bg-[#0A0A0C]">
          <SectionSkeleton section="videos" />
        </div>
      )}

      {active && error && videos.length === 0 && (
        <div className="absolute inset-0 z-20 bg-white dark:bg-[#0A0A0C]">
          <PortalError section="videos" message={error} onRetry={onRetry} />
        </div>
      )}
    </div>
  );
}
