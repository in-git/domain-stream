import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, Eye, EyeOff, Loader2, Lock, ShieldCheck, UserRound } from 'lucide-react';
import { api } from '../lib/api.ts';
import type { UserProfile } from '../types/cms.ts';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
}

const PRESET_ACCOUNTS = [
  { label: '超级管理员', account: 'superAdmin', pass: 'Snowy@2026!' },
  { label: '业务管理员', account: 'bizAdmin', pass: 'Snowy@2026!' },
];

const ACCOUNT_KEY = 'SNOWY_ACCOUNT';

function readRememberedAccount(): string {
  try {
    return localStorage.getItem(ACCOUNT_KEY) || 'superAdmin';
  } catch {
    return 'superAdmin';
  }
}

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState(readRememberedAccount);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function persistAccount(account: string) {
    try {
      if (remember) localStorage.setItem(ACCOUNT_KEY, account);
      else localStorage.removeItem(ACCOUNT_KEY);
    } catch {
      // ignore
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const account = email.trim();
      const res = await api.login(account, password);
      persistAccount(account);
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  async function quickLogin(presetAccount: string, presetPass: string) {
    setEmail(presetAccount);
    setPassword(presetPass);
    setError('');
    setSubmitting(true);
    try {
      const res = await api.login(presetAccount, presetPass);
      persistAccount(presetAccount);
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#EEF2F7] via-[#F5F5F7] to-[#E8ECF2] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px] bg-white rounded-[24px] border border-white/70 shadow-[0_20px_60px_rgba(0,0,0,0.08)] p-8 sm:p-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-[16px] bg-gradient-to-br from-[#2C2C2E] to-[#1D1D1F] text-white flex items-center justify-center mx-auto mb-5 text-xl font-semibold tracking-tight shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
            C
          </div>
          <h1 className="text-[24px] font-semibold tracking-tight text-[#1D1D1F] text-balance">
            登录 CueStudio 工作台
          </h1>
          <p className="mt-2 text-[14px] text-[#6E6E73] leading-relaxed">
            使用团队内部授权账号进入内容管理与实时数据看板
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
              登录账号
            </label>
            <div className="relative">
              <UserRound className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-email"
                type="text"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="superAdmin"
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#0071E3] focus:outline-none focus:ring-4 focus:ring-[#0071E3]/10 text-[14px] text-[#1D1D1F] transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-[13px] font-medium text-[#1D1D1F] mb-1.5">
              登录密码
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="输入登录密码"
                className="w-full h-11 pl-10 pr-11 rounded-xl bg-[#F5F5F7] border border-transparent focus:bg-white focus:border-[#0071E3] focus:outline-none focus:ring-4 focus:ring-[#0071E3]/10 text-[14px] text-[#1D1D1F] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg text-[#86868B] hover:text-[#1D1D1F] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setRemember((v) => !v)}
            className="flex items-center gap-2 text-[13px] text-[#6E6E73] hover:text-[#1D1D1F] transition-colors select-none"
          >
            <span
              className={`w-[18px] h-[18px] rounded-[5px] border flex items-center justify-center transition-all ${
                remember
                  ? 'bg-[#0071E3] border-[#0071E3] text-white'
                  : 'bg-white border-[#C7C7CC] text-transparent'
              }`}
            >
              <Check className="w-3 h-3" strokeWidth={3} />
            </span>
            记住账号，下次自动填充
          </button>

          {error && (
            <div
              role="alert"
              className="rounded-xl bg-[#FF3B30]/8 border border-[#FF3B30]/20 px-3.5 py-2.5 text-[13px] text-[#D70015]"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 mt-2 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] active:scale-[0.99] disabled:opacity-60 text-white text-[14px] font-medium flex items-center justify-center gap-2 transition-all"
          >
            <span>{submitting ? '正在验证身份...' : '登录控制台'}</span>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-7 pt-6 border-t border-[#E5E5EA]">
          <p className="text-[12px] text-[#86868B] mb-2.5 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0071E3]" />
            使用小诺 Snowy 统一认证账号，点击下方预设可快速登录：
          </p>
          <div className="grid grid-cols-1 gap-2">
            {PRESET_ACCOUNTS.map((acc) => (
              <button
                key={acc.account}
                type="button"
                disabled={submitting}
                onClick={() => quickLogin(acc.account, acc.pass)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] hover:bg-[#ECECF0] text-left transition-colors"
              >
                <span className="text-[13px] font-medium text-[#1D1D1F]">{acc.label}</span>
                <span className="text-[12px] font-mono text-[#6E6E73]">{acc.account}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-6 text-[12px] text-[#86868B]">
        CueStudio 内容与数据中心 · 仅限内部团队使用
      </p>
    </div>
  );
}
