import type { ReactNode } from 'react';

type TooltipSide = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  label: string;
  children: ReactNode;
  side?: TooltipSide;
  className?: string;
}

const SIDE_CLASSES: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

/** 纯图标按钮的悬浮文字提示（苹果风格深色胶囊） */
export function Tooltip({ label, children, side = 'top', className = '' }: TooltipProps) {
  return (
    <span className={`group/tooltip relative inline-flex ${className}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-[#1D1D1F]/92 dark:bg-[#F5F5F7]/95 px-2.5 py-1 text-[11px] font-medium leading-4 text-white dark:text-[#1D1D1F] shadow-lg backdrop-blur-md opacity-0 scale-95 transition-all duration-150 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:scale-100 ${SIDE_CLASSES[side]}`}
      >
        {label}
      </span>
    </span>
  );
}
