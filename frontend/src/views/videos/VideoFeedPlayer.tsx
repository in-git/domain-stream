import type { MediaPlayerInstance } from '@vidstack/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Keyboard, Mousewheel } from 'swiper/modules';
import type { Swiper as SwiperClass } from 'swiper';
import 'swiper/css';
import type { VideoItem } from '../../types/content';
import { FeedSlide } from './FeedSlide';
import type { VideoMenuConfig } from './videoMenuTypes';

/** 沉浸流播放器对外暴露的状态，由首页 / 模态框各自持有 */
export interface VideoFeedPlayerState {
  activeIndex: number;
  isMuted: boolean;
  playbackRate: number;
  currentTime: number;
  duration: number;
}

/** 沉浸流播放器的交互回调 */
export interface VideoFeedPlayerHandlers {
  onSlideChange: (index: number) => void;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onSetRate: (rate: number) => void;
  onSeek: (time: number) => void;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onRegisterPlayer: (id: string, player: MediaPlayerInstance | null) => void;
  onPlaybackStateChange?: (playing: boolean) => void;
  /** 首页沉浸流播完自动切下一条；模态框不传则沿用单条循环 */
  onVideoEnded?: () => void;
}

interface VideoFeedPlayerProps {
  videos: VideoItem[];
  state: VideoFeedPlayerState;
  handlers: VideoFeedPlayerHandlers;
  likedIds: string[];
  savedIds: string[];
  onToggleLike: (id: string) => void;
  onToggleSave: (id: string) => void;
  /** Swiper 重建键：切换分类、搜索词或换一批视频时传入，避免停留在旧 slide */
  swiperKey?: string;
  onSwiper?: (instance: SwiperClass) => void;
  isFullscreen?: boolean;
  showFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  mini?: boolean;
  onMiniClose?: () => void;
  onMiniExpand?: () => void;
  onStageTap?: () => void;
  onPlaybackStart?: () => void;
  chromeVisible?: boolean;
  /** 首页沉浸流需要把标题与操作栏 portal 到 body，模态框保持 slide 内定位 */
  captionToBody?: boolean;
  /** 传入后启用右键/长按控制菜单；模态框不传 */
  videoMenu?: VideoMenuConfig;
  /** 所属模块被切走（如切到图文/设置）时为 true，暂停渲染评论抽屉等浮层 */
  moduleHidden?: boolean;
}

/**
 * 通用沉浸流播放器：首页沉浸刷看和卡片点击后的全屏模态框共用同一套
 * Swiper 配置与 FeedSlide 接线，只把播放状态和交互交给外层控制。
 */
export function VideoFeedPlayer({
  videos,
  state,
  handlers,
  likedIds,
  savedIds,
  onToggleLike,
  onToggleSave,
  swiperKey,
  onSwiper,
  isFullscreen = false,
  showFullscreen = true,
  onToggleFullscreen,
  mini = false,
  onMiniClose,
  onMiniExpand,
  onStageTap,
  onPlaybackStart,
  chromeVisible = true,
  captionToBody = false,
  videoMenu,
  moduleHidden = false,
}: VideoFeedPlayerProps) {
  const { activeIndex, isMuted, playbackRate, currentTime, duration } = state;

  return (
    <Swiper
      key={swiperKey}
      onSwiper={onSwiper}
      direction="vertical"
      slidesPerView={1}
      /* 无限批次追加时不能用 loop：Swiper 重建循环会打乱 realIndex，追加几批后就不触发加载了 */
      loop={false}
      speed={520}
      initialSlide={Math.max(0, Math.min(activeIndex, Math.max(0, videos.length - 1)))}
      modules={[Mousewheel, Keyboard, A11y]}
      mousewheel={{ forceToAxis: true, sensitivity: 1, thresholdDelta: 16 }}
      keyboard={{ enabled: true }}
      a11y={{ enabled: true }}
      onSlideChange={(swiper) => handlers.onSlideChange(swiper.realIndex)}
      className="w-full h-full"
    >
      {videos.map((video, idx) => (
        <SwiperSlide key={`${video.id}-${idx}`} className="relative">
          <FeedSlide
            video={video}
            index={idx}
            total={videos.length}
            active={idx === activeIndex}
            isMuted={isMuted}
            playbackRate={playbackRate}
            liked={likedIds.includes(video.id)}
            saved={savedIds.includes(video.id)}
            currentTime={currentTime}
            duration={duration}
            isFullscreen={isFullscreen}
            onRegisterPlayer={handlers.onRegisterPlayer}
            playerKey={`${video.id}-${idx}`}
            onStageTap={onStageTap}
            onPlaybackStart={onPlaybackStart}
            onPlaybackStateChange={handlers.onPlaybackStateChange}
            onVideoEnded={handlers.onVideoEnded}
            chromeVisible={chromeVisible}
            onTogglePlay={handlers.onTogglePlay}
            onToggleMute={handlers.onToggleMute}
            onSetRate={handlers.onSetRate}
            onToggleLike={() => onToggleLike(video.id)}
            onToggleSave={() => onToggleSave(video.id)}
            onToggleFullscreen={onToggleFullscreen ?? (() => {})}
            onSeek={handlers.onSeek}
            onTimeUpdate={handlers.onTimeUpdate}
            onDurationChange={handlers.onDurationChange}
            mini={mini}
            onMiniClose={onMiniClose}
            onMiniExpand={onMiniExpand}
            showFullscreen={showFullscreen}
            captionToBody={captionToBody}
            videoMenu={videoMenu}
            moduleHidden={moduleHidden}
          />
        </SwiperSlide>
      ))}
    </Swiper>
  );
}
