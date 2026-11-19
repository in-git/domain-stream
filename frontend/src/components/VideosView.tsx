import { useCallback, useEffect, useRef, useState } from 'react';
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
  Layers,
  LayoutGrid,
  Pause,
  Play,
  Rows3,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { VideoItem } from '../data/content';
import { SWIFTUI_BOUNCY, SWIFTUI_SHEET, SWIFTUI_SMOOTH, SWIFTUI_SNAPPY } from '../lib/motion';
import { ResilientImage } from './ResilientImage';

interface VideosViewProps {
  videos: VideoItem[];
  categories?: string[];
  savedIds: string[];
  likedIds: string[];
  searchQuery?: string;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
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
  onOpen: () => void;
}

function VideoGridCard({ video, index, onOpen }: VideoGridCardProps) {
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
        <h3 className="text-[13px] sm:text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] line-clamp-2">
          {video.title}
        </h3>
      </div>
    </motion.article>
  );
}

interface FeedSlideProps {
  video: VideoItem;
  index: number;
  total: number;
  active: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  playbackRate: number;
  liked: boolean;
  saved: boolean;
  currentTime: number;
  duration: number;
  showChapters: boolean;
  onRegisterPlayer: (id: string, player: MediaPlayerInstance | null) => void;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onSetRate: (rate: number) => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onToggleChapters: () => void;
  onSeek: (time: number) => void;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onPlay: () => void;
  onPause: () => void;
}

