import { useMemo, type ReactNode } from 'react';
import {
  filterPublishCategories,
  type PublishCategoryModule,
} from '../lib/category.ts';
import { usePublishCategories } from '../lib/usePublishCategories.ts';
import { SelectField } from './SelectField.tsx';

export interface CategorySelectProps {
  /** 目标模块：只展示该模块与「通用」分类 */
  module: PublishCategoryModule;
  /** 当前选中的分类编码 */
  value: string;
  onChange: (code: string) => void;
  /** 可见标签；不传时由调用方自行渲染 */
  label?: ReactNode;
  /** 是否显示必填星号 */
  required?: boolean;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  /** 是否包含「通用」（COMMON）分类，默认包含 */
  includeCommon?: boolean;
}

/**
 * 通用分类下拉选择器：后端一次性返回全部分类，这里按模块在前端筛选。
 * 例如传 module="GRAPHIC"，下拉只会出现图文与通用分类。
 */
export function CategorySelect({
  module,
  value,
  onChange,
  label,
  required,
  ariaLabel,
  placeholder = '请选择分类',
  className = 'w-full',
  includeCommon = true,
}: CategorySelectProps) {
  const { options, loading, error } = usePublishCategories(module);

  const filtered = useMemo(
    () => filterPublishCategories(options, module, includeCommon),
    [options, module, includeCommon]
  );

  // 历史数据可能绑定了其它模块的分类，保留当前值避免编辑时被清空
  const selectable = useMemo(() => {
    if (!value || filtered.some((option) => option.code === value)) return filtered;
    const current = options.find((option) => option.code === value);
    return current ? [...filtered, current] : filtered;
  }, [filtered, options, value]);

  return (
    <div>
      {label && (
        <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
          {label} {required && <span className="text-[#D70015]">*</span>}
        </label>
      )}
      <SelectField
        value={value}
        onChange={onChange}
        isDisabled={loading || !!error}
        placeholder={loading ? '正在加载分类...' : error ? '分类加载失败' : placeholder}
        ariaLabel={ariaLabel || (typeof label === 'string' ? label : '分类')}
        className={className}
        options={selectable.map((option) => ({ value: option.code, label: option.label }))}
      />
      {error && <p className="mt-1 text-[11px] text-[#D70015]">{error}，请稍后重试</p>}
    </div>
  );
}
