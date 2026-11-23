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
  snowyDownload,
  snowyGetLoginUser,
  snowyLogin,
  snowyLoginMenu,
  snowyLogout,
  snowyUpload,
  snowyUpdateUserInfo,
  snowyVisitorDashboard,
  userProfileFromSnowy,
  type GraphicPosterDraft,
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
    // 姓名/昵称按 Snowy 官方 userCenter.updateUserInfo 持久化；
    // 个人简介存到扩展字段 extJson 的 bio 键里（Snowy 无独立简介字段，signature 是签名图片不能用）
    const syncBio = payload.bio !== undefined;
    const shouldSyncBackend =
      payload.nickname !== undefined || payload.name !== undefined || syncBio;
    if (shouldSyncBackend && currentUser) {
      const cached = getCachedUserInfo();
      // 保留 extJson 里其他业务字段，只覆盖 bio
      let extJson: string | undefined;
      if (syncBio) {
        let extObj: Record<string, unknown> = {};
        try {
          extObj = cached?.extJson ? JSON.parse(cached.extJson) : {};
        } catch {
          extObj = {};
        }
        extJson = JSON.stringify({ ...extObj, bio: payload.bio ?? '' });
      }
      await snowyUpdateUserInfo({
        id: currentUser.id,
        name: payload.name ?? currentUser.name ?? currentUser.account ?? '',
        nickname: payload.nickname ?? currentUser.nickname ?? payload.name ?? currentUser.name ?? '',
        extJson,
      });
      // 同步更新 Snowy 用户信息缓存，避免刷新后 me() 覆盖回旧值
      if (cached) {
        cacheUserInfo({
          ...cached,
          name: payload.name ?? cached.name,
          nickname: payload.nickname ?? cached.nickname ?? payload.name ?? cached.name,
          extJson: extJson ?? cached.extJson,
        });
      }
    }
    if (currentUser) currentUser = { ...currentUser, ...payload };
    return { user: currentUser || buildUserProfile('superAdmin') };
  },

  updatePassword: async (_currentPassword?: string, _newPassword?: string): Promise<{ ok: boolean }> => {
    // 密码由小诺统一管理，需在 Snowy 后台修改
    return { ok: true };
  },

  getDashboard: async (): Promise<DashboardPayload> => snowyVisitorDashboard(),

  // ---- 数据导出 ----
  exportDatabase: async (): Promise<void> =>
    snowyDownload('/biz/export/database', 'domain-stream-db.sql'),
  exportFiles: async (): Promise<void> =>
    snowyDownload('/biz/export/files', 'domain-stream-files.zip'),

  // ---- 视频 ----
  getVideos: async () => ({ items: await snowyBiz.listVideos() }),
  createVideo: (payload: Partial<VideoItem>) => snowyBiz.createVideo(payload),
  updateVideo: (id: string, payload: Partial<VideoItem>) => snowyBiz.updateVideo(id, payload),
  deleteVideo: (id: string) => snowyBiz.deleteVideo(id),
  deleteVideos: (ids: string[]) => snowyBiz.deleteVideos(ids),

  // ---- 图文 ----
  /** 文本转图文：返回渲染好的图片地址，供编辑页勾选后作为图文图片 */
  renderGraphicPoster: (draft: GraphicPosterDraft) => snowyBiz.renderGraphicPoster(draft),
  getImageTexts: async () => ({ items: await snowyBiz.listImageTexts() }),
  createImageText: (payload: Partial<ImageTextItem>) => snowyBiz.createImageText(payload),
  updateImageText: (id: string, payload: Partial<ImageTextItem>) => snowyBiz.updateImageText(id, payload),
  deleteImageText: (id: string) => snowyBiz.deleteImageText(id),
  deleteImageTexts: (ids: string[]) => snowyBiz.deleteImageTexts(ids),

  // ---- 文章 ----
  getArticles: async () => ({ items: await snowyBiz.listArticles() }),
  createArticle: (payload: Partial<ArticleItem>) => snowyBiz.createArticle(payload),
  updateArticle: (id: string, payload: Partial<ArticleItem>) => snowyBiz.updateArticle(id, payload),
  deleteArticle: (id: string) => snowyBiz.deleteArticle(id),
  deleteArticles: (ids: string[]) => snowyBiz.deleteArticles(ids),
};
