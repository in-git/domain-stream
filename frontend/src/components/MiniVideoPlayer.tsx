import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { MediaPlayer, MediaProvider, type MediaPlayerInstance } from '@vidstack/react';
import { Pause, Play, X } from 'lucide-react';
import type { VideoItem } from '../data/content';
import { SWIFTUI_SMOOTH } from '../lib/motion';

interface MiniVideoPlayerProps {
  video: VideoItem;
  muted: boolean;
  playbackRate: number;
  savedTime?: number;
  onSaveProgress?: (time: number) => void;
  onClose: () => void;
  onToggleMute: () => void;
  onOpenVideos: () => void;
}

function formatTime(sec: number) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function MiniVideoPlayer({
  video, muted, playbackRate, savedTime, onSaveProgress, onClose, onOpenVideos,
}: MiniVideoPlayerProps) {
  const playerRef = useRef<MediaPlayerInstance | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.durationSeconds || 0);
  const restoredRef = useRef<boolean>(false);
  const lastSaveRef = useRef<number>(0);

  // 缓存源对象，避免每次渲染被 Vidstack 当作新源中断播放
  const source = useMemo(() => ({ src: video.src, type: 'video/mp4' }), [video.src]);

  // 恢复进度：等元数据就绪后 seek（Vidstack 没有 EventTarget.on()，用 setTimeout 轮询）
  useEffect(() => {
    restoredRef.current = false;
    const player = playerRef.current;
    if (!player) return;
    if (!savedTime || savedTime <= 1) {
      restoredRef.current = true;
      return;
    }
    let cancelled = false;
    let timer: number | undefined;
    const tryRestore = () => {
      if (cancelled || restoredRef.current) return;
      const d = player.duration;
      if (!d || d <= 0) {
        timer = window.setTimeout(tryRestore, 150);
        return;
      }
      const safe = Math.min(savedTime, d - 3);
      if (safe > 0 && safe < d) player.currentTime = safe;
      restoredRef.current = true;
    };
    timer = window.setTimeout(tryRestore, 100);
    const giveUp = window.setTimeout(() => {
      restoredRef.current = true;
      if (timer) window.clearTimeout(timer);
    }, 4000);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      window.clearTimeout(giveUp);
    };
  }, [video.id, savedTime]);

  // 防抖保存播放进度（1s 一次）
  const handleTimeUpdate = useCallback((t: number) => {
    setCurrentTime(t);
    if (!onSaveProgress) return;
    const now = Date.now();
    if (now - lastSaveRef.current < 1000) return;
    lastSaveRef.current = now;
    onSaveProgress(t);
  }, [onSaveProgress]);

  const setPlayerRef = useCallback((player: MediaPlayerInstance | null) => {
    playerRef.current = player;
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    player.muted = muted;
    player.playbackRate = playbackRate;
  }, [muted, playbackRate]);

  useEffect(() => {
    // Remount key ensures fresh player when source changes
    const player = playerRef.current;
    if (!player) return;
    void player.play().catch(() => {});
  }, [video.id]);

  const togglePlay = () => {
    const p = playerRef.current;
    if (!p) return;
    if (p.paused) void p.play().catch(() => {});
    else p.pause();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 80 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 80 }}
      transition={SWIFTUI_SMOOTH}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[60] w-[min(92vw,360px)] bg-[#1C1C1E] dark:bg-[#1C1C1E] rounded-2xl shadow-xl border border-white/10 overflow-hidden text-white"
    >
      <div className="flex items-center gap-3 p-2">
        {/* Thumbnail + hidden real video */}
        <button
          type="button"
          onClick={onOpenVideos}
          className="relative w-28 h-16 shrink-0 rounded-lg overflow-hidden bg-black"
          title="回到视频"
        >
          <MediaPlayer
            key={video.id}
            ref={setPlayerRef}
            src={source}
            poster={video.cover}
            playsInline
            autoPlay
            loop
            muted={muted}
            playbackRate={playbackRate}
            className="absolute inset-0 w-full h-full bg-black"
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={(player) => handleTimeUpdate(player.currentTime)}
            onDurationChange={(player) => {
              setDuration(player.duration || 0);
              // 如果之前元数据未就绪导致没 seek 成功，现在补一次
              if (player.duration > 0 && !restoredRef.current && savedTime && savedTime > 1) {
                const safe = Math.min(savedTime, player.duration - 3);
                if (safe > 0 && safe < player.duration) player.currentTime = safe;
                restoredRef.current = true;
              }
            }}
          >
            <MediaProvider className="w-full h-full" />
          </MediaPlayer>
          {/* Play/Pause overlay */}
          <div
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePlay(); } }}
            className="absolute inset-0 flex items-center justify-center bg-black/35 hover:bg-black/50 transition-colors"
            aria-label={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white translate-x-[1px]" />}
          </div>
        </button>

        {/* Info + time */}
        <div className="flex-1 min-w-0 pr-1">
          <button
            type="button"
            onClick={onOpenVideos}
            className="block w-full text-left"
            title="回到视频"
          >
            <div className="text-[11px] text-white/50 truncate">{video.category} · 迷你播放器</div>
            <div className="text-sm font-medium truncate text-white">{video.title}</div>
          </button>
          <div className="mt-1 h-1 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-[width] duration-150"
              style={{ width: duration ? `${Math.min(100, (currentTime / duration) * 100)}%` : '0%' }}
            />
          </div>
          <div className="mt-1 text-[10px] font-mono-tabular text-white/60">
            {formatTime(currentTime)} / {formatTime(duration || video.durationSeconds || 0)}
          </div>
        </div>

        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭迷你播放器"
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
