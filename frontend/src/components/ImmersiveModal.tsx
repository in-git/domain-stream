import { useCallback, useEffect, useRef, useState } from 'react';
import type { MediaPlayerInstance } from '@vidstack/react';
import { X } from 'lucide-react';
import type { VideoItem } from '../types/content';
import { VideoFeedPlayer } from '../views/videos/VideoFeedPlayer';

interface ImmersiveModalProps {
  /** 当前页的搜索结果（卡片模式里过滤后的视频） */
  videos: VideoItem[];
  /** 从被点击的那条开始播放 */
  initialIndex: number;
  likedIds: string[];
  savedIds: string[];
  progressById?: Record<string, number>;
  onToggleLike: (id: string) => void;
  onToggleSave: (id: string) => void;
  onSaveProgress?: (id: string, time: number) => void;
  onClose: () => void;
}

/**
 * 全屏播放模态框：复用主页沉浸流的同一个 FeedSlide 播放器组件，
 * 播放当前页搜索结果，可上下滑动切换。自身管理播放状态，与主页彻底解耦。
 */
export function ImmersiveModal({
  videos,
  initialIndex,
  likedIds,
  savedIds,
  progressById,
  onToggleLike,
  onToggleSave,
  onSaveProgress,
  onClose,
}: ImmersiveModalProps) {
  const safeInitial = Math.max(0, Math.min(initialIndex, videos.length - 1));
  const [activeIndex, setActiveIndex] = useState(safeInitial);
  const [isMuted, setIsMuted] = useState(true);
  /** 用户是否主动点过静音，为 true 时滑动不再自动解除 */
  const userMutedManuallyRef = useRef(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const playersRef = useRef<Map<string, MediaPlayerInstance>>(new Map());
  const stageRef = useRef<HTMLDivElement | null>(null);

  const activeVideo = videos[activeIndex] ?? null;

  const registerPlayer = useCallback((id: string, player: MediaPlayerInstance | null) => {
    if (player) playersRef.current.set(id, player);
    else playersRef.current.delete(id);
  }, []);

  const getActivePlayer = () =>
    activeVideo ? playersRef.current.get(`${activeVideo.id}-${activeIndex}`) ?? null : null;

  /** 用户点击静音/取消静音：记录主动静音状态 */
  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      userMutedManuallyRef.current = next;
      return next;
    });
  };

  const togglePlayback = () => {
    const player = getActivePlayer();
    if (!player) return;
    if (isMuted) {
      setIsMuted(false);
      userMutedManuallyRef.current = false;
      player.muted = false;
      if (player.paused) void player.play().catch(() => {});
      return;
    }
    if (player.paused) void player.play().catch(() => {});
    else player.pause();
  };

  const seekTo = (time: number) => {
    const player = getActivePlayer();
    const clamped = Math.max(0, Math.min(time, duration || activeVideo?.durationSeconds || 0));
    setCurrentTime(clamped);
    if (player) player.currentTime = clamped;
  };

  const handleSlideChange = (index: number) => {
    setActiveIndex(index);
    setCurrentTime(0);
    if (!userMutedManuallyRef.current) {
      setIsMuted(false);
    }
  };

  // ESC 关闭
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // 打开时锁住背景滚动
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="视频播放"
      ref={stageRef}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="关闭播放"
        className="absolute top-4 right-4 z-30 w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/90 hover:bg-black/70 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {videos.length > 0 && (
        <VideoFeedPlayer
          videos={videos}
          swiperKey={`modal-${videos[0]?.id}-${videos.length}`}
          state={{ activeIndex, isMuted, playbackRate, currentTime, duration }}
          handlers={{
            onSlideChange: handleSlideChange,
            onTogglePlay: togglePlayback,
            onToggleMute: handleToggleMute,
            onSetRate: setPlaybackRate,
            onSeek: seekTo,
            onTimeUpdate: setCurrentTime,
            onDurationChange: setDuration,
            onRegisterPlayer: registerPlayer,
          }}
          likedIds={likedIds}
          savedIds={savedIds}
          progressById={progressById}
          onToggleLike={onToggleLike}
          onToggleSave={onToggleSave}
          onSaveProgress={onSaveProgress}
          showFullscreen={false}
        />
      )}
    </div>
  );
}
