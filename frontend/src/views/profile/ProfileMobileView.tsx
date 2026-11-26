/**
 * 移动端个人中心独立组件：嵌入设置页，不使用响应式分支。
 */
import { useState, type ReactNode } from 'react';
import { AnimatePresence } from 'motion/react';
import { ChevronRight, Database, KeyRound, LogOut, UserRound } from 'lucide-react';
import type { UserProfile } from '../../data/content';
import { SecondaryPage } from '../../components/SecondaryPage';
import { SettingDetail } from '../settings/SettingsSection';
import { ProfileModals, type ProfileForms, type UserBasicInfo } from './ProfileForms';

interface ProfileMobileViewProps {
  isLoggedIn: boolean;
  profile: UserProfile;
  userInfo?: UserBasicInfo;
  form: ProfileForms;
  onGoLogin: () => void;
  onGoRegister: () => void;
  onLogout: () => void;
}

type ProfileDetail = 'cache' | 'account' | 'security' | null;

function formatLoginTime(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { hour12: false });
}

function DetailRow({
  icon,
  label,
  description,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-4 text-left"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.06] text-[#1D1D1F] dark:bg-white/10 dark:text-white">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[#1D1D1F] dark:text-white">{label}</span>
        <span className="mt-0.5 block truncate text-[11px] text-[#8E8E93]">{description}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#AEAEB2]" />
    </button>
  );
}

export function ProfileMobileView({
  isLoggedIn,
  profile,
  userInfo = {},
  form,
  onGoLogin,
  onGoRegister,
  onLogout,
}: ProfileMobileViewProps) {
  const [detail, setDetail] = useState<ProfileDetail>(null);

  if (!isLoggedIn) {
    return (
      <section className="w-full py-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center bg-[#F5F5F7] text-[#1D1D1F] dark:bg-white/10 dark:text-white">
          <UserRound className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-[18px] font-semibold text-[#1D1D1F] dark:text-white">
          登录后查看个人中心
        </h1>
        <p className="mt-2 text-[12px] text-[#8E8E93]">管理个人资料与账号安全</p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onGoLogin}
            className="h-10 bg-[#1D1D1F] px-5 text-[13px] font-medium text-white dark:bg-white dark:text-[#1D1D1F]"
          >
            立即登录
          </button>
          <button
            type="button"
            onClick={onGoRegister}
            className="h-10 bg-[#F5F5F7] px-5 text-[13px] font-medium text-[#1D1D1F] dark:bg-white/10 dark:text-white"
          >
            注册账号
          </button>
        </div>
        <ProfileModals form={form} />
      </section>
    );
  }

  return (
    <section className="w-full space-y-3">
      <div className="divide-y divide-black/[0.04] overflow-hidden bg-white dark:divide-white/[0.04] dark:bg-[#161618]">
        <DetailRow
          icon={<Database className="h-4 w-4" />}
          label="缓存设置"
          description="清理本地播放进度与偏好缓存"
          onClick={() => setDetail('cache')}
        />
        <DetailRow
          icon={<UserRound className="h-4 w-4" />}
          label="账号信息"
          description="基本资料与登录状态"
          onClick={() => setDetail('account')}
        />
        <DetailRow
          icon={<KeyRound className="h-4 w-4" />}
          label="安全设置"
          description="修改登录密码与登录记录"
          onClick={() => setDetail('security')}
        />
        <DetailRow
          icon={<LogOut className="h-4 w-4" />}
          label="退出登录"
          description="退出当前账号"
          onClick={onLogout}
        />
      </div>

      <AnimatePresence>
        {detail && (
          <SecondaryPage onBack={() => setDetail(null)}>
              {detail === 'cache' && <SettingDetail itemKey="cache" profileContent={null} />}

              {detail === 'account' && (
                <div className="bg-white dark:bg-[#161618]">
                  <div className="flex items-start justify-between gap-4 border-b border-black/[0.04] px-4 py-4 dark:border-white/[0.05]">
                    <div>
                      <h2 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-white">
                        账号信息
                      </h2>
                      <p className="mt-1 text-xs text-[#8E8E93]">基本资料与登录状态</p>
                    </div>
                    <span className="bg-black/[0.06] px-3 py-1 text-xs text-[#1D1D1F] dark:bg-white/10 dark:text-white">
                      已登录
                    </span>
                  </div>
                  <div className="divide-y divide-black/[0.04] dark:divide-white/10">
                    {[
                      { label: '昵称', value: profile.name || '用户' },
                      { label: '手机号', value: userInfo.phone },
                      { label: '邮箱', value: userInfo.email },
                    ]
                      .filter((row) => row.value)
                      .map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between gap-4 px-4 py-3.5"
                        >
                          <span className="text-sm text-[#8E8E93]">{row.label}</span>
                          <span className="flex min-w-0 items-center gap-3">
                            <span className="max-w-[180px] truncate text-sm font-medium text-[#1D1D1F] dark:text-white">
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
                <div className="space-y-3 bg-white pb-4 dark:bg-[#161618]">
                  <div className="px-4 pt-4">
                    <h2 className="text-[17px] font-semibold text-[#1D1D1F] dark:text-white">
                      安全设置
                    </h2>
                    <p className="mt-1 text-xs text-[#8E8E93]">保护账号，定期更新登录密码。</p>
                  </div>
                  <button
                    type="button"
                    onClick={form.openPasswordModal}
                    className="flex w-full items-center justify-between bg-[#FBFBFD] px-4 py-4 text-left dark:bg-white/5"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.06] text-[#1D1D1F] dark:bg-white/10 dark:text-white">
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
                    <div className="bg-[#F5F5F7] px-4 py-4 dark:bg-white/5">
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
