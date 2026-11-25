import { ArrowDownUp } from 'lucide-react';

export type TimeSortOrder = 'DESCEND' | 'ASCEND';

/** 按创建时间排序，默认最新优先 */
export function sortByCreatedAt<T extends { createdAt: string }>(
  items: T[],
  order: TimeSortOrder
): T[] {
  return [...items].sort((a, b) => {
    const diff = (Date.parse(a.createdAt) || 0) - (Date.parse(b.createdAt) || 0);
    return order === 'DESCEND' ? -diff : diff;
  });
}

/** 按创建时间排序切换：默认最新优先，点击后在最新/最早之间循环 */
export function SortOrderButton({
  order,
  onChange,
  className = '',
}: {
  order: TimeSortOrder;
  onChange: (order: TimeSortOrder) => void;
  className?: string;
}) {
  const next = order === 'DESCEND' ? 'ASCEND' : 'DESCEND';
  const label = next === 'DESCEND' ? '按时间最新优先' : '按时间最早优先';
  return (
    <button
      type="button"
      onClick={() => onChange(next)}
      title={label}
      aria-label={label}
      className={`h-9 w-9 rounded-[10px] flex items-center justify-center transition-colors ${
        className ||
        'bg-[#0071E3]/10 text-[#0071E3]'
      }`}
    >
      <ArrowDownUp className={`w-4 h-4 transition-transform ${order === 'ASCEND' ? 'rotate-180' : ''}`} />
    </button>
  );
}
