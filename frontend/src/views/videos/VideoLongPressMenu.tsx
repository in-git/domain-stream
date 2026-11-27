import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Gauge, Repeat, RotateCcw, Volume2, VolumeX, type LucideIcon } from 'lucide-react';
import {
  VIDEO_LOOP_MODES,
  VIDEO_PLAYBACK_RATES,
  type VideoMenuConfig,
} from './videoMenuTypes';

interface VideoLongPressMenuProps {
  open: boolean;
  config?: VideoMenuConfig;
  onClose: () => void;
}

/** 倍速文案：整数补一位小数（1.0 / 2.0），其余保持原值（0.75 / 1.5） */
function formatRate(rate: number): string {
  return Number.isInteger(rate) ? rate.toFixed(1) : String(rate);
}

/** 行内分段选项：选中项主色加粗，选项之间用细竖线分隔 */
function InlineOptions<T extends string | number>({
  ariaLabel,
  options,
  value,
  onChange,
}: {
  ariaLabel: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="flex items-center">
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={`h-8 whitespace-nowrap px-2 text-[13px] tabular-nums transition-colors ${
              index > 0 ? 'border-l border-black/10' : ''
            } ${checked ? 'font-medium text-app-primary' : 'text-[#1D1D1F]/55'}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** 行首描边图标 */
function RowIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className="h-5 w-5 shrink-0 text-[#1D1D1F]" strokeWidth={1.6} />;
}

/** iOS 风格开关：纯展示，点击由整行承担 */
function Toggle({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex h-[26px] w-[46px] shrink-0 items-center rounded-full transition-colors ${
        on ? 'bg-app-primary' : 'bg-black/15'
      }`}
    >
      <span
        className={`absolute h-[22px] w-[22px] rounded-full bg-white shadow-sm transition-transform ${
          on ? 'translate-x-[22px]' : 'translate-x-[2px]'
        }`}
      />
    </span>
  );
}

/** 移动端视频长按菜单：白色底部面板，只保留倍速、循环、静音、重新播放 */
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
      <div className="absolute inset-0 bg-black/65" />
      <motion.div
        role="menu"
        aria-label="视频控制"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
        className="relative max-h-[75dvh] w-full overflow-y-auto rounded-t-2xl bg-white pb-[calc(env(safe-area-inset-bottom)+12px)] text-[#1D1D1F] shadow-2xl"
      >
        {/* 顶部拖拽指示条 */}
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-black/15" />

        <div className="mt-3 border-t border-black/[0.06]">
          {/* 倍速 */}
          <div className="flex min-h-14 items-center gap-3 px-4">
            <RowIcon icon={Gauge} />
            <span className="text-[15px]">倍速</span>
            <div className="ml-auto">
              <InlineOptions
                ariaLabel="播放倍速"
                options={VIDEO_PLAYBACK_RATES.map((rate) => ({
                  value: rate,
                  label: formatRate(rate),
                }))}
                value={state.playbackRate}
                onChange={(rate) => run(() => actions.setRate(rate))}
              />
            </div>
          </div>

          {/* 循环模式 */}
          <div className="flex min-h-14 items-center gap-3 border-t border-black/[0.06] px-4">
            <RowIcon icon={Repeat} />
            <span className="text-[15px]">循环</span>
            <div className="ml-auto">
              <InlineOptions
                ariaLabel="循环模式"
                options={VIDEO_LOOP_MODES.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                value={state.loopMode}
                onChange={(mode) => run(() => actions.setLoopMode(mode))}
              />
            </div>
          </div>

          {/* 静音 */}
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={state.isMuted}
            onClick={() => run(actions.toggleMute)}
            className="flex min-h-14 w-full items-center gap-3 border-t border-black/[0.06] px-4 text-left transition-colors active:bg-black/[0.03]"
          >
            <RowIcon icon={state.isMuted ? VolumeX : Volume2} />
            <span className="text-[15px]">静音</span>
            <span className="ml-auto flex items-center">
              <Toggle on={state.isMuted} />
            </span>
          </button>

          {/* 重新播放 */}
          <button
            type="button"
            role="menuitem"
            onClick={() => run(actions.replay)}
            className="flex min-h-14 w-full items-center gap-3 border-t border-black/[0.06] px-4 text-left transition-colors active:bg-black/[0.03]"
          >
            <RowIcon icon={RotateCcw} />
            <span className="text-[15px]">重新播放</span>
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
