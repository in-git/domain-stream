import { useRef, useState, type FormEvent } from 'react';
import {
  Camera,
  Check,
  FileText,
  Film,
  Images,
  KeyRound,
  LogOut,
  X,
} from 'lucide-react';
import { api, uploadFileWithProgress } from '../../lib/api.ts';
import type { ModuleKey, UserProfile } from '../../types/cms.ts';
import { MediaImage } from '../../components/MediaImage.tsx';
import { SelectField, type SelectFieldOption } from '../../components/SelectField.tsx';

const DEFAULT_MODULE_OPTIONS: SelectFieldOption[] = [
  { value: 'dashboard', label: '首页看板' },
  { value: 'videos', label: '视频管理' },
  { value: 'imagetexts', label: '图文管理' },
  { value: 'articles', label: '文章管理' },
];

interface PersonalCenterViewProps {
  user: UserProfile;
  myCounts: {
    videos: number;
    imagetexts: number;
    articles: number;
  };
  onUserUpdated: (user: UserProfile) => void;
  onLogout: () => void;
}

export function PersonalCenterView({
  user,
  myCounts,
  onUserUpdated,
  onLogout,
}: PersonalCenterViewProps) {
  const [name, setName] = useState(user.name);
  const [roleTitle, setRoleTitle] = useState(user.roleTitle);
  const [department, setDepartment] = useState(user.department);
  const [bio, setBio] = useState(user.bio);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [defaultModule, setDefaultModule] = useState<ModuleKey>(user.defaultModule);
  const [liveRefresh, setLiveRefresh] = useState(user.liveRefresh);

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState('');

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [passMessage, setPassMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange(file: File) {
    if (!file.type.startsWith('image/')) return;
    setAvatarUploading(true);
    setProfileNotice('');
    try {
      const res = await uploadFileWithProgress(file);
      setAvatarUrl(res.url);
      const updated = await api.updateProfile({ avatarUrl: res.url });
      onUserUpdated(updated.user);
      setProfileNotice('头像已更新');
    } catch (err) {
      setProfileNotice(err instanceof Error ? err.message : '头像上传失败');
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSaveProfile(e: FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileNotice('');
    try {
      const res = await api.updateProfile({
        name,
        roleTitle,
        department,
        bio,
        avatarUrl,
        defaultModule,
        liveRefresh,
      });
      onUserUpdated(res.user);
      setProfileNotice('个人资料与偏好设置已保存');
    } catch (err) {
      setProfileNotice(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSavingProfile(false);
    }
  }

  function openPasswordModal() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPassMessage(null);
    setPasswordModalOpen(true);
  }

  function closePasswordModal() {
    if (savingPass) return;
    setPasswordModalOpen(false);
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPassMessage(null);
    if (newPassword.length < 6) {
      setPassMessage({ type: 'err', text: '新密码至少需要 6 位字符' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMessage({ type: 'err', text: '两次输入的新密码不一致' });
      return;
    }
    setSavingPass(true);
    try {
      await api.updatePassword(currentPassword, newPassword);
      setPassMessage({ type: 'ok', text: '登录密码已更新，下次登录请使用新密码' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPassMessage({
        type: 'err',
        text: err instanceof Error ? err.message : '修改密码失败',
      });
    } finally {
      setSavingPass(false);
    }
  }

  return (
    <div className="space-y-6 max-w-[1040px]">
      {/* Profile Hero Header */}
      <section className="bg-white rounded-[20px] border border-[#E5E5EA] p-6 sm:p-8 shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <MediaImage
              src={avatarUrl}
              alt={user.name}
              fallbackLabel={user.name.slice(0, 1)}
              className="w-20 h-20 rounded-full object-cover border border-[#E5E5EA]"
            />
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleAvatarChange(f);
              }}
            />
            <button
              type="button"
              disabled={avatarUploading}
              onClick={() => avatarInputRef.current?.click()}
              aria-label="更换头像"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border border-[#E5E5EA] shadow-sm flex items-center justify-center text-[#1D1D1F] hover:text-[#0071E3] transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h2 className="text-[22px] font-semibold tracking-tight text-[#1D1D1F]">
              {user.name}
            </h2>
            <div className="mt-1 text-[13px] text-[#6E6E73] flex flex-wrap items-center gap-2">
              <span>{user.roleTitle}</span>
              <span aria-hidden="true">·</span>
              <span>{user.department}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{user.email}</span>
            </div>
            <p className="mt-2 text-[13px] text-[#86868B] max-w-xl">{user.bio}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={openPasswordModal}
            className="h-9 px-4 rounded-xl bg-[#F5F5F7] hover:bg-[#0071E3]/10 hover:text-[#0071E3] text-[13px] font-medium text-[#1D1D1F] inline-flex items-center gap-1.5 transition-colors"
          >
            <KeyRound className="w-4 h-4" />
            <span>修改密码</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="h-9 px-4 rounded-xl bg-[#F5F5F7] hover:bg-[#FF3B30]/10 hover:text-[#D70015] text-[13px] font-medium text-[#1D1D1F] inline-flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>退出当前账号</span>
          </button>
        </div>
      </section>

      {/* Content Contribution Summary */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] p-5 flex items-center justify-between">
          <div>
            <div className="text-[13px] text-[#6E6E73]">我管理的视频</div>
            <div className="text-[28px] font-semibold text-[#1D1D1F] tabular-nums mt-1">
              {myCounts.videos}
            </div>
          </div>
          <Film className="w-6 h-6 text-[#0071E3]" strokeWidth={1.7} />
        </div>
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] p-5 flex items-center justify-between">
          <div>
            <div className="text-[13px] text-[#6E6E73]">我发布的图文</div>
            <div className="text-[28px] font-semibold text-[#1D1D1F] tabular-nums mt-1">
              {myCounts.imagetexts}
            </div>
          </div>
          <Images className="w-6 h-6 text-[#34C759]" strokeWidth={1.7} />
        </div>
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] p-5 flex items-center justify-between">
          <div>
            <div className="text-[13px] text-[#6E6E73]">我撰写的文章</div>
            <div className="text-[28px] font-semibold text-[#1D1D1F] tabular-nums mt-1">
              {myCounts.articles}
            </div>
          </div>
          <FileText className="w-6 h-6 text-[#5856D6]" strokeWidth={1.7} />
        </div>
      </section>

      {/* Profile & Workspace Preferences Form */}
      <form
        onSubmit={handleSaveProfile}
        className="bg-white rounded-[20px] border border-[#E5E5EA] p-6 space-y-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[17px] font-semibold text-[#1D1D1F]">基本资料与工作台偏好</h3>
          {profileNotice && (
            <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#16A34A]">
              <Check className="w-3.5 h-3.5" />
              {profileNotice}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
              姓名 / 署名
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-[#F5F5F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 text-[14px]"
            />
          </div>
          <div>
            <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
              职位角色
            </label>
            <input
              type="text"
              value={roleTitle}
              onChange={(e) => setRoleTitle(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-[#F5F5F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 text-[14px]"
            />
          </div>
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
            所属部门
          </label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full h-10 px-3.5 rounded-xl bg-[#F5F5F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 text-[14px]"
          />
        </div>

        <div>
          <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
            个人简介
          </label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full p-3.5 rounded-xl bg-[#F5F5F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 text-[14px] resize-none"
          />
        </div>

        <div className="pt-2 border-t border-[#F2F2F7] grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div>
            <label className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
              登录后默认进入模块
            </label>
            <SelectField
              value={defaultModule}
              onChange={(value) => setDefaultModule(value as ModuleKey)}
              ariaLabel="登录后默认进入模块"
              className="w-full"
              options={DEFAULT_MODULE_OPTIONS}
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-[#F5F5F7]">
            <div>
              <div className="text-[13px] font-medium text-[#1D1D1F]">看板实时访客推送</div>
              <div className="text-[11px] text-[#86868B]">开启后每 3 秒自动同步在线人数</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={liveRefresh}
              onClick={() => setLiveRefresh((v) => !v)}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 shrink-0 ${
                liveRefresh ? 'bg-[#34C759]' : 'bg-[#D1D1D6]'
              }`}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                  liveRefresh ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={savingProfile}
            className="h-10 px-5 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-60 text-white text-[13px] font-medium"
          >
            {savingProfile ? '正在保存...' : '保存个人设置'}
          </button>
        </div>
      </form>

      {/* Change Password Modal */}
      {passwordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onMouseDown={closePasswordModal}
        >
          <div
            className="w-full max-w-[420px] bg-white rounded-[22px] border border-[#E5E5EA] shadow-2xl overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0071E3]/10 flex items-center justify-center">
                  <KeyRound className="w-[18px] h-[18px] text-[#0071E3]" />
                </div>
                <div>
                  <h3 className="text-[17px] font-semibold text-[#1D1D1F]">修改登录密码</h3>
                  <p className="text-[11px] text-[#86868B] mt-0.5">密码由小诺统一账号体系管理</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePasswordModal}
                aria-label="关闭"
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-colors"
              >
                <X className="w-[18px] h-[18px]" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="px-6 pb-6 space-y-3.5">
              <div>
                <label className="block text-[12px] font-medium text-[#6E6E73] mb-1">
                  当前密码
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-[#F5F5F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 text-[13px]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#6E6E73] mb-1">
                  新密码（至少 6 位）
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-[#F5F5F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 text-[13px]"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#6E6E73] mb-1">
                  确认新密码
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full h-10 px-3.5 rounded-xl bg-[#F5F5F7] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 text-[13px]"
                />
              </div>

              {passMessage && (
                <div
                  className={`rounded-xl px-3 py-2 text-[12px] ${
                    passMessage.type === 'ok'
                      ? 'bg-[#34C759]/10 text-[#16A34A]'
                      : 'bg-[#FF3B30]/8 text-[#D70015]'
                  }`}
                >
                  {passMessage.text}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="h-10 px-4 rounded-xl bg-[#F5F5F7] hover:bg-[#EBEBF0] text-[13px] font-medium text-[#1D1D1F]"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={savingPass}
                  className="h-10 px-5 rounded-xl bg-[#1D1D1F] hover:bg-[#3A3A3C] disabled:opacity-60 text-white text-[13px] font-medium"
                >
                  {savingPass ? '正在更新...' : '确认修改'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
