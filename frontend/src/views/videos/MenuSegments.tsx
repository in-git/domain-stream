/**
 * 菜单内的分段单选控件
 * ------------------------------------------------------------------
 * 系统分段控件样式：同一行等分按钮，选中项用主色填充，未选中项透明，
 * 段与段之间用细分割线隔开。PC 右键菜单与移动端长按菜单共用。
 */
interface MenuSegmentsProps<T extends string | number> {
  /** 无障碍分组名，如「播放倍速」 */
  ariaLabel: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  /** sm 用于 PC 右键菜单，md 用于移动端底部面板 */
  size?: 'sm' | 'md';
}

export function MenuSegments<T extends string | number>({
  ariaLabel,
  options,
  value,
  onChange,
  size = 'sm',
}: MenuSegmentsProps<T>) {
  const heightClass = size === 'md' ? 'h-9 text-[12px]' : 'h-7 text-[11px]';

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex w-full overflow-hidden rounded-app border border-white/15 bg-white/5"
    >
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`flex flex-1 items-center justify-center whitespace-nowrap tabular-nums transition-colors ${heightClass} ${
              index > 0 ? 'border-l border-white/15' : ''
            } ${
              active
                ? 'bg-app-primary font-medium text-white'
                : 'text-white/75 hover:bg-white/10 active:bg-white/15'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
