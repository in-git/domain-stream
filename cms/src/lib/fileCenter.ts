/**
 * 文件中心（小诺 DEV_FILE）接口对接层
 * ------------------------------------------------------------------
 * 后端：vip.xiaonuo.dev.modular.file（DevFileController）
 * 路由：/dev/file/*（GET page / detail / authDownload，
 *       POST delete；上传走 /dev/file/uploadLocalReturnUrl）
 * 前端统一经 /snowy 代理访问，与登录态 token 保持一致。
 *
 * 素材按 CATEGORY 分类（IMAGE/VIDEO/AUDIO/DOC/OTHER），由后端按后缀推断落库。
 */
import { snowyFetch, snowyRequest, snowyUpload } from './snowy.ts';

const BASE = '/dev/file';

/** 素材分类：与 DEV_FILE.CATEGORY 注释一致 */
export const FILE_CATEGORIES = [
  { value: 'VIDEO', label: '视频' },
  { value: 'AUDIO', label: '音频' },
  { value: 'IMAGE', label: '图片' },
  { value: 'DOC', label: '文档' },
  { value: 'OTHER', label: '其他' },
] as const;

export type FileCategory = (typeof FILE_CATEGORIES)[number]['value'];

export function categoryLabel(value?: string): string {
  return FILE_CATEGORIES.find((c) => c.value === value)?.label || value || '其他';
}

const VIDEO_SUFFIXES = [
  'mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'ogv', 'm4v', 'wmv', '3gp', 'mpg', 'mpeg', 'ts',
];
const AUDIO_SUFFIXES = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'opus'];
const IMAGE_SUFFIXES = [
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'ico', 'svg', 'psd', 'tif', 'tiff',
];

function suffixOf(file: DevFile): string {
  return (file.suffix || '').toLowerCase().replace('.', '');
}

export function isVideoFile(file: DevFile): boolean {
  return file.category === 'VIDEO' || VIDEO_SUFFIXES.includes(suffixOf(file));
}
export function isAudioFile(file: DevFile): boolean {
  return file.category === 'AUDIO' || AUDIO_SUFFIXES.includes(suffixOf(file));
}
export function isImageFile(file: DevFile): boolean {
  return file.category === 'IMAGE' || IMAGE_SUFFIXES.includes(suffixOf(file));
}

/** DEV_FILE 实体（后端字段为驼峰） */
export interface DevFile {
  id: string;
  engine?: string;
  bucket?: string;
  fileKey?: string;
  name?: string;
  suffix?: string;
  category?: string;
  /** 通用分类编码，关联 BIZ_CATEGORY.CODE */
  categoryCode?: string;
  /** 库类型：USER 用户文件 / MATERIAL 素材库 */
  bizType?: string;
  sizeKb?: string;
  sizeInfo?: string;
  objName?: string;
  storagePath?: string;
  downloadPath?: string;
  isDownloadAuth?: boolean;
  thumbnail?: string;
  extJson?: string;
  createTime?: string;
  createUser?: string;
  updateTime?: string;
  updateUser?: string;
}

