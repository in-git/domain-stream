import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
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
  savedIds: string[];
  likedIds: string[];
  searchQuery?: string;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
}

const CATEGORIES = ['全部', '设计纪实', '城市影像', '自然声景'] as const;
type CategoryFilter = (typeof CATEGORIES)[number];

function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function VideosView({
  videos,
  savedIds,
  likedIds,
  searchQuery = '',
  onToggleSave,
  onToggleLike,
}: VideosViewProps) {
  const [category, setCategory] = useState<CategoryFilter>('全部');
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed');
  const [activeIndex, setActiveIndex] = useState(0);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [showChapters, setShowChapters] = useState(false);

  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);
  const wheelLockRef = useRef<number>(0);
  const touchStartYRef = useRef<number | null>(null);

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

  const goToIndex = (nextIdx: number, dir: 1 | -1) => {
    if (filteredVideos.length <= 1) return;
    const wrapped = (nextIdx + filteredVideos.length) % filteredVideos.length;
    setSlideDirection(dir);
    setActiveIndex(wrapped);
    setCurrentTime(0);
    setIsPlaying(true);
    setShowChapters(false);
  };

  const handleNext = () => goToIndex(safeIndex + 1, 1);
  const handlePrev = () => goToIndex(safeIndex - 1, -1);

  // 60fps playback progression
  useEffect(() => {
    if (viewMode !== 'feed' || !currentVideo || !isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    lastTickRef.current = performance.now();
    const step = (now: number) => {
      const dt = (now - lastTickRef.current) / 1000;
      lastTickRef.current = now;
      setCurrentTime((prev) => {
        const next = prev + dt * playbackRate;
        if (next >= currentVideo.durationSeconds) {
          return 0; // loop smoothly in Douyin feed style
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [viewMode, currentVideo, isPlaying, playbackRate]);

  // Keyboard navigation in feed mode
  useEffect(() => {
    if (viewMode !== 'feed' || !currentVideo) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [viewMode, currentVideo, safeIndex, filteredVideos.length]);

  const handleWheel = (e: React.WheelEvent) => {
    if (viewMode !== 'feed' || filteredVideos.length <= 1) return;
    const now = Date.now();
    if (now - wheelLockRef.current < 520) return;
    if (Math.abs(e.deltaY) > 28) {
      wheelLockRef.current = now;
      if (e.deltaY > 0) handleNext();
      else handlePrev();
    }
  };

  const progressRatio = currentVideo
    ? Math.min(1, currentTime / currentVideo.durationSeconds)
    : 0;
  const motionScale = 1.02 + Math.sin(progressRatio * Math.PI) * 0.06;
  const motionX = (progressRatio - 0.5) * -2.4;

  return (
    <section aria-label="视频频道" className="space-y-4">
      {/* Compact Top Filter & View Mode Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="视频分类"
          className="inline-flex items-center p-1 rounded-xl bg-[#EEEEF0] dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.06] overflow-x-auto max-w-full"
        >
          {CATEGORIES.map((item) => {
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

      {/* Mode 1: Douyin Web Homepage Immersive Feed */}
      {viewMode === 'feed' && currentVideo && (
        <div className="flex items-stretch gap-3 lg:gap-4">
          {/* Main Immersive Cinema Player Stage */}
          <div
            onWheel={handleWheel}
            onTouchStart={(e) => {
              touchStartYRef.current = e.touches[0].clientY;
            }}
            onTouchEnd={(e) => {
              if (touchStartYRef.current === null) return;
              const delta = touchStartYRef.current - e.changedTouches[0].clientY;
              touchStartYRef.current = null;
              if (Math.abs(delta) > 48) {
                if (delta > 0) handleNext();
                else handlePrev();
              }
            }}
            className="relative flex-1 h-[calc(100vh-12.75rem)] md:h-[calc(100vh-9.25rem)] min-h-[460px] rounded-3xl overflow-hidden bg-[#0A0A0C] border border-black/[0.08] dark:border-white/[0.1] shadow-lg select-none"
          >
            <AnimatePresence initial={false} custom={slideDirection} mode="popLayout">
              <motion.div
                key={currentVideo.id}
                custom={slideDirection}
                initial={{ opacity: 0.4, y: slideDirection * 64, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0.2, y: slideDirection * -64, scale: 0.98 }}
                transition={SWIFTUI_SMOOTH}
                className="absolute inset-0"
              >
                {/* Living Ambient Cinema Frame */}
                <div
                  onClick={() => setIsPlaying((p) => !p)}
                  className="relative w-full h-full cursor-pointer overflow-hidden"
                >
                  <img
                    src={currentVideo.cover}
                    alt={currentVideo.title}
                    referrerPolicy="no-referrer"
                    style={{
                      transform: `scale(${motionScale}) translateX(${motionX}%)`,
                      transition: isPlaying ? 'transform 0.2s linear' : 'transform 0.45s ease-out',
                    }}
                    className="w-full h-full object-cover"
                  />

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
                        className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/45 backdrop-blur-md border border-white/25 flex items-center justify-center text-white"
                      >
                        <Play className="w-7 h-7 fill-white translate-x-[2px]" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Top Left Status */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <div className="px-3 py-1 rounded-full bg-black/45 backdrop-blur-md border border-white/10 text-[11px] text-white/90 tabular-nums">
                {safeIndex + 1} / {filteredVideos.length} · {currentVideo.resolution}
              </div>

              <div className="pointer-events-auto flex items-center gap-1 bg-black/45 backdrop-blur-md border border-white/10 p-1 rounded-full">
                {[1, 1.5, 2].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setPlaybackRate(rate)}
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
              {/* Like */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.84 }}
                transition={SWIFTUI_BOUNCY}
                onClick={() => onToggleLike(currentVideo.id)}
                aria-label={likedIds.includes(currentVideo.id) ? '取消喜欢' : '喜欢'}
                className="flex flex-col items-center gap-1 min-w-[44px]"
              >
                <span
                  className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors ${
                    likedIds.includes(currentVideo.id)
                      ? 'bg-[#FF2C55]/25 border-[#FF2C55]/60 text-[#FF2C55]'
                      : 'bg-black/45 border-white/15 text-white hover:bg-black/65'
                  }`}
                >
                  <Heart
                    className={`w-5 h-5 ${
                      likedIds.includes(currentVideo.id) ? 'fill-current' : ''
                    }`}
                  />
                </span>
                <span className="text-[11px] font-medium tabular-nums drop-shadow">
                  {likedIds.includes(currentVideo.id) ? '已赞' : '喜欢'}
                </span>
              </motion.button>

              {/* Bookmark / Save */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.84 }}
                transition={SWIFTUI_BOUNCY}
                onClick={() => onToggleSave(currentVideo.id)}
                aria-label={savedIds.includes(currentVideo.id) ? '取消收藏' : '收藏'}
                className="flex flex-col items-center gap-1 min-w-[44px]"
              >
                <span
                  className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-colors ${
                    savedIds.includes(currentVideo.id)
                      ? 'bg-[#FFB800]/25 border-[#FFB800]/60 text-[#FFD60A]'
                      : 'bg-black/45 border-white/15 text-white hover:bg-black/65'
                  }`}
                >
                  <Bookmark
                    className={`w-5 h-5 ${
                      savedIds.includes(currentVideo.id) ? 'fill-current' : ''
                    }`}
                  />
                </span>
                <span className="text-[11px] font-medium drop-shadow">
                  {savedIds.includes(currentVideo.id) ? '已收藏' : '收藏'}
                </span>
              </motion.button>

              {/* Chapters */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.88 }}
                onClick={() => setShowChapters((s) => !s)}
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

              {/* Mute */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.88 }}
                onClick={() => setIsMuted((m) => !m)}
                aria-label={isMuted ? '取消静音' : '静音'}
                className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/65 transition-colors"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </motion.button>
            </div>

            {/* Bottom-Left Overlay Info + Progress Scrubber */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 pr-20 sm:pr-24 text-white z-10 space-y-3">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/80">
                  <span className="font-semibold text-white">@{currentVideo.director}</span>
                  <span aria-hidden="true">·</span>
                  <span>{currentVideo.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{currentVideo.date}</span>
                </div>
                <h2 className="text-lg sm:text-2xl font-semibold tracking-tight leading-snug">
                  {currentVideo.title}
                </h2>
                <p className="text-xs sm:text-sm text-white/75 line-clamp-2 leading-relaxed">
                  {currentVideo.subtitle}
                </p>
              </div>

              {/* Bottom Playback Controls & Scrubber */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
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
                  max={currentVideo.durationSeconds}
                  step={0.5}
                  value={currentTime}
                  onChange={(e) => setCurrentTime(Number(e.target.value))}
                  aria-label="播放进度"
                  className="flex-1 h-1 accent-white cursor-pointer rounded-full bg-white/25"
                />
                <span className="text-[11px] font-mono-tabular text-white/65 w-10 text-right">
                  {currentVideo.durationLabel}
                </span>
              </div>
            </div>

            {/* Optional Slide-Up Chapters Overlay Drawer */}
            <AnimatePresence>
              {showChapters && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  transition={SWIFTUI_SHEET}
                  className="absolute inset-x-4 bottom-20 sm:right-20 sm:left-auto sm:w-80 rounded-2xl bg-[#161618]/92 backdrop-blur-xl border border-white/15 p-4 text-white shadow-2xl z-20"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold">章节目录</span>
                    <button
                      type="button"
                      onClick={() => setShowChapters(false)}
                      className="p-1 rounded-full hover:bg-white/10"
                      aria-label="关闭章节"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {currentVideo.chapters.map((ch) => (
                      <button
                        key={ch.label}
                        type="button"
                        onClick={() => {
                          setCurrentTime(ch.time);
                          setIsPlaying(true);
                          setShowChapters(false);
                        }}
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

      {/* Mode 2: Discovery Grid */}
      {viewMode === 'grid' && filteredVideos.length > 0 && (
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {filteredVideos.map((video, idx) => (
            <motion.article
              key={video.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SWIFTUI_SMOOTH, delay: idx * 0.03 }}
              whileHover={{ y: -2 }}
              className="group rounded-2xl overflow-hidden bg-white dark:bg-[#161618] border border-black/[0.06] dark:border-white/[0.08]"
            >
              <button
                type="button"
                onClick={() => {
                  setActiveIndex(idx);
                  setCurrentTime(0);
                  setIsPlaying(true);
                  setViewMode('feed');
                }}
                className="relative aspect-video w-full overflow-hidden text-left"
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
              <div className="p-4 space-y-1.5">
                <div className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                  {video.category} · {video.director}
                </div>
                <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] line-clamp-1">
                  {video.title}
                </h3>
              </div>
            </motion.article>
          ))}
        </motion.div>
      )}
    </section>
  );
}
