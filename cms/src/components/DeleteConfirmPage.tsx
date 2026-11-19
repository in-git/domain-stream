import { useState } from 'react';
import { PageShell } from './PageShell.tsx';

interface DeleteConfirmPageProps {
  title: string;
  itemTitle: string;
  description: string;
  onConfirm: () => Promise<void>;
  onBack: () => void;
}

/** 通用删除确认独立页面，替代原来的确认弹窗 */
export function DeleteConfirmPage({
  title,
  itemTitle,
  description,
  onConfirm,
  onBack,
}: DeleteConfirmPageProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function handleConfirm() {
    setDeleting(true);
    setError('');
    try {
      await onConfirm();
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <PageShell
      title={title}
      subtitle="请确认以下信息，删除后无法恢复。"
      onBack={onBack}
      maxWidth="max-w-[620px]"
      footer={
        <>
          <button
            type="button"
            onClick={onBack}
            className="h-10 px-4 rounded-xl bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[13px] font-medium text-[#1D1D1F]"
          >
            取消
          </button>
          <button
            type="button"
            disabled={deleting}
            onClick={() => void handleConfirm()}
            className="h-10 px-5 rounded-xl bg-[#FF3B30] hover:bg-[#D70015] disabled:opacity-60 text-white text-[13px] font-medium"
          >
            {deleting ? '正在删除...' : '确认删除'}
          </button>
        </>
      }
    >
      <div className="rounded-2xl border border-[#FF3B30]/20 bg-[#FF3B30]/5 p-5">
        <p className="text-[15px] text-[#1D1D1F] leading-relaxed">
          即将永久删除「<span className="font-semibold">{itemTitle}</span>」。
        </p>
        <p className="text-[13px] text-[#6E6E73] mt-2 leading-relaxed">{description}</p>
      </div>
      {error && (
        <div className="mt-4 rounded-xl bg-[#FF3B30]/8 px-3.5 py-2 text-[13px] text-[#D70015]">
          {error}
        </div>
      )}
    </PageShell>
  );
}
