import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.ts';
import type { DashboardPayload } from '../../types/cms.ts';

/**
 * 仪表盘数据：加载一次全量快照即可，不进行实时轮询。
 */
export function useDashboardData() {
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

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

  return { data, loading, moduleBreakdown };
}
