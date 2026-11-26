import { useCallback, useEffect, useRef, useState } from 'react';
import type { VideoItem } from '../../types/content';
import { usePersistentState } from './usePersistentState';

/** 播放进度最多保留最近 50 条，避免本地缓存无限增长 */
const VIDEO_PROGRESS_LIMIT = 50;

/** 悬浮迷你播放器：离开视频板块后继续播放，按视频ID记录进度 */
export function usePersistentPlayer() {
  const [persistentVideo, setPersistentVideo] = useState<VideoItem | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches
  );

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const handleChange = (event: MediaQueryListEvent) => setIsMobileViewport(event.matches);
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const [persistentMuted, setPersistentMuted] = useState(true);
  const [persistentRate, setPersistentRate] = useState(1);
  /* 按 videoId 记录播放进度，回到视频板块或迷你播放器续播 */
  const [videoProgress, setVideoProgress] = usePersistentState<Record<string, number>>(
    'lumina:video-progress',
    {}
  );

  const progressTrimmedRef = useRef(false);
  useEffect(() => {
    if (progressTrimmedRef.current) return;
    progressTrimmedRef.current = true;
    if (Object.keys(videoProgress).length <= VIDEO_PROGRESS_LIMIT) return;
    setVideoProgress((prev) => {
      const keep = Object.keys(prev).slice(-VIDEO_PROGRESS_LIMIT);
      return Object.fromEntries(keep.map((id) => [id, prev[id]]));
    });
  }, [videoProgress, setVideoProgress]);

  const saveVideoProgress = useCallback(
    (id: string, time: number) => {
      if (!id || !Number.isFinite(time) || time <= 0) return;
      setVideoProgress((prev) => {
        const next = { ...prev };
        delete next[id];
        next[id] = time;
        const ids = Object.keys(next);
        if (ids.length <= VIDEO_PROGRESS_LIMIT) return next;
        for (const oldId of ids.slice(0, ids.length - VIDEO_PROGRESS_LIMIT)) {
          delete next[oldId];
        }
        return next;
      });
    },
    [setVideoProgress]
  );

  const handlePlayVideo = useCallback(
    (video: VideoItem, opts?: { muted?: boolean; playbackRate?: number }) => {
      setPersistentVideo(video);
      if (typeof opts?.muted === 'boolean') setPersistentMuted(opts.muted);
      if (typeof opts?.playbackRate === 'number') setPersistentRate(opts.playbackRate);
    },
    []
  );

  return {
    persistentVideo,
    setPersistentVideo,
    isMobileViewport,
    persistentMuted,
    persistentRate,
    videoProgress,
    saveVideoProgress,
    handlePlayVideo,
  };
}
