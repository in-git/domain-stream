import { Monitor, Smartphone } from 'lucide-react';
import { formatNumber } from '../../lib/format.ts';
import type { DashboardPayload } from '../../types/cms.ts';

/** 来源渠道与终端设备占比面板 */
export function SourcesPanel({
  sources,
  snapshot,
}: {
  sources: DashboardPayload['sources'];
  snapshot: DashboardPayload['snapshot'];
}) {
  return (
    <div className="bg-white rounded-[18px] border border-[#E5E5EA] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
      <div>
        <h2 className="text-[17px] font-semibold tracking-tight text-[#1D1D1F]">来源与终端</h2>
        <p className="text-[13px] text-[#6E6E73] mt-0.5">今日访问渠道与设备比例</p>

        <div className="mt-5 space-y-4">
          {sources.map((src) => (
            <div key={src.name}>
              <div className="flex items-center justify-between text-[13px] mb-1.5">
                <span className="text-[#1D1D1F] font-medium">{src.name}</span>
                <span className="text-[#6E6E73] tabular-nums">
                  {formatNumber(src.visits)} · {src.percentage}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#F2F2F7] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#0071E3] transition-all duration-300"
                  style={{ width: `${src.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-[#F2F2F7]">
        <div className="flex items-center justify-between text-[13px] mb-2">
          <span className="flex items-center gap-1.5 font-medium text-[#1D1D1F]">
            <Smartphone className="w-4 h-4 text-[#0071E3]" />
            移动端 <span className="tabular-nums">{snapshot.mobileSharePercent}%</span>
          </span>
          <span className="flex items-center gap-1.5 font-medium text-[#1D1D1F]">
            <Monitor className="w-4 h-4 text-[#5856D6]" />
            桌面端 <span className="tabular-nums">{snapshot.desktopSharePercent}%</span>
          </span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden flex bg-[#F2F2F7]">
          <div className="h-full bg-[#0071E3]" style={{ width: `${snapshot.mobileSharePercent}%` }} />
          <div className="h-full bg-[#5856D6]" style={{ width: `${snapshot.desktopSharePercent}%` }} />
        </div>
      </div>
    </div>
  );
}
