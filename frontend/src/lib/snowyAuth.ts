/**
 * 后端认证对接层（C 端）
 * ------------------------------------------------------------------
 * 流程参照 backend/snowy-admin-web：SM2 加密密码、token 请求头、
 * {code,msg,data} 统一响应、QQ / 微信 OAuth 全流程。
 * 请求经 Vite 代理 /snowy -> http://<SNOWY_HOST>:<SNOWY_PORT>/api。
 */
import { sm2 } from 'sm-crypto';

const SNOWY_BASE =
  ((import.meta as { env?: Record<string, string> }).env?.VITE_SNOWY_BASE_URL as string) || '/snowy';
const TOKEN_KEY = 'TOKEN';
const USER_INFO_KEY = 'SNOWY_CLIENT_USER';
const SM2_PUBLIC_KEY =
  '04298364ec840088475eae92a591e01284d1abefcda348b47eb324bb521bb03b0b2a5bc393f6b71dabb8f15c99a0050818b56b23f31743b93df9cf8948f15ddb54';
const SM2_CIPHER_MODE = 1;
const RELOGIN_CODES = [401, 1011007, 1011008];

export function sm2Encrypt(text: string): string {
  return sm2.doEncrypt(text, SM2_PUBLIC_KEY, SM2_CIPHER_MODE);
}

export function getSnowyToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSnowyToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

export function getCachedClientUser(): SnowyClientUser | null {
  try {
    const raw = localStorage.getItem(USER_INFO_KEY);
    return raw ? (JSON.parse(raw) as SnowyClientUser) : null;
  } catch {
    return null;
  }
}

export function cacheClientUser(user: SnowyClientUser | null): void {
  try {
    if (user) localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_INFO_KEY);
  } catch {
    // ignore storage errors
  }
}

/** 鉴权失效时清理全部登录缓存 */
export function clearSnowyAuthCache(): void {
  try {
    [TOKEN_KEY, USER_INFO_KEY, 'SNOWY_TEN_CODE'].forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
}

/** 鉴权失效（过期 / 被顶下线），由调用方决定是否跳转登录页 */
export class SnowyAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnowyAuthError';
  }
}

interface SnowyResponse<T> {
  code: number;
  msg: string;
  data: T;
}

let reloginNotified = false;

function handleRelogin(msg: string): SnowyAuthError {
  clearSnowyAuthCache();
  if (!reloginNotified) {
    reloginNotified = true;
    window.setTimeout(() => {
      reloginNotified = false;
    }, 0);
  }
  return new SnowyAuthError(msg || '登录已失效，请重新登录');
}

async function request<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const { skipAuth, ...init } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) || {}),
  };
  const token = getSnowyToken();
  if (token && !skipAuth) headers.token = token;

  let res: Response;
  try {
    res = await fetch(`${SNOWY_BASE}${path}`, { ...init, headers });
  } catch {
    throw new Error('无法连接认证服务，请稍后重试');
  }

  let payload: SnowyResponse<T>;
  try {
    payload = (await res.json()) as SnowyResponse<T>;
  } catch {
    throw new Error(`请求失败 (${res.status})：响应格式异常`);
  }

  if (RELOGIN_CODES.includes(payload.code)) {
    throw handleRelogin(payload.msg);
  }
  if (payload.code !== 200) {
    throw new Error(payload.msg || `请求失败 (${res.status})`);
  }
  return payload.data;
}

function get<T>(path: string, params?: Record<string, string | undefined>): Promise<T> {
  const query = params
    ? '?' +
      Object.entries(params)
        .filter((entry): entry is [string, string] => !!entry[1])
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&')
    : '';
  return request<T>(path + query);
}

function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** Snowy C 端登录用户（与后端 SaBaseClientLoginUser 字段保持一致，仅声明门户需要的部分） */
export interface SnowyClientUser {
  id: string;
  account: string;
  name?: string | null;
  nickname?: string | null;
  avatar?: string | null;
  email?: string | null;
  phone?: string | null;
  signature?: string | null;
  gender?: string | null;
  age?: string | null;
  birthday?: string | null;
  latestLoginTime?: string | null;
  latestLoginAddress?: string | null;
  latestLoginIp?: string | null;
  userStatus?: string | null;
  extJson?: string | null;
  [key: string]: unknown;
}

