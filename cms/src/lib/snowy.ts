/**
 * 小诺 Snowy 后端对接层
 * 通过 Vite 代理 /snowy/* -> http://localhost:91/*
 * 登录采用 SM2 加密密码，token 通过请求头 `token` 传递（与 snowy-admin-web 一致）
 */
import { sm2 } from 'sm-crypto';
import type {
  ArticleItem,
  DashboardPayload,
  ImageTextItem,
  UserProfile,
  VideoItem,
} from '../types/cms.ts';

const SNOWY_BASE = '/snowy';
const TOKEN_KEY = 'TOKEN';
export const USER_INFO_KEY = 'USER_INFO';
export const MENU_KEY = 'MENU';
// 与 snowy-admin-web/src/utils/smCrypto.js 保持一致的国密公钥与模式
const SM2_PUBLIC_KEY =
  '04298364ec840088475eae92a591e01284d1abefcda348b47eb324bb521bb03b0b2a5bc393f6b71dabb8f15c99a0050818b56b23f31743b93df9cf8948f15ddb54';
const SM2_CIPHER_MODE = 1;

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

export function setSnowyToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

interface SnowyResponse<T> {
  code: number;
  msg: string;
  data: T;
  traceId?: string;
}

/**
 * 需要重新登录的业务码，与 snowy-admin-web/src/utils/codeHandler.js 的 RELOGIN_CODES 对齐。
 * sa-token 的 NotLoginException（token 过期 / 被顶下线 / 被踢下线）统一返回 401；
 * 1011007 / 1011008 为 Snowy 约定的其它需要重登的业务码。
 */
const RELOGIN_CODES = [401, 1011007, 1011008];

/** 鉴权失败（token 失效/未登录/被顶下线），仅此类错误才应清除本地登录态 */
export class SnowyAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnowyAuthError';
  }
}

type AuthExpiredHandler = (reason: string) => void;
const authExpiredHandlers = new Set<AuthExpiredHandler>();
// 同一波并发请求可能同时命中重登码，避免重复清缓存/通知/弹多层提示
let reloginInFlight = false;

/**
 * 注册「鉴权失效」全局回调：一旦任一请求命中重登码，App 据此强制回到登录页。
 * 返回取消注册函数。
 */
export function onAuthExpired(handler: AuthExpiredHandler): () => void {
  authExpiredHandlers.add(handler);
  return () => authExpiredHandlers.delete(handler);
}

/** 是否是"被顶下线/被踢下线"类消息，用于给登录页更明确的提示 */
function isKickedMessage(msg: string): boolean {
  return /顶下线|踢下线|顶号|已在.*登录|重复登录|kick|be kicked|replaced/i.test(msg);
}

/**
 * 统一的鉴权失效处理：清理全部登录缓存并通知上层回到登录页。
 * 由请求层在命中 RELOGIN_CODES 时调用；清缓存动作幂等，多次触发无副作用。
 */
function forceRelogin(msg: string): SnowyAuthError {
  const reason = isKickedMessage(msg)
    ? '您的账号已在其他设备登录，当前会话已被顶下线，请重新登录'
    : msg || '登录已失效，请重新登录';
  if (!reloginInFlight) {
    reloginInFlight = true;
    // 暂存原因供登录页提示（clearSnowyLoginCache 不清 sessionStorage）
    try {
      sessionStorage.setItem('AUTH_EXPIRED_REASON', reason);
    } catch {
      // ignore
    }
    clearSnowyLoginCache();
    authExpiredHandlers.forEach((handler) => {
      try {
        handler(reason);
      } catch {
        // 单个订阅者异常不影响其它订阅者与错误抛出
      }
    });
    // 重置标志：留一个宏任务窗口，合并同一波并发请求的重复触发
    window.setTimeout(() => {
      reloginInFlight = false;
    }, 0);
  }
  return new SnowyAuthError(reason);
}

