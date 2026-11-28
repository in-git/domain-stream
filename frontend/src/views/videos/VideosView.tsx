import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MediaPlayerInstance } from '@vidstack/react';
import type { Swiper as SwiperClass } from 'swiper';
import { Film } from 'lucide-react';
import type { VideoItem } from '../../types/content';
import { EmptyState } from '../../components/PortalStates';
import { VideoFeedPlayer } from './VideoFeedPlayer';
import { ImmersiveModal } from '../../components/ImmersiveModal';
import { DesktopGridCategories, DesktopGridSkeleton, DesktopVideoGrid } from './DesktopView';
import { MobileGridCategories, MobileVideoGrid } from './MobileView';
import { PlaylistPanel } from './PlaylistPanel';
import { DEFAULT_CATEGORIES, formatTime, type ViewMode } from './shared';
import { useSystemInfo } from '../../lib/systemInfo';
import type { VideoLoopMode, VideoMenuConfig } from './videoMenuTypes';

/** 迷你播放器尺寸（与下方 sm 断点样式一致），用于拖拽边界计算 */
const MINI_SIZE = { width: 240, height: 135 };
const MINI_MARGIN = 12;
/** 沉浸流提前预加载的剩余条数，接近抖音式无缝续刷 */
const FEED_PREFETCH_DISTANCE = 2;

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
  hasMoreVideos?: boolean;
  loadingMoreVideos?: boolean;
  /** 首屏加载中：卡片模式显示骨架，而不是「暂无数据」 */
  loadingVideos?: boolean;
  /** 加载更多失败：暂停自动触底，改为显示手动重试入口 */
  loadMoreError?: string;
  onLoadMoreVideos?: () => void;
  savedIds: string[];
  likedIds: string[];
  searchQuery?: string;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  onPlayVideo?: (video: VideoItem, opts?: { muted?: boolean; playbackRate?: number }) => void;
  /** 当前视频在视频页内被暂停：取消离页续播资格 */
  onStopVideo?: () => void;
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
  /** PC 沉浸模式顶栏悬浮：视频区占满视口 */
  headerFloating?: boolean;
  /** 播放列表侧栏开关由顶栏分类条控制，状态在 PortalShell 提升 */
  playlistOpen?: boolean;
  onClosePlaylist?: () => void;
  /** 移动端沉浸流是否显示顶部/底部导航（清屏模式为 false） */
  mobileChromeVisible?: boolean;
  /** 点击画面唤出导航 / 播放后回到清屏 */
  onChromeVisibilityChange?: (visible: boolean) => void;
  /** PC 沉浸流真实播放状态：用于播放时收起顶栏、暂停时恢复 */
  onPlayingChange?: (playing: boolean) => void;
}

