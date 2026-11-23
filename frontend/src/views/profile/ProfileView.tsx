import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bookmark,
  Check,
  ChevronRight,
  Edit3,
  Heart,
  KeyRound,
  LogOut,
  UserRound,
  X,
} from 'lucide-react';
import type { ArticleItem, PhotoItem, UserProfile, VideoItem } from '../../data/content';
import { SWIFTUI_SHEET, SWIFTUI_SMOOTH } from '../../lib/motion';
import { FavoritesSection } from './FavoritesSection';
import { ResilientImage } from '../../components/ResilientImage';
import { authApi } from '../../lib/snowyAuth.ts';

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
  videos?: VideoItem[];
  articles?: ArticleItem[];
  photos?: PhotoItem[];
  savedIds?: string[];
  onToggleSave?: (id: string) => void;
  likedIds?: string[];
  onToggleLike?: (id: string) => void;
}

type ProfilePane = 'profile' | 'likes' | 'favorites';

function ProfileNav({
  activePane,
  onSelect,
  likedCount,
  savedCount,
  mobile = false,
}: {
  activePane: ProfilePane;
  onSelect: (pane: ProfilePane) => void;
  likedCount: number;
  savedCount: number;
  mobile?: boolean;
}) {
  const items = [
    { id: 'profile', label: '个人资料', Icon: UserRound, count: undefined },
    { id: 'likes', label: '喜欢', Icon: Heart, count: likedCount },
    { id: 'favorites', label: '收藏', Icon: Bookmark, count: savedCount },
  ] as const;
  const activeClass = 'bg-white text-[#1D1D1F] shadow-xs dark:bg-[#242426] dark:text-[#F5F5F7]';
  const idleClass =
    'text-[#6E6E73] hover:bg-black/[0.04] dark:text-[#98989D] dark:hover:bg-white/[0.06]';

  return (
    <nav
      aria-label="个人中心导航"
      className={
        mobile
          ? 'fixed inset-x-0 bottom-0 z-40 flex justify-around gap-1 border-t border-black/[0.06] bg-white/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0C0C0E]/95 md:hidden'
          : 'hidden md:sticky md:top-20 md:flex md:w-44 md:shrink-0 md:flex-col md:gap-1.5'
      }
    >
      {items.map(({ id, label, Icon, count }) => {
        const isActive = activePane === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-current={isActive ? 'page' : undefined}
            className={
              mobile
                ? `relative flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-medium transition-colors ${
                    isActive ? activeClass : idleClass
                  }`
                : `inline-flex min-h-11 w-full items-center gap-2 rounded-xl px-3.5 text-[13px] font-medium transition-colors ${
                    isActive ? activeClass : idleClass
                  }`
            }
          >
            <Icon className={mobile ? 'h-5 w-5' : 'h-4 w-4'} />
            <span>{label}</span>
            {count !== undefined && (
              <span
                className={
                  mobile
                    ? 'absolute right-2 top-1 text-[10px] tabular-nums opacity-60'
                    : 'ml-auto text-[11px] tabular-nums opacity-60'
                }
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
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
  videos = [],
  articles = [],
  photos = [],
  savedIds = [],
  onToggleSave,
  likedIds = [],
  onToggleLike,
}: ProfileViewProps) {
  const [activePane, setActivePane] = useState<ProfilePane>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [draftBio, setDraftBio] = useState(profile.bio);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const openEditModal = () => {
    setDraftName(profile.name);
    setDraftBio(profile.bio);
    setIsEditing(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      ...profile,
      name: draftName.trim() || profile.name,
      location: '',
      bio: draftBio.trim() || profile.bio,
    });
    setIsEditing(false);
  };

  const openPasswordModal = () => {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordOpen(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (!oldPassword) {
      setPasswordError('请输入当前密码');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('新密码至少 6 位');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的新密码不一致');
      return;
    }
    setSavingPassword(true);
    try {
      await authApi.updatePasswordByOld(oldPassword, newPassword);
      setPasswordSuccess('密码修改成功');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : '修改密码失败');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <section aria-label="个人中心" className="py-0 sm:py-2">
      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          /* Simple Login & Register View */
          <motion.div
            key="auth-card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={SWIFTUI_SMOOTH}
            className="max-w-md mx-auto mt-0 sm:mt-4 rounded-none sm:rounded-3xl bg-white dark:bg-[#161618] border-0 sm:border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-8 shadow-none sm:shadow-sm space-y-6"
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
            className="mx-auto flex w-full max-w-5xl flex-col gap-0 pb-24 sm:gap-5 md:flex-row md:items-start md:pb-0"
          >
            <ProfileNav
              activePane={activePane}
              onSelect={setActivePane}
              likedCount={likedIds.length}
              savedCount={savedIds.length}
            />

            <div className="min-w-0 flex-1 space-y-6">
              {activePane === 'profile' && (
                <>
            {/* Basic Account Header Card */}
            <div className="rounded-none sm:rounded-3xl bg-white dark:bg-[#161618] border-0 sm:border border-black/[0.06] dark:border-white/[0.08] p-6 sm:p-8 shadow-none sm:shadow-xs">
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
            <div className="rounded-none sm:rounded-3xl bg-white dark:bg-[#161618] border-0 sm:border border-black/[0.06] dark:border-white/[0.08] divide-y divide-black/[0.05] dark:divide-white/[0.06] overflow-hidden">
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

              <button
                type="button"
                onClick={openPasswordModal}
                className="w-full px-6 py-4 flex items-center justify-between text-sm hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
              >
                <span className="text-[#6E6E73] dark:text-[#98989D]">修改密码</span>
                <span className="inline-flex items-center gap-1.5 font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                  <KeyRound className="w-4 h-4" />
                  <ChevronRight className="w-4 h-4 text-[#AEAEB2]" />
                </span>
              </button>
            </div>

                </>
              )}

              {activePane === 'likes' && (
                <FavoritesSection
                  videos={videos}
                  articles={articles}
                  photos={photos}
                  ids={likedIds}
                  onToggle={onToggleLike || (() => {})}
                  mode="like"
                />
              )}

              {activePane === 'favorites' && (
                <FavoritesSection
                  videos={videos}
                  articles={articles}
                  photos={photos}
                  ids={savedIds}
                  onToggle={onToggleSave || (() => {})}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoggedIn && (
        <ProfileNav
          mobile
          activePane={activePane}
          onSelect={setActivePane}
          likedCount={likedIds.length}
          savedCount={savedIds.length}
        />
      )}

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

      {/* Change Password Sheet */}
      <AnimatePresence>
        {passwordOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6 bg-black/50 backdrop-blur-md"
            onClick={() => setPasswordOpen(false)}
          >
            <motion.form
              initial={{ opacity: 0, y: 40, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.96 }}
              transition={SWIFTUI_SHEET}
              onClick={(event) => event.stopPropagation()}
              onSubmit={(event) => void handleChangePassword(event)}
              className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] p-6 space-y-5 shadow-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="修改登录密码"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                    修改登录密码
                  </h3>
                  <p className="mt-1 text-xs text-[#8E8E93]">通过当前密码验证后设置新密码</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPasswordOpen(false)}
                  aria-label="关闭修改密码"
                  className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="current-password"
                    className="block text-xs font-medium text-[#6E6E73] dark:text-[#98989D] mb-1.5"
                  >
                    当前密码
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    value={oldPassword}
                    onChange={(event) => setOldPassword(event.target.value)}
                    autoComplete="current-password"
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-xs font-medium text-[#6E6E73] dark:text-[#98989D] mb-1.5"
                  >
                    新密码
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-xs font-medium text-[#6E6E73] dark:text-[#98989D] mb-1.5"
                  >
                    确认新密码
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#0071E3]"
                  />
                </div>
              </div>

              {passwordError && (
                <p className="rounded-xl bg-[#FF3B30]/10 px-3 py-2 text-xs text-[#D70015] dark:text-[#FF6B6B]">
                  {passwordError}
                </p>
              )}
              {passwordSuccess && (
                <p className="rounded-xl bg-[#34C759]/10 px-3 py-2 text-xs text-[#248A3D] dark:text-[#30D158]">
                  {passwordSuccess}
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordOpen(false)}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-medium text-[#6E6E73] dark:text-[#98989D] hover:bg-black/[0.05] dark:hover:bg-white/[0.06]"
                >
                  关闭
                </button>
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.96 }}
                  disabled={savingPassword}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-xl bg-[#0071E3] dark:bg-[#0A84FF] text-white text-xs font-medium disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{savingPassword ? '提交中…' : '确认修改'}</span>
                </motion.button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
