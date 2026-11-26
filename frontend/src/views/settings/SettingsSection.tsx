/**
 * 设置模块的 PC 版本：左侧分类 + 右侧详情。
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  Star,
  Database,
  Heart,
  Info,
  MessageCircle,
  Settings,
  Trash2,
  UserRound,
} from 'lucide-react';
import type { ArticleItem, PhotoItem, VideoItem } from '../../types/content';
import { parseContactLinks, useSystemInfo } from '../../lib/systemInfo';
import { FavoritesPCView } from '../profile/FavoritesPCView';

export type SettingKey = 'profile' | 'likes' | 'favorites' | 'cache' | 'about' | 'messages';

interface SettingsSectionProps {
  /** 已迁移进来的个人中心内容 */
  profileContent: ReactNode;
  /** 已迁移进来的留言墙内容 */
  messagesContent: ReactNode;
  /** 打开喜欢/收藏时按需加载内容数据 */
  onOpenFavorites: () => void;
  /** 打开留言时按需加载留言数据 */
  onOpenMessages: () => void;
  /** 个人中心入口触发计数，变化时回到个人中心分类 */
  profileFocusToken: number;
  videos: VideoItem[];
  articles: ArticleItem[];
  photos: PhotoItem[];
  likedIds: string[];
  savedIds: string[];
  onToggleLike: (id: string) => void;
  onToggleSave: (id: string) => void;
}

const CACHE_KEYS = [
  'lumina:video-progress',
  'lumina:favorites',
  'lumina:saved',
  'lumina:dark',
  'lumina:profile:v2',
  'lumina:liked',
  'lumina:last-section',
];

const SETTING_ITEMS = [
  {
    key: 'profile',
    label: '个人中心',
    description: '查看并编辑账号资料',
    Icon: UserRound,
  },
  {
    key: 'likes',
    label: '喜欢',
    description: '查看已喜欢的内容',
    Icon: Heart,
  },
  {
    key: 'favorites',
    label: '收藏',
    description: '查看已收藏的内容',
    Icon: Star,
  },
  {
    key: 'cache',
    label: '缓存设置',
    description: '清理本地播放进度与偏好缓存',
    Icon: Database,
  },
  {
    key: 'about',
    label: '关于',
    description: '查看当前站点与客户端信息',
    Icon: Info,
  },
  {
    key: 'messages',
    label: '留言',
    description: '查看和发布留言',
    Icon: MessageCircle,
  },
] as const;

function formatCacheSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function readCacheStats(): { count: number; size: string } {
  let count = 0;
  let bytes = 0;
  for (const key of CACHE_KEYS) {
    const raw = window.localStorage.getItem(key);
    if (!raw) continue;
    count += 1;
    bytes += raw.length;
  }
  return { count, size: formatCacheSize(bytes) };
}

