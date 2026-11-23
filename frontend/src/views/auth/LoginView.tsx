import { useEffect, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Eye, EyeOff, Loader2, Lock, QrCode, RefreshCw, UserRound, X } from 'lucide-react';
import { authApi, type CaptchaResult } from '../../lib/snowyAuth';
import { navigate } from '../../lib/router';
import qqIcon from '../../assets/images/authSource/qq.png';
import wechatIcon from '../../assets/images/authSource/wechat.png';

interface LoginViewProps {
  onSuccess: (token: string) => void;
  onClose: () => void;
}

type LoginMode = 'wechat' | 'password';

const fieldClass =
  'w-full h-14 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/[0.12] dark:border-white/[0.16] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none focus:border-[#0071E3] dark:focus:border-[#0A84FF] focus:outline-none focus:ring-4 focus:ring-[#0071E3]/12 text-[15px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] transition-all';
const labelClass = 'block text-[13px] font-medium text-[#6E6E73] dark:text-[#98989D] mb-2';
const primaryButtonClass =
  'w-full h-14 rounded-2xl bg-[#0071E3] dark:bg-[#0A84FF] text-white text-[15px] font-medium flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-60 transition-all';
const secondaryButtonClass =
  'w-full h-14 rounded-2xl border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#242426] flex items-center justify-center gap-2.5 text-[15px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E] disabled:opacity-50 transition-colors';

/** 当前页面上层展示的登录弹窗 */
export function LoginView({ onSuccess, onClose }: LoginViewProps) {
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

  // 弹窗打开时锁定背景滚动，并支持 Esc / 点击遮罩关闭
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-[80] flex items-stretch justify-center bg-black/55 backdrop-blur-md sm:items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-modal-title"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="no-scrollbar relative h-[100dvh] max-h-[100dvh] w-full max-w-[460px] overflow-y-auto rounded-none border border-black/[0.06] bg-white px-6 pb-7 pt-8 shadow-[0_32px_100px_rgba(0,0,0,0.35)] dark:border-white/10 dark:bg-[#111318] sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:rounded-[28px] sm:px-9 sm:pb-9 sm:pt-9"
      >
        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2
              id="login-modal-title"
              className="text-center text-[24px] font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] sm:text-left"
            >
              {mode === 'wechat' ? '微信扫码登录' : '账号密码登录'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭登录弹窗"
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#86868B] transition-colors hover:bg-black/[0.05] hover:text-[#1D1D1F] dark:hover:bg-white/[0.08] dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {mode === 'wechat' ? (
          <div className="flex flex-col space-y-4">
            <div className="py-1 text-center space-y-4">
              <div className="relative mx-auto h-40 w-40">
                <div className="absolute inset-0 rounded-3xl border-2 border-dashed border-[#07C160]/35" />
                <div className="absolute inset-4 flex items-center justify-center rounded-2xl bg-[#07C160]/10">
                  <img src={wechatIcon} alt="" className="h-20 w-20" />
                </div>
                <span className="absolute -right-1 -top-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#07C160] text-white shadow-lg">
                  <QrCode className="h-5 w-5" />
                </span>
              </div>
              <div className="space-y-1.5">
                <p className="text-[16px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                  微信扫码登录 / 注册
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

            <div className="w-full space-y-3 pt-1">
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
          <div className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    autoFocus
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

        <div className="mt-5 border-t border-black/[0.06] pt-4 text-center text-[13px] text-[#6E6E73] dark:border-white/[0.08] dark:text-[#98989D]">
          还没有账号？{' '}
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="font-semibold text-[#0071E3] hover:underline dark:text-[#0A84FF]"
          >
            立即注册
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              key={error}
              role="alert"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="mt-4 rounded-2xl bg-[#FF3B30]/10 px-4 py-3 text-center text-[13px] font-medium text-[#D70015] dark:bg-[#FF3B30]/15 dark:text-[#FF453A]"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
