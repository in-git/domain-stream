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

const SKELETON_BASE =
  'skeleton-shimmer rounded-[14px] bg-[#EDEDF0] dark:bg-white/[0.07]';

function Block({
  className,
  style,
}: {
  className: string;
  style?: React.CSSProperties;
}) {
  return <div aria-hidden style={style} className={`${SKELETON_BASE} ${className}`} />;
}

function HeaderSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Block className="w-11 h-11 rounded-2xl" />
        <div className="space-y-2">
          <Block className="h-7 w-40" />
          <Block className="h-3.5 w-64 max-w-[70vw]" />
        </div>
      </div>
      <div className="flex items-center gap-3 pt-1">
        <Block className="h-3 w-16" />
        <Block className="w-px h-3" />
        <Block className="h-3 w-20" />
      </div>
    </div>
  );
}

function FilterChips() {
  return (
    <div className="flex flex-wrap gap-2">
      {[72, 88, 80, 96, 68].map((width, index) => (
        <Block key={index} className="h-9 rounded-full" style={{ width }} />
      ))}
    </div>
  );
}

function VideosSkeleton() {
  return (
    <div className="space-y-6">
      <FilterChips />
      {/* 沉浸刷看：整块舞台 */}
      <Block className="w-full h-[calc(100dvh-14.25rem)] sm:h-[calc(100dvh-10.75rem)] min-h-[420px] rounded-[24px]" />
    </div>
  );
}

const CARD_HEIGHTS = ['h-44', 'h-[340px]', 'h-52', 'h-[300px]', 'h-48', 'h-64', 'h-56', 'h-[320px]'];

function ArticlesSkeleton() {
  return (
    <div className="space-y-6">
      <FilterChips />
      <div className="columns-2 md:columns-3 xl:columns-4 2xl:columns-5 gap-3 sm:gap-4 xl:gap-5">
        {CARD_HEIGHTS.map((height, index) => (
          <div key={index} className="break-inside-avoid mb-3 sm:mb-4 xl:mb-5 space-y-2">
            <Block className={`w-full ${height} rounded-[16px]`} />
            <Block className="h-3.5 w-4/5" />
            <Block className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="space-y-6">
      <FilterChips />
      <div className="columns-1 sm:columns-2 md:columns-3 xl:columns-4 2xl:columns-5 gap-5 xl:gap-6">
        {CARD_HEIGHTS.map((height, index) => (
          <div key={index} className="break-inside-avoid mb-5 space-y-3">
            <Block className={`w-full ${height} rounded-[20px]`} />
            <Block className="h-3.5 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      <div className="flex justify-end">
        <Block className="h-11 w-32 rounded-[14px]" />
      </div>
      <div className="flex items-center justify-between">
        <Block className="h-6 w-28" />
        <Block className="h-9 w-32 rounded-full" />
      </div>
      <div className="columns-1 md:columns-2 xl:columns-3 gap-5">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className="break-inside-avoid mb-5 rounded-[22px] border border-[#E8E8ED] dark:border-white/10 bg-white/70 dark:bg-[#1C1C1E]/70 p-5 space-y-4"
          >
            <div className="flex items-center gap-3">
              <Block className="w-10 h-10 rounded-[14px]" />
              <div className="flex-1 space-y-2">
                <Block className="h-3.5 w-24" />
                <Block className="h-3 w-16" />
              </div>
            </div>
            <Block className="h-3.5 w-full" />
            <Block className="h-3.5 w-5/6" />
            <Block className="h-3.5 w-2/3" />
            <Block className="h-8 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SectionSkeleton({ section }: { section: ContentSection }) {
  return (
    <div aria-busy="true" aria-label="内容加载中" className="space-y-8">
      {section !== 'messages' ? <HeaderSkeleton /> : null}
      {section === 'videos' && <VideosSkeleton />}
      {section === 'articles' && <ArticlesSkeleton />}
      {section === 'gallery' && <GallerySkeleton />}
      {section === 'messages' && <MessagesSkeleton />}
    </div>
  );
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
