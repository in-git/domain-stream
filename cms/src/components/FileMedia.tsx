/**
 * 通用文件预览组件
 * ------------------------------------------------------------------
 * 按文件类型统一渲染：图片 / SVG / 视频 / 音频，其它类型给出占位提示。
 *   variant="thumb"  文件卡片封面，只出静态画面（视频直接渲染静音首帧，失败则交回占位）
 *   variant="player" 弹窗内完整预览（视频 / 音频带控制条）
 *
 * 后端 /dev/file/download 返回的是 application/octet-stream，SVG 等类型
 * 浏览器不会按图片解析；缩略图接口还受登录态保护。这里统一处理：
 * 直连失败时走 authDownload 拉 blob，并按后缀补上正确的 MIME 再渲染。
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import {
  fetchFileBlob,
  isAudioFile,
  isImageFile,
  isVideoFile,
  toOpenUrl,
  toStreamUrl,
  type DevFile,
} from '../lib/fileCenter.ts';
import { useFileThumbSrc } from '../lib/useFileThumb.ts';

export type FileKind = 'image' | 'video' | 'audio' | 'other';

export function fileKindOf(file: DevFile): FileKind {
  if (isVideoFile(file)) return 'video';
  if (isAudioFile(file)) return 'audio';
  if (isImageFile(file)) return 'image';
  return 'other';
}

const IMAGE_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
  ico: 'image/x-icon',
  svg: 'image/svg+xml',
  avif: 'image/avif',
  tif: 'image/tiff',
  tiff: 'image/tiff',
};

const VIDEO_MIME: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  ogv: 'video/ogg',
  mkv: 'video/x-matroska',
};

const AUDIO_MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  opus: 'audio/ogg',
};

function suffixOf(file: DevFile): string {
  const raw = (file.suffix || '').toLowerCase().replace('.', '').trim();
  if (raw) return raw;
  const name = (file.name || file.objName || '').toLowerCase();
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1) : '';
}

/** 按文件类型给 blob 补 MIME；后端常返回 octet-stream 或 text/xml，浏览器不会当图片解析 */
function typedBlob(file: DevFile, blob: Blob): Blob {
  const kind = fileKindOf(file);
  if (kind === 'image') {
    if (blob.type.startsWith('image/')) return blob;
    return new Blob([blob], { type: IMAGE_MIME[suffixOf(file)] || 'image/png' });
  }
  if (kind === 'video' && !blob.type.startsWith('video/')) {
    return new Blob([blob], { type: VIDEO_MIME[suffixOf(file)] || 'video/mp4' });
  }
  if (kind === 'audio' && !blob.type.startsWith('audio/')) {
    return new Blob([blob], { type: AUDIO_MIME[suffixOf(file)] || 'audio/mpeg' });
  }
  return blob;
}

interface FileImageProps {
  file: DevFile;
  src: string;
  alt?: string;
  className?: string;
  fallback?: ReactNode;
  onError?: () => void;
  /** 先用带 token 的下载拿到 blob 再渲染，不直接请求 src。
   *  SVG 直连返回 octet-stream 会被浏览器显示成裂图，所以首帧就跳过直连。
   */
  authFirst?: boolean;
  /** 缩略图悬停：把真实 img 节点交给调用方做原图切换 */
  onImgEnter?: (img: HTMLImageElement) => void;
  onImgLeave?: () => void;
  /** 原图已预加载：直接显示，不再走淡入，避免切换瞬间闪空 */
  instant?: boolean;
  /** 图片解码完成回调（如高清图层就绪后触发滑入） */
  onLoad?: () => void;
}

/** 图片 / SVG：直连失败时自动带 token 重新拉取一次 */
function FileImage({
  file,
  src,
  alt,
  className,
  fallback = null,
  onError,
  authFirst = false,
  onImgEnter,
  onImgLeave,
  instant = false,
  onLoad,
}: FileImageProps) {
  const skipDirect =
    authFirst && !!src && !/^(data:|blob:)/i.test(src);
  const [current, setCurrent] = useState(skipDirect ? '' : src);
  const [dead, setDead] = useState(false);
  /** 图片真正解码完成后才显示，避免首帧出现浏览器自带的裂图占位 */
  const [loaded, setLoaded] = useState(false);
  const blobRef = useRef('');
  const retriedRef = useRef(false);

  /** 没有直连地址或直连失败时，带 token 拉一次原文件 */
  async function loadAuthorized(): Promise<void> {
    if (retriedRef.current) return;
    retriedRef.current = true;
    try {
      const blob = typedBlob(file, await fetchFileBlob(file));
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      blobRef.current = URL.createObjectURL(blob);
      setCurrent(blobRef.current);
      setDead(false);
      setLoaded(false);
    } catch {
      setDead(true);
      onError?.();
    }
  }

  useEffect(() => {
    const skip = authFirst && !!src && !/^(data:|blob:)/i.test(src);
    setCurrent(skip ? '' : src);
    setDead(false);
    setLoaded(false);
    retriedRef.current = false;
    // 授权文件没有公开地址时直接走带 token 的下载；SVG 首帧就跳过直连
    if (skip || (!src && fileKindOf(file) === 'image')) void loadAuthorized();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, file.id]);

  useEffect(
    () => () => {
      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
    },
    []
  );

  async function handleError() {
    // 只有图片 / SVG 值得带 token 重试；视频封面失败直接交给占位，避免整段视频白拉一次
    if (!retriedRef.current && fileKindOf(file) === 'image') {
      await loadAuthorized();
      return;
    }
    setDead(true);
    onError?.();
  }

  if (!current || dead) return <>{fallback}</>;
  return (
    <img
      src={current}
      alt={alt || file.name || '文件'}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={() => {
        setLoaded(true);
        onLoad?.();
      }}
      onError={() => void handleError()}
      onMouseEnter={(event) => onImgEnter?.(event.currentTarget)}
      onMouseLeave={() => onImgLeave?.()}
      className={className}
      style={{
        opacity: instant || loaded ? 1 : 0,
        transition: instant ? 'none' : 'opacity 160ms ease-out',
      }}
    />
  );
}

