import { useState } from 'react';
import type { ModuleKey } from '../../types/cms.ts';
import { VisitorStatsTable } from './VisitorStatsTable';
import { MyContentPanel } from './MyContentPanel';
import { RecentVisits } from './RecentVisits';
import { ModuleFlowPanel } from './ModuleFlowPanel';
import { DistributionPanel } from './DistributionPanel';
import { DashboardSkeleton } from './DashboardSkeleton';
import { useDashboardData } from './useDashboardData';

interface DashboardViewProps {
  onNavigate: (module: ModuleKey) => void;
  permissions: string[];
  myCounts: { videos: number; imagetexts: number; articles: number };
}

/** 首页仪表盘：我发布的内容、模块导航、访客统计与最近访问记录 */
export function DashboardView({ onNavigate, permissions, myCounts }: DashboardViewProps) {
  const [hoveredModule, setHoveredModule] = useState<'videos' | 'imagetexts' | 'articles' | null>(
    null
  );

  const { data, loading, moduleBreakdown } = useDashboardData();

  if (loading || !data) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        <ModuleFlowPanel onNavigate={onNavigate} permissions={permissions} />
        <DistributionPanel
          total={moduleBreakdown.total}
          segments={moduleBreakdown.segments}
          hovered={hoveredModule}
          onHover={setHoveredModule}
          onNavigate={onNavigate}
        />
        <MyContentPanel counts={myCounts} onNavigate={onNavigate} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch">
        <VisitorStatsTable snapshot={data.snapshot} periodStats={data.periodStats} />
        <RecentVisits visits={data.latestVisits ?? []} />
      </section>
    </div>
  );
}
