/**
 * 大文件分片上传（断点续传）
 * ------------------------------------------------------------------
 * 单文件 > 50MB 时走分片：init → 逐片 upload → complete。
 * 后端把分片合并后复用小诺文件服务入库，返回与普通上传一致的下载地址。
 */
import { normalizeFileUrl, snowyRequest } from './snowy.ts';

/** 单片大小 8MB：足够小以免触发代理/网关的单请求体积限制，又不至于片数过多 */
const CHUNK_SIZE = 8 * 1024 * 1024;
/** 低于该大小的文件直接走普通上传，避免分片开销 */
const CHUNK_THRESHOLD = 20 * 1024 * 1024;

export interface ChunkUploadOptions {
  bizType?: 'USER' | 'MATERIAL';
  categoryCode?: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

interface InitResult {
  uploadId: string;
  uploaded: number[];
}

/**
 * 分片上传文件，返回下载地址。
 * 内部自动判断文件大小：小文件走普通整文件上传，大文件走分片。
 */
export async function uploadFileChunked(
  file: File,
  options: ChunkUploadOptions = {}
): Promise<{ url: string }> {
  const { bizType = 'USER', categoryCode, onProgress, signal } = options;

  if (file.size < CHUNK_THRESHOLD) {
    return uploadWhole(file, bizType, categoryCode, onProgress, signal);
  }

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const init = await snowyRequest<InitResult>('/dev/file/chunk/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      fileName: file.name,
      fileSize: String(file.size),
      lastModified: String(file.lastModified),
      totalChunks: String(totalChunks),
      bizType,
      ...(categoryCode ? { categoryCode } : {}),
    }),
  });

  const uploadedSet = new Set(init.uploaded || []);
  for (let i = 0; i < totalChunks; i++) {
    if (signal?.aborted) throw new DOMException('已取消', 'AbortError');
    if (uploadedSet.has(i)) {
      onProgress?.(Math.round(((i + 1) / totalChunks) * 95));
      continue;
    }
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    await uploadPart(init.uploadId, i, file.slice(start, end), signal);
    onProgress?.(Math.round(((i + 1) / totalChunks) * 95));
  }

  const url = await snowyRequest<string>('/dev/file/chunk/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      uploadId: init.uploadId,
      fileName: file.name,
      totalChunks: String(totalChunks),
      bizType,
      ...(categoryCode ? { categoryCode } : {}),
    }),
  });
  onProgress?.(100);
  return { url: normalizeFileUrl(url) };
}

function uploadPart(uploadId: string, index: number, blob: Blob, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('uploadId', uploadId);
    form.append('index', String(index));
    form.append('file', blob, `part-${index}`);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/snowy/dev/file/chunk/upload');
    const token = localStorage.getItem('TOKEN');
    if (token) xhr.setRequestHeader('token', token);
    xhr.onload = () => {
      let payload: { code: number; msg: string };
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error('分片上传响应解析失败'));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300 && payload.code === 200) resolve();
      else reject(new Error(payload.msg || `分片上传失败 (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('网络异常，分片上传中断'));
    if (signal) {
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }
    xhr.send(form);
  });
}

/** 小文件走与小诺现有实现一致的整文件上传 */
function uploadWhole(
  file: File,
  bizType: 'USER' | 'MATERIAL',
  categoryCode: string | undefined,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<{ url: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const base = bizType === 'MATERIAL'
      ? '/snowy/dev/file/uploadMaterialReturnUrl'
      : '/snowy/dev/file/uploadLocalReturnUrl';
    const endpoint = bizType === 'MATERIAL' && categoryCode
      ? `${base}?categoryCode=${encodeURIComponent(categoryCode)}`
      : base;
    xhr.open('POST', endpoint);
    const token = localStorage.getItem('TOKEN');
    if (token) xhr.setRequestHeader('token', token);
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable) onProgress?.(Math.round((evt.loaded / evt.total) * 100));
    };
    xhr.onload = () => {
      let payload: { code: number; msg: string; data: string };
      try {
        payload = JSON.parse(xhr.responseText);
      } catch {
        reject(new Error('上传响应解析失败'));
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
    if (signal) signal.addEventListener('abort', () => xhr.abort(), { once: true });
    const form = new FormData();
    form.append('file', file);
    xhr.send(form);
  });
}