export function VideosView({
  videos,
  categories,
  category,
  onCategoryChange,
  hasMoreVideos = false,
  loadingMoreVideos = false,
  loadMoreError,
  onLoadMoreVideos,
  loadingVideos = false,
  savedIds,
  likedIds,
  searchQuery = '',
  onToggleSave,
  onToggleLike,
  onPlayVideo,
  onStopVideo,
  resumeVideoId,
  resumeMuted,
  resumePlaybackRate,
  mode = 'immersive',
  onMiniClose,
  onMiniExpand,
  viewMode = 'feed',
  onViewModeChange,
  headerFloating = false,
  playlistOpen = false,
  onClosePlaylist,
  mobileChromeVisible = false,
  onChromeVisibilityChange,
  onPlayingChange,
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
  const [isMuted, setIsMuted] = useState(typeof resumeMuted === 'boolean' ? resumeMuted : true);
  /** 用户是否主动点过静音；为 true 时滑动不再自动解除静音（尊重用户选择） */
  const userMutedManuallyRef = useRef(false);
  const [playbackRate, setPlaybackRate] = useState(
    typeof resumePlaybackRate === 'number' ? resumePlaybackRate : 1,
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  /** 移动端进度条按住时加高，松手还原 */
  const [seeking, setSeeking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  /** 从卡片点选后要直接播放的视频（含 src），为 null 时走沉浸流当前索引 */
  const [pickedVideo, setPickedVideo] = useState<VideoItem | null>(null);
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
  /** 真实起播状态：只有正在播放的视频才具备离页续播资格 */
  const isPlayingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  /** 菜单控制的循环模式：单条循环 / 自动连播（单选） */
  const [loopMode, setLoopMode] = useState<VideoLoopMode>('auto');
  /** 播完最后一条时等待下一页加载，加载完成后自动切到下一条 */
  const pendingAutoAdvanceRef = useRef(false);
  /** 用 ref 读取当前形态，避免 onPause 闭包拿到切换前的旧 mode */
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const handleChange = () => setIsFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  // 手指/鼠标松开（可能在进度条外）时还原进度条高度
  useEffect(() => {
    if (!seeking) return;
    const release = () => setSeeking(false);
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);
    return () => {
      window.removeEventListener('pointerup', release);
      window.removeEventListener('pointercancel', release);
    };
  }, [seeking]);

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
    pendingAutoAdvanceRef.current = false;
  }, [category, normalizedQuery]);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  // 数据层已按服务端分页追加，视图直接使用当前已加载的全部结果
  const visibleVideos = filteredVideos;

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMoreVideos || loadingMoreVideos || loadMoreError || viewMode !== 'grid' || !onLoadMoreVideos) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMoreVideos();
      },
      { rootMargin: '200px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMoreVideos, loadingMoreVideos, loadMoreError, onLoadMoreVideos, viewMode]);

  const safeIndex =
    filteredVideos.length > 0 ? Math.min(activeIndex, filteredVideos.length - 1) : 0;
  const currentVideo = filteredVideos[safeIndex] ?? null;

  // PC 沉浸刷看：滑到倒数几条时自动加载下一页
  useEffect(() => {
    if (viewMode !== 'feed' || !hasMoreVideos || loadingMoreVideos || loadMoreError || !onLoadMoreVideos) return;
    if (
      filteredVideos.length > 0 &&
      safeIndex >= filteredVideos.length - FEED_PREFETCH_DISTANCE
    ) {
      onLoadMoreVideos();
    }
  }, [viewMode, hasMoreVideos, loadingMoreVideos, loadMoreError, onLoadMoreVideos, safeIndex, filteredVideos.length]);

  /** 视频模块激活时以当前视频标题作为页面标题，离开时恢复站点标题 */
  useEffect(() => {
    const active = mode === 'immersive' && !isMini && !isHidden && viewMode === 'feed';
    document.title = active && currentVideo?.title ? currentVideo.title : siteTitle;
    return () => {
      document.title = siteTitle;
    };
  }, [mode, isMini, isHidden, viewMode, currentVideo?.title, siteTitle]);

  /** 后端记录的视频时长：首页进度条的总时长以它为准 */
  const backendDuration = currentVideo?.durationSeconds ?? 0;

  useEffect(() => {
    setCurrentTime(0);
    setDuration(backendDuration);
    isPlayingRef.current = false;
    setIsPlaying(false);
  }, [currentVideo?.id]);

  // 静音/倍速变化只同步续播配置，不凭空把暂停中的视频标记为“播放中”
  useEffect(() => {
    if (!isPlayingRef.current || viewMode !== 'feed' || !currentVideo) return;
    onPlayVideo?.(currentVideo, { muted: isMuted, playbackRate });
  }, [isMuted, playbackRate, viewMode, currentVideo, onPlayVideo]);

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
    currentVideo ? playersRef.current.get(`${currentVideo.id}-${safeIndex}`) ?? null : null;

  /** 安全暂停：已销毁的 MediaPlayer 实例访问内部属性会抛 null 引用异常，统一吞掉 */
  const safePause = (player: MediaPlayerInstance | null | undefined) => {
    if (!player) return;
    try {
      void player.pause?.();
    } catch {
      // 播放器已卸载，忽略
    }
  };

  /** 真实播放状态：播放中才记录离页续播候选，视频页内暂停则取消候选 */
  const handlePlaybackStateChange = useCallback(
    (playing: boolean) => {
      isPlayingRef.current = playing;
      setIsPlaying(playing);
      if (!isMini && !isHidden && viewMode === 'feed') onPlayingChange?.(playing);
      if (!currentVideo) return;
      if (playing) {
        onPlayVideo?.(currentVideo, { muted: isMuted, playbackRate });
      } else if (modeRef.current !== 'mini') {
        // 迷你窗内暂停仍保留窗口；视频页/隐藏态暂停说明离开时不应续播
        onStopVideo?.();
      }
    },
    [currentVideo, isHidden, isMuted, isMini, onPlayVideo, onPlayingChange, onStopVideo, playbackRate, viewMode]
  );

  /** 当前视频播完：自动连播切下一条；单条循环停在当前视频 */
  const handleVideoEnded = useCallback(() => {
    if (loopMode === 'single') {
      // 单条循环由播放器自身 loop 处理，这里兜底：停在末尾不切下一条
      safePause(getActivePlayer());
      setIsPlaying(false);
      return;
    }
    const swiper = swiperRef.current;
    if (!swiper || filteredVideos.length === 0) return;

    if (safeIndex < filteredVideos.length - 1) {
      pendingAutoAdvanceRef.current = false;
      swiper.slideNext();
      return;
    }

    // 已到最后一条但还有下一页：等加载完成再切；正在加载中则直接等结果
    if (hasMoreVideos && onLoadMoreVideos && !loadMoreError) {
      pendingAutoAdvanceRef.current = true;
      if (!loadingMoreVideos) onLoadMoreVideos();
      return;
    }

    pendingAutoAdvanceRef.current = false;
    // 只有一条视频时 slideTo(0) 不会重新激活播放器，直接手动重播
    if (filteredVideos.length === 1 && currentVideo) {
      const player = playersRef.current.get(`${currentVideo.id}-${safeIndex}`);
      if (player) {
        try {
          player.currentTime = 0;
          void player.play().catch(() => {});
        } catch {
          // 播放器已销毁，忽略
        }
      }
      return;
    }
    swiper.slideTo(0);
  }, [
    loopMode,
    currentVideo,
    filteredVideos.length,
    safeIndex,
    hasMoreVideos,
    onLoadMoreVideos,
    loadingMoreVideos,
    loadMoreError,
  ]);

  // 等待下一页加载完成后，自动切到新追加的第一条
  useEffect(() => {
    if (!pendingAutoAdvanceRef.current || loadingMoreVideos) return;
    if (filteredVideos.length <= safeIndex + 1) return;
    pendingAutoAdvanceRef.current = false;
    const nextIndex = safeIndex + 1;
    const swiper = swiperRef.current;
    if (!swiper) return;
    const frame = requestAnimationFrame(() => swiper.slideTo(nextIndex));
    return () => cancelAnimationFrame(frame);
  }, [filteredVideos.length, loadingMoreVideos, safeIndex]);

  // 下一页加载失败或确认没有更多时，回到第一条继续播，避免停在结束画面
  useEffect(() => {
    if (!pendingAutoAdvanceRef.current || loadingMoreVideos) return;
    if (!loadMoreError && hasMoreVideos) return;
    pendingAutoAdvanceRef.current = false;
    swiperRef.current?.slideTo(0);
  }, [hasMoreVideos, loadMoreError, loadingMoreVideos]);

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
    try {
      if (isMuted) {
        setIsMuted(false);
        userMutedManuallyRef.current = false;
        player.muted = false;
        if (player.paused) void player.play().catch(() => {});
        return;
      }
      if (player.paused) {
        void player.play().catch(() => {});
      } else {
        player.pause();
      }
    } catch {
      // 播放器实例已销毁，忽略本次播放控制
    }
  };

  const seekTo = (time: number) => {
    const player = getActivePlayer();
    const clamped = Math.max(0, Math.min(time, duration || currentVideo?.durationSeconds || 0));
    setCurrentTime(clamped);
    if (player) player.currentTime = clamped;
  };

  const handleSlideChange = (index: number) => {
    setActiveIndex(index);
    setCurrentTime(0);
    isPlayingRef.current = false;
    setIsPlaying(false);
    pendingAutoAdvanceRef.current = false;
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
      isPlayingRef.current = false;
      pendingAutoAdvanceRef.current = false;
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
      if (!video) return;
      // 打开模态框前暂停主页常驻的播放器，避免两套播放器同时请求同一视频流。
      // 注意：切到卡片模式后，feed 的 MediaPlayer 已卸载，Map 中可能残留已销毁的实例，
      // 读取其 paused 会抛 "Cannot read properties of null"。直接调用 pause 并捕获异常，
      // 且无论暂停是否成功都必须打开模态框，避免异常中断该函数。
      playersRef.current.forEach(safePause);
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

  const goPrevVideo = useCallback(() => {
    if (!swiperRef.current || safeIndex <= 0) return;
    swiperRef.current.slidePrev();
  }, [safeIndex]);

  const goNextVideo = useCallback(() => {
    const swiper = swiperRef.current;
    if (!swiper) return;
    if (safeIndex < filteredVideos.length - 1) {
      swiper.slideNext();
      return;
    }
    if (hasMoreVideos && onLoadMoreVideos && !loadMoreError) {
      pendingAutoAdvanceRef.current = true;
      if (!loadingMoreVideos) onLoadMoreVideos();
      return;
    }
    swiper.slideTo(0);
  }, [safeIndex, filteredVideos.length, hasMoreVideos, onLoadMoreVideos, loadingMoreVideos, loadMoreError]);

  const replayVideo = () => {
    const player = getActivePlayer();
    if (!player) return;
    try {
      player.currentTime = 0;
      setCurrentTime(0);
      void player.play().catch(() => {});
    } catch {
      // 播放器已销毁，忽略
    }
  };

  useEffect(() => {
    if (viewMode !== 'grid') return;
    safePause(getActivePlayer());
  }, [viewMode, currentVideo?.id]);

  useEffect(() => {
    if (mode !== 'hidden') return;
    safePause(getActivePlayer());
  }, [mode, currentVideo?.id]);

  /** 从其他模块切回视频：容器重新可见后恢复当前播放器并刷新 Swiper 尺寸 */
  useEffect(() => {
    if (mode !== 'immersive' || viewMode !== 'feed' || !currentVideo) return;
    const frame = requestAnimationFrame(() => {
      swiperRef.current?.update?.();
      const player = playersRef.current.get(`${currentVideo.id}-${safeIndex}`);
      if (!player) return;
      try {
        if (player.paused) void player.play().catch(() => {});
      } catch {
        // 播放器已销毁，忽略
      }
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

  /** 首页沉浸流才启用控制菜单；迷你窗与模态框保持精简界面 */
  const videoMenu: VideoMenuConfig | undefined =
    mode === 'immersive' && viewMode === 'feed' && !isMini && !isHidden
      ? {
          state: {
            loopMode,
            isPlaying,
            isMuted,
            playbackRate,
            isFullscreen,
            canPrev: safeIndex > 0,
            canNext: safeIndex < filteredVideos.length - 1 || hasMoreVideos,
          },
          actions: {
            setLoopMode,
            togglePlay: togglePlayback,
            toggleMute: handleToggleMute,
            setRate: setPlaybackRate,
            prev: goPrevVideo,
            next: goNextVideo,
            replay: replayVideo,
            toggleFullscreen,
          },
        }
      : undefined;

  return (
    <>
    <section
      aria-label="视频频道"
      className={
        isHidden
          ? 'hidden'
          : isMini
            ? `fixed z-[60] w-[min(58vw,210px)] h-[118px] sm:w-[240px] sm:h-[135px] rounded-app sm:rounded-app overflow-hidden bg-black shadow-2xl border border-white/10 select-none ${
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

      {/* PC 沉浸模式的分类条已移至顶栏（见 MainHeader），与搜索框同排；此处不再渲染 */}

      {!isMini && viewMode === 'feed' && !loadingVideos && filteredVideos.length === 0 && (
        <div className={`flex items-center justify-center bg-black ${headerFloating ? 'h-[100dvh]' : 'h-[calc(100dvh-3.5rem)]'}`}>
          <EmptyState
            icon={Film}
            title="暂无视频"
            description={
              normalizedQuery ? '没有找到匹配的视频，换个关键词试试' : '内容发布后将在这里显示'
            }
            className=" px-10 py-16"
            onDark
          />
        </div>
      )}

      {!isMini && viewMode === 'grid' && !loadingVideos && filteredVideos.length === 0 && (
        <EmptyState
          icon={Film}
          title="暂无视频"
          description={
            normalizedQuery ? '没有找到匹配的视频，换个关键词试试' : '内容发布后将在这里显示'
          }
          className="w-full"
        />
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
                : headerFloating
                  ? 'relative w-full h-[100dvh] rounded-none overflow-hidden bg-black border-0 shadow-none select-none [&:fullscreen]:h-screen [&:fullscreen]:w-screen [&:fullscreen]:rounded-none [&:fullscreen]:border-0'
                  : 'relative w-full h-[calc(100dvh-3.5rem)] rounded-none overflow-hidden bg-black border-0 select-none [&:fullscreen]:h-screen [&:fullscreen]:w-screen [&:fullscreen]:rounded-none [&:fullscreen]:border-0'
            }
          >
            <VideoFeedPlayer
              videos={filteredVideos}
              swiperKey={`${category}-${normalizedQuery}`}
              onSwiper={(instance) => {
                swiperRef.current = instance;
              }}
              state={{ activeIndex: safeIndex, isMuted, playbackRate, currentTime, duration }}
              handlers={{
                onSlideChange: handleSlideChange,
                onTogglePlay: togglePlayback,
                onToggleMute: handleToggleMute,
                onSetRate: setPlaybackRate,
                onSeek: seekTo,
                onTimeUpdate: setCurrentTime,
                // 总时长以后端记录为准；后端没记录时才退回播放器解析到的时长
                onDurationChange: (value) => {
                  if (!backendDuration) setDuration(value);
                },
                onRegisterPlayer: registerPlayer,
                onPlaybackStateChange: handlePlaybackStateChange,
                onVideoEnded: handleVideoEnded,
              }}
              likedIds={likedIds}
              savedIds={savedIds}
              onToggleLike={onToggleLike}
              onToggleSave={onToggleSave}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
              onStageTap={() => onChromeVisibilityChange?.(true)}
              onPlaybackStart={() => onChromeVisibilityChange?.(false)}
              chromeVisible={mobileChromeVisible}
              mini={isMini}
              onMiniClose={onMiniClose}
              onMiniExpand={onMiniExpand}
              captionToBody={!isMini && !isHidden && viewMode === 'feed' && !isFullscreen}
              videoMenu={videoMenu}
              moduleHidden={isHidden}
            />

            {/* PC 播放列表侧边栏：点击分类条右侧列表图标展开 */}
            {!isMini && viewMode === 'feed' && playlistOpen && (
              <PlaylistPanel
                videos={filteredVideos}
                categories={filterCategories}
                category={category}
                onCategoryChange={onCategoryChange}
                activeIndex={safeIndex}
                onSelect={playVideoAt}
                onClose={onClosePlaylist ?? (() => {})}
                hasMore={hasMoreVideos}
                loadingMore={loadingMoreVideos}
                loadMoreError={loadMoreError}
                onLoadMore={onLoadMoreVideos}
              />
            )}
          </div>
        </div>
      )}

      {/* 卡片模式网格：PC / 移动端各自模块，触底加载由主入口统一持有 */}
      {!isMini && viewMode === 'grid' && (visibleVideos.length > 0 || loadingVideos) && (
        <div className="px-2 sm:px-1.5 md:px-2 lg:px-3 xl:px-4 2xl:px-4">
          {visibleVideos.length > 0 ? (
            <>
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
                <div ref={loadMoreRef} className="flex flex-col items-center gap-2 py-6">
                  {loadMoreError && (
                    <p className="text-[12px] text-red-400">加载失败：{loadMoreError}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => onLoadMoreVideos?.()}
                    disabled={loadingMoreVideos}
                    className="rounded-full bg-white/10 px-5 py-2 text-[12px] font-medium text-white/80 transition-colors hover:bg-white/20 disabled:opacity-50"
                  >
                    {loadingMoreVideos ? '加载中…' : loadMoreError ? '重试加载' : '加载更多'}
                  </button>
                </div>
              ) : (
                <p className="py-6 text-center text-[12px] text-white/50">没有更多了</p>
              )}
            </>
          ) : (
            <>
              {/* 首屏加载中：PC 网格与移动端瀑布流各自铺骨架 */}
              <DesktopGridSkeleton />
              <MobileVideoGrid
                videos={[]}
                loading
                likedIds={likedIds}
                savedIds={savedIds}
                onToggleLike={onToggleLike}
                onToggleSave={onToggleSave}
                onOpen={openVideoAt}
              />
            </>
          )}
        </div>
      )}

      {/* 沉浸流加载失败：暂停自动预取，提供手动重试 */}
      {!isMini && !isHidden && viewMode === 'feed' && loadMoreError && (
        <div className="pointer-events-auto absolute bottom-20 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/80 px-4 py-2 text-[12px] text-white shadow-lg md:bottom-6">
          <span className="max-w-[60vw] truncate text-red-300">加载失败：{loadMoreError}</span>
          <button
            type="button"
            onClick={() => onLoadMoreVideos?.()}
            disabled={loadingMoreVideos}
            className="rounded-full bg-white/15 px-3 py-1 font-medium text-white transition-colors hover:bg-white/25 disabled:opacity-50"
          >
            {loadingMoreVideos ? '加载中…' : '重试'}
          </button>
        </div>
      )}
    </section>

    {/* 移动端沉浸播放：进度条固定在底部导航栏正上方 2px；切到其他模块时整体隐藏 */}
    {!isMini && !isHidden && viewMode === 'feed' && currentVideo && !isFullscreen && (
      <div
        className={`pointer-events-none fixed left-0 right-0 z-40 px-4 md:hidden ${
          mobileChromeVisible ? 'bottom-[calc(3rem+2px)]' : 'bottom-2'
        }`}
      >
        {/* 播放时间 / 总时长：左下角，仅播放中显示；暂停与拖动时淡出，避免和进度气泡重叠 */}
        <div
          className={`mb-1 flex items-center justify-start gap-1 text-[11px] font-mono-tabular text-white/80 transition-opacity duration-150 ${
            isPlaying && !seeking ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span className="tabular-nums">{formatTime(currentTime)}</span>
          <span className="text-white/40">/</span>
          <span className="tabular-nums text-white/60">
            {formatTime(duration || currentVideo.durationSeconds || 0)}
          </span>
        </div>
        {/* 点击区比原 h-4 高 10px（h-[26px]），实际进度条按住时加高到 6px，松手还原 */}
        <div className="pointer-events-auto relative flex h-[26px] items-end">
          {seeking && (
            <div
              className="pointer-events-none absolute bottom-full mb-2 -translate-x-1/2 rounded-app bg-black/80 px-2 py-1 text-[11px] font-medium tabular-nums text-white backdrop-blur-md"
              style={{
                left: `${Math.min(
                  94,
                  Math.max(
                    6,
                    (duration || currentVideo.durationSeconds
                      ? (currentTime / (duration || currentVideo.durationSeconds || 1)) * 100
                      : 0)
                  )
                )}%`,
              }}
            >
              {formatTime(currentTime)} / {formatTime(duration || currentVideo.durationSeconds || 0)}
            </div>
          )}
          <div
            className={`relative w-full overflow-hidden rounded-full bg-white/25 transition-[height] duration-150 ${
              seeking ? 'h-1.5' : 'h-[2px]'
            }`}
          >
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
            onPointerDown={() => setSeeking(true)}
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
        onToggleLike={onToggleLike}
        onToggleSave={onToggleSave}
        onClose={() => setPickedVideo(null)}
      />
    )}
    </>
  );
}
