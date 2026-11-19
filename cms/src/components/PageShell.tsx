import type { ReactNode } from 'react';
import { ArrowLeft, FileQuestion, LockKeyhole } from 'lucide-react';

interface PageShellProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  backLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  hero?: ReactNode;
  maxWidth?: string;
}

/** 独立编辑/预览页的统一外壳：返回入口 + 标题 + 内容 + 底部操作区 */
export function PageShell({
  title,
  subtitle,
  onBack,
  backLabel = '返回列表',
  children,
  footer,
  hero,
  maxWidth = 'max-w-[980px]',
}: PageShellProps) {
  return (
    <div className={`mx-auto w-full ${maxWidth} space-y-4`}>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-[#E5E5EA] text-[13px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </button>

      <div className="bg-white rounded-[22px] border border-[#E5E5EA] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        {hero}
        <div className="px-6 sm:px-8 py-6 border-b border-[#F2F2F7]">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#1D1D1F]">{title}</h1>
          {subtitle && <p className="text-[13px] text-[#6E6E73] mt-1">{subtitle}</p>}
        </div>

        <div className="p-6 sm:p-8">{children}</div>

        {footer && (
          <div className="px-6 sm:px-8 py-4 bg-[#FAFAFC] border-t border-[#E5E5EA] flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** 路由中的 id 不存在时的兜底页面 */
/** 无访问权限提示页 */
export function NoAccessPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[640px] bg-white rounded-[22px] border border-[#E5E5EA] py-20 px-6 text-center">
      <LockKeyhole className="w-10 h-10 text-[#C7C7CC] mx-auto mb-3" strokeWidth={1.5} />
      <h2 className="text-[17px] font-semibold text-[#1D1D1F]">暂无访问权限</h2>
      <p className="text-[13px] text-[#6E6E73] mt-1">当前账号没有执行该操作的权限，请联系管理员。</p>
      <button
        type="button"
        onClick={onBack}
        className="mt-5 h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" />
        返回列表
      </button>
    </div>
  );
}

export function PageNotFound({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="mx-auto w-full max-w-[640px] bg-white rounded-[22px] border border-[#E5E5EA] py-20 px-6 text-center">
      <FileQuestion className="w-10 h-10 text-[#C7C7CC] mx-auto mb-3" strokeWidth={1.5} />
      <h2 className="text-[17px] font-semibold text-[#1D1D1F]">未找到该{label}</h2>
      <p className="text-[13px] text-[#6E6E73] mt-1">内容可能已被删除，或链接中的编号不正确。</p>
      <button
        type="button"
        onClick={onBack}
        className="mt-5 h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" />
        返回列表
      </button>
    </div>
  );
}
