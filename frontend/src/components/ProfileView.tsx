import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Check,
  Edit3,
  LogOut,
  Moon,
  Sun,
  UserRound,
  X,
} from 'lucide-react';
import type { ArticleItem, PhotoItem, UserProfile, VideoItem } from '../data/content';
import { SWIFTUI_SHEET, SWIFTUI_SMOOTH } from '../lib/motion';
import { FavoritesSection } from './FavoritesSection';
import { ResilientImage } from './ResilientImage';

export interface UserBasicInfo {
  email?: string;
  phone?: string;
  gender?: string;
  birthday?: string;
  latestLoginTime?: string;
  latestLoginAddress?: string;
}

const GENDER_LABELS: Record<string, string> = {
  '0': '未知',
  '1': '男',
  '2': '女',
};

function formatLoginTime(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

interface ProfileViewProps {
  isLoggedIn: boolean;
  accountEmail: string;
  profile: UserProfile;
  userInfo?: UserBasicInfo;
  onGoLogin: () => void;
  onGoRegister: () => void;
  onLogout: () => void;
  onUpdateProfile: (next: UserProfile) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  videos?: VideoItem[];
  articles?: ArticleItem[];
  photos?: PhotoItem[];
  savedIds?: string[];
  onToggleSave?: (id: string) => void;
}

export function ProfileView({
  isLoggedIn,
  accountEmail,
  profile,
  userInfo = {},
  onGoLogin,
  onGoRegister,
  onLogout,
  onUpdateProfile,
  isDark,
  onToggleTheme,
  videos = [],
  articles = [],
  photos = [],
  savedIds = [],
  onToggleSave,
}: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [draftLocation, setDraftLocation] = useState(profile.location);
  const [draftBio, setDraftBio] = useState(profile.bio);

  const openEditModal = () => {
    setDraftName(profile.name);
    setDraftLocation(profile.location);
    setDraftBio(profile.bio);
    setIsEditing(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...profile,
      name: draftName.trim() || profile.name,
      location: draftLocation.trim() || profile.location,
      bio: draftBio.trim() || profile.bio,
    });
    setIsEditing(false);
  };

  return (
    <section aria-label="个人中心" className="py-2 sm:py-4">
      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          /* Simple Login & Register View */
          <motion.div
            key="auth-card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={SWIFTUI_SMOOTH}
            className="max-w-md mx-auto mt-4 sm:mt-10 rounded-3xl bg-white dark:bg-[#161618] border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-8 shadow-sm space-y-6"
          >
            <div className="mx-auto max-w-sm py-10 text-center space-y-6">
              <div className="w-16 h-16 rounded-[20px] bg-[#1D1D1F] dark:bg-[#F5F5F7] text-white dark:text-[#1D1D1F] flex items-center justify-center mx-auto">
                <UserRound className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h1 className="text-[22px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                  登录后查看个人中心
                </h1>
                <p className="text-[13px] text-[#6E6E73] dark:text-[#98989D]">
                  使用账号密码或 QQ / 微信登录，即可管理个人资料、收藏与留言。
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={onGoLogin}
                  className="h-11 px-6 rounded-xl bg-[#0071E3] dark:bg-[#0A84FF] text-white text-[14px] font-medium hover:brightness-110 transition-all"
                >
                  立即登录
                </button>
                <button
                  type="button"
                  onClick={onGoRegister}
                  className="h-11 px-6 rounded-xl bg-[#F5F5F7] dark:bg-[#242426] text-[#1D1D1F] dark:text-[#F5F5F7] text-[14px] font-medium hover:bg-[#E5E5EA] dark:hover:bg-[#2C2C2E] transition-colors"
                >
                  注册账号
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Simple Account Info View */
          <motion.div
            key="account-info"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={SWIFTUI_SMOOTH}
            className="max-w-2xl mx-auto space-y-6"
          >
            {/* Basic Account Header Card */}
            <div className="rounded-3xl bg-white dark:bg-[#161618] border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-8 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full overflow-hidden shrink-0 border border-black/[0.08] dark:border-white/[0.12]">
                    <ResilientImage
                      src={profile.avatar}
                      alt={profile.name}
                      priority
                      fallbackTitle={profile.name}
                      className="w-full h-full"
                    />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                        {profile.name || accountEmail}
                      </h1>
                      {profile.handle && (
                        <span className="text-xs text-[#6E6E73] dark:text-[#98989D]">
                          {profile.handle}
                        </span>
                      )}
                    </div>
                    {profile.bio && (
                      <p className="text-sm text-[#515154] dark:text-[#A1A1A6] leading-relaxed">
                        {profile.bio}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={openEditModal}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl bg-[#F2F2F7] dark:bg-[#2C2C2E] text-xs font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#E5E5EA] dark:hover:bg-[#3A3A3C] transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>编辑资料</span>
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={onLogout}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[40px] rounded-xl bg-[#FF3B30]/[0.08] dark:bg-[#FF453A]/[0.14] text-xs font-medium text-[#FF3B30] dark:text-[#FF453A] hover:bg-[#FF3B30]/[0.14] dark:hover:bg-[#FF453A]/[0.22] transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>退出登录</span>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Clean Apple Grouped Account Details */}
            <div className="rounded-3xl bg-white dark:bg-[#161618] border border-black/[0.06] dark:border-white/[0.08] divide-y divide-black/[0.05] dark:divide-white/[0.06] overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between text-sm">
                <span className="text-[#6E6E73] dark:text-[#98989D]">账号状态</span>
                <span className="font-medium text-[#34C759]">已登录</span>
              </div>

              <div className="px-6 py-4 flex items-center justify-between text-sm gap-4">
                <span className="text-[#6E6E73] dark:text-[#98989D] shrink-0">登录账号</span>
                <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                  {accountEmail}
                </span>
              </div>

              {userInfo.email && userInfo.email !== accountEmail && (
                <div className="px-6 py-4 flex items-center justify-between text-sm gap-4">
                  <span className="text-[#6E6E73] dark:text-[#98989D] shrink-0">邮箱</span>
                  <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                    {userInfo.email}
                  </span>
                </div>
              )}

              {userInfo.phone && (
                <div className="px-6 py-4 flex items-center justify-between text-sm gap-4">
                  <span className="text-[#6E6E73] dark:text-[#98989D] shrink-0">手机号</span>
                  <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] tabular-nums">
                    {userInfo.phone}
                  </span>
                </div>
              )}

              {(userInfo.gender || userInfo.birthday) && (
                <div className="px-6 py-4 flex items-center justify-between text-sm gap-4">
                  <span className="text-[#6E6E73] dark:text-[#98989D] shrink-0">性别 / 生日</span>
                  <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                    {[GENDER_LABELS[userInfo.gender || ''] || userInfo.gender, userInfo.birthday?.slice(0, 10)]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
              )}

              {userInfo.latestLoginTime && (
                <div className="px-6 py-4 flex items-center justify-between text-sm gap-4">
                  <span className="text-[#6E6E73] dark:text-[#98989D] shrink-0">最近登录</span>
                  <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate text-right">
                    {[formatLoginTime(userInfo.latestLoginTime), userInfo.latestLoginAddress]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </div>
              )}

              {profile.location && (
                <div className="px-6 py-4 flex items-center justify-between text-sm gap-4">
                  <span className="text-[#6E6E73] dark:text-[#98989D] shrink-0">常驻地区</span>
                  <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                    {profile.location}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={onToggleTheme}
                className="w-full px-6 py-4 flex items-center justify-between text-sm hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-[#6E6E73] dark:text-[#98989D]">外观模式</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  <span>{isDark ? '深色外观' : '浅色外观'}</span>
                </span>
              </button>
            </div>

            <FavoritesSection
              videos={videos}
              articles={articles}
              photos={photos}
              savedIds={savedIds}
              onToggleSave={onToggleSave || (() => {})}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Sheet */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-black/50 backdrop-blur-md"
            onClick={() => setIsEditing(false)}
          >
            <motion.form
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.96 }}
              transition={SWIFTUI_SHEET}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSaveProfile}
              className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] p-6 space-y-5 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="编辑个人资料"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  编辑个人资料
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  aria-label="取消编辑"
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="edit-name"
                    className="block text-xs font-medium text-[#6E6E73] dark:text-[#98989D] mb-1.5"
                  >
                    显示名称
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    maxLength={24}
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-location"
                    className="block text-xs font-medium text-[#6E6E73] dark:text-[#98989D] mb-1.5"
                  >
                    常驻城市
                  </label>
                  <input
                    id="edit-location"
                    type="text"
                    value={draftLocation}
                    onChange={(e) => setDraftLocation(e.target.value)}
                    maxLength={32}
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="edit-bio"
                    className="block text-xs font-medium text-[#6E6E73] dark:text-[#98989D] mb-1.5"
                  >
                    个人简介
                  </label>
                  <textarea
                    id="edit-bio"
                    rows={3}
                    value={draftBio}
                    onChange={(e) => setDraftBio(e.target.value)}
                    maxLength={120}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#0071E3] resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-medium text-[#6E6E73] dark:text-[#98989D] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
                >
                  取消
                </button>
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.96 }}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-xl bg-[#0071E3] dark:bg-[#0A84FF] text-white text-xs font-medium"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>保存更改</span>
                </motion.button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
