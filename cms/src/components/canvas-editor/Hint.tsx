/**
 * 画布内的悬停提示
 * ------------------------------------------------------------------
 * 统一用 HeroUI 的 Tooltip 取代原生 title：原生 title 有延迟、样式不可控，
 * 在深色画布上也看不清。触发层只负责接收悬停 / 焦点事件，不改变原有布局：
 * 外层通过 className 承担尺寸与 flex 占位，内层控件自己撑满（h-full w-full）。
 */
import type { ReactNode } from 'react';
import { Tooltip } from '@heroui/react/tooltip';

interface HintProps {
  label: string;
  children: ReactNode;
  /** 触发层的布局类：尺寸、flex 占位放这一层 */
  className?: string;
}

export function Hint({ label, children, className }: HintProps) {
  return (
    <Tooltip delay={320} closeDelay={80}>
      <Tooltip.Trigger tabIndex={-1} role="presentation" className={className}>
        {children}
      </Tooltip.Trigger>
      <Tooltip.Content>{label}</Tooltip.Content>
    </Tooltip>
  );
}

export default Hint;
