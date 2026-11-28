/**
 * 带管理入口的选项标签条
 * ------------------------------------------------------------------
 * 通用的「分类/类型」切换组件：左侧选项，末尾一个管理图标。
 * 选项数据由调用方从后端加载，管理按钮只负责触发管理弹窗。
 */
import { Settings2 } from 'lucide-react';

export interface ManagedOption {
  value: string;
  label: string;
}

export default function ManagedOptionTabs({
  options,
  value,
  onChange,
  onManage,
  manageTitle = '管理',
}: {
  options: ManagedOption[];
  value: string;
  onChange: (value: string) => void;
  onManage?: () => void;
  manageTitle?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`h-8 px-3 rounded-[10px] text-[12px] font-medium transition-colors ${
            value === option.value
              ? 'bg-[#0071E3]/10 text-[#0071E3]'
              : 'text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
          }`}
        >
          {option.label}
        </button>
      ))}
      {onManage && (
        <button
          type="button"
          onClick={onManage}
          title={manageTitle}
          aria-label={manageTitle}
          className="h-8 w-8 rounded-[10px] inline-flex items-center justify-center text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#0071E3] transition-colors"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
