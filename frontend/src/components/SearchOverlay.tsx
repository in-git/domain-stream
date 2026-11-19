import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  FileText,
  Film,
  Image as ImageIcon,
  MessageCircleHeart,
  Search,
  SearchX,
  X,
} from 'lucide-react';
import type { ArticleItem, MessageItem, PhotoItem, SectionId, VideoItem } from '../data/content';
import { SWIFTUI_SMOOTH } from '../lib/motion';
import { FavoriteDetailModal, type FavoriteTarget } from './FavoriteDetailModal';
import { ResilientImage } from './ResilientImage';

interface SearchOverlayProps {
  /** 底部导航当前所处的模块，决定搜索范围 */
  section: SectionId;
  videos: VideoItem[];
  articles: ArticleItem[];
  photos: PhotoItem[];
  messages: MessageItem[];
  onClose: () => void;
}

type RowKind = 'video' | 'article' | 'graphic' | 'message';

type SearchRow =
  | { kind: 'video'; video: VideoItem }
  | { kind: 'article'; article: ArticleItem }
  | { kind: 'graphic'; photo: PhotoItem }
  | { kind: 'message'; message: MessageItem };

const SCOPE: Record<SectionId, RowKind[]> = {
  videos: ['video'],
  articles: ['article'],
  gallery: ['graphic'],
  messages: ['message'],
  // 个人中心没有专属内容，搜索全部模块
  profile: ['video', 'article', 'graphic', 'message'],
};

const SCOPE_LABEL: Record<SectionId, string> = {
  videos: '视频',
  articles: '文章',
  gallery: '图文',
  messages: '留言',
  profile: '全部内容',
};

const KIND_META: Record<RowKind, { Icon: typeof Film }> = {
  video: { Icon: Film },
  article: { Icon: FileText },
  graphic: { Icon: ImageIcon },
  message: { Icon: MessageCircleHeart },
};

function includes(fields: (string | undefined)[], keyword: string): boolean {
  return fields.some((field) => (field || '').toLowerCase().includes(keyword));
}

function rowId(row: SearchRow): string {
  return row.kind === 'video'
    ? row.video.id
    : row.kind === 'article'
      ? row.article.id
      : row.kind === 'graphic'
        ? row.photo.id
        : row.message.id;
}

function rowTitle(row: SearchRow): string {
  return row.kind === 'video'
    ? row.video.title
    : row.kind === 'article'
      ? row.article.title
      : row.kind === 'graphic'
        ? row.photo.title
        : row.message.content;
}

function rowMeta(row: SearchRow): string {
  if (row.kind === 'video') {
    return [row.video.category, row.video.durationLabel, row.video.director]
      .filter(Boolean)
      .join(' · ');
  }
  if (row.kind === 'article') {
    return [row.article.category, row.article.author, row.article.date]
      .filter(Boolean)
      .join(' · ');
  }
  if (row.kind === 'graphic') {
    return [row.photo.album, row.photo.location, row.photo.date].filter(Boolean).join(' · ');
  }
  return [row.message.nickname, (row.message.createdAt || '').slice(0, 10)]
    .filter(Boolean)
    .join(' · ');
}