/** One full-bleed page of the seamless vertical carousel. */
function FeedSlide({
  video,
  index,
  total,
  active,
  isPlaying,
  isMuted,
  playbackRate,
  liked,
  saved,
  currentTime,
  duration,
  showChapters,
  onRegisterPlayer,
  onTogglePlay,
  onToggleMute,
  onSetRate,
  onToggleLike,
  onToggleSave,
  onToggleChapters,
  onSeek,
  onTimeUpdate,
  onDurationChange,
  onPlay,
  onPause,
}: FeedSlideProps) {
  const playerRef = useRef<MediaPlayerInstance | null>(null);

  const setPlayerRef = useCallback(
    (player: MediaPlayerInstance | null) => {
      playerRef.current = player;
      onRegisterPlayer(video.id, player);
    },
    [onRegisterPlayer, video.id],
  );

  // Only the visible page plays; the rest stay paused at the first frame.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    if (active) {
      player.muted = isMuted;
      player.playbackRate = playbackRate;
      void player.play().catch(() => {});
    } else {
      player.pause();
      player.currentTime = 0;
    }
  }, [active, isMuted, playbackRate]);

  const progressMax = Math.max(duration, video.durationSeconds, 1);
  const progressValue = Math.min(currentTime, progressMax);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <MediaPlayer
        ref={setPlayerRef}
        src={video.src}
        poster={video.cover}
        title={video.title}
        playsInline
        loop
        muted={isMuted}
        playbackRate={playbackRate}
        className="absolute inset-0 w-full h-full"
        onClick={active ? onTogglePlay : undefined}
        onPlay={() => {
          if (active) onPlay();
        }}
        onPause={() => {
          if (active) onPause();
        }}
        onTimeUpdate={(detail) => {
          if (active) onTimeUpdate(detail.currentTime);
        }}
        onDurationChange={(value) => {
          if (active) onDurationChange(value);
        }}
      >
        <MediaProvider className="w-full h-full" />
      </MediaPlayer>

      {active && (
        <>
          {/* Subtle cinematic contrast scrims */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-black/30" />

          {/* Center Paused Indicator */}
          <AnimatePresence>
            {!isPlaying && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={SWIFTUI_BOUNCY}
                className="pointer-events-none absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/45 backdrop-blur-md border border-white/25 flex items-center justify-center text-white"
              >
                <Play className="w-7 h-7 fill-white translate-x-[2px]" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top Status + Playback Rate */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 pointer-events-none">
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

          {/* Douyin-style Right-Side Vertical Action Dock */}
          <div className="absolute right-3 sm:right-5 bottom-20 flex flex-col items-center gap-4 z-10 text-white">
            <motion.button
              type="button"
              whileTap={{ scale: 0.84 }}
              transition={SWIFTUI_BOUNCY}
              onClick={onToggleLike}
              aria-label={liked ? '取消喜欢' : '喜欢'}
              className="flex flex-col items-center gap-1 min-w-[44px]"
            >
              <span
                className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors ${
                  liked
                    ? 'bg-[#FF2C55]/25 border-[#FF2C55]/60 text-[#FF2C55]'
                    : 'bg-black/45 border-white/15 text-white hover:bg-black/65'
                }`}
              >
                <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
              </span>
              <span className="text-[11px] font-medium tabular-nums drop-shadow">
                {liked ? '已赞' : '喜欢'}
              </span>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.84 }}
              transition={SWIFTUI_BOUNCY}
              onClick={onToggleSave}
              aria-label={saved ? '取消收藏' : '收藏'}
              className="flex flex-col items-center gap-1 min-w-[44px]"
            >
              <span
                className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors ${
                  saved
                    ? 'bg-[#FFB800]/25 border-[#FFB800]/60 text-[#FFD60A]'
                    : 'bg-black/45 border-white/15 text-white hover:bg-black/65'
                }`}
              >
                <Bookmark className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
              </span>
              <span className="text-[11px] font-medium drop-shadow">
                {saved ? '已收藏' : '收藏'}
              </span>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={onToggleChapters}
              aria-label="查看章节"
              className="flex flex-col items-center gap-1 min-w-[44px]"
            >
              <span
                className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors ${
                  showChapters
                    ? 'bg-[#0A84FF] border-[#0A84FF] text-white'
                    : 'bg-black/45 border-white/15 text-white hover:bg-black/65'
                }`}
              >
                <Layers className="w-5 h-5" />
              </span>
              <span className="text-[11px] font-medium drop-shadow">章节</span>
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ scale: 0.88 }}
              onClick={onToggleMute}
              aria-label={isMuted ? '取消静音' : '静音'}
              className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/65 transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </motion.button>
          </div>

          {/* Bottom Info + Progress Scrubber */}
          <div className="absolute bottom-0 left-0 right-0 text-white z-10 space-y-3 p-4 sm:p-6 pr-20 sm:pr-24">
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

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onTogglePlay}
                aria-label={isPlaying ? '暂停' : '播放'}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0"
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-white" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-white translate-x-[1px]" />
                )}
              </button>
              <span className="text-[11px] font-mono-tabular text-white/80 w-10">
                {formatTime(currentTime)}
              </span>
              <input
                type="range"
                min={0}
                max={progressMax}
                step={0.05}
                value={progressValue}
                onChange={(e) => onSeek(Number(e.target.value))}
                aria-label="播放进度"
                className="flex-1 min-w-0 h-1 accent-white cursor-pointer rounded-full bg-white/25"
              />
              <span className="text-[11px] font-mono-tabular text-white/65 text-right w-10">
                {formatTime(progressMax)}
              </span>
            </div>
          </div>

          {/* Slide-Up Chapters Overlay Drawer */}
          <AnimatePresence>
            {showChapters && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={SWIFTUI_SHEET}
                className="absolute inset-x-4 bottom-20 sm:left-auto sm:right-4 sm:w-72 rounded-2xl bg-[#161618]/92 backdrop-blur-xl border border-white/15 p-4 text-white shadow-2xl z-20"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold">章节目录</span>
                  <button
                    type="button"
                    onClick={onToggleChapters}
                    className="p-1 rounded-full hover:bg-white/10"
                    aria-label="关闭章节"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {video.chapters.map((ch) => (
                    <button
                      key={ch.label}
                      type="button"
                      onClick={() => onSeek(ch.time)}
                      className="w-full px-3 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] flex items-center justify-between text-xs transition-colors"
                    >
                      <span>{ch.label}</span>
                      <span className="font-mono-tabular text-[#0A84FF]">
                        {formatTime(ch.time)}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
}: VideosViewProps) {
  const filterCategories = categories && categories.length ? categories : DEFAULT_CATEGORIES;
  const [category, setCategory] = useState<CategoryFilter>('全部');
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  // Autoplay is only allowed when muted, so the feed starts silent like Douyin.
  const [isMuted, setIsMuted] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showChapters, setShowChapters] = useState(false);

  const playersRef = useRef<Map<string, MediaPlayerInstance>>(new Map());
  const swiperRef = useRef<SwiperClass | null>(null);

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
    setShowChapters(false);
    setIsPlaying(true);
  }, [category, normalizedQuery]);

  const safeIndex =
    filteredVideos.length > 0 ? Math.min(activeIndex, filteredVideos.length - 1) : 0;
  const currentVideo = filteredVideos[safeIndex] ?? null;

  useEffect(() => {
    setCurrentTime(0);
    setDuration(currentVideo?.durationSeconds ?? 0);
    setShowChapters(false);
    setIsPlaying(true);
  }, [currentVideo?.id]);

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
    setShowChapters(false);
    setIsPlaying(true);
  };

  const handleNext = () => swiperRef.current?.slideNext();
  const handlePrev = () => swiperRef.current?.slidePrev();

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
    <section aria-label="视频频道" className="space-y-4">
      {/* Compact Top Filter & View Mode Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="视频分类"
          className="inline-flex items-center p-1 rounded-xl bg-[#EEEEF0] dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.06] overflow-x-auto max-w-full"
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
                className={`relative px-3.5 py-1.5 min-h-[36px] text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
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
        <div className="inline-flex items-center p-1 rounded-xl bg-[#EEEEF0] dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.06]">
          <button
            type="button"
            onClick={() => setViewMode('feed')}
            className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              viewMode === 'feed'
                ? 'text-[#1D1D1F] dark:text-white'
                : 'text-[#6E6E73] dark:text-[#98989D]'
            }`}
          >
            {viewMode === 'feed' && (
              <motion.span
                layoutId="videoModeSwitch"
                transition={SWIFTUI_SNAPPY}
                className="absolute inset-0 rounded-lg bg-white dark:bg-[#2C2C2E] shadow-xs"
              />
            )}
            <Rows3 className="relative z-10 w-3.5 h-3.5" />
            <span className="relative z-10">沉浸刷看</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              viewMode === 'grid'
                ? 'text-[#1D1D1F] dark:text-white'
                : 'text-[#6E6E73] dark:text-[#98989D]'
            }`}
          >
            {viewMode === 'grid' && (
              <motion.span
                layoutId="videoModeSwitch"
                transition={SWIFTUI_SNAPPY}
                className="absolute inset-0 rounded-lg bg-white dark:bg-[#2C2C2E] shadow-xs"
              />
            )}
            <LayoutGrid className="relative z-10 w-3.5 h-3.5" />
            <span className="relative z-10">发现网格</span>
          </button>
        </div>
      </div>

      {/* Empty Search Result */}
      {filteredVideos.length === 0 && (
        <div className="rounded-3xl bg-white dark:bg-[#161618] border border-black/[0.06] dark:border-white/[0.08] py-20 text-center space-y-2">
          <p className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
            没有找到匹配的视频
          </p>
          <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">
            尝试更换关键词或切换其他分类
          </p>
        </div>
      )}

      {/* Mode 1: Douyin-style Immersive Seamless Feed */}
      {viewMode === 'feed' && currentVideo && (
        <div className="flex items-stretch gap-3 lg:gap-4">
          {/* Full-bleed carousel stage: every slide fills the whole container */}
          <div className="relative flex-1 min-w-0 h-[calc(100dvh-14.25rem)] sm:h-[calc(100dvh-10.75rem)] min-h-[420px] rounded-3xl overflow-hidden bg-[#0A0A0C] border border-black/[0.08] dark:border-white/[0.1] shadow-lg select-none">
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
                    isPlaying={isPlaying}
                    isMuted={isMuted}
                    playbackRate={playbackRate}
                    liked={likedIds.includes(video.id)}
                    saved={savedIds.includes(video.id)}
                    currentTime={currentTime}
                    duration={duration}
                    showChapters={showChapters}
                    onRegisterPlayer={registerPlayer}
                    onTogglePlay={togglePlayback}
                    onToggleMute={() => setIsMuted((m) => !m)}
                    onSetRate={setPlaybackRate}
                    onToggleLike={() => onToggleLike(video.id)}
                    onToggleSave={() => onToggleSave(video.id)}
                    onToggleChapters={() => setShowChapters((s) => !s)}
                    onSeek={seekTo}
                    onTimeUpdate={setCurrentTime}
                    onDurationChange={setDuration}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          {/* Douyin-style External Up/Down Video Switcher Column (Desktop & Tablet) */}
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
        </div>
      )}

      {/* Mode 2: Discovery Masonry */}
      {viewMode === 'grid' && filteredVideos.length > 0 && (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5 gap-5">
          {filteredVideos.map((video, idx) => (
            <VideoGridCard
              key={video.id}
              video={video}
              index={idx}
              onOpen={() => {
                setActiveIndex(idx);
                setCurrentTime(0);
                setIsPlaying(true);
                setShowChapters(false);
                setViewMode('feed');
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