/**
 * Snowy 底层原始请求：自动带 token，返回未解包的 Response。
 * 供二进制下载 / multipart 上传等 snowyRequest 无法处理的场景使用。
 */
export async function snowyFetch(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<Response> {
  const { skipAuth, ...init } = options;
  const headers: Record<string, string> = {
    ...((init.headers as Record<string, string>) || {}),
  };
  const token = getSnowyToken();
  if (token && !skipAuth) {
    headers.token = token;
  }
  return fetch(`${SNOWY_BASE}${path}`, { ...init, headers });
}

/** Snowy 统一请求：自动带 token，解包 {code,msg,data} */
export async function snowyRequest<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const { skipAuth, ...init } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) || {}),
  };
  const res = await snowyFetch(path, { ...init, headers, skipAuth });
  let payload: SnowyResponse<T>;
  try {
    payload = await res.json();
  } catch {
    throw new Error(`请求失败 (${res.status})：响应格式异常`);
  }
  if (RELOGIN_CODES.includes(payload.code)) {
    // 被顶下线 / 登录失效：清缓存 + 通知 App 强制回登录页，即使调用方 catch 了错误
    throw forceRelogin(payload.msg);
  }
  if (payload.code !== 200) {
    throw new Error(payload.msg || `请求失败 (${res.status})`);
  }
  return payload.data;
}

const get = <T>(path: string, params?: Record<string, unknown>) => {
  const query = params
    ? '?' +
      Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  return snowyRequest<T>(path + query);
};
const post = <T>(path: string, body: unknown) =>
  snowyRequest<T>(path, { method: 'POST', body: JSON.stringify(body) });

/* ------------------------------------------------------------------ */
/* 登录                                                                 */
/* ------------------------------------------------------------------ */

export interface SnowyLoginResult {
  token: string;
}

/** 账号密码登录（密码 SM2 加密），返回 token */
export async function snowyLogin(account: string, password: string): Promise<string> {
  const data = await post<string>('/auth/b/doLogin', {
    account,
    password: sm2Encrypt(password),
    validCode: '',
    validCodeReqNo: '',
    // 指定独立设备类型，避免与 PC 端后台（snowy-admin-web）互踢顶号
    device: 'APP',
  });
  return data;
}

/* ------------------------------------------------------------------ */
/* 文件上传（复用小诺 /dev/file/uploadLocalReturnUrl）                   */
/* ------------------------------------------------------------------ */

/** 把小诺返回的下载 URL 规范化为走 cms 代理的相对地址 */
function normalizeFileUrl(raw: string): string {
  if (!raw) return raw;
  try {
    // 形如 http://localhost:91/api/dev/file/download?id=...&sign=...
    const u = new URL(raw, window.location.origin);
    const path = u.pathname.replace(/^\/api/, ''); // 去掉 admin-web 的 /api 前缀
    return `/snowy${path}${u.search}`;
  } catch {
    return raw;
  }
}

/**
 * 上传文件到小诺文件服务（本地引擎，返回可访问 URL）
 * @param file 文件
 * @param onProgress 上传进度回调（0-100）
 * @param imageOnly 是否走"仅图片"校验接口
 * @param bizType 库类型：USER 用户文件（默认）/ MATERIAL 素材库
 */
