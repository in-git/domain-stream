import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
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
import { EmptyState } from '../../components/PortalStates';
import type { ArticleItem, MessageItem, PhotoItem, SectionId, VideoItem } from '../../types/content';
import { SWIFTUI_SMOOTH } from '../../lib/motion';
import { FavoriteDetailModal, type FavoriteTarget } from '../shared/FavoriteDetailModal';
import { ResilientImage } from '../../components/ResilientImage';

interface SearchOverlayProps {
  /** 底部导航当前所处的模块，决定搜索范围 */
  section: SectionId;
  videos: VideoItem[];
  articles: ArticleItem[];
  photos: PhotoItem[];
  messages: MessageItem[];
  onClose: () => void;
  /** 点击文章结果：交给文章板块用同一个阅读器打开 */
  onOpenArticle?: (articleId: string) => void;
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
  // 个人中心和设置页没有专属内容，搜索全部模块
  profile: ['video', 'article', 'graphic', 'message'],
  settings: ['video', 'article', 'graphic', 'message'],
};

const SCOPE_LABEL: Record<SectionId, string> = {
  videos: '视频',
  articles: '文章',
  gallery: '图文',
  messages: '留言',
  profile: '全部内容',
  settings: '全部内容',
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
  onOpenArticle,
}: SearchOverlayProps) {
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState(''); // 已提交的查询：输入不触发搜索，点按钮/Enter 才更新
  const [activeTarget, setActiveTarget] = useState<FavoriteTarget>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scope = SCOPE[section];
  const scopeLabel = SCOPE_LABEL[section];
  const keyword = query.trim().toLowerCase();

  const submitSearch = () => setQuery(draft.trim());
  const clearSearch = () => {
    setDraft('');
    setQuery('');
    inputRef.current?.focus();
  };

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
    if (row.kind === 'article') {
      // 文章与卡片点击共用同一个阅读器：交给文章板块打开，并关闭搜索页
      onOpenArticle?.(row.article.id);
      onClose();
      return;
    }
    if (row.kind === 'video') setActiveTarget({ kind: 'video', video: row.video });
    else if (row.kind === 'graphic') setActiveTarget({ kind: 'graphic', photo: row.photo });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={SWIFTUI_SMOOTH}
      className="fixed inset-0 z-50 flex flex-col bg-app-surface dark:bg-[#000000] text-app-text"
    >
      <header className="shrink-0 flex items-center gap-2 px-3 h-14 border-b border-app-border">
        <button
          type="button"
          onClick={onClose}
          aria-label="返回"
          className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-app-text hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="relative flex flex-1 items-center">
          <Search className="w-4 h-4 text-app-muted absolute left-3.5 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submitSearch();
                inputRef.current?.blur();
              }
            }}
            placeholder={`搜索${scopeLabel}`}
            aria-label={`搜索${scopeLabel}`}
            enterKeyHint="search"
            className="w-full h-9 pl-9 pr-[4.5rem] rounded-full bg-app-surface dark:bg-app-card text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:ring-2 focus:ring-app-primary/35 transition-shadow"
          />
          {draft && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="清空搜索"
              className="absolute right-10 w-5 h-5 rounded-full flex items-center justify-center text-app-muted hover:text-app-text dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              submitSearch();
              inputRef.current?.blur();
            }}
            aria-label="搜索"
            title="搜索"
            className="absolute right-1.5 w-7 h-7 rounded-full bg-app-primary hover:bg-app-primary text-white flex items-center justify-center transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {keyword && results.length > 0 && (
          <p className="px-4 pt-3 pb-1 text-[11px] text-app-muted">
            在{scopeLabel}中找到 {results.length} 条结果
          </p>
        )}

        {!keyword && (
          <div className="px-6 py-20 text-center space-y-2">
            <Search className="w-6 h-6 mx-auto text-app-subtle" />
            <p className="text-sm font-medium">搜索{scopeLabel}</p>
            <p className="text-xs text-app-muted">输入关键词，检索当前模块下的内容</p>
          </div>
        )}

        {keyword && results.length === 0 && (
          <EmptyState
            icon={SearchX}
            title="没有找到相关内容"
            description="换个关键词试试"
            className="border-0 bg-transparent dark:bg-transparent"
          />
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
                      className="w-16 h-16 rounded-app shrink-0"
                    />
                  )}
                  {row.kind === 'article' && (
                    <ResilientImage
                      src={row.article.cover}
                      alt={row.article.title}
                      fallbackTitle={row.article.title}
                      className="w-16 h-16 rounded-app shrink-0"
                    />
                  )}
                  {row.kind === 'graphic' && (
                    <ResilientImage
                      src={row.photo.src}
                      alt={row.photo.title}
                      fallbackTitle={row.photo.title}
                      className="w-16 h-16 rounded-app shrink-0"
                    />
                  )}
                  {row.kind === 'message' && (
                    <span className="w-16 h-16 rounded-app shrink-0 bg-app-surface dark:bg-white/[0.06] flex items-center justify-center text-app-muted">
                      <Icon className="w-5 h-5" />
                    </span>
                  )}

                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium leading-snug text-app-text line-clamp-2">
                      {rowTitle(row)}
                    </span>
                    <span className="mt-1 block text-[11px] text-app-muted truncate">
                      {rowMeta(row)}
                    </span>
                  </span>

                  <Icon className="w-4 h-4 shrink-0 text-app-subtle" />
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

      <FavoriteDetailModal target={activeTarget} onClose={() => setActiveTarget(null)} />
    </motion.div>
  );
}
