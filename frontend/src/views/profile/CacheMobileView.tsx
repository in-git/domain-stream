import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Trash2 } from 'lucide-react';

const CACHE_KEYS = [
  'lumina:video-progress',
  'lumina:favorites',
  'lumina:saved',
  'lumina:dark',
  'lumina:profile:v2',
  'lumina:liked',
  'lumina:last-section',
];

function formatCacheSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function readCacheStats(): { count: number; size: string } {
  let count = 0;
  let bytes = 0;
  for (const key of CACHE_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    count += 1;
    bytes += raw.length;
  }
  return { count, size: formatCacheSize(bytes) };
}

/** 移动端缓存设置：布局与「安全设置」保持一致，不复用 PC 设置页组件 */
export function CacheMobileView() {
  const [notice, setNotice] = useState('');
  const [cacheVersion, setCacheVersion] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cacheStats = useMemo(() => readCacheStats(), [cacheVersion]);

  useEffect(() => {
    if (!confirmOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setConfirmOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [confirmOpen]);

  function clearCache() {
    for (const key of CACHE_KEYS) {
      window.localStorage.removeItem(key);
    }
    setCacheVersion((value) => value + 1);
    setNotice('已清理本地缓存，刷新页面后完全生效');
  }

  return (
    <section className="space-y-3 bg-app-card px-2 pb-4 pt-2 dark:bg-app-card">
      <div>
        <h2 className="text-sm font-medium text-app-text">缓存设置</h2>
        <p className="mt-1 text-xs text-app-subtle">仅清理本地缓存，不会退出登录</p>
      </div>

      <div className="rounded-app border-[0.5px] border-app-border bg-app-surface px-4 py-3.5 dark:border-app-border dark:bg-white/5">
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-app-subtle">缓存项</span>
          <span className="font-medium text-app-text">{cacheStats.count}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[13px]">
          <span className="text-app-subtle">占用空间</span>
          <span className="font-medium text-app-text">{cacheStats.size}</span>
        </div>
        <div className="mt-3 flex justify-end border-t border-app-border pt-3">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex h-7 items-center gap-1 rounded-app border border-app-border bg-app-card px-2.5 text-[11px] font-medium text-app-muted transition-colors hover:border-[#FF3B30]/40 hover:text-[#FF3B30]"
          >
            <Trash2 className="h-3 w-3" />
            清理缓存
          </button>
        </div>
      </div>

      {notice && (
        <p className="text-[12px] text-app-muted">{notice}</p>
      )}

      {confirmOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-6 backdrop-blur-sm"
            onClick={() => setConfirmOpen(false)}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="mobile-clear-cache-title"
              aria-describedby="mobile-clear-cache-description"
              className="w-full max-w-[320px] rounded-app bg-app-bg p-5 text-center shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#FF3B30]/10 text-[#FF3B30]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <h2 id="mobile-clear-cache-title" className="mt-3 text-[16px] font-semibold text-app-text">
                清理本地缓存？
              </h2>
              <p id="mobile-clear-cache-description" className="mt-2 text-[13px] leading-relaxed text-app-muted">
                此操作会删除播放进度、收藏、喜欢、主题和资料缓存，且不可恢复；不会退出当前账号。确定继续吗？
              </p>
              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="flex-1 rounded-app bg-app-surface py-2 text-[13px] font-medium text-app-text"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearCache();
                    setConfirmOpen(false);
                  }}
                  className="flex-1 rounded-app bg-[#FF3B30] py-2 text-[13px] font-medium text-white"
                >
                  确认清理
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
