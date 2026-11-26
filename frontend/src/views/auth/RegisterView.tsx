import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, AtSign, Check, Eye, EyeOff, Loader2, Lock, RefreshCw, ShieldCheck, UserRound } from 'lucide-react';
import { motion } from 'motion/react';
import { AuthLayout } from './AuthLayout';
import { authApi, type CaptchaResult } from '../../lib/snowyAuth';
import { navigate } from '../../lib/router';

const fieldClass =
  'w-full h-14 rounded-app bg-app-card border border-app-border shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none focus:border-app-primary focus:outline-none focus:ring-4 focus:ring-app-primary/12 text-[15px] text-app-text placeholder:text-app-muted transition-all';
const labelClass = 'block text-[13px] font-medium text-app-muted mb-2';

export function RegisterView() {
  const [account, setAccount] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validCode, setValidCode] = useState('');
  const [captcha, setCaptcha] = useState<CaptchaResult | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const loadCaptcha = () => {
    authApi
      .getPicCaptcha()
      .then(setCaptcha)
      .catch(() => setCaptcha(null));
  };

  useEffect(() => {
    loadCaptcha();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!account.trim()) {
      setError('请输入账号');
      return;
    }
    if (!nickname.trim()) {
      setError('请输入昵称');
      return;
    }
    if (!password) {
      setError('请输入密码');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await authApi.register(account.trim(), password, validCode.trim(), captcha?.validCodeReqNo || '', nickname.trim());
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败，请稍后重试');
      loadCaptcha();
      setValidCode('');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthLayout
        title="注册成功"
        subtitle="账号已创建，现在可以登录了"
        footer={
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="font-semibold text-white underline decoration-white/40 underline-offset-4 hover:text-[#6CB6FF] transition-colors"
          >
            前往登录
          </button>
        }
      >
        <div className="py-10 text-center space-y-6">
          <div className="w-20 h-20 rounded-full bg-[#34C759]/10 text-[#34C759] flex items-center justify-center mx-auto">
            <Check className="w-10 h-10" />
          </div>
          <div>
            <p className="text-[18px] font-medium">欢迎加入，{nickname.trim()}</p>
            <p className="mt-2 text-[13px] text-app-muted">你的账号已创建完成，请使用账号密码登录。</p>
          </div>
          <motion.button
            type="button"
            whileTap={{ scale: 0.99 }}
            onClick={() => navigate('/login')}
            className="w-full h-14 rounded-app bg-app-primary dark:bg-[#0A84FF] text-white text-[15px] font-medium hover:brightness-110 transition-all"
          >
            立即登录
          </motion.button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="创建账号"
      subtitle="注册后即可收藏内容并参与互动"
      footer={
        <span>
          已有账号？{' '}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="font-semibold text-white underline decoration-white/40 underline-offset-4 hover:text-[#6CB6FF] transition-colors"
          >
            返回登录
          </button>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="register-account" className={labelClass}>
            账号
          </label>
          <div className="relative">
            <UserRound className="w-5 h-5 text-app-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="register-account"
              type="text"
              autoComplete="username"
              value={account}
              onChange={(event) => setAccount(event.target.value)}
              placeholder="请输入账号"
              className={`${fieldClass} pl-12 pr-5`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-nickname" className={labelClass}>
            昵称
          </label>
          <div className="relative">
            <AtSign className="w-5 h-5 text-app-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="register-nickname"
              type="text"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="请输入昵称（评论与互动中展示）"
              maxLength={24}
              className={`${fieldClass} pl-12 pr-5`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-password" className={labelClass}>
            密码
          </label>
          <div className="relative">
            <Lock className="w-5 h-5 text-app-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="请输入密码"
              className={`${fieldClass} pl-12 pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? '隐藏密码' : '显示密码'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-app text-app-muted hover:text-app-text dark:hover:text-white"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="register-confirm" className={labelClass}>
            确认密码
          </label>
          <input
            id="register-confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="请再次输入密码"
            className={`${fieldClass} px-4`}
          />
        </div>

        {captcha?.validCodeBase64 && (
          <div>
            <label htmlFor="register-captcha" className={labelClass}>
              验证码
            </label>
            <div className="flex gap-2">
              <input
                id="register-captcha"
                type="text"
                value={validCode}
                onChange={(event) => setValidCode(event.target.value)}
                placeholder="请输入图中字符"
                className={`${fieldClass} flex-1 px-4`}
              />
              <button
                type="button"
                onClick={loadCaptcha}
                title="点击刷新验证码"
                className="h-14 shrink-0 rounded-app overflow-hidden border border-app-border dark:border-white/[0.1] bg-app-card flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                <img src={captcha.validCodeBase64} alt="图形验证码" className="h-full w-auto object-contain" />
              </button>
              <button
                type="button"
                onClick={loadCaptcha}
                aria-label="刷新验证码"
                className="w-14 h-14 shrink-0 rounded-app border border-app-border dark:border-white/[0.1] flex items-center justify-center text-app-muted hover:text-app-text dark:hover:text-white"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-app bg-[#FF3B30]/8 border border-[#FF3B30]/20 px-4 py-3 text-[13px] text-[#D70015] dark:text-[#FF453A]">
            {error}
          </p>
        )}

        <motion.button
          type="submit"
          whileTap={{ scale: 0.99 }}
          disabled={submitting}
          className="w-full h-14 rounded-app bg-app-primary dark:bg-[#0A84FF] text-white text-[15px] font-medium flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-60 transition-all"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
          {submitting ? '正在注册...' : '创建账号'}
          {!submitting && <ArrowRight className="w-5 h-5" />}
        </motion.button>
      </form>
    </AuthLayout>
  );
}
