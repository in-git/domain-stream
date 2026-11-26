import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  Check,
  Repeat,
  Repeat1,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  type LucideIcon,
} from 'lucide-react';
import { VIDEO_PLAYBACK_RATES, type VideoMenuConfig } from './videoMenuTypes';

interface VideoLongPressMenuProps {
  open: boolean;
  config?: VideoMenuConfig;
  onClose: () => void;
}

interface SheetRowProps {
  icon: LucideIcon;
  label: string;
  hint?: string;
  checked?: boolean;
  onClick: () => void;
}

/** 抖音式列表行：左侧图标、中间文字、右侧状态 */
function SheetRow({ icon: Icon, label, hint, checked, onClick }: SheetRowProps) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked ?? false}
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-2 border-b border-white/5 px-1 text-left transition-colors last:border-b-0 active:bg-white/5"
    >
      <Icon className={`h-[18px] w-[18px] shrink-0 ${checked ? 'text-app-primary' : 'text-white/75'}`} />
      <span className={`flex-1 text-[14px] ${checked ? 'text-white' : 'text-white/85'}`}>
        {label}
      </span>
      {hint && <span className="shrink-0 text-[12px] text-white/45">{hint}</span>}
      {checked && <Check className="h-4 w-4 shrink-0 text-app-primary" />}
    </button>
  );
}

/** 移动端视频长按菜单：底部列表面板，不提供全屏、上下切换和播放按钮 */
export function VideoLongPressMenu({ open, config, onClose }: VideoLongPressMenuProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !config) return null;

  const { state, actions } = config;
  const run = (action: () => void) => {
    action();
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end" onPointerDown={onClose}>
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <motion.div
        role="menu"
        aria-label="视频控制"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        className="relative max-h-[75dvh] w-full overflow-y-auto rounded-t-2xl border-t border-white/10 bg-[#1C1C1E]/97 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 text-white shadow-2xl"
      >
        <div className="mb-2 flex items-center justify-between px-1">
          <h3 className="text-[14px] font-medium">视频控制</h3>
          <button
            type="button"
            aria-label="关闭菜单"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/80"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-1">
          <SheetRow
            icon={Repeat}
            label="自动循环"
            hint={state.autoLoop ? '开' : '关'}
            checked={state.autoLoop}
            onClick={() => run(actions.toggleAutoLoop)}
          />
          <SheetRow
            icon={Repeat1}
            label="单条循环"
            hint={state.singleLoop ? '开' : '关'}
            checked={state.singleLoop}
            onClick={() => run(actions.toggleSingleLoop)}
          />
          <SheetRow
            icon={state.isMuted ? VolumeX : Volume2}
            label="静音"
            hint={state.isMuted ? '开' : '关'}
            checked={state.isMuted}
            onClick={() => run(actions.toggleMute)}
          />
          <SheetRow
            icon={RotateCcw}
            label="重新播放"
            onClick={() => run(actions.replay)}
          />
        </div>

        <p className="mb-1 mt-3 px-2 text-[12px] text-white/45">播放倍速</p>
        <div className="px-1">
          {VIDEO_PLAYBACK_RATES.map((rate) => (
            <button
              key={rate}
              type="button"
              role="menuitemradio"
              aria-checked={state.playbackRate === rate}
              onClick={() => run(() => actions.setRate(rate))}
              className="flex min-h-12 w-full items-center gap-2 border-b border-white/5 px-1 text-left transition-colors last:border-b-0 active:bg-white/5"
            >
              <span className="w-[18px] shrink-0" />
              <span
                className={`flex-1 text-[14px] tabular-nums ${
                  state.playbackRate === rate ? 'text-white' : 'text-white/85'
                }`}
              >
                {rate}x
              </span>
              {state.playbackRate === rate && (
                <Check className="h-4 w-4 shrink-0 text-app-primary" />
              )}
            </button>
          ))}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
