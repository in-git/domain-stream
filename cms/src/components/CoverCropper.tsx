import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Cropper, { type Area } from 'react-easy-crop';
import { AlertCircle, Crop, Loader2, Minus, Plus, RotateCcw, X } from 'lucide-react';

interface CoverCropperProps {
  /** 待裁剪的原始文件；为 null 时不渲染 */
  file: File | null;
  /** 目标宽高比，文章封面为 16 / 9 */
  aspect?: number;
  /** 输出图片宽度（px），高度按比例自动计算 */
  outputWidth?: number;
  heading?: string;
  /** 确认按钮文案，默认「使用此封面」 */
  confirmText?: string;
  onCancel: () => void;
  /** 裁剪完成回调，返回 Promise 时会保持按钮 loading 直到完成 */
  onComplete: (file: File) => void | Promise<void>;
}

/** 把选中区域绘制到 canvas 并编码为 WebP 文件（react-easy-crop 官方推荐做法） */
export async function cropImageToFile(
  file: File,
  area: Area,
  options: { aspect?: number; outputWidth?: number; quality?: number } = {}
): Promise<File> {
  const aspect = options.aspect ?? 16 / 9;
  const outputWidth = Math.max(1, Math.round(options.outputWidth ?? 1440));
  const outputHeight = Math.round(outputWidth / aspect);

  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    throw new Error('当前浏览器不支持 Canvas 裁剪');
  }
  // 裁剪区域按原图边界收敛，避免浮点误差导致越界
  const sx = Math.max(0, Math.min(area.x, bitmap.width - 1));
  const sy = Math.max(0, Math.min(area.y, bitmap.height - 1));
  const sw = Math.max(1, Math.min(area.width, bitmap.width - sx));
  const sh = Math.max(1, Math.min(area.height, bitmap.height - sy));

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, outputWidth, outputHeight);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), 'image/webp', options.quality ?? 0.92)
  );
  if (!blob) throw new Error('封面裁剪失败，请重试');

  const baseName = file.name.replace(/\.[^/.]+$/, '') || 'cover';
  return new File([blob], `${baseName}-${outputWidth}x${outputHeight}.webp`, {
    type: 'image/webp',
  });
}

/** 把 1.7778 这类比例值还原成 16:9 这样的可读文案 */
function formatRatio(aspect: number): string {
  for (let h = 1; h <= 16; h++) {
    const w = aspect * h;
    if (Math.abs(w - Math.round(w)) < 0.001) return `${Math.round(w)}:${h}`;
  }
  return aspect.toFixed(2);
}

/**
 * 封面上传裁剪弹窗：固定比例（默认 16:9 横版）拖拽 + 滚轮/滑杆缩放。
 * 基于 react-easy-crop，触屏手势、边界约束、网格参考线开箱即用。
 */
export function CoverCropper({
  file,
  aspect = 16 / 9,
  outputWidth = 1440,
  heading,
  confirmText,
  onCancel,
  onComplete,
}: CoverCropperProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  // 文件变化时生成本地预览地址，切换/关闭时释放
  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedArea(null);
    setError('');
    return () => URL.revokeObjectURL(url);
  }, [file]);

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

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedArea(areaPixels);
  }, []);

  async function handleConfirm() {
    if (!file || !croppedArea || processing) return;
    setProcessing(true);
    setError('');
    try {
      const cropped = await cropImageToFile(file, croppedArea, { aspect, outputWidth });
      await onComplete(cropped);
    } catch (err) {
      setError(err instanceof Error ? err.message : '封面裁剪失败');
    } finally {
      setProcessing(false);
    }
  }

  if (!file || !imageSrc) return null;

  const ratioLabel = formatRatio(aspect);
  const sizeLabel = `${outputWidth} × ${Math.round(outputWidth / aspect)}`;

  return createPortal(
    // AiEditor 工具栏等内部浮层 z-index 最高到 1600，这里必须高于它，
    // 否则在文章编辑页打开裁剪弹窗时会被编辑器工具栏盖住
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label={heading || '裁剪封面'}
    >
      <div className="w-full max-w-[440px] bg-white rounded-2xl overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.3)] flex flex-col">
        <div className="px-5 py-3.5 border-b border-[#F2F2F7] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Crop className="w-4 h-4 text-[#0071E3] shrink-0" strokeWidth={1.8} />
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-[#1D1D1F] truncate">
                {heading || '裁剪封面'}
              </div>
              <div className="text-[11px] text-[#86868B] tabular-nums">
                比例 {ratioLabel} · 输出 {sizeLabel} WebP
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={cancel}
            disabled={processing}
            aria-label="关闭"
            className="w-7 h-7 rounded-lg text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] disabled:opacity-40 flex items-center justify-center shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="relative w-full h-[320px] bg-[#111113]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            minZoom={1}
            maxZoom={4}
            showGrid
            objectFit="contain"
            restrictPosition
            zoomWithScroll
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>

        <div className="px-5 py-3.5 space-y-3">
          <div className="flex items-center gap-2.5">
            <Minus className="w-3.5 h-3.5 text-[#86868B] shrink-0" />
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="缩放"
              className="flex-1 h-1 accent-[#0071E3] cursor-pointer"
            />
            <Plus className="w-3.5 h-3.5 text-[#86868B] shrink-0" />
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setCrop({ x: 0, y: 0 });
              }}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-lg bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[11px] font-medium text-[#6E6E73] shrink-0"
            >
              <RotateCcw className="w-3 h-3" />
              重置
            </button>
          </div>

          <p className="text-[11px] text-[#86868B]">
            拖动图片调整位置，滚轮或双指缩放；封面将按 {ratioLabel} 规格裁切。
          </p>

          {error && (
            <div className="flex items-start gap-1.5 rounded-lg bg-[#FF3B30]/8 px-2.5 py-1.5 text-[12px] text-[#D70015]">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-0.5">
            <button
              type="button"
              onClick={cancel}
              disabled={processing}
              className="h-9 px-4 rounded-xl bg-[#F5F5F7] hover:bg-[#E5E5EA] disabled:opacity-60 text-[13px] font-medium text-[#1D1D1F]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={processing || !croppedArea}
              className="h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] disabled:opacity-60 text-white text-[13px] font-medium inline-flex items-center gap-1.5"
            >
              {processing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {processing ? '正在处理...' : confirmText || '使用此封面'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
