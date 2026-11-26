import { useCallback, useEffect, useState } from 'react';
import type { VideoItem } from '../../types/content';

/** 悬浮迷你播放器：离开视频板块后继续播放 */
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

  // 清理旧版本写入的播放进度缓存，避免残留数据继续占用本地空间
  useEffect(() => {
    try {
      window.localStorage.removeItem('lumina:video-progress');
    } catch {
      // 忽略存储不可用
    }
  }, []);

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
    handlePlayVideo,
  };
}
