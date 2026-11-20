import { useMemo, useState } from 'react';
import type { ModuleKey } from '../../types/cms.ts';
import { KpiCards } from './KpiCards';
import { TrafficChart } from './TrafficChart';
import { ModuleFlowPanel } from './ModuleFlowPanel';
import { DistributionPanel } from './DistributionPanel';
import { SourcesPanel } from './SourcesPanel';
import { DashboardSkeleton } from './DashboardSkeleton';
import { useDashboardData } from './useDashboardData';
import { type MetricMode, type RangeKey } from './chartUtils';

interface DashboardViewProps {
  onNavigate: (module: ModuleKey) => void;
  permissions: string[];
  liveRefreshEnabled: boolean;
}

/** 首页仪表盘：组合 KPI、流量图、导航图、浏览分布与来源终端 */
export function DashboardView({ onNavigate, permissions, liveRefreshEnabled }: DashboardViewProps) {
  const [range, setRange] = useState<RangeKey>('realtime');
  const [metricMode, setMetricMode] = useState<MetricMode>('both');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [hoveredModule, setHoveredModule] = useState<'videos' | 'imagetexts' | 'articles' | null>(
    null
  );

  const { data, loading, sseConnected, moduleBreakdown } = useDashboardData(liveRefreshEnabled);

  const activeSeries = useMemo(() => (data ? data.series[range] : []), [data, range]);

  if (loading || !data) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <KpiCards
        snapshot={data.snapshot}
        realtimeSeries={data.series.realtime}
        connected={sseConnected}
      />

      <section className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        <TrafficChart
          series={activeSeries}
          range={range}
          metricMode={metricMode}
          hoverIdx={hoverIdx}
          onRangeChange={(next) => {
            setRange(next);
            setHoverIdx(null);
          }}
          onMetricChange={setMetricMode}
          onHoverChange={setHoverIdx}
        />
        <ModuleFlowPanel onNavigate={onNavigate} permissions={permissions} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DistributionPanel
          total={moduleBreakdown.total}
          segments={moduleBreakdown.segments}
          hovered={hoveredModule}
          onHover={setHoveredModule}
          onNavigate={onNavigate}
        />
        <SourcesPanel sources={data.sources} snapshot={data.snapshot} />
      </section>
    </div>
  );
}
