import { motion } from 'motion/react';
import {
  BookOpen,
  Film,
  Image as ImageIcon,
  LogIn,
  Moon,
  RotateCcw,
  Sun,
  User,
} from 'lucide-react';
import type { SectionId, UserProfile } from '../data/content';
import { SWIFTUI_SNAPPY } from '../lib/motion';
import { ResilientImage } from './ResilientImage';

interface LeftSidebarProps {
  activeSection: SectionId;
  onSelectSection: (section: SectionId) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onReplaySplash: () => void;
  isLoggedIn: boolean;
  profile: UserProfile;
}

const NAV_ITEMS: { id: SectionId; label: string; Icon: typeof Film }[] = [
  { id: 'videos', label: '视频', Icon: Film },
  { id: 'articles', label: '文章', Icon: BookOpen },
  { id: 'gallery', label: '纯图片', Icon: ImageIcon },
  { id: 'profile', label: '个人中心', Icon: User },
];

export function LeftSidebar({
  activeSection,
  onSelectSection,
  isDark,
  onToggleTheme,
  onReplaySplash,
  isLoggedIn,
  profile,
}: LeftSidebarProps) {
  return (
    <aside
      aria-label="左侧主导航"
      className="hidden md:flex flex-col justify-between sticky top-0 h-screen w-20 lg:w-60 shrink-0 border-r border-black/[0.06] dark:border-white/[0.08] bg-[#F5F5F7]/85 dark:bg-[#0D0D0F]/90 backdrop-blur-xl px-3 lg:px-4 py-5 select-none z-30"
    >
      {/* Top Brand + Primary Vertical Navigation */}
      <div className="space-y-6">
        {/* Brand Emblem & Wordmark */}
        <button
          type="button"
          onClick={() => onSelectSection('videos')}
          className="w-full flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-1.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]"
        >
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] shrink-0 shadow-xs">
            <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M16 9L22.5 20.5H9.5L16 9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <circle cx="16" cy="16" r="2.2" fill="#0A84FF" />
            </svg>
          </span>
          <span className="hidden lg:inline text-lg font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-nowrap">
            Lumina
          </span>
        </button>

        {/* Douyin-style Left Vertical Nav Links */}
        <nav aria-label="板块导航" className="space-y-1.5">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const isActive = activeSection === id;
            return (
              <motion.button
                key={id}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectSection(id)}
                title={label}
                aria-current={isActive ? 'page' : undefined}
                className={`relative w-full flex items-center justify-center lg:justify-start gap-3.5 px-3 lg:px-3.5 py-3 min-h-[46px] rounded-2xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] ${
                  isActive
                    ? 'text-[#1D1D1F] dark:text-white'
                    : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="leftSidebarActivePill"
                    transition={SWIFTUI_SNAPPY}
                    className="absolute inset-0 rounded-2xl bg-white dark:bg-[#1E1E22] shadow-xs border border-black/[0.05] dark:border-white/[0.08]"
                  />
                )}
                <Icon
                  className={`relative z-10 w-5 h-5 shrink-0 ${
                    isActive ? 'text-[#0071E3] dark:text-[#0A84FF]' : ''
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span className="relative z-10 hidden lg:inline whitespace-nowrap truncate">
                  {label}
                </span>
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Utilities & Account Quick Card */}
      <div className="space-y-2 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onToggleTheme}
          title={isDark ? '切换至浅色外观' : '切换至深色外观'}
          className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-medium text-[#515154] dark:text-[#A1A1A6] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4 shrink-0" /> : <Moon className="w-4 h-4 shrink-0" />}
          <span className="hidden lg:inline whitespace-nowrap">
            {isDark ? '浅色外观' : '深色外观'}
          </span>
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onReplaySplash}
          title="重播开屏动效"
          className="w-full flex items-center justify-center lg:justify-start gap-3 px-3 py-2.5 min-h-[44px] rounded-xl text-xs font-medium text-[#515154] dark:text-[#A1A1A6] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors"
        >
          <RotateCcw className="w-4 h-4 shrink-0" />
          <span className="hidden lg:inline whitespace-nowrap">重播开屏</span>
        </motion.button>

        {/* Quick Account Status / Login Trigger */}
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelectSection('profile')}
          className="w-full mt-1 flex items-center justify-center lg:justify-start gap-3 px-2.5 py-2.5 min-h-[48px] rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.12] dark:hover:border-white/[0.16] transition-colors"
        >
          {isLoggedIn ? (
            <>
              <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-black/[0.08] dark:border-white/[0.12]">
                <ResilientImage
                  src={profile.avatar}
                  alt={profile.name}
                  fallbackTitle={profile.name}
                  className="w-full h-full"
                />
              </div>
              <div className="hidden lg:block text-left min-w-0">
                <div className="text-xs font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                  {profile.name}
                </div>
                <div className="text-[11px] text-[#6E6E73] dark:text-[#98989D] truncate">
                  已登录
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center lg:justify-start gap-2.5 w-full px-1 text-[#0071E3] dark:text-[#0A84FF]">
              <LogIn className="w-4 h-4 shrink-0" />
              <span className="hidden lg:inline text-xs font-medium whitespace-nowrap">
                登录 / 注册
              </span>
            </div>
          )}
        </motion.button>
      </div>
    </aside>
  );
}
