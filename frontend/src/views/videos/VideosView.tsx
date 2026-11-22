import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MediaPlayerInstance } from '@vidstack/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Keyboard, Mousewheel } from 'swiper/modules';
import type { Swiper as SwiperClass } from 'swiper';
import 'swiper/css';
import type { VideoItem } from '../../data/content';
import { FeedSlide } from './FeedSlide';
import { ImmersiveModal } from './ImmersiveModal';
import {
  DesktopFeedCategories,
  DesktopGridCategories,
  DesktopVideoGrid,
} from './DesktopView';
import { MobileGridCategories, MobileVideoGrid } from './MobileView';
import { DEFAULT_CATEGORIES, VIDEO_PAGE_SIZE, type ViewMode } from './shared';

interface VideosViewProps {
  videos: VideoItem[];
  categories?: string[];
  /** 当前分类由数据层持有，切换时触发后端按分类请求 */
  category: string;
  onCategoryChange: (category: string) => void;
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
  onMiniClose?: () => void;
  onMiniExpand?: () => void;
  /** 视图模式由外壳控制，便于顶部搜索框旁的单一切换按钮复用 */
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export function VideosView({
  videos,
  categories,
  category,
  onCategoryChange,
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
  viewMode = 'feed',
  onViewModeChange,
}: VideosViewProps) {
  const filterCategories = categories && categories.length ? categories : DEFAULT_CATEGORIES;
  const isMini = mode === 'mini';
  const isHidden = mode === 'hidden';

  const initialIndex = videos.findIndex((v) => v.id === resumeVideoId);
  const setViewMode = onViewModeChange ?? (() => {});
  const [activeIndex, setActiveIndex] = useState(Math.max(0, initialIndex));
  const [hasPlayed, setHasPlayed] = useState(false);
  const [isMuted, setIsMuted] = useState(typeof resumeMuted === 'boolean' ? resumeMuted : true);
  /** 用户是否主动点过静音；为 true 时滑动不再自动解除静音（尊重用户选择） */
  const userMutedManuallyRef = useRef(false);
  const [playbackRate, setPlaybackRate] = useState(
    typeof resumePlaybackRate === 'number' ? resumePlaybackRate : 1,
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  /** 从卡片点选后要直接播放的视频（含 src），为 null 时走沉浸流当前索引 */
  const [pickedVideo, setPickedVideo] = useState<VideoItem | null>(null);

  const playersRef = useRef<Map<string, MediaPlayerInstance>>(new Map());
  const swiperRef = useRef<SwiperClass | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  // 分类已由后端按 category 过滤，这里只做搜索关键词的本地过滤
  const filteredVideos = videos.filter((v) =>
    !normalizedQuery ||
    v.title.toLowerCase().includes(normalizedQuery) ||
    v.subtitle.toLowerCase().includes(normalizedQuery) ||
    v.director.toLowerCase().includes(normalizedQuery)
  );

  useEffect(() => {
    setPickedVideo(null);
    setActiveIndex(0);
    setCurrentTime(0);
  }, [category, normalizedQuery]);

  const [visibleCount, setVisibleCount] = useState(VIDEO_PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const visibleVideos = useMemo(
    () => filteredVideos.slice(0, visibleCount),
    [filteredVideos, visibleCount],
  );
  const hasMoreVideos = visibleCount < filteredVideos.length;
  useEffect(() => {
    setVisibleCount(VIDEO_PAGE_SIZE);
  }, [category, normalizedQuery]);
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMoreVideos || viewMode !== 'grid') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) => Math.min(count + VIDEO_PAGE_SIZE, filteredVideos.length));
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreVideos, filteredVideos.length, viewMode]);

  const safeIndex =
    filteredVideos.length > 0 ? Math.min(activeIndex, filteredVideos.length - 1) : 0;
  const currentVideo = filteredVideos[safeIndex] ?? null;

  useEffect(() => {
    setCurrentTime(0);
    setDuration(currentVideo?.durationSeconds ?? 0);
    if (viewMode === 'feed' && currentVideo && hasPlayed) {
      onPlayVideo?.(currentVideo, { muted: isMuted, playbackRate });
    }
  }, [currentVideo?.id, hasPlayed]);

  useEffect(() => {
    if (viewMode === 'feed' && currentVideo && hasPlayed) {
      onPlayVideo?.(currentVideo, { muted: isMuted, playbackRate });
    }
  }, [isMuted, playbackRate, hasPlayed]);

  const registerPlayer = useCallback((id: string, player: MediaPlayerInstance | null) => {
    if (player) playersRef.current.set(id, player);
    else playersRef.current.delete(id);
  }, []);

  const getActivePlayer = () =>
    currentVideo ? playersRef.current.get(currentVideo.id) ?? null : null;

  /** 用户点击静音/取消静音：记录是否为用户主动静音，后续滑动据此决定是否自动解除 */
  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      // 切到静音 → 标记用户主动静音；取消静音 → 清除标记
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
      setHasPlayed(true);
      if (player.paused) void player.play().catch(() => {});
      return;
    }
    if (player.paused) {
      setHasPlayed(true);
      void player.play().catch(() => {});
    } else {
      player.pause();
    }
  };

  const seekTo = (time: number) => {
    const player = getActivePlayer();
    const clamped = Math.max(0, Math.min(time, duration || currentVideo?.durationSeconds || 0));
    setCurrentTime(clamped);
    if (player) player.currentTime = clamped;
  };

  const handleSlideChange = (swiper: SwiperClass) => {
    setActiveIndex(swiper.realIndex);
    setCurrentTime(0);
    // 滑动切换视频时，只要用户没有主动点过静音，就自动解除静音，保证能听到声音
    if (!userMutedManuallyRef.current) {
      setIsMuted(false);
    }
  };

  /** 卡片点击：打开全屏模态框直接播放被点视频（用列表数据里自带的 src） */
  const openVideoAt = useCallback((video: VideoItem) => {
    if (!video?.src) return;
    setPickedVideo(video);
  }, []);

  // 全屏播放模态框：ESC 关闭
  useEffect(() => {
    if (!pickedVideo) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickedVideo(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pickedVideo]);

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
    const videoEl = stage.querySelector('video') as
      | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
      | null;
    videoEl?.webkitEnterFullscreen?.();
  };

  useEffect(() => {
    if (viewMode !== 'grid') return;
    const player = getActivePlayer();
    if (player && !player.paused) player.pause();
  }, [viewMode, currentVideo?.id]);

  useEffect(() => {
    if (mode !== 'hidden') return;
    const player = getActivePlayer();
    if (player && !player.paused) player.pause();
  }, [mode, currentVideo?.id]);

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
    <>
    <section
      aria-label="视频频道"
      className={
        isHidden
          ? 'hidden'
          : isMini
            ? 'fixed bottom-3 right-3 sm:bottom-6 sm:right-6 z-[60] w-[min(58vw,210px)] h-[118px] sm:w-[240px] sm:h-[135px] rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10'
            : 'space-y-0'
      }
    >
      {/* 卡片模式分类：PC / 移动端各自模块，内部用 CSS 断点决定挂载形态 */}
      {!isMini && viewMode === 'grid' && (
        <>
          <DesktopGridCategories
            categories={filterCategories}
            category={category}
            onChange={onCategoryChange}
            viewMode={viewMode}
            onSetViewMode={setViewMode}
          />
          <MobileGridCategories
            categories={filterCategories}
            category={category}
            onChange={onCategoryChange}
          />
        </>
      )}

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

      {/* 沉浸刷看：始终挂载，网格模式下用 CSS 隐藏，保证 <video> 不被销毁重建 */}
      {currentVideo && (
        <div
          className={
            viewMode === 'grid' && !isMini
              ? 'hidden'
              : isMini
                ? 'h-full w-full'
                : 'block'
          }
        >
          <div
            ref={stageRef}
            className={
              isMini
                ? 'relative w-full h-full overflow-hidden'
                : 'relative w-full h-[100dvh] md:h-[calc(100dvh-6.5rem)] min-h-[420px] rounded-none md:rounded-3xl overflow-hidden bg-[#0A0A0C] border-0 md:border border-black/[0.08] dark:border-white/[0.1] shadow-none md:shadow-lg select-none [&:fullscreen]:h-screen [&:fullscreen]:w-screen [&:fullscreen]:rounded-none [&:fullscreen]:border-0'
            }
          >
            {!isMini && viewMode === 'feed' && (
              <DesktopFeedCategories
                categories={filterCategories}
                category={category}
                onChange={onCategoryChange}
                onToggleViewMode={() => setViewMode('grid')}
              />
            )}
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
                    onToggleMute={handleToggleMute}
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
        </div>
      )}

      {/* 卡片模式网格：PC / 移动端各自模块，触底加载由主入口统一持有 */}
      {!isMini && viewMode === 'grid' && visibleVideos.length > 0 && (
        <div className="px-2.5 sm:px-1.5 md:px-2 lg:px-3 xl:px-4 2xl:px-4">
          <DesktopVideoGrid
            videos={visibleVideos}
            likedIds={likedIds}
            savedIds={savedIds}
            onToggleLike={onToggleLike}
            onToggleSave={onToggleSave}
            onOpen={openVideoAt}
          />
          <MobileVideoGrid
            videos={visibleVideos}
            likedIds={likedIds}
            savedIds={savedIds}
            onToggleLike={onToggleLike}
            onToggleSave={onToggleSave}
            onOpen={openVideoAt}
          />
          {hasMoreVideos ? (
            <div ref={loadMoreRef} className="flex justify-center py-6">
              <button
                type="button"
                onClick={() =>
                  setVisibleCount((count) => Math.min(count + VIDEO_PAGE_SIZE, filteredVideos.length))
                }
                className="rounded-full bg-white/10 px-5 py-2 text-[12px] font-medium text-white/80 transition-colors hover:bg-white/20"
              >
                加载更多
              </button>
            </div>
          ) : (
            <p className="py-6 text-center text-[12px] text-white/50">没有更多了</p>
          )}
        </div>
      )}
    </section>

    {/* 卡片点击：复用主页播放器的全屏模态框，播放当前页搜索结果 */}
    {pickedVideo && (
      <ImmersiveModal
        videos={filteredVideos.length > 0 ? filteredVideos : [pickedVideo]}
        initialIndex={Math.max(
          0,
          filteredVideos.findIndex((v) => v.id === pickedVideo.id),
        )}
        likedIds={likedIds}
        savedIds={savedIds}
        progressById={progressById}
        onToggleLike={onToggleLike}
        onToggleSave={onToggleSave}
        onSaveProgress={onSaveProgress}
        onClose={() => setPickedVideo(null)}
      />
    )}
    </>
  );
}
