import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookmarkX, FileText, Film, Heart, Image as ImageIcon, Sparkles } from 'lucide-react';
import type { ArticleItem, PhotoItem, VideoItem } from '../../data/content';
import { SWIFTUI_SMOOTH } from '../../lib/motion';
import { FavoriteDetailModal, type FavoriteTarget } from '../shared/FavoriteDetailModal';
import { ResilientImage } from '../../components/ResilientImage';
import { EmptyState } from '../../components/PortalStates';

export type FavoriteKind = 'video' | 'article' | 'graphic';
type CollectionMode = 'favorite' | 'like';

interface FavoritesSectionProps {
  videos: VideoItem[];
  articles: ArticleItem[];
  photos: PhotoItem[];
  /** 收藏/喜欢的内容ID列表 */
  ids: string[];
  onToggle: (id: string) => void;
  mode?: CollectionMode;
}

const MODE_META: Record<CollectionMode, {
  heading: string;
  orderHint: string;
  emptyHint: string;
  emptyKindHint: (label: string) => string;
  removeLabel: string;
  indicator: string;
  EmptyIcon: typeof Film;
  RemoveIcon: typeof Film;
  /** 收藏列表本地按时间追加，需要倒序；喜欢列表后端已按时间倒序返回 */
  reverseIds: boolean;
}> = {
  favorite: {
    heading: '我的收藏',
    orderHint: '按收藏时间倒序',
    emptyHint: '还没有收藏内容，在视频、文章、图文页点击书签图标即可收藏',
    emptyKindHint: (label) => `还没有收藏的${label}`,
    removeLabel: '取消收藏',
    indicator: 'favorites-tab-indicator',
    EmptyIcon: FileText,
    RemoveIcon: BookmarkX,
    reverseIds: true,
  },
  like: {
    heading: '我的喜欢',
    orderHint: '按喜欢时间倒序',
    emptyHint: '还没有喜欢内容，在视频、文章、图文页点击爱心图标即可喜欢',
    emptyKindHint: (label) => `还没有喜欢的${label}`,
    removeLabel: '删除',
    indicator: 'likes-tab-indicator',
    EmptyIcon: Sparkles,
    RemoveIcon: Heart,
    reverseIds: false,
  },
};

const KIND_META: Record<FavoriteKind, { label: string; Icon: typeof Film }> = {
  video: { label: '视频', Icon: Film },
  article: { label: '文章', Icon: FileText },
  graphic: { label: '图文', Icon: ImageIcon },
};

const TABS: { id: 'all' | FavoriteKind; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'video', label: '视频' },
  { id: 'article', label: '文章' },
  { id: 'graphic', label: '图文' },
];

interface FavoriteEntry {
  kind: FavoriteKind;
  id: string;
  title: string;
  cover: string;
  meta: string;
}

function buildEntries(
  videos: VideoItem[],
  articles: ArticleItem[],
  photos: PhotoItem[],
  ids: string[],
  reverseIds: boolean
): FavoriteEntry[] {
  const videoMap = new Map(videos.map((item) => [item.id, item]));
  const articleMap = new Map(articles.map((item) => [item.id, item]));
  const photoMap = new Map(photos.map((item) => [item.id, item]));

  // 内容被删除时直接跳过；收藏本地记录是追加顺序，需倒序展示
  const orderedIds = reverseIds ? ids.slice().reverse() : ids;
  return orderedIds
    .reduce<FavoriteEntry[]>((acc, id) => {
      const video = videoMap.get(id);
      if (video) {
        acc.push({
          kind: 'video',
          id,
          title: video.title,
          cover: video.cover,
          meta: [video.category, video.durationLabel].filter(Boolean).join(' · '),
        });
        return acc;
      }
      const article = articleMap.get(id);
      if (article) {
        acc.push({
          kind: 'article',
          id,
          title: article.title,
          cover: article.cover,
          meta: [article.category, article.author].filter(Boolean).join(' · '),
        });
        return acc;
      }
      const photo = photoMap.get(id);
      if (photo) {
        acc.push({
          kind: 'graphic',
          id,
          title: photo.title,
          cover: photo.src,
          meta: [photo.album, `${photo.images.length} 张图片`].filter(Boolean).join(' · '),
        });
      }
      return acc;
    }, []);
}

