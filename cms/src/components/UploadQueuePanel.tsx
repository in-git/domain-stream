/**
 * 全局后台上传任务：侧边栏「后台任务」按钮 + HeroUI Popover 详情。
 * 使用框架 Overlay 渲染，不受侧边栏层级/overflow 影响。
 */
import { useEffect, useState } from 'react';
import { Popover } from '@heroui/react';
import { CheckCircle2, Loader2, Trash2, UploadCloud, X, XCircle } from 'lucide-react';
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
  const [open, setOpen] = useState(false);

  useEffect(() => uploadTaskQueue.subscribe(setTasks), []);

  if (tasks.length === 0) return null;

  const active = tasks.filter(
    (t) => t.status === 'queued' || t.status === 'uploading' || t.status === 'saving'
  ).length;
  const done = tasks.filter(
    (t) => t.status === 'success' || t.status === 'error' || t.status === 'canceled'
  );

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={`后台任务，共 ${tasks.length} 个，${active} 个进行中`}
        className="w-full h-9 px-3 rounded-xl flex items-center justify-between gap-2.5 text-[13px] font-medium text-[#6E6E73] outline-none hover:text-[#0071E3] hover:bg-[#0071E3]/8 transition-colors data-[open]:text-[#0071E3] data-[open]:bg-[#0071E3]/8"
      >
        <span className="min-w-0 truncate text-left">后台任务</span>
        <span className="relative shrink-0 flex items-center gap-1.5">
          {active > 0 && (
            <span className="h-2 w-2 rounded-full bg-[#34C759] ring-2 ring-white" />
          )}
          <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-[#0071E3]/10 text-[#0071E3] text-[11px] font-semibold flex items-center justify-center">
            {tasks.length}
          </span>
        </span>
      </Popover.Trigger>

      <Popover.Content
        placement="top right"
        offset={8}
        className="w-[340px] max-w-[calc(100vw-2.5rem)] rounded-2xl bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl border border-black/[0.08] dark:border-white/[0.1] shadow-2xl overflow-hidden p-0"
      >
        <Popover.Dialog aria-label="后台任务详情" className="p-0 outline-none">
          <div className="flex items-center gap-2 px-4 py-3">
            <span className="w-8 h-8 rounded-xl bg-[#0071E3]/10 flex items-center justify-center shrink-0">
              <UploadCloud className="w-4 h-4 text-[#0071E3]" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                后台任务
              </span>
              <span className="block text-[11px] text-[#8E8E93]">
                {active > 0 ? `${active} 个任务进行中` : '全部任务已完成'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="关闭后台任务详情"
              className="rounded-lg p-1.5 text-[#8E8E93] transition-colors hover:bg-black/[0.05] hover:text-[#1D1D1F] dark:hover:bg-white/[0.08] dark:hover:text-[#F5F5F7]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

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
                {task.status === 'queued' ||
                task.status === 'uploading' ||
                task.status === 'saving' ? (
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
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
