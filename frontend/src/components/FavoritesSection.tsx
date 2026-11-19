import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { BookmarkX, FileText, Film, Image as ImageIcon } from 'lucide-react';
import type { ArticleItem, PhotoItem, VideoItem } from '../data/content';
import { SWIFTUI_SMOOTH } from '../lib/motion';
import { FavoriteDetailModal, type FavoriteTarget } from './FavoriteDetailModal';
import { ResilientImage } from './ResilientImage';

export type FavoriteKind = 'video' | 'article' | 'graphic';

interface FavoritesSectionProps {
  videos: VideoItem[];
  articles: ArticleItem[];
  photos: PhotoItem[];
  savedIds: string[];
  onToggleSave: (id: string) => void;
}

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
  savedIds: string[]
): FavoriteEntry[] {
  const videoMap = new Map(videos.map((item) => [item.id, item]));
  const articleMap = new Map(articles.map((item) => [item.id, item]));
  const photoMap = new Map(photos.map((item) => [item.id, item]));

  // 收藏列表按最近一次收藏在前展示；收藏 ID 指向的内容被删除时直接跳过
  return savedIds
    .slice()
    .reverse()
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

/** 个人中心的收藏列表：按类型筛选展示用户收藏的视频、文章、图文 */
export function FavoritesSection({
  videos,
  articles,
  photos,
  savedIds,
  onToggleSave,
}: FavoritesSectionProps) {
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
    () => buildEntries(videos, articles, photos, savedIds),
    [videos, articles, photos, savedIds]
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
    tab === 'all'
      ? '还没有收藏内容，在视频、文章、图文页点击书签图标即可收藏'
      : `还没有收藏的${KIND_META[tab].label}`;

  return (
    <>
    <section
      aria-labelledby="favorites-heading"
      className="rounded-3xl bg-white dark:bg-[#161618] border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-8 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2
            id="favorites-heading"
            className="text-base font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]"
          >
            我的收藏
          </h2>
          <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">
            共 {counts.all} 条 · 按收藏时间倒序
          </p>
        </div>

        <div
          role="tablist"
          aria-label="收藏类型筛选"
          className="flex items-center gap-1 rounded-full bg-[#F2F2F7] dark:bg-[#2C2C2E] p-1"
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
                className={`relative px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-[#1D1D1F] dark:text-[#F5F5F7]'
                    : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7]'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="favorites-tab-indicator"
                    transition={SWIFTUI_SMOOTH}
                    className="absolute inset-0 rounded-full bg-white dark:bg-[#3A3A3C] shadow-xs"
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
            key={`favorites-empty-${tab}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SWIFTUI_SMOOTH}
            className="rounded-2xl border border-dashed border-black/[0.08] dark:border-white/[0.12] px-5 py-10 text-center space-y-1.5"
          >
            <FileText className="w-5 h-5 mx-auto text-[#86868B]" />
            <p className="text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">暂无收藏</p>
            <p className="text-xs text-[#6E6E73] dark:text-[#98989D]">{emptyHint}</p>
          </motion.div>
        ) : (
          <motion.ul
            key={`favorites-${tab}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={SWIFTUI_SMOOTH}
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          >
            {visibleEntries.map((entry) => {
              const { label, Icon } = KIND_META[entry.kind];
              return (
                <li
                  key={`${entry.kind}-${entry.id}`}
                  className="group relative rounded-2xl overflow-hidden bg-[#FBFBFD] dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] transition-colors hover:border-black/[0.12] dark:hover:border-white/[0.16]"
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
                      className="w-full aspect-[16/10]"
                    />
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-md">
                      <Icon className="w-3 h-3" />
                      {label}
                    </span>
                    <div className="p-3 space-y-1">
                      <p className="text-[13px] font-medium leading-snug text-[#1D1D1F] dark:text-[#F5F5F7] line-clamp-2">
                        {entry.title}
                      </p>
                      <p className="text-[11px] text-[#6E6E73] dark:text-[#98989D] truncate">
                        {entry.meta}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleSave(entry.id)}
                    aria-label={`取消收藏：${entry.title}`}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/65"
                  >
                    <BookmarkX className="w-3.5 h-3.5" />
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </section>

    {/* 收藏详情：直接在当前页以弹窗打开，不跳转板块 */}
    <FavoriteDetailModal
      target={activeTarget}
      onClose={() => setActiveItem(null)}
      onRemove={onToggleSave}
    />
    </>
  );
}
