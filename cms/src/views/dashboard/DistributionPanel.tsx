import { formatNumber } from '../../lib/format.ts';
import type { ModuleKey } from '../../types/cms.ts';

interface Segment {
  key: 'videos' | 'imagetexts' | 'articles';
  label: string;
  views: number;
  count: number;
  published: number;
  color: string;
  percentage: number;
  dashArray: string;
  dashOffset: number;
}

interface DistributionPanelProps {
  total: number;
  segments: Segment[];
  hovered: ModuleKey | null;
  onHover: (key: 'videos' | 'imagetexts' | 'articles' | null) => void;
  onNavigate: (module: ModuleKey) => void;
}

/** 浏览分布：环形图 + 明细列表，可按模块跳转 */
export function DistributionPanel({
  total,
  segments,
  hovered,
  onHover,
  onNavigate,
}: DistributionPanelProps) {
  const focused = hovered ? segments.find((s) => s.key === hovered) : null;

  return (
    <div className="h-full bg-white rounded-[18px] border border-[#E5E5EA] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
      <div>
        <h2 className="text-[17px] font-semibold tracking-tight text-[#1D1D1F]">浏览分布</h2>
        <p className="text-[13px] text-[#6E6E73] mt-0.5">按视频、图文、文章累计消费占比统计</p>
      </div>

      <div className="my-5 flex items-center justify-center">
        <div className="relative w-[164px] h-[164px]">
          <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
            <circle cx="70" cy="70" r="56" fill="none" stroke="#F2F2F7" strokeWidth="14" />
            {segments.map((seg) => (
              <circle
                key={seg.key}
                cx="70"
                cy="70"
                r="56"
                fill="none"
                stroke={seg.color}
                strokeWidth={hovered === seg.key ? '17' : '14'}
                strokeDasharray={seg.dashArray}
                strokeDashoffset={seg.dashOffset}
                strokeLinecap="butt"
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => onHover(seg.key)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onNavigate(seg.key)}
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
            <span className="text-[11px] text-[#86868B]">
              {focused ? focused.label : '累计总阅读'}
            </span>
            <span className="text-[22px] font-semibold tracking-tight text-[#1D1D1F] tabular-nums mt-0.5">
              {formatNumber(focused ? focused.views : total)}
            </span>
            {focused && (
              <span className="text-[11px] font-medium text-[#0071E3] tabular-nums">
                占比 {focused.percentage}%
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {segments.map((seg) => (
          <button
            key={seg.key}
            type="button"
            onMouseEnter={() => onHover(seg.key)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onNavigate(seg.key)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left ${
              hovered === seg.key ? 'bg-[#F5F5F7]' : 'hover:bg-[#F5F5F7]'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: seg.color }}
              />
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-[#1D1D1F]">{seg.label}</div>
                <div className="text-[11px] text-[#86868B] tabular-nums">
                  共 {seg.count} 项 · 已发布 {seg.published} 项
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[13px] font-semibold text-[#1D1D1F] tabular-nums">
                {formatNumber(seg.views)}
              </div>
              <div className="text-[11px] text-[#6E6E73] tabular-nums">{seg.percentage}%</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
