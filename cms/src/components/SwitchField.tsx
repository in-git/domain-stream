import type { ReactNode } from 'react';
import { Switch } from '@heroui/react';

export interface SwitchFieldProps {
  /** 是否开启 */
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** 开启时的文案，如「启用」 */
  onLabel?: ReactNode;
  /** 关闭时的文案，如「停用」 */
  offLabel?: ReactNode;
  /** 无可见文案时的无障碍标签 */
  ariaLabel?: string;
  isDisabled?: boolean;
  className?: string;
}

/**
 * 基于 HeroUI Switch 封装的开关，用于替代「启用 / 停用」这类二值状态的选择。
 * 右侧附带当前状态文字，让开关含义一目了然。
 */
export function SwitchField({
  checked,
  onChange,
  onLabel = '启用',
  offLabel = '停用',
  ariaLabel,
  isDisabled,
  className,
}: SwitchFieldProps) {
  return (
    <Switch
      isSelected={checked}
      onChange={onChange}
      isDisabled={isDisabled}
      aria-label={ariaLabel}
      className={`flex items-center gap-2.5 ${className ?? ''}`}
    >
      {/* Switch.Content 才是可点击区域，须把 Control 包在里面 */}
      <Switch.Content>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
        <span
          className={`text-[12px] font-medium ${checked ? 'text-[#1D1D1F]' : 'text-[#86868B]'}`}
        >
          {checked ? onLabel : offLabel}
        </span>
      </Switch.Content>
    </Switch>
  );
}

export default SwitchField;
