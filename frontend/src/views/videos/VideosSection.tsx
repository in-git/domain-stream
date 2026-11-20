import type { VideoItem } from '../../data/content';
import { VideosView } from './VideosView';
import { PortalEmpty, PortalError, SectionSkeleton } from '../../components/PortalStates';

interface VideosSectionProps {
  active: boolean;
  loading: boolean;
  error?: string;
  videos: VideoItem[];
  categories: string[];
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
}

/**
 * 视频板块常驻挂载：切换板块时只改变播放器容器形态，
 * <video> 元素不会被销毁重建，避免重新加载造成的卡顿。
 */
export function VideosSection({
  active,
  loading,
  error,
  videos,
  categories,
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
}: VideosSectionProps) {
  return (
    <div className={active ? 'block' : 'contents'}>
      {!active ? (
        <VideosView
          videos={videos}
          categories={categories}
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
          mode={isMini ? 'mini' : 'hidden'}
          onMiniClose={onMiniClose}
          onMiniExpand={onMiniExpand}
        />
      ) : loading ? (
        <SectionSkeleton section="videos" />
      ) : error ? (
        <PortalError section="videos" message={error} onRetry={onRetry} />
      ) : videos.length === 0 ? (
        <PortalEmpty section="videos" onRetry={onRetry} />
      ) : (
        <VideosView
          videos={videos}
          categories={categories}
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
          mode="immersive"
        />
      )}
    </div>
  );
}
