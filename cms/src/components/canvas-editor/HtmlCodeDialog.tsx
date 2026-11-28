/**
 * HTML 代码编辑弹窗
 * ------------------------------------------------------------------
 * 画布里的 HTML 组件用它录入代码：左侧编辑、右侧实时预览。
 * 预览用 sandbox 隔离的 iframe（srcDoc），不会执行脚本。
 */
import { useEffect, useState } from 'react';

export interface HtmlCodeDialogProps {
  open: boolean;
  title?: string;
  value: string;
  onClose: () => void;
  onConfirm: (html: string) => void;
}

export function HtmlCodeDialog({
  open,
  title = 'HTML 代码',
  value,
  onClose,
  onConfirm,
}: HtmlCodeDialogProps) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className="flex h-[86vh] w-[97vw] max-w-[1500px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_70px_rgba(0,0,0,0.25)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#F2F2F7] px-5 py-3.5">
          <div>
            <div className="text-[14px] font-semibold text-[#1D1D1F]">{title}</div>
            <div className="mt-0.5 text-[11px] text-[#86868B]">
              输入 HTML 片段，客户端开屏会按原样渲染
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="h-7 w-7 rounded-lg text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
          >
            ×
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-3 p-4 md:grid-cols-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            spellCheck={false}
            placeholder='<div style="color:#fff">Hello</div>'
            aria-label="HTML 代码"
            className="h-full min-h-[220px] w-full resize-none rounded-xl border border-[#E5E5EA] bg-[#FBFBFD] p-3 font-mono text-[13px] leading-relaxed text-[#1D1D1F] outline-none focus:border-[#0071E3] focus:bg-white"
          />
          <div className="h-full min-h-[220px] overflow-hidden rounded-xl border border-[#E5E5EA] bg-white">
            <iframe
              title="HTML 预览"
              srcDoc={draft}
              sandbox=""
              className="h-full w-full border-0 bg-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#F2F2F7] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-lg border border-[#E5E5EA] px-3 text-[12px] font-medium text-[#3A3A3C] hover:bg-[#F5F5F7]"
          >
            取消
          </button>
          <button
            type="button"
            disabled={!draft.trim()}
            onClick={() => onConfirm(draft)}
            className="h-8 rounded-lg bg-[#0071E3] px-4 text-[12px] font-medium text-white hover:bg-[#0077ED] disabled:opacity-40"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}
