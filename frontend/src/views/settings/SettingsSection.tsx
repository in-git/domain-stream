/**
 * 设置模块的 PC 版本：左侧分类 + 右侧详情。
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Bookmark,
  ChevronRight,
  Database,
  Heart,
  Info,
  MoreHorizontal,
  Trash2,
  UserRound,
} from 'lucide-react';
import type { ArticleItem, PhotoItem, VideoItem } from '../../data/content';
import { useSystemInfo } from '../../lib/systemInfo';
import { FavoritesPCView } from '../profile/FavoritesPCView';

export type SettingKey = 'profile' | 'likes' | 'favorites' | 'cache' | 'about' | 'more';

interface SettingsSectionProps {
  /** 已迁移进来的个人中心内容 */
  profileContent: ReactNode;
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
    Icon: Bookmark,
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
    key: 'more',
    label: '更多',
    description: '更多功能与帮助入口',
    Icon: MoreHorizontal,
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
  videos?: VideoItem[];
  articles?: ArticleItem[];
  photos?: PhotoItem[];
  likedIds?: string[];
  savedIds?: string[];
  onToggleLike?: (id: string) => void;
  onToggleSave?: (id: string) => void;
}) {
  const { title, siteName, config } = useSystemInfo();
  const [notice, setNotice] = useState('');
  const [cacheVersion, setCacheVersion] = useState(0);
  const cacheStats = useMemo(() => readCacheStats(), [cacheVersion]);

  useEffect(() => {
    setNotice('');
  }, [itemKey]);

  function clearCache() {
    for (const key of CACHE_KEYS) {
      window.localStorage.removeItem(key);
    }
    setCacheVersion((value) => value + 1);
    setNotice('已清理本地缓存，刷新页面后完全生效');
  }

  function openComingSoon(name: string) {
    setNotice(`${name}即将开放`);
  }

  if (itemKey === 'profile') {
    return <div className="min-w-0">{profileContent}</div>;
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
      />
    );
  }

  if (itemKey === 'cache') {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1D1D1F] dark:text-white">缓存设置</h2>
          <p className="mt-1 text-[13px] text-[#86868B] dark:text-white/50">
            仅清理本地缓存，不会退出登录
          </p>
        </div>

        <div className=" border-[0.5px] border-black/[0.04] bg-[#FAFAFC] px-4 py-3.5 dark:border-white/[0.05] dark:bg-white/5">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-[#6E6E73] dark:text-white/60">缓存项</span>
            <span className="font-medium text-[#1D1D1F] dark:text-white">{cacheStats.count}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[13px]">
            <span className="text-[#6E6E73] dark:text-white/60">占用空间</span>
            <span className="font-medium text-[#1D1D1F] dark:text-white">{cacheStats.size}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={clearCache}
          className="w-full h-10 inline-flex items-center justify-center gap-2  bg-[#1D1D1F] text-white text-[13px] font-medium hover:bg-black dark:bg-white dark:text-[#1D1D1F] dark:hover:bg-white/90"
        >
          <Trash2 className="w-4 h-4" />
          清理本地缓存
        </button>

        {notice && (
          <p className=" bg-[#F5F5F7] px-3 py-2 text-[12px] text-[#6E6E73] dark:bg-white/5 dark:text-white/60">
            {notice}
          </p>
        )}
      </div>
    );
  }

  if (itemKey === 'about') {
    const clientUrl = (config.clientUrl || '').trim();
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1D1D1F] dark:text-white">关于</h2>
          <p className="mt-1 text-[13px] text-[#86868B] dark:text-white/50">当前客户端信息</p>
        </div>
        <div className="divide-y divide-black/[0.04]  border-[0.5px] border-black/[0.04] bg-white px-4 dark:divide-white/[0.04] dark:border-white/[0.05] dark:bg-white/5">
          <div className="flex items-center justify-between py-3.5 text-[13px]">
            <span className="text-[#86868B] dark:text-white/50">网页标题</span>
            <span className="font-medium text-[#1D1D1F] dark:text-white">
              {title || '未设置'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3.5 text-[13px]">
            <span className="text-[#86868B] dark:text-white/50">站点名称</span>
            <span className="font-medium text-[#1D1D1F] dark:text-white">
              {siteName || '未设置'}
            </span>
          </div>
          <div className="flex items-center justify-between py-3.5 text-[13px]">
            <span className="text-[#86868B] dark:text-white/50">客户端地址</span>
            <span className="ml-4 max-w-[70%] truncate font-medium text-[#1D1D1F] dark:text-white">
              {clientUrl || '未设置'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[#1D1D1F] dark:text-white">更多</h2>
        <p className="mt-1 text-[13px] text-[#86868B] dark:text-white/50">更多功能正在准备中</p>
      </div>
      <div className="divide-y divide-black/[0.04] overflow-hidden  border-[0.5px] border-black/[0.04] bg-white dark:divide-white/[0.04] dark:border-white/[0.05] dark:bg-white/5">
        {['意见反馈', '隐私政策', '用户协议'].map((name) => (
          <button
            key={name}
            type="button"
            onClick={() => openComingSoon(name)}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left text-[14px] text-[#1D1D1F] transition-colors hover:bg-[#F5F5F7] dark:text-white dark:hover:bg-white/10"
          >
            <span>{name}</span>
            <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
          </button>
        ))}
      </div>
      {notice && (
        <p className=" bg-[#F5F5F7] px-3 py-2 text-[12px] text-[#6E6E73] dark:bg-white/5 dark:text-white/60">
          {notice}
        </p>
      )}
    </div>
  );
}

export function SettingsSection({
  profileContent,
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
    <section className="h-full w-full">
      <div className="flex h-full w-full flex-col">
        <header className="shrink-0 pb-4">
          <h1 className="text-xl font-semibold text-[#1D1D1F] dark:text-white">设置</h1>
          <p className="mt-1 text-[13px] text-[#86868B] dark:text-white/50">
            管理个人资料、本地缓存与客户端信息
          </p>
        </header>

        <div className="flex min-h-0 flex-1 gap-5">
          <aside className="w-56 shrink-0  border-[0.5px] border-black/[0.04] bg-white p-2 dark:border-white/[0.05] dark:bg-white/5">
            <nav className="space-y-1" aria-label="设置分类">
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
                    onClick={() => setActiveKey(key)}
                    className={`w-full flex items-center gap-3  px-3 py-3 text-left transition-colors ${
                      active
                        ? 'bg-[#1D1D1F] text-white dark:bg-white dark:text-[#1D1D1F]'
                        : 'text-[#6E6E73] hover:bg-[#F5F5F7] dark:text-white/60 dark:hover:bg-white/10'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.8} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium">{label}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-[#AEAEB2] dark:text-white/40">
                        {itemDescription}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="min-w-0 flex-1 overflow-y-auto">
            <div className="border-[0.5px] border-black/[0.04] bg-white p-2 shadow-sm dark:border-white/[0.05] dark:bg-white/5">
              <SettingDetail
                itemKey={activeKey}
                profileContent={profileContent}
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
