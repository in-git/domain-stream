import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.ts';
import type { DashboardPayload, TrafficPoint } from '../../types/cms.ts';

/**
 * 仪表盘数据：首次加载全量快照，之后按需轮询实时快照并就地合并。
 * 轮询关闭时保持静态快照，不影响已加载的数据。
 */
export function useDashboardData(liveRefreshEnabled: boolean) {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
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
            // 今日 UV/PV 覆盖到周/月序列的最后一个点
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
                // 实时序列滑动窗口：挤掉最旧的点
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

  /** 内容模块的浏览量占比（用于环形图） */
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

  return { data, loading, sseConnected, moduleBreakdown };
}
