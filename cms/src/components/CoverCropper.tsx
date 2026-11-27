import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  AlertCircle,
  Check,
  Crop as CropIcon,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react';

export interface CropRatio {
  /** 按钮主标题，如 9:16 竖屏 */
  label: string;
  /** 按钮副标题，说明常见用途 */
  description: string;
  /** 宽高比，宽 / 高；自由裁剪时仅作为初始比例 */
  aspect: number;
  /** 该比例下推荐输出宽度，高度按比例计算；自由裁剪时按原图实际裁剪尺寸输出 */
  outputWidth: number;
  /** 是否为自由裁剪：不会锁死输出比例 */
  free?: boolean;
}

/** 常见媒体比例预设，裁剪弹窗默认全部开放切换 */
export const MEDIA_CROP_RATIOS: CropRatio[] = [
  { label: '自由裁剪', description: '不锁定比例', aspect: 1, outputWidth: 0, free: true },
  { label: '9:16 竖屏', description: '短视频 / 图文卡片', aspect: 9 / 16, outputWidth: 1080 },
  { label: '16:9 横屏', description: '横版封面 / 视频', aspect: 16 / 9, outputWidth: 1440 },
  { label: '1:1 方形', description: '方图 / 社媒配图', aspect: 1, outputWidth: 1080 },
  { label: '4:3 横版', description: '文章配图 / 相册', aspect: 4 / 3, outputWidth: 1200 },
  { label: '3:4 竖版', description: '海报 / 详情页', aspect: 3 / 4, outputWidth: 1080 },
];

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CoverCropperProps {
  /** 待裁剪的原始文件；为 null 时不渲染 */
  file: File | null;
  /** 宽高比，支持 16 / 9 或 '16:9' 这类写法，默认 16 / 9 */
  aspect?: number | string;
  /** 初始输出图片宽度（px），高度按比例计算；预设比例有自己的推荐宽度 */
  outputWidth?: number;
  /** 可选比例；不传则使用 MEDIA_CROP_RATIOS */
  ratios?: CropRatio[];
  /** 是否显示比例切换面板 */
  showRatios?: boolean;
  /** 锁定比例：隐藏比例面板，裁剪框只能按 aspect 缩放 */
  lockRatio?: boolean;
  heading?: string;
  /** 确认按钮文案，默认「使用此图片」 */
  confirmText?: string;
  onCancel: () => void;
  /** 裁剪完成回调，返回 Promise 时会保持按钮 loading 直到完成 */
  onComplete: (file: File) => void | Promise<void>;
}

/** 把 16 / 9、'16:9'、'16/9' 统一解析成宽高比 */
export function parseCropAspect(value: number | string | undefined, fallback = 16 / 9): number {
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : fallback;
  const raw = (value || '').trim();
  if (!raw) return fallback;
  const parts = raw.split(/[:：/x×]/).map((part) => Number(part.trim()));
  if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) return parts[0] / parts[1];
  const numeric = Number(raw);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** 把选中区域绘制到 canvas 并编码为 WebP 文件 */
export async function cropImageToFile(
  file: File,
  area: CropArea,
  options: { aspect?: number; outputWidth?: number; quality?: number; free?: boolean } = {}
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const sx = Math.max(0, Math.min(area.x, bitmap.width - 1));
  const sy = Math.max(0, Math.min(area.y, bitmap.height - 1));
  const sw = Math.max(1, Math.min(area.width, bitmap.width - sx));
  const sh = Math.max(1, Math.min(area.height, bitmap.height - sy));

  // 自由裁剪按选中区域的原始像素导出，不按预设比例拉伸；
  // 固定比例继续按推荐宽度输出，保证多图尺寸统一。
  const outputWidth = options.free
    ? Math.max(1, Math.round(sw))
    : Math.max(1, Math.round(options.outputWidth ?? 1440));
  const outputHeight = options.free
    ? Math.max(1, Math.round(sh))
    : Math.round(outputWidth / (options.aspect ?? 16 / 9));

  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('当前浏览器不支持 Canvas 裁剪');
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/webp', options.quality ?? 0.92)
  );
  if (!blob) throw new Error('图片裁剪失败，请重试');

  const baseName = file.name.replace(/\.[^/.]+$/, '') || 'image';
  return new File([blob], `${baseName}-${outputWidth}x${outputHeight}.webp`, {
    type: 'image/webp',
  });
}

