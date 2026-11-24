import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MediaPlayerInstance } from '@vidstack/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Keyboard, Mousewheel } from 'swiper/modules';
import type { Swiper as SwiperClass } from 'swiper';
import 'swiper/css';
import type { VideoItem } from '../../data/content';
import { EmptyState } from '../../components/PortalStates';
import { FeedSlide } from './FeedSlide';
import { ImmersiveModal } from './ImmersiveModal';
import {
  DesktopFeedCategories,
  DesktopGridCategories,
  DesktopVideoGrid,
} from './DesktopView';
import { MobileGridCategories, MobileVideoGrid } from './MobileView';
import { PlaylistPanel } from './PlaylistPanel';
import { DEFAULT_CATEGORIES, VIDEO_PAGE_SIZE, type ViewMode } from './shared';
import { useSystemInfo } from '../../lib/systemInfo';

/** 迷你播放器尺寸（与下方 sm 断点样式一致），用于拖拽边界计算 */
const MINI_SIZE = { width: 240, height: 135 };
const MINI_MARGIN = 12;

/** 把坐标限制在视口内，避免拖出屏幕 */
function clampMiniPos(x: number, y: number): { x: number; y: number } {
  const maxX = Math.max(MINI_MARGIN, window.innerWidth - MINI_SIZE.width - MINI_MARGIN);
  const maxY = Math.max(MINI_MARGIN, window.innerHeight - MINI_SIZE.height - MINI_MARGIN);
  return {
    x: Math.min(Math.max(MINI_MARGIN, x), maxX),
    y: Math.min(Math.max(MINI_MARGIN, y), maxY),
  };
}

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
  const { title: siteTitle } = useSystemInfo();

  const initialIndex = videos.findIndex((v) => v.id === resumeVideoId);
  const setViewMode = onViewModeChange ?? (() => {});
  const [activeIndex, setActiveIndex] = useState(Math.max(0, initialIndex));
  /** 首次挂载时保留 resumeVideoId 定位，只有后续分类/搜索变化才重置到第一张 */
  const skipInitialResetRef = useRef(true);
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
  /** PC 沉浸模式播放列表侧边栏是否展开 */
  const [playlistOpen, setPlaylistOpen] = useState(false);
  /** PC 迷你播放器位置（可拖拽），null 表示使用默认右下角 */
  const [miniPos, setMiniPos] = useState<{ x: number; y: number } | null>(null);
  const miniDragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  /** 拖拽结束后吞掉随之产生的 click，避免误触播放器 */
  const suppressMiniClickRef = useRef(false);

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
    if (skipInitialResetRef.current) {
      skipInitialResetRef.current = false;
      return;
    }
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

  /** 视频模块激活时以当前视频标题作为页面标题，离开时恢复站点标题 */
  useEffect(() => {
    const active = mode === 'immersive' && !isMini && !isHidden && viewMode === 'feed';
    document.title = active && currentVideo?.title ? currentVideo.title : siteTitle;
    return () => {
      document.title = siteTitle;
    };
  }, [mode, isMini, isHidden, viewMode, currentVideo?.title, siteTitle]);

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

  /** 进入迷你态时初始化默认位置（右下角），离开不改，便于下次沿用它 */
  useEffect(() => {
    if (!isMini) return;
    setMiniPos((prev) => prev ?? clampMiniPos(window.innerWidth, window.innerHeight));
  }, [isMini]);

  /** 迷你窗跟随窗口尺寸变化保持在视口内 */
  useEffect(() => {
    if (!isMini) return;
    const onResize = () => setMiniPos((prev) => (prev ? clampMiniPos(prev.x, prev.y) : prev));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [isMini]);

  const onMiniPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (!isMini || event.button !== 0) return;
    const target = event.target as HTMLElement;
    // 按钮、进度条等交互元素不触发拖拽
    if (target.closest('button, input, [role="slider"], [data-no-drag]')) return;
    const pos = miniPos ?? clampMiniPos(window.innerWidth, window.innerHeight);
    miniDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: false,
    };
  };

  const onMiniPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    const drag = miniDragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 5) return;
    if (!drag.moved) {
      drag.moved = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setMiniPos(clampMiniPos(drag.originX + dx, drag.originY + dy));
  };

  const onMiniPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const drag = miniDragRef.current;
    miniDragRef.current = null;
    if (!drag?.moved) return;
    suppressMiniClickRef.current = true;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onMiniClickCapture = (event: React.MouseEvent<HTMLElement>) => {
    if (!suppressMiniClickRef.current) return;
    suppressMiniClickRef.current = false;
    event.stopPropagation();
    event.preventDefault();
  };

  const onMiniDoubleClick = () => {
    if (miniDragRef.current?.moved) return;
    onMiniExpand?.();
  };

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

  /** 播放列表点击：在沉浸流内切到指定视频 */
  const playVideoAt = useCallback(
    (video: VideoItem) => {
      const idx = filteredVideos.findIndex((v) => v.id === video.id);
      if (idx < 0) return;
      setPickedVideo(null);
      setActiveIndex(idx);
      setCurrentTime(0);
      const swiper = swiperRef.current;
      if (swiper) {
        if (swiper.params.loop) swiper.slideToLoop(idx, 0, false);
        else swiper.slideTo(idx, 0, false);
      }
    },
    [filteredVideos]
  );

  /** 卡片点击：打开全屏模态框直接播放被点视频（用列表数据里自带的 src） */
  const openVideoAt = useCallback(
    (video: VideoItem) => {
      if (!video?.src) return;
      // 打开模态框前暂停主页常驻的播放器，避免两套播放器同时请求同一视频流
      playersRef.current.forEach((player) => {
        if (player && !player.paused) player.pause();
      });
      setPickedVideo(video);
    },
    []
  );

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

  /** 从其他模块切回视频：容器重新可见后恢复当前播放器并刷新 Swiper 尺寸 */
  useEffect(() => {
    if (mode !== 'immersive' || viewMode !== 'feed' || !currentVideo) return;
    const frame = requestAnimationFrame(() => {
      swiperRef.current?.update?.();
      const player = playersRef.current.get(currentVideo.id);
      if (player && player.paused) void player.play().catch(() => {});
    });
    return () => cancelAnimationFrame(frame);
  }, [mode, viewMode, currentVideo?.id]);

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
            ? `fixed z-[60] w-[min(58vw,210px)] h-[118px] sm:w-[240px] sm:h-[135px] rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-2xl border border-white/10 select-none ${
                miniPos ? 'cursor-grab active:cursor-grabbing' : 'bottom-3 right-3 sm:bottom-6 sm:right-6'
              }`
            : 'relative space-y-0 h-full'
      }
      style={isMini && miniPos ? { left: miniPos.x, top: miniPos.y } : undefined}
      title={isMini ? '双击还原播放器 · 拖拽可移动' : undefined}
      onPointerDown={isMini ? onMiniPointerDown : undefined}
      onPointerMove={isMini ? onMiniPointerMove : undefined}
      onPointerUp={isMini ? onMiniPointerUp : undefined}
      onPointerCancel={isMini ? onMiniPointerUp : undefined}
      onClickCapture={isMini ? onMiniClickCapture : undefined}
      onDoubleClick={isMini ? onMiniDoubleClick : undefined}
    >
      {/* 卡片模式分类：PC / 移动端各自模块，内部用 CSS 断点决定挂载形态 */}
      {!isMini && viewMode === 'grid' && (
        <>
          <DesktopGridCategories
            categories={filterCategories}
            category={category}
            onChange={onCategoryChange}
            onBackToFeed={() => setViewMode('feed')}
          />
          <MobileGridCategories
            categories={filterCategories}
            category={category}
            onChange={onCategoryChange}
          />
        </>
      )}

      {/* 沉浸模式悬浮分类：独立于视频数据渲染，空分类时仍可见，用户可切回其他分类 */}
      {!isMini && viewMode === 'feed' && (
        <DesktopFeedCategories
          categories={filterCategories}
          category={category}
          onChange={onCategoryChange}
          onTogglePlaylist={() => setPlaylistOpen((v) => !v)}
          playlistOpen={playlistOpen}
        />
      )}

      {!isMini && viewMode === 'feed' && filteredVideos.length === 0 && (
        <div className="flex h-[calc(100dvh-3.5rem)] items-center justify-center bg-[#0A0A0C]">
          <EmptyState className="w-fit px-10 py-16" title="暂无数据" bare onDark />
        </div>
      )}

      {!isMini && viewMode === 'grid' && filteredVideos.length === 0 && (
        <EmptyState title="暂无数据" bare />
      )}

      {/* 沉浸刷看：始终挂载，网格模式下用 CSS 隐藏，保证 <video> 不被销毁重建 */}
      {currentVideo && (
        <div
          className={
            viewMode === 'grid' && !isMini ? 'hidden' : 'h-full w-full'
          }
        >
          <div
            ref={stageRef}
            className={
              isMini
                ? 'relative w-full h-full overflow-hidden'
                : 'relative w-full h-[calc(100dvh-3.5rem)] rounded-none overflow-hidden bg-[#0A0A0C] border-0 md:border border-black/[0.08] dark:border-white/[0.1] shadow-none md:shadow-lg select-none [&:fullscreen]:h-screen [&:fullscreen]:w-screen [&:fullscreen]:rounded-none [&:fullscreen]:border-0'
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
                    captionToBody={
                      !isMini && !isHidden && viewMode === 'feed' && !isFullscreen
                    }
                  />
                </SwiperSlide>
              ))}
            </Swiper>

            {/* PC 播放列表侧边栏：点击分类条右侧列表图标展开 */}
            {!isMini && viewMode === 'feed' && playlistOpen && (
              <PlaylistPanel
                videos={filteredVideos}
                categories={filterCategories}
                category={category}
                onCategoryChange={onCategoryChange}
                activeIndex={safeIndex}
                onSelect={playVideoAt}
                onClose={() => setPlaylistOpen(false)}
              />
            )}
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

    {/* 移动端沉浸播放：进度条固定在底部导航栏正上方 2px */}
    {!isMini && viewMode === 'feed' && currentVideo && !isFullscreen && (
      <div
        className="pointer-events-none fixed bottom-[calc(3rem+2px)] left-0 right-0 z-40 px-4 md:hidden"
      >
        <div className="pointer-events-auto relative flex h-4 items-end">
          <div className="relative h-[2px] w-full overflow-hidden rounded-full bg-white/25">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/90"
              style={{
                width: `${Math.min(
                  100,
                  ((duration || currentVideo.durationSeconds
                    ? currentTime / (duration || currentVideo.durationSeconds || 1)
                    : 0) * 100)
                )}%`,
              }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={duration || currentVideo.durationSeconds || 0}
            step={0.05}
            value={currentTime}
            onChange={(event) => seekTo(Number(event.target.value))}
            aria-label="播放进度"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
      </div>
    )}

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
