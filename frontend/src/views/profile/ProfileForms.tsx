import { useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Loader2, X } from 'lucide-react';
import type { UserProfile } from '../../types/content';
import { SWIFTUI_SHEET } from '../../lib/motion';
import { authApi, cacheClientUser, getCachedClientUser } from '../../lib/snowyAuth.ts';

export interface UserBasicInfo {
  email?: string;
  phone?: string;
  gender?: string;
  birthday?: string;
  latestLoginTime?: string;
  latestLoginAddress?: string;
}

export function useProfileForms(profile: UserProfile, onUpdateProfile: (next: UserProfile) => void) {
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

  function openEditModal() {
    setDraftName(profile.name);
    setDraftBio(profile.bio);
    setProfileError('');
    setIsEditing(true);
  }

  async function handleSaveProfile(event: FormEvent) {
    event.preventDefault();
    const nextName = draftName.trim() || profile.name;
    const nextBio = draftBio.trim();
    setSavingProfile(true);
    setProfileError('');
    try {
      await authApi.updateProfile(nextName, nextBio);
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
  }

  function openPasswordModal() {
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
    setPasswordOpen(true);
  }

  async function handleChangePassword(event: FormEvent) {
    event.preventDefault();
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
  }

  return {
    isEditing,
    setIsEditing,
    draftName,
    setDraftName,
    draftBio,
    setDraftBio,
    savingProfile,
    profileError,
    openEditModal,
    handleSaveProfile,
    passwordOpen,
    setPasswordOpen,
    oldPassword,
    setOldPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordError,
    passwordSuccess,
    savingPassword,
    openPasswordModal,
    handleChangePassword,
  };
}

export type ProfileForms = ReturnType<typeof useProfileForms>;

export function ProfileModals({ form }: { form: ProfileForms }) {
  return (
    <>
      <AnimatePresence>
        {form.isEditing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-md"
            onClick={() => form.setIsEditing(false)}
          >
            <motion.form
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={SWIFTUI_SHEET}
              onClick={(event) => event.stopPropagation()}
              onSubmit={(event) => void form.handleSaveProfile(event)}
              className="w-full max-w-md space-y-5 rounded-app border-[0.5px] border-app-border bg-app-card p-6 shadow-2xl dark:border-app-border dark:bg-app-card"
              role="dialog"
              aria-modal="true"
              aria-label="编辑个人资料"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-app-text">
                  编辑个人资料
                </h3>
                <button
                  type="button"
                  onClick={() => form.setIsEditing(false)}
                  aria-label="取消编辑"
                  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="edit-name"
                    className="mb-1.5 block text-xs font-medium text-app-muted"
                  >
                    显示名称
                  </label>
                  <input
                    id="edit-name"
                    type="text"
                    value={form.draftName}
                    onChange={(event) => form.setDraftName(event.target.value)}
                    maxLength={24}
                    className="min-h-[44px] w-full border-[0.5px] border-app-border bg-app-surface px-3.5 py-2 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-primary dark:border-app-border dark:bg-app-surface dark:text-app-text"
                  />
                </div>
                <div>
                  <label
                    htmlFor="edit-bio"
                    className="mb-1.5 block text-xs font-medium text-app-muted"
                  >
                    个人简介
                  </label>
                  <textarea
                    id="edit-bio"
                    rows={3}
                    value={form.draftBio}
                    onChange={(event) => form.setDraftBio(event.target.value)}
                    maxLength={120}
                    className="w-full resize-none border-[0.5px] border-app-border bg-app-surface px-3.5 py-2 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-primary dark:border-app-border dark:bg-app-surface dark:text-app-text"
                  />
                </div>
              </div>

              {form.profileError && (
                <p className="text-xs text-app-text">{form.profileError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => form.setIsEditing(false)}
                  disabled={form.savingProfile}
                  className="min-h-[44px] rounded-app px-4 py-2 text-xs font-medium text-app-muted hover:bg-black/[0.05] disabled:opacity-50 dark:text-app-muted dark:hover:bg-white/[0.06]"
                >
                  取消
                </button>
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.96 }}
                  disabled={form.savingProfile}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-app bg-app-primary px-5 py-2 text-xs font-medium text-white disabled:opacity-60 dark:bg-app-surface dark:text-app-text"
                >
                  {form.savingProfile ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>{form.savingProfile ? '保存中…' : '保存更改'}</span>
                </motion.button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {form.passwordOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6 backdrop-blur-md"
            onClick={() => form.setPasswordOpen(false)}
          >
            <motion.form
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              transition={SWIFTUI_SHEET}
              onClick={(event) => event.stopPropagation()}
              onSubmit={(event) => void form.handleChangePassword(event)}
              className="w-full max-w-md space-y-5 rounded-app border-[0.5px] border-app-border bg-app-card p-6 shadow-2xl dark:border-app-border dark:bg-app-card"
              role="dialog"
              aria-modal="true"
              aria-label="修改登录密码"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-app-text">
                    修改登录密码
                  </h3>
                  <p className="mt-1 text-xs text-app-subtle">通过当前密码验证后设置新密码</p>
                </div>
                <button
                  type="button"
                  onClick={() => form.setPasswordOpen(false)}
                  aria-label="关闭修改密码"
                  className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {[
                  {
                    id: 'current-password',
                    label: '当前密码',
                    value: form.oldPassword,
                    onChange: form.setOldPassword,
                    autoComplete: 'current-password',
                  },
                  {
                    id: 'new-password',
                    label: '新密码',
                    value: form.newPassword,
                    onChange: form.setNewPassword,
                    autoComplete: 'new-password',
                  },
                  {
                    id: 'confirm-password',
                    label: '确认新密码',
                    value: form.confirmPassword,
                    onChange: form.setConfirmPassword,
                    autoComplete: 'new-password',
                  },
                ].map((field) => (
                  <div key={field.id}>
                    <label
                      htmlFor={field.id}
                      className="mb-1.5 block text-xs font-medium text-app-muted"
                    >
                      {field.label}
                    </label>
                    <input
                      id={field.id}
                      type="password"
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                      autoComplete={field.autoComplete}
                      className="min-h-[44px] w-full border-[0.5px] border-app-border bg-app-surface px-3.5 py-2 text-sm text-app-text focus:outline-none focus:ring-2 focus:ring-app-primary dark:border-app-border dark:bg-app-surface dark:text-app-text"
                    />
                  </div>
                ))}
              </div>

              {form.passwordError && (
                <p className="border-[0.5px] border-app-border bg-black/[0.06] px-3 py-2 text-xs text-app-text dark:border-app-border dark:bg-white/[0.10] dark:text-app-text">
                  {form.passwordError}
                </p>
              )}
              {form.passwordSuccess && (
                <p className="border-[0.5px] border-app-border bg-black/[0.06] px-3 py-2 text-xs text-app-text dark:border-app-border dark:bg-white/[0.10] dark:text-app-text">
                  {form.passwordSuccess}
                </p>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => form.setPasswordOpen(false)}
                  className="min-h-[44px] rounded-app px-4 py-2 text-xs font-medium text-app-muted hover:bg-black/[0.05] dark:text-app-muted dark:hover:bg-white/[0.06]"
                >
                  关闭
                </button>
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.96 }}
                  disabled={form.savingPassword}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-app bg-app-primary px-5 py-2 text-xs font-medium text-white disabled:opacity-50 dark:bg-app-surface dark:text-app-text"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{form.savingPassword ? '提交中…' : '确认修改'}</span>
                </motion.button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
