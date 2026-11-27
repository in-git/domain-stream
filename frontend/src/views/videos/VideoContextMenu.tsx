import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Check,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  type LucideIcon,
} from 'lucide-react';
import { MenuSegments } from './MenuSegments';
import {
  VIDEO_LOOP_MODES,
  VIDEO_PLAYBACK_RATES,
  type VideoMenuConfig,
} from './videoMenuTypes';

interface VideoContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  config?: VideoMenuConfig;
  onClose: () => void;
}

interface MenuRowProps {
  icon: LucideIcon;
  label: string;
  hint?: string;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void;
}

function MenuRow({ icon: Icon, label, hint, disabled, active, onClick }: MenuRowProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center gap-2 rounded-app px-2 py-2 text-left text-[13px] transition-colors ${
        disabled
          ? 'cursor-not-allowed text-white/30'
          : 'text-white/90 hover:bg-white/10 active:bg-white/15'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {hint && <span className="shrink-0 text-[11px] text-white/45">{hint}</span>}
      {active && <Check className="h-3.5 w-3.5 shrink-0 text-app-primary" />}
    </button>
  );
}

/** PC 视频右键菜单：定位在鼠标位置，点击菜单外或按 Esc 关闭 */
export function VideoContextMenu({ open, x, y, config, onClose }: VideoContextMenuProps) {
  useEffect(() => {
    if (!open) return;
    const close = () => onClose();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open, onClose]);

  if (!open || !config) return null;

  const { state, actions } = config;
  const run = (action: () => void) => {
    action();
    onClose();
  };
  const menuWidth = 232;
  const menuHeight = 400;
  const left = Math.max(8, Math.min(x, window.innerWidth - menuWidth - 8));
  const top = Math.max(8, Math.min(y, window.innerHeight - menuHeight - 8));

  return createPortal(
    <div className="fixed inset-0 z-[130]" onPointerDown={onClose}>
      <div
        role="menu"
        aria-label="视频控制"
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        style={{ left, top, width: menuWidth, maxHeight: 'calc(100vh - 16px)' }}
        className="absolute overflow-x-hidden overflow-y-auto rounded-app border border-white/10 bg-[#1C1C1E]/95 p-1.5 text-white shadow-2xl backdrop-blur-xl"
      >
        <div className="px-1.5 pb-1 pt-1">
          <p className="mb-1.5 text-[11px] text-white/45">循环模式</p>
          <MenuSegments
            ariaLabel="循环模式"
            options={VIDEO_LOOP_MODES.map((option) => ({
              value: option.value,
              label: option.label,
            }))}
            value={state.loopMode}
            onChange={(mode) => run(() => actions.setLoopMode(mode))}
          />
        </div>

        <div className="my-1 h-px bg-white/10" />

        <MenuRow
          icon={state.isPlaying ? Pause : Play}
          label={state.isPlaying ? '暂停' : '播放'}
          onClick={() => run(actions.togglePlay)}
        />
        <MenuRow
          icon={state.isMuted ? VolumeX : Volume2}
          label={state.isMuted ? '取消静音' : '静音'}
          onClick={() => run(actions.toggleMute)}
        />
        <MenuRow
          icon={RotateCcw}
          label="重新播放"
          onClick={() => run(actions.replay)}
        />

        <div className="my-1 h-px bg-white/10" />

        <MenuRow
          icon={SkipBack}
          label="上一个"
          disabled={!state.canPrev}
          onClick={() => run(actions.prev)}
        />
        <MenuRow
          icon={SkipForward}
          label="下一个"
          disabled={!state.canNext}
          onClick={() => run(actions.next)}
        />

        <div className="my-1 h-px bg-white/10" />

        <div className="px-1.5 pb-1 pt-1">
          <p className="mb-1.5 text-[11px] text-white/45">播放倍速</p>
          <MenuSegments
            ariaLabel="播放倍速"
            options={VIDEO_PLAYBACK_RATES.map((rate) => ({
              value: rate,
              label: `${rate}x`,
            }))}
            value={state.playbackRate}
            onChange={(rate) => run(() => actions.setRate(rate))}
          />
        </div>

        <div className="my-1 h-px bg-white/10" />

        <MenuRow
          icon={state.isFullscreen ? Minimize : Maximize}
          label={state.isFullscreen ? '退出全屏' : '全屏播放'}
          onClick={() => run(actions.toggleFullscreen)}
        />
      </div>
    </div>,
    document.body
  );
}
