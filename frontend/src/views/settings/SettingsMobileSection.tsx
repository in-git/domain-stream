/**
 * 设置模块的移动端独立组件：按手机设置页风格排版。
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Bookmark,
  ChevronRight,
  Edit3,
  Heart,
  Info,
  MoreHorizontal,
  UserRound,
} from 'lucide-react';
import type { ArticleItem, PhotoItem, VideoItem } from '../../data/content';
import { ResilientImage } from '../../components/ResilientImage';
import { SecondaryPage } from '../../components/SecondaryPage';
import { FavoritesMobileView } from '../profile/FavoritesMobileView';
import { SettingDetail, type SettingKey } from './SettingsSection';

interface SettingsMobileSectionProps {
  profileContent: ReactNode;
  profileFocusToken: number;
  profileName: string;
  profileHandle: string;
  profileBio: string;
  profileAvatar: string;
  onOpenEditProfile: () => void;
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
    Icon: Bookmark,
  },
  {
    key: 'about',
    label: '关于',
    Icon: Info,
  },
  {
    key: 'more',
    label: '更多',
    Icon: MoreHorizontal,
  },
] as const;

export function SettingsMobileSection({
  profileContent,
  profileFocusToken,
  profileName,
  profileHandle,
  profileBio,
  profileAvatar,
  onOpenEditProfile,
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
      <SecondaryPage onBack={() => setDetailKey(null)}>
        {detailKey === 'likes' && (
          <FavoritesMobileView
            videos={videos}
            articles={articles}
            photos={photos}
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
            ids={savedIds}
            onToggle={onToggleSave}
            mode="favorite"
          />
        )}
        {(detailKey === 'about' || detailKey === 'more') && (
          <div className="border-[0.5px] border-black/[0.04] bg-white dark:border-white/[0.05] dark:bg-[#161618]">
            <SettingDetail
              itemKey={detailKey}
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
        )}
      </SecondaryPage>
    );
  }

  return (
    <section
      ref={rootRef}
      className="h-full w-full overflow-y-auto bg-white pb-10 dark:bg-[#08080A]"
    >
      <div className="space-y-3">
        <div className="relative bg-[linear-gradient(120deg,#F5F5F7_0%,#FFFFFF_45%,#EBEBEF_100%)] px-8 pb-8 pt-12 dark:bg-white/5">
          <button
            type="button"
            onClick={onOpenEditProfile}
            className="absolute right-6 top-3 inline-flex items-center gap-1.5 border-[0.5px] border-black/[0.04] bg-white px-3 py-1.5 text-[12px] font-medium text-[#1D1D1F] dark:border-white/[0.05] dark:bg-[#1C1C1E] dark:text-white"
          >
            <Edit3 className="h-3.5 w-3.5" />
            编辑资料
          </button>
          <button
            type="button"
            onClick={() =>
              profileSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }
            className="flex w-full items-center gap-4 text-left"
          >
            <span className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-[#E5E5EA] dark:bg-[#2C2C2E]">
              <ResilientImage
                src={profileAvatar}
                alt={profileName || '用户'}
                priority
                fallbackTitle={profileName || '用户'}
                className="h-full w-full"
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="truncate text-[19px] font-semibold text-[#1D1D1F] dark:text-white">
                  {profileName || '用户'}
                </span>
                {profileHandle && (
                  <span className="shrink-0 rounded border-[0.5px] border-black/[0.04] px-1.5 py-0.5 text-[10px] text-[#1D1D1F] dark:border-white/[0.05] dark:text-white">
                    {profileHandle}
                  </span>
                )}
              </span>
              <span className="mt-1 block truncate text-[12px] text-[#8E8E93]">
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
              onClick={() => setDetailKey(key)}
              className="flex flex-col items-center gap-2 py-2"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.06] text-[#1D1D1F] dark:bg-white/10 dark:text-white">
                <Icon className="h-[20px] w-[20px]" strokeWidth={1.8} />
              </span>
              <span className="text-[12px] text-[#3A3A3C] dark:text-white/80">{label}</span>
            </button>
          ))}
        </div>

        <div ref={profileSectionRef} className="scroll-mt-4">
          {profileContent}
        </div>

        <div className="flex items-center justify-center gap-2 text-[#8E8E93]">
          <UserRound className="h-3.5 w-3.5" />
          <span className="text-[11px]">设置数据仅保存在当前设备</span>
        </div>
      </div>
    </section>
  );
}
