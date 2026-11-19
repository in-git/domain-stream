import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MediaPlayer, MediaProvider, type MediaPlayerInstance } from '@vidstack/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Keyboard, Mousewheel } from 'swiper/modules';
import type { Swiper as SwiperClass } from 'swiper';
import 'swiper/css';
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Heart,
  LayoutGrid,
  Maximize,
  Maximize2,
  Minimize,
  Pause,
  Play,
  Rows3,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { VideoItem } from '../data/content';
import { SWIFTUI_BOUNCY, SWIFTUI_SMOOTH, SWIFTUI_SNAPPY } from '../lib/motion';
import { Tooltip } from './Tooltip';
import { ResilientImage } from './ResilientImage';

interface VideosViewProps {
  videos: VideoItem[];
  categories?: string[];
  savedIds: string[];
  likedIds: string[];
  searchQuery?: string;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  onPlayVideo?: (video: VideoItem, opts?: { muted?: boolean; playbackRate?: number }) => void;
  progressById?: Record<string, number>;
  onSaveProgress?: (id: string, time: number) => void;
  /** 离开视频模块时 MiniPlayer 里还在播的那条——返回时直接切到它并沿用它的静音/倍速 */
  resumeVideoId?: string | null;
  resumeMuted?: boolean;
  resumePlaybackRate?: number;
  /**
   * 展示形态：
   * - immersive：视频板块内的沉浸刷看
   * - mini：离开视频板块后的右下角迷你窗口
   * - hidden：完全隐藏但保留播放器实例，避免切换时重建 <video> 导致卡顿
   */
  mode?: 'immersive' | 'mini' | 'hidden';
  /** 迷你形态下的操作回调 */
  onMiniClose?: () => void;
  onMiniExpand?: () => void;
}

const DEFAULT_CATEGORIES = ['设计纪实', '城市影像', '自然声景'];
type CategoryFilter = string;

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

interface VideoMeta {
  width: number;
  height: number;
}

/** Read the video's own resolution so grid cards follow its native ratio. */
function useVideoMeta(src: string | undefined): VideoMeta | null {
  const [meta, setMeta] = useState<VideoMeta | null>(null);

  useEffect(() => {
    if (!src) {
      setMeta(null);
      return;
    }

    let active = true;
    setMeta(null);

    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.muted = true;

    const handleLoadedMetadata = () => {
      if (active && probe.videoWidth > 0 && probe.videoHeight > 0) {
        setMeta({ width: probe.videoWidth, height: probe.videoHeight });
      }
    };

    probe.addEventListener('loadedmetadata', handleLoadedMetadata);
    probe.src = src;

    return () => {
      active = false;
      probe.removeEventListener('loadedmetadata', handleLoadedMetadata);
      probe.removeAttribute('src');
      probe.load();
    };
  }, [src]);

  return meta;
}

function getFallbackMeta(video: VideoItem | null): VideoMeta {
  return video ? { width: video.width, height: video.height } : { width: 16, height: 9 };
}

interface VideoGridCardProps {
  video: VideoItem;
  index: number;
  liked: boolean;
  saved: boolean;
  onOpen: () => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
}

function VideoGridCard({
  video,
  index,
  liked,
  saved,
  onOpen,
  onToggleLike,
  onToggleSave,
}: VideoGridCardProps) {
  const meta = useVideoMeta(video.src);
  const fallback = getFallbackMeta(video);
  const ratio = meta ? meta.width / meta.height : fallback.width / fallback.height;

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...SWIFTUI_SMOOTH, delay: index * 0.03 }}
      whileHover={{ y: -2 }}
      className="group break-inside-avoid mb-5 rounded-2xl overflow-hidden bg-white dark:bg-[#161618] border border-black/[0.06] dark:border-white/[0.08]"
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`播放 ${video.title}`}
        className="relative block w-full max-h-[360px] overflow-hidden text-left bg-black"
        style={{ aspectRatio: ratio }}
      >
        <ResilientImage
          src={video.cover}
          alt={video.title}
          fallbackTitle={video.title}
          className="w-full h-full transition-transform duration-500 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/60 text-white text-[11px] font-mono-tabular">
          {video.durationLabel}
        </span>
      </button>
      <div className="px-3 pt-2.5 pb-3 space-y-1">
        <div className="text-[11px] text-[#6E6E73] dark:text-[#98989D] truncate">
          {video.category} · {video.director}
        </div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="flex-1 text-[13px] sm:text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] line-clamp-2">
            {video.title}
          </h3>
          <div className="flex items-center gap-0.5 shrink-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              transition={SWIFTUI_BOUNCY}
              onClick={onToggleLike}
              aria-label={liked ? '取消点赞视频' : '点赞视频'}
              aria-pressed={liked}
              className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                liked
                  ? 'text-[#FF2E4D]'
                  : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#FF2E4D]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              transition={SWIFTUI_BOUNCY}
              onClick={onToggleSave}
              aria-label={saved ? '取消收藏视频' : '收藏视频'}
              aria-pressed={saved}
              className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                saved
                  ? 'text-[#0071E3] dark:text-[#0A84FF]'
                  : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

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
}

