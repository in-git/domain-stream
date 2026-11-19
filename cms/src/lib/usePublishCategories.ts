import { useEffect, useState } from 'react';
import {
  fetchPublishCategories,
  type PublishCategoryModule,
  type PublishCategoryOption,
} from './category.ts';

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

    fetchPublishCategories(module)
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
