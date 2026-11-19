import { motion } from 'motion/react';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import type { ArticleItem, PhotoItem, UserProfile, VideoItem } from '../data/content';
import { navigate } from '../lib/router';
import type { FavoriteKind } from './FavoritesSection';
import { ProfileView, type UserBasicInfo } from './ProfileView';
import { Tooltip } from './Tooltip';

interface ProfilePageProps {
  isLoggedIn: boolean;
  accountEmail: string;
  profile: UserProfile;
  userInfo: UserBasicInfo;
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  onGoLogin: () => void;
  onGoRegister: () => void;
  onUpdateProfile: (next: UserProfile) => void;
  videos?: VideoItem[];
  articles?: ArticleItem[];
  photos?: PhotoItem[];
  savedIds?: string[];
  onToggleSave?: (id: string) => void;
  onOpenFavorite?: (kind: FavoriteKind, id: string) => void;
}

/** 独立个人中心页面（/profile）：展示登录用户的基本信息 */
export function ProfilePage({
  isLoggedIn,
  accountEmail,
  profile,
  userInfo,
  isDark,
  onToggleTheme,
  onLogout,
  onGoLogin,
  onGoRegister,
  onUpdateProfile,
  videos,
  articles,
  photos,
  savedIds,
  onToggleSave,
  onOpenFavorite,
}: ProfilePageProps) {
  return (
    <div className="min-h-screen bg-[#FBFBFD] text-[#1D1D1F] dark:bg-[#000000] dark:text-[#F5F5F7]">
      <header className="sticky top-0 z-30 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-[#515154] transition-colors hover:bg-black/[0.05] dark:text-[#A1A1A6] dark:hover:bg-white/[0.08]"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </button>

          <h1 className="text-[15px] font-semibold tracking-tight">个人中心</h1>

          <Tooltip label={isDark ? '浅色外观' : '深色外观'} side="bottom">
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={onToggleTheme}
              aria-label={isDark ? '切换至浅色外观' : '切换至深色外观'}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#1D1D1F] transition-colors hover:bg-black/[0.05] dark:text-[#F5F5F7] dark:hover:bg-white/[0.08]"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </motion.button>
          </Tooltip>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
        <ProfileView
          isLoggedIn={isLoggedIn}
          accountEmail={accountEmail}
          profile={profile}
          userInfo={userInfo}
          onGoLogin={onGoLogin}
          onGoRegister={onGoRegister}
          onLogout={onLogout}
          onUpdateProfile={onUpdateProfile}
          isDark={isDark}
          onToggleTheme={onToggleTheme}
          videos={videos}
          articles={articles}
          photos={photos}
          savedIds={savedIds}
          onToggleSave={onToggleSave}
          onOpenFavorite={onOpenFavorite}
        />
      </main>
    </div>
  );
}
