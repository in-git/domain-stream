/** 视频控制菜单的展示状态（PC 右键菜单与移动端长按菜单共用） */
export interface VideoMenuState {
  /** 播完自动切下一条；关闭后停在当前视频末尾 */
  autoLoop: boolean;
  /** 单条视频循环播放；开启后不会自动切下一条 */
  singleLoop: boolean;
  isPlaying: boolean;
  isMuted: boolean;
  playbackRate: number;
  isFullscreen: boolean;
  canPrev: boolean;
  canNext: boolean;
}

/** 视频控制菜单可执行的动作 */
export interface VideoMenuActions {
  toggleAutoLoop: () => void;
  toggleSingleLoop: () => void;
  togglePlay: () => void;
  toggleMute: () => void;
  setRate: (rate: number) => void;
  prev: () => void;
  next: () => void;
  replay: () => void;
  toggleFullscreen: () => void;
}

export interface VideoMenuConfig {
  state: VideoMenuState;
  actions: VideoMenuActions;
}

export const VIDEO_PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;
