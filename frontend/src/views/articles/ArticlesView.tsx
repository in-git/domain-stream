import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Star, Heart, MessageCircle, Newspaper } from 'lucide-react';
import type { ArticleItem } from '../../types/content';
import { SWIFTUI_BOUNCY, SWIFTUI_SMOOTH } from '../../lib/motion';
import { EmptyState } from '../../components/PortalStates';
import { ContentSection } from '../../components/ContentSection';
import { TimeSortButton, sortByTime, type TimeSortOrder } from '../../components/TimeSortButton';
import { ResilientImage } from '../../components/ResilientImage';
import { ArticleReader } from '../../components/ArticleReader';
import { useCommentEnabled } from '../../lib/systemInfo.ts';

interface ArticlesViewProps {
  articles: ArticleItem[];
  categories?: string[];
  savedIds: string[];
  likedIds: string[];
  searchQuery?: string;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  onReadArticle: (id: string) => void;
  onRefresh?: () => void;
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
  onRefresh,
  externalSelectedId,
  onClearExternalSelection,
}: ArticlesViewProps) {
  const commentsEnabled = useCommentEnabled();
  const filterCategories = categories && categories.length ? categories : DEFAULT_ARTICLE_CATEGORIES;
  const [category, setCategory] = useState<ArticleCategory>('全部');
  const [sortOrder, setSortOrder] = useState<TimeSortOrder>('DESC');
  const [localActiveId, setLocalActiveId] = useState<string | null>(null);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredArticles = useMemo(
    () =>
      sortByTime(
        articles.filter((a) => {
          const matchCategory = category === '全部' || a.category === category;
          const matchQuery =
            !normalizedQuery ||
            a.title.toLowerCase().includes(normalizedQuery) ||
            a.excerpt.toLowerCase().includes(normalizedQuery) ||
            a.author.toLowerCase().includes(normalizedQuery);
          return matchCategory && matchQuery;
        }),
        sortOrder
      ),
    [articles, category, normalizedQuery, sortOrder]
  );

  const [visibleCount, setVisibleCount] = useState(ARTICLE_PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const hasMore = visibleCount < filteredArticles.length;

  useEffect(() => {
    setVisibleCount(ARTICLE_PAGE_SIZE);
  }, [category, normalizedQuery, articles, sortOrder]);

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

  const openArticle = (article: ArticleItem) => {
    setLocalActiveId(article.id);
    onReadArticle(article.id);
  };

  const closeArticle = () => {
    setLocalActiveId(null);
    onClearExternalSelection?.();
  };

  const visibleArticles = filteredArticles.slice(0, visibleCount);
  const bannerArticle = visibleArticles[0];
  const gridArticles = visibleArticles.slice(1);

  return (
    <ContentSection aria-label="文章列表">
      {/* 顶部分类：PC 端间距按断点递进 6/8/12/16px，移动端保持原刻度 */}
      <div className="sticky top-14 z-10 border-b border-app-border bg-app-filter/95 px-2 backdrop-blur-xl">
        <div className="flex items-center gap-2 py-2">
          <div
            role="tablist"
            aria-label="文章分类"
            className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {(['全部', ...filterCategories] as ArticleCategory[]).map((item) => {
              const active = category === item;
              return (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setCategory(item);
                    if (item === '全部') onRefresh?.();
                  }}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] transition-colors ${
                    active
                      ? 'bg-app-primary font-medium text-white dark:bg-app-card dark:text-app-text'
                      : 'bg-black/[0.04] text-app-muted hover:bg-black/[0.07] dark:bg-white/[0.08] dark:text-app-muted'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <TimeSortButton order={sortOrder} onChange={setSortOrder} className="hidden md:flex" />
        </div>
      </div>

      {/* Banner: 仅移动端显示，PC 端所有文章都用普通卡片 */}
      {bannerArticle && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SWIFTUI_SMOOTH}
          className="relative mx-2 h-52 overflow-hidden rounded-app bg-black sm:hidden"
        >
          <button
            type="button"
            onClick={() => openArticle(bannerArticle)}
            className="block h-full w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-primary"
            aria-label={`阅读文章：${bannerArticle.title}`}
          >
            <ResilientImage
              src={bannerArticle.cover}
              alt={bannerArticle.title}
              fallbackTitle={bannerArticle.title}
              className="h-full w-full object-cover transition-transform duration-500 ease-out hover:scale-[1.02]"
            />
          </button>
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
          <span className="absolute left-2 top-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
            {bannerArticle.category}
          </span>
          {commentsEnabled && (
            <span className="pointer-events-none absolute right-2 top-2 flex h-7 items-center gap-1 rounded-full bg-black/45 px-2 text-white backdrop-blur-sm">
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="text-[11px] font-medium tabular-nums">
                {bannerArticle.commentCount || 0}
              </span>
            </span>
          )}
          <div className="pointer-events-none absolute inset-x-2 bottom-2">
            <h2 className="text-xl sm:text-3xl font-semibold leading-tight text-white line-clamp-2">
              {bannerArticle.title}
            </h2>
            {bannerArticle.excerpt && (
              <p className="mt-1 text-[12px] sm:text-sm leading-relaxed text-white/75 line-clamp-2">
                {bannerArticle.excerpt}
              </p>
            )}
          </div>
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
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
                  ? 'bg-app-favorite/25 text-app-favorite'
                  : 'bg-black/45 text-white hover:bg-black/60'
              }`}
            >
              <Star className={`w-4 h-4 ${savedIds.includes(bannerArticle.id) ? 'fill-current' : ''}`} />
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* 瀑布流：移动端第一条由横幅展示（此处隐藏），PC 端全部显示 */}
      <div className="columns-2 gap-2 rounded-app bg-app-bg p-2 md:columns-3 xl:columns-4 2xl:columns-5">
        {visibleArticles.map((article, idx) => {
          const isSaved = savedIds.includes(article.id);
          const isLiked = likedIds.includes(article.id);
          return (
            <motion.article
              key={article.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...SWIFTUI_SMOOTH, delay: Math.min(idx, 8) * 0.03 }}
              className={`break-inside-avoid pb-2 ${idx === 0 ? 'hidden sm:block' : ''}`}
            >
              <div className="group overflow-hidden rounded-app bg-app-card border border-app-border transition-shadow hover:shadow-md">
                <div className="relative overflow-hidden">
                  <button
                    type="button"
                    onClick={() => openArticle(article)}
                    className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-primary"
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
                  {commentsEnabled && (
                    <span className="pointer-events-none absolute right-2 top-2 flex h-7 items-center gap-1 rounded-full bg-black/45 px-2 text-white backdrop-blur-sm">
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-medium tabular-nums">
                        {article.commentCount || 0}
                      </span>
                    </span>
                  )}

                  {/* 底部渐变：标题与简介在左下、收藏在右下 */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
                  <div className="pointer-events-none absolute bottom-2 left-2 right-[4.75rem] z-10">
                    <h3 className="truncate text-[16px] font-semibold leading-snug text-white sm:text-[18px]">
                      {article.title.length > 20 ? `${article.title.slice(0, 20)}…` : article.title}
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
                        ? 'bg-app-favorite/25 text-app-favorite'
                        : 'bg-black/45 text-white hover:bg-black/60'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                  </motion.button>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>

      {/* 筛选无结果复用公共空态；有结果时保留触底加载提示 */}
      {filteredArticles.length === 0 ? (
        <EmptyState
          icon={Newspaper}
          title="暂无文章"
          description="换个分类或搜索词试试"
          compact
        />
      ) : hasMore ? (
        <div ref={loadMoreRef} className="flex justify-center py-2">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => Math.min(count + ARTICLE_PAGE_SIZE, filteredArticles.length))}
            className="rounded-full bg-app-surface px-5 py-2 text-[12px] font-medium text-app-muted transition-colors hover:bg-[#E8E8ED] dark:bg-app-card dark:text-app-muted dark:hover:bg-[#242426]"
          >
            加载更多
          </button>
        </div>
      ) : (
        <p className="py-2 text-center text-[12px] text-app-muted">没有更多了</p>
      )}

      <ArticleReader
        articles={articles}
        articleId={externalSelectedId || localActiveId}
        likedIds={likedIds}
        savedIds={savedIds}
        onToggleLike={onToggleLike}
        onToggleSave={onToggleSave}
        onClose={closeArticle}
      />
    </ContentSection>
  );
}