/** 个人中心的收藏/喜欢列表：按类型筛选展示对应的视频、文章、图文 */
export function FavoritesSection({
  videos,
  articles,
  photos,
  ids,
  onToggle,
  mode = 'favorite',
}: FavoritesSectionProps) {
  const meta = MODE_META[mode];
  const [tab, setTab] = useState<'all' | FavoriteKind>('all');
  /** 当前在弹窗中查看的收藏项 */
  const [activeItem, setActiveItem] = useState<{ kind: FavoriteKind; id: string } | null>(null);

  const activeTarget = useMemo<FavoriteTarget>(() => {
    if (!activeItem) return null;
    if (activeItem.kind === 'video') {
      const video = videos.find((item) => item.id === activeItem.id);
      return video ? { kind: 'video', video } : null;
    }
    if (activeItem.kind === 'article') {
      const article = articles.find((item) => item.id === activeItem.id);
      return article ? { kind: 'article', article } : null;
    }
    const photo = photos.find((item) => item.id === activeItem.id);
    return photo ? { kind: 'graphic', photo } : null;
  }, [activeItem, videos, articles, photos]);

  const entries = useMemo(
    () => buildEntries(videos, articles, photos, ids, meta.reverseIds),
    [videos, articles, photos, ids, meta.reverseIds]
  );

  const counts = useMemo(() => {
    const base: Record<'all' | FavoriteKind, number> = {
      all: entries.length,
      video: 0,
      article: 0,
      graphic: 0,
    };
    entries.forEach((entry) => {
      base[entry.kind] += 1;
    });
    return base;
  }, [entries]);

  const visibleEntries = tab === 'all' ? entries : entries.filter((entry) => entry.kind === tab);
  const emptyHint =
    tab === 'all' ? meta.emptyHint : meta.emptyKindHint(KIND_META[tab].label);

  return (
    <>
    <section
      aria-labelledby={`${mode}-heading`}
      className="space-y-5 rounded-none bg-white p-5 sm:rounded-3xl sm:border sm:border-black/[0.06] sm:p-7 dark:bg-[#161618] sm:dark:border-white/[0.08]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2
            id={`${mode}-heading`}
            className="text-base font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]"
          >
            {meta.heading}
          </h2>
          <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">
            共 {counts.all} 条 · {meta.orderHint}
          </p>
        </div>

        <div
          role="tablist"
          aria-label={`${meta.heading}类型筛选`}
          className="flex items-center gap-1 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] p-0.5 sm:p-1"
        >
          {TABS.map((item) => {
            const isActive = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(item.id)}
                className={`relative px-2.5 py-1 text-[11px] font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-xs ${
                  isActive
                    ? 'text-[#1D1D1F] dark:text-[#F5F5F7]'
                    : 'text-[#8E8E93] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId={meta.indicator}
                    transition={SWIFTUI_SMOOTH}
                    className="absolute inset-x-1 -bottom-1 h-0.5 rounded-full bg-[#1D1D1F] dark:bg-[#F5F5F7]"
                  />
                )}
                <span className="relative">
                  {item.label}
                  <span className="ml-1 tabular-nums opacity-60">{counts[item.id]}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {visibleEntries.length === 0 ? (
          <motion.div
            key={`${mode}-empty-${tab}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SWIFTUI_SMOOTH}
          >
            <EmptyState
              icon={meta.EmptyIcon}
              title={mode === 'favorite' ? '暂无收藏' : '暂无喜欢'}
              description={emptyHint}
              compact
              className="rounded-none sm:rounded-2xl"
            />
          </motion.div>
        ) : (
          <motion.ul
            key={`${mode}-${tab}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={SWIFTUI_SMOOTH}
            className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-5"
          >
            {visibleEntries.map((entry) => {
              const { label, Icon } = KIND_META[entry.kind];
              return (
                <li
                  key={`${entry.kind}-${entry.id}`}
                  className="group relative overflow-hidden rounded-xl bg-[#111111] shadow-sm ring-1 ring-black/[0.06] transition duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:rounded-2xl dark:ring-white/[0.08]"
                >
                  <button
                    type="button"
                    onClick={() => setActiveItem({ kind: entry.kind, id: entry.id })}
                    className="block w-full text-left"
                    aria-label={`查看${label}：${entry.title}`}
                  >
                    <ResilientImage
                      src={entry.cover}
                      alt={entry.title}
                      fallbackTitle={entry.title}
                      className="aspect-[3/4] w-full transition-transform duration-500 group-hover:scale-[1.04]"
                    />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-md">
                      <Icon className="h-3 w-3" />
                      {label}
                    </span>
                    <span className="absolute inset-x-0 bottom-0 block p-3">
                      <span className="block text-[13px] font-medium leading-snug text-white line-clamp-2">
                        {entry.title}
                      </span>
                      <span className="mt-1 block truncate text-[11px] text-white/60">
                        {entry.meta}
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggle(entry.id)}
                    aria-label={`${meta.removeLabel}：${entry.title}`}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/65"
                  >
                    <meta.RemoveIcon className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>

    {/* 内容详情：直接在当前页以弹窗打开，不跳转板块 */}
    <FavoriteDetailModal
      target={activeTarget}
      onClose={() => setActiveItem(null)}
      onRemove={onToggle}
      removeLabel={meta.removeLabel}
      removeIcon={mode === 'like' ? 'heart' : 'bookmark'}
    />
    </>
  );
}
