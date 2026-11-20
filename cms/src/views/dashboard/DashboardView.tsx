import { useEffect, useMemo, useState } from 'react';
import { Clock, Eye, Monitor, Smartphone, Users } from 'lucide-react';
import { api } from '../../lib/api.ts';
import { formatNumber, formatReadableDuration } from '../../lib/format.ts';
import { hasModulePerm } from '../../lib/menu.ts';
import type { DashboardPayload, ModuleKey, TrafficPoint } from '../../types/cms.ts';
import ModuleFlowChart, {
  type FlowChartEdge,
  type FlowChartGroup,
  type FlowChartNode,
} from '../../components/ModuleFlowChart.tsx';

interface DashboardViewProps {
  onNavigate: (module: ModuleKey) => void;
  permissions: string[];
  liveRefreshEnabled: boolean;
}

/** 首页导航图：节点点击跳转到对应模块 */
function ModuleFlowPanel({
  onNavigate,
  permissions,
}: {
  onNavigate: (module: ModuleKey) => void;
  permissions: string[];
}) {
  const can = (module: ModuleKey) => hasModulePerm(module, 'Detail', permissions);
  // 文件中心 / 素材中心为后加模块：若后端未配置对应按钮码，按“菜单可见即允许”处理
  const canLoose = (module: 'files' | 'materials', prefix: string) =>
    !permissions.some((code) => code.startsWith(prefix)) || can(module);

  const contents = [
    { id: 'videos' as const, label: '视频', color: '#0071E3' },
    { id: 'imagetexts' as const, label: '图文', color: '#1D9E5F' },
    { id: 'articles' as const, label: '文章', color: '#5E5CE6' },
  ].filter((item) => can(item.id));
  const showCategory = can('category');
  const showFiles = canLoose('files', 'bizFile');
  const showMaterials = canLoose('materials', 'bizMaterial');
  const showMessages = can('messages');

  const groups: FlowChartGroup[] = [];
  const nodes: FlowChartNode[] = [];
  const edges: FlowChartEdge[] = [];

  // 横向三列布局：基础数据（左） → 内容（中） → 产出与互动（右）
  const COL_W = 164;
  const COL_GAP = 52;
  const COL_Y = 10;
  const COL_H = 248;
  const colX = (index: number) => 8 + index * (COL_W + COL_GAP);

  // 左列：通用分类（视频/图文/文章共用）与素材中心（用户主动上传、供内容备用）
  const inputNodes: FlowChartNode[] = [];
  if (showCategory) {
    inputNodes.push({
      id: 'category',
      label: '通用分类',
      x: colX(0) + 10,
      y: 46,
      width: COL_W - 20,
      height: 56,
      color: '#0071E3',
      primary: true,
      icon: '分',
      onClick: () => onNavigate('category'),
    });
  }
  if (showMaterials) {
    inputNodes.push({
      id: 'materials',
      label: '素材中心',
      x: colX(0) + 10,
      y: 150,
      width: COL_W - 20,
      height: 56,
      color: '#1D9E5F',
      icon: '素',
      onClick: () => onNavigate('materials'),
    });
  }

  // 中列：视频 / 图文 / 文章纵向排列，彼此之间不画连线
  const contentNodes: FlowChartNode[] = contents.map((item, index) => ({
    id: item.id,
    label: item.label,
    x: colX(1) + 10,
    y: 26 + index * 78,
    width: COL_W - 20,
    height: 56,
    color: item.color,
    onClick: () => onNavigate(item.id),
  }));

  // 右列：上传视频、图片时产生的文件
  const outputNode: FlowChartNode | null = showFiles
    ? {
        id: 'files',
        label: '文件中心',
        x: colX(2) + 10,
        y: 46,
        width: COL_W - 20,
        height: 56,
        color: '#3478C0',
        icon: '文',
        onClick: () => onNavigate('files'),
      }
    : null;

  if (inputNodes.length) {
    groups.push({
      x: colX(0),
      y: COL_Y,
      width: COL_W,
      height: COL_H,
      fill: '#F5F8FF',
      stroke: '#E6EDFB',
    });
  }
  if (contentNodes.length) {
    groups.push({
      x: colX(1),
      y: COL_Y,
      width: COL_W,
      height: COL_H,
      fill: '#FAFAFC',
      stroke: '#EDEDF1',
    });
  }
  if (outputNode || showMessages) {
    groups.push({
      x: colX(2),
      y: COL_Y,
      width: COL_W,
      height: COL_H,
      fill: '#F5FBF7',
      stroke: '#E4F3E9',
    });
  }

  nodes.push(...inputNodes, ...contentNodes);
  if (outputNode) nodes.push(outputNode);

  // 分类与素材为内容提供公共分类与备用素材；上传内容后沉淀为文件
  inputNodes.forEach((src) => {
    contentNodes.forEach((dst) => edges.push({ from: src.id, to: dst.id }));
  });
  if (outputNode) {
    contentNodes.forEach((src) => edges.push({ from: src.id, to: outputNode!.id }));
  }

  // 留言为独立的留言板功能，与内容之间没有连线
  if (showMessages) {
    nodes.push({
      id: 'messages',
      label: '留言',
      x: colX(2) + 10,
      y: 150,
      width: COL_W - 20,
      height: 56,
      color: '#8E8E93',
      dashed: true,
      icon: '留',
      onClick: () => onNavigate('messages'),
    });
  }

  if (nodes.length === 0) return null;

  // 画布高度同时取决于节点与分组，避免分组底板被裁切
  const canvasHeight =
    Math.max(
      ...nodes.map((n) => n.y + (n.height ?? 64)),
      ...groups.map((g) => g.y + g.height),
      120
    ) + 20;

  return (
    <section aria-label="导航" className="h-full lg:col-span-1 xl:col-span-2">
      <h2 className="mb-3 text-[17px] font-semibold tracking-tight text-[#1D1D1F]">导航</h2>
      <ModuleFlowChart
        nodes={nodes}
        edges={edges}
        groups={groups}
        width={612}
        height={canvasHeight}
        minZoom={0.4}
      />
    </section>
  );
}

