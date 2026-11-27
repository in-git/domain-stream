/** 循环模式：单条循环（播完从头重播）或自动连播（播完切下一条） */
export type VideoLoopMode = 'single' | 'auto';

/** 视频控制菜单的展示状态（PC 右键菜单与移动端长按菜单共用） */
export interface VideoMenuState {
  /** 循环模式，单选项 */
  loopMode: VideoLoopMode;
  isPlaying: boolean;
  isMuted: boolean;
  playbackRate: number;
  isFullscreen: boolean;
  canPrev: boolean;
  canNext: boolean;
}

/** 视频控制菜单可执行的动作 */
export interface VideoMenuActions {
  setLoopMode: (mode: VideoLoopMode) => void;
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

/** 循环模式选项，菜单里渲染成单选组 */
export const VIDEO_LOOP_MODES: ReadonlyArray<{
  value: VideoLoopMode;
  label: string;
  hint: string;
}> = [
  { value: 'single', label: '单条循环', hint: '播完从头重播' },
  { value: 'auto', label: '自动连播', hint: '播完切下一条' },
];