/** MyBatis-Plus 分页对象 */
export interface DevFilePage {
  records: DevFile[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

function qs(params: Record<string, unknown> = {}): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (!entries.length) return '';
  return (
    '?' +
    entries
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
  );
}

/** 把小诺返回的 URL 规范化为走 cms 代理的相对地址（去 /api 前缀，挂到 /snowy） */
function normalizeFileUrl(raw?: string): string {
  if (!raw) return '';
  try {
    const u = new URL(raw, window.location.origin);
    // 远端素材（Iconify/Bing/Picsum 等）直接走原地址，不套本机 /snowy 代理
    if (u.origin !== window.location.origin && /^https?:$/.test(u.protocol) && !u.pathname.startsWith('/api/')) {
      return raw;
    }
    const path = u.pathname.replace(/^\/api/, '');
    return `/snowy${path}${u.search}`;
  } catch {
    return raw;
  }
}

/**
 * 公开文件（downloadPath 带 sign 签名）可转成流式播放地址，
 * 后端 /public/file/stream 支持 HTTP Range，视频音频可直接拖动进度。
 */
export function toStreamUrl(file: DevFile): string {
  const url = normalizeFileUrl(file.downloadPath);
  if (!url.includes('sign=')) return '';
  return url.replace('/dev/file/download', '/public/file/stream');
}

/**
 * 把视频字段里保存的下载地址转成可直接播放的流式地址。
 * CMS 保存的是 /dev/file/download?id=...&sign=...，该接口返回
 * application/octet-stream 且不支持 Range，浏览器无法播放/拖动进度；
 * /public/file/stream 支持 Range，可用于 <video>/播放器。
 * 其它地址（blob:、直链 mp4、已是 stream）原样返回。
 */
export function toPlayableVideoUrl(raw?: string): string {
  if (!raw) return '';
  // 本地 blob 预览地址原样返回；播放器需要配合 MIME type 才能识别媒体
  if (raw.startsWith('blob:')) return raw;
  try {
    const u = new URL(raw, window.location.origin);
    if (!u.pathname.includes('/dev/file/download')) return raw;
    const id = u.searchParams.get('id');
    const sign = u.searchParams.get('sign');
    if (!id || !sign) return raw;
    return `/snowy/public/file/stream?id=${encodeURIComponent(id)}&sign=${encodeURIComponent(sign)}`;
  } catch {
    return raw;
  }
}

/** 文件在浏览器中直接打开的地址（新窗口下载/查看），公开文件可用 */
export function toOpenUrl(file: DevFile): string {
  return normalizeFileUrl(file.downloadPath);
}

/**
 * 拉取文件二进制（授权文件无公开地址，走 authDownload 带 token 下载）。
 * 后端异常时响应可能是 JSON，需要给出可读提示。
 */
export async function fetchFileBlob(file: DevFile): Promise<Blob> {
  const res = await snowyFetch(`${BASE}/authDownload${qs({ id: file.id })}`);
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.msg || `文件加载失败 (${res.status})`);
  }
  if (!res.ok) throw new Error(`文件加载失败 (${res.status})`);
  return res.blob();
}

/** 上传文件到指定库（本地引擎，返回下载 URL）；上传完成后由调用方刷新列表 */
export function uploadLibraryFile(
  file: File,
  bizType: 'USER' | 'MATERIAL',
  onProgress?: (percent: number) => void
): Promise<{ url: string }> {
  return snowyUpload(file, onProgress, false, bizType);
}

/** 上传素材到素材库（可指定通用分类编码） */
export function uploadMaterial(
  file: File,
  onProgress?: (percent: number) => void,
  categoryCode?: string
): Promise<{ url: string }> {
  return snowyUpload(file, onProgress, false, 'MATERIAL', categoryCode);
}

