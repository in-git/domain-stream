/** 拖拽导入视频：目录读取、视频筛选与本地元信息/封面提取 */

interface DragEntry {
  isDirectory: boolean;
  isFile: boolean;
  name: string;
  file: (callback: (file: File) => void, error?: (error: Error) => void) => void;
  createReader: () => {
    readEntries: (callback: (entries: DragEntry[]) => void, error?: (error: Error) => void) => void;
  };
}

export interface DroppedFiles {
  files: File[];
  hasDirectory: boolean;
}

function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|avi|mkv|flv)$/i.test(file.name);
}

async function readEntry(entry: DragEntry): Promise<File[]> {
  if (entry.isFile) {
    return new Promise((resolve) => {
      entry.file(
        (file) => resolve([file]),
        () => resolve([])
      );
    });
  }
  if (!entry.isDirectory) return [];

  const reader = entry.createReader();
  const collected: File[] = [];
  // readEntries 每次最多返回一批，空数组代表读完
  for (;;) {
    const batch = await new Promise<DragEntry[]>((resolve) => {
      reader.readEntries(resolve, () => resolve([]));
    });
    if (!batch.length) break;
    for (const child of batch) collected.push(...(await readEntry(child)));
  }
  return collected;
}

async function collectDropped(dataTransfer: DataTransfer): Promise<DroppedFiles> {
  const items = Array.from(dataTransfer.items || []);
  const entries: DragEntry[] = [];
  for (const item of items) {
    if (item.kind !== 'file') continue;
    const withEntry = item as DataTransferItem & { webkitGetAsEntry?: () => unknown };
    const entry = withEntry.webkitGetAsEntry?.();
    if (entry) entries.push(entry as unknown as DragEntry);
  }

  let files: File[] = [];
  let hasDirectory = false;
  if (entries.length) {
    hasDirectory = entries.some((entry) => entry.isDirectory);
    for (const entry of entries) files.push(...(await readEntry(entry)));
  } else {
    files = Array.from(dataTransfer.files || []);
  }
  return { files, hasDirectory };
}

/** 从 DragEvent 中读取视频文件，支持文件夹递归 */
export async function collectDroppedVideos(dataTransfer: DataTransfer): Promise<DroppedFiles> {
  const result = await collectDropped(dataTransfer);
  return { ...result, files: result.files.filter(isVideoFile) };
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|avif|heic)$/i.test(file.name);
}

/** 从 DragEvent 中读取图片文件，支持文件夹递归 */
export async function collectDroppedImages(dataTransfer: DataTransfer): Promise<DroppedFiles> {
  const result = await collectDropped(dataTransfer);
  return { ...result, files: result.files.filter(isImageFile) };
}

/** 读取视频时长/分辨率，并在约 10% 处截取一帧作为封面 */
export function extractVideoMetadataAndFrame(file: File): Promise<{
  duration: number;
  resolution: string;
  coverBlob: Blob | null;
}> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.src = url;

    const finish = (result: { duration: number; resolution: string; coverBlob: Blob | null }) => {
      URL.revokeObjectURL(url);
      resolve(result);
    };

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? Math.round(video.duration) : 60;
      const resolution =
        video.videoWidth && video.videoHeight
          ? `${video.videoWidth}×${video.videoHeight}`
          : '1920×1080';
      video.currentTime = Math.min(1, duration * 0.1);

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 1280;
          canvas.height = video.videoHeight || 720;
          const context = canvas.getContext('2d');
          if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
              (blob) => finish({ duration, resolution, coverBlob: blob }),
              'image/jpeg',
              0.85
            );
            return;
          }
        } catch {
          // 浏览器不支持截帧时只保留元数据
        }
        finish({ duration, resolution, coverBlob: null });
      };
    };

    video.onerror = () => finish({ duration: 60, resolution: '1920×1080', coverBlob: null });
  });
}

/** 从播放器当前帧截取 JPEG 封面，供单个编辑与批量封面弹窗共用 */
export async function captureFrameFromVideo(video: HTMLVideoElement): Promise<Blob> {
  if (video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
    throw new Error('请先播放视频，再点击截取封面');
  }
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('当前浏览器不支持画面截取');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.92)
  );
  if (!blob) throw new Error('截取失败，请换一帧重试');
  return blob;
}

export function titleFromFileName(name: string): string {
  return name.replace(/\.[^/.]+$/, '');
}
