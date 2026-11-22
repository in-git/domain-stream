import { formatNumber } from '../../lib/format.ts';
import type { DashboardPayload, PeriodStats } from '../../types/cms.ts';

/** 访客数据概览：左侧当前在线人数 + 右侧合并统计表（今日/昨日/本周/本月/本年） */
export function VisitorStatsTable({
  snapshot,
  periodStats,
}: {
  snapshot: DashboardPayload['snapshot'];
  periodStats?: PeriodStats;
}) {
  const rows = [
    {
      label: '今日',
      pv: snapshot.todayPV ?? 0,
      uv: snapshot.todayUV ?? 0,
      ip: snapshot.todayIP ?? 0,
    },
    {
      label: '昨日',
      pv: snapshot.yesterdayPV ?? 0,
      uv: snapshot.yesterdayUV ?? 0,
      ip: snapshot.yesterdayIP ?? 0,
    },
    {
      label: '本周',
      pv: periodStats?.week?.pv ?? 0,
      uv: periodStats?.week?.uv ?? 0,
      ip: periodStats?.week?.ip ?? 0,
    },
    {
      label: '本月',
      pv: periodStats?.month?.pv ?? 0,
      uv: periodStats?.month?.uv ?? 0,
      ip: periodStats?.month?.ip ?? 0,
    },
    {
      label: '本年',
      pv: periodStats?.year?.pv ?? 0,
      uv: periodStats?.year?.uv ?? 0,
      ip: periodStats?.year?.ip ?? 0,
    },
  ];

  return (
    <section className="bg-white rounded-[18px] border border-[#E5E5EA] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5EA]">
        <h2 className="text-[15px] font-semibold text-[#1D1D1F]">访客数据概览</h2>
        <span className="text-[12px] text-[#86868B]">浏览量 · 访客数 · IP 数</span>
      </div>

      {/* 当前在线人数：模块顶部居中（截图样式） */}
      <div className="flex flex-col items-center justify-center border-b border-[#E5E5EA] px-5 py-6">
        <div className="text-[12px] text-[#AEAEB2] tabular-nums">
          {snapshot.updatedAt || ''}
        </div>
        <div className="my-2 text-[56px] leading-none font-semibold tracking-tight text-[#1D1D1F] tabular-nums">
          {formatNumber(snapshot.onlineNow ?? 0)}
        </div>
        <div className="text-[13px] text-[#86868B]">在线访客数</div>
      </div>

      {/* 合并统计表 */}
      <div className="flex-1 min-h-0 overflow-x-auto">
          <table className="w-full min-w-[420px]">
            <thead>
              <tr className="border-b border-[#E5E5EA] bg-[#FAFAFC]">
                <th className="w-24 px-5 py-3 text-left text-[12px] font-medium text-[#86868B]">周期</th>
                <th className="px-5 py-3 text-center text-[12px] font-medium text-[#86868B]">浏览量(PV)</th>
                <th className="px-5 py-3 text-center text-[12px] font-medium text-[#86868B]">访客数(UV)</th>
                <th className="px-5 py-3 text-center text-[12px] font-medium text-[#86868B]">IP数</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.label}
                  className={`border-b border-[#F0F0F2] last:border-b-0 ${
                    idx === 0 ? 'bg-white' : ''
                  }`}
                >
                  <td className="px-5 py-2.5 text-[13px] text-[#6E6E73]">{row.label}</td>
                  <td className="px-5 py-2.5 text-center text-[15px] font-semibold text-[#1D1D1F] tabular-nums">
                    {formatNumber(row.pv)}
                  </td>
                  <td className="px-5 py-2.5 text-center text-[15px] font-semibold text-[#1D1D1F] tabular-nums">
                    {formatNumber(row.uv)}
                  </td>
                  <td className="px-5 py-2.5 text-center text-[15px] font-semibold text-[#1D1D1F] tabular-nums">
                    {formatNumber(row.ip)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>
    </section>
  );
}
