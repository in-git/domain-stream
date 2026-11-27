/**
 * 视频剪辑弹窗（剪映风格）
 * ------------------------------------------------------------------
 * 深色编辑器：上方预览 + 右侧参数面板，底部时间轴轨道（播放头 + 起止把手），
 * 覆盖三种能力：画面裁剪、调整时长（掐头去尾）、压缩（分辨率档位 + CRF）。
 *
 * 执行走 ffmpeg.wasm（ffmpegClient.ts），产物作为新文件上传素材库，
 * 由调用方把新地址回填到视频记录，原文件不覆盖。
 *
 * 用法：
 *   <VideoEditorModal
 *     open={open}
 *     item={editingVideo}
 *     onClose={() => setEditingVideo(null)}
 *     onApplied={handleApplied}   // (newUrl) => Promise<void>
 *   />
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  Sparkles,
  Timer,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { toPlayableVideoUrl, uploadLibraryFile } from '../../lib/fileCenter';
import {
  cancelVideoEdit,
  MAX_INPUT_BYTES,
  preloadFFmpeg,
  runVideoEdit,
  type VideoCropRect,
} from '../../lib/ffmpegClient';

const ACCENT = '#0071E3';

/** 裁剪比例锁定 */
type CropLock = 'free' | '16:9' | '9:16' | '1:1';

/** 压缩档位 */
type CompressPreset = 'raw' | '1080' | '720' | '480';

const COMPRESS_PRESETS: Array<{
  value: CompressPreset;
  label: string;
  hint: string;
  height: number | null;
  crf: number;
}> = [
  { value: 'raw', label: '原画质', hint: '不缩放 · CRF 18', height: null, crf: 18 },
  { value: '1080', label: '高清', hint: '1080p · CRF 23', height: 1080, crf: 23 },
  { value: '720', label: '标准', hint: '720p · CRF 26', height: 720, crf: 26 },
  { value: '480', label: '流畅', hint: '480p · CRF 28', height: 480, crf: 28 },
];

/** 裁剪框状态：画面占比坐标 0~1 */
interface CropFrac {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const FULL_CROP: CropFrac = { x0: 0, y0: 0, x1: 1, y1: 1 };

function isFullCrop(frac: CropFrac): boolean {
  return (
    frac.x0 < 0.002 && frac.y0 < 0.002 && frac.x1 > 0.998 && frac.y1 > 0.998
  );
}

function formatClock(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = safe - m * 60;
  return `${String(m).padStart(2, '0')}:${s < 10 ? '0' : ''}${s.toFixed(1)}`;
}

interface VideoEditorModalProps {
  open: boolean;
  /** 视频源：远端地址或本地 blob: 预览地址均可 */
  item: { title?: string; videoUrl: string } | null;
  onClose: () => void;
  /** 产物上传完成后回调（新素材 URL），由调用方回填视频记录 */
  onApplied: (newUrl: string) => Promise<void> | void;
}

type Phase = 'editing' | 'processing' | 'uploading' | 'done';

export function VideoEditorModal({ open, item, onClose, onApplied }: VideoEditorModalProps) {
  /** 源文件二进制：打开时一次性拉到内存，处理时直接喂给 wasm */
  const [sourceBlob, setSourceBlob] = useState<Blob | null>(null);
  const [loadError, setLoadError] = useState('');
  /** 视频元信息 */
  const [meta, setMeta] = useState<{ width: number; height: number; duration: number } | null>(null);
  const [phase, setPhase] = useState<Phase>('editing');
  const [progress, setProgress] = useState(0);
  const [stageText, setStageText] = useState('');
  const [error, setError] = useState('');

  /** 裁剪（占比坐标）与比例锁 */
  const [cropFrac, setCropFrac] = useState<CropFrac>(FULL_CROP);
  const [cropLock, setCropLock] = useState<CropLock>('free');
  /** 时长掐取（秒） */
  const [trim, setTrim] = useState<{ start: number; end: number }>({ start: 0, end: 0 });
  /** 压缩档位与音轨 */
  const [preset, setPreset] = useState<CompressPreset>('720');
  const [removeAudio, setRemoveAudio] = useState(false);
  /** 播放状态与播放头 */
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewBoxRef = useRef<HTMLDivElement | null>(null);
  /** 拖拽中的把手信息：起点 + 触发的把手 */
  const dragRef = useRef<{ kind: 'move' | 'resize'; corner: string; startFrac: CropFrac; px: number; py: number } | null>(null);
  const trimDragRef = useRef<{ kind: 'start' | 'end' | 'seek'; startX: number; startTrim: { start: number; end: number } } | null>(null);
  /** 视频可拖动的流式地址 */
  const streamUrl = useMemo(() => {
    if (!open || !item?.videoUrl) return '';
    return toPlayableVideoUrl(item.videoUrl) || item.videoUrl;
  }, [open, item?.videoUrl]);

  // 打开时拉取源文件 + 预热 ffmpeg wasm
  useEffect(() => {
    if (!open || !item?.videoUrl) return;
    setPhase('editing');
    setProgress(0);
    setError('');
    setLoadError('');
    setSourceBlob(null);
    setMeta(null);
    setCropFrac(FULL_CROP);
    setTrim({ start: 0, end: 0 });
    setPreset('720');
    setRemoveAudio(false);
    setCurrentTime(0);
    setPlaying(false);
    void preloadFFmpeg().catch(() => undefined);
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(streamUrl);
        if (!response.ok) throw new Error(`视频加载失败 (${response.status})`);
        const blob = await response.blob();
        if (cancelled) return;
        if (blob.size > MAX_INPUT_BYTES) {
          setLoadError(`视频约 ${(blob.size / 1024 / 1024).toFixed(0)}MB，超过浏览器本地处理上限（200MB），请先压缩后再剪辑`);
          return;
        }
        setSourceBlob(blob);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : '视频加载失败');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.videoUrl]);

