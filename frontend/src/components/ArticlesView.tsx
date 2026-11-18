import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Bookmark, Heart, Type, X } from 'lucide-react';
import type { ArticleItem } from '../data/content';
import { SWIFTUI_BOUNCY, SWIFTUI_SHEET, SWIFTUI_SMOOTH, SWIFTUI_SNAPPY } from '../lib/motion';
import { ResilientImage } from './ResilientImage';

interface ArticlesViewProps {
  articles: ArticleItem[];
  savedIds: string[];
  likedIds: string[];
  searchQuery?: string;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  onReadArticle: (id: string) => void;
  externalSelectedId?: string | null;
  onClearExternalSelection?: () => void;
}

const ARTICLE_CATEGORIES = ['全部', '设计', '影像', '技术', '随笔'] as const;
type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number];

export function ArticlesView({
  articles,
  savedIds,
  likedIds,
  searchQuery = '',
  onToggleSave,
  onToggleLike,
  onReadArticle,
  externalSelectedId,
  onClearExternalSelection,
}: ArticlesViewProps) {
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

  const leadArticle = category === '全部' && !normalizedQuery ? filteredArticles[0] : null;
  const gridArticles = leadArticle ? filteredArticles.slice(1) : filteredArticles;

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
    <section aria-labelledby="articles-heading" className="space-y-10">
      {/* Header & Filter */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
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
          className="inline-flex items-center p-1 rounded-xl bg-[#EEEEF0] dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.06] self-start md:self-auto overflow-x-auto max-w-full"
        >
          {ARTICLE_CATEGORIES.map((item) => {
            const active = category === item;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(item)}
                className={`relative px-3.5 py-2 min-h-[40px] text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] ${
                  active
                    ? 'text-[#1D1D1F] dark:text-white'
                    : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="articleCategoryPill"
                    transition={SWIFTUI_SNAPPY}
                    className="absolute inset-0 rounded-lg bg-white dark:bg-[#2C2C2E] shadow-xs"
                  />
                )}
                <span className="relative z-10">{item}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lead Editorial Article */}
      {leadArticle && (
        <motion.article
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SWIFTUI_SMOOTH}
          className="group grid grid-cols-1 lg:grid-cols-12 items-stretch rounded-3xl overflow-hidden bg-white dark:bg-[#161618] border border-black/[0.06] dark:border-white/[0.08] shadow-sm"
        >
          <button
            type="button"
            onClick={() => openArticle(leadArticle)}
            className="lg:col-span-6 relative aspect-[4/3] lg:aspect-auto lg:min-h-[340px] overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0071E3]"
          >
            <ResilientImage
              src={leadArticle.cover}
              alt={leadArticle.title}
              priority
              fallbackTitle={leadArticle.title}
              className="w-full h-full transition-transform duration-700 ease-out group-hover:scale-[1.03]"
            />
          </button>

          <div className="lg:col-span-6 p-6 sm:p-8 lg:p-10 flex flex-col justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#6E6E73] dark:text-[#98989D] mb-3">
                <span>头版专稿</span>
                <span aria-hidden="true">·</span>
                <span>{leadArticle.category}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{leadArticle.readMinutes} 分钟阅读</span>
              </div>

              <button
                type="button"
                onClick={() => openArticle(leadArticle)}
                className="text-left focus-visible:outline-none"
              >
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] group-hover:text-[#0071E3] dark:group-hover:text-[#0A84FF] transition-colors leading-snug">
                  {leadArticle.title}
                </h2>
              </button>

              <p className="mt-3 text-sm sm:text-base text-[#515154] dark:text-[#A1A1A6] leading-relaxed">
                {leadArticle.excerpt}
              </p>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-black/[0.05] dark:border-white/[0.06]">
              <div className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                {leadArticle.author} · {leadArticle.date}
              </div>

              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={() => openArticle(leadArticle)}
                className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl bg-[#1D1D1F] text-white dark:bg-[#F5F5F7] dark:text-[#1D1D1F] text-xs font-medium hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                <span>阅读全文</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </motion.button>
            </div>
          </div>
        </motion.article>
      )}

      {/* Articles Grid */}
      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {gridArticles.map((article, idx) => {
            const isSaved = savedIds.includes(article.id);
            return (
              <motion.article
                key={article.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ ...SWIFTUI_SMOOTH, delay: idx * 0.04 }}
                whileHover={{ y: -2 }}
                className="group flex flex-col justify-between rounded-2xl overflow-hidden bg-white dark:bg-[#161618] border border-black/[0.06] dark:border-white/[0.08] transition-shadow hover:shadow-md"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => openArticle(article)}
                    className="block w-full aspect-[16/10] overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0071E3]"
                  >
                    <ResilientImage
                      src={article.cover}
                      alt={article.title}
                      fallbackTitle={article.title}
                      className="w-full h-full transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  </button>

                  <div className="p-6 pb-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#6E6E73] dark:text-[#98989D] mb-2.5">
                      <span>{article.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{article.readMinutes} 分钟阅读</span>
                      <span aria-hidden="true">·</span>
                      <span>{article.date}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openArticle(article)}
                      className="text-left focus-visible:outline-none"
                    >
                      <h3 className="text-lg sm:text-xl font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] group-hover:text-[#0071E3] dark:group-hover:text-[#0A84FF] transition-colors leading-snug">
                        {article.title}
                      </h3>
                    </button>

                    <p className="mt-2.5 text-sm text-[#515154] dark:text-[#A1A1A6] leading-relaxed line-clamp-2">
                      {article.excerpt}
                    </p>
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between">
                  <span className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                    作者：{article.author}
                  </span>

                  <div className="flex items-center gap-1">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.86 }}
                      transition={SWIFTUI_BOUNCY}
                      onClick={() => onToggleSave(article.id)}
                      aria-label={isSaved ? '取消收藏文章' : '收藏文章'}
                      className={`min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg transition-colors ${
                        isSaved
                          ? 'text-[#0071E3] dark:text-[#0A84FF]'
                          : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white'
                      }`}
                    >
                      <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                    </motion.button>

                    <button
                      type="button"
                      onClick={() => openArticle(article)}
                      className="px-3 py-1.5 min-h-[40px] text-xs font-medium text-[#0071E3] dark:text-[#0A84FF] hover:underline whitespace-nowrap"
                    >
                      阅读
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </AnimatePresence>
      </motion.div>

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

                  <div
                    className={`space-y-5 leading-[1.85] text-[#2C2C2E] dark:text-[#D1D1D6] ${
                      largeFont ? 'text-lg sm:text-[19px]' : 'text-[15px] sm:text-base'
                    } ${serifMode ? 'font-editorial' : ''}`}
                  >
                    {activeArticle.paragraphs.map((p, index) => (
                      <p key={index}>{p}</p>
                    ))}
                  </div>

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
