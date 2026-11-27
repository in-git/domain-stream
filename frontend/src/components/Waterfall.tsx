import { Fragment, useMemo, type ReactNode } from 'react';

/**
 * 瀑布流布局
 * ------------------------------------------------------------------
 * 只负责分组与排列：按 `getWeight` 累加每列高度，把下一项放进当前更短的一列，
 * 卡片的实际高度由 `renderItem` 自己决定（固定像素高或 CSS aspect-ratio）。
 * 因此同一套逻辑既支持 PC 侧边栏的固定列宽，也支持移动端的等分列宽。
 */
export interface WaterfallProps<T> {
  items: T[];
  /** 列数，默认 2 */
  columns?: number;
  /** 列间距与卡片纵向间距（px），默认 8 */
  gap?: number;
  /** 固定列宽（px）；不传则各列等分容器宽度 */
  columnWidth?: number;
  /** 卡片纵向权重（像素高或高宽比），只用来判断哪一列更短 */
  getWeight: (item: T, index: number) => number;
  renderItem: (item: T, index: number) => ReactNode;
  keyOf: (item: T, index: number) => string;
  className?: string;
  columnClassName?: string;
}

export function Waterfall<T>({
  items,
  columns = 2,
  gap = 8,
  columnWidth,
  getWeight,
  renderItem,
  keyOf,
  className = '',
  columnClassName = '',
}: WaterfallProps<T>) {
  const buckets = useMemo(() => {
    const result: Array<Array<{ item: T; index: number }>> = Array.from(
      { length: Math.max(1, columns) },
      () => []
    );
    // 起始高度取一个间距，保证首项从顶部开始计算
    const heights = result.map(() => gap);

    items.forEach((item, index) => {
      let target = 0;
      for (let column = 1; column < heights.length; column += 1) {
        if (heights[column] < heights[target]) target = column;
      }
      result[target].push({ item, index });
      heights[target] += Math.max(0, getWeight(item, index)) + gap;
    });

    return result;
  }, [items, columns, gap, getWeight]);

  return (
    <div className={`flex ${className}`} style={{ gap }}>
      {buckets.map((bucket, columnIndex) => (
        <div
          key={columnIndex}
          className={`flex min-w-0 flex-col ${columnWidth ? 'shrink-0' : columnClassName || 'flex-1'}`}
          style={{ gap, width: columnWidth }}
        >
          {bucket.map(({ item, index }) => (
            <Fragment key={keyOf(item, index)}>{renderItem(item, index)}</Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}

export default Waterfall;
