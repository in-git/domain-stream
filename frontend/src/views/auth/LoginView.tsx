import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Eye, EyeOff, Loader2, Lock, QrCode, RefreshCw, ScanLine, UserRound } from 'lucide-react';
import { AuthLayout } from './AuthLayout';
import { authApi, type CaptchaResult } from '../../lib/snowyAuth';
import { navigate } from '../../lib/router';
import qqIcon from '../../assets/images/authSource/qq.png';
import wechatIcon from '../../assets/images/authSource/wechat.png';

interface LoginViewProps {
  onSuccess: (token: string) => void;
}

type LoginMode = 'wechat' | 'password';

const fieldClass =
  'w-full h-14 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/[0.12] dark:border-white/[0.16] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none focus:border-[#0071E3] dark:focus:border-[#0A84FF] focus:outline-none focus:ring-4 focus:ring-[#0071E3]/12 text-[15px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] transition-all';
const labelClass = 'block text-[13px] font-medium text-[#6E6E73] dark:text-[#98989D] mb-2';
const primaryButtonClass =
  'w-full h-14 rounded-2xl bg-[#0071E3] dark:bg-[#0A84FF] text-white text-[15px] font-medium flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-60 transition-all';
const secondaryButtonClass =
  'w-full h-14 rounded-2xl border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#242426] flex items-center justify-center gap-2.5 text-[15px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E] disabled:opacity-50 transition-colors';

