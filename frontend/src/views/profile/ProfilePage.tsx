import { motion } from 'motion/react';
import { ArrowLeft, Moon, Sun } from 'lucide-react';
import type { ArticleItem, PhotoItem, UserProfile, VideoItem } from '../../data/content';
import { navigate } from '../../lib/router';
import { ProfileView, type UserBasicInfo } from './ProfileView';
import { Tooltip } from '../../components/Tooltip';

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
  likedIds?: string[];
  onToggleLike?: (id: string) => void;
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
  likedIds,
  onToggleLike,
}: ProfilePageProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#F8F8FA] text-[#1D1D1F] dark:bg-[#08080A] dark:text-[#F5F5F7]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] opacity-70 dark:opacity-90"
        style={{
          backgroundImage:
            'radial-gradient(900px 320px at 12% -10%, rgba(0,0,0,0.08), transparent 65%), radial-gradient(760px 300px at 88% 0%, rgba(0,0,0,0.05), transparent 62%)',
        }}
      />
      <header className="sticky top-0 z-30 border-b border-black/[0.05] bg-white/70 dark:border-white/[0.08] dark:bg-[#08080A]/75 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium text-[#515154] transition-colors hover:bg-black/[0.05] dark:text-[#A1A1A6] dark:hover:bg-white/[0.08]"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </button>

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

      <main className="relative mx-auto w-full max-w-7xl px-0 pb-10 sm:px-6 sm:py-8 lg:px-10">
        <ProfileView
          isLoggedIn={isLoggedIn}
          accountEmail={accountEmail}
          profile={profile}
          userInfo={userInfo}
          onGoLogin={onGoLogin}
          onGoRegister={onGoRegister}
          onLogout={onLogout}
          onUpdateProfile={onUpdateProfile}
          videos={videos}
          articles={articles}
          photos={photos}
          savedIds={savedIds}
          onToggleSave={onToggleSave}
          likedIds={likedIds}
          onToggleLike={onToggleLike}
        />
      </main>
    </div>
  );
}