export function snowyUpload(
  file: File,
  onProgress?: (percent: number) => void,
  imageOnly = false,
  bizType: 'USER' | 'MATERIAL' = 'USER'
): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const endpoint =
      bizType === 'MATERIAL'
        ? '/snowy/dev/file/uploadMaterialReturnUrl'
        : imageOnly
          ? '/snowy/dev/file/uploadLocalReturnUrl' // 本地引擎统一接口（图片类型由前端校验）
          : '/snowy/dev/file/uploadLocalReturnUrl';
    xhr.open('POST', endpoint);
    const token = getSnowyToken();
    if (token) xhr.setRequestHeader('token', token);
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(Math.min(99, Math.round((evt.loaded / evt.total) * 100)));
      }
    };
    xhr.onload = () => {
      let payload: SnowyResponse<string>;
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error('解析上传响应失败'));
        return;
      }
      if (RELOGIN_CODES.includes(payload.code)) {
        reject(forceRelogin(payload.msg));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload.code === 200) {
        onProgress?.(100);
        resolve({ url: normalizeFileUrl(payload.data) });
      } else {
        reject(new Error(payload.msg || `上传失败 (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('网络异常，上传中断'));
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}

/** 退出登录 */
export async function snowyLogout(): Promise<void> {
  try {
    await get<void>('/auth/b/doLogout');
  } catch {
    // ignore
  }
}

/* ------------------------------------------------------------------ */
/* 动态路由 / 用户信息（对齐 snowy-admin-web 的 MENU / USER_INFO 缓存）  */
/* ------------------------------------------------------------------ */

/** 小诺后端返回的菜单节点（模块/目录/菜单通用结构） */
export interface SnowyMenu {
  id: string;
  parentId?: string;
  name?: string;
  title: string;
  code?: string;
  category?: 'MODULE' | 'MENU';
  module?: string;
  menuType?: 'CATALOG' | 'MENU' | 'LINK' | 'IFRAME';
  path: string;
  component?: string;
  icon?: string;
  visible?: string;
  sortCode?: number;
  children?: SnowyMenu[];
  meta?: {
    title?: string;
    icon?: string;
    type?: string;
    hidden?: boolean;
    affix?: boolean;
    [key: string]: unknown;
  };
}

/** 小诺登录用户信息（只声明 CueStudio 用到的字段） */
export interface SnowyLoginUser {
  id: string;
  account: string;
  name: string;
  nickname?: string | null;
  avatar?: string | null;
  email?: string | null;
  phone?: string | null;
  orgName?: string | null;
  positionName?: string | null;
  signature?: string | null;
  lastLoginTime?: string | null;
  latestLoginTime?: string | null;
  buttonCodeList?: string[];
  roleCodeList?: string[];
  permissionCodeList?: string[];
  [key: string]: unknown;
}

/** 拉取当前登录用户的菜单树（GET /sys/userCenter/loginMenu） */
export function snowyLoginMenu(): Promise<SnowyMenu[]> {
  return get<SnowyMenu[]>('/sys/userCenter/loginMenu');
}

/** 拉取当前登录用户信息（GET /auth/b/getLoginUser） */
export function snowyGetLoginUser(): Promise<SnowyLoginUser> {
  return get<SnowyLoginUser>('/auth/b/getLoginUser');
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeCache(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

export function getCachedMenu(): SnowyMenu[] | null {
  return readCache<SnowyMenu[]>(MENU_KEY);
}
export function cacheMenu(menus: SnowyMenu[]): void {
  writeCache(MENU_KEY, menus);
}
export function getCachedUserInfo(): SnowyLoginUser | null {
  return readCache<SnowyLoginUser>(USER_INFO_KEY);
}
export function cacheUserInfo(user: SnowyLoginUser): void {
  writeCache(USER_INFO_KEY, user);
}

/** 退出登录时清理全部登录缓存（对齐 snowy-admin-web 的 clearLoginCache） */
export function clearSnowyLoginCache(): void {
  try {
    [TOKEN_KEY, USER_INFO_KEY, MENU_KEY, 'SNOWY_ACCOUNT', 'PERMISSIONS', 'ACTIVE_MODULE'].forEach(
      (key) => localStorage.removeItem(key)
    );
  } catch {
    // ignore
  }
}

/** 把小诺真实用户信息映射为 CueStudio 的 UserProfile */
export function userProfileFromSnowy(raw: SnowyLoginUser, defaultModule: string = 'dashboard'): UserProfile {
  const roleTitle = raw.positionName || (raw.roleCodeList || []).join('、') || '系统用户';
  return {
    id: raw.id,
    account: raw.account,
    email: raw.email || `${raw.account}@snowy.local`,
    name: raw.nickname || raw.name || raw.account,
    nickname: raw.nickname || undefined,
    roleTitle,
    department: raw.orgName || '内容运营中心',
    avatarUrl: raw.avatar || '/src/assets/images/avatar_admin_lin_1795026084667.jpg',
    bio: raw.signature || '通过小诺 Snowy 统一认证登录',
    defaultModule: (defaultModule as UserProfile['defaultModule']) || 'dashboard',
    liveRefresh: true,
    lastLoginAt: raw.latestLoginTime || raw.lastLoginTime || new Date().toISOString(),
    orgName: raw.orgName || undefined,
    positionName: raw.positionName || undefined,
    buttonCodeList: raw.buttonCodeList || [],
    roleCodeList: raw.roleCodeList || [],
    permissionCodeList: raw.permissionCodeList || [],
  };
}

/** 根据登录 token 构造 UserProfile（小诺无访客看板概念，用登录账号生成基础信息） */
export function buildUserProfile(account: string): UserProfile {
  const isAdmin = account === 'superAdmin';
  return {
    id: account,
    email: `${account}@snowy.local`,
    name: isAdmin ? '超级管理员' : account,
    roleTitle: isAdmin ? '超级管理员' : '系统用户',
    department: '内容运营中心',
    avatarUrl: '/src/assets/images/avatar_admin_lin_1795026084667.jpg',
    bio: '通过小诺 Snowy 统一认证登录',
    defaultModule: 'dashboard',
    liveRefresh: true,
    lastLoginAt: new Date().toISOString(),
    account,
    buttonCodeList: [],
    roleCodeList: [],
  };
}

/* ------------------------------------------------------------------ */
/* 首页访客数据（小诺 biz/visitor 接口，已在后端放行无需登录）           */
/* ------------------------------------------------------------------ */

/** 拉取首页访客聚合数据（对齐 DashboardPayload） */
export function snowyVisitorDashboard(): Promise<DashboardPayload> {
  return get<DashboardPayload>('/biz/visitor/dashboard');
}

/** 拉取实时访客轻量快照（供前端定时轮询刷新 KPI） */
export function snowyVisitorLive(): Promise<{
  onlineNow: number;
  todayPV: number;
  todayUV: number;
  avgDurationSec: number;
  engagementRate: number;
  updatedAt: string;
}> {
  return get('/biz/visitor/live');
}

/* ------------------------------------------------------------------ */
/* 字段映射：小诺实体 <-> cms 模型                                      */
/* ------------------------------------------------------------------ */

interface SnowyPage<T> {
  records: T[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

function toStatus(s?: string): 'published' | 'draft' {
  return s === 'PUBLISHED' ? 'published' : 'draft';
}
function fromStatus(s?: string): string {
  return s === 'published' ? 'PUBLISHED' : 'DRAFT';
}
function fmtDate(v?: string | null): string {
  return v ? new Date(v).toISOString() : new Date().toISOString();
}
function parseDuration(s?: string | null): number {
  if (!s) return 0;
  const parts = s.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}
function parseImages(s?: string | null): string[] {
  if (!s) return [];
  try {
    const val = JSON.parse(s);
    return Array.isArray(val) ? val.map(String) : [];
  } catch {
    return s.split(',').filter(Boolean);
  }
}

interface SnowyVideo {
  id?: string;
  title?: string;
  cover?: string;
  videoUrl?: string;
  duration?: string;
  summary?: string;
  category?: string;
  tags?: string;
  status?: string;
  publishTime?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  isTop?: string;
  isRecommend?: string;
  sortCode?: number;
  remark?: string;
  extJson?: string;
  createUser?: string;
  createTime?: string;
  updateTime?: string;
}
interface SnowyArticle {
  id?: string;
  title?: string;
  cover?: string;
  summary?: string;
  content?: string;
  category?: string;
  tags?: string;
  author?: string;
  source?: string;
  status?: string;
  publishTime?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  isTop?: string;
  isRecommend?: string;
  sortCode?: number;
  remark?: string;
  extJson?: string;
  createUser?: string;
  createTime?: string;
  updateTime?: string;
}
interface SnowyGraphic {
  id?: string;
  title?: string;
  cover?: string;
  images?: string;
  summary?: string;
  content?: string;
  category?: string;
  tags?: string;
  status?: string;
  publishTime?: string;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  isTop?: string;
  isRecommend?: string;
  sortCode?: number;
  remark?: string;
  extJson?: string;
  createUser?: string;
  createTime?: string;
  updateTime?: string;
}

function videoFromSnowy(v: SnowyVideo): VideoItem {
  return {
    id: String(v.id || ''),
    title: v.title || '',
    description: v.summary || '',
    category: v.category || '',
    videoUrl: v.videoUrl || '',
    coverUrl: v.cover || '',
    durationSec: parseDuration(v.duration),
    resolution: '',
    fileSizeBytes: 0,
    views: v.viewCount || 0,
    completionRate: 0,
    status: toStatus(v.status),
    authorId: v.createUser || '',
    authorName: v.createUser || '',
    createdAt: fmtDate(v.createTime),
    updatedAt: fmtDate(v.updateTime),
    tags: v.tags,
    likes: v.likeCount,
    comments: v.commentCount,
    publishTime: v.publishTime,
    isTop: v.isTop,
    isRecommend: v.isRecommend,
    sortCode: v.sortCode,
    remark: v.remark,
  };
}
function articleFromSnowy(a: SnowyArticle): ArticleItem {
  const content = a.content || '';
  return {
    id: String(a.id || ''),
    title: a.title || '',
    summary: a.summary || '',
    content,
    category: a.category || '',
    coverUrl: a.cover || '',
    wordCount: content.length,
    readTimeMin: Math.max(1, Math.ceil(content.length / 400)),
    views: a.viewCount || 0,
    avgReadRate: 0,
    status: toStatus(a.status),
    authorId: a.createUser || '',
    authorName: a.author || a.createUser || '',
    createdAt: fmtDate(a.createTime),
    updatedAt: fmtDate(a.updateTime),
    tags: a.tags,
    source: a.source,
    likes: a.likeCount,
    comments: a.commentCount,
    publishTime: a.publishTime,
    isTop: a.isTop,
    isRecommend: a.isRecommend,
    sortCode: a.sortCode,
    remark: a.remark,
  };
}
function graphicFromSnowy(g: SnowyGraphic): ImageTextItem {
  return {
    id: String(g.id || ''),
    title: g.title || '',
    body: g.content || g.summary || '',
    category: g.category || '',
    images: parseImages(g.images),
    views: g.viewCount || 0,
    likes: g.likeCount || 0,
    status: toStatus(g.status),
    authorId: g.createUser || '',
    authorName: g.createUser || '',
    createdAt: fmtDate(g.createTime),
    updatedAt: fmtDate(g.updateTime),
    coverUrl: g.cover,
    description: g.summary,
    tags: g.tags,
    comments: g.commentCount,
    publishTime: g.publishTime,
    isTop: g.isTop,
    isRecommend: g.isRecommend,
    sortCode: g.sortCode,
    remark: g.remark,
  };
}

/* ------------------------------------------------------------------ */
/* 业务模块 CRUD（page / add / edit / delete / detail）                 */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 200;

async function fetchAll<T>(module: string): Promise<T[]> {
  const page = await get<SnowyPage<T>>(`/biz/${module}/page`, {
    current: 1,
    size: PAGE_SIZE,
  });
  return page?.records || [];
}

export interface SnowyBizApi {
  listVideos(): Promise<VideoItem[]>;
  createVideo(payload: Partial<VideoItem>): Promise<void>;
  updateVideo(id: string, payload: Partial<VideoItem>): Promise<void>;
  deleteVideo(id: string): Promise<void>;
  listArticles(): Promise<ArticleItem[]>;
  createArticle(payload: Partial<ArticleItem>): Promise<void>;
  updateArticle(id: string, payload: Partial<ArticleItem>): Promise<void>;
  deleteArticle(id: string): Promise<void>;
  listImageTexts(): Promise<ImageTextItem[]>;
  createImageText(payload: Partial<ImageTextItem>): Promise<void>;
  updateImageText(id: string, payload: Partial<ImageTextItem>): Promise<void>;
  deleteImageText(id: string): Promise<void>;
}

/** 三个模块共有的通用字段映射（cms 模型 -> 小诺 biz 参数） */
function commonPayload(
  p: Partial<VideoItem> | Partial<ArticleItem> | Partial<ImageTextItem>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const src = p as Record<string, unknown>;
  const set = (to: string, from: string) => {
    if (src[from] !== undefined) out[to] = src[from];
  };
  set('title', 'title');
  set('cover', 'coverUrl');
  set('category', 'category');
  set('tags', 'tags');
  set('status', 'status');
  set('viewCount', 'views');
  set('likeCount', 'likes');
  set('commentCount', 'comments');
  set('publishTime', 'publishTime');
  set('isTop', 'isTop');
  set('isRecommend', 'isRecommend');
  set('sortCode', 'sortCode');
  set('remark', 'remark');
  // status 需要把 cms 的 published/draft 转成后端枚举
  if (out.status !== undefined) out.status = fromStatus(String(out.status));
  return out;
}

function videoPayload(p: Partial<VideoItem>) {
  const out = commonPayload(p);
  if (p.description !== undefined) out.summary = p.description;
  if (p.videoUrl !== undefined) out.videoUrl = p.videoUrl;
  if (p.durationSec !== undefined) {
    const h = Math.floor(p.durationSec / 3600);
    const m = Math.floor((p.durationSec % 3600) / 60);
    const s = p.durationSec % 60;
    out.duration = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return out;
}
function articlePayload(p: Partial<ArticleItem>) {
  const out = commonPayload(p);
  if (p.summary !== undefined) out.summary = p.summary;
  if (p.content !== undefined) out.content = p.content;
  if (p.source !== undefined) out.source = p.source;
  return out;
}
function graphicPayload(p: Partial<ImageTextItem>) {
  const out = commonPayload(p);
  if (p.body !== undefined) out.content = p.body;
  if (p.description !== undefined) out.summary = p.description;
  if (p.images !== undefined) out.images = JSON.stringify(p.images);
  return out;
}

export const snowyBiz: SnowyBizApi = {
  async listVideos() {
    return (await fetchAll<SnowyVideo>('video')).map(videoFromSnowy);
  },
  createVideo(payload) {
    return post<void>('/biz/video/add', videoPayload(payload));
  },
  updateVideo(id, payload) {
    return post<void>('/biz/video/edit', { id, ...videoPayload(payload) });
  },
  deleteVideo(id) {
    return post<void>('/biz/video/delete', [{ id }]);
  },

  async listArticles() {
    return (await fetchAll<SnowyArticle>('article')).map(articleFromSnowy);
  },
  createArticle(payload) {
    return post<void>('/biz/article/add', articlePayload(payload));
  },
  updateArticle(id, payload) {
    return post<void>('/biz/article/edit', { id, ...articlePayload(payload) });
  },
  deleteArticle(id) {
    return post<void>('/biz/article/delete', [{ id }]);
  },

  async listImageTexts() {
    return (await fetchAll<SnowyGraphic>('graphic')).map(graphicFromSnowy);
  },
  createImageText(payload) {
    return post<void>('/biz/graphic/add', graphicPayload(payload));
  },
  updateImageText(id, payload) {
    return post<void>('/biz/graphic/edit', { id, ...graphicPayload(payload) });
  },
  deleteImageText(id) {
    return post<void>('/biz/graphic/delete', [{ id }]);
  },
};