/** 把 0.5625 这类比例值还原成 9:16 这样的可读文案 */
function formatRatio(aspect: number): string {
  for (let h = 1; h <= 16; h++) {
    const w = aspect * h;
    if (Math.abs(w - Math.round(w)) < 0.001) return `${Math.round(w)}:${h}`;
  }
  return aspect.toFixed(2);
}

function resolveInitialRatio(
  aspect: number,
  outputWidth: number,
  ratios: CropRatio[]
): CropRatio {
  const matched = ratios.find(
    (ratio) => !ratio.free && Math.abs(ratio.aspect - aspect) < 0.001
  );
  if (matched) return matched;
  return {
    label: formatRatio(aspect),
    description: '自定义比例',
    aspect,
    outputWidth,
  };
}

/**
 * 通用媒体裁剪弹窗：内置 9:16 / 16:9 / 1:1 / 4:3 / 3:4 等常见比例，
 * 裁剪框支持直接拖拽移动与边角缩放，确认后输出 WebP 文件。
 */
export function CoverCropper({
  file,
  aspect = 16 / 9,
  outputWidth = 1440,
  ratios,
  showRatios = true,
  lockRatio = false,
  heading,
  confirmText,
  onCancel,
  onComplete,
}: CoverCropperProps) {
  const fixedAspect = useMemo(() => parseCropAspect(aspect), [aspect]);
  const ratioOptions = useMemo(
    () => (ratios && ratios.length > 0 ? ratios : MEDIA_CROP_RATIOS),
    [ratios]
  );

  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [activeRatio, setActiveRatio] = useState<CropRatio>(() =>
    resolveInitialRatio(fixedAspect, outputWidth, ratioOptions)
  );
  const [crop, setCrop] = useState<Crop | undefined>(undefined);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const [zoom, setZoom] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const imageRef = useRef<HTMLImageElement | null>(null);
  const naturalSizeRef = useRef({ width: 0, height: 0 });
  // 图片在 zoom=1 时的显示尺寸，作为缩放与坐标映射的基准
  const baseDisplayRef = useRef({ width: 0, height: 0 });
  // 用 ref 保存最新裁剪框与缩放值，供 wheel 事件（非 React 事件）读取，避免闭包拿到旧值
  const cropRef = useRef<PixelCrop | null>(null);
  const zoomRef = useRef(1);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const initializeCrop = useCallback((ratio: CropRatio) => {
    const base = baseDisplayRef.current;
    if (!base.width || !base.height) return;

    // 源图比例已与目标比例一致时铺满整图，避免默认 80% 裁掉边缘
    const sameAspect =
      !ratio.free && Math.abs(base.width / base.height - ratio.aspect) / ratio.aspect < 0.01;
    const initial: PixelCrop = ratio.free
      ? centerCrop(
          { unit: 'px', width: base.width * 0.7, height: base.height * 0.7 },
          base.width,
          base.height
        )
      : sameAspect
        ? { unit: 'px', x: 0, y: 0, width: base.width, height: base.height }
        : centerCrop(
            makeAspectCrop({ unit: 'px', width: base.width * 0.8 }, ratio.aspect, base.width, base.height),
            base.width,
            base.height
          );
    setZoom(1);
    zoomRef.current = 1;
    setCrop(initial);
    cropRef.current = initial;
    setCompletedCrop(initial);
  }, []);

  // 外部初始比例变化时同步到当前选中的比例
  useEffect(() => {
    setActiveRatio(resolveInitialRatio(fixedAspect, outputWidth, ratioOptions));
  }, [fixedAspect, outputWidth, ratioOptions]);

  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      imageRef.current = null;
      setCrop(undefined);
      cropRef.current = null;
      setCompletedCrop(null);
      setZoom(1);
      zoomRef.current = 1;
      baseDisplayRef.current = { width: 0, height: 0 };
      setError('');
      return;
    }
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCrop(undefined);
    cropRef.current = null;
    setCompletedCrop(null);
    setZoom(1);
    zoomRef.current = 1;
    baseDisplayRef.current = { width: 0, height: 0 };
    setError('');
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (imageRef.current) initializeCrop(activeRatio);
  }, [activeRatio, initializeCrop]);

  const cancel = useCallback(() => {
    if (processing) return;
    onCancel();
  }, [onCancel, processing]);

  // Esc 关闭
  useEffect(() => {
    if (!file) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cancel, file]);

  const handleImageLoad = useCallback(
    (img: HTMLImageElement) => {
      imageRef.current = img;
      naturalSizeRef.current = {
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      };
      // 此时 zoom=1，getBoundingClientRect 是图片未被缩放时的真实显示尺寸
      const rect = img.getBoundingClientRect();
      baseDisplayRef.current = { width: rect.width, height: rect.height };
      initializeCrop(activeRatio);
    },
    [activeRatio, initializeCrop]
  );

  const handleCropChange = useCallback((pixelCrop: PixelCrop) => {
    setCrop(pixelCrop);
    cropRef.current = pixelCrop;
    setCompletedCrop(pixelCrop);
  }, []);

  /** 真正缩放图片：图片按 zoom 放大，裁剪框同步等比调整，保持所选区域不变 */
  const applyZoom = useCallback((nextZoom: number) => {
    const next = clamp(nextZoom, 1, 4);
    const currentZoom = zoomRef.current;
    if (next === currentZoom) return;
    zoomRef.current = next;
    setZoom(next);

    const base = baseDisplayRef.current;
    const currentCrop = cropRef.current;
    if (!base.width || !base.height || !currentCrop) return;

    const ratio = next / currentZoom;
    // 上一轮缩放后的显示尺寸
    const displayWidth = base.width * currentZoom;
    const displayHeight = base.height * currentZoom;
    const centerX = displayWidth / 2;
    const centerY = displayHeight / 2;

    const width = clamp(currentCrop.width * ratio, 32, base.width * next);
    const height = clamp(currentCrop.height * ratio, 32, base.height * next);
    const scaled: PixelCrop = {
      unit: 'px',
      width,
      height,
      x: clamp(centerX + (currentCrop.x - centerX) * ratio, 0, base.width * next - width),
      y: clamp(centerY + (currentCrop.y - centerY) * ratio, 0, base.height * next - height),
    };
    cropRef.current = scaled;
    setCrop(scaled);
    setCompletedCrop(scaled);
  }, []);

  const selectRatio = useCallback(
    (ratio: CropRatio) => {
      const sameRatio = ratio.free
        ? !!activeRatio.free
        : !activeRatio.free && Math.abs(ratio.aspect - activeRatio.aspect) < 0.001;
      if (sameRatio) return;
      setActiveRatio(ratio);
      setError('');
    },
    [activeRatio.free, activeRatio.aspect]
  );

  // 鼠标滚轮缩放：必须用非 passive 监听才能 preventDefault，阻止弹窗背景滚动
  useEffect(() => {
    const viewport = viewportRef.current;
    // imageSrc 从 null 变为图片地址时才会挂载裁剪视口，必须把它放进依赖，
    // 否则监听器会在视口还没渲染时执行一次，之后永远不会再绑定
    if (!viewport || !file || !imageSrc) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY < 0 ? 0.1 : -0.1;
      applyZoom(zoomRef.current + delta);
    };
    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, [file, imageSrc, applyZoom]);

  /** 导出时把显示坐标系的裁剪框映射回原图像素坐标 */
  const getNaturalCrop = useCallback((): CropArea | null => {
    const natural = naturalSizeRef.current;
    const base = baseDisplayRef.current;
    if (!completedCrop || !natural.width || !natural.height || !base.width || !base.height) {
      return null;
    }
    const scaleX = natural.width / (base.width * zoomRef.current);
    const scaleY = natural.height / (base.height * zoomRef.current);
    return {
      x: completedCrop.x * scaleX,
      y: completedCrop.y * scaleY,
      width: completedCrop.width * scaleX,
      height: completedCrop.height * scaleY,
    };
  }, [completedCrop]);

  const resetCrop = useCallback(() => {
    initializeCrop(activeRatio);
  }, [activeRatio, initializeCrop]);

  async function handleConfirm() {
    if (!file || !completedCrop || processing) return;
    const naturalCrop = getNaturalCrop();
    if (!naturalCrop) return;
    setProcessing(true);
    setError('');
    try {
      const cropped = await cropImageToFile(file, naturalCrop, {
        aspect: activeRatio.aspect,
        outputWidth: activeRatio.outputWidth,
        free: activeRatio.free,
      });
      await onComplete(cropped);
    } catch (err) {
      setError(err instanceof Error ? err.message : '图片裁剪失败');
    } finally {
      setProcessing(false);
    }
  }

  if (!file || !imageSrc) return null;

  const ratioLabel = activeRatio.free ? '自由' : formatRatio(activeRatio.aspect);
  const sizeLabel = activeRatio.free
    ? completedCrop
      ? `${Math.round(completedCrop.width)} × ${Math.round(completedCrop.height)}`
      : '自由裁剪'
    : `${activeRatio.outputWidth} × ${Math.round(
        activeRatio.outputWidth / activeRatio.aspect
      )}`;

  return createPortal(
    <div
      data-cropper-root
      className="fixed inset-0 z-[100020] flex items-center justify-center bg-black/40 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) cancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={heading || '裁剪图片'}
        className="relative flex h-full max-h-[860px] w-full max-w-[1120px] flex-col overflow-hidden rounded-2xl border border-[#E5E5EA] bg-white text-[#1D1D1F] shadow-[0_24px_80px_rgba(0,0,0,0.28)]"
      >
        <header className="relative z-10 flex shrink-0 items-center justify-between gap-4 border-b border-[#F0F0F2] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F5F5F7] text-[#0071E3]">
              <CropIcon className="h-[18px] w-[18px]" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-[16px] font-semibold text-[#1D1D1F]">
                {heading || '裁剪图片'}
              </h2>
              <p className="mt-0.5 text-[11px] text-[#86868B]">
                拖动裁剪框选择区域，滚轮或滑杆缩放
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={cancel}
            disabled={processing}
            aria-label="关闭裁剪弹窗"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[#86868B] transition-colors hover:bg-[#F5F5F7] hover:text-[#1D1D1F] disabled:opacity-40"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </header>

        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
          <div className="relative h-[44vh] min-h-[280px] shrink-0 bg-[#F5F5F7] sm:h-[48vh] lg:h-auto lg:min-h-0 lg:flex-1">
            <div
              ref={viewportRef}
              className="flex h-full w-full items-center justify-center overflow-hidden p-3 sm:p-5"
              style={
                {
                  '--rc-border-color': '#FFFFFF',
                  '--rc-drag-handle-bg-colour': '#0071E3',
                  '--rc-drag-handle-size': '14px',
                  '--rc-focus-color': '#0071E3',
                } as CSSProperties
              }
            >
              <ReactCrop
                crop={crop}
                aspect={activeRatio.free ? undefined : activeRatio.aspect}
                onChange={handleCropChange}
                keepSelection
                minWidth={32}
                minHeight={32}
                ruleOfThirds
                className="max-h-full max-w-full"
                style={{ maxHeight: '100%', maxWidth: '100%' }}
              >
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="裁剪预览"
                  draggable={false}
                  onLoad={(event) => handleImageLoad(event.currentTarget)}
                  style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
                  className="block max-h-full max-w-full select-none object-contain"
                />
              </ReactCrop>
            </div>

            {processing && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-white/85 backdrop-blur-sm">
                <Loader2 className="h-7 w-7 animate-spin text-[#0071E3]" />
                <span className="text-[13px] font-medium text-[#6E6E73]">正在生成裁剪图片...</span>
              </div>
            )}
          </div>

          <aside className="w-full shrink-0 border-t border-[#F0F0F2] bg-[#FAFAFC] px-4 py-4 lg:w-[320px] lg:overflow-y-auto lg:border-l lg:border-t-0">
            {showRatios && !lockRatio && (
              <section className="mb-5 rounded-xl border border-[#E5E5EA] bg-white p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-[11px] text-[#86868B]">裁剪比例</h3>
                  <span className="rounded-md bg-[#F5F5F7] px-2 py-0.5 text-[11px] text-[#6E6E73]">
                    当前 {ratioLabel}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
                  {ratioOptions.map((ratio) => {
                    const active = ratio.free
                      ? !!activeRatio.free
                      : !activeRatio.free && Math.abs(ratio.aspect - activeRatio.aspect) < 0.001;
                    const previewStyle = ratio.free
                      ? { width: 24, height: 20, borderStyle: 'dashed' as const }
                      : ratio.aspect >= 1
                        ? { width: 26, height: 26 / ratio.aspect }
                        : { width: 26 * ratio.aspect, height: 26 };
                    return (
                      <button
                        key={`${ratio.label}-${ratio.aspect}-${ratio.free ? 'free' : 'fixed'}`}
                        type="button"
                        onClick={() => selectRatio(ratio)}
                        aria-pressed={active}
                        className={`group flex min-w-0 items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-colors ${
                          active
                            ? 'border-[#0071E3] bg-[#0071E3]/10'
                            : 'border-[#E5E5EA] bg-white hover:border-[#C7C7CC]'
                        }`}
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                          <span
                            style={previewStyle}
                            className={`rounded-[3px] border ${
                              active ? 'border-[#0071E3] bg-[#0071E3]/10' : 'border-[#C7C7CC] bg-white'
                            }`}
                          />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className={`block truncate text-[12px] font-medium ${
                              active ? 'text-[#0071E3]' : 'text-[#1D1D1F]'
                            }`}
                          >
                            {ratio.label}
                          </span>
                          <span className="block truncate text-[10px] text-[#86868B]">
                            {ratio.description}
                          </span>
                        </span>
                        {active && <Check className="h-3.5 w-3.5 shrink-0 text-[#0071E3]" />}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {lockRatio && (
              <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-[#E5E5EA] bg-white px-3 py-2.5">
                <span className="text-[11px] text-[#86868B]">固定比例</span>
                <span className="rounded-md bg-[#F5F5F7] px-2 py-0.5 text-[11px] text-[#6E6E73]">
                  {ratioLabel}
                </span>
              </div>
            )}

            <section className="mb-5 rounded-xl border border-[#E5E5EA] bg-white p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[11px] text-[#86868B]">缩放</h3>
                <span className="text-[12px] tabular-nums text-[#6E6E73]">{zoom.toFixed(2)}×</span>
              </div>
              <div className="flex items-center gap-3">
                <Minus className="h-3.5 w-3.5 shrink-0 text-[#86868B]" />
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => applyZoom(Number(e.target.value))}
                  aria-label="缩放"
                  className="h-1.5 flex-1 cursor-pointer accent-[#0071E3]"
                />
                <Plus className="h-3.5 w-3.5 shrink-0 text-[#86868B]" />
              </div>
              <button
                type="button"
                onClick={resetCrop}
                className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D2D2D7] bg-white px-2.5 text-[12px] text-[#1D1D1F] transition-colors hover:border-[#0071E3] hover:text-[#0071E3]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                重置位置与缩放
              </button>
            </section>

            <div className="rounded-lg border border-[#E5E5EA] bg-white px-3 py-2 text-[11px] text-[#86868B]">
              {sizeLabel} px · WebP
            </div>

            {error && (
              <div className="mt-3 flex items-start gap-1.5 rounded-lg border border-[#FFCCC7] bg-[#FFF1F0] px-3 py-2 text-[12px] text-[#CF1322]">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </aside>
        </div>

        <footer className="relative z-10 flex shrink-0 justify-end border-t border-[#F0F0F2] bg-white px-5 py-4">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={cancel}
              disabled={processing}
              className="h-10 rounded-xl border border-[#D2D2D7] bg-white px-5 text-[13px] text-[#1D1D1F] transition-colors hover:border-[#0071E3] hover:text-[#0071E3] disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={processing || !completedCrop}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0071E3] px-5 text-[13px] font-medium text-white transition-colors hover:bg-[#0077ED] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {processing && <Loader2 className="h-4 w-4 animate-spin" />}
              {processing ? '正在处理...' : confirmText || '使用此图片'}
            </button>
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}

/** 语义化别名：图片裁剪能力同时可用于封面与图文内容 */
export const MediaCropper = CoverCropper;