/** One full-bleed page of the seamless vertical carousel. */
function FeedSlide({
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
}: FeedSlideProps) {
  const playerRef = useRef<MediaPlayerInstance | null>(null);
  const restoredRef = useRef<boolean>(false);
  const lastSaveRef = useRef<number>(0);
  // 每个 Slide 自己持有播放状态，由真实 onPlay/onPause 事件驱动
  const [playing, setPlaying] = useState(false);

  const setPlayerRef = useCallback(
    (player: MediaPlayerInstance | null) => {
      playerRef.current = player;
      onRegisterPlayer(video.id, player);
    },
    [onRegisterPlayer, video.id],
  );

  // 恢复播放进度：等元数据就绪后 seek 到保存的位置
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    if (!savedTime || savedTime <= 1) {
      restoredRef.current = true;
      return;
    }
    // 轮询 duration 就绪（Vidstack 没有 EventTarget.on()，用 setTimeout 简单可靠）
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
    // 最多等 4s，防止卡死
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

  // Only the visible page plays; others stay paused (保留进度，不再重置到 0)
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    if (!active) {
      player.pause();
      return;
    }
    player.playbackRate = playbackRate;
    player.muted = isMuted;
    // 未静音时浏览器会拒绝自动播放（控制台报 play request failed），交给用户点击触发
    if (isMuted) {
      void player.play().catch(() => {});
    }
  }, [active, isMuted, playbackRate]);

  // 进入迷你窗口时继续播放：静音状态下浏览器允许自动播放
  useEffect(() => {
    if (!mini || !active) return;
    const player = playerRef.current;
    if (!player) return;
    if (isMuted) {
      void player.play().catch(() => {});
    }
  }, [mini, active]);

  // video 切换时重置恢复标记
  useEffect(() => {
    restoredRef.current = false;
  }, [video.id]);

  // 防抖保存播放进度（1s 一次）
  const handleTimeUpdate = useCallback((t: number) => {
    onTimeUpdate(t);
    if (!active || !onSaveProgress) return;
    const now = Date.now();
    if (now - lastSaveRef.current < 1000) return;
    lastSaveRef.current = now;
    onSaveProgress(t);
  }, [onTimeUpdate, onSaveProgress, active]);

  const progressMax = Math.max(duration, video.durationSeconds, 1);
  const progressValue = Math.min(currentTime, progressMax);

  // 必须缓存源对象：每次渲染新建对象会被 Vidstack 当成新源，导致播放请求被中断
  const source = useMemo<{ src: string; type: 'video/mp4' }>(
    () => ({ src: video.src, type: 'video/mp4' }),
    [video.src]
  );

  return (
    <div data-video-stage className="relative w-full h-full bg-black overflow-hidden">
      <MediaPlayer
        ref={setPlayerRef}
        // 流式地址没有扩展名，显式声明类型，避免播放器无法匹配加载器
        src={source}
        poster={video.cover}
        title={video.title}
        playsInline
        loop
        muted={isMuted}
        playbackRate={playbackRate}
        className="absolute inset-0 w-full h-full"
        onClick={active ? onTogglePlay : undefined}
        onPlay={() => {
          setPlaying(true);
        }}
        onPause={() => {
          setPlaying(false);
        }}
        onTimeUpdate={(detail) => {
          handleTimeUpdate(detail.currentTime);
        }}
        onDurationChange={(value) => {
          if (active) onDurationChange(value);
        }}
      >
        <MediaProvider className="w-full h-full" />
      </MediaPlayer>

      {active && (
        <>
          {/* 轻度渐层保证底部文字可读，不压暗画面 */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10" />

          {/* Center Paused Indicator — mini 窗口已经有底部播放按钮，不再叠加大图标 */}
          <AnimatePresence>
            {!playing && !mini && (
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

          {/* 迷你窗口控制条：关闭 / 回到视频板块 */}
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

          {/* Top Status + Playback Rate */}
          {!mini && (
            <div className="absolute top-16 md:top-4 left-4 right-4 flex items-center justify-between gap-2 pointer-events-none">
              <div className="px-3 py-1 rounded-full bg-black/45 backdrop-blur-md border border-white/10 text-[11px] text-white/90 tabular-nums whitespace-nowrap">
                {index + 1} / {total} · {video.resolution}
              </div>

              <div className="pointer-events-auto flex items-center gap-1 bg-black/45 backdrop-blur-md border border-white/10 p-1 rounded-full">
                {[1, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => onSetRate(rate)}
                    className={`px-2 py-0.5 text-[11px] font-mono-tabular rounded-full transition-colors ${
                      playbackRate === rate
                        ? 'bg-white text-black font-medium'
                        : 'text-white/75 hover:text-white'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Douyin-style Right-Side Vertical Action Dock */}
          {!mini && (
            <div className="absolute right-3 sm:right-5 bottom-20 flex flex-col items-center gap-4 z-20 text-white">
            <Tooltip label={liked ? '取消喜欢' : '喜欢'} side="left">
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

          {/* Bottom Info + Progress Scrubber */}
          <div
            className={`absolute bottom-0 left-0 right-0 text-white z-10 pointer-events-none ${
              mini
                ? 'p-2'
                : 'space-y-3 px-4 pt-4 pr-20 pb-[calc(3rem_+_max(0.5rem,env(safe-area-inset-bottom)))] sm:px-6 sm:pt-6 sm:pr-24 md:pb-6'
            }`}
          >
            {!mini && (
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/80">
                  <span className="font-semibold text-white">@{video.director}</span>
                  <span aria-hidden="true">·</span>
                  <span>{video.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{video.date}</span>
                </div>
                <h2 className="text-lg sm:text-2xl font-semibold tracking-tight leading-snug">
                  {video.title}
                </h2>
                <p className="text-xs sm:text-sm text-white/75 line-clamp-2 leading-relaxed">
                  {video.subtitle}
                </p>
              </div>
            )}

            {/* 进度条：沉浸模式下铺满整行，只保留拖动条；迷你窗口保留播放键与时间 */}
            <div className={`flex items-center pointer-events-auto ${mini ? 'gap-1.5' : ''}`}>
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
              {/* 抖音风格纤细进度条：2px 细线 + 已播放高亮，不显示拖动圆点 */}
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
    </div>
  );
}

export function VideosView({
  videos,
  categories,
  savedIds,
  likedIds,
  searchQuery = '',
  onToggleSave,
  onToggleLike,
  onPlayVideo,
  progressById,
  onSaveProgress,
  resumeVideoId,
  resumeMuted,
  resumePlaybackRate,
  mode = 'immersive',
  onMiniClose,
  onMiniExpand,
}: VideosViewProps) {
  const filterCategories = categories && categories.length ? categories : DEFAULT_CATEGORIES;
  const isMini = mode === 'mini';
  const isHidden = mode === 'hidden';

  // 用持久化的状态初始化 activeIndex / 静音 / 倍速，让 MiniPlayer ↔ FeedSlide 状态一致
  const initialIndex = videos.findIndex((v) => v.id === resumeVideoId);
  const [category, setCategory] = useState<CategoryFilter>('全部');
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed');
  const [activeIndex, setActiveIndex] = useState(Math.max(0, initialIndex));
  /** 用户是否真正播放过视频：只有播放过才把当前视频交给迷你播放器 */
  const [hasPlayed, setHasPlayed] = useState(false);
  // Autoplay is only allowed when muted, so the feed starts silent like Douyin.
  const [isMuted, setIsMuted] = useState(typeof resumeMuted === 'boolean' ? resumeMuted : true);
  const [playbackRate, setPlaybackRate] = useState(typeof resumePlaybackRate === 'number' ? resumePlaybackRate : 1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [unmuteOnNextPlay, setUnmuteOnNextPlay] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const playersRef = useRef<Map<string, MediaPlayerInstance>>(new Map());
  const swiperRef = useRef<SwiperClass | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  // 跟踪播放区的全屏状态，切换按钮图标
  useEffect(() => {
    const handleChange = () => setIsFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredVideos = videos.filter((v) => {
    const matchCategory = category === '全部' || v.category === category;
    const matchQuery =
      !normalizedQuery ||
      v.title.toLowerCase().includes(normalizedQuery) ||
      v.subtitle.toLowerCase().includes(normalizedQuery) ||
      v.director.toLowerCase().includes(normalizedQuery);
    return matchCategory && matchQuery;
  });

  // Reset index cleanly when filter changes
  useEffect(() => {
    setActiveIndex(0);
    setCurrentTime(0);
  }, [category, normalizedQuery]);

  const safeIndex =
    filteredVideos.length > 0 ? Math.min(activeIndex, filteredVideos.length - 1) : 0;
  const currentVideo = filteredVideos[safeIndex] ?? null;

  useEffect(() => {
    setCurrentTime(0);
    setDuration(currentVideo?.durationSeconds ?? 0);
    // 只有用户播放过视频，才把当前视频交给悬浮迷你播放器；
    // 否则进入站点就会凭空出现迷你播放器
    if (viewMode === 'feed' && currentVideo && hasPlayed) {
      onPlayVideo?.(currentVideo, { muted: isMuted, playbackRate });
    }
  }, [currentVideo?.id, hasPlayed]);

  // 同步静音/倍速设置到悬浮迷你播放器
  useEffect(() => {
    if (viewMode === 'feed' && currentVideo && hasPlayed) {
      onPlayVideo?.(currentVideo, { muted: isMuted, playbackRate });
    }
  }, [isMuted, playbackRate, hasPlayed]);

  const registerPlayer = useCallback(
    (id: string, player: MediaPlayerInstance | null) => {
      if (player) playersRef.current.set(id, player);
      else playersRef.current.delete(id);
    },
    [],
  );

  const getActivePlayer = () =>
    currentVideo ? playersRef.current.get(currentVideo.id) ?? null : null;

  const togglePlayback = () => {
    const player = getActivePlayer();
    if (!player) return;
    if (player.paused) {
      // 用户主动播放时，解除静音（如果之前是自动播放被静音）
      if (isMuted) {
        setIsMuted(false);
        player.muted = false;
      }
      setHasPlayed(true);
      void player.play().catch(() => {});
    } else {
      player.pause();
    }
  };

  const seekTo = (time: number) => {
    const player = getActivePlayer();
    const clamped = Math.max(
      0,
      Math.min(time, duration || currentVideo?.durationSeconds || 0),
    );
    setCurrentTime(clamped);
    if (player) player.currentTime = clamped;
  };

  const handleSlideChange = (swiper: SwiperClass) => {
    setActiveIndex(swiper.realIndex);
    setCurrentTime(0);
  };

  const handleNext = () => swiperRef.current?.slideNext();
  const handlePrev = () => swiperRef.current?.slidePrev();

  /** 将整个播放区（含右侧操作栏与底部进度条）切入全屏 */
  const toggleFullscreen = () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen?.();
      return;
    }
    const request = stage.requestFullscreen?.bind(stage);
    if (request) {
      void request().catch(() => {});
      return;
    }
    // iOS Safari 不支持元素全屏，退化为原生视频全屏
    const videoEl = stage.querySelector('video') as
      | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
      | null;
    videoEl?.webkitEnterFullscreen?.();
  };

  // 网格模式下沉浸式播放区虽然被隐藏，但 <video> 仍在运行，需要主动暂停避免后台出声
  useEffect(() => {
    if (viewMode !== 'grid') return;
    const player = getActivePlayer();
    if (player && !player.paused) player.pause();
  }, [viewMode, currentVideo?.id]);

  // 迷你窗口关闭后播放器被完全隐藏，需要主动暂停，避免后台继续出声
  useEffect(() => {
    if (mode !== 'hidden') return;
    const player = getActivePlayer();
    if (player && !player.paused) player.pause();
  }, [mode, currentVideo?.id]);

  // 迷你窗口内禁用滚轮/键盘滑动，避免劫持其他板块的滚动与快捷键
  useEffect(() => {
    const swiper = swiperRef.current;
    if (!swiper) return;
    if (isMini) {
      swiper.mousewheel?.disable?.();
      swiper.keyboard?.disable?.();
    } else {
      swiper.mousewheel?.enable?.();
      swiper.keyboard?.enable?.();
    }
  }, [isMini, currentVideo?.id]);

  // Space toggles playback; arrow keys are handled by Swiper's keyboard module.
  useEffect(() => {
    if (viewMode !== 'feed' || !currentVideo) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === ' ') {
        e.preventDefault();
        togglePlayback();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewMode, currentVideo?.id]);

  return (
    <section
      aria-label="视频频道"
      className={
        isHidden
          ? 'hidden'
          : isMini
            ? 'fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-[60] w-[min(58vw,210px)] h-[118px] sm:w-[240px] sm:h-[135px] rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10'
            : 'space-y-4'
      }
    >
      {/* Compact Top Filter & View Mode Row（移动端隐藏分类筛选与浏览方式切换） */}
      {!isMini && (
      <div className="hidden sm:flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="视频分类"
          className="inline-flex items-center p-0.5 sm:p-1 rounded-xl bg-[#EEEEF0] dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.06] overflow-x-auto max-w-full"
        >
          {(['全部', ...filterCategories] as CategoryFilter[]).map((item) => {
            const active = category === item;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(item)}
                className={`relative px-2.5 py-1 min-h-[30px] text-[11px] font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 sm:px-3.5 sm:py-1.5 sm:min-h-[36px] sm:text-xs ${
                  active
                    ? 'text-[#1D1D1F] dark:text-white'
                    : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="douyinVideoCatPill"
                    transition={SWIFTUI_SNAPPY}
                    className="absolute inset-0 rounded-lg bg-white dark:bg-[#2C2C2E] shadow-xs"
                  />
                )}
                <span className="relative z-10">{item}</span>
              </button>
            );
          })}
        </div>

        {/* Feed vs Grid Switcher */}
        <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-[#EEEEF0] dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.06]">
          <Tooltip label="沉浸刷看" side="bottom">
            <button
              type="button"
              onClick={() => setViewMode('feed')}
              aria-label="沉浸刷看"
              className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                viewMode === 'feed'
                  ? 'text-[#1D1D1F] dark:text-white'
                  : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white'
              }`}
            >
              {viewMode === 'feed' && (
                <motion.span
                  layoutId="videoModeSwitch"
                  transition={SWIFTUI_SNAPPY}
                  className="absolute inset-0 rounded-lg bg-white dark:bg-[#2C2C2E] shadow-xs"
                />
              )}
              <Rows3 className="relative z-10 w-4 h-4" />
            </button>
          </Tooltip>

          <Tooltip label="发现网格" side="bottom">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="发现网格"
              className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'text-[#1D1D1F] dark:text-white'
                  : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white'
              }`}
            >
              {viewMode === 'grid' && (
                <motion.span
                  layoutId="videoModeSwitch"
                  transition={SWIFTUI_SNAPPY}
                  className="absolute inset-0 rounded-lg bg-white dark:bg-[#2C2C2E] shadow-xs"
                />
              )}
              <LayoutGrid className="relative z-10 w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>
      )}

      {/* Empty Search Result */}
      {!isMini && filteredVideos.length === 0 && (
        <div className="rounded-3xl bg-white dark:bg-[#161618] border border-black/[0.06] dark:border-white/[0.08] py-20 text-center space-y-2">
          <p className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
            没有找到匹配的视频
          </p>
          <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">
            尝试更换关键词或切换其他分类
          </p>
        </div>
      )}

      {/* Mode 1: Douyin-style Immersive Seamless Feed
          始终挂载（网格模式用 CSS 隐藏），切换板块时只改变容器形态，
          <video> 元素不会被销毁重建，从而避免重新加载造成的卡顿 */}
      {currentVideo && (
        <div
          className={
            viewMode === 'grid' && !isMini
              ? 'hidden'
              : isMini
                ? 'h-full w-full'
                : 'flex items-stretch gap-3 lg:gap-4'
          }
        >
          {/* Full-bleed carousel stage: every slide fills the whole container */}
          <div
            ref={stageRef}
            className={
              isMini
                ? 'relative w-full h-full overflow-hidden'
                : 'relative flex-1 min-w-0 h-[100dvh] md:h-[calc(100dvh-10.75rem)] min-h-[420px] rounded-none md:rounded-3xl overflow-hidden bg-[#0A0A0C] border-0 md:border border-black/[0.08] dark:border-white/[0.1] shadow-none md:shadow-lg select-none [&:fullscreen]:h-screen [&:fullscreen]:w-screen [&:fullscreen]:rounded-none [&:fullscreen]:border-0'
            }
          >
            <Swiper
              key={`${category}-${normalizedQuery}`}
              onSwiper={(instance) => {
                swiperRef.current = instance;
              }}
              direction="vertical"
              slidesPerView={1}
              loop={filteredVideos.length > 1}
              speed={520}
              initialSlide={safeIndex}
              modules={[Mousewheel, Keyboard, A11y]}
              mousewheel={{ forceToAxis: true, sensitivity: 1, thresholdDelta: 16 }}
              keyboard={{ enabled: true }}
              a11y={{ enabled: true }}
              onSlideChange={handleSlideChange}
              className="w-full h-full"
            >
              {filteredVideos.map((video, idx) => (
                <SwiperSlide key={video.id} className="relative">
                  <FeedSlide
                    video={video}
                    index={idx}
                    total={filteredVideos.length}
                    active={idx === safeIndex}
                    isMuted={isMuted}
                    playbackRate={playbackRate}
                    liked={likedIds.includes(video.id)}
                    saved={savedIds.includes(video.id)}
                    currentTime={currentTime}
                    duration={duration}
                    isFullscreen={isFullscreen}
                    savedTime={progressById?.[video.id]}
                    onRegisterPlayer={registerPlayer}
                    onTogglePlay={togglePlayback}
                    onToggleMute={() => setIsMuted((m) => !m)}
                    onSetRate={setPlaybackRate}
                    onToggleLike={() => onToggleLike(video.id)}
                    onToggleSave={() => onToggleSave(video.id)}
                    onToggleFullscreen={toggleFullscreen}
                    onSeek={seekTo}
                    onTimeUpdate={setCurrentTime}
                    onDurationChange={setDuration}
                    onSaveProgress={onSaveProgress ? (t) => onSaveProgress(video.id, t) : undefined}
                    mini={isMini}
                    onMiniClose={onMiniClose}
                    onMiniExpand={onMiniExpand}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          {/* Douyin-style External Up/Down Video Switcher Column (Desktop & Tablet) */}
          {!isMini && (
            <div className="hidden sm:flex flex-col justify-center gap-3 shrink-0">
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={handlePrev}
              disabled={filteredVideos.length <= 1}
              aria-label="上一个视频"
              className="w-11 h-11 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] shadow-xs flex items-center justify-center text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] disabled:opacity-40 transition-colors"
            >
              <ChevronUp className="w-5 h-5" />
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={handleNext}
              disabled={filteredVideos.length <= 1}
              aria-label="下一个视频"
              className="w-11 h-11 rounded-full bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] shadow-xs flex items-center justify-center text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F2F2F7] dark:hover:bg-[#2C2C2E] disabled:opacity-40 transition-colors"
            >
              <ChevronDown className="w-5 h-5" />
            </motion.button>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Discovery Masonry */}
      {!isMini && viewMode === 'grid' && filteredVideos.length > 0 && (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-5">
          {filteredVideos.map((video, idx) => (
            <VideoGridCard
              key={video.id}
              video={video}
              index={idx}
              liked={likedIds.includes(video.id)}
              saved={savedIds.includes(video.id)}
              onToggleLike={() => onToggleLike(video.id)}
              onToggleSave={() => onToggleSave(video.id)}
              onOpen={() => {
                setActiveIndex(idx);
                setCurrentTime(0);
                setViewMode('feed');
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