export function SettingDetail({
  itemKey,
  profileContent,
  messagesContent = null,
  dense = false,
  videos = [],
  articles = [],
  photos = [],
  likedIds = [],
  savedIds = [],
  onToggleLike = () => {},
  onToggleSave = () => {},
}: {
  itemKey: SettingKey;
  profileContent: ReactNode;
  messagesContent?: ReactNode;
  dense?: boolean;
  videos?: VideoItem[];
  articles?: ArticleItem[];
  photos?: PhotoItem[];
  likedIds?: string[];
  savedIds?: string[];
  onToggleLike?: (id: string) => void;
  onToggleSave?: (id: string) => void;
}) {
  const { title, config } = useSystemInfo();
  const [notice, setNotice] = useState('');
  const [cacheVersion, setCacheVersion] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cacheStats = useMemo(() => readCacheStats(), [cacheVersion]);

  useEffect(() => {
    setNotice('');
    setConfirmOpen(false);
  }, [itemKey]);

  useEffect(() => {
    if (!confirmOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setConfirmOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [confirmOpen]);

  function clearCache() {
    for (const key of CACHE_KEYS) {
      window.localStorage.removeItem(key);
    }
    setCacheVersion((value) => value + 1);
    setNotice('已清理本地缓存，刷新页面后完全生效');
  }

  if (itemKey === 'profile') {
    return <div className="min-w-0">{profileContent}</div>;
  }

  if (itemKey === 'messages') {
    return <div className="min-w-0 p-2">{messagesContent}</div>;
  }

  if (itemKey === 'likes' || itemKey === 'favorites') {
    const isLikes = itemKey === 'likes';
    return (
      <FavoritesPCView
        videos={videos}
        articles={articles}
        photos={photos}
        ids={isLikes ? likedIds : savedIds}
        onToggle={isLikes ? onToggleLike : onToggleSave}
        mode={isLikes ? 'like' : 'favorite'}
        likedIds={likedIds}
        savedIds={savedIds}
        onToggleLike={onToggleLike}
        onToggleSave={onToggleSave}
      />
    );
  }

  if (itemKey === 'cache') {
    return (
      <>
        <div className="space-y-4 p-2">
          <div>
            <h2 className="text-lg font-semibold text-app-text">缓存设置</h2>
            <p className="mt-1 text-[13px] text-app-muted">
              仅清理本地缓存，不会退出登录
            </p>
          </div>

          <div className="rounded-app border-[0.5px] border-app-border bg-[#FAFAFC] px-4 py-3.5 dark:border-app-border dark:bg-white/5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-app-muted dark:text-white/60">缓存项</span>
              <span className="font-medium text-app-text">{cacheStats.count}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[13px]">
              <span className="text-app-muted dark:text-white/60">占用空间</span>
              <span className="font-medium text-app-text">{cacheStats.size}</span>
            </div>
            <div className="mt-3 flex justify-end border-t border-app-border pt-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="inline-flex h-7 items-center gap-1 rounded-app border border-app-border bg-app-card px-2.5 text-[11px] font-medium text-app-muted transition-colors hover:border-[#FF3B30]/40 hover:text-[#FF3B30]"
              >
                <Trash2 className="h-3 w-3" />
                清理缓存
              </button>
            </div>
          </div>

          {notice && (
            <p className="rounded-app bg-app-surface px-3 py-2 text-[12px] text-app-muted dark:bg-white/5 dark:text-white/60">
              {notice}
            </p>
          )}
        </div>

        {confirmOpen &&
          createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 px-6 backdrop-blur-sm"
              onClick={() => setConfirmOpen(false)}
            >
              <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="clear-cache-title"
                aria-describedby="clear-cache-description"
                className="w-full max-w-[320px] rounded-app bg-app-bg p-5 text-center shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#FF3B30]/10 text-[#FF3B30]">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <h2 id="clear-cache-title" className="mt-3 text-[16px] font-semibold text-app-text">
                  清理本地缓存？
                </h2>
                <p id="clear-cache-description" className="mt-2 text-[13px] leading-relaxed text-app-muted">
                  此操作会删除播放进度、收藏、喜欢、主题和资料缓存，且不可恢复；不会退出当前账号。确定继续吗？
                </p>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(false)}
                    className="flex-1 rounded-app bg-app-surface py-2 text-[13px] font-medium text-app-text"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      clearCache();
                      setConfirmOpen(false);
                    }}
                    className="flex-1 rounded-app bg-[#FF3B30] py-2 text-[13px] font-medium text-white"
                  >
                    确认清理
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )}
      </>
    );
  }

  if (itemKey === 'about') {
    const clientUrl = (config.clientUrl || '').trim();
    const contacts = parseContactLinks(config.contactLinks);

    return (
      <div className={`space-y-4 ${dense ? 'px-3 py-4' : 'p-2'}`}>
        <div>
          <h2 className="text-[18px] font-bold text-app-text">关于</h2>
          <p className="mt-1 text-[13px] text-app-muted">当前客户端信息</p>
        </div>

        <div className="divide-y divide-app-border rounded-app border-[0.5px] border-app-border bg-app-card px-4 dark:divide-app-border dark:border-app-border dark:bg-white/5">
          <div className="flex items-center justify-between py-3.5 text-[13px]">
            <span className="text-app-muted">网页标题</span>
            <span className="font-medium text-app-text">{title || '未设置'}</span>
          </div>
          <div className="flex items-center justify-between py-3.5 text-[13px]">
            <span className="text-app-muted">客户端地址</span>
            <span className="ml-4 max-w-[70%] truncate font-medium text-app-text">
              {clientUrl || '未设置'}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-[13px] font-medium text-app-text">联系方式</h3>
          {contacts.length > 0 ? (
            <div className="divide-y divide-app-border rounded-app border-[0.5px] border-app-border bg-app-card px-4 dark:divide-app-border dark:border-app-border dark:bg-white/5">
              {contacts.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="flex items-center justify-between gap-3 py-3.5 text-[13px]"
                >
                  <span className="shrink-0 text-app-muted">{item.label}</span>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    title={item.url}
                    className="ml-4 max-w-[70%] truncate font-medium text-app-text hover:underline"
                  >
                    {item.url}
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-app border-[0.5px] border-dashed border-app-border bg-app-card px-4 py-5 text-center text-[12px] text-app-subtle dark:border-app-border dark:bg-white/5">
              暂无联系方式，可在 CMS 客户端配置中添加
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
}

export function SettingsSection({
  profileContent,
  messagesContent,
  onOpenFavorites,
  onOpenMessages,
  profileFocusToken,
  videos,
  articles,
  photos,
  likedIds,
  savedIds,
  onToggleLike,
  onToggleSave,
}: SettingsSectionProps) {
  const [activeKey, setActiveKey] = useState<SettingKey>('profile');

  useEffect(() => {
    if (!profileFocusToken) return;
    setActiveKey('profile');
  }, [profileFocusToken]);

  return (
    <section className="h-full w-full p-2">
      <div className="flex h-full w-full flex-col">
        <header className="shrink-0 pb-2">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-app bg-app-surface text-app-text">
              <Settings className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-app-text">设置</h1>
              <p className="mt-2 text-[13px] text-app-muted">
                管理个人资料、本地缓存与客户端信息
              </p>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 gap-2">
          <aside className="w-56 shrink-0 border-[0.5px] border-app-border bg-app-card p-2 dark:border-app-border dark:bg-white/5">
            <nav className="space-y-2" aria-label="设置分类">
              {SETTING_ITEMS.map(({ key, label, description, Icon }) => {
                const active = activeKey === key;
                const itemDescription =
                  key === 'likes'
                    ? `已喜欢 ${likedIds.length} 条内容`
                    : key === 'favorites'
                      ? `已收藏 ${savedIds.length} 条内容`
                      : description;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (key === 'likes' || key === 'favorites') onOpenFavorites();
                      if (key === 'messages') onOpenMessages();
                      setActiveKey(key);
                    }}
                    className={`flex w-full items-center gap-3 rounded-app px-3 py-3 text-left transition-colors ${
                      active
                        ? 'bg-app-primary text-white dark:bg-app-card dark:text-app-text'
                        : 'text-app-muted hover:bg-app-surface dark:text-white/60 dark:hover:bg-white/10'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium">{label}</span>
                      <span
                        className={`mt-0.5 block truncate text-[11px] ${
                          active ? 'text-white/75' : 'text-app-subtle dark:text-white/40'
                        }`}
                      >
                        {itemDescription}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0 flex-1 overflow-y-auto">
            <div className="rounded-app border-[0.5px] border-app-border bg-app-bg p-2 dark:border-app-border">
              <SettingDetail
                itemKey={activeKey}
                profileContent={profileContent}
                messagesContent={messagesContent}
                videos={videos}
                articles={articles}
                photos={photos}
                likedIds={likedIds}
                savedIds={savedIds}
                onToggleLike={onToggleLike}
                onToggleSave={onToggleSave}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
