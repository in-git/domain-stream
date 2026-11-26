import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Star, Heart, MessageCircle, Type, X } from 'lucide-react';
import type { ArticleItem } from '../types/content';
import { sanitizeRichHtml } from '../lib/richtext';
import { SWIFTUI_SHEET } from '../lib/motion';
import { ResilientImage } from './ResilientImage';
import { Tooltip } from './Tooltip';
import { CommentPanel } from './CommentPanel.tsx';
import { useCommentEnabled } from '../lib/systemInfo.ts';

interface ArticleReaderProps {
  articles: ArticleItem[];
  articleId: string | null;
  likedIds: string[];
  savedIds: string[];
  onToggleLike: (id: string) => void;
  onToggleSave: (id: string) => void;
  onClose: () => void;
}

/** 文章阅读器：文章模块与喜欢/收藏等入口共用的受控预览组件 */
export function ArticleReader({
  articles,
  articleId,
  likedIds,
  savedIds,
  onToggleLike,
  onToggleSave,
  onClose,
}: ArticleReaderProps) {
  const commentsEnabled = useCommentEnabled();
  const article = articleId ? articles.find((item) => item.id === articleId) ?? null : null;
  const [largeFont, setLargeFont] = useState(false);
  const [serifMode, setSerifMode] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const readerRef = useRef<HTMLDivElement | null>(null);

  // 切换文章时重置阅读器内部状态，避免沿用上一篇的字体、滚动进度与评论弹层
  useEffect(() => {
    setLargeFont(false);
    setSerifMode(false);
    setCommentOpen(false);
    setScrollProgress(0);
    readerRef.current?.scrollTo(0, 0);
  }, [articleId]);

  useEffect(() => {
    if (!article) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [article, onClose]);

  const handleReaderScroll = () => {
    const el = readerRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    if (maxScroll <= 0) {
      setScrollProgress(1);
      return;
    }
    setScrollProgress(Math.min(1, Math.max(0, el.scrollTop / maxScroll)));
  };

  return (
    <>
      <AnimatePresence>
        {article && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-6 bg-black/55 backdrop-blur-md"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, y: 48, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 36, scale: 0.97 }}
              transition={SWIFTUI_SHEET}
              onClick={(event) => event.stopPropagation()}
              className="relative w-full max-w-[min(1280px,96vw)] h-[92vh] sm:h-[min(92vh,900px)] flex flex-col rounded-t-app sm:rounded-app bg-app-surface text-app-text border border-app-border shadow-2xl overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label={article.title}
            >
              <div className="shrink-0 relative px-5 sm:px-8 h-14 flex items-center justify-between border-b border-app-border bg-app-surface/90 dark:bg-app-surface/90 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-xs text-app-muted truncate">
                  <span>{article.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{article.readMinutes} 分钟阅读</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setSerifMode((value) => !value)}
                    className={`px-2 py-1.5 min-h-[36px] rounded-app text-xs font-medium transition-colors ${
                      serifMode
                        ? 'bg-app-primary/12 text-app-primary'
                        : 'text-app-muted hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
                    }`}
                  >
                    {serifMode ? '衬线体' : '无衬线'}
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setLargeFont((value) => !value)}
                    aria-label="切换阅读字号"
                    className={`min-w-[36px] min-h-[36px] px-2 flex items-center justify-center rounded-app transition-colors ${
                      largeFont
                        ? 'bg-app-primary/12 text-app-primary'
                        : 'text-app-muted hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
                    }`}
                  >
                    <Type className="w-4 h-4" />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    aria-label="关闭阅读器"
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-transparent">
                  <div
                    className="h-full bg-app-primary dark:bg-[#0A84FF] transition-all duration-150"
                    style={{ width: `${Math.round(scrollProgress * 100)}%` }}
                  />
                </div>
              </div>

              {commentsEnabled && (
                <aside className="absolute right-0 top-14 bottom-0 z-10 hidden w-[360px] border-l border-app-border bg-app-card md:block">
                  <CommentPanel
                    embedded
                    open={!!article}
                    targetType="ARTICLE"
                    targetId={article?.id || ''}
                    onClose={() => {}}
                  />
                </aside>
              )}

              <div
                ref={readerRef}
                onScroll={handleReaderScroll}
                className={`flex-1 overflow-y-auto px-6 sm:px-12 py-8 sm:py-10 ${commentsEnabled ? 'md:pr-[calc(360px+2rem)]' : ''}`}
              >
                <div className="max-w-[65ch] mx-auto space-y-7">
                  <header className="space-y-4">
                    <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight leading-tight">
                      {article.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-app-muted">
                      <span>{article.author}</span>
                      <span aria-hidden="true">·</span>
                      <span>{article.date}</span>
                    </div>
                  </header>

                  <div className="rounded-app overflow-hidden aspect-[16/9]">
                    <ResilientImage
                      src={article.cover}
                      alt={article.title}
                      fallbackTitle={article.title}
                      className="w-full h-full"
                    />
                  </div>

                  <blockquote className="py-5 px-6 rounded-app bg-app-surface dark:bg-app-card border border-app-border dark:border-white/[0.06]">
                    <p className="font-editorial text-lg sm:text-xl leading-relaxed text-app-text">
                      “{article.quote}”
                    </p>
                  </blockquote>

                  {article.content ? (
                    <div
                      className={`article-prose ${largeFont ? 'article-prose--lg' : ''} ${
                        serifMode ? 'article-prose--serif' : ''
                      }`}
                      dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(article.content) }}
                    />
                  ) : (
                    <div
                      className={`space-y-5 leading-[1.85] text-[#2C2C2E] dark:text-[#D1D1D6] ${
                        largeFont ? 'text-lg sm:text-[19px]' : 'text-[15px] sm:text-base'
                      } ${serifMode ? 'font-editorial' : ''}`}
                    >
                      {article.paragraphs.map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className={`shrink-0 border-t border-app-border bg-app-surface/95 dark:bg-app-surface/95 backdrop-blur-xl px-4 sm:px-8 py-1.5 sm:py-3 flex items-center justify-between ${commentsEnabled ? 'md:pr-[calc(360px+2rem)]' : ''}`}>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Tooltip label={likedIds.includes(article.id) ? '取消喜欢' : '喜欢'}>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => onToggleLike(article.id)}
                      aria-label={likedIds.includes(article.id) ? '取消喜欢' : '喜欢'}
                      className={`w-9 h-9 sm:w-11 sm:h-11 inline-flex items-center justify-center rounded-app border transition-colors ${
                        likedIds.includes(article.id)
                          ? 'bg-[#FF375F]/12 border-[#FF375F]/35 text-[#FF375F]'
                          : 'border-app-border text-app-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                          likedIds.includes(article.id) ? 'fill-current' : ''
                        }`}
                      />
                    </motion.button>
                  </Tooltip>

                  <Tooltip label={savedIds.includes(article.id) ? '取消收藏' : '收藏'}>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => onToggleSave(article.id)}
                      aria-label={savedIds.includes(article.id) ? '取消收藏' : '收藏'}
                      className={`w-9 h-9 sm:w-11 sm:h-11 inline-flex items-center justify-center rounded-app border transition-colors ${
                        savedIds.includes(article.id)
                          ? 'bg-app-favorite/12 border-app-favorite/35 text-app-favorite'
                          : 'border-app-border text-app-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      <Star
                        className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${
                          savedIds.includes(article.id) ? 'fill-current' : ''
                        }`}
                      />
                    </motion.button>
                  </Tooltip>

                  {commentsEnabled && (
                    <Tooltip label="评论">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setCommentOpen(true)}
                        aria-label="查看评论"
                        className="w-9 h-9 sm:w-11 sm:h-11 inline-flex items-center justify-center rounded-app border border-app-border text-app-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.06] md:hidden"
                      >
                        <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </motion.button>
                    </Tooltip>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 min-h-[36px] sm:px-5 sm:py-2 sm:min-h-[44px] rounded-app text-[13px] sm:text-sm font-medium bg-app-primary text-white dark:bg-app-surface dark:text-app-text"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <CommentPanel
        open={commentOpen && !!article}
        targetType="ARTICLE"
        targetId={article?.id || ''}
        onClose={() => setCommentOpen(false)}
      />
    </>
  );
}