export const fileCenterApi = {
  /** 分页（后端支持 category / categoryCode / bizType / searchKey 过滤） */
  page(params: {
    current?: number;
    size?: number;
    category?: string;
    categoryCode?: string;
    bizType?: 'USER' | 'MATERIAL';
    searchKey?: string;
  } = {}): Promise<DevFilePage> {
    return snowyRequest<DevFilePage>(`${BASE}/page${qs(params)}`);
  },

  /** 详情 */
  detail(id: string): Promise<DevFile> {
    return snowyRequest<DevFile>(`${BASE}/detail${qs({ id })}`);
  },

  /** 删除：后端要求 [{"id":"..."}] 数组，支持批量（仅删记录，不动存储对象） */
  remove(ids: string[]): Promise<void> {
    return snowyRequest<void>(`${BASE}/delete`, {
      method: 'POST',
      body: JSON.stringify(ids.map((id) => ({ id }))),
    });
  },

  /** 检测图片记录对应的物理文件是否仍然存在 */
  checkInvalidImages(bizType: 'USER' | 'MATERIAL'): Promise<DevFile[]> {
    return snowyRequest<DevFile[]>(`${BASE}/checkInvalidImages${qs({ bizType })}`);
  },

  /** 清理失效图片记录，后端会再次校验物理文件，返回实际删除数量 */
  deleteInvalidImages(ids: string[]): Promise<number> {
    return snowyRequest<number>(`${BASE}/deleteInvalidImages`, {
      method: 'POST',
      body: JSON.stringify(ids.map((id) => ({ id }))),
    });
  },

  /** 调整文件所属库（用户文件 / 素材库） */
  updateBizType(ids: string[], bizType: 'USER' | 'MATERIAL'): Promise<void> {
    return snowyRequest<void>(`${BASE}/updateBizType?bizType=${bizType}`, {
      method: 'POST',
      body: JSON.stringify(ids.map((id) => ({ id }))),
    });
  },

  /**
   * 物理删除：删记录的同时删除存储对象（后端会校验对象是否被其它记录复用）。
   * 用于清理编辑过程中被替换掉的旧文件，避免留下孤儿文件。
   */
  removeAbsolute(id: string): Promise<void> {
    return snowyRequest<void>(`${BASE}/deleteAbsolute`, {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  },
};

/* ------------------------------------------------------------------ */
/* 旧文件清理                                                          */
/* ------------------------------------------------------------------ */

/**
 * 从后端下载地址中解析文件 id。
 * downloadPath 形如 `http://host:91/api/dev/file/download?id=xxx&sign=...`，
 * 前端存放的是经 /snowy 代理后的相对地址，但 id 参数保持不变。
 */
export function fileIdFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, window.location.origin);
    const id = parsed.searchParams.get('id');
    if (id) return id;
  } catch {
    // 非标准地址，退回正则解析
  }
  const match = /[?&]id=([^&#]+)/.exec(url);
  return match ? decodeURIComponent(match[1]) : null;
}

/** 对比新旧地址集合，返回已不再被引用的旧地址 */
export function removedUrls(
  previous: Array<string | null | undefined>,
  next: Array<string | null | undefined>
): string[] {
  const keep = new Set(next.filter((u): u is string => !!u));
  return Array.from(new Set(previous.filter((u): u is string => !!u))).filter(
    (u) => !keep.has(u)
  );
}

/** 提取 HTML 正文中引用的图片地址 */
export function imageUrlsInHtml(html?: string | null): string[] {
  if (!html) return [];
  const urls: string[] = [];
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) urls.push(match[1]);
  return urls;
}

/**
 * 提取 HTML 正文中引用的全部本地资源地址。
 * 覆盖图片、视频 src/source src，以及视频封面 poster。
 */
export function resourceUrlsInHtml(html?: string | null): string[] {
  if (!html) return [];
  const urls: string[] = [];
  const tagRe = /<(img|video|source)\b([^>]*)>/gi;
  const attrRe = /\b(src|poster)\s*=\s*["']([^"']+)["']/gi;
  let tagMatch: RegExpExecArray | null;
  while ((tagMatch = tagRe.exec(html)) !== null) {
    attrRe.lastIndex = 0;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRe.exec(tagMatch[2])) !== null) {
      urls.push(attrMatch[2]);
    }
  }
  return Array.from(new Set(urls));
}

/**
 * 按地址批量彻底删除文件。
 * 只处理能被解析出文件 id 的地址（外链、本地静态资源会被跳过），
 * 删除失败仅告警，不影响业务主流程。
 */
export async function deleteFilesByUrls(
  urls: Array<string | null | undefined>
): Promise<string[]> {
  const ids = Array.from(new Set(urls.map((u) => fileIdFromUrl(u)))).filter(
    (id): id is string => !!id
  );
  if (!ids.length) return [];
  const results = await Promise.allSettled(ids.map((id) => fileCenterApi.removeAbsolute(id)));
  const failed = results
    .map((result, idx) => (result.status === 'rejected' ? ids[idx] : ''))
    .filter(Boolean);
  if (failed.length) {
    console.warn('[fileCenter] 旧文件清理失败：', failed);
  }
  return failed;
}
