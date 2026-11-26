import { motion } from 'motion/react';
import { Compass, Sparkles } from 'lucide-react';
import { SWIFTUI_SMOOTH } from '../../lib/motion';
import { PortalNav } from './PortalNav';

interface SectionPlaceholderProps {
  /** 模块名称（来自后台导航配置） */
  label: string;
  /** 模块标识，便于排查是哪个配置项 */
  sectionId: string;
  /** 自定义图标地址（已转成可访问 URL） */
  iconUrl?: string;
  /** 返回首页 */
  onGoHome: () => void;
}

/**
 * 自定义模块占位页。
 * CMS 里新增了模块但客户端还没实现对应页面时，用这个页面兜住，
 * 避免用户点击导航后看到空白区域。
 */
export function SectionPlaceholder({ label, sectionId, iconUrl, onGoHome }: SectionPlaceholderProps) {
  return (
    <>
      <PortalNav />
      <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={SWIFTUI_SMOOTH}
      className="min-h-[60vh] flex items-center justify-center py-8"
    >
      <div className="w-full max-w-md text-center px-4">
        <div className="mx-auto mb-5 w-16 h-16 rounded-app bg-app-card dark:bg-[#1E1E22] border border-app-border shadow-xs flex items-center justify-center overflow-hidden">
          {iconUrl ? (
            <img src={iconUrl} alt="" aria-hidden="true" className="w-8 h-8 object-contain" />
          ) : (
            <Compass className="w-7 h-7 text-[#C7C7CC] dark:text-app-muted" strokeWidth={1.6} />
          )}
        </div>

        <h2 className="text-[20px] font-semibold tracking-tight text-app-text">
          {label}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-app-muted dark:text-app-muted">
          该模块已在后台启用，客户端页面正在建设中，敬请期待。
        </p>

        <div className="mt-5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-app-surface dark:bg-white/[0.06] text-[11px] font-mono text-app-subtle dark:text-app-subtle">
          <Sparkles className="w-3 h-3" />
          {sectionId}
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={onGoHome}
            className="h-9 px-4 rounded-full bg-app-primary text-white text-[13px] font-medium hover:bg-app-primary transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
      </motion.div>
    </>
  );
}
