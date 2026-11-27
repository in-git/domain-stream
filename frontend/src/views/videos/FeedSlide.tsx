import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { MediaPlayer, MediaProvider, type MediaPlayerInstance } from '@vidstack/react';
import {
  Star,
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
import type { VideoItem } from '../../types/content';
import { SWIFTUI_BOUNCY } from '../../lib/motion';
import { Tooltip } from '../../components/Tooltip';
import { ResilientImage } from '../../components/ResilientImage';
import { CommentPanel } from '../../components/CommentPanel.tsx';
import { useCommentEnabled } from '../../lib/systemInfo.ts';
import { countVideoViewOnce, formatTime } from './shared';
import { VideoContextMenu } from './VideoContextMenu';
import { VideoLongPressMenu } from './VideoLongPressMenu';
import type { VideoMenuConfig } from './videoMenuTypes';

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
  onRegisterPlayer: (id: string, player: MediaPlayerInstance | null) => void;
  /** 播放器实例注册键；同一视频重复出现时用位置区分，避免实例互相覆盖 */
  playerKey?: string;
  /** 点击视频画面：暂停并唤出顶部/底部导航 */
  onStageTap?: () => void;
  /** 视频开始/恢复播放：回到清屏模式 */
  onPlaybackStart?: () => void;
  /** 上报真实播放/暂停状态，供外壳判断是否具备离页续播条件 */
  onPlaybackStateChange?: (playing: boolean) => void;
  /** 当前视频播完：由外层切换到下一条；未提供时保留单条循环 */
  onVideoEnded?: () => void;
  /** 移动端顶部/底部导航是否可见；清屏时隐藏标题浮层 */
  chromeVisible?: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onSetRate: (rate: number) => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onToggleFullscreen: () => void;
  onSeek: (time: number) => void;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  /** 迷你窗口形态：精简界面，仅保留播放控制 */
  mini?: boolean;
  onMiniClose?: () => void;
  onMiniExpand?: () => void;
  /** 是否显示全屏按钮（模态框本身已占满全屏时可隐藏） */
  showFullscreen?: boolean;
  /**
   * 是否把标题浮层渲染到 body 顶层。
   * 主页沉浸流所在的 Swiper slide 带 transform，会劫持内部 fixed 的包含块，
   * 导致标题无法与视口固定的进度条对齐；移到 body 可脱离该包含块。
   * 由外层根据模式/视图控制，避免切模块或打开模态框后残留。
   */
  captionToBody?: boolean;
  /** 首页沉浸流传入后启用 PC 右键 / 移动端长按控制菜单 */
  videoMenu?: VideoMenuConfig;
  /** 所属模块被切走时为 true：不渲染评论抽屉等 portal 浮层 */
  moduleHidden?: boolean;
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
  onRegisterPlayer,
  playerKey,
  onStageTap,
  onPlaybackStart,
  onPlaybackStateChange,
  onVideoEnded,
  chromeVisible = true,
  onTogglePlay,
  onToggleMute,
  onSetRate,
  onToggleLike,
  onToggleSave,
  onToggleFullscreen,
  onSeek,
  onTimeUpdate,
  onDurationChange,
  mini,
  onMiniClose,
  onMiniExpand,
  showFullscreen = true,
  captionToBody = false,
  videoMenu,
  moduleHidden = false,
}: FeedSlideProps) {
  const commentsEnabled = useCommentEnabled();
  const playerRef = useRef<MediaPlayerInstance | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentOpen, setCommentOpen] = useState(false);
  /** PC 右键菜单锚点；移动端使用独立的底部长按菜单 */
  const [contextMenuAt, setContextMenuAt] = useState<{ x: number; y: number } | null>(null);
  const [longPressOpen, setLongPressOpen] = useState(false);
  const longPressTimerRef = useRef<number | undefined>(undefined);
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null);
  const longPressFiredRef = useRef(false);

  const resolvedPlayerKey = playerKey ?? video.id;
  const setPlayerRef = useCallback(
    (player: MediaPlayerInstance | null) => {
      playerRef.current = player;
      onRegisterPlayer(resolvedPlayerKey, player);
    },
    [onRegisterPlayer, resolvedPlayerKey],
  );

  // 组件卸载时显式注销，避免 playersRef 中残留已销毁实例（其 paused getter 会抛 null 异常）
  useEffect(() => () => onRegisterPlayer(resolvedPlayerKey, null), [onRegisterPlayer, resolvedPlayerKey]);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== undefined) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = undefined;
    }
    longPressStartRef.current = null;
  }, []);

  const closeContextMenu = useCallback(() => setContextMenuAt(null), []);
  const closeLongPressMenu = useCallback(() => {
    setLongPressOpen(false);
    longPressFiredRef.current = false;
  }, []);

  // 手指在屏幕外松开时也要取消长按计时
  useEffect(() => {
    window.addEventListener('pointerup', clearLongPressTimer);
    window.addEventListener('pointercancel', clearLongPressTimer);
    return () => {
      window.removeEventListener('pointerup', clearLongPressTimer);
      window.removeEventListener('pointercancel', clearLongPressTimer);
    };
  }, [clearLongPressTimer]);

  // 切到别的视频或退出沉浸流时关闭菜单，避免浮层残留
  useEffect(() => {
    setContextMenuAt(null);
    setLongPressOpen(false);
    longPressFiredRef.current = false;
    clearLongPressTimer();
  }, [active, video.id, mini, clearLongPressTimer]);

  useEffect(() => () => clearLongPressTimer(), [clearLongPressTimer]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    try {
      if (!active) {
        player.pause();
        return;
      }
      player.playbackRate = playbackRate;
      player.muted = isMuted;
    } catch {
      // 播放器已卸载，忽略
    }
  }, [active, video.id, isMuted, playbackRate]);

  useEffect(() => {
    if (!mini || !active) return;
    const player = playerRef.current;
    if (!player) return;
    try {
      if (isMuted && player.state.canPlay && player.paused) void player.play().catch(() => {});
    } catch {
      // 播放器已卸载，忽略
    }
  }, [mini, active, isMuted]);

  useEffect(() => {
    if (active) setLoading(true);
  }, [video.id, active]);

  const progressMax = Math.max(duration, video.durationSeconds, 1);
  const progressValue = Math.min(currentTime, progressMax);

  const source = useMemo<{ src: string; type: 'video/mp4' }>(
    () => ({ src: video.src, type: 'video/mp4' }),
    [video.src],
  );

  /** 触屏设备走长按菜单；仅按指针类型判断，避免 PC 窄窗口被误判为移动端 */
  const isTouchLike = () =>
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  const handleContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!videoMenu || mini || isTouchLike()) return;
    setLongPressOpen(false);
    setContextMenuAt({ x: event.clientX, y: event.clientY });
  };

  const handleMenuPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    clearLongPressTimer();
    longPressFiredRef.current = false;
    if (!videoMenu || mini || event.pointerType === 'mouse') return;
    longPressStartRef.current = { x: event.clientX, y: event.clientY };
    longPressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      setContextMenuAt(null);
      setLongPressOpen(true);
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(12);
      }
    }, 500);
  };

  const handleMenuPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = longPressStartRef.current;
    if (!start) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) {
      clearLongPressTimer();
    }
  };

  const handleMenuClickCapture = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (!longPressFiredRef.current) return;
    longPressFiredRef.current = false;
    event.preventDefault();
    event.stopPropagation();
  };

  const captionInner = (
    <>
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
    </>
  );

  const actionRailInner = (
    <>
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
              ? 'bg-app-favorite/25 border-app-favorite/60 text-app-favorite'
              : 'bg-black/45 border-white/15 text-white hover:bg-black/65'
          }`}
        >
          <Star className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
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
              <span className="absolute -top-1 -right-1 rounded-full bg-app-primary px-1.5 text-[10px] font-medium tabular-nums">
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
            className="hidden w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/15 items-center justify-center text-white hover:bg-black/65 transition-colors md:flex"
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
    </>
  );

  return (
    <>
    <div
      data-video-stage
      className="relative w-full h-full bg-black overflow-hidden"
      onContextMenu={handleContextMenu}
      onPointerDown={handleMenuPointerDown}
      onPointerMove={handleMenuPointerMove}
      onPointerUp={clearLongPressTimer}
      onPointerCancel={clearLongPressTimer}
      onClickCapture={handleMenuClickCapture}
    >
      {active ? (
        <MediaPlayer
          ref={setPlayerRef}
          poster={video.cover}
          title={video.title}
          playsInline
          loop={videoMenu?.state.loopMode === 'single' || !onVideoEnded}
          src={source}
          posterLoad="eager"
          muted={isMuted}
          playbackRate={playbackRate}
          className="absolute inset-0 w-full h-full"
          // 迷你窗双击用于还原播放器，禁用播放器自身的点击切换以免冲突；播放用左下角按钮
          onClick={
            mini
              ? undefined
              : () => {
                  if (playing) {
                    onTogglePlay();
                    onStageTap?.();
                  } else {
                    onTogglePlay();
                  }
                }
          }
          onPlay={() => {
            setPlaying(true);
            setLoading(false);
            countVideoViewOnce(video.id);
            onPlaybackStart?.();
            onPlaybackStateChange?.(true);
          }}
          onPause={() => {
            setPlaying(false);
            onPlaybackStateChange?.(false);
          }}
          onEnded={() => {
            setPlaying(false);
            // 自动切下一条时顶栏保持收起，避免切集瞬间闪一下
            const autoAdvance = !!onVideoEnded && videoMenu?.state.loopMode !== 'single';
            if (!autoAdvance) onPlaybackStateChange?.(false);
            onVideoEnded?.();
          }}
          onCanPlay={() => {
            setLoading(false);
            // 只在媒体真正可播放后起播；提前调用 play 会触发 vidstack 的
            // "media is not ready - wait for can-play" 错误。
            const player = playerRef.current;
            if (!player) return;
            try {
              if (!player.state.canPlay || !player.paused) return;
              // 先静音起播规避浏览器自动播放策略，播放成功后再恢复用户期望的静音状态
              player.muted = true;
              void player.play()
                .then(() => {
                  const current = playerRef.current;
                  if (current) current.muted = isMuted;
                })
                .catch(() => {});
            } catch {
              // 播放器已卸载，忽略
            }
          }}
          onWaiting={() => setLoading(true)}
          onPlaying={() => setLoading(false)}
          onError={() => setLoading(false)}
          onTimeUpdate={(detail) => onTimeUpdate(detail.currentTime)}
          onDurationChange={onDurationChange}
        >
          <MediaProvider className="w-full h-full" />
        </MediaPlayer>
      ) : (
        /* 未播放卡片只显示封面，不挂载 <video>，避免页面预加载几十个视频流 */
        <ResilientImage
          src={video.cover}
          alt={video.title}
          fallbackTitle={video.title}
          priority
          placeholderClassName="bg-black"
          fallbackClassName="bg-black"
          className="absolute inset-0 w-full h-full"
        />
      )}

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
                data-no-drag
                onDoubleClick={(event) => event.stopPropagation()}
                onClick={onMiniExpand}
                aria-label="回到视频"
                title="回到视频"
                className="absolute top-1.5 left-1.5 z-30 w-6 h-6 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/90 hover:bg-black/70 transition-colors"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
              <button
                type="button"
                data-no-drag
                onDoubleClick={(event) => event.stopPropagation()}
                onClick={onMiniClose}
                aria-label="关闭迷你播放器"
                title="关闭"
                className="absolute top-1.5 right-1.5 z-30 w-6 h-6 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/90 hover:bg-black/70 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          )}

          {/* 右侧操作栏：移动端由下方 portal 渲染（脱离 Swiper transform）；桌面端留在 slide 内 */}
          {!mini && captionToBody && (
            <div className="absolute right-5 bottom-[110px] hidden md:flex flex-col items-center gap-4 z-20 text-white">
              {actionRailInner}
            </div>
          )}
          {!mini && !captionToBody && (
            <div className="absolute right-3 sm:right-5 bottom-[110px] flex flex-col items-center gap-4 z-20 text-white">
              {actionRailInner}
            </div>
          )}

          {/*
            标题浮层：
            - captionToBody（主页沉浸流）：标题通过 portal 渲染到 body，脱离 Swiper 的
              transform 包含块，才能与视口固定的进度条对齐。位置 fixed 到底部导航上方。
            - 否则（迷你窗 / 全屏模态框）：留在 slide 内 absolute 定位。
          */}
          {captionToBody && !mini && active && chromeVisible &&
            createPortal(
              <div className="fixed bottom-[calc(3rem+14px)] left-0 right-0 z-30 text-white pointer-events-none px-4 md:hidden">
                <div className="space-y-1.5 max-w-2xl pr-16">{captionInner}</div>
              </div>,
              document.body,
            )}

          {/*
            右侧操作栏同样 portal 到 body，与标题/进度条共用视口参考系。
            bottom-[110px] 保持与原 slide 内 absolute 定位一致的视觉位置。
          */}
          {captionToBody && !mini && active &&
            createPortal(
              <div className={`fixed right-3 z-30 text-white pointer-events-none md:hidden ${
                chromeVisible ? 'bottom-[110px]' : 'bottom-6'
              }`}>
                <div className="flex flex-col items-center gap-4 pointer-events-auto">
                  {actionRailInner}
                </div>
              </div>,
              document.body,
            )}

          <div
            className={`left-0 right-0 text-white z-10 pointer-events-none ${
              mini
                ? 'absolute bottom-0 p-2'
                : 'absolute bottom-0 space-y-3 pt-4 pb-[calc(3rem+14px)] sm:pl-6 sm:pr-24 sm:pt-6 md:pb-6'
            }`}
          >
            {!mini && captionToBody && (
              <div className="hidden md:block space-y-1.5 max-w-2xl pl-4 pr-20 sm:pl-0 sm:pr-0">
                {captionInner}
              </div>
            )}
            {!mini && !captionToBody && (
              <div className="space-y-1.5 max-w-2xl pl-4 pr-20 sm:pl-0 sm:pr-0">
                {captionInner}
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
              <div className="flex-1 min-w-0">
                {/* 播放模式：进度条上方显示 已播放时间 / 总时长 */}
                {!mini && (
                  <div className="mb-1.5 flex items-center gap-1 text-[11px] font-mono-tabular text-white/85">
                    <span className="tabular-nums">{formatTime(progressValue)}</span>
                    <span className="text-white/40">/</span>
                    <span className="tabular-nums text-white/60">{formatTime(progressMax)}</span>
                  </div>
                )}
                <div className="relative flex items-center h-4">
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
        portalToBody
        open={commentOpen && !mini && !moduleHidden}
        targetType="VIDEO"
        targetId={video.id}
        onClose={() => setCommentOpen(false)}
      />
    </div>

    <VideoContextMenu
      open={!!contextMenuAt && !!videoMenu && !mini}
      x={contextMenuAt?.x ?? 0}
      y={contextMenuAt?.y ?? 0}
      config={videoMenu}
      onClose={closeContextMenu}
    />
    <VideoLongPressMenu
      open={longPressOpen && !!videoMenu && !mini}
      config={videoMenu}
      onClose={closeLongPressMenu}
    />
    </>
  );
}
