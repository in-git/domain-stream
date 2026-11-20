import { useMemo } from 'react';
import { formatNumber } from '../../lib/format.ts';
import type { TrafficPoint } from '../../types/cms.ts';
import { buildSmoothPath, type MetricMode, type RangeKey } from './chartUtils';

const RANGE_TABS = [
  { key: 'both', label: '双指标' },
  { key: 'uv', label: 'UV' },
  { key: 'pv', label: 'PV' },
] as const;

const SPAN_TABS = [
  { key: 'realtime', label: '实时' },
  { key: 'week', label: '近 7 天' },
  { key: 'month', label: '近 30 天' },
] as const;

const RANGE_HINT: Record<RangeKey, string> = {
  realtime: '最近时段在线会话与页面浏览实时波动',
  week: '过去 7 日独立访客与浏览总量走势',
  month: '过去 14 日站点访问增长曲线',
};

interface TrafficChartProps {
  series: TrafficPoint[];
  range: RangeKey;
  metricMode: MetricMode;
  hoverIdx: number | null;
  onRangeChange: (range: RangeKey) => void;
  onMetricChange: (mode: MetricMode) => void;
  onHoverChange: (index: number | null) => void;
}

/** 访客流量折线面积图，支持指标/时间跨度切换与悬停查看 */
export function TrafficChart({
  series,
  range,
  metricMode,
  hoverIdx,
  onRangeChange,
  onMetricChange,
  onHoverChange,
}: TrafficChartProps) {
  const chartGeom = useMemo(() => {
    const W = 720;
    const H = 250;
    const padL = 48;
    const padR = 18;
    const padT = 18;
    const padB = 30;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    if (series.length === 0) {
      return {
        W, H, padL, padR, padT, padB, plotW, plotH, maxVal: 100,
        uvPts: [], pvPts: [], uvPath: '', pvPath: '', pvArea: '', uvArea: '', yTicks: [0, 50, 100],
      };
    }

    const values: number[] = [];
    for (const pt of series) {
      if (metricMode === 'uv' || metricMode === 'both') values.push(pt.uv);
      if (metricMode === 'pv' || metricMode === 'both') values.push(pt.pv);
    }
    const rawMax = Math.max(...values, 10);
    const maxVal = Math.ceil((rawMax * 1.15) / 10) * 10;

    const xFor = (i: number) =>
      series.length === 1 ? padL + plotW / 2 : padL + (i / (series.length - 1)) * plotW;
    const yFor = (val: number) => padT + plotH - (val / maxVal) * plotH;

    const uvPts = series.map((pt, i) => ({ x: xFor(i), y: yFor(pt.uv) }));
    const pvPts = series.map((pt, i) => ({ x: xFor(i), y: yFor(pt.pv) }));

    const uvPath = buildSmoothPath(uvPts);
    const pvPath = buildSmoothPath(pvPts);
    const baseY = padT + plotH;
    const uvArea = uvPts.length
      ? `${uvPath} L ${uvPts[uvPts.length - 1].x.toFixed(1)} ${baseY} L ${uvPts[0].x.toFixed(1)} ${baseY} Z`
      : '';
    const pvArea = pvPts.length
      ? `${pvPath} L ${pvPts[pvPts.length - 1].x.toFixed(1)} ${baseY} L ${pvPts[0].x.toFixed(1)} ${baseY} Z`
      : '';

    const yTicks = [0, Math.round(maxVal * 0.33), Math.round(maxVal * 0.66), maxVal];
    return { W, H, padL, padR, padT, padB, plotW, plotH, maxVal, uvPts, pvPts, uvPath, pvPath, uvArea, pvArea, yTicks };
  }, [series, metricMode]);

  const activeHoverPoint = hoverIdx !== null && series[hoverIdx] ? series[hoverIdx] : null;
  const showPv = metricMode === 'pv' || metricMode === 'both';
  const showUv = metricMode === 'uv' || metricMode === 'both';

  return (
    <div className="lg:col-span-2 xl:col-span-3 bg-white rounded-[18px] border border-[#E5E5EA] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight text-[#1D1D1F]">访客流量</h2>
          <p className="text-[13px] text-[#6E6E73] mt-0.5">{RANGE_HINT[range]}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center p-0.5 bg-[#F2F2F7] rounded-[10px]" role="tablist" aria-label="指标筛选">
            {RANGE_TABS.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => onMetricChange(m.key)}
                className={`px-2.5 py-1 text-[12px] font-medium rounded-[8px] transition-all whitespace-nowrap shrink-0 ${
                  metricMode === m.key
                    ? 'bg-white text-[#1D1D1F] shadow-xs'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex items-center p-0.5 bg-[#F2F2F7] rounded-[10px]" role="tablist" aria-label="时间跨度">
            {SPAN_TABS.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => onRangeChange(r.key)}
                className={`px-3 py-1 text-[12px] font-medium rounded-[8px] transition-all whitespace-nowrap shrink-0 ${
                  range === r.key
                    ? 'bg-white text-[#1D1D1F] shadow-xs'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="relative w-full">
        <svg
          viewBox={`0 0 ${chartGeom.W} ${chartGeom.H}`}
          className="w-full h-[250px] overflow-visible select-none"
          onMouseLeave={() => onHoverChange(null)}
        >
          <defs>
            <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0071E3" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0071E3" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="uvGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34C759" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#34C759" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {chartGeom.yTicks.map((tick) => {
            const y = chartGeom.padT + chartGeom.plotH - (tick / Math.max(1, chartGeom.maxVal)) * chartGeom.plotH;
            return (
              <g key={tick}>
                <line
                  x1={chartGeom.padL}
                  y1={y}
                  x2={chartGeom.W - chartGeom.padR}
                  y2={y}
                  stroke="#EFEFF4"
                  strokeWidth="1"
                />
                <text
                  x={chartGeom.padL - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[#86868B] text-[11px] font-mono tabular-nums"
                >
                  {tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick}
                </text>
              </g>
            );
          })}

          {showPv && (
            <>
              <path d={chartGeom.pvArea} fill="url(#pvGrad)" />
              <path d={chartGeom.pvPath} fill="none" stroke="#0071E3" strokeWidth="2.25" strokeLinecap="round" />
            </>
          )}

          {showUv && (
            <>
              <path d={chartGeom.uvArea} fill="url(#uvGrad)" />
              <path d={chartGeom.uvPath} fill="none" stroke="#34C759" strokeWidth="2.25" strokeLinecap="round" />
            </>
          )}

          {series.map((pt, i) => {
            const step = series.length > 12 ? 3 : series.length > 8 ? 2 : 1;
            if (i % step !== 0 && i !== series.length - 1) return null;
            const x = chartGeom.uvPts[i]?.x ?? 0;
            return (
              <text
                key={`${pt.label}-${i}`}
                x={x}
                y={chartGeom.H - 6}
                textAnchor="middle"
                className="fill-[#86868B] text-[11px] font-mono tabular-nums"
              >
                {pt.label}
              </text>
            );
          })}

          {hoverIdx !== null && chartGeom.uvPts[hoverIdx] && (
            <g>
              <line
                x1={chartGeom.uvPts[hoverIdx].x}
                y1={chartGeom.padT}
                x2={chartGeom.uvPts[hoverIdx].x}
                y2={chartGeom.padT + chartGeom.plotH}
                stroke="#D1D1D6"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {showPv && chartGeom.pvPts[hoverIdx] && (
                <circle
                  cx={chartGeom.pvPts[hoverIdx].x}
                  cy={chartGeom.pvPts[hoverIdx].y}
                  r="4.5"
                  fill="#0071E3"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              )}
              {showUv && (
                <circle
                  cx={chartGeom.uvPts[hoverIdx].x}
                  cy={chartGeom.uvPts[hoverIdx].y}
                  r="4.5"
                  fill="#34C759"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              )}
            </g>
          )}

          {/* 透明命中列：用于捕获鼠标位置 */}
          {series.map((_, i) => {
            const colW = chartGeom.plotW / Math.max(1, series.length);
            const x = (chartGeom.uvPts[i]?.x ?? 0) - colW / 2;
            return (
              <rect
                key={i}
                x={x}
                y={chartGeom.padT}
                width={colW}
                height={chartGeom.plotH}
                fill="transparent"
                onMouseEnter={() => onHoverChange(i)}
              />
            );
          })}
        </svg>

        {activeHoverPoint && hoverIdx !== null && chartGeom.uvPts[hoverIdx] && (
          <div
            className="pointer-events-none absolute top-2 z-10 rounded-xl bg-white/95 backdrop-blur-md border border-[#E5E5EA] shadow-[0_8px_24px_rgba(0,0,0,0.08)] px-3.5 py-2.5 text-[12px] min-w-[168px]"
            style={{
              left: `${Math.min(72, Math.max(8, (chartGeom.uvPts[hoverIdx].x / chartGeom.W) * 100))}%`,
            }}
          >
            <div className="font-mono font-semibold text-[#1D1D1F] mb-1 tabular-nums">
              {activeHoverPoint.label}
            </div>
            <div className="flex items-center justify-between gap-4 text-[#6E6E73]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#0071E3]" />
                浏览量 PV
              </span>
              <span className="font-mono font-medium text-[#1D1D1F] tabular-nums">
                {formatNumber(activeHoverPoint.pv)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-[#6E6E73] mt-0.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#34C759]" />
                独立访客 UV
              </span>
              <span className="font-mono font-medium text-[#1D1D1F] tabular-nums">
                {formatNumber(activeHoverPoint.uv)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3.5 border-t border-[#F2F2F7] flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#6E6E73]">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0071E3]" />
            页面浏览量 (PV)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#34C759]" />
            独立访客数 (UV)
          </span>
        </div>
        <span className="tabular-nums">鼠标悬停图表节点可查看精确时段数据</span>
      </div>
    </div>
  );
}
