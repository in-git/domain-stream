/**
 * 视频首帧提取（只服务编辑器预览）
 * ------------------------------------------------------------------
 * Leafer 画布只能画图片，所以背景视频在编辑器里不播放，改为抽一张首帧
 * 当成静态图铺在画布上：上传后立刻能看到画面和铺法效果，真实播放交给前台。
 * 抽帧结果只存在内存里（data URL），不会写进文档，也不会占配置体积。
 */
import { toPlayableVideoUrl } from '../../lib/fileCenter.ts';
import { previewUrl } from './types';

export interface VideoFrame {
  /** 首帧的 data URL */
  url: string;
  width: number;
  height: number;
}

/** 同一个地址只抽一次：改铺法、切方向都会重新同步背景，不必反复解码 */
const frameCache = new Map<string, Promise<VideoFrame | null>>();

export function loadVideoFrame(raw: string): Promise<VideoFrame | null> {
  // 文件中心的下载地址带 attachment 头，视频元素读不了，先换成可播放的流地址
  const src = previewUrl(toPlayableVideoUrl(raw));
  if (!src) return Promise.resolve(null);
  const cached = frameCache.get(src);
  if (cached) return cached;
  const task = extract(src).catch(() => null);
  frameCache.set(src, task);
  return task;
}

function extract(src: string): Promise<VideoFrame | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    // 走 /snowy 代理取流，同源；显式声明是为了将来换成跨域地址时仍能读像素
    video.crossOrigin = 'anonymous';

    let finished = false;
    let timer = 0;
    const finish = (frame: VideoFrame | null) => {
      if (finished) return;
      finished = true;
      window.clearTimeout(timer);
      video.removeAttribute('src');
      video.load();
      resolve(frame);
    };

    const draw = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) {
        finish(null);
        return;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) {
        finish(null);
        return;
      }
      try {
        context.drawImage(video, 0, 0, width, height);
        finish({ url: canvas.toDataURL('image/jpeg', 0.85), width, height });
      } catch {
        // 跨域污染画布等情况：静默放弃，画布只显示纯色底
        finish(null);
      }
    };

    video.addEventListener('loadeddata', () => {
      // 首帧常是黑场，往后跳 0.1s 再取；时长为 0 或设不进去就直接画当前帧
      const target = Math.min(0.1, (video.duration || 0) / 2);
      if (target > 0) {
        try {
          video.currentTime = target;
          return;
        } catch {
          // 落到下面画当前帧
        }
      }
      draw();
    });
    video.addEventListener('seeked', draw);
    video.addEventListener('error', () => finish(null));
    // 解码失败或浏览器不支持该编码时兜底，避免一直等
    timer = window.setTimeout(() => finish(null), 6000);

    video.src = src;
  });
}
