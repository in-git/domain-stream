import { ArrowDownUp } from 'lucide-react';

export type TimeSortOrder = 'DESC' | 'ASC';

/** 默认倒序（最新优先）；点击在倒序 / 升序之间循环 */
export function sortByTime<T extends { sortTime?: number }>(items: T[], order: TimeSortOrder): T[] {
  return [...items].sort((a, b) => {
    const diff = (a.sortTime || 0) - (b.sortTime || 0);
    return order === 'DESC' ? -diff : diff;
  });
}

export function TimeSortButton({
  order,
  onChange,
  className = '',
}: {
  order: TimeSortOrder;
  onChange: (order: TimeSortOrder) => void;
  className?: string;
}) {
  const next = order === 'DESC' ? 'ASC' : 'DESC';
  const label = next === 'DESC' ? '切换为倒序（最新优先）' : '切换为升序（最早优先）';
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      title={label}
      aria-label={label}
      aria-pressed={order === 'ASC'}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-[#6E6E73] transition-colors hover:bg-black/[0.07] dark:bg-white/[0.08] dark:text-[#98989D] dark:hover:bg-white/[0.12] ${className}`}
    >
      <ArrowDownUp
        className={`h-4 w-4 transition-transform ${order === 'ASC' ? 'rotate-180' : ''}`}
        strokeWidth={1.8}
      />
    </button>
  );
}
