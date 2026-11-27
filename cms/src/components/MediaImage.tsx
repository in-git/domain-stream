import { useEffect, useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface MediaImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  blankFallback?: boolean;
}

export function MediaImage({
  src,
  alt,
  className = '',
  fallbackLabel,
  blankFallback = false,
}: MediaImageProps) {
  const [failed, setFailed] = useState(false);

  // 切换图片（如封面替换、本地预览地址变更）后重置失败状态
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    if (blankFallback) {
      return (
        <div
          className={`bg-gradient-to-br from-[#F2F2F7] to-[#E5E5EA] select-none ${className}`}
          role="img"
          aria-label={alt}
        />
      );
    }
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F2F2F7] to-[#E5E5EA] text-[#86868B] select-none ${className}`}
        role="img"
        aria-label={alt}
      >
        <ImageIcon className="w-6 h-6 mb-1.5 opacity-60" strokeWidth={1.5} />
        {fallbackLabel && (
          <span className="text-[11px] font-medium px-3 text-center line-clamp-1">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
