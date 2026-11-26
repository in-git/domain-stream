/**
 * PC 端个人中心独立组件：不使用移动端响应式分支。
 */
import { ChevronRight, Edit3, KeyRound, LogOut, UserRound } from 'lucide-react';
import type { UserProfile } from '../../types/content';
import { ResilientImage } from '../../components/ResilientImage';
import { ProfileModals, useProfileForms } from './ProfileForms';

interface ProfilePCViewProps {
  isLoggedIn: boolean;
  profile: UserProfile;
  likedCount: number;
  savedCount: number;
  onGoLogin: () => void;
  onGoRegister: () => void;
  onLogout: () => void;
  onUpdateProfile: (next: UserProfile) => void;
}

export function ProfilePCView({
  isLoggedIn,
  profile,
  likedCount,
  savedCount,
  onGoLogin,
  onGoRegister,
  onLogout,
  onUpdateProfile,
}: ProfilePCViewProps) {
  const form = useProfileForms(profile, onUpdateProfile);

  if (!isLoggedIn) {
    return (
      <section className="w-full py-8">
        <div className="mx-auto w-full max-w-md bg-app-card p-8 text-center dark:bg-app-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center bg-app-surface text-app-text dark:bg-app-surface dark:text-white">
            <UserRound className="h-7 w-7" />
          </div>
          <h1 className="mt-6 text-[22px] font-semibold text-app-text">
            登录后查看个人中心
          </h1>
          <p className="mt-2 text-[13px] text-app-muted dark:text-white/60">
            使用账号密码或 QQ / 微信登录，即可管理个人资料。
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onGoLogin}
              className="h-11 bg-app-primary px-6 text-[14px] font-medium text-white dark:bg-app-card dark:text-app-text"
            >
              立即登录
            </button>
            <button
              type="button"
              onClick={onGoRegister}
              className="h-11 bg-app-surface px-6 text-[14px] font-medium text-app-text dark:bg-white/10 dark:text-white"
            >
              注册账号
            </button>
          </div>
        </div>
        <ProfileModals form={form} />
      </section>
    );
  }

  return (
    <section className="w-full py-2">
      <div className="space-y-5 px-8 py-7">
        <div className="bg-app-card">
          <div className="h-44 bg-[linear-gradient(120deg,var(--app-color-surface)_0%,var(--app-color-card)_45%,var(--app-color-surface)_100%)]" />
          <div className="-mt-12 px-8 pb-7">
            <div className="flex items-end justify-between gap-6">
              <div className="flex items-end gap-4">
                <div className="h-24 w-24 overflow-hidden rounded-full">
                  <ResilientImage
                    src={profile.avatar}
                    alt={profile.name}
                    priority
                    fallbackTitle={profile.name}
                    className="h-full w-full"
                  />
                </div>
                <div className="pb-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-semibold text-app-text">
                      {profile.name || '用户'}
                    </h1>
                    {profile.handle && (
                      <span className="bg-black/[0.05] px-2 py-1 text-[11px] text-app-muted dark:bg-white/10 dark:text-white/60">
                        {profile.handle}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 max-w-lg text-sm text-app-muted dark:text-white/60">
                    {profile.bio || '这个人很神秘，还没有填写简介'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={form.openEditModal}
                  className="flex h-10 items-center gap-1.5 rounded-app bg-app-primary px-5 text-xs font-semibold text-white dark:bg-app-card dark:text-app-text"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  编辑资料
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex h-10 items-center gap-1.5 rounded-app px-5 text-xs font-medium text-app-text"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  退出登录
                </button>
              </div>
            </div>
            <div className="mt-7 flex items-center gap-10 pt-6">
              <div>
                <div className="text-2xl font-semibold tabular-nums text-app-text">
                  {likedCount}
                </div>
                <div className="mt-1 text-xs text-app-subtle">喜欢</div>
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums text-app-text">
                  {savedCount}
                </div>
                <div className="mt-1 text-xs text-app-subtle">收藏</div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden bg-app-card">
          <button
            type="button"
            onClick={form.openEditModal}
            className="flex w-full items-center gap-3 border-b border-app-border px-6 py-4 text-left dark:border-app-border"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.06] text-app-text dark:bg-white/10 dark:text-white">
              <UserRound className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-app-text">
                账号信息
              </span>
              <span className="mt-0.5 block text-[11px] text-app-subtle">
                基本资料与登录状态
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-app-subtle" />
          </button>
          <button
            type="button"
            onClick={form.openPasswordModal}
            className="flex w-full items-center gap-3 px-6 py-4 text-left"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.06] text-app-text dark:bg-white/10 dark:text-white">
              <KeyRound className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-app-text">
                安全设置
              </span>
              <span className="mt-0.5 block text-[11px] text-app-subtle">
                修改登录密码与登录记录
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-app-subtle" />
          </button>
        </div>
      </div>

      <ProfileModals form={form} />
    </section>
  );
}
