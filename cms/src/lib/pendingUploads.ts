/**
 * 保存前补传图片
 * ------------------------------------------------------------------
 * 画布里有两类「还没上服务器」的图片地址：
 *   - blob: 拖拽进画布的本地文件，只在内存里预览；
 *   - data:image/... 内置 SVG 图形、或内联粘贴的图片。
 * 用户点「保存配置」时统一上传，并把这些地址回填成后端存储路径，
 * 保证存库的 JSON 里只保留上传后的路径。
 *
 * 同一个地址重复保存时复用第一次的上传结果，不会重复上传。
 */
import { uploadLibraryFile } from './fileCenter.ts';

/** blob URL → 本地文件 */
const pendingFiles = new Map<string, File>();
/** 原地址（blob / data URI）→ 已上传的后端路径（不带 /snowy 前缀） */
const uploadedPaths = new Map<string, string>();

const PENDING_URLS = /blob:[^\s"'\\]+|data:image\/[^\s,"']*,[^\s"'\\]+/gi;

/** 注册一个待上传文件，返回可直接用于渲染的 blob URL */
export function registerPendingFile(file: File): string {
  const url = URL.createObjectURL(file);
  pendingFiles.set(url, file);
  return url;
}

/** 文本里是否还有没上传的图片地址 */
export function hasPendingUploads(text: string): boolean {
  return /blob:|data:image\//i.test(text);
}

/** data URI → File：内置 SVG 是明文 URI，位图一般是 base64 */
function dataUriToFile(uri: string): File | null {
  const match = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/i.exec(uri);
  if (!match) return null;
  const mime = match[1] || 'application/octet-stream';
  const isBase64 = !!match[2];
  const payload = match[3] ?? '';
  try {
    const bytes = isBase64
      ? Uint8Array.from(atob(payload), (char) => char.charCodeAt(0))
      : new TextEncoder().encode(decodeURIComponent(payload));
    const subtype = mime.includes('svg')
      ? 'svg'
      : (mime.split('/')[1] || 'png').replace('jpeg', 'jpg').split('+')[0];
    const name = `canvas-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${subtype}`;
    return new File([bytes.buffer as ArrayBuffer], name, { type: mime });
  } catch {
    return null;
  }
}

/**
 * 把文本里出现的 blob / data:image 地址全部替换成后端存储路径。
 * 任意一个文件上传失败都会抛错，调用方应中止保存。
 */
export async function resolvePendingFiles(text: string): Promise<string> {
  if (!hasPendingUploads(text)) return text;
  const urls = Array.from(new Set(text.match(PENDING_URLS) ?? []));
  let next = text;
  for (const url of urls) {
    const cached = uploadedPaths.get(url);
    if (cached) {
      next = next.split(url).join(cached);
      continue;
    }
    const file = url.startsWith('blob:') ? pendingFiles.get(url) : dataUriToFile(url);
    if (!file) continue;
    try {
      const { url: uploaded } = await uploadLibraryFile(file, 'USER');
      const stored = uploaded.replace(/^\/snowy/, '');
      uploadedPaths.set(url, stored);
      pendingFiles.delete(url);
      next = next.split(url).join(stored);
    } catch (err) {
      const reason = err instanceof Error ? err.message : '未知错误';
      throw new Error(`「${file.name}」上传失败：${reason}`);
    }
  }
  return next;
}