/** 视频 / 音频：优先流式直连，没有公开地址时带 token 拉 blob */
function useMediaSource(file: DevFile, directUrl: string, enabled = true) {
  const [authUrl, setAuthUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let revoked = '';
    let alive = true;
    setAuthUrl('');
    if (!enabled) {
      setLoading(false);
      return () => {};
    }
    if (directUrl) {
      setLoading(false);
      return () => {};
    }
    setLoading(true);
    fetchFileBlob(file)
      .then((blob) => {
        if (!alive) return;
        revoked = URL.createObjectURL(typedBlob(file, blob));
        setAuthUrl(revoked);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [file.id, directUrl, enabled]);

  return { src: directUrl || authUrl, loading };
}

function PlayerSpinner() {
  return (
    <div className="py-16 flex flex-col items-center gap-3 text-[#86868B]">
      <Loader2 className="w-6 h-6 animate-spin text-[#0071E3]" />
      <span className="text-[13px]">正在加载文件...</span>
    </div>
  );
}

function Unsupported() {
  return (
    <div className="py-12 text-center text-[13px] text-[#86868B]">
      该格式暂不支持在线预览，可通过下载查看
    </div>
  );
}

export interface FileMediaProps {
  file: DevFile;
  /** thumb：卡片封面；player：弹窗内完整预览 */
  variant?: 'thumb' | 'player';
  /** 调用方已解析好的封面地址（如缩略图），传了就不再自己取 */
  src?: string;
  alt?: string;
  className?: string;
  /** thumb 没有可显示画面 / 加载失败时的占位 */
  fallback?: ReactNode;
  /** 图片最终加载失败时通知调用方回退占位 */
  onError?: () => void;
  /** 图片有缩略图时，悬停让高清原图从底部滑出（替换原来的原位切换） */
  reveal?: boolean;
}

export function FileMedia({
  file,
  variant = 'thumb',
  src,
  alt,
  className = '',
  fallback = null,
  onError,
  reveal = false,
}: FileMediaProps) {
  const kind = fileKindOf(file);
  const isPlayer = variant === 'player';
  const original = toOpenUrl(file);
  // 卡片已传 src 时省掉一次缩略图请求
  const thumb = useFileThumbSrc(file, kind === 'image' ? original : '', !src);
  const direct = kind === 'video' || kind === 'audio' ? toStreamUrl(file) || original : original;
  /** 只有播放器、或没有直连地址的视频封面才需要带 token 拉流 */
  const needsStream = kind === 'video' || kind === 'audio';
  const needMedia = needsStream && (isPlayer || (kind === 'video' && !src));
  const media = useMediaSource(file, needMedia ? direct : '', needMedia);
  /** SVG 无论来自缩略图还是原文件，都可能拿到 octet-stream，统一走授权下载 */
  const isSvg = kind === 'image' && suffixOf(file) === 'svg';

  /** 鼠标悬停切到原图，移开还原缩略图：先预加载原图，加载完成后再切换，避免闪空 */
  const [hoverHighRes, setHoverHighRes] = useState(false);
  const [highResReady, setHighResReady] = useState(false);
  /** thumb 视频首帧加载失败：回收成占位，避免留一个黑框 */
  const [videoDead, setVideoDead] = useState(false);
  const hoveringRef = useRef(false);
  const highResLoadedRef = useRef(false);
  /** 高清原图从底部滑出：open 控制挂载，in 控制位移，loaded 记录是否已解码 */
  const [revealOpen, setRevealOpen] = useState(false);
  const [revealIn, setRevealIn] = useState(false);
  const [revealLoaded, setRevealLoaded] = useState(false);
  const revealTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setVideoDead(false);
    setRevealOpen(false);
    setRevealIn(false);
    setRevealLoaded(false);
  }, [file.id, src]);

  useEffect(
    () => () => {
      if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    },
    []
  );

  function openReveal() {
    if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    setRevealOpen(true);
    // 已加载过的高清图下一帧再滑入，避免和挂载同一帧导致没有过渡
    if (revealLoaded) window.requestAnimationFrame(() => setRevealIn(true));
  }

  function closeReveal() {
    setRevealIn(false);
    if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    revealTimerRef.current = window.setTimeout(() => setRevealOpen(false), 320);
  }

  function handleThumbEnter() {
    if (isPlayer || kind !== 'image' || !original) return;
    hoveringRef.current = true;
    if (highResLoadedRef.current) {
      setHoverHighRes(true);
      return;
    }
    // 预加载原图；授权地址预加载失败时交给 FileImage 自身的授权下载兜底
    const probe = new Image();
    probe.referrerPolicy = 'no-referrer';
    probe.onload = () => {
      highResLoadedRef.current = true;
      setHighResReady(true);
      if (hoveringRef.current) setHoverHighRes(true);
    };
    probe.onerror = () => {
      if (hoveringRef.current) setHoverHighRes(true);
    };
    probe.src = original;
  }

  function handleThumbLeave() {
    hoveringRef.current = false;
    setHoverHighRes(false);
  }

  if (!isPlayer) {
    if (kind === 'audio' || kind === 'other') return <>{fallback}</>;
    // 视频封面：静音渲染首帧，与图片卡片一样只出静态画面
    if (kind === 'video') {
      const videoSrc = src || media.src;
      if (!videoSrc || videoDead) return <>{fallback}</>;
      return (
        <video
          src={videoSrc}
          muted
          playsInline
          preload="metadata"
          className={className}
          aria-label={alt || file.name || '视频'}
          onError={() => {
            setVideoDead(true);
            onError?.();
          }}
        />
      );
    }
    const imageSrc = src ?? thumb;
    if (!imageSrc) return <>{fallback}</>;
    // 有缩略图时：高清原图悬停从底部滑出，不再原位切换/放大
    const canReveal = reveal && !!file.thumbnail && !!original && imageSrc !== original;
    if (canReveal) {
      return (
        <div
          className="relative w-full h-full overflow-hidden"
          onMouseEnter={openReveal}
          onMouseLeave={closeReveal}
        >
          <FileImage
            file={file}
            src={imageSrc}
            alt={alt}
            className={className}
            fallback={fallback}
            onError={onError}
            authFirst={isSvg || !src || imageSrc === original}
          />
          {/* 高清层容器常驻并预先停在底部，悬停时只切换位移，保证进场也有过渡 */}
          <div
            className={`pointer-events-none absolute inset-0 z-10 transition-transform duration-300 ease-out ${
              revealIn ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            {revealOpen && (
              <FileImage
                file={file}
                src={original}
                alt={alt}
                className={className}
                onLoad={() => {
                  setRevealLoaded(true);
                  window.requestAnimationFrame(() => {
                    window.requestAnimationFrame(() => setRevealIn(true));
                  });
                }}
                onError={() => setRevealIn(false)}
                authFirst
                instant
              />
            )}
          </div>
        </div>
      );
    }
    return (
      <FileImage
        file={file}
        src={hoverHighRes ? original : imageSrc}
        alt={alt}
        className={className}
        fallback={fallback}
        onError={onError}
        instant={highResReady}
        authFirst={hoverHighRes ? isSvg : isSvg || !src || imageSrc === original}
        onImgEnter={handleThumbEnter}
        onImgLeave={handleThumbLeave}
      />
    );
  }

  if (kind === 'video') {
    if (!media.src) return media.loading ? <PlayerSpinner /> : <Unsupported />;
    return (
      <div className="rounded-xl overflow-hidden bg-black">
        <video
          src={media.src}
          poster={thumb || undefined}
          controls
          autoPlay
          playsInline
          preload="metadata"
          className="w-full max-h-[65vh] bg-black"
        />
      </div>
    );
  }

  if (kind === 'audio') {
    return (
      <div className="py-10 flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#0071E3]/8 flex items-center justify-center text-[#0071E3] text-2xl">
          ♪
        </div>
        {media.src ? (
          <audio src={media.src} controls autoPlay className="w-full max-w-md" />
        ) : media.loading ? (
          <PlayerSpinner />
        ) : (
          <Unsupported />
        )}
      </div>
    );
  }

  if (kind === 'image') {
    return (
      <div className="flex justify-center rounded-xl bg-[#F5F5F7] p-3">
        <FileImage
          file={file}
          src={src ?? original}
          alt={alt}
          className={`max-w-full max-h-[65vh] object-contain rounded-lg ${className}`}
          fallback={<Unsupported />}
          onError={onError}
          authFirst={isSvg || !src || src === original}
        />
      </div>
    );
  }

  return <Unsupported />;
}
