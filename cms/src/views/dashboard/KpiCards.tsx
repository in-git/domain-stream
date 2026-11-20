import { Clock, Eye, Users } from 'lucide-react';
import { formatNumber, formatReadableDuration } from '../../lib/format.ts';
import type { DashboardPayload } from '../../types/cms.ts';
import { buildSmoothPath } from './chartUtils';

const CARD_CLASS =
  'bg-white rounded-[18px] border border-[#E5E5EA] p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)]';

/** 实时在线访客数卡片，附最近实时序列的迷你折线 */
function OnlineCard({
  onlineNow,
  spark,
  connected,
}: {
  onlineNow: number;
  spark: Array<{ uv: number }>;
  connected: boolean;
}) {
  const sparkMax = Math.max(...spark.map((p) => p.uv), 1);
  const sparkMin = Math.min(...spark.map((p) => p.uv), 0);

  return (
    <div className={CARD_CLASS}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-[#6E6E73]">当前在线访客</span>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#1D1D1F]">
          {connected && (
            <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" aria-hidden="true" />
          )}
          <span className={connected ? 'text-[#16A34A]' : 'text-[#86868B]'}>
            {connected ? '实时同步中' : '静态快照'}
          </span>
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="text-[34px] leading-none font-semibold tracking-tight text-[#1D1D1F] tabular-nums">
          {formatNumber(onlineNow)}
        </div>
        <svg
          width="88"
          height="30"
          viewBox="0 0 88 30"
          className="overflow-visible shrink-0"
          aria-hidden="true"
        >
          <path
            d={buildSmoothPath(
              spark.map((pt, i) => {
                const x = (i / Math.max(1, spark.length - 1)) * 88;
                const norm = sparkMax === sparkMin ? 0.5 : (pt.uv - sparkMin) / (sparkMax - sparkMin);
                const y = 26 - norm * 22;
                return { x, y };
              })
            )}
            fill="none"
            stroke="#34C759"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <div className="mt-3 text-[12px] text-[#86868B] tabular-nums">
        每 3 秒自动推送最新在线会话
      </div>
    </div>
  );
}

/** 四张实时访客 KPI 卡片 */
export function KpiCards({
  snapshot,
  realtimeSeries,
  connected,
}: {
  snapshot: DashboardPayload['snapshot'];
  realtimeSeries: Array<{ uv: number }>;
  connected: boolean;
}) {
  return (
    <section
      aria-label="实时访客概览"
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
    >
      <OnlineCard onlineNow={snapshot.onlineNow} spark={realtimeSeries.slice(-14)} connected={connected} />

      <div className={CARD_CLASS}>
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-[#6E6E73]">今日独立访客 (UV)</span>
          <Users className="w-4 h-4 text-[#0071E3]" strokeWidth={1.8} />
        </div>
        <div className="mt-3 text-[34px] leading-none font-semibold tracking-tight text-[#1D1D1F] tabular-nums">
          {formatNumber(snapshot.todayUV)}
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[12px]">
          <span className="text-[#16A34A] font-medium tabular-nums">+{snapshot.uvGrowthPercent}%</span>
          <span className="text-[#86868B]">较昨日同时段</span>
        </div>
      </div>

      <div className={CARD_CLASS}>
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-[#6E6E73]">今日总浏览量 (PV)</span>
          <Eye className="w-4 h-4 text-[#5856D6]" strokeWidth={1.8} />
        </div>
        <div className="mt-3 text-[34px] leading-none font-semibold tracking-tight text-[#1D1D1F] tabular-nums">
          {formatNumber(snapshot.todayPV)}
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[12px]">
          <span className="text-[#16A34A] font-medium tabular-nums">+{snapshot.pvGrowthPercent}%</span>
          <span className="text-[#86868B]">
            人均浏览 {(snapshot.todayPV / Math.max(1, snapshot.todayUV)).toFixed(1)} 页
          </span>
        </div>
      </div>

      <div className={CARD_CLASS}>
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium text-[#6E6E73]">平均停留时长</span>
          <Clock className="w-4 h-4 text-[#FF9500]" strokeWidth={1.8} />
        </div>
        <div className="mt-3 text-[30px] leading-none font-semibold tracking-tight text-[#1D1D1F] tabular-nums">
          {formatReadableDuration(snapshot.avgDurationSec)}
        </div>
        <div className="mt-3 flex items-center gap-2 text-[12px] text-[#86868B] tabular-nums">
          <span>深度互动率 {snapshot.engagementRate}%</span>
          <span aria-hidden="true">·</span>
          <span>跳出率 24.6%</span>
        </div>
      </div>
    </section>
  );
}
