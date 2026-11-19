import type { ReactNode } from 'react';
import { Label, ListBox, Select } from '@heroui/react';

/**
 * HeroUI Select 的 key 不能是空字符串，这里用哨兵值代表「空值」选项。
 */
const EMPTY_KEY = '__empty__';

export interface SelectFieldOption {
  value: string;
  label: string;
  isDisabled?: boolean;
}

export interface SelectFieldProps {
  /** 当前值，空字符串代表未选中 */
  value: string;
  onChange: (value: string) => void;
  options: SelectFieldOption[];
  placeholder?: string;
  /** 内置可见标签；无可见标签时请传 ariaLabel */
  label?: ReactNode;
  ariaLabel?: string;
  isDisabled?: boolean;
  className?: string;
}

/**
 * 基于 HeroUI Select 封装的下拉选择，供 CMS 各表单/筛选项统一使用。
 */
export function SelectField({
  value,
  onChange,
  options,
  placeholder,
  label,
  ariaLabel,
  isDisabled,
  className,
}: SelectFieldProps) {
  const hasEmptyOption = options.some((option) => option.value === '');
  const items = options.map((option) => ({
    key: option.value === '' ? EMPTY_KEY : option.value,
    label: option.label,
    isDisabled: option.isDisabled,
  }));
  const selectedKey =
    value === '' ? (hasEmptyOption ? EMPTY_KEY : null) : value;

  return (
    <Select
      fullWidth
      className={className}
      placeholder={placeholder}
      aria-label={ariaLabel}
      isDisabled={isDisabled}
      selectedKey={selectedKey}
      onSelectionChange={(key) =>
        onChange(key == null || key === EMPTY_KEY ? '' : String(key))
      }
    >
      {label !== undefined && label !== null && <Label>{label}</Label>}
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          {items.map((item) => (
            <ListBox.Item
              key={item.key}
              id={item.key}
              textValue={item.label}
              isDisabled={item.isDisabled}
            >
              {item.label}
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
