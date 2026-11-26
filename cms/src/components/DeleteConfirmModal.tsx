import { useState } from 'react';
import { Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  /** 标题，如「确认删除 2 个视频？」 */
  title: string;
  /** 删除条目名称（单条或多条） */
  itemTitles?: string[];
  description: string;
  /** 需要用户手动输入该文本才能确认删除，传空则不校验 */
  requireText?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

/** 通用删除确认模态框：视频/图文/文章单条与批量删除共用 */
export function DeleteConfirmModal({
  title,
  itemTitles = [],
  description,
  requireText,
  onConfirm,
  onClose,
}: DeleteConfirmModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [typedText, setTypedText] = useState('');
  const canConfirm = !requireText || typedText.trim() === requireText;

  async function handleConfirm() {
    setDeleting(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败，请稍后重试');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={() => !deleting && onClose()}
    >
      <div
        className="w-full max-w-[460px] rounded-[20px] bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF3B30]/10">
              <Trash2 className="h-4.5 w-4.5 text-[#D70015]" />
            </span>
            <h3 className="text-[17px] font-semibold text-[#1D1D1F]">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            aria-label="关闭"
            className="text-[#86868B] hover:text-[#1D1D1F] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 rounded-2xl border border-[#FF3B30]/20 bg-[#FF3B30]/5 p-4">
          {itemTitles.length > 0 && (
            <p className="text-[14px] text-[#1D1D1F] leading-relaxed">
              {itemTitles.length === 1 ? (
                <>
                  即将永久删除「<span className="font-semibold">{itemTitles[0]}</span>」。
                </>
              ) : (
                <>
                  即将永久删除选中的 <span className="font-semibold">{itemTitles.length}</span> 项：
                </>
              )}
            </p>
          )}
          {itemTitles.length > 1 && (
            <p className="mt-1 text-[12px] text-[#86868B] line-clamp-2">
              {itemTitles.join('、')}
            </p>
          )}
          <p className="mt-2 text-[13px] text-[#6E6E73] leading-relaxed">{description}</p>
        </div>

        {requireText && (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[12px] text-[#6E6E73]">
              请输入模块标识 <code className="font-mono text-[#1D1D1F]">{requireText}</code> 以确认删除
            </span>
            <input
              value={typedText}
              onChange={(event) => setTypedText(event.target.value)}
              disabled={deleting}
              autoComplete="off"
              spellCheck={false}
              placeholder="模块标识可编辑，输入一致后即可删除"
              className="w-full h-10 px-3 rounded-xl border border-[#D2D2D7] bg-white text-[13px] font-mono text-[#1D1D1F] outline-none focus:border-[#FF3B30] disabled:opacity-60"
            />
          </label>
        )}

        {error && (
          <p className="mt-3 rounded-xl bg-[#FF3B30]/8 px-3 py-2 text-[12px] text-[#D70015]">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="h-10 px-4 rounded-xl bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[13px] font-medium text-[#1D1D1F]"
          >
            取消
          </button>
          <button
            type="button"
            disabled={deleting || !canConfirm}
            onClick={() => void handleConfirm()}
            className="h-10 px-5 rounded-xl bg-[#FF3B30] hover:bg-[#D70015] disabled:opacity-60 text-white text-[13px] font-medium"
          >
            {deleting ? '正在删除...' : '确认删除'}
          </button>
        </div>
      </div>
    </div>
  );
}
