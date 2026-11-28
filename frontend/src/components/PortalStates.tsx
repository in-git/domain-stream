import { motion } from 'motion/react';
import {
  AlertCircle,
  Film,
  Images,
  MessageCircleHeart,
  Newspaper,
  RefreshCw,
} from 'lucide-react';
import type { SectionId } from '../types/content';
import { APPLE_EASE } from '../lib/motion';

type ContentSection = Exclude<SectionId, 'profile' | 'settings'>;

/** 加载态：不显示任何内容，数据到位后直接渲染 */
export function SectionSkeleton(_props: { section: ContentSection }) {
  return null;
}

const SECTION_META: Record<ContentSection, { label: string; Icon: typeof Film }> = {
  videos: { label: '视频', Icon: Film },
  articles: { label: '文章', Icon: Newspaper },
  gallery: { label: '图文', Icon: Images },
  messages: { label: '留言', Icon: MessageCircleHeart },
};

/**
 * 通用错误占位：图标 + 标题 + 错误信息 + 重试按钮。
 * 与 EmptyState 对称，供各模块加载失败时复用；无边框、无阴影、带统一响应式顶部间距。
 */
export function ErrorState({
  title,
  message,
  onRetry,
  className = '',
  compact = false,
}: {
  title: string;
  message: string;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: APPLE_EASE }}
      className={`mt-2 rounded-app bg-[#FF3B30]/[0.04] dark:bg-[#FF3B30]/[0.06] text-center sm:mt-1.5 md:mt-2 lg:mt-3 xl:mt-4 2xl:mt-4 ${
        compact ? 'px-5 py-10' : 'px-6 py-16'
      } ${className}`}
    >
      <div
        className={`mx-auto flex items-center justify-center rounded-app bg-[#FF3B30]/10 ${
          compact ? 'mb-3 w-10 h-10' : 'mb-4 w-14 h-14'
        }`}
      >
        <AlertCircle className="w-6 h-6 text-[#D70015]" strokeWidth={1.7} />
      </div>
      <h2 className="text-[17px] font-semibold text-app-text">{title}</h2>
      <p className="mt-2 text-[13px] text-app-muted max-w-md mx-auto">
        {message}
      </p>
      {onRetry && (
        <motion.button
          type="button"
          onClick={onRetry}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="mt-6 h-10 px-5 rounded-app bg-app-primary hover:bg-app-primary text-white text-[13px] font-medium inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          重新加载
        </motion.button>
      )}
    </motion.div>
  );
}

/** 板块级加载失败：基于通用 ErrorState，仅负责拼装板块名 */
export function PortalError({
  section,
  message,
  onRetry,
}: {
  section: ContentSection;
  message: string;
  onRetry: () => void;
}) {
  const { label } = SECTION_META[section];
  return <ErrorState title={`${label}加载失败`} message={message} onRetry={onRetry} />;
}

/**
 * 通用空白占位：图标 + 标题 + 描述 + 可选操作按钮。
 * 统一无背景、无边框、无阴影，保持页面扁平，供各模块空状态复用。
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
  compact = false,
  onDark = false,
}: {
  icon?: typeof Film;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  /** 紧凑模式：更小的内边距与图标，适合列表内联空态 */
  compact?: boolean;
  /** 深色背景上使用：标题改为白色 */
  onDark?: boolean;
}) {
  return (
    <div
      className={`bg-transparent border-0 shadow-none text-center ${compact ? 'px-5 py-10' : 'px-6 py-20'} ${className}`}
    >
      {Icon && (
        <div
          className={`mx-auto flex items-center justify-center rounded-app ${
            onDark ? 'bg-white/10' : 'bg-app-surface dark:bg-white/[0.06]'
          } ${compact ? 'mb-3 w-10 h-10' : 'mb-4 w-14 h-14'}`}
        >
          <Icon
            className={
              onDark
                ? compact ? 'w-5 h-5 text-white/70' : 'w-6 h-6 text-white/70'
                : compact ? 'w-5 h-5 text-app-subtle' : 'w-6 h-6 text-app-subtle dark:text-[#636366]'
            }
            strokeWidth={1.6}
          />
        </div>
      )}
      <h2
        className={`text-[17px] font-semibold ${
          onDark ? 'text-white' : 'text-app-text'
        }`}
      >
        {title}
      </h2>
      {description && (
        <p
          className={`mt-2 text-[13px] ${
            onDark ? 'text-white/65' : 'text-app-muted'
          }`}
        >
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PortalEmpty({
  section,
  onRetry,
}: {
  section: ContentSection;
  onRetry?: () => void;
}) {
  const { label, Icon } = SECTION_META[section];
  return (
    <EmptyState
      icon={Icon}
      title={`暂无${label}`}
      description="内容发布后将在这里显示，请稍后再来看看"
      action={
        onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="h-9 px-4 rounded-app bg-app-card dark:bg-white/[0.06] border border-app-border text-[13px] font-medium text-[#3A3A3C] dark:text-[#D1D1D6] inline-flex items-center gap-2 hover:bg-app-surface dark:hover:bg-white/[0.1] transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            刷新内容
          </button>
        ) : undefined
      }
    />
  );
}
