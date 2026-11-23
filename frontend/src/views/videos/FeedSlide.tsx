import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MediaPlayer, MediaProvider, type MediaPlayerInstance } from '@vidstack/react';
import {
  Bookmark,
  Heart,
  Maximize,
  Maximize2,
  MessageCircle,
  Minimize,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { VideoItem } from '../../data/content';
import { SWIFTUI_BOUNCY } from '../../lib/motion';
import { Tooltip } from '../../components/Tooltip';
import { CommentPanel } from '../../components/CommentPanel.tsx';
import { useCommentEnabled } from '../../lib/systemInfo.ts';
import { countVideoViewOnce, formatTime } from './shared';

interface FeedSlideProps {
  video: VideoItem;
  index: number;
  total: number;
  active: boolean;
  isMuted: boolean;
  playbackRate: number;
  liked: boolean;
  saved: boolean;
  currentTime: number;
  duration: number;
  isFullscreen: boolean;
  savedTime?: number;
  onRegisterPlayer: (id: string, player: MediaPlayerInstance | null) => void;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onSetRate: (rate: number) => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onToggleFullscreen: () => void;
  onSeek: (time: number) => void;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onSaveProgress?: (time: number) => void;
  /** 迷你窗口形态：精简界面，仅保留播放控制 */
  mini?: boolean;
  onMiniClose?: () => void;
  onMiniExpand?: () => void;
  /** 是否显示全屏按钮（模态框本身已占满全屏时可隐藏） */
  showFullscreen?: boolean;
}

/** 沉浸刷看的单屏播放器；PC 与移动端共用同一播放器实例，避免重建造成卡顿。 */
export function FeedSlide({
  video,
  index,
  total,
  active,
  isMuted,
  playbackRate,
  liked,
  saved,
  currentTime,
  duration,
  isFullscreen,
  savedTime,
  onRegisterPlayer,
  onTogglePlay,
  onToggleMute,
  onSetRate,
  onToggleLike,
  onToggleSave,
  onToggleFullscreen,
  onSeek,
  onTimeUpdate,
  onDurationChange,
  onSaveProgress,
  mini,
  onMiniClose,
  onMiniExpand,
  showFullscreen = true,
}: FeedSlideProps) {
  const commentsEnabled = useCommentEnabled();
  const playerRef = useRef<MediaPlayerInstance | null>(null);
  const restoredRef = useRef<boolean>(false);
  const lastSaveRef = useRef<number>(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentOpen, setCommentOpen] = useState(false);

  const setPlayerRef = useCallback(
    (player: MediaPlayerInstance | null) => {
      playerRef.current = player;
      onRegisterPlayer(video.id, player);
    },
    [onRegisterPlayer, video.id],
  );

  useEffect(() => {
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

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    if (!active) {
      player.pause();
      return;
    }
    player.playbackRate = playbackRate;
    player.muted = isMuted;
    void player.play().catch(() => {});
    // src 是 active 后才挂载的，源就绪需要一点时间；补一次延迟 play 兜底，
    // 配合 onCanPlay 里的主动播放，确保首次进入也能正常起播。
    const retry = window.setTimeout(() => {
      if (player.paused) void player.play().catch(() => {});
    }, 120);
    return () => window.clearTimeout(retry);
  }, [active, video.id, isMuted, playbackRate]);

  useEffect(() => {
    if (!mini || !active) return;
    const player = playerRef.current;
    if (!player) return;
    if (isMuted) void player.play().catch(() => {});
  }, [mini, active]);

  useEffect(() => {
    restoredRef.current = false;
    if (active) setLoading(true);
  }, [video.id, active]);

  const handleTimeUpdate = useCallback(
    (t: number) => {
      onTimeUpdate(t);
      if (!active || !onSaveProgress) return;
      const now = Date.now();
      if (now - lastSaveRef.current < 1000) return;
      lastSaveRef.current = now;
      onSaveProgress(t);
    },
    [onTimeUpdate, onSaveProgress, active],
  );

  const progressMax = Math.max(duration, video.durationSeconds, 1);
  const progressValue = Math.min(currentTime, progressMax);

  const source = useMemo<{ src: string; type: 'video/mp4' }>(
    () => ({ src: video.src, type: 'video/mp4' }),
    [video.src],
  );

  return (
    <div data-video-stage className="relative w-full h-full bg-black overflow-hidden">
      <MediaPlayer
        ref={setPlayerRef}
        poster={video.cover}
        title={video.title}
        playsInline
        loop
        // 只给 active 项挂载 src：非 active 的 slide（含 loop 副本）不设置源，
        // 从根本上避免十几个播放器同时预加载同一个 /public/file/stream。
        // 不设 load/preload，保持默认加载策略，保证 active 项能正常播放。
        src={active ? source : undefined}
        posterLoad="eager"
        muted={isMuted}
        playbackRate={playbackRate}
        className="absolute inset-0 w-full h-full"
        onClick={active ? onTogglePlay : undefined}
        onPlay={() => {
          setPlaying(true);
          setLoading(false);
          countVideoViewOnce(video.id);
        }}
        onPause={() => setPlaying(false)}
        onCanPlay={() => {
          setLoading(false);
          // 视频源就绪后立即播放当前 active 项：点选卡片时 src 可能刚挂载，
          // 依赖 onCanPlay 主动 play 比 effect 里的 play 更可靠。
          const player = playerRef.current;
          if (active && player && player.paused) {
            player.muted = isMuted;
            void player.play().catch(() => {});
          }
        }}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
        onError={() => setLoading(false)}
        onTimeUpdate={(detail) => handleTimeUpdate(detail.currentTime)}
        onDurationChange={(value) => {
          if (active) onDurationChange(value);
        }}
      >
        <MediaProvider className="w-full h-full" />
      </MediaPlayer>

      {active && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />

          <AnimatePresence>
            {loading && !mini && (
              <motion.div
                key="video-loading"
                role="status"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0 m-auto w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-white/25 border-t-white animate-spin"
              >
                <span className="sr-only">视频加载中</span>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {!playing && !loading && !mini && (
              <motion.button
                type="button"
                onClick={onTogglePlay}
                aria-label="播放"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={SWIFTUI_BOUNCY}
                className="absolute inset-0 m-auto w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-black/55 hover:bg-black/65 backdrop-blur-md border border-white/30 flex items-center justify-center text-white transition-colors"
              >
                <Play className="fill-white translate-x-[2px] w-6 h-6 sm:w-8 sm:h-8" />
              </motion.button>
            )}
          </AnimatePresence>

          {mini && (
            <>
              <button
                type="button"
                onClick={onMiniExpand}
                aria-label="回到视频"
                title="回到视频"
                className="absolute top-1.5 left-1.5 z-30 w-6 h-6 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/90 hover:bg-black/70 transition-colors"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={onMiniClose}
                aria-label="关闭迷你播放器"
                title="关闭"
                className="absolute top-1.5 right-1.5 z-30 w-6 h-6 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/90 hover:bg-black/70 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          )}

          {!mini && (
            <div className="absolute right-3 sm:right-5 bottom-[110px] flex flex-col items-center gap-4 z-20 text-white">
              <Tooltip label={liked ? '取消喜欢' : '喜欢'} side="left">
                <div className="flex flex-col items-center">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.84 }}
                    transition={SWIFTUI_BOUNCY}
                    onClick={onToggleLike}
                    aria-label={liked ? '取消喜欢' : '喜欢'}
                    className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors ${
                      liked
                        ? 'bg-[#FF2C55]/25 border-[#FF2C55]/60 text-[#FF2C55]'
                        : 'bg-black/45 border-white/15 text-white hover:bg-black/65'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
                  </motion.button>
                  <span className="mt-0.5 text-[11px] font-medium tabular-nums">
                    {video.likeCount || 0}
                  </span>
                </div>
              </Tooltip>

              <Tooltip label={saved ? '取消收藏' : '收藏'} side="left">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.84 }}
                  transition={SWIFTUI_BOUNCY}
                  onClick={onToggleSave}
                  aria-label={saved ? '取消收藏' : '收藏'}
                  className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors ${
                    saved
                      ? 'bg-[#FFB800]/25 border-[#FFB800]/60 text-[#FFD60A]'
                      : 'bg-black/45 border-white/15 text-white hover:bg-black/65'
                  }`}
                >
                  <Bookmark className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
                </motion.button>
              </Tooltip>

              {commentsEnabled && (
                <Tooltip label="评论" side="left">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.84 }}
                    onClick={() => setCommentOpen(true)}
                    aria-label="查看评论"
                    className="relative w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/65 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {!!video.commentCount && (
                      <span className="absolute -top-1 -right-1 rounded-full bg-[#0071E3] px-1.5 text-[10px] font-medium tabular-nums">
                        {video.commentCount}
                      </span>
                    )}
                  </motion.button>
                </Tooltip>
              )}

              {showFullscreen && (
                <Tooltip label={isFullscreen ? '退出全屏' : '全屏'} side="left">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.88 }}
                    onClick={onToggleFullscreen}
                    aria-label={isFullscreen ? '退出全屏' : '全屏播放'}
                    className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/65 transition-colors"
                  >
                    {isFullscreen ? (
                      <Minimize className="w-5 h-5" />
                    ) : (
                      <Maximize className="w-5 h-5" />
                    )}
                  </motion.button>
                </Tooltip>
              )}

              <Tooltip label={isMuted ? '取消静音' : '静音'} side="left">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  onClick={onToggleMute}
                  aria-label={isMuted ? '取消静音' : '静音'}
                  className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/65 transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </motion.button>
              </Tooltip>
            </div>
          )}

          <div
            className={`absolute bottom-0 left-0 right-0 text-white z-10 pointer-events-none ${
              mini
                ? 'p-2'
                : 'space-y-3 pt-4 pb-[calc(3rem_+_max(0.5rem,env(safe-area-inset-bottom)))] sm:pl-6 sm:pr-24 sm:pt-6 md:pb-6'
            }`}
          >
            {!mini && (
              <div className="space-y-1.5 max-w-2xl pl-4 pr-20 sm:pl-0 sm:pr-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/80">
                  <span>{video.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{video.date}</span>
                  {Number(video.viewCount) > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>{video.viewCount} 次播放</span>
                    </>
                  )}
                </div>
                <h2 className="text-lg sm:text-2xl font-semibold tracking-tight leading-snug">
                  {video.title}
                </h2>
                <p className="text-xs sm:text-sm text-white/75 line-clamp-2 leading-relaxed">
                  {video.subtitle}
                </p>
              </div>
            )}

            <div
              className={`pointer-events-auto ${
                mini ? 'flex items-center gap-1.5' : 'hidden items-center md:flex sm:-ml-6 sm:-mr-24'
              }`}
            >
              {mini && (
                <button
                  type="button"
                  onClick={onTogglePlay}
                  aria-label={playing ? '暂停' : '播放'}
                  className="w-6 h-6 rounded-full bg-white/18 hover:bg-white/28 flex items-center justify-center shrink-0"
                >
                  {playing ? (
                    <Pause className="fill-white w-3 h-3" />
                  ) : (
                    <Play className="fill-white translate-x-[1px] w-3 h-3" />
                  )}
                </button>
              )}
              {mini && (
                <span className="w-8 text-[10px] font-mono-tabular text-white/80">
                  {formatTime(currentTime)}
                </span>
              )}
              <div className="relative flex-1 min-w-0 flex items-center h-4">
                <div className="relative w-full h-[2px] rounded-full bg-white/25 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-white/90"
                    style={{ width: `${Math.min(100, (progressValue / progressMax) * 100)}%` }}
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={progressMax}
                  step={0.05}
                  value={progressValue}
                  onChange={(e) => onSeek(Number(e.target.value))}
                  aria-label="播放进度"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
              {mini && (
                <span className="w-8 text-[10px] font-mono-tabular text-white/65 text-right">
                  {formatTime(progressMax)}
                </span>
              )}
            </div>
          </div>

        </>
      )}

      <CommentPanel
        drawer
        open={commentOpen && !mini}
        targetType="VIDEO"
        targetId={video.id}
        onClose={() => setCommentOpen(false)}
      />
    </div>
  );
}
