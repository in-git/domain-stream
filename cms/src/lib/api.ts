import type {
  ArticleItem,
  DashboardPayload,
  ImageTextItem,
  UserProfile,
  VideoItem,
} from '../types/cms.ts';
import {
  SnowyAuthError,
  buildUserProfile,
  cacheMenu,
  cacheUserInfo,
  clearSnowyLoginCache,
  getCachedMenu,
  getCachedUserInfo,
  getSnowyToken,
  setSnowyToken,
  snowyBiz,
  snowyGetLoginUser,
  snowyLogin,
  snowyLoginMenu,
  snowyLogout,
  snowyUpload,
  snowyVisitorDashboard,
  snowyVisitorHeartbeat,
  snowyVisitorLive,
  snowyVisitorTrack,
  userProfileFromSnowy,
  type SnowyLoginUser,
  type SnowyMenu,
} from './snowy.ts';

// 兼容旧代码里的 token 访问器：统一落到 Snowy 的 TOKEN 存储
export function getStoredToken(): string | null {
  return getSnowyToken();
}
export function setStoredToken(token: string | null) {
  setSnowyToken(token);
}

/** 上传文件到小诺文件服务（复用小诺上传接口），带进度回调 */
export async function uploadFileWithProgress(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; filename: string; size: number; mimeType: string }> {
  const { url } = await snowyUpload(file, onProgress);
  return {
    url,
    filename: file.name,
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
  };
}

/**
 * 将图片转换为 WebP 格式（用于封面上传）
 * 通过 canvas 解码再编码，默认质量 0.82；转换失败时回退原图
 */
export async function convertToWebp(file: File, quality = 0.82): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  // 已是 webp 无需重复转换
  if (file.type === 'image/webp') return file;
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/webp', quality)
    );
    if (!blob) return file;
    const baseName = file.name.replace(/\.[^/.]+$/, '') || 'cover';
    return new File([blob], `${baseName}.webp`, { type: 'image/webp' });
  } catch {
    return file;
  }
}

// 当前会话用户信息（真实接口拉取后驻留内存，刷新后由 me() 重新拉取）
let currentUser: UserProfile | null = null;

/** 并行拉取真实用户信息与菜单，缓存后返回 UserProfile */
async function fetchSession(): Promise<{ user: UserProfile; menus: SnowyMenu[] }> {
  const [rawUser, menus] = await Promise.all([snowyGetLoginUser(), snowyLoginMenu()]);
  cacheUserInfo(rawUser);
  cacheMenu(menus);
  const user = userProfileFromSnowy(rawUser);
  currentUser = user;
  return { user, menus };
}

export const api = {
  /** 小诺账号密码登录：登录成功后立即拉取真实用户信息与菜单 */
  login: async (
    account: string,
    password: string
  ): Promise<{ token: string; user: UserProfile; menus: SnowyMenu[] }> => {
    const token = await snowyLogin(account, password);
    setSnowyToken(token);
    try {
      localStorage.setItem('SNOWY_ACCOUNT', account);
    } catch {
      // ignore
    }
    // 拉取失败不应阻断登录（后端可能已放行登录但用户/菜单接口异常）
    try {
      const session = await fetchSession();
      return { token, user: session.user, menus: session.menus };
    } catch (err) {
      if (err instanceof SnowyAuthError) throw err;
      const fallback = buildUserProfile(account);
      currentUser = fallback;
      return { token, user: fallback, menus: getCachedMenu() || [] };
    }
  },

  /** 恢复会话：从 Snowy 真实接口读取用户信息与菜单 */
  me: async (): Promise<{
    user: UserProfile;
    menus: SnowyMenu[];
  }> => {
    const session = await fetchSession();
    return session;
  },

  /** 从缓存同步读取用户信息（供权限判断同步使用） */
  cachedUser: (): SnowyLoginUser | null => getCachedUserInfo(),

  logout: async (): Promise<{ ok: boolean }> => {
    try {
      await snowyLogout();
    } catch {
      // ignore
    }
    currentUser = null;
    clearSnowyLoginCache();
    return { ok: true };
  },

  updateProfile: async (payload: Partial<UserProfile>): Promise<{ user: UserProfile }> => {
    if (currentUser) currentUser = { ...currentUser, ...payload };
    return { user: currentUser || buildUserProfile('superAdmin') };
  },

  updatePassword: async (_currentPassword?: string, _newPassword?: string): Promise<{ ok: boolean }> => {
    // 密码由小诺统一管理，需在 Snowy 后台修改
    return { ok: true };
  },

  getDashboard: async (): Promise<DashboardPayload> => snowyVisitorDashboard(),

  /** 实时访客快照（供仪表盘轮询刷新 KPI） */
  getLiveSnapshot: () => snowyVisitorLive(),

  /** 心跳上报（维持当前会话在线状态） */
  heartbeat: () => snowyVisitorHeartbeat(),

  /**
   * 上报一次内容浏览：从列表视图打开详情/预览时调用
   * @param type video / imagetext / article
   * @param id 内容ID
   */
  trackView: async (type?: string, id?: string): Promise<{ todayPV: number }> => {
    const pageType =
      type === 'video' ? 'VIDEO' : type === 'article' ? 'ARTICLE' : type === 'imagetext' ? 'GRAPHIC' : 'HOME';
    await snowyVisitorTrack({ eventType: 'CONTENT_VIEW', pageType, contentId: id });
    const live = await snowyVisitorLive();
    return { todayPV: live.todayPV };
  },

  // ---- 视频 ----
  getVideos: async () => ({ items: await snowyBiz.listVideos() }),
  createVideo: (payload: Partial<VideoItem>) => snowyBiz.createVideo(payload),
  updateVideo: (id: string, payload: Partial<VideoItem>) => snowyBiz.updateVideo(id, payload),
  deleteVideo: (id: string) => snowyBiz.deleteVideo(id),

  // ---- 图文 ----
  getImageTexts: async () => ({ items: await snowyBiz.listImageTexts() }),
  createImageText: (payload: Partial<ImageTextItem>) => snowyBiz.createImageText(payload),
  updateImageText: (id: string, payload: Partial<ImageTextItem>) => snowyBiz.updateImageText(id, payload),
  deleteImageText: (id: string) => snowyBiz.deleteImageText(id),

  // ---- 文章 ----
  getArticles: async () => ({ items: await snowyBiz.listArticles() }),
  createArticle: (payload: Partial<ArticleItem>) => snowyBiz.createArticle(payload),
  updateArticle: (id: string, payload: Partial<ArticleItem>) => snowyBiz.updateArticle(id, payload),
  deleteArticle: (id: string) => snowyBiz.deleteArticle(id),
};
