import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bookmark,
  Check,
  ChevronRight,
  Edit3,
  ExternalLink,
  Heart,
  KeyRound,
  Loader2,
  LogOut,
  UserRound,
  X,
} from 'lucide-react';
import type { ArticleItem, PhotoItem, UserProfile, VideoItem } from '../../data/content';
import { SWIFTUI_SHEET, SWIFTUI_SMOOTH } from '../../lib/motion';
import { FavoritesPCView } from './FavoritesPCView';
import { ResilientImage } from '../../components/ResilientImage';
import { authApi, cacheClientUser, getCachedClientUser } from '../../lib/snowyAuth.ts';

export interface UserBasicInfo {
  email?: string;
  phone?: string;
  gender?: string;
  birthday?: string;
  latestLoginTime?: string;
  latestLoginAddress?: string;
}

function formatLoginTime(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

const BILIBILI_HOME_PAGE = 'https://space.bilibili.com/3706965849016893?spm_id_from=333.1007.0.0';

function ContactSupportNote() {
  return (
    <div className="rounded-2xl border border-black/[0.06] bg-[#F5F5F7] px-4 py-3 text-xs leading-relaxed text-[#6E6E73] dark:border-white/[0.08] dark:bg-[#242426] dark:text-[#98989D]">
      <p className="break-all">
        我的个人主页：
        <a
          href={BILIBILI_HOME_PAGE}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 font-medium text-[#1D1D1F] underline decoration-black/25 underline-offset-2 hover:decoration-black dark:text-[#F5F5F7] dark:decoration-white/30 dark:hover:decoration-white"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          {BILIBILI_HOME_PAGE}
        </a>
      </p>
      <p className="mt-1">有需求或者问题请在 B 站私信我。</p>
    </div>
  );
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
  /** 移动端设置页内嵌时隐藏重复的个人资料头图 */
  hideHero?: boolean;
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
  return (
    <nav
      aria-label="个人中心导航"
      className={
        mobile
          ? 'fixed inset-x-0 bottom-0 z-40 flex justify-around gap-1 border-t border-black/[0.06] bg-white/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0C0C0E]/95 md:hidden'
          : 'hidden md:relative md:z-10 md:flex md:items-center md:gap-2 md:border-b md:border-black/[0.06] md:dark:border-white/[0.08]'
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
                    isActive
                      ? 'bg-[#1D1D1F] text-white shadow-xs dark:bg-[#F5F5F7] dark:text-[#1D1D1F]'
                      : 'text-[#6E6E73] hover:bg-black/[0.04] dark:text-[#98989D] dark:hover:bg-white/[0.06]'
                  }`
                : `relative flex min-h-13 items-center gap-2 px-5 text-[15px] font-medium transition-colors ${
                    isActive
                      ? 'text-[#1D1D1F] dark:text-[#F5F5F7]'
                      : 'text-[#8E8E93] hover:text-[#1D1D1F] dark:text-[#98989D] dark:hover:text-[#F5F5F7]'
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
                    : 'rounded-full bg-black/[0.05] px-1.5 py-0.5 text-[11px] tabular-nums text-[#6E6E73] dark:bg-white/[0.08] dark:text-[#98989D]'
                }
              >
                {count}
              </span>
            )}
            {!mobile && isActive && (
              <motion.span
                layoutId="profile-tab-indicator"
                transition={SWIFTUI_SMOOTH}
                className="absolute inset-x-4 -bottom-px h-0.5 rounded-full bg-[#1D1D1F] dark:bg-[#F5F5F7]"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

export function ProfileView({
  isLoggedIn,
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
  hideHero = false,
}: ProfileViewProps) {
  const [activePane, setActivePane] = useState<ProfilePane>('profile');
  const [profileDetail, setProfileDetail] = useState<'account' | 'security' | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [draftBio, setDraftBio] = useState(profile.bio);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
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
    setProfileError('');
    setIsEditing(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextName = draftName.trim() || profile.name;
    const nextBio = draftBio.trim();
    setSavingProfile(true);
    setProfileError('');
    try {
      // 调用新增的 biz profile 模块接口，持久化昵称与简介
      await authApi.updateProfile(nextName, nextBio);
      // 同步本地缓存，保证评论、个人中心等处立即读到最新昵称与简介
      const cached = getCachedClientUser();
      if (cached) {
        cacheClientUser({ ...cached, name: nextName, nickname: nextName, signature: nextBio });
      }
      onUpdateProfile({
        ...profile,
        name: nextName,
        handle: `@${nextName}`,
        location: '',
        bio: nextBio,
      });
      setIsEditing(false);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : '保存失败，请稍后重试');
    } finally {
      setSavingProfile(false);
    }
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
            className="w-full mt-0 sm:mt-4 p-6 sm:p-8 space-y-6 flex flex-col items-center"
          >
            <div className="w-full max-w-sm py-10 text-center space-y-6">
              <div className="w-16 h-16 rounded-[20px] bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center justify-center mx-auto">
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
                  className="h-11 px-6 rounded-xl bg-[#1D1D1F] dark:bg-[#F5F5F7] text-white dark:text-[#1D1D1F] text-[14px] font-medium hover:brightness-110 transition-all"
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
            className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-24 md:pb-0"
          >
            {/* Light Profile Hero */}
            {!hideHero && (
            <div className="relative overflow-hidden bg-white text-[#1D1D1F] sm:rounded-[32px] sm:border sm:border-black/[0.06]">
              <div className="relative h-36 sm:h-52 lg:h-60">
                <div className="absolute inset-0 bg-[linear-gradient(120deg,#F5F5F7_0%,#FFFFFF_45%,#EBEBEF_100%)]" />
                <div className="absolute right-5 top-5 hidden items-center gap-2 rounded-full border border-black/[0.06] bg-white/75 px-3 py-1.5 text-[11px] font-medium tracking-wide text-[#8E8E93] shadow-sm backdrop-blur-xl sm:flex">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1D1D1F]" />
                  PERSONAL SPACE
                </div>
              </div>

              <div className="relative -mt-14 px-5 pb-7 sm:-mt-16 sm:px-9 lg:px-12">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex items-end gap-4">
                    <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full ring-4 ring-white shadow-xl sm:h-28 sm:w-28">
                      <ResilientImage
                        src={profile.avatar}
                        alt={profile.name}
                        priority
                        fallbackTitle={profile.name}
                        className="h-full w-full"
                      />
                    </div>
                    <div className="min-w-0 pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-semibold tracking-tight text-[#1D1D1F] sm:text-3xl">
                          {profile.name || '用户'}
                        </h1>
                        {profile.handle && (
                          <span className="rounded-full bg-black/[0.05] px-2.5 py-1 text-[11px] text-[#6E6E73]">
                            {profile.handle}
                          </span>
                        )}
                      </div>
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6E6E73]">
                        {profile.bio || '这个人很神秘，还没有填写简介'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={openEditModal}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-[#1D1D1F] px-5 text-xs font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition-colors hover:bg-black"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>编辑资料</span>
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.96 }}
                      onClick={onLogout}
                      className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-black/[0.08] bg-white/80 px-5 text-xs font-medium text-[#1D1D1F] transition-colors hover:bg-white"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>退出登录</span>
                    </motion.button>
                  </div>
                </div>

                <div className="mt-7 grid grid-cols-2 gap-3 border-t border-black/[0.06] pt-6 sm:flex sm:gap-10">
                  {[
                    { label: '喜欢', value: likedIds.length },
                    { label: '收藏', value: savedIds.length },
                  ].map((stat) => (
                    <div key={stat.label} className="space-y-1">
                      <div className="text-xl font-semibold tabular-nums text-[#1D1D1F] sm:text-2xl">{stat.value}</div>
                      <div className="text-[11px] text-[#8E8E93] sm:text-xs">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            )}

            {!hideHero && !profileDetail && (
              <ProfileNav
                activePane={activePane}
                onSelect={setActivePane}
                likedCount={likedIds.length}
                savedCount={savedIds.length}
              />
            )}

            <div className="min-w-0 flex-1 space-y-6">
              {activePane === 'profile' && (
                <>
                  {profileDetail ? (
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => setProfileDetail(null)}
                        className="inline-flex items-center gap-1 px-1 py-1 text-[14px] font-medium text-[#1D1D1F] dark:text-white"
                      >
                        <span>←</span>
                        返回
                      </button>

                      {profileDetail === 'account' && (
                        <div className="border border-black/[0.06] bg-white p-6 dark:border-white/[0.08] dark:bg-[#161618]">
                          <div className="mb-7 flex items-start justify-between gap-4">
                            <div>
                              <h2 className="text-lg font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                                账号信息
                              </h2>
                              <p className="mt-1 text-xs text-[#8E8E93]">基本资料与登录状态</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-black/[0.06] px-3 py-1 text-xs font-medium text-[#1D1D1F] dark:bg-white/[0.10] dark:text-[#F5F5F7]">
                              已登录
                            </span>
                          </div>
                          <dl className="grid gap-x-10 gap-y-6 sm:grid-cols-2">
                            <div>
                              <dt className="text-xs text-[#8E8E93]">昵称</dt>
                              <dd className="mt-1.5 truncate text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                                {profile.name || '用户'}
                              </dd>
                            </div>
                            {userInfo.phone && (
                              <div>
                                <dt className="text-xs text-[#8E8E93]">手机号</dt>
                                <dd className="mt-1.5 text-sm font-medium tabular-nums text-[#1D1D1F] dark:text-[#F5F5F7]">
                                  {userInfo.phone}
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      )}

                      {profileDetail === 'security' && (
                        <div className="space-y-5 border border-black/[0.06] bg-white p-6 dark:border-white/[0.08] dark:bg-[#161618]">
                          <div>
                            <h2 className="text-lg font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                              安全设置
                            </h2>
                            <p className="mt-1 text-xs text-[#8E8E93]">保护账号，定期更新登录密码。</p>
                          </div>
                          <button
                            type="button"
                            onClick={openPasswordModal}
                            className="group flex w-full items-center justify-between border border-black/[0.06] bg-[#FBFBFD] px-4 py-4 text-left transition-colors hover:border-black/20 hover:bg-black/[0.03] dark:border-white/[0.08] dark:bg-[#1C1C1E] dark:hover:border-white/20 dark:hover:bg-white/[0.04]"
                          >
                            <span className="flex items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-black/[0.06] text-[#1D1D1F] dark:bg-white/[0.10] dark:text-[#F5F5F7]">
                                <KeyRound className="h-4 w-4" />
                              </span>
                              <span>
                                <span className="block text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                                  修改登录密码
                                </span>
                                <span className="mt-0.5 block text-[11px] text-[#8E8E93]">
                                  建议每 3 个月更新一次
                                </span>
                              </span>
                            </span>
                            <ChevronRight className="h-4 w-4 text-[#AEAEB2] transition-transform group-hover:translate-x-0.5" />
                          </button>
                          {userInfo.latestLoginTime && (
                            <div className="bg-[#F5F5F7] p-4 dark:bg-[#1C1C1E]">
                              <p className="text-[11px] text-[#8E8E93]">最近登录</p>
                              <p className="mt-1.5 text-xs font-medium leading-relaxed text-[#1D1D1F] dark:text-[#F5F5F7]">
                                {[formatLoginTime(userInfo.latestLoginTime), userInfo.latestLoginAddress]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-[#E5E5EA] bg-white dark:border-white/10 dark:bg-[#161618]">
                      <button
                        type="button"
                        onClick={() => setProfileDetail('account')}
                        className="flex w-full items-center gap-3 px-4 py-4 text-left"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FDE8F0] text-[#FB7299] dark:bg-[#FB7299]/10">
                          <UserRound className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-[#1D1D1F] dark:text-white">
                            账号信息
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-[#8E8E93]">
                            基本资料与登录状态
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-[#AEAEB2]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfileDetail('security')}
                        className="flex w-full items-center gap-3 border-t border-[#E5E5EA] px-4 py-4 text-left dark:border-white/5"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FDE8F0] text-[#FB7299] dark:bg-[#FB7299]/10">
                          <KeyRound className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-[#1D1D1F] dark:text-white">
                            安全设置
                          </span>
                          <span className="mt-0.5 block truncate text-[11px] text-[#8E8E93]">
                            修改登录密码与登录记录
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-[#AEAEB2]" />
                      </button>
                    </div>
                  )}
                </>
              )}

              {activePane === 'likes' && (
                <FavoritesPCView
                  videos={videos}
                  articles={articles}
                  photos={photos}
                  ids={likedIds}
                  onToggle={onToggleLike || (() => {})}
                  mode="like"
                />
              )}

              {activePane === 'favorites' && (
                <FavoritesPCView
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
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#1D1D1F] dark:focus:ring-[#F5F5F7]"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#1D1D1F] dark:focus:ring-[#F5F5F7] resize-none"
                  />
                </div>
              </div>

              {profileError && (
                <p className="text-xs text-[#1D1D1F] dark:text-[#F5F5F7]">{profileError}</p>
              )}

              <ContactSupportNote />

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={savingProfile}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl text-xs font-medium text-[#6E6E73] dark:text-[#98989D] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] disabled:opacity-50"
                >
                  取消
                </button>
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.96 }}
                  disabled={savingProfile}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-xl bg-[#1D1D1F] dark:bg-[#F5F5F7] text-white dark:text-[#1D1D1F] text-xs font-medium disabled:opacity-60"
                >
                  {savingProfile ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{savingProfile ? '保存中…' : '保存更改'}</span>
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
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#1D1D1F] dark:focus:ring-[#F5F5F7]"
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
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#1D1D1F] dark:focus:ring-[#F5F5F7]"
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
                    className="w-full px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] text-sm text-[#1D1D1F] dark:text-[#F5F5F7] focus:outline-none focus:ring-2 focus:ring-[#1D1D1F] dark:focus:ring-[#F5F5F7]"
                  />
                </div>
              </div>

              {passwordError && (
                <p className="rounded-xl bg-black/[0.06] px-3 py-2 text-xs dark:bg-white/[0.10] text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {passwordError}
                </p>
              )}
              {passwordSuccess && (
                <p className="rounded-xl bg-black/[0.06] px-3 py-2 text-xs text-[#1D1D1F] dark:bg-white/[0.10] dark:text-[#F5F5F7]">
                  {passwordSuccess}
                </p>
              )}

              <ContactSupportNote />

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
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 min-h-[44px] rounded-xl bg-[#1D1D1F] dark:bg-[#F5F5F7] text-white dark:text-[#1D1D1F] text-xs font-medium disabled:opacity-50"
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
