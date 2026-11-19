import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bookmark, Heart, Type, X } from 'lucide-react';
import type { ArticleItem } from '../data/content';
import { sanitizeRichHtml } from '../lib/richtext';
import { SWIFTUI_BOUNCY, SWIFTUI_SHEET, SWIFTUI_SMOOTH } from '../lib/motion';
import { ResilientImage } from './ResilientImage';

interface ArticlesViewProps {
  articles: ArticleItem[];
  categories?: string[];
  savedIds: string[];
  likedIds: string[];
  searchQuery?: string;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  onReadArticle: (id: string) => void;
  externalSelectedId?: string | null;
  onClearExternalSelection?: () => void;
}

const DEFAULT_ARTICLE_CATEGORIES = ['设计', '影像', '技术', '随笔'];
type ArticleCategory = string;

// 小红书式瀑布流：交替不同封面比例，形成错落的两列节奏
const FEED_COVER_RATIOS = [
  'aspect-[3/4]',
  'aspect-square',
  'aspect-[4/5]',
  'aspect-[4/3]',
  'aspect-[3/4]',
  'aspect-[5/6]',
];

function formatLikes(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1).replace(/\.0$/, '')}万`;
  }
  return `${count}`;
}

export function ArticlesView({
  articles,
  categories,
  savedIds,
  likedIds,
  searchQuery = '',
  onToggleSave,
  onToggleLike,
  onReadArticle,
  externalSelectedId,
  onClearExternalSelection,
}: ArticlesViewProps) {
  const filterCategories = categories && categories.length ? categories : DEFAULT_ARTICLE_CATEGORIES;
  const [category, setCategory] = useState<ArticleCategory>('全部');
  const [activeArticle, setActiveArticle] = useState<ArticleItem | null>(null);
  const [largeFont, setLargeFont] = useState(false);
  const [serifMode, setSerifMode] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const readerRef = useRef<HTMLDivElement | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredArticles = articles.filter((a) => {
    const matchCategory = category === '全部' || a.category === category;
    const matchQuery =
      !normalizedQuery ||
      a.title.toLowerCase().includes(normalizedQuery) ||
      a.excerpt.toLowerCase().includes(normalizedQuery) ||
      a.author.toLowerCase().includes(normalizedQuery);
    return matchCategory && matchQuery;
  });

  useEffect(() => {
    if (externalSelectedId) {
      const target = articles.find((a) => a.id === externalSelectedId);
      if (target) openArticle(target);
      onClearExternalSelection?.();
    }
  }, [externalSelectedId, articles, onClearExternalSelection]);

  const openArticle = (article: ArticleItem) => {
    setActiveArticle(article);
    setScrollProgress(0);
    onReadArticle(article.id);
  };

  useEffect(() => {
    if (!activeArticle) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveArticle(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeArticle]);

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
    <section aria-labelledby="articles-heading" className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-wide text-[#0071E3] dark:text-[#0A84FF] mb-1.5">
            深度专题与设计志
          </p>
          <h1
            id="articles-heading"
            className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]"
          >
            精选文章
          </h1>
        </div>

        <div
          role="tablist"
          aria-label="文章分类筛选"
          className="flex items-center gap-2 self-start md:self-auto overflow-x-auto max-w-full pb-0.5"
        >
          {(['全部', ...filterCategories] as ArticleCategory[]).map((item) => {
            const active = category === item;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(item)}
                className={`px-3.5 py-1.5 min-h-[36px] rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] ${
                  active
                    ? 'bg-[#1D1D1F] text-white dark:bg-[#F5F5F7] dark:text-[#1D1D1F]'
                    : 'bg-[#F2F2F7] text-[#6E6E73] dark:bg-[#1C1C1E] dark:text-[#98989D] hover:bg-[#E8E8ED] dark:hover:bg-[#242426]'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {/* Xiaohongshu-style Two-Column Waterfall Feed */}
      <div className="columns-2 gap-3 sm:gap-4 xl:gap-5 md:columns-3 xl:columns-4 2xl:columns-5">
        {filteredArticles.map((article, idx) => {
          const isSaved = savedIds.includes(article.id);
          const isLiked = likedIds.includes(article.id);
          return (
            <motion.article
              key={article.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SWIFTUI_SMOOTH, delay: Math.min(idx, 8) * 0.03 }}
              className="break-inside-avoid mb-3 sm:mb-4"
            >
              <div className="group overflow-hidden rounded-2xl bg-white dark:bg-[#161618] border border-black/[0.05] dark:border-white/[0.07] transition-shadow hover:shadow-md">
                <button
                  type="button"
                  onClick={() => openArticle(article)}
                  className="relative block w-full overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0071E3]"
                  aria-label={`阅读文章：${article.title}`}
                >
                  <ResilientImage
                    src={article.cover}
                    alt={article.title}
                    fallbackTitle={article.title}
                    className={`w-full max-h-[360px] ${
                      FEED_COVER_RATIOS[idx % FEED_COVER_RATIOS.length]
                    } transition-transform duration-500 ease-out group-hover:scale-[1.03]`}
                  />
                  <span className="absolute left-2 top-2 px-2 py-0.5 rounded-full bg-black/45 text-[10px] font-medium text-white backdrop-blur-sm">
                    {article.category}
                  </span>
                </button>

                <div className="px-2.5 sm:px-3 pt-2 pb-2.5">
                  <button
                    type="button"
                    onClick={() => openArticle(article)}
                    className="block w-full text-left focus-visible:outline-none"
                  >
                    <h3 className="text-[13px] sm:text-sm font-medium leading-relaxed text-[#1D1D1F] dark:text-[#F5F5F7] line-clamp-2">
                      {article.title}
                    </h3>
                  </button>

                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="flex items-center justify-center w-4 h-4 shrink-0 rounded-full bg-gradient-to-br from-[#FF6B81] to-[#FF2E4D] text-[9px] font-semibold text-white">
                        {article.author.slice(0, 1)}
                      </span>
                      <span className="text-[11px] text-[#6E6E73] dark:text-[#98989D] truncate">
                        {article.author}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.85 }}
                        transition={SWIFTUI_BOUNCY}
                        onClick={() => onToggleLike(article.id)}
                        aria-label={isLiked ? '取消点赞文章' : '点赞文章'}
                        aria-pressed={isLiked}
                        className={`flex items-center gap-1 px-1 py-1 text-[11px] tabular-nums transition-colors ${
                          isLiked
                            ? 'text-[#FF2E4D]'
                            : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#FF2E4D]'
                        }`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
                        <span>{formatLikes(article.likes + (isLiked ? 1 : 0))}</span>
                      </motion.button>

                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.85 }}
                        transition={SWIFTUI_BOUNCY}
                        onClick={() => onToggleSave(article.id)}
                        aria-label={isSaved ? '取消收藏文章' : '收藏文章'}
                        aria-pressed={isSaved}
                        className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                          isSaved
                            ? 'text-[#0071E3] dark:text-[#0A84FF]'
                            : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white'
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* Apple Reader Sheet Modal */}
      <AnimatePresence>
        {activeArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-black/55 backdrop-blur-md"
            onClick={() => setActiveArticle(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 48, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 36, scale: 0.97 }}
              transition={SWIFTUI_SHEET}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl h-[92vh] sm:h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#FBFBFD] dark:bg-[#141416] text-[#1D1D1F] dark:text-[#F5F5F7] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl overflow-hidden"
              role="dialog"
              aria-modal="true"
              aria-label={activeArticle.title}
            >
              {/* Reader Sticky Header */}
              <div className="shrink-0 relative px-5 sm:px-8 h-14 flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.08] bg-[#FBFBFD]/90 dark:bg-[#141416]/90 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-xs text-[#6E6E73] dark:text-[#98989D] truncate">
                  <span>{activeArticle.category}</span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{activeArticle.readMinutes} 分钟阅读</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setSerifMode((s) => !s)}
                    className={`px-2.5 py-1.5 min-h-[36px] rounded-lg text-xs font-medium transition-colors ${
                      serifMode
                        ? 'bg-[#0071E3]/12 text-[#0071E3] dark:text-[#0A84FF]'
                        : 'text-[#6E6E73] dark:text-[#98989D] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
                    }`}
                  >
                    {serifMode ? '衬线体' : '无衬线'}
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setLargeFont((l) => !l)}
                    aria-label="切换阅读字号"
                    className={`min-w-[36px] min-h-[36px] px-2 flex items-center justify-center rounded-lg transition-colors ${
                      largeFont
                        ? 'bg-[#0071E3]/12 text-[#0071E3] dark:text-[#0A84FF]'
                        : 'text-[#6E6E73] dark:text-[#98989D] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
                    }`}
                  >
                    <Type className="w-4 h-4" />
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setActiveArticle(null)}
                    aria-label="关闭阅读器"
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Live Reading Progress Hairline */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-transparent">
                  <div
                    className="h-full bg-[#0071E3] dark:bg-[#0A84FF] transition-all duration-150"
                    style={{ width: `${Math.round(scrollProgress * 100)}%` }}
                  />
                </div>
              </div>

              {/* Scrollable Manuscript Body */}
              <div
                ref={readerRef}
                onScroll={handleReaderScroll}
                className="flex-1 overflow-y-auto px-6 sm:px-12 py-8 sm:py-10"
              >
                <div className="max-w-[65ch] mx-auto space-y-7">
                  <header className="space-y-4">
                    <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight leading-tight">
                      {activeArticle.title}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#6E6E73] dark:text-[#98989D]">
                      <span>{activeArticle.author}</span>
                      <span aria-hidden="true">·</span>
                      <span>{activeArticle.date}</span>
                    </div>
                  </header>

                  <div className="rounded-2xl overflow-hidden aspect-[16/10]">
                    <ResilientImage
                      src={activeArticle.cover}
                      alt={activeArticle.title}
                      fallbackTitle={activeArticle.title}
                      className="w-full h-full"
                    />
                  </div>

                  {/* Pull Quote without thick left border (Apple editorial centered/subtle surface) */}
                  <blockquote className="py-5 px-6 rounded-2xl bg-[#F2F2F7] dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.06]">
                    <p className="font-editorial text-lg sm:text-xl leading-relaxed text-[#1D1D1F] dark:text-[#F5F5F7]">
                      “{activeArticle.quote}”
                    </p>
                  </blockquote>

                  {activeArticle.content ? (
                    <div
                      className={`article-prose ${largeFont ? 'article-prose--lg' : ''} ${
                        serifMode ? 'article-prose--serif' : ''
                      }`}
                      dangerouslySetInnerHTML={{
                        __html: sanitizeRichHtml(activeArticle.content),
                      }}
                    />
                  ) : (
                    <div
                      className={`space-y-5 leading-[1.85] text-[#2C2C2E] dark:text-[#D1D1D6] ${
                        largeFont ? 'text-lg sm:text-[19px]' : 'text-[15px] sm:text-base'
                      } ${serifMode ? 'font-editorial' : ''}`}
                    >
                      {activeArticle.paragraphs.map((p, index) => (
                        <p key={index}>{p}</p>
                      ))}
                    </div>
                  )}

                  {/* Reader Footer Actions */}
                  <div className="pt-8 mt-8 border-t border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => onToggleLike(activeArticle.id)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl text-xs font-medium border transition-colors ${
                          likedIds.includes(activeArticle.id)
                            ? 'bg-[#FF375F]/12 border-[#FF375F]/35 text-[#FF375F]'
                            : 'border-black/[0.08] dark:border-white/[0.1] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            likedIds.includes(activeArticle.id) ? 'fill-current' : ''
                          }`}
                        />
                        <span>{likedIds.includes(activeArticle.id) ? '已赞' : '点赞'}</span>
                      </motion.button>

                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.92 }}
                        onClick={() => onToggleSave(activeArticle.id)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-xl text-xs font-medium border transition-colors ${
                          savedIds.includes(activeArticle.id)
                            ? 'bg-[#0071E3]/12 border-[#0071E3]/35 text-[#0071E3] dark:text-[#0A84FF]'
                            : 'border-black/[0.08] dark:border-white/[0.1] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                        }`}
                      >
                        <Bookmark
                          className={`w-4 h-4 ${
                            savedIds.includes(activeArticle.id) ? 'fill-current' : ''
                          }`}
                        />
                        <span>{savedIds.includes(activeArticle.id) ? '已收藏' : '收藏'}</span>
                      </motion.button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveArticle(null)}
                      className="px-4 py-2 min-h-[44px] rounded-xl text-xs font-medium bg-[#1D1D1F] text-white dark:bg-[#F5F5F7] dark:text-[#1D1D1F]"
                    >
                      完成阅读
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