  /** 压缩档位换算：目标高度不超过原片高度（只缩不放），CRF 随档位 */
  const activePreset = COMPRESS_PRESETS.find((item) => item.value === preset) ?? COMPRESS_PRESETS[2];
  const targetHeight = useMemo(() => {
    if (!meta || activePreset.height == null) return null;
    return Math.min(activePreset.height, meta.height);
  }, [meta, activePreset]);

  /** 预估输出大小：按档位粗估码率 × 保留时长（仅供决策参考） */
  const estimateMb = useMemo(() => {
    if (!meta) return null;
    const dur = Math.max(0.5, (trim.end || meta.duration) - trim.start);
    if (activePreset.height == null) {
      // 原画质重编码，粗估为原大小 × (保留时长占比) × 0.9
      return (dur / Math.max(1, meta.duration)) * (sourceBlob ? sourceBlob.size / 1024 / 1024 : 0) * 0.9;
    }
    const target = Math.min(activePreset.height, meta.height);
    const bitrateMbps = Math.pow(target / 720, 1.5) * (activePreset.crf <= 23 ? 6 : activePreset.crf <= 26 ? 3.5 : 2);
    return (bitrateMbps * dur) / 8;
  }, [meta, trim, activePreset, sourceBlob]);

  const duration = meta?.duration ?? 0;
  const trimEnd = trim.end || duration;

  /** 裁剪框 → 视频像素（导出参数） */
  function toPixelCrop(): VideoCropRect | null {
    if (!meta || isFullCrop(cropFrac)) return null;
    const x = cropFrac.x0 * meta.width;
    const y = cropFrac.y0 * meta.height;
    return {
      x,
      y,
      width: cropFrac.x1 * meta.width - x,
      height: cropFrac.y1 * meta.height - y,
    };
  }

  /** 比例锁：把新框按像素比例修正（在拖拽结束时调用一次即可） */
  function applyLock(next: CropFrac): CropFrac {
    if (!meta || cropLock === 'free') return next;
    const ratio =
      cropLock === '16:9' ? 16 / 9 : cropLock === '9:16' ? 9 / 16 : 1;
    // 占比坐标下的等比：像素宽高比固定 → fracW * videoW / (fracH * videoH) = ratio
    const width = Math.max(0.02, next.x1 - next.x0);
    const height = Math.max(0.02, next.y1 - next.y0);
    const fracRatio = (width * meta.width) / (height * meta.height);
    if (Math.abs(fracRatio - ratio) < 0.02) return next;
    // 以宽度为基准修正高度，超出画面时改为以高度修正宽度
    const fitHeight = (width * meta.width) / ratio / meta.height;
    if (next.y0 + fitHeight <= 1) return { ...next, y1: next.y0 + fitHeight };
    const fitWidth = ((next.y1 - next.y0) * ratio * meta.height) / meta.width;
    return { ...next, x1: Math.min(1, next.x0 + fitWidth) };
  }

