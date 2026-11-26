/**
 * 设置模块的移动端独立组件：按手机设置页风格排版。
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Star,
  ChevronRight,
  Heart,
  Info,
  MessageCircle,
  UserRound,
} from 'lucide-react';
import type { ArticleItem, PhotoItem, VideoItem } from '../../types/content';
import { ResilientImage } from '../../components/ResilientImage';
import { SecondaryPage } from '../../components/SecondaryPage';
import { FavoritesMobileView } from '../profile/FavoritesMobileView';
import { SettingDetail, type SettingKey } from './SettingsSection';
import { PortalNav } from '../shell/PortalNav';

interface SettingsMobileSectionProps {
  profileContent: ReactNode;
  messagesContent: ReactNode;
  profileFocusToken: number;
  profileName: string;
  profileHandle: string;
  profileBio: string;
  profileAvatar: string;
  isLoggedIn: boolean;
  onOpenEditProfile: () => void;
  onOpenFavorites: () => void;
  onOpenMessages: () => void;
  videos: VideoItem[];
  articles: ArticleItem[];
  photos: PhotoItem[];
  likedIds: string[];
  savedIds: string[];
  onToggleLike: (id: string) => void;
  onToggleSave: (id: string) => void;
}

type MobileDetailKey = SettingKey | 'likes' | 'favorites';

const MOBILE_ACTIONS = [
  {
    key: 'likes',
    label: '喜欢',
    Icon: Heart,
  },
  {
    key: 'favorites',
    label: '收藏',
    Icon: Star,
  },
  {
    key: 'about',
    label: '关于',
    Icon: Info,
  },
  {
    key: 'messages',
    label: '留言',
    Icon: MessageCircle,
  },
] as const;

export function SettingsMobileSection({
  profileContent,
  messagesContent,
  profileFocusToken,
  profileName,
  profileHandle,
  profileBio,
  profileAvatar,
  isLoggedIn,
  onOpenEditProfile,
  onOpenFavorites,
  onOpenMessages,
  videos,
  articles,
  photos,
  likedIds,
  savedIds,
  onToggleLike,
  onToggleSave,
}: SettingsMobileSectionProps) {
  const [detailKey, setDetailKey] = useState<MobileDetailKey | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const profileSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileFocusToken) return;
    setDetailKey(null);
    profileSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [profileFocusToken]);

  if (detailKey) {
    return (
      <>
        <PortalNav />
        <SecondaryPage onBack={() => setDetailKey(null)}>
        {detailKey === 'likes' && (
          <FavoritesMobileView
            videos={videos}
            articles={articles}
            photos={photos}
            likedIds={likedIds}
            savedIds={savedIds}
            onToggleLike={onToggleLike}
            onToggleSave={onToggleSave}
            ids={likedIds}
            onToggle={onToggleLike}
            mode="like"
          />
        )}
        {detailKey === 'favorites' && (
          <FavoritesMobileView
            videos={videos}
            articles={articles}
            photos={photos}
            likedIds={likedIds}
            savedIds={savedIds}
            onToggleLike={onToggleLike}
            onToggleSave={onToggleSave}
            ids={savedIds}
            onToggle={onToggleSave}
            mode="favorite"
          />
        )}
        {detailKey === 'messages' && (
          <div className="px-2 py-4">{messagesContent}</div>
        )}
        {detailKey === 'about' && (
          <div className="border-[0.5px] border-app-border bg-app-card dark:border-app-border dark:bg-app-card">
            <SettingDetail
              itemKey={detailKey}
              profileContent={profileContent}
              dense
              videos={videos}
              articles={articles}
              photos={photos}
              likedIds={likedIds}
              savedIds={savedIds}
              onToggleLike={onToggleLike}
              onToggleSave={onToggleSave}
            />
          </div>
        )}
        </SecondaryPage>
      </>
    );
  }

  return (
    <>
      <PortalNav />
      <section
      ref={rootRef}
      className="h-full w-full overflow-y-auto bg-app-card pb-10 dark:bg-[#08080A]"
    >
      <div className="space-y-3">
        <div className="relative bg-[linear-gradient(120deg,var(--app-color-surface)_0%,var(--app-color-card)_45%,var(--app-color-surface)_100%)] px-8 pb-8 pt-8 dark:bg-white/5">
          <button
            type="button"
            onClick={() => {
              if (isLoggedIn) {
                onOpenEditProfile();
              } else {
                profileSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
            className="flex w-full items-center gap-4 text-left"
          >
            <span className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[#E5E5EA] dark:bg-app-surface">
              {isLoggedIn && profileAvatar ? (
                <ResilientImage
                  src={profileAvatar}
                  alt={profileName || '用户'}
                  priority
                  fallbackTitle={profileName || '用户'}
                  className="h-full w-full"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-app-muted dark:text-white">
                  <UserRound className="h-7 w-7" />
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-[19px] font-semibold text-app-text">
                  {profileName || '用户'}
                </span>
                {profileHandle && (
                  <span className="shrink-0 rounded border-[0.5px] border-app-border px-1.5 py-0.5 text-[10px] text-app-text dark:border-app-border dark:text-white">
                    {profileHandle}
                  </span>
                )}
              </span>
              <span className="mt-1 block truncate text-[12px] text-app-subtle">
                {profileBio || '这个人很神秘，还没有填写简介'}
              </span>
            </span>
            <ChevronRight className="h-[18px] w-[18px] shrink-0 text-[#C7C7CC]" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {MOBILE_ACTIONS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (key === 'likes' || key === 'favorites') onOpenFavorites();
                if (key === 'messages') onOpenMessages();
                setDetailKey(key);
              }}
              className="flex flex-col items-center gap-2 py-2"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.06] text-app-text dark:bg-white/10 dark:text-white">
                <Icon className="h-[20px] w-[20px]" strokeWidth={1.8} />
              </span>
              <span className="text-[12px] text-[#3A3A3C] dark:text-white/80">{label}</span>
            </button>
          ))}
        </div>

        <div ref={profileSectionRef} className="scroll-mt-4">
          {profileContent}
        </div>

      </div>
      </section>
    </>
  );
}
