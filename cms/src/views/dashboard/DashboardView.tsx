import { useState } from 'react';
import { Database, FileArchive, Loader2 } from 'lucide-react';
import { api } from '../../lib/api.ts';
import { showToast } from '../../components/AppToast.tsx';
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

type ExportKind = 'database' | 'files';

/** 首页仪表盘：数据导出、我发布的内容、模块导航、访客统计与最近访问记录 */
export function DashboardView({ onNavigate, permissions, myCounts }: DashboardViewProps) {
  const [hoveredModule, setHoveredModule] = useState<'videos' | 'imagetexts' | 'articles' | null>(
    null
  );
  const [exporting, setExporting] = useState<ExportKind | null>(null);

  const { data, loading, moduleBreakdown } = useDashboardData();

  if (loading || !data) {
    return <DashboardSkeleton />;
  }

  async function handleExport(kind: ExportKind) {
    if (exporting) return;
    setExporting(kind);
    try {
      if (kind === 'database') {
        await api.exportDatabase();
        showToast('数据库备份已开始下载', 'success');
      } else {
        await api.exportFiles();
        showToast('文件资源包已开始下载', 'success');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : '导出失败', 'danger');
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[18px] border border-[#E5E5EA] bg-white px-5 py-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-[#1D1D1F]">数据导出</h2>
            <p className="mt-1 text-[12px] leading-5 text-[#86868B]">
              备份数据库 SQL，或将系统文件中心「用户文件」按图片、视频、音频、文档、压缩包、字体、其他分类打包下载
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleExport('database')}
              disabled={!!exporting}
              className="h-9 px-4 rounded-xl border border-[#D2D2D7] bg-white text-[#1D1D1F] text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-[#F5F5F7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting === 'database' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" strokeWidth={1.8} />
              )}
              导出数据库
            </button>
            <button
              type="button"
              onClick={() => void handleExport('files')}
              disabled={!!exporting}
              className="h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {exporting === 'files' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileArchive className="w-4 h-4" strokeWidth={1.8} />
              )}
              导出文件资源
            </button>
          </div>
        </div>
      </section>

      <MyContentPanel counts={myCounts} onNavigate={onNavigate} />

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ModuleFlowPanel onNavigate={onNavigate} permissions={permissions} />
        <DistributionPanel
          total={moduleBreakdown.total}
          segments={moduleBreakdown.segments}
          hovered={hoveredModule}
          onHover={setHoveredModule}
          onNavigate={onNavigate}
        />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-stretch">
        <VisitorStatsTable snapshot={data.snapshot} periodStats={data.periodStats} />
        <RecentVisits visits={data.latestVisits ?? []} />
      </section>
    </div>
  );
}