  /** 裁剪框拖拽（pointer events，覆盖移动与四角缩放） */
  function onCropPointerDown(event: React.PointerEvent, kind: 'move' | 'resize', corner = '') {
    if (phase !== 'editing' || !meta) return;
    event.preventDefault();
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    dragRef.current = { kind, corner, startFrac: cropFrac, px: event.clientX, py: event.clientY };
  }

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const drag = dragRef.current;
      const box = previewBoxRef.current;
      if (!drag || !box) return;
      const rect = box.getBoundingClientRect();
      const dx = (event.clientX - drag.px) / rect.width;
      const dy = (event.clientY - drag.py) / rect.height;
      const s = drag.startFrac;
      const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
      let next: CropFrac;
      if (drag.kind === 'move') {
        const w = s.x1 - s.x0;
        const h = s.y1 - s.y0;
        const x0 = clamp01(Math.min(Math.max(s.x0 + dx, 0), 1 - w));
        const y0 = clamp01(Math.min(Math.max(s.y0 + dy, 0), 1 - h));
        next = { x0, y0, x1: x0 + w, y1: y0 + h };
      } else {
        const corner = drag.corner;
        let x0 = s.x0;
        let y0 = s.y0;
        let x1 = s.x1;
        let y1 = s.y1;
        if (corner.includes('w')) x0 = clamp01(Math.min(s.x0 + dx, s.x1 - 0.05));
        if (corner.includes('e')) x1 = clamp01(Math.max(s.x1 + dx, s.x0 + 0.05));
        if (corner.includes('n')) y0 = clamp01(Math.min(s.y0 + dy, s.y1 - 0.05));
        if (corner.includes('s')) y1 = clamp01(Math.max(s.y1 + dy, s.y0 + 0.05));
        next = applyLock({ x0, y0, x1, y1 });
      }
      setCropFrac(next);
    }
    function onUp() {
      dragRef.current = null;
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta, cropLock]);

  /** 时间轴拖拽（起止把手 + 点按定位） */
  function onTrimPointerDown(event: React.PointerEvent, kind: 'start' | 'end' | 'seek') {
    if (phase !== 'editing' || !duration) return;
    event.preventDefault();
    event.stopPropagation();
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    trimDragRef.current = { kind, startX: event.clientX, startTrim: trim };
    if (kind === 'seek') seekToClientX(event.clientX);
  }

  function seekToClientX(clientX: number) {
    const track = document.getElementById('ve-trim-track');
    const video = videoRef.current;
    if (!track || !video || !duration) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const target = ratio * duration;
    video.currentTime = target;
    setCurrentTime(target);
  }

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const drag = trimDragRef.current;
      const track = document.getElementById('ve-trim-track');
      if (!drag || !track || !duration) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const minGap = 0.2;
      if (drag.kind === 'start') {
        setTrim({ start: Math.min(ratio * duration, drag.startTrim.end - minGap), end: drag.startTrim.end });
      } else if (drag.kind === 'end') {
        setTrim({ start: drag.startTrim.start, end: Math.max(ratio * duration, drag.startTrim.start + minGap) });
      } else {
        seekToClientX(event.clientX);
      }
    }
    function onUp() {
      trimDragRef.current = null;
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, trim]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  }

  /** 执行：本地 ffmpeg 处理 → 上传素材库 → 回填 */
  async function handleGenerate() {
    if (!sourceBlob || !meta || !item) return;
    setError('');
    setPhase('processing');
    setProgress(0);
    setStageText('正在加载处理引擎…（首次约 30MB）');
    try {
      const blob = await runVideoEdit(
        { blob: sourceBlob, videoWidth: meta.width, videoHeight: meta.height, duration: meta.duration },
        {
          crop: toPixelCrop(),
          trimStart: trim.start,
          trimEnd: trimEnd < meta.duration - 0.05 ? trimEnd : null,
          scaleHeight: targetHeight,
          crf: activePreset.crf,
          removeAudio,
          onProgress: (ratio) => {
            setStageText('本地处理中（裁剪 · 时长 · 压缩）');
            setProgress(ratio);
          },
        }
      );
      setPhase('uploading');
      setProgress(0);
      setStageText('正在上传新文件到素材库…');
      const baseName = (item.title || 'video').replace(/[\\/:*?"<>|]/g, '_').slice(0, 60) || 'video';
      const file = new File([blob], `${baseName}-edited.mp4`, { type: 'video/mp4' });
      const { url } = await uploadLibraryFile(file, 'MATERIAL', (percent) => setProgress(percent / 100));
      setPhase('done');
      setStageText('完成');
      await onApplied(url);
      onClose();
    } catch (err) {
      setPhase('editing');
      setError(err instanceof Error ? err.message : '处理失败，请重试');
    }
  }

  function handleCancel() {
    cancelVideoEdit();
    setPhase('editing');
    setProgress(0);
    setStageText('');
  }

  const cropPixel = useMemo(() => {
    if (!meta) return null;
    return {
      x: Math.round(cropFrac.x0 * meta.width),
      y: Math.round(cropFrac.y0 * meta.height),
      width: Math.round((cropFrac.x1 - cropFrac.x0) * meta.width),
      height: Math.round((cropFrac.y1 - cropFrac.y0) * meta.height),
    };
  }, [meta, cropFrac]);

  const busy = phase === 'processing' || phase === 'uploading';
  const cropBoxStyle = useMemo(
    () => ({
      left: `${cropFrac.x0 * 100}%`,
      top: `${cropFrac.y0 * 100}%`,
      width: `${(cropFrac.x1 - cropFrac.x0) * 100}%`,
      height: `${(cropFrac.y1 - cropFrac.y0) * 100}%`,
    }),
    [cropFrac]
  );

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-[100020] flex items-center justify-center bg-black/70 p-4">
      <div className="relative flex h-full max-h-[92vh] w-full max-w-[1280px] flex-col overflow-hidden rounded-2xl border border-[#313135] bg-[#161618] text-[#E8E8ED] shadow-[0_40px_120px_rgba(0,0,0,0.7)]">
        {/* 头部 */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#2A2A2E] px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Scissors className="h-4 w-4" style={{ color: ACCENT }} />
            <span className="truncate text-[14px] font-semibold">{item.title || '视频剪辑'}</span>
            <span className="shrink-0 rounded-md bg-[#2A2A2E] px-1.5 py-0.5 text-[10px] text-[#98989F]">剪映风格 · 本地处理</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="关闭"
            className="rounded-lg p-1.5 text-[#98989F] transition-colors hover:bg-[#2A2A2E] hover:text-white disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 中部：预览 + 参数面板 */}
        <div className="flex min-h-0 flex-1">
          {/* 预览区 */}
          <div className="flex min-w-0 flex-1 flex-col bg-[#0F0F10]">
            <div className="flex min-h-0 flex-1 items-center justify-center p-4">
              {loadError ? (
                <p className="max-w-[420px] text-center text-[13px] leading-relaxed text-[#FF6B6B]">{loadError}</p>
              ) : !sourceBlob ? (
                <div className="flex items-center gap-2 text-[13px] text-[#98989F]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在加载视频…
                </div>
              ) : (
                <div
                  ref={previewBoxRef}
                  className="relative max-h-full"
                  style={{ aspectRatio: meta ? `${meta.width} / ${meta.height}` : '16 / 9', maxWidth: '100%', height: '100%' }}
                >
                  <video
                    ref={videoRef}
                    src={streamUrl}
                    className="h-full w-full object-contain"
                    onLoadedMetadata={(event) => {
                      const el = event.currentTarget;
                      setMeta({ width: el.videoWidth, height: el.videoHeight, duration: el.duration });
                      setTrim({ start: 0, end: el.duration });
                    }}
                    onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                    onPlay={() => setPlaying(true)}
                    onPause={() => setPlaying(false)}
                    playsInline
                    preload="metadata"
                  />
                  {/* 裁剪框：遮罩 + 可拖拽选区 */}
                  {meta && (
                    <>
                      <div className="pointer-events-none absolute inset-0 bg-black/45" style={{ clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${cropFrac.x0 * 100}% ${cropFrac.y0 * 100}%, ${cropFrac.x0 * 100}% ${cropFrac.y1 * 100}%, ${cropFrac.x1 * 100}% ${cropFrac.y1 * 100}%, ${cropFrac.x1 * 100}% ${cropFrac.y0 * 100}%, ${cropFrac.x0 * 100}% ${cropFrac.y0 * 100}%)` }} />
                      <div
                        className="absolute cursor-move border border-white/90"
                        style={cropBoxStyle}
                        onPointerDown={(event) => onCropPointerDown(event, 'move')}
                      >
                        {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                          <span
                            key={corner}
                            onPointerDown={(event) => onCropPointerDown(event, 'resize', corner)}
                            className={`absolute h-3.5 w-3.5 border-2 border-white bg-black/30 ${
                              corner === 'nw' ? '-left-1.5 -top-1.5 cursor-nwse-resize'
                              : corner === 'ne' ? '-right-1.5 -top-1.5 cursor-nesw-resize'
                              : corner === 'sw' ? '-left-1.5 -bottom-1.5 cursor-nesw-resize'
                              : '-right-1.5 -bottom-1.5 cursor-nwse-resize'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* 底部时间轴（剪映轨道风） */}
            <div className="shrink-0 border-t border-[#2A2A2E] bg-[#1B1B1E] px-4 py-3">
              <div className="mb-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={!sourceBlob}
                  aria-label={playing ? '暂停' : '播放'}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#161618] transition-colors hover:bg-[#E8E8ED] disabled:opacity-40"
                >
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
                </button>
                <span className="font-mono text-[12px] tabular-nums text-[#98989F]">
                  {formatClock(currentTime)} / {formatClock(duration)}
                </span>
                <span className="ml-auto text-[11px] text-[#98989F]">
                  保留片段 {formatClock(trim.start)} → {formatClock(trimEnd)}（{formatClock(Math.max(0.2, trimEnd - trim.start))}）
                </span>
              </div>
              <div
                id="ve-trim-track"
                className="relative h-14 cursor-pointer select-none overflow-hidden rounded-lg border border-[#2A2A2E] bg-[#232326]"
                onPointerDown={(event) => onTrimPointerDown(event, 'seek')}
              >
                {/* 刻度 */}
                {duration > 0 &&
                  Array.from({ length: 11 }, (_, index) => index / 10).map((ratio) => (
                    <div
                      key={ratio}
                      className="absolute top-0 bottom-0 border-l border-[#313135]"
                      style={{ left: `${ratio * 100}%` }}
                    >
                      <span className="absolute top-0.5 left-1 font-mono text-[9px] text-[#5A5A61]">
                        {formatClock(ratio * duration)}
                      </span>
                    </div>
                  ))}
                {/* 保留片段高亮 */}
                {duration > 0 && (
                  <div
                    className="absolute inset-y-0 border-x-2 bg-white/10"
                    style={{ left: `${(trim.start / duration) * 100}%`, width: `${((trimEnd - trim.start) / duration) * 100}%`, borderColor: ACCENT }}
                  >
                    {/* 起止把手 */}
                    <span
                      onPointerDown={(event) => onTrimPointerDown(event, 'start')}
                      title="起点"
                      className="absolute -left-2 top-1/2 h-8 w-4 -translate-y-1/2 cursor-ew-resize rounded-md border-2 bg-[#161618]"
                      style={{ borderColor: ACCENT }}
                    />
                    <span
                      onPointerDown={(event) => onTrimPointerDown(event, 'end')}
                      title="终点"
                      className="absolute -right-2 top-1/2 h-8 w-4 -translate-y-1/2 cursor-ew-resize rounded-md border-2 bg-[#161618]"
                      style={{ borderColor: ACCENT }}
                    />
                  </div>
                )}
                {/* 播放头 */}
                {duration > 0 && (
                  <div
                    className="pointer-events-none absolute inset-y-0 w-0.5 bg-white"
                    style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 右侧参数面板 */}
          <div className="flex w-[268px] shrink-0 flex-col gap-4 overflow-y-auto border-l border-[#2A2A2E] bg-[#1B1B1E] p-4">
            {/* 裁剪 */}
            <section>
              <header className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-white">
                <Scissors className="h-3.5 w-3.5" style={{ color: ACCENT }} />
                画面裁剪
              </header>
              <div className="mb-2 flex gap-1">
                {(
                  [
                    { value: 'free', label: '自由' },
                    { value: '16:9', label: '16:9' },
                    { value: '9:16', label: '9:16' },
                    { value: '1:1', label: '1:1' },
                  ] as Array<{ value: CropLock; label: string }>
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setCropLock(option.value)}
                    className={`h-7 flex-1 rounded-md text-[11px] transition-colors ${
                      cropLock === option.value ? 'text-white' : 'text-[#98989F] hover:text-white'
                    }`}
                    style={cropLock === option.value ? { background: ACCENT } : { background: '#2A2A2E' }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#98989F]">
                <span className="font-mono tabular-nums">
                  {cropPixel ? `${cropPixel.width} × ${cropPixel.height} @ (${cropPixel.x}, ${cropPixel.y})` : '全画面'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCropFrac(FULL_CROP);
                    setCropLock('free');
                  }}
                  className="flex items-center gap-1 text-[11px] text-[#98989F] transition-colors hover:text-white"
                >
                  <RotateCcw className="h-3 w-3" />
                  重置
                </button>
              </div>
            </section>

            {/* 时长 */}
            <section>
              <header className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-white">
                <Timer className="h-3.5 w-3.5" style={{ color: ACCENT }} />
                保留时长
              </header>
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-[10.5px] text-[#98989F]">起点（秒）</span>
                  <input
                    type="number"
                    min={0}
                    max={duration}
                    step={0.1}
                    value={Number(trim.start.toFixed(1))}
                    onChange={(event) => {
                      const start = Math.max(0, Math.min(Number(event.target.value) || 0, trimEnd - 0.2));
                      setTrim({ start, end: trim.end || duration });
                    }}
                    className="h-8 w-full rounded-lg border border-[#313135] bg-[#232326] px-2 text-[12px] text-white outline-none focus:border-[#0071E3]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10.5px] text-[#98989F]">终点（秒）</span>
                  <input
                    type="number"
                    min={0}
                    max={duration}
                    step={0.1}
                    value={Number(trimEnd.toFixed(1))}
                    onChange={(event) => {
                      const end = Math.min(duration || Number(event.target.value) || 0, Math.max(Number(event.target.value) || 0, trim.start + 0.2));
                      setTrim({ start: trim.start, end });
                    }}
                    className="h-8 w-full rounded-lg border border-[#313135] bg-[#232326] px-2 text-[12px] text-white outline-none focus:border-[#0071E3]"
                  />
                </label>
              </div>
            </section>

            {/* 压缩 */}
            <section>
              <header className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-white">
                <Sparkles className="h-3.5 w-3.5" style={{ color: ACCENT }} />
                压缩
              </header>
              <div className="flex flex-col gap-1">
                {COMPRESS_PRESETS.map((option) => {
                  const active = preset === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setPreset(option.value)}
                      className={`flex h-9 items-center gap-2 rounded-lg px-2.5 text-left text-[12px] transition-colors ${
                        active ? 'text-white' : 'text-[#98989F] hover:text-white'
                      }`}
                      style={{ background: active ? ACCENT : '#2A2A2E' }}
                    >
                      <Check className={`h-3.5 w-3.5 shrink-0 ${active ? 'opacity-100' : 'opacity-0'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium leading-none">{option.label}</span>
                        <span className={`mt-0.5 block text-[10px] leading-none ${active ? 'text-white/75' : 'text-[#5A5A61]'}`}>
                          {option.hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setRemoveAudio((value) => !value)}
                className="mt-2 flex h-8 w-full items-center gap-2 rounded-lg bg-[#2A2A2E] px-2.5 text-[12px] text-[#98989F] transition-colors hover:text-white"
              >
                {removeAudio ? <VolumeX className="h-3.5 w-3.5" style={{ color: ACCENT }} /> : <Volume2 className="h-3.5 w-3.5" />}
                {removeAudio ? '已去掉音轨' : '保留原声'}
              </button>
            </section>

            {/* 执行 */}
            <div className="mt-auto flex flex-col gap-2">
              {estimateMb != null && (
                <p className="text-center text-[11px] text-[#98989F]">预估输出约 {estimateMb < 0.1 ? '<0.1' : estimateMb.toFixed(1)} MB</p>
              )}
              {error && <p className="text-[11px] leading-relaxed text-[#FF6B6B]">{error}</p>}
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={!sourceBlob || busy}
                className="h-10 rounded-xl text-[13px] font-medium text-white transition-opacity disabled:opacity-40"
                style={{ background: ACCENT }}
              >
                {busy ? '处理中…' : '生成并应用'}
              </button>
              <p className="text-center text-[10px] leading-relaxed text-[#5A5A61]">
                浏览器本地处理，产出新文件上传素材库，原视频不覆盖
              </p>
            </div>
          </div>
        </div>

        {/* 处理进度浮层 */}
        {busy && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/75">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
            <p className="text-[13px] text-white">{stageText}</p>
            <div className="h-2 w-72 overflow-hidden rounded-full bg-[#2A2A2E]">
              <div
                className="h-full rounded-full transition-[width] duration-200"
                style={{ width: `${Math.round(progress * 100)}%`, background: ACCENT }}
              />
            </div>
            <span className="font-mono text-[12px] tabular-nums text-[#98989F]">{Math.round(progress * 100)}%</span>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-[#313135] px-3 py-1.5 text-[12px] text-[#98989F] transition-colors hover:text-white"
            >
              取消
            </button>
            <p className="text-[10px] text-[#5A5A61]">处理期间请勿关闭窗口</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoEditorModal;
