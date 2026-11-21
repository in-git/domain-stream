import { motion } from 'motion/react';
import {
  AlertCircle,
  Film,
  Images,
  MessageCircleHeart,
  Newspaper,
  RefreshCw,
} from 'lucide-react';
import type { SectionId } from '../data/content';
import { APPLE_EASE } from '../lib/motion';

type ContentSection = Exclude<SectionId, 'profile'>;

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

export function PortalError({
  section,
  message,
  onRetry,
}: {
  section: ContentSection;
  message: string;
  onRetry: () => void;
}) {
  const { label, Icon } = SECTION_META[section];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: APPLE_EASE }}
      className="rounded-[24px] border border-[#FF3B30]/20 dark:border-[#FF3B30]/25 bg-[#FF3B30]/[0.04] dark:bg-[#FF3B30]/[0.06] px-6 py-16 text-center"
    >
      <div className="w-14 h-14 mx-auto mb-4 rounded-[18px] bg-[#FF3B30]/10 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-[#D70015]" strokeWidth={1.7} />
      </div>
      <h2 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
        {label}加载失败
      </h2>
      <p className="mt-2 text-[13px] text-[#86868B] dark:text-[#A1A1A6] max-w-md mx-auto">
        {message}
      </p>
      <motion.button
        type="button"
        onClick={onRetry}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="mt-6 h-10 px-5 rounded-[14px] bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        重新加载
      </motion.button>
    </motion.div>
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
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: APPLE_EASE }}
      className="rounded-[24px] border border-dashed border-[#D2D2D7] dark:border-white/15 px-6 py-20 text-center"
    >
      <div className="w-14 h-14 mx-auto mb-4 rounded-[18px] bg-[#F5F5F7] dark:bg-white/[0.06] flex items-center justify-center">
        <Icon className="w-6 h-6 text-[#AEAEB2] dark:text-[#636366]" strokeWidth={1.6} />
      </div>
      <h2 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
        暂无{label}
      </h2>
      <p className="mt-2 text-[13px] text-[#86868B] dark:text-[#A1A1A6]">
        内容发布后将在这里显示，请稍后再来看看
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 h-9 px-4 rounded-xl bg-white dark:bg-white/[0.06] border border-[#E5E5EA] dark:border-white/10 text-[13px] font-medium text-[#3A3A3C] dark:text-[#D1D1D6] inline-flex items-center gap-2 hover:bg-[#F5F5F7] dark:hover:bg-white/[0.1] transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          刷新内容
        </button>
      )}
    </motion.div>
  );
}