/** 移动端独立搜索模块：按当前底部导航模块检索，结果一到一列 */
export function SearchOverlay({
  section,
  videos,
  articles,
  photos,
  messages,
  onClose,
}: SearchOverlayProps) {
  const [query, setQuery] = useState('');
  const [activeTarget, setActiveTarget] = useState<FavoriteTarget>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scope = SCOPE[section];
  const scopeLabel = SCOPE_LABEL[section];
  const keyword = query.trim().toLowerCase();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 打开搜索页时锁背景滚动；ESC 先关详情弹窗再关搜索页
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (activeTarget) return;
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeTarget, onClose]);

  const results = useMemo<SearchRow[]>(() => {
    if (!keyword) return [];
    const rows: SearchRow[] = [];
    const wants = (kind: RowKind) => scope.includes(kind);

    if (wants('video')) {
      videos
        .filter((video) =>
          includes([video.title, video.subtitle, video.director, video.category], keyword)
        )
        .forEach((video) => rows.push({ kind: 'video', video }));
    }
    if (wants('article')) {
      articles
        .filter((article) =>
          includes([article.title, article.excerpt, article.author, article.category], keyword)
        )
        .forEach((article) => rows.push({ kind: 'article', article }));
    }
    if (wants('graphic')) {
      photos
        .filter((photo) =>
          includes([photo.title, photo.album, photo.location, photo.camera], keyword)
        )
        .forEach((photo) => rows.push({ kind: 'graphic', photo }));
    }
    if (wants('message')) {
      messages
        .filter((message) => includes([message.content, message.nickname], keyword))
        .forEach((message) => rows.push({ kind: 'message', message }));
    }

    return rows.slice(0, 60);
  }, [keyword, scope, videos, articles, photos, messages]);

  const openRow = (row: SearchRow) => {
    if (row.kind === 'video') setActiveTarget({ kind: 'video', video: row.video });
    else if (row.kind === 'article') setActiveTarget({ kind: 'article', article: row.article });
    else if (row.kind === 'graphic') setActiveTarget({ kind: 'graphic', photo: row.photo });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={SWIFTUI_SMOOTH}
      className="fixed inset-0 z-50 flex flex-col bg-[#FBFBFD] dark:bg-[#000000] text-[#1D1D1F] dark:text-[#F5F5F7]"
    >
      <header className="shrink-0 flex items-center gap-2 px-3 h-14 border-b border-black/[0.06] dark:border-white/[0.08]">
        <button
          type="button"
          onClick={onClose}
          aria-label="返回"
          className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="relative flex flex-1 items-center">
          <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`搜索${scopeLabel}`}
            aria-label={`搜索${scopeLabel}`}
            enterKeyHint="search"
            className="w-full h-9 pl-9 pr-9 rounded-full bg-[#EEEEF0] dark:bg-[#1C1C1E] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/35 transition-shadow"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="清空搜索"
              className="absolute right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {keyword && results.length > 0 && (
          <p className="px-4 pt-3 pb-1 text-[11px] text-[#86868B]">
            在{scopeLabel}中找到 {results.length} 条结果
          </p>
        )}

        {!keyword && (
          <div className="px-6 py-20 text-center space-y-2">
            <Search className="w-6 h-6 mx-auto text-[#AEAEB2]" />
            <p className="text-sm font-medium">搜索{scopeLabel}</p>
            <p className="text-xs text-[#86868B]">输入关键词，检索当前模块下的内容</p>
          </div>
        )}

        {keyword && results.length === 0 && (
          <div className="px-6 py-20 text-center space-y-2">
            <SearchX className="w-6 h-6 mx-auto text-[#AEAEB2]" />
            <p className="text-sm font-medium">没有找到相关内容</p>
            <p className="text-xs text-[#86868B]">换个关键词试试</p>
          </div>
        )}

        {results.length > 0 && (
          <ul className="divide-y divide-black/[0.05] dark:divide-white/[0.06]">
            {results.map((row) => {
              const { Icon } = KIND_META[row.kind];
              const clickable = row.kind !== 'message';
              const content = (
                <>
                  {row.kind === 'video' && (
                    <ResilientImage
                      src={row.video.cover}
                      alt={row.video.title}
                      fallbackTitle={row.video.title}
                      className="w-16 h-16 rounded-xl shrink-0"
                    />
                  )}
                  {row.kind === 'article' && (
                    <ResilientImage
                      src={row.article.cover}
                      alt={row.article.title}
                      fallbackTitle={row.article.title}
                      className="w-16 h-16 rounded-xl shrink-0"
                    />
                  )}
                  {row.kind === 'graphic' && (
                    <ResilientImage
                      src={row.photo.src}
                      alt={row.photo.title}
                      fallbackTitle={row.photo.title}
                      className="w-16 h-16 rounded-xl shrink-0"
                    />
                  )}
                  {row.kind === 'message' && (
                    <span className="w-16 h-16 rounded-xl shrink-0 bg-[#F2F2F7] dark:bg-white/[0.06] flex items-center justify-center text-[#86868B]">
                      <Icon className="w-5 h-5" />
                    </span>
                  )}

                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium leading-snug text-[#1D1D1F] dark:text-[#F5F5F7] line-clamp-2">
                      {rowTitle(row)}
                    </span>
                    <span className="mt-1 block text-[11px] text-[#86868B] truncate">
                      {rowMeta(row)}
                    </span>
                  </span>

                  <Icon className="w-4 h-4 shrink-0 text-[#AEAEB2]" />
                </>
              );

              return (
                <li key={`${row.kind}-${rowId(row)}`}>
                  {clickable ? (
                    <button
                      type="button"
                      onClick={() => openRow(row)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-3">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AnimatePresence>
        <FavoriteDetailModal target={activeTarget} onClose={() => setActiveTarget(null)} />
      </AnimatePresence>
    </motion.div>
  );
}