type RangeKey = 'realtime' | 'week' | 'month';
type MetricMode = 'both' | 'uv' | 'pv';

function buildSmoothPath(points: Array<{ x: number; y: number }>): string {
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

export function DashboardView({
  onNavigate,
  permissions,
  liveRefreshEnabled,
}: DashboardViewProps) {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<RangeKey>('realtime');
  const [metricMode, setMetricMode] = useState<MetricMode>('both');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [hoveredModule, setHoveredModule] = useState<'videos' | 'imagetexts' | 'articles' | null>(null);
  const [sseConnected, setSseConnected] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .getDashboard()
      .then((res) => {
        if (active) setData(res);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!liveRefreshEnabled) {
      setSseConnected(false);
      return;
    }

    let active = true;
    const refresh = () => {
      api
        .getLiveSnapshot()
        .then((msg) => {
          if (!active) return;
          setSseConnected(true);
          setData((prev) => {
            if (!prev) return prev;
            const nextWeek = prev.series.week.map((pt, idx, arr) =>
              idx === arr.length - 1 ? { ...pt, uv: msg.todayUV, pv: msg.todayPV } : pt
            );
            const nextMonth = prev.series.month.map((pt, idx, arr) =>
              idx === arr.length - 1 ? { ...pt, uv: msg.todayUV, pv: msg.todayPV } : pt
            );
            const now = new Date();
            const latestPoint: TrafficPoint = {
              label: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
              uv: msg.onlineNow,
              pv: msg.todayPV,
              avgStaySec: msg.avgDurationSec,
            };
            return {
              ...prev,
              snapshot: {
                ...prev.snapshot,
                onlineNow: msg.onlineNow,
                todayPV: msg.todayPV,
                todayUV: msg.todayUV,
                avgDurationSec: msg.avgDurationSec,
                engagementRate: msg.engagementRate,
                updatedAt: msg.updatedAt,
              },
              series: {
                realtime: [...prev.series.realtime.slice(1), latestPoint],
                week: nextWeek,
                month: nextMonth,
              },
            };
          });
        })
        .catch(() => {
          if (active) setSseConnected(false);
        });
    };

    refresh();
    const timer = window.setInterval(refresh, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
      setSseConnected(false);
    };
  }, [liveRefreshEnabled]);

  const activeSeries = useMemo(() => {
    if (!data) return [];
    return data.series[range];
  }, [data, range]);

  // SVG Chart Geometry
  const chartGeom = useMemo(() => {
    const W = 720;
    const H = 250;
    const padL = 48;
    const padR = 18;
    const padT = 18;
    const padB = 30;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;

    if (activeSeries.length === 0) {
      return { W, H, padL, padR, padT, padB, plotW, plotH, maxVal: 100, uvPts: [], pvPts: [], uvPath: '', pvPath: '', pvArea: '', uvArea: '', yTicks: [0, 50, 100] };
    }

    const values: number[] = [];
    for (const pt of activeSeries) {
      if (metricMode === 'uv' || metricMode === 'both') values.push(pt.uv);
      if (metricMode === 'pv' || metricMode === 'both') values.push(pt.pv);
    }
    const rawMax = Math.max(...values, 10);
    const maxVal = Math.ceil((rawMax * 1.15) / 10) * 10;

    const xFor = (i: number) =>
      activeSeries.length === 1
        ? padL + plotW / 2
        : padL + (i / (activeSeries.length - 1)) * plotW;
    const yFor = (val: number) => padT + plotH - (val / maxVal) * plotH;

    const uvPts = activeSeries.map((pt, i) => ({ x: xFor(i), y: yFor(pt.uv) }));
    const pvPts = activeSeries.map((pt, i) => ({ x: xFor(i), y: yFor(pt.pv) }));

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
  }, [activeSeries, metricMode]);

  // Donut Geometry for Module Distribution
  const moduleBreakdown = useMemo(() => {
    if (!data) return { total: 0, segments: [] };
    const { videos, imagetexts, articles } = data.moduleStats;
    const total = Math.max(1, videos.totalViews + imagetexts.totalViews + articles.totalViews);
    const raw = [
      {
        key: 'videos' as const,
        label: '视频管理',
        views: videos.totalViews,
        count: videos.count,
        published: videos.published,
        color: '#0071E3',
      },
      {
        key: 'imagetexts' as const,
        label: '图文管理',
        views: imagetexts.totalViews,
        count: imagetexts.count,
        published: imagetexts.published,
        color: '#34C759',
      },
      {
        key: 'articles' as const,
        label: '文章管理',
        views: articles.totalViews,
        count: articles.count,
        published: articles.published,
        color: '#5856D6',
      },
    ];

    const circumference = 2 * Math.PI * 56;
    let offsetAcc = 0;
    const segments = raw.map((item) => {
      const ratio = item.views / total;
      const dash = ratio * circumference;
      const seg = {
        ...item,
        percentage: Math.round(ratio * 100),
        dashArray: `${dash} ${circumference - dash}`,
        dashOffset: -offsetAcc,
      };
      offsetAcc += dash;
      return seg;
    });

    return {
      total: videos.totalViews + imagetexts.totalViews + articles.totalViews,
      segments,
    };
  }, [data]);

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-[132px] bg-white rounded-[18px] border border-[#E5E5EA] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 h-[360px] bg-white rounded-[18px] border border-[#E5E5EA] animate-pulse" />
          <div className="h-[360px] bg-white rounded-[18px] border border-[#E5E5EA] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-[360px] bg-white rounded-[18px] border border-[#E5E5EA] animate-pulse" />
          <div className="h-[360px] bg-white rounded-[18px] border border-[#E5E5EA] animate-pulse" />
        </div>
      </div>
    );
  }

  const { snapshot } = data;
  const liveSpark = data.series.realtime.slice(-14);
  const sparkMax = Math.max(...liveSpark.map((p) => p.uv), 1);
  const sparkMin = Math.min(...liveSpark.map((p) => p.uv), 0);

  const activeHoverPoint =
    hoverIdx !== null && activeSeries[hoverIdx] ? activeSeries[hoverIdx] : null;
  const focusedSegment = hoveredModule
    ? moduleBreakdown.segments.find((s) => s.key === hoveredModule)
    : null;

  return (
    <div className="space-y-6">
      {/* KPI Strip: Real-time Visitor & Engagement Metrics */}
      <section aria-label="实时访客概览" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: Real-time Online Visitors */}
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#6E6E73]">当前在线访客</span>
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#1D1D1F]">
              {sseConnected && (
                <span className="w-2 h-2 rounded-full bg-[#34C759] animate-pulse" aria-hidden="true" />
              )}
              <span className={sseConnected ? 'text-[#16A34A]' : 'text-[#86868B]'}>
                {sseConnected ? '实时同步中' : '静态快照'}
              </span>
            </span>
          </div>

          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="text-[34px] leading-none font-semibold tracking-tight text-[#1D1D1F] tabular-nums">
              {formatNumber(snapshot.onlineNow)}
            </div>
            {/* Live Sparkline */}
            <svg width="88" height="30" viewBox="0 0 88 30" className="overflow-visible shrink-0" aria-hidden="true">
              <path
                d={buildSmoothPath(
                  liveSpark.map((pt, i) => {
                    const x = (i / Math.max(1, liveSpark.length - 1)) * 88;
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

        {/* Card 2: Today's UV */}
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
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

        {/* Card 3: Today's PV */}
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#6E6E73]">今日总浏览量 (PV)</span>
            <Eye className="w-4 h-4 text-[#5856D6]" strokeWidth={1.8} />
          </div>
          <div className="mt-3 text-[34px] leading-none font-semibold tracking-tight text-[#1D1D1F] tabular-nums">
            {formatNumber(snapshot.todayPV)}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[12px]">
            <span className="text-[#16A34A] font-medium tabular-nums">+{snapshot.pvGrowthPercent}%</span>
            <span className="text-[#86868B]">人均浏览 {(snapshot.todayPV / Math.max(1, snapshot.todayUV)).toFixed(1)} 页</span>
          </div>
        </div>

        {/* Card 4: Avg Duration */}
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] p-5 flex flex-col justify-between shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
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

      {/* Main Visualization Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-5">
        {/* Visitor Trend Chart */}
        <div className="lg:col-span-2 xl:col-span-3 bg-white rounded-[18px] border border-[#E5E5EA] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-[17px] font-semibold tracking-tight text-[#1D1D1F]">
                访客流量
              </h2>
              <p className="text-[13px] text-[#6E6E73] mt-0.5">
                {range === 'realtime'
                  ? '最近时段在线会话与页面浏览实时波动'
                  : range === 'week'
                    ? '过去 7 日独立访客与浏览总量走势'
                    : '过去 14 日站点访问增长曲线'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center p-0.5 bg-[#F2F2F7] rounded-[10px]" role="tablist" aria-label="指标筛选">
                {(
                  [
                    { key: 'both', label: '双指标' },
                    { key: 'uv', label: 'UV' },
                    { key: 'pv', label: 'PV' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setMetricMode(m.key)}
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
                {(
                  [
                    { key: 'realtime', label: '实时' },
                    { key: 'week', label: '近 7 天' },
                    { key: 'month', label: '近 30 天' },
                  ] as const
                ).map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => {
                      setRange(r.key);
                      setHoverIdx(null);
                    }}
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

          {/* Interactive SVG Area Chart */}
          <div className="relative w-full">
            <svg
              viewBox={`0 0 ${chartGeom.W} ${chartGeom.H}`}
              className="w-full h-[250px] overflow-visible select-none"
              onMouseLeave={() => setHoverIdx(null)}
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

              {/* Y-Axis Gridlines */}
              {chartGeom.yTicks.map((tick) => {
                const y =
                  chartGeom.padT +
                  chartGeom.plotH -
                  (tick / Math.max(1, chartGeom.maxVal)) * chartGeom.plotH;
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

              {/* PV Area & Line */}
              {(metricMode === 'pv' || metricMode === 'both') && (
                <>
                  <path d={chartGeom.pvArea} fill="url(#pvGrad)" />
                  <path
                    d={chartGeom.pvPath}
                    fill="none"
                    stroke="#0071E3"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                  />
                </>
              )}

              {/* UV Area & Line */}
              {(metricMode === 'uv' || metricMode === 'both') && (
                <>
                  <path d={chartGeom.uvArea} fill="url(#uvGrad)" />
                  <path
                    d={chartGeom.uvPath}
                    fill="none"
                    stroke="#34C759"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                  />
                </>
              )}

              {/* X-Axis Labels */}
              {activeSeries.map((pt, i) => {
                const step = activeSeries.length > 12 ? 3 : activeSeries.length > 8 ? 2 : 1;
                if (i % step !== 0 && i !== activeSeries.length - 1) return null;
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

              {/* Hover Crosshair & Active Dots */}
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
                  {(metricMode === 'pv' || metricMode === 'both') && chartGeom.pvPts[hoverIdx] && (
                    <circle
                      cx={chartGeom.pvPts[hoverIdx].x}
                      cy={chartGeom.pvPts[hoverIdx].y}
                      r="4.5"
                      fill="#0071E3"
                      stroke="#FFFFFF"
                      strokeWidth="2"
                    />
                  )}
                  {(metricMode === 'uv' || metricMode === 'both') && (
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

              {/* Invisible Hit Columns */}
              {activeSeries.map((_, i) => {
                const colW = chartGeom.plotW / Math.max(1, activeSeries.length);
                const x = (chartGeom.uvPts[i]?.x ?? 0) - colW / 2;
                return (
                  <rect
                    key={i}
                    x={x}
                    y={chartGeom.padT}
                    width={colW}
                    height={chartGeom.plotH}
                    fill="transparent"
                    onMouseEnter={() => setHoverIdx(i)}
                  />
                );
              })}
            </svg>

            {/* Floating Hover Tooltip */}
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

        {/* 导航：模块关系导览 */}
        <ModuleFlowPanel onNavigate={onNavigate} permissions={permissions} />
      </section>

      {/* 下排：浏览分布 与 来源终端 */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Content Distribution Donut Chart */}
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-[#1D1D1F]">
              浏览分布
            </h2>
            <p className="text-[13px] text-[#6E6E73] mt-0.5">
              按视频、图文、文章累计消费占比统计
            </p>
          </div>

          <div className="my-5 flex items-center justify-center">
            <div className="relative w-[164px] h-[164px]">
              <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
                <circle
                  cx="70"
                  cy="70"
                  r="56"
                  fill="none"
                  stroke="#F2F2F7"
                  strokeWidth="14"
                />
                {moduleBreakdown.segments.map((seg) => (
                  <circle
                    key={seg.key}
                    cx="70"
                    cy="70"
                    r="56"
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={hoveredModule === seg.key ? '17' : '14'}
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset={seg.dashOffset}
                    strokeLinecap="butt"
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredModule(seg.key)}
                    onMouseLeave={() => setHoveredModule(null)}
                    onClick={() => onNavigate(seg.key)}
                  />
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                <span className="text-[11px] text-[#86868B]">
                  {focusedSegment ? focusedSegment.label : '累计总阅读'}
                </span>
                <span className="text-[22px] font-semibold tracking-tight text-[#1D1D1F] tabular-nums mt-0.5">
                  {formatNumber(focusedSegment ? focusedSegment.views : moduleBreakdown.total)}
                </span>
                {focusedSegment && (
                  <span className="text-[11px] font-medium text-[#0071E3] tabular-nums">
                    占比 {focusedSegment.percentage}%
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {moduleBreakdown.segments.map((seg) => (
              <button
                key={seg.key}
                type="button"
                onMouseEnter={() => setHoveredModule(seg.key)}
                onMouseLeave={() => setHoveredModule(null)}
                onClick={() => onNavigate(seg.key)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl transition-colors text-left ${
                  hoveredModule === seg.key ? 'bg-[#F5F5F7]' : 'hover:bg-[#F5F5F7]'
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
                  <div className="text-[11px] text-[#6E6E73] tabular-nums">
                    {seg.percentage}%
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Traffic Sources & Device Breakdown */}
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-[#1D1D1F]">
              来源与终端
            </h2>
            <p className="text-[13px] text-[#6E6E73] mt-0.5">
              今日访问渠道与设备比例
            </p>

            <div className="mt-5 space-y-4">
              {data.sources.map((src) => (
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
              <div
                className="h-full bg-[#0071E3]"
                style={{ width: `${snapshot.mobileSharePercent}%` }}
              />
              <div
                className="h-full bg-[#5856D6]"
                style={{ width: `${snapshot.desktopSharePercent}%` }}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
