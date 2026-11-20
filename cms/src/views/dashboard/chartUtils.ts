/** 访客流量图表的时间跨度与指标筛选类型 */
export type RangeKey = 'realtime' | 'week' | 'month';
export type MetricMode = 'both' | 'uv' | 'pv';

export interface Point {
  x: number;
  y: number;
}

/** 把折线点转换为平滑贝塞尔曲线路径 */
export function buildSmoothPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx.toFixed(1)} ${p0.y.toFixed(1)}, ${cx.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}