export function LoginView({ onSuccess }: LoginViewProps) {
  const [mode, setMode] = useState<LoginMode>('wechat');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [thirdLoading, setThirdLoading] = useState('');
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [captcha, setCaptcha] = useState<CaptchaResult | null>(null);
  const [validCode, setValidCode] = useState('');

  const loadCaptcha = () => {
    authApi
      .getPicCaptcha()
      .then(setCaptcha)
      .catch(() => setCaptcha(null));
  };

  useEffect(() => {
    authApi
      .thirdAllowFlags()
      .then(setFlags)
      .catch(() => {
        // 配置读取失败时默认展示微信 / QQ 入口，由后端在 render 时给出明确错误
      });
    authApi
      .sysBaseConfig()
      .then((config) => {
        if (config.SNOWY_SYS_DEFAULT_CAPTCHA_OPEN_FLAG_FOR_C === 'true') {
          setCaptchaOpen(true);
          loadCaptcha();
        }
      })
      .catch(() => {
        // 配置不可读时按默认关闭验证码处理
      });
  }, []);

  const switchMode = (next: LoginMode) => {
    setError('');
    setMode(next);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!account.trim()) {
      setError('请输入账号');
      return;
    }
    if (!password) {
      setError('请输入密码');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const token = await authApi.login(
        account.trim(),
        password,
        validCode.trim(),
        captcha?.validCodeReqNo || ''
      );
      onSuccess(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请稍后重试');
      if (captchaOpen) {
        loadCaptcha();
        setValidCode('');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleThirdLogin = async (platform: 'QQ' | 'WECHAT') => {
    setError('');
    setThirdLoading(platform);
    try {
      const result = await authApi.thirdRender(platform);
      if (!result?.authorizeUrl) throw new Error('未获取到授权地址');
      // 跳转微信 / QQ 官方授权页，由官方页面展示二维码，扫码确认后回调本站
      window.location.href = result.authorizeUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : '第三方登录暂不可用');
      setThirdLoading('');
    }
  };

  const showQq = flags.SNOWY_THIRD_QQ_ALLOW_LOGIN_FLAG !== false;
  const showWechat = flags.SNOWY_THIRD_WECHAT_ALLOW_LOGIN_FLAG !== false;

  return (
    <AuthLayout
      title={mode === 'wechat' ? '微信扫码登录' : '账号密码登录'}
      subtitle={mode === 'wechat' ? '微信扫一扫，登录或注册一步完成' : '使用账号密码登录你的账号'}
      footer={
        mode === 'wechat' ? undefined : (
          <span>
            还没有账号？{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="font-semibold text-white underline decoration-white/40 underline-offset-4 hover:text-[#6CB6FF] transition-colors"
            >
              立即注册
            </button>
          </span>
        )
      }
    >
      {mode === 'wechat' ? (
        <div className="space-y-5">
          <div className="py-1 text-center space-y-4">
            <div className="relative mx-auto h-24 w-24">
              <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-[#07C160]/35" />
              <div className="absolute inset-3 flex items-center justify-center rounded-2xl bg-[#07C160]/10">
                <img src={wechatIcon} alt="" className="h-12 w-12" />
              </div>
              <span className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#07C160] text-white shadow-lg">
                <ScanLine className="h-4 w-4" />
              </span>
            </div>
            <div className="space-y-1.5">
              <p className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                微信扫码登录 / 注册
              </p>
              <p className="mx-auto max-w-xs text-[13px] leading-relaxed text-[#86868B]">
                点击下方按钮，在微信中扫码确认即可登录，新用户将自动完成注册
              </p>
            </div>
          </div>

          {showWechat ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.99 }}
              onClick={() => void handleThirdLogin('WECHAT')}
              disabled={!!thirdLoading}
              className="flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#07C160] text-[15px] font-medium text-white hover:brightness-110 disabled:opacity-60 transition-all"
            >
              {thirdLoading === 'WECHAT' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <QrCode className="h-5 w-5" />
              )}
              {thirdLoading === 'WECHAT' ? '正在跳转微信授权...' : '微信扫码登录 / 注册'}
            </motion.button>
          ) : (
            <div className="rounded-2xl bg-[#F5F5F7] dark:bg-[#242426] px-4 py-3.5 text-center text-[13px] text-[#6E6E73] dark:text-[#98989D]">
              微信登录暂未开通，请使用账号密码登录
            </div>
          )}

          <div className="space-y-3 pt-1">
            {showQq && (
              <button type="button" onClick={() => void handleThirdLogin('QQ')} disabled={!!thirdLoading} className={secondaryButtonClass}>
                <img src={qqIcon} alt="" className="h-5 w-5" />
                QQ 快捷登录
              </button>
            )}
            <button type="button" onClick={() => switchMode('password')} className={secondaryButtonClass}>
              <UserRound className="h-5 w-5" />
              使用账号密码登录
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-account" className={labelClass}>
                账号
              </label>
              <div className="relative">
                <UserRound className="w-5 h-5 text-[#86868B] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-account"
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
              <label htmlFor="login-password" className={labelClass}>
                密码
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-[#86868B] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="请输入密码"
                  className={`${fieldClass} pl-12 pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-xl text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {captchaOpen && captcha?.validCodeBase64 && (
              <div>
                <label htmlFor="login-captcha" className={labelClass}>
                  验证码
                </label>
                <div className="flex gap-2.5">
                  <input
                    id="login-captcha"
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
                    className="h-14 shrink-0 rounded-2xl overflow-hidden border border-black/[0.06] dark:border-white/[0.1] bg-white flex items-center justify-center hover:opacity-80 transition-opacity"
                  >
                    <img src={captcha.validCodeBase64} alt="图形验证码" className="h-full w-auto object-contain" />
                  </button>
                  <button
                    type="button"
                    onClick={loadCaptcha}
                    aria-label="刷新验证码"
                    className="w-14 h-14 shrink-0 rounded-2xl border border-black/[0.06] dark:border-white/[0.1] flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            <motion.button
              type="submit"
              whileTap={{ scale: 0.99 }}
              disabled={submitting}
              className={primaryButtonClass}
            >
              {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {submitting ? '正在登录...' : '登录'}
              {!submitting && <ArrowRight className="w-5 h-5" />}
            </motion.button>
          </form>

          <button type="button" onClick={() => switchMode('wechat')} className={secondaryButtonClass}>
            <img src={wechatIcon} alt="" className="h-5 w-5" />
            返回微信扫码登录
          </button>
        </div>
      )}

      {/* 错误信息统一放底部提示，不占用表单布局 */}
      <AnimatePresence>
        {error && (
          <motion.div
            key={error}
            role="alert"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed bottom-6 left-0 right-0 z-50 mx-auto w-fit max-w-[calc(100%-2rem)] rounded-2xl bg-[#FF3B30] px-5 py-3 text-center text-[13px] font-medium text-white shadow-lg"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </AuthLayout>
  );
}
