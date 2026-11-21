import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bookmark, Heart, Type, X } from 'lucide-react';
import type { ArticleItem } from '../../data/content';
import { sanitizeRichHtml } from '../../lib/richtext';
import { SWIFTUI_BOUNCY, SWIFTUI_SHEET, SWIFTUI_SMOOTH } from '../../lib/motion';
import { ResilientImage } from '../../components/ResilientImage';
import { Tooltip } from '../../components/Tooltip';

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
const ARTICLE_PAGE_SIZE = 10;
type ArticleCategory = string;

// 文章封面统一按 16:9 横版展示，与 CMS 上传裁剪比例保持一致
const ARTICLE_COVER_ASPECT = 'aspect-[16/9]';

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

  const [visibleCount, setVisibleCount] = useState(ARTICLE_PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const hasMore = visibleCount < filteredArticles.length;

  useEffect(() => {
    setVisibleCount(ARTICLE_PAGE_SIZE);
  }, [category, normalizedQuery, articles]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((count) => Math.min(count + ARTICLE_PAGE_SIZE, filteredArticles.length));
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, filteredArticles.length]);

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

  const visibleArticles = filteredArticles.slice(0, visibleCount);
  const bannerArticle = visibleArticles[0];
  const gridArticles = visibleArticles.slice(1);

  return (
    <section aria-label="文章列表" className="space-y-0">
      {/* 顶部分类：与图文一致的横向 chip 条 */}
      <div className="sticky top-14 z-10 -mx-2.5 sm:-mx-6 lg:-mx-8 xl:-mx-10 bg-[#FBFBFD]/95 dark:bg-black/95 px-2.5 sm:px-6 lg:px-8 xl:px-10 backdrop-blur-xl">
        <div className="flex items-center gap-2.5 overflow-x-auto py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(['全部', ...filterCategories] as ArticleCategory[]).map((item) => {
            const active = category === item;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] transition-colors ${
                  active
                    ? 'bg-[#1D1D1F] font-medium text-white dark:bg-white dark:text-[#1D1D1F]'
                    : 'bg-black/[0.04] text-[#6E6E73] hover:bg-black/[0.07] dark:bg-white/[0.08] dark:text-[#98989D]'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {/* Banner: 当前筛选结果的第一篇文章 */}
      {bannerArticle && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SWIFTUI_SMOOTH}
          className="relative mb-2.5 overflow-hidden rounded-2xl bg-black"
        >
          <button
            type="button"
            onClick={() => openArticle(bannerArticle)}
            className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0071E3]"
            aria-label={`阅读文章：${bannerArticle.title}`}
          >
            <ResilientImage
              src={bannerArticle.cover}
              alt={bannerArticle.title}
              fallbackTitle={bannerArticle.title}
              className="h-48 w-full object-cover transition-transform duration-500 ease-out hover:scale-[1.02] sm:h-64 lg:h-80"
            />
          </button>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <span className="absolute left-3 top-3 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            {bannerArticle.category}
          </span>
          <div className="pointer-events-none absolute inset-x-3 bottom-3 sm:inset-x-5 sm:bottom-5">
            <h2 className="text-xl sm:text-3xl font-semibold leading-tight text-white line-clamp-2">
              {bannerArticle.title}
            </h2>
            {bannerArticle.excerpt && (
              <p className="mt-1 text-[12px] sm:text-sm leading-relaxed text-white/75 line-clamp-2">
                {bannerArticle.excerpt}
              </p>
            )}
          </div>
          <div className="absolute bottom-3 right-3 flex items-center gap-2 sm:bottom-5 sm:right-5">
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              transition={SWIFTUI_BOUNCY}
              onClick={() => onToggleLike(bannerArticle.id)}
              aria-label={likedIds.includes(bannerArticle.id) ? '取消喜欢文章' : '喜欢文章'}
              aria-pressed={likedIds.includes(bannerArticle.id)}
              className={`flex h-9 items-center justify-center gap-1 rounded-full px-3 backdrop-blur-sm transition-colors ${
                likedIds.includes(bannerArticle.id)
                  ? 'bg-[#FF375F]/90 text-white'
                  : 'bg-black/45 text-white hover:bg-black/60'
              }`}
            >
              <Heart className={`w-4 h-4 ${likedIds.includes(bannerArticle.id) ? 'fill-current' : ''}`} />
              <span className="text-[11px] font-medium tabular-nums">{bannerArticle.likes || ''}</span>
            </motion.button>
            <motion.button
              type="button"
              whileTap={{ scale: 0.85 }}
              transition={SWIFTUI_BOUNCY}
              onClick={() => onToggleSave(bannerArticle.id)}
              aria-label={savedIds.includes(bannerArticle.id) ? '取消收藏文章' : '收藏文章'}
              aria-pressed={savedIds.includes(bannerArticle.id)}
              className={`flex h-9 w-9 items-center justify-center rounded-full backdrop-blur-sm transition-colors ${
                savedIds.includes(bannerArticle.id)
                  ? 'bg-[#0071E3] text-white'
                  : 'bg-black/45 text-white hover:bg-black/60'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${savedIds.includes(bannerArticle.id) ? 'fill-current' : ''}`} />
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Xiaohongshu-style Two-Column Waterfall Feed */}
      <div className="columns-2 gap-2.5 md:columns-3 xl:columns-4 2xl:columns-5">
        {gridArticles.map((article, idx) => {
          const isSaved = savedIds.includes(article.id);
          const isLiked = likedIds.includes(article.id);
          return (
            <motion.article
              key={article.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SWIFTUI_SMOOTH, delay: Math.min(idx, 8) * 0.03 }}
              className="break-inside-avoid pb-2.5"
            >
              <div className="group overflow-hidden rounded-2xl bg-white dark:bg-[#161618] border border-black/[0.05] dark:border-white/[0.07] transition-shadow hover:shadow-md">
                <div className="relative overflow-hidden">
                  <button
                    type="button"
                    onClick={() => openArticle(article)}
                    className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0071E3]"
                    aria-label={`阅读文章：${article.title}`}
                  >
                    <ResilientImage
                      src={article.cover}
                      alt={article.title}
                      fallbackTitle={article.title}
                      className={`w-full ${ARTICLE_COVER_ASPECT} transition-transform duration-500 ease-out group-hover:scale-[1.03]`}
                    />
                  </button>
                  <span className="absolute left-2 top-2 px-2 py-0.5 rounded-full bg-black/45 text-[10px] font-medium text-white backdrop-blur-sm">
                    {article.category}
                  </span>

                  {/* 底部渐变：标题与简介在左下、收藏在右下 */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
                  <div className="pointer-events-none absolute bottom-2 left-2.5 right-[4.75rem] z-10">
                    <h3 className="text-[16px] sm:text-[18px] font-semibold leading-snug text-white line-clamp-2">
                      {article.title}
                    </h3>
                    {article.excerpt && (
                      <p className="mt-0.5 text-[11px] sm:text-[12px] leading-relaxed text-white/75 line-clamp-1">
                        {article.excerpt}
                      </p>
                    )}
                  </div>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.85 }}
                    transition={SWIFTUI_BOUNCY}
                    onClick={() => onToggleLike(article.id)}
                    aria-label={isLiked ? '取消喜欢文章' : '喜欢文章'}
                    aria-pressed={isLiked}
                    className={`absolute bottom-2 right-10 z-10 flex h-8 items-center justify-center gap-1 rounded-full px-2 backdrop-blur-sm transition-colors ${
                      isLiked
                        ? 'bg-[#FF375F]/90 text-white'
                        : 'bg-black/45 text-white hover:bg-black/60'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    <span className="text-[11px] font-medium tabular-nums">
                      {article.likes || ''}
                    </span>
                  </motion.button>

                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.85 }}
                    transition={SWIFTUI_BOUNCY}
                    onClick={() => onToggleSave(article.id)}
                    aria-label={isSaved ? '取消收藏文章' : '收藏文章'}
                    aria-pressed={isSaved}
                    className={`absolute bottom-2 right-2 z-10 flex items-center justify-center w-8 h-8 rounded-full backdrop-blur-sm transition-colors ${
                      isSaved
                        ? 'bg-[#0071E3] text-white'
                        : 'bg-black/45 text-white hover:bg-black/60'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                  </motion.button>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* 触底加载：还有更多时显示哨兵，全部加载完显示提示 */}
      {hasMore ? (
        <div ref={loadMoreRef} className="flex justify-center py-6">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => Math.min(count + ARTICLE_PAGE_SIZE, filteredArticles.length))}
            className="rounded-full bg-[#F2F2F7] px-5 py-2 text-[12px] font-medium text-[#6E6E73] transition-colors hover:bg-[#E8E8ED] dark:bg-[#1C1C1E] dark:text-[#98989D] dark:hover:bg-[#242426]"
          >
            加载更多
          </button>
        </div>
      ) : (
        <p className="py-6 text-center text-[12px] text-[#98989D]">没有更多了</p>
      )}

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

                  <div className="rounded-2xl overflow-hidden aspect-[16/9]">
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
                </div>
              </div>

              {/* Fixed Modal Footer：点赞/收藏 + 关闭，固定在最底部 */}
              <div className="shrink-0 border-t border-black/[0.08] dark:border-white/[0.08] bg-[#FBFBFD]/95 dark:bg-[#141416]/95 backdrop-blur-xl px-5 sm:px-8 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Tooltip label={likedIds.includes(activeArticle.id) ? '取消喜欢' : '喜欢'}>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => onToggleLike(activeArticle.id)}
                      aria-label={likedIds.includes(activeArticle.id) ? '取消喜欢' : '喜欢'}
                      className={`w-11 h-11 inline-flex items-center justify-center rounded-xl border transition-colors ${
                        likedIds.includes(activeArticle.id)
                          ? 'bg-[#FF375F]/12 border-[#FF375F]/35 text-[#FF375F]'
                          : 'border-black/[0.08] dark:border-white/[0.1] text-[#6E6E73] dark:text-[#98989D] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      <Heart
                        className={`w-4 h-4 ${
                          likedIds.includes(activeArticle.id) ? 'fill-current' : ''
                        }`}
                      />
                    </motion.button>
                  </Tooltip>

                  <Tooltip label={savedIds.includes(activeArticle.id) ? '取消收藏' : '收藏'}>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.92 }}
                      onClick={() => onToggleSave(activeArticle.id)}
                      aria-label={savedIds.includes(activeArticle.id) ? '取消收藏' : '收藏'}
                      className={`w-11 h-11 inline-flex items-center justify-center rounded-xl border transition-colors ${
                        savedIds.includes(activeArticle.id)
                          ? 'bg-[#0071E3]/12 border-[#0071E3]/35 text-[#0071E3] dark:text-[#0A84FF]'
                          : 'border-black/[0.08] dark:border-white/[0.1] text-[#6E6E73] dark:text-[#98989D] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      <Bookmark
                        className={`w-4 h-4 ${
                          savedIds.includes(activeArticle.id) ? 'fill-current' : ''
                        }`}
                      />
                    </motion.button>
                  </Tooltip>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveArticle(null)}
                  className="px-5 py-2 min-h-[44px] rounded-xl text-sm font-medium bg-[#1D1D1F] text-white dark:bg-[#F5F5F7] dark:text-[#1D1D1F]"
                >
                  关闭
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
