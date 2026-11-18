import { useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { api, setStoredToken } from '../lib/api.ts';
import type { UserProfile } from '../types/cms.ts';

interface LoginViewProps {
  onLoginSuccess: (user: UserProfile) => void;
}

const PRESET_ACCOUNTS = [
  { label: '林清禾 · 内容主理人', email: 'admin@studio.cn', pass: '123456' },
  { label: '陈屿 · 高级编辑', email: 'editor@studio.cn', pass: '123456' },
];

export function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [email, setEmail] = useState('admin@studio.cn');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.login(email, password);
      setStoredToken(res.token);
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请重试');
    } finally {
      setSubmitting(false);
    }
  }

  async function quickLogin(presetEmail: string, presetPass: string) {
    setEmail(presetEmail);
    setPassword(presetPass);
    setError('');
    setSubmitting(true);
    try {
      const res = await api.login(presetEmail, presetPass);
      setStoredToken(res.token);
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[420px] bg-white rounded-[22px] border border-[#E5E5EA] shadow-[0_12px_40px_rgba(0,0,0,0.05)] p-8 sm:p-10">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-[14px] bg-[#1D1D1F] text-white flex items-center justify-center mx-auto mb-4 text-lg font-semibold tracking-tight">
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
              工作邮箱
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@studio.cn"
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
            {!submitting && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-7 pt-6 border-t border-[#E5E5EA]">
          <p className="text-[12px] text-[#86868B] mb-2.5">
            内部系统无需注册，可点击下方预设账号直接登录：
          </p>
          <div className="grid grid-cols-1 gap-2">
            {PRESET_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={submitting}
                onClick={() => quickLogin(acc.email, acc.pass)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#F5F5F7] hover:bg-[#ECECF0] text-left transition-colors"
              >
                <span className="text-[13px] font-medium text-[#1D1D1F]">{acc.label}</span>
                <span className="text-[12px] font-mono text-[#6E6E73]">{acc.email}</span>
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
