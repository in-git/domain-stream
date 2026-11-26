import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';

interface SecondaryPageProps {
  onBack: () => void;
  children: ReactNode;
  /** 内容区额外类名，用于控制最大宽度等 */
  contentClassName?: string;
}

/** 统一的二级页面容器：全屏覆盖、统一 padding、统一返回按钮 */
export function SecondaryPage({
  onBack,
  children,
  contentClassName = '',
}: SecondaryPageProps) {
  return (
    <motion.div
      key="secondary-page"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-40 overflow-y-auto bg-white p-2 dark:bg-[#08080A]"
    >
      <div className={`mx-auto w-full space-y-3 ${contentClassName}`}>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-2 py-2 text-[14px] font-medium text-[#1D1D1F] dark:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          返回
        </button>
        <div>{children}</div>
      </div>
    </motion.div>
  );
}
