import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookmarkX, ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { ArticleItem, PhotoItem, VideoItem } from '../data/content';
import { sanitizeRichHtml } from '../lib/richtext';
import { SWIFTUI_SMOOTH } from '../lib/motion';
import { ResilientImage } from './ResilientImage';

/** 收藏详情弹窗要展示的内容：三类内容各自携带自己的视图模型 */
export type FavoriteTarget =
  | { kind: 'video'; video: VideoItem }
  | { kind: 'article'; article: ArticleItem }
  | { kind: 'graphic'; photo: PhotoItem }
  | null;

interface FavoriteDetailModalProps {
  target: FavoriteTarget;
  onClose: () => void;
  /** 传入时才显示「取消收藏」，搜索等场景只做内容预览 */
  onRemove?: (id: string) => void;
}

function metaLine(parts: (string | number | undefined)[]): string {
  return parts.filter((part) => !!part).join(' · ');
}

/** 个人中心收藏详情：视频可播放、文章可阅读、图文可翻页，不跳转其他板块 */
export function FavoriteDetailModal({ target, onClose, onRemove }: FavoriteDetailModalProps) {
  const [slide, setSlide] = useState(0);

  // 切换收藏项时重置图文图片索引
  useEffect(() => {
    setSlide(0);
  }, [target?.kind === 'graphic' ? target.photo.id : target?.kind]);

  // 打开时锁定背景滚动，支持 ESC 关闭
  useEffect(() => {
    if (!target) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [target, onClose]);

  const images = target?.kind === 'graphic' ? target.photo.images : [];
  const safeSlide = images.length ? Math.min(slide, images.length - 1) : 0;

  const currentId =
    target?.kind === 'video'
      ? target.video.id
      : target?.kind === 'article'
        ? target.article.id
        : target?.kind === 'graphic'
          ? target.photo.id
          : '';

  const title =
    target?.kind === 'video'
      ? target.video.title
      : target?.kind === 'article'
        ? target.article.title
        : target?.kind === 'graphic'
          ? target.photo.title
          : '收藏详情';

  const articleHtml =
    target?.kind === 'article' && target.article.content
      ? sanitizeRichHtml(target.article.content)
      : '';

  return (
    <AnimatePresence>
      {target && (
        <motion.div
          key="favorite-detail"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`收藏详情：${title}`}
            initial={{ opacity: 0, y: 32, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={SWIFTUI_SMOOTH}
            className="relative w-full sm:max-w-lg h-full sm:h-auto max-h-none sm:max-h-[86vh] flex flex-col overflow-y-auto rounded-none sm:rounded-3xl border border-black/[0.06] dark:border-white/10 bg-white dark:bg-[#1C1C1E] shadow-xl"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full flex items-center justify-center bg-white/85 dark:bg-black/55 text-[#1D1D1F] dark:text-white backdrop-blur-md hover:bg-white dark:hover:bg-black/70 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {target.kind === 'video' && (
              <>
                <video
                  src={target.video.src}
                  poster={target.video.cover}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full aspect-video bg-black sm:rounded-t-3xl"
                />
                <div className="px-5 pt-4 space-y-2">
                  <h2 className="text-[17px] font-semibold leading-snug text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {target.video.title}
                  </h2>
                  <p className="text-[11px] text-[#6E6E73] dark:text-[#98989D]">
                    {metaLine([
                      target.video.category,
                      target.video.durationLabel,
                      target.video.director,
                      target.video.date,
                    ])}
                  </p>
                  {target.video.description && (
                    <p className="text-[13px] leading-6 text-[#3A3A3C] dark:text-[#D1D1D6] whitespace-pre-wrap">
                      {target.video.description}
                    </p>
                  )}
                </div>
              </>
            )}

            {target.kind === 'article' && (
              <>
                <ResilientImage
                  src={target.article.cover}
                  alt={target.article.title}
                  fallbackTitle={target.article.title}
                  className="w-full aspect-[16/9] sm:rounded-t-3xl"
                />
                <div className="px-5 pt-4 space-y-3">
                  <h2 className="text-[17px] font-semibold leading-snug text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {target.article.title}
                  </h2>
                  <p className="text-[11px] text-[#6E6E73] dark:text-[#98989D]">
                    {metaLine([
                      target.article.category,
                      target.article.author,
                      target.article.date,
                      `${target.article.readMinutes} 分钟阅读`,
                    ])}
                  </p>
                  {target.article.excerpt && (
                    <p className="text-[13px] leading-6 text-[#6E6E73] dark:text-[#98989D] border-l-2 border-[#0071E3]/40 pl-3">
                      {target.article.excerpt}
                    </p>
                  )}
                  {articleHtml ? (
                    <div
                      className="text-[14px] leading-7 text-[#2C2C2E] dark:text-[#E5E5EA] [&_img]:rounded-xl [&_img]:w-full [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:border-black/10 [&_blockquote]:pl-3 [&_blockquote]:text-[#6E6E73] [&_a]:text-[#0071E3]"
                      dangerouslySetInnerHTML={{ __html: articleHtml }}
                    />
                  ) : (
                    <div className="space-y-3 text-[14px] leading-7 text-[#2C2C2E] dark:text-[#E5E5EA]">
                      {target.article.paragraphs.map((paragraph, index) => (
                        <p key={index} className="whitespace-pre-wrap">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {target.kind === 'graphic' && (
              <>
                <div className="relative bg-black">
                  <ResilientImage
                    src={images[safeSlide] || target.photo.src}
                    alt={`${target.photo.title} ${safeSlide + 1}`}
                    fallbackTitle={target.photo.title}
                    priority
                    className="w-full aspect-[4/3] sm:rounded-t-3xl"
                  />
                  {images.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSlide((value) => (value - 1 + images.length) % images.length)}
                        aria-label="上一张"
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSlide((value) => (value + 1) % images.length)}
                        aria-label="下一张"
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <span className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/50 text-[11px] text-white tabular-nums backdrop-blur-sm">
                        {safeSlide + 1} / {images.length}
                      </span>
                    </>
                  )}
                </div>
                <div className="px-5 pt-4 space-y-2">
                  <h2 className="text-[17px] font-semibold leading-snug text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {target.photo.title}
                  </h2>
                  <p className="text-[11px] text-[#6E6E73] dark:text-[#98989D]">
                    {metaLine([
                      target.photo.album,
                      target.photo.location,
                      target.photo.date,
                      target.photo.camera,
                      target.photo.lens,
                      target.photo.settings,
                    ])}
                  </p>
                </div>
              </>
            )}

            <div className="mt-4 px-5 py-4 border-t border-[#F2F2F7] dark:border-white/[0.06] flex items-center justify-between gap-3">
              {onRemove ? (
                <button
                  type="button"
                  onClick={() => {
                    onRemove(currentId);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-xl bg-[#FF3B30]/[0.08] dark:bg-[#FF453A]/[0.14] text-xs font-medium text-[#FF3B30] dark:text-[#FF453A] hover:bg-[#FF3B30]/[0.14] dark:hover:bg-[#FF453A]/[0.22] transition-colors"
                >
                  <BookmarkX className="w-3.5 h-3.5" />
                  取消收藏
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={onClose}
                className="h-10 px-4 rounded-xl bg-[#F5F5F7] dark:bg-white/[0.06] text-[13px] font-medium text-[#3A3A3C] dark:text-[#D1D1D6] hover:bg-[#EDEDF0] dark:hover:bg-white/[0.1] transition-colors"
              >
                关闭
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
