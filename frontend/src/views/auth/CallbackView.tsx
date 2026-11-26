import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Loader2, Lock, ShieldCheck, UserRound } from 'lucide-react';
import { motion } from 'motion/react';
import { AuthLayout } from './AuthLayout';
import { authApi } from '../../lib/snowyAuth';
import { navigate } from '../../lib/router';

interface CallbackViewProps {
  platform: string;
  onSuccess: (token: string) => void;
}

const PLATFORM_NAMES: Record<string, string> = {
  QQ: 'QQ',
  WECHAT: '微信',
};

const fieldClass =
  'w-full h-14 rounded-app bg-app-card border border-app-border shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-none focus:border-app-primary focus:outline-none focus:ring-4 focus:ring-app-primary/12 text-[15px] text-app-text placeholder:text-app-muted transition-all';
const labelClass = 'block text-[13px] font-medium text-app-muted mb-2';

/** 第三方授权回调落地页：换取 token；未绑定账号时展示绑定表单 */
export function CallbackView({ platform, onSuccess }: CallbackViewProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [needBind, setNeedBind] = useState(false);
  const [thirdId, setThirdId] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [bindLoading, setBindLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const search = new URLSearchParams(window.location.search);
    const params: Record<string, string> = {};
    search.forEach((value, key) => {
      params[key] = value;
    });

    authApi
      .thirdCallback({ ...params, platform })
      .then((data) => {
        if (cancelled) return;
        if (data?.startsWith('needBind')) {
          setThirdId(data.split(':')[1] || '');
          setNeedBind(true);
        } else if (data) {
          onSuccess(data);
        } else {
          setError('登录失败，未获取到有效凭证');
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '第三方登录失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [platform, onSuccess]);

  const handleBind = async (event: FormEvent) => {
    event.preventDefault();
    if (!account.trim() || !password) {
      setError('请输入账号和密码');
      return;
    }
    setError('');
    setBindLoading(true);
    try {
      await authApi.thirdBindAccount({
        thirdId,
        account: account.trim(),
        password,
      });
      // 绑定接口内部以 B 端登录校验密码；门户统一使用 C 端 token
      const token = await authApi.login(account.trim(), password);
      onSuccess(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : '绑定失败，请稍后重试');
    } finally {
      setBindLoading(false);
    }
  };

  const platformName = PLATFORM_NAMES[platform] || platform;

  return (
    <AuthLayout
      title={needBind ? '绑定已有账号' : `${platformName}登录`}
      subtitle={needBind ? '绑定后即可使用该账号快速登录' : '正在完成授权，请稍候'}
      footer={
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 font-semibold text-white underline decoration-white/40 underline-offset-4 hover:text-[#6CB6FF] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回登录页
        </button>
      }
    >
      {loading && (
        <div className="py-16 flex flex-col items-center gap-5 text-center">
          <Loader2 className="h-9 w-9 animate-spin text-app-primary" />
          <p className="text-[14px] text-app-muted">正在与 {platformName} 交换授权信息...</p>
        </div>
      )}

      {!loading && needBind && (
        <form onSubmit={handleBind} className="space-y-5">
          <div className="rounded-app bg-app-surface dark:bg-[#242426] px-4 py-3.5 text-[13px] leading-relaxed text-app-muted">
            该 {platformName} 账号尚未绑定本站账号，请使用已有账号密码完成绑定。
          </div>
          <div>
            <label htmlFor="bind-account" className={labelClass}>
              账号
            </label>
            <div className="relative">
              <UserRound className="w-5 h-5 text-app-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="bind-account"
                type="text"
                value={account}
                onChange={(event) => setAccount(event.target.value)}
                placeholder="请输入已有账号"
                className={`${fieldClass} pl-12 pr-5`}
              />
            </div>
          </div>
          <div>
            <label htmlFor="bind-password" className={labelClass}>
              密码
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-app-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="bind-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入密码"
                className={`${fieldClass} pl-12 pr-5`}
              />
            </div>
          </div>
          {error && (
            <p role="alert" className="rounded-app bg-[#FF3B30]/8 border border-[#FF3B30]/20 px-4 py-3 text-[13px] text-[#D70015] dark:text-[#FF453A]">
              {error}
            </p>
          )}
          <motion.button
            type="submit"
            whileTap={{ scale: 0.99 }}
            disabled={bindLoading}
            className="w-full h-14 rounded-app bg-app-primary dark:bg-[#0A84FF] text-white text-[15px] font-medium flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-60"
          >
            {bindLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
            {bindLoading ? '正在绑定...' : '确认绑定并登录'}
          </motion.button>
        </form>
      )}

      {!loading && !needBind && error && (
        <div className="py-12 space-y-6 text-center">
          <div className="w-20 h-20 rounded-full bg-[#FF3B30]/10 text-[#FF3B30] flex items-center justify-center mx-auto">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <p role="alert" className="text-[14px] text-[#D70015] dark:text-[#FF453A]">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full h-14 rounded-app bg-app-primary dark:bg-[#0A84FF] text-white text-[15px] font-medium hover:brightness-110"
          >
            重新登录
          </button>
        </div>
      )}
    </AuthLayout>
  );
}
