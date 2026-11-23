import { useMemo, useState, type ReactNode } from 'react';
import { FolderPlus } from 'lucide-react';
import {
  dedupePublishCategoryOptions,
  filterPublishCategories,
  type PublishCategoryModule,
  type PublishCategoryOption,
} from '../lib/category.ts';
import { usePublishCategories } from '../lib/usePublishCategories.ts';
import { SelectField } from './SelectField.tsx';
import { QuickCreateCategory } from './QuickCreateCategory.tsx';

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
  /** 是否显示「新建分类」快捷入口，默认显示 */
  allowQuickCreate?: boolean;
  /**
   * 外部已加载好的分类选项（可选）：
   * 调用方若已有分类数据（如已通过 usePublishCategories 加载并做过宽松过滤），
   * 可直接传入，避免组件内部再拉一次并按模块严格过滤导致选项缺失。
   */
  options?: PublishCategoryOption[];
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
  allowQuickCreate = true,
  options: externalOptions,
}: CategorySelectProps) {
  const { options, loading, error, reload } = usePublishCategories(module);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  /**
   * 新建分类后的本地补充项。
   * 后端分类列表需要重新请求才能包含新分类，而重新请求存在时序问题
   * （并发缓存、父组件自己的 hook 实例刷新前仍拿到旧列表），
   * 这里直接把新建结果并入选项，保证「新建即可选、可保存」。
   */
  const [createdOptions, setCreatedOptions] = useState<PublishCategoryOption[]>([]);

  // 外部传入时以外部数据为准，并视为已加载完成
  const baseOptions = externalOptions ?? options;
  const source = useMemo(() => {
    if (!createdOptions.length) return baseOptions;
    const knownIds = new Set(baseOptions.map((option) => option.id));
    const knownCodes = new Set(baseOptions.map((option) => option.code));
    return [
      ...baseOptions,
      ...createdOptions.filter(
        (option) => !knownIds.has(option.id) && !knownCodes.has(option.code)
      ),
    ];
  }, [baseOptions, createdOptions]);
  const isLoading = externalOptions ? false : loading;

  const filtered = useMemo(
    () => filterPublishCategories(source, module, includeCommon),
    [source, module, includeCommon]
  );

  // 历史数据可能绑定了其它模块的分类，保留当前值避免编辑时被清空
  const selectable = useMemo(() => {
    const merged = filtered;
    if (!value || merged.some((option) => option.code === value)) {
      return dedupePublishCategoryOptions(merged, module);
    }
    const current = source.find((option) => option.code === value);
    return dedupePublishCategoryOptions(current ? [...merged, current] : merged, module);
  }, [filtered, source, value, module]);

  return (
    <div>
      {label && (
        <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
          {label} {required && <span className="text-[#D70015]">*</span>}
        </label>
      )}
      <div className={`flex items-center gap-2 ${className}`}>
        <SelectField
          value={value}
          onChange={onChange}
          isDisabled={isLoading || !!error}
          placeholder={isLoading ? '正在加载分类...' : error ? '分类加载失败' : placeholder}
          ariaLabel={ariaLabel || (typeof label === 'string' ? label : '分类')}
          className="flex-1 min-w-0"
          options={selectable.map((option) => ({ value: option.code, label: option.label }))}
        />
        {allowQuickCreate && (
          <button
            type="button"
            onClick={() => setQuickCreateOpen(true)}
            title="新建分类"
            aria-label="新建分类"
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl border border-[#D2D2D7] bg-white text-[#0071E3] hover:bg-[#F5F5F7] hover:border-[#0071E3]/40 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-[11px] text-[#D70015]">{error}，请稍后重试</p>}

      {allowQuickCreate && (
        <QuickCreateCategory
          open={quickCreateOpen}
          module={module}
          title="新建分类"
          hint="创建后将自动选中该分类"
          onClose={() => setQuickCreateOpen(false)}
          onCreated={(category) => {
            // 先把新建分类补进本地选项，再触发一次后台刷新（拉取完整层级）
            if (category.code) {
              setCreatedOptions((prev) => [
                ...prev,
                {
                  id: category.id,
                  code: category.code as string,
                  name: (category.name || category.code || '').trim(),
                  label: (category.name || category.code || '').trim(),
                  module: category.module,
                  parentId: category.parentId || '0',
                  sortCode: category.sortCode ?? 0,
                },
              ]);
              // 立即选中：不依赖刷新时序，新建后马上可用
              onChange(category.code);
            }
            reload();
          }}
        />
      )}
    </div>
  );
}
