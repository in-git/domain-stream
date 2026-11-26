/**
 * PC 端个人中心独立组件：不使用移动端响应式分支。
 */
import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { ChevronRight, Edit3, KeyRound, LogOut, UserRound } from 'lucide-react';
import type { UserProfile } from '../../data/content';
import { ResilientImage } from '../../components/ResilientImage';
import { SecondaryPage } from '../../components/SecondaryPage';
import { ProfileModals, useProfileForms, type UserBasicInfo } from './ProfileForms';

interface ProfilePCViewProps {
  isLoggedIn: boolean;
  profile: UserProfile;
  userInfo?: UserBasicInfo;
  likedCount: number;
  savedCount: number;
  onGoLogin: () => void;
  onGoRegister: () => void;
  onLogout: () => void;
  onUpdateProfile: (next: UserProfile) => void;
}

function formatLoginTime(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

export function ProfilePCView({
  isLoggedIn,
  profile,
  userInfo = {},
  likedCount,
  savedCount,
  onGoLogin,
  onGoRegister,
  onLogout,
  onUpdateProfile,
}: ProfilePCViewProps) {
  const [detail, setDetail] = useState<'account' | 'security' | null>(null);
  const form = useProfileForms(profile, onUpdateProfile);

  if (!isLoggedIn) {
    return (
      <section className="w-full py-8">
        <div className="mx-auto w-full max-w-md bg-white p-8 text-center dark:bg-[#161618]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center bg-[#F2F2F7] text-[#1D1D1F] dark:bg-[#2C2C2E] dark:text-white">
            <UserRound className="h-7 w-7" />
          </div>
          <h1 className="mt-6 text-[22px] font-semibold text-[#1D1D1F] dark:text-white">
            登录后查看个人中心
          </h1>
          <p className="mt-2 text-[13px] text-[#6E6E73] dark:text-white/60">
            使用账号密码或 QQ / 微信登录，即可管理个人资料。
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onGoLogin}
              className="h-11 bg-[#1D1D1F] px-6 text-[14px] font-medium text-white dark:bg-white dark:text-[#1D1D1F]"
            >
              立即登录
            </button>
            <button
              type="button"
              onClick={onGoRegister}
              className="h-11 bg-[#F5F5F7] px-6 text-[14px] font-medium text-[#1D1D1F] dark:bg-white/10 dark:text-white"
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
      <div className="space-y-5">
        <div className="bg-white dark:bg-[#161618]">
          <div className="h-44 bg-[linear-gradient(120deg,#F5F5F7_0%,#FFFFFF_45%,#EBEBEF_100%)]" />
          <div className="-mt-12 px-8 pb-7">
            <div className="flex items-end justify-between gap-6">
              <div className="flex items-end gap-4">
                <div className="h-24 w-24 overflow-hidden rounded-full shadow-xl">
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
                    <h1 className="text-2xl font-semibold text-[#1D1D1F] dark:text-white">
                      {profile.name || '用户'}
                    </h1>
                    {profile.handle && (
                      <span className="bg-black/[0.05] px-2.5 py-1 text-[11px] text-[#6E6E73] dark:bg-white/10 dark:text-white/60">
                        {profile.handle}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 max-w-lg text-sm text-[#6E6E73] dark:text-white/60">
                    {profile.bio || '这个人很神秘，还没有填写简介'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={form.openEditModal}
                  className="flex h-10 items-center gap-1.5 bg-[#1D1D1F] px-5 text-xs font-semibold text-white dark:bg-white dark:text-[#1D1D1F]"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  编辑资料
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex h-10 items-center gap-1.5 px-5 text-xs font-medium text-[#1D1D1F] dark:text-white"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  退出登录
                </button>
              </div>
            </div>
            <div className="mt-7 flex items-center gap-10 pt-6">
              <div>
                <div className="text-2xl font-semibold tabular-nums text-[#1D1D1F] dark:text-white">
                  {likedCount}
                </div>
                <div className="mt-1 text-xs text-[#8E8E93]">喜欢</div>
              </div>
              <div>
                <div className="text-2xl font-semibold tabular-nums text-[#1D1D1F] dark:text-white">
                  {savedCount}
                </div>
                <div className="mt-1 text-xs text-[#8E8E93]">收藏</div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden bg-white dark:bg-[#161618]">
          <button
            type="button"
            onClick={() => setDetail('account')}
            className="flex w-full items-center gap-3 border-b border-black/[0.04] px-6 py-4 text-left dark:border-white/[0.05]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.06] text-[#1D1D1F] dark:bg-white/10 dark:text-white">
              <UserRound className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-[#1D1D1F] dark:text-white">
                账号信息
              </span>
              <span className="mt-0.5 block text-[11px] text-[#8E8E93]">
                基本资料与登录状态
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-[#AEAEB2]" />
          </button>
          <button
            type="button"
            onClick={() => setDetail('security')}
            className="flex w-full items-center gap-3 px-6 py-4 text-left"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.06] text-[#1D1D1F] dark:bg-white/10 dark:text-white">
              <KeyRound className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-[#1D1D1F] dark:text-white">
                安全设置
              </span>
              <span className="mt-0.5 block text-[11px] text-[#8E8E93]">
                修改登录密码与登录记录
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-[#AEAEB2]" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {detail && (
          <SecondaryPage
            onBack={() => setDetail(null)}
            contentClassName="max-w-3xl"
          >
              {detail === 'account' && (
                <div className="bg-white dark:bg-[#161618]">
                  <div className="flex items-start justify-between gap-4 border-b border-black/[0.04] px-6 py-5 dark:border-white/[0.05]">
                    <div>
                      <h2 className="text-lg font-semibold text-[#1D1D1F] dark:text-white">
                        账号信息
                      </h2>
                      <p className="mt-1 text-xs text-[#8E8E93]">基本资料与登录状态</p>
                    </div>
                    <span className="bg-black/[0.06] px-3 py-1 text-xs text-[#1D1D1F] dark:bg-white/10 dark:text-white">
                      已登录
                    </span>
                  </div>
                  <div className="divide-y divide-black/[0.06] dark:divide-white/10">
                    {[
                      { label: '昵称', value: profile.name || '用户' },
                      { label: '手机号', value: userInfo.phone },
                      { label: '邮箱', value: userInfo.email },
                    ]
                      .filter((row) => row.value)
                      .map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between gap-4 px-6 py-4"
                        >
                          <span className="text-sm text-[#8E8E93]">{row.label}</span>
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="max-w-[280px] truncate text-sm font-medium text-[#1D1D1F] dark:text-white">
                              {row.value}
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-[#AEAEB2]" />
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              {detail === 'security' && (
                <div className="space-y-4 bg-white pb-8 dark:bg-[#161618]">
                  <div className="px-6 pt-6">
                    <h2 className="text-lg font-semibold text-[#1D1D1F] dark:text-white">
                      安全设置
                    </h2>
                    <p className="mt-1 text-xs text-[#8E8E93]">保护账号，定期更新登录密码。</p>
                  </div>
                  <button
                    type="button"
                    onClick={form.openPasswordModal}
                    className="flex w-full items-center justify-between bg-[#FBFBFD] px-6 py-4 text-left dark:bg-white/5"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center bg-black/[0.06] dark:bg-white/10">
                        <KeyRound className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-medium text-[#1D1D1F] dark:text-white">
                          修改登录密码
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[#8E8E93]">
                          建议每 3 个月更新一次
                        </span>
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-[#AEAEB2]" />
                  </button>
                  {userInfo.latestLoginTime && (
                    <div className="bg-[#F5F5F7] px-6 py-4 dark:bg-white/5">
                      <p className="text-[11px] text-[#8E8E93]">最近登录</p>
                      <p className="mt-1.5 text-xs text-[#1D1D1F] dark:text-white">
                        {[formatLoginTime(userInfo.latestLoginTime), userInfo.latestLoginAddress]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </div>
                  )}
                </div>
              )}
          </SecondaryPage>
        )}
      </AnimatePresence>

      <ProfileModals form={form} />
    </section>
  );
}