export interface CaptchaResult {
  validCodeBase64: string;
  validCodeReqNo: string;
}

export interface ThirdRenderResult {
  authorizeUrl: string;
}

export const authApi = {
  /** C 端账号密码登录，返回 token */
  login(account: string, password: string, validCode = '', validCodeReqNo = ''): Promise<string> {
    return post<string>('/auth/c/doLogin', {
      account,
      password: sm2Encrypt(password),
      validCode,
      validCodeReqNo,
    });
  },

  /** C 端注册 */
  register(account: string, password: string, validCode: string, validCodeReqNo: string, nickname?: string): Promise<void> {
    return post<void>('/auth/c/register', {
      account,
      password: sm2Encrypt(password),
      validCode,
      validCodeReqNo,
      nickname: nickname || '',
    });
  },

  /** 图形验证码 */
  getPicCaptcha(): Promise<CaptchaResult> {
    return get<CaptchaResult>('/auth/c/getPicCaptcha');
  },

  /**
   * 当前登录用户
   * 与 snowy-admin-web 的 clientGetLoginUser 保持一致：显式携带 token 参数
   */
  getLoginUser(token?: string): Promise<SnowyClientUser> {
    const target = token || getSnowyToken() || undefined;
    return get<SnowyClientUser>('/auth/c/getLoginUser', target ? { token: target } : undefined);
  },

  /** 获取当前登录用户资料（biz profile 模块） */
  getProfile(): Promise<{
    id?: string;
    name?: string;
    nickname?: string;
    signature?: string;
  }> {
    return get('/client/c/profile/get');
  },

  /** 更新当前登录用户资料（昵称、简介，biz profile 模块） */
  updateProfile(nickname: string, bio: string): Promise<void> {
    return post<void>('/client/c/profile/update', { nickname, bio });
  },

  /** C 端通过旧密码修改登录密码 */
  updatePasswordByOld(oldPassword: string, newPassword: string): Promise<void> {
    return post<void>('/client/userCenter/updatePasswordByOld', {
      password: sm2Encrypt(oldPassword),
      newPassword: sm2Encrypt(newPassword),
    });
  },

  /** 退出登录 */
  async logout(): Promise<void> {
    try {
      await get<void>('/auth/c/doLogout');
    } catch {
      // 退出时忽略网络或 token 失效错误
    }
    clearSnowyAuthCache();
  },

  /** 获取第三方平台授权地址（C 端） */
  thirdRender(platform: string): Promise<ThirdRenderResult> {
    return get<ThirdRenderResult>('/auth/third/render', { platform, clientType: 'C' });
  },

  /** 第三方授权回调换取 token（clientType 固定 C，与 render 保持一致） */
  thirdCallback(params: Record<string, string>): Promise<string> {
    return get<string>('/auth/third/callback', { ...params, platform: params.platform, clientType: 'C' });
  },

  /** 三方用户绑定已有账号（首次绑定场景） */
  thirdBindAccount(payload: {
    thirdId: string;
    account: string;
    password: string;
    validCode?: string;
    validCodeReqNo?: string;
  }): Promise<string> {
    return post<string>('/auth/third/bindAccount', {
      ...payload,
      password: sm2Encrypt(payload.password),
      validCode: payload.validCode || '',
      validCodeReqNo: payload.validCodeReqNo || '',
    });
  },

  /** 系统基础配置（用于判断登录验证码等开关） */
  async sysBaseConfig(): Promise<Record<string, string>> {
    const list = await get<Array<{ configKey?: string; configValue?: string }>>(
      '/dev/config/sysBaseList'
    );
    const result: Record<string, string> = {};
    (list || []).forEach((item) => {
      if (item.configKey) result[item.configKey] = String(item.configValue ?? '');
    });
    return result;
  },

  /** 后台配置的第三方登录开关（失败时由调用方回退为全部显示） */
  async thirdAllowFlags(): Promise<Record<string, boolean>> {
    const list = await get<Array<{ configKey?: string; configValue?: string }>>(
      '/dev/config/sysThirdAllowFlagList'
    );
    const flags: Record<string, boolean> = {};
    (list || []).forEach((item) => {
      if (item.configKey) flags[item.configKey] = String(item.configValue) === 'true';
    });
    return flags;
  },
};
