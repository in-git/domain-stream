/**
 * 延迟上传（本地暂存）工具
 * ------------------------------------------------------------------
 * 内容编辑页选中文件后不再立即上传，而是先在浏览器本地暂存：
 * - 生成 blob: 预览地址供页面/预览区直接显示；
 * - 真正的上传推迟到用户点击「保存 / 发布」时统一执行。
 * 这样可以避免用户只是试选文件、或中途取消编辑时在服务器上留下垃圾文件。
 */
import { uploadFileWithProgress } from './api.ts';

/** 暂存在本地的待上传文件 */
export interface PendingFile {
  /** 本地唯一 key，用于列表渲染与上传后回填 */
  key: string;
  file: File;
  /** blob: 预览地址，上传成功或文件被移除后释放 */
  previewUrl: string;
}

let pendingSeq = 0;

/** 把文件暂存在本地，返回带预览地址的句柄 */
export function createPendingFile(file: File): PendingFile {
  pendingSeq += 1;
  return {
    key: `pending-${Date.now()}-${pendingSeq}`,
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

/**
 * 把 data URI（如后端生成的图片）转成本地待上传文件。
 * 用于「文本转图文」这类由服务端直接返回图片数据的场景：
 * 预览阶段不落盘，只有保存时才真正上传，避免冗余文件。
 *
 * @param dataUri 形如 data:image/jpeg;base64,xxxx
 * @param fileName 上传时使用的文件名
 * @returns 待上传句柄；解析失败返回 null
 */
export function createPendingFileFromDataUri(dataUri: string, fileName: string): PendingFile | null {
  const matched = /^data:([^;,]+)(;base64)?,(.*)$/s.exec(dataUri);
  if (!matched) return null;
  const [, mime = 'image/jpeg', isBase64, payload] = matched;
  try {
    let bytes: Uint8Array;
    if (isBase64) {
      const binary = atob(payload);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    } else {
      // 非 base64 的 data URI 按 URI 编码处理
      const decoded = decodeURIComponent(payload);
      bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i += 1) bytes[i] = decoded.charCodeAt(i);
    }
    const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
    return createPendingFile(new File([bytes], `${fileName}.${ext}`, { type: mime }));
  } catch {
    return null;
  }
}

/** 释放单个本地预览地址 */
export function releasePendingFile(item?: PendingFile | null): void {
  if (!item) return;
  URL.revokeObjectURL(item.previewUrl);
}

/** 批量释放本地预览地址 */
export function releasePendingFiles(items: Array<PendingFile | null | undefined>): void {
  items.forEach(releasePendingFile);
}

/**
 * 依次上传待上传文件（保持原有顺序），返回后端下载地址数组。
 * - onProgress：整体进度百分比（0-100）
 * - onUploaded：单个文件上传成功即回调，调用方可立即把该项标记为已上传，
 *   这样后续上传失败重试时不会重复上传同一文件。
 */
export async function uploadPendingFiles(
  items: PendingFile[],
  onProgress?: (percent: number) => void,
  onUploaded?: (item: PendingFile, url: string, index: number) => void
): Promise<string[]> {
  if (!items.length) return [];
  const urls: string[] = [];
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const res = await uploadFileWithProgress(item.file, (pct) => {
      onProgress?.(Math.round(((i + pct / 100) / items.length) * 100));
    });
    urls.push(res.url);
    onUploaded?.(item, res.url, i);
  }
  onProgress?.(100);
  return urls;
}

/**
 * 富文本正文图片的延迟上传队列。
 * AiEditor 插入图片时需要立即拿到可显示的地址，这里先返回 blob: 地址并登记文件；
 * 保存时调用 flush() 把正文里仍被引用的 blob 地址替换成真实下载地址。
 */
export interface BlobUploadQueue {
  /** 登记本地文件并返回可直接预览的 blob 地址 */
  register(file: File): string;
  /** 把 html 中仍被引用的 blob 地址替换成真实地址；未被引用的直接丢弃 */
  flush(html: string, onProgress?: (percent: number) => void): Promise<string>;
  /** 是否有待上传文件 */
  size(): number;
  /** 释放全部本地预览地址并清空队列 */
  reset(): void;
}

export function createBlobUploadQueue(): BlobUploadQueue {
  const files = new Map<string, File>();
  // 已上传成功但正文里仍可能残留 blob 地址的映射，保证 flush 可重复执行
  const resolved = new Map<string, string>();

  return {
    register(file) {
      const url = URL.createObjectURL(file);
      files.set(url, file);
      return url;
    },

    async flush(html, onProgress) {
      let next = html;
      // 先替换此前已上传成功的地址（上一次保存中途失败的场景）
      resolved.forEach((realUrl, blobUrl) => {
        next = next.split(blobUrl).join(realUrl);
      });

      // 正文中已不再引用的本地图片直接丢弃
      Array.from(files.keys()).forEach((blobUrl) => {
        if (next.includes(blobUrl)) return;
        files.delete(blobUrl);
        URL.revokeObjectURL(blobUrl);
      });

      const pending = Array.from(files.keys());
      for (let i = 0; i < pending.length; i += 1) {
        const blobUrl = pending[i];
        const file = files.get(blobUrl);
        if (!file) continue;
        const res = await uploadFileWithProgress(file, (pct) => {
          onProgress?.(Math.round(((i + pct / 100) / pending.length) * 100));
        });
        resolved.set(blobUrl, res.url);
        next = next.split(blobUrl).join(res.url);
        files.delete(blobUrl);
        URL.revokeObjectURL(blobUrl);
      }
      onProgress?.(100);
      return next;
    },

    size() {
      return files.size;
    },

    reset() {
      files.forEach((_, url) => URL.revokeObjectURL(url));
      files.clear();
      resolved.clear();
    },
  };
}
