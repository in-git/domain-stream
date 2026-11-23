/**
 * 全局后台上传任务悬浮面板
 * 订阅 uploadTaskQueue，展示各任务进度，支持取消与清除已完成。
 */
import { useEffect, useState } from 'react';
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, Trash2, UploadCloud, X, XCircle } from 'lucide-react';
import { uploadTaskQueue, type UploadTask } from '../lib/uploadTaskQueue.ts';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const STATUS_ICON: Record<UploadTask['status'], React.ReactNode> = {
  queued: <Loader2 className="w-4 h-4 text-[#8E8E93]" />,
  uploading: <Loader2 className="w-4 h-4 text-[#0071E3] animate-spin" />,
  saving: <Loader2 className="w-4 h-4 text-[#0071E3] animate-spin" />,
  success: <CheckCircle2 className="w-4 h-4 text-[#34C759]" />,
  error: <XCircle className="w-4 h-4 text-[#FF3B30]" />,
  canceled: <XCircle className="w-4 h-4 text-[#8E8E93]" />,
};

export function UploadQueuePanel() {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [open, setOpen] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => uploadTaskQueue.subscribe(setTasks), []);

  if (tasks.length === 0) return null;

  const active = tasks.filter(
    (t) => t.status === 'queued' || t.status === 'uploading' || t.status === 'saving'
  ).length;
  const done = tasks.filter((t) => t.status === 'success' || t.status === 'error' || t.status === 'canceled');

  if (dismissed) {
    return (
      <button
        type="button"
        onClick={() => setDismissed(false)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/95 px-3.5 py-2.5 text-[12px] font-medium text-[#1D1D1F] shadow-xl backdrop-blur-xl transition-colors hover:bg-white dark:border-white/[0.1] dark:bg-[#1C1C1E]/95 dark:text-[#F5F5F7] dark:hover:bg-[#1C1C1E]"
      >
        <UploadCloud className="w-4 h-4 text-[#0071E3]" />
        后台上传
        {active > 0 && (
          <span className="rounded-full bg-[#0071E3] px-1.5 py-0.5 text-[10px] leading-none text-white">
            {active}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[340px] max-w-[calc(100vw-2.5rem)] rounded-2xl bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.1] shadow-2xl overflow-hidden">
      <div className="flex items-center gap-1 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
        >
          <span className="w-9 h-9 rounded-xl bg-[#0071E3]/10 flex items-center justify-center shrink-0">
            <UploadCloud className="w-5 h-5 text-[#0071E3]" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              后台上传
            </span>
            <span className="block text-[11px] text-[#8E8E93]">
              {active > 0 ? `${active} 个任务进行中` : '全部任务已完成'}
            </span>
          </span>
          {active > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#0071E3] text-white text-[10px] font-medium">
              {active}
            </span>
          )}
          {open ? (
            <ChevronDown className="w-4 h-4 text-[#8E8E93]" />
          ) : (
            <ChevronUp className="w-4 h-4 text-[#8E8E93]" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="关闭后台上传面板"
          className="ml-1 shrink-0 rounded-lg p-1.5 text-[#8E8E93] transition-colors hover:bg-black/[0.05] hover:text-[#1D1D1F] dark:hover:bg-white/[0.08] dark:hover:text-[#F5F5F7]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <>
          <div className="max-h-[320px] overflow-y-auto border-t border-black/[0.06] dark:border-white/[0.08]">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 px-4 py-3 border-b border-black/[0.04] dark:border-white/[0.05] last:border-0"
              >
                <span className="mt-0.5 shrink-0">{STATUS_ICON[task.status]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="flex-1 min-w-0 text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                      {task.name}
                    </p>
                    <span className="shrink-0 text-[10px] text-[#8E8E93]">{formatSize(task.size)}</span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-[#8E8E93]">
                    {task.status === 'uploading'
                      ? `上传中 ${task.progress}%`
                      : task.status === 'saving'
                        ? '正在保存记录…'
                        : task.status === 'queued'
                          ? '排队中'
                          : task.status === 'success'
                            ? '已完成'
                            : task.status === 'canceled'
                              ? '已取消'
                              : task.error || '失败'}
                  </p>
                  {(task.status === 'uploading' || task.status === 'saving') && (
                    <div className="mt-1.5 h-1 rounded-full bg-black/[0.06] dark:bg-white/[0.1] overflow-hidden">
                      <div
                        className="h-full bg-[#0071E3] transition-[width] duration-200"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                {(task.status === 'queued' || task.status === 'uploading' || task.status === 'saving') ? (
                  <button
                    type="button"
                    onClick={() => uploadTaskQueue.cancel(task.id)}
                    aria-label="取消上传"
                    className="mt-0.5 p-1 rounded-lg text-[#8E8E93] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => uploadTaskQueue.remove(task.id)}
                    aria-label="移除记录"
                    className="mt-0.5 p-1 rounded-lg text-[#C7C7CC] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {done.length > 0 && (
            <div className="px-4 py-2 flex justify-end border-t border-black/[0.06] dark:border-white/[0.08]">
              <button
                type="button"
                onClick={() => uploadTaskQueue.clearFinished()}
                className="inline-flex items-center gap-1 text-[11px] text-[#8E8E93] hover:text-[#FF3B30]"
              >
                <Trash2 className="w-3 h-3" />
                清除已完成
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
