import { getSnowyToken, snowyRequest } from './snowy.ts';

/** 单片 8MB，与后端 /biz/import/upload/init 的限制一致 */
export const IMPORT_CHUNK_SIZE = 8 * 1024 * 1024;

export type ImportMode = 'OVERWRITE' | 'APPEND';

interface InitResult {
  uploadId: string;
  uploaded: number[];
}

interface CommonPayload<T> {
  code: number;
  msg: string;
  data: T;
}

function importSuffix(file: File): 'zip' | 'sql' {
  const name = file.name.toLowerCase();
  if (name.endsWith('.zip')) return 'zip';
  if (name.endsWith('.sql')) return 'sql';
  throw new Error('仅支持 .sql 数据库备份或 .zip 文件资源包');
}

function formParams(params: Record<string, string>): URLSearchParams {
  return new URLSearchParams(params);
}

function chunkByteLength(fileSize: number, index: number): number {
  const start = index * IMPORT_CHUNK_SIZE;
  return Math.min(IMPORT_CHUNK_SIZE, fileSize - start);
}

/** 单片上传用 XHR 才能拿到上传进度；分片只进临时目录，不会进入文件中心 */
function uploadChunk(
  uploadId: string,
  index: number,
  blob: Blob,
  onProgress: (loaded: number) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('上传已取消', 'AbortError'));
      return;
    }
    const form = new FormData();
    form.append('uploadId', uploadId);
    form.append('index', String(index));
    form.append('file', blob, `chunk-${index}`);

    const xhr = new XMLHttpRequest();
    const cleanup = () => {
      xhr.upload.onprogress = null;
      xhr.onload = null;
      xhr.onerror = null;
      xhr.onabort = null;
      signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = () => xhr.abort();

    xhr.open('POST', '/snowy/biz/import/upload/chunk');
    const token = getSnowyToken();
    if (token) xhr.setRequestHeader('token', token);
    xhr.upload.onprogress = (event) => onProgress(event.loaded);
    xhr.onload = () => {
      cleanup();
      let payload: CommonPayload<boolean> | null = null;
      try {
        payload = JSON.parse(xhr.responseText) as CommonPayload<boolean>;
      } catch {
        // ignore
      }
      if (xhr.status !== 200 || !payload) {
        reject(new Error(`分片上传失败 (${xhr.status})`));
        return;
      }
      if (payload.code !== 200) {
        reject(new Error(payload.msg || '分片上传失败'));
        return;
      }
      resolve();
    };
    xhr.onerror = () => {
      cleanup();
      reject(new Error('分片上传失败，请检查网络连接'));
    };
    xhr.onabort = () => {
      cleanup();
      reject(new DOMException('上传已取消', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    xhr.send(form);
  });
}

/**
 * 分片上传导入文件，合并后由后端启动导入任务。
 * onProgress 的进度仅覆盖上传阶段，上传完成后返回任务票据，导入进度由状态轮询展示。
 */
export async function uploadImportFile(
  file: File,
  mode: ImportMode,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
): Promise<string> {
  importSuffix(file);
  if (file.size <= 0) throw new Error('导入文件不能为空');

  const totalChunks = Math.ceil(file.size / IMPORT_CHUNK_SIZE);
  const init = await snowyRequest<InitResult>('/biz/import/upload/init', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: formParams({
      fileName: file.name,
      fileSize: String(file.size),
      lastModified: String(file.lastModified),
      chunkSize: String(IMPORT_CHUNK_SIZE),
      mode,
    }),
  });

  const uploaded = new Set(init.uploaded);
  let doneBytes = 0;
  uploaded.forEach((index) => {
    if (index >= 0 && index < totalChunks) doneBytes += chunkByteLength(file.size, index);
  });
  onProgress?.(Math.round((doneBytes / file.size) * 100));

  for (let i = 0; i < totalChunks; i++) {
    if (uploaded.has(i)) continue;
    const start = i * IMPORT_CHUNK_SIZE;
    const end = Math.min(file.size, start + IMPORT_CHUNK_SIZE);
    await uploadChunk(
      init.uploadId,
      i,
      file.slice(start, end),
      (loaded) => onProgress?.(Math.min(100, Math.round(((doneBytes + loaded) / file.size) * 100))),
      signal
    );
    doneBytes = end;
    onProgress?.(Math.round((doneBytes / file.size) * 100));
  }

  return snowyRequest<string>('/biz/import/upload/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: formParams({ uploadId: init.uploadId }),
  });
}
