import { useEffect, useRef, useState } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { captureFrameFromVideo } from '../../../lib/videoDrop.ts';

interface VideoCoverCaptureModalProps {
  open: boolean;
  videoUrl: string;
  title?: string;
  onClose: () => void;
  /** 返回当前帧 JPEG 文件，由调用方决定是否转 WebP 并写回业务数据 */
  onCapture: (file: File) => void | Promise<void>;
}

/** 播放视频并截取当前帧作为封面，供批量上传复用 */
export function VideoCoverCaptureModal({
  open,
  videoUrl,
  title,
  onClose,
  onCapture,
}: VideoCoverCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setCapturing(false);
    }
  }, [open, videoUrl]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  async function handleCapture() {
    const video = videoRef.current;
    if (!video) return;
    setCapturing(true);
    setError('');
    try {
      const blob = await captureFrameFromVideo(video);
      const file = new File([blob], `video-frame-${Date.now()}.jpg`, { type: 'image/jpeg' });
      await onCapture(file);
    } catch (err) {
      const message =
        err instanceof Error && err.name === 'SecurityError'
          ? '视频源不允许截取画面，请换一个本地视频'
          : err instanceof Error
            ? err.message
            : '截取封面失败';
      setError(message);
    } finally {
      setCapturing(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="获取视频封面"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#1C1C1E]">
        <div className="flex items-center justify-between gap-3 border-b border-[#E5E5EA] px-5 py-3.5 dark:border-white/10">
          <div className="min-w-0">
            <div className="text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">获取视频封面</div>
            {title && <div className="mt-0.5 truncate text-[12px] text-[#86868B]">{title}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#86868B] transition-colors hover:bg-[#F2F2F7] dark:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="relative aspect-video overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              playsInline
              className="h-full w-full object-contain"
            />
          </div>
          <p className="mt-3 text-[12px] text-[#86868B]">
            播放视频到合适画面后点击截取，封面将自动转换并替换当前封面。
          </p>
          {error && <div className="mt-2 text-[12px] text-[#D70015]">{error}</div>}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#E5E5EA] bg-[#FAFAFC] px-5 py-3.5 dark:border-white/10 dark:bg-[#171719]">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-xl border border-[#D2D2D7] px-4 text-[13px] text-[#1D1D1F] dark:border-white/20 dark:text-[#F5F5F7]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void handleCapture()}
            disabled={capturing || !videoUrl}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[#0071E3] px-4 text-[13px] font-medium text-white disabled:opacity-50"
          >
            {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            {capturing ? '截取中…' : '截取当前帧'}
          </button>
        </div>
      </div>
    </div>
  );
}
