import { useEffect, useState } from 'react';
import {
  fetchPublishCategories,
  type PublishCategoryModule,
  type PublishCategoryOption,
} from './category.ts';

/**
 * 同一模块的并发请求合并：发布页表单与分类下拉组件通常会同时挂载，
 * 复用同一个请求，避免重复拉取后端分类列表。
 */
const inflight = new Map<PublishCategoryModule, Promise<PublishCategoryOption[]>>();

function loadCategories(module: PublishCategoryModule): Promise<PublishCategoryOption[]> {
  const existing = inflight.get(module);
  if (existing) return existing;

  const request = fetchPublishCategories(module);
  inflight.set(module, request);
  // 请求结束后释放（成功失败都释放），下次进入页面仍会拉取最新分类
  void request
    .catch(() => undefined)
    .finally(() => {
      if (inflight.get(module) === request) inflight.delete(module);
    });
  return request;
}

/**
 * 发布表单分类选项加载：统一处理 loading / error，
 * 三个内容模块共用，避免每页重复对接后端分类接口。
 */
export function usePublishCategories(module: PublishCategoryModule) {
  const [options, setOptions] = useState<PublishCategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    loadCategories(module)
      .then((list) => {
        if (!cancelled) setOptions(list);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setOptions([]);
        setError(err instanceof Error ? err.message : '分类加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [module]);

  return { options, loading, error };
}
