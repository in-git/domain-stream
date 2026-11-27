/**
 * ffmpeg.wasm 执行封装
 * ------------------------------------------------------------------
 * 用官方单线程 core（@ffmpeg/core），不需要 COOP/COEP 跨域隔离响应头，
 * dev server 与生产 nginx 均可零改动运行。
 *
 * 职责：
 *   - 单例加载 FFmpeg 实例（wasm 约 30MB，首次加载耗时，之后复用）
 *   - runVideoEdit：一条命令完成 裁剪(画面) + 调整时长 + 压缩，
 *     参数层与命令层一一对应，二期换后端 ProcessBuilder 时可直接移植命令拼装
 *   - cancelVideoEdit：terminate 掉 worker 取消进行中的任务（下次调用自动重载）
 *
 * 输入约束：wasm32 内存上限，输入文件建议不超过 200MB。
 */
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
// 官方单线程 core：经包 exports 暴露（"." 为 ESM 胶水 JS，"./wasm" 为 wasm 二进制）
import coreJsUrl from '@ffmpeg/core?url';
import coreWasmUrl from '@ffmpeg/core/wasm?url';

/** 输入文件大小上限（软限制）：超过后 wasm 内存压力大，容易崩 */
export const MAX_INPUT_BYTES = 200 * 1024 * 1024;

/** 裁剪区域：视频原始像素坐标 */
export interface VideoCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VideoEditParams {
  /** 画面裁剪区域（视频像素坐标）；不传 = 不裁剪 */
  crop?: VideoCropRect | null;
  /** 保留片段起点（秒），0 表示从头 */
  trimStart?: number;
  /** 保留片段终点（秒），不传 = 到结尾 */
  trimEnd?: number | null;
  /** 压缩：目标高度（宽等比、自动补偶数）；不传 = 不缩放 */
  scaleHeight?: number | null;
  /** 压缩：x264 CRF 质量（18~28，越大越小越糊） */
  crf?: number;
  /** 是否去掉音轨 */
  removeAudio?: boolean;
  /** 处理进度 0~1（ffmpeg 按输出时间估算，可能略超 1） */
  onProgress?: (ratio: number) => void;
}

let instance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg(onLog?: (message: string) => void): Promise<FFmpeg> {
  if (instance) return instance;
  if (!loadPromise) {
    const ffmpeg = new FFmpeg();
    if (onLog) ffmpeg.on('log', ({ message }) => onLog(message));
    loadPromise = ffmpeg
      .load({ coreURL: coreJsUrl, wasmURL: coreWasmUrl })
      .then(() => {
        instance = ffmpeg;
        return ffmpeg;
      })
      .catch((err) => {
        loadPromise = null;
        throw err;
      });
  }
  return loadPromise;
}

/** x264 要求宽高为偶数，裁剪参数全部取整到偶数并收敛到画面内 */
function normalizeCrop(
  crop: VideoCropRect,
  videoWidth: number,
  videoHeight: number
): VideoCropRect {
  const clamp = (value: number, max: number) => Math.max(0, Math.min(Math.round(value), max));
  const even = (value: number) => Math.max(2, value - (value % 2));
  const x = clamp(crop.x, videoWidth - 2);
  const y = clamp(crop.y, videoHeight - 2);
  const width = even(Math.min(clamp(crop.width, videoWidth - x), videoWidth));
  const height = even(Math.min(clamp(crop.height, videoHeight - y), videoHeight));
  return { x: even(x), y: even(y), width, height };
}

/** 组装一条 ffmpeg 命令：-ss/-t + crop + scale + libx264(crf) + faststart */
function buildArgs(params: VideoEditParams, videoWidth: number, videoHeight: number): string[] {
  const args: string[] = [];
  const start = params.trimStart && params.trimStart > 0 ? params.trimStart : null;
  const end = params.trimEnd ?? null;
  if (start != null) args.push('-ss', start.toFixed(3));
  if (end != null) {
    const duration = Math.max(0.1, end - (start ?? 0));
    args.push('-t', duration.toFixed(3));
  }
  args.push('-i', 'input.mp4');

  const filters: string[] = [];
  if (params.crop) {
    const crop = normalizeCrop(params.crop, videoWidth, videoHeight);
    filters.push(`crop=${crop.width}:${crop.height}:${crop.x}:${crop.y}`);
  }
  if (params.scaleHeight) {
    // -2 让 libx264 自动把宽补成偶数；只缩不放由调用方保证
    filters.push(`scale=-2:${Math.max(2, Math.round(params.scaleHeight))}`);
  }
  if (filters.length) args.push('-vf', filters.join(','));

  args.push('-c:v', 'libx264', '-crf', String(Math.round(params.crf ?? 26)), '-preset', 'veryfast');
  if (params.removeAudio) {
    args.push('-an');
  } else {
    args.push('-c:a', 'aac', '-b:a', '128k');
  }
  args.push('-movflags', '+faststart', '-y', 'output.mp4');
  return args;
}

export interface VideoEditSource {
  blob: Blob;
  /** 原始视频宽高，用于裁剪参数换算 */
  videoWidth: number;
  videoHeight: number;
  /** 原始时长（秒），未传终点时裁到此处 */
  duration?: number;
}

/** 执行 裁剪+调时长+压缩，返回处理后的 mp4 Blob */
export async function runVideoEdit(source: VideoEditSource, params: VideoEditParams): Promise<Blob> {
  const { blob, videoWidth, videoHeight, duration } = source;
  const ffmpeg = await getFFmpeg();

  const handleProgress = ({ progress }: { progress: number }) => {
    if (progress > 0) params.onProgress?.(Math.min(1, progress));
  };
  ffmpeg.on('progress', handleProgress);

  try {
    await ffmpeg.writeFile('input.mp4', await fetchFile(blob));
    const end = params.trimEnd ?? duration ?? null;
    const code = await ffmpeg.exec(buildArgs({ ...params, trimEnd: end }, videoWidth, videoHeight));
    if (code !== 0) {
      throw new Error(`ffmpeg 处理失败（退出码 ${code}），请尝试降低压缩档位或缩短片段`);
    }
    const data = await ffmpeg.readFile('output.mp4');
    const bytes: Uint8Array =
      data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
    if (!bytes.length) throw new Error('ffmpeg 未产出视频文件，请调整参数后重试');
    // TS 严格模式下 Uint8Array.buffer 是 ArrayBufferLike，先按 ArrayBuffer 视图切块再包 Blob
    return new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: 'video/mp4' });
  } finally {
    ffmpeg.off('progress', handleProgress);
    await ffmpeg.deleteFile('input.mp4').catch(() => undefined);
    await ffmpeg.deleteFile('output.mp4').catch(() => undefined);
  }
}

/** 预热处理引擎：弹窗打开时后台加载 wasm（首次约 30MB），避免点「生成」时才等 */
export function preloadFFmpeg(): Promise<void> {
  return getFFmpeg().then(() => undefined);
}

/** 取消进行中的处理：worker 被终止，下次调用 runVideoEdit 时自动重新加载 */
export function cancelVideoEdit(): void {
  if (!instance) return;
  try {
    instance.terminate();
  } catch {
    // terminate 后实例不可复用，静默处理
  }
  instance = null;
  loadPromise = null;
}
