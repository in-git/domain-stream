import { useMemo, useState } from 'react';
import { Star, FileText, Film, Heart, Image as ImageIcon, Sparkles } from 'lucide-react';
import type { ArticleItem, PhotoItem, VideoItem } from '../../types/content';
import type { FavoriteTarget } from '../shared/FavoriteDetailModal';

export type FavoriteKind = 'video' | 'article' | 'graphic';
export type CollectionMode = 'favorite' | 'like';
export type FavoriteTab = 'all' | FavoriteKind;

export interface FavoritesViewProps {
  videos: VideoItem[];
  articles: ArticleItem[];
  photos: PhotoItem[];
  ids: string[];
  onToggle: (id: string) => void;
  mode?: CollectionMode;
  likedIds: string[];
  savedIds: string[];
  onToggleLike: (id: string) => void;
  onToggleSave: (id: string) => void;
}

interface ModeMeta {
  heading: string;
  orderHint: string;
  emptyHint: string;
  emptyKindHint: (label: string) => string;
  removeLabel: string;
  indicator: string;
  EmptyIcon: typeof Film;
  RemoveIcon: typeof Film;
  reverseIds: boolean;
}

export const MODE_META: Record<CollectionMode, ModeMeta> = {
  favorite: {
    heading: '我的收藏',
    orderHint: '按收藏时间倒序',
    emptyHint: '还没有收藏内容，在视频、文章、图文页点击星星图标即可收藏',
    emptyKindHint: (label) => `还没有收藏的${label}`,
    removeLabel: '取消收藏',
    indicator: 'favorites-tab-indicator',
    EmptyIcon: FileText,
    RemoveIcon: Star,
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

export const KIND_META: Record<FavoriteKind, { label: string; Icon: typeof Film }> = {
  video: { label: '视频', Icon: Film },
  article: { label: '文章', Icon: FileText },
  graphic: { label: '图文', Icon: ImageIcon },
};

export const TABS: { id: FavoriteTab; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'video', label: '视频' },
  { id: 'article', label: '文章' },
  { id: 'graphic', label: '图文' },
];

export interface FavoriteEntry {
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
  const orderedIds = reverseIds ? ids.slice().reverse() : ids;

  return orderedIds.reduce<FavoriteEntry[]>((acc, id) => {
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

/** PC、移动端收藏/喜欢组件共用的数据模型，不包含布局与响应式分支 */
export function useFavoritesModel({
  videos,
  articles,
  photos,
  ids,
  onToggle,
  mode = 'favorite',
  likedIds,
  savedIds,
  onToggleLike,
  onToggleSave,
}: FavoritesViewProps) {
  const meta = MODE_META[mode];
  const [tab, setTab] = useState<FavoriteTab>('all');
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
    const base: Record<FavoriteTab, number> = { all: entries.length, video: 0, article: 0, graphic: 0 };
    entries.forEach((entry) => {
      base[entry.kind] += 1;
    });
    return base;
  }, [entries]);

  const visibleEntries = tab === 'all' ? entries : entries.filter((entry) => entry.kind === tab);
  const emptyHint =
    tab === 'all' ? meta.emptyHint : meta.emptyKindHint(KIND_META[tab].label);

  return {
    meta,
    mode,
    tab,
    setTab,
    counts,
    visibleEntries,
    emptyHint,
    activeItem,
    activeTarget,
    onToggle,
    likedIds,
    savedIds,
    onToggleLike,
    onToggleSave,
    openItem: (kind: FavoriteKind, id: string) => setActiveItem({ kind, id }),
    closeItem: () => setActiveItem(null),
  };
}
