import { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
  priority?: boolean;
  /** 是否允许浏览器原生拖拽图片（默认禁用，避免与自定义滑动冲突） */
  draggable?: boolean;
  /** 是否响应指针事件（轮播场景常设为 false，交给父级统一处理） */
  interactive?: boolean;
  /** 图片填充方式：cover 裁切铺满，contain 完整显示（默认 cover） */
  fit?: 'cover' | 'contain';
  /** 图片加载占位背景，暗色场景可传入黑色避免闪白 */
  placeholderClassName?: string;
  /** 图片加载失败时的兜底背景 */
  fallbackClassName?: string;
  /** 图片加载完成后回报原始尺寸，用于按封面比例撑开卡片 */
  onLoadSize?: (size: { width: number; height: number }) => void;
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackTitle,
  priority = false,
  // 默认禁用原生拖拽：图片被拖动会生成 ghost image 并打断横向滑动
  draggable = false,
  interactive = true,
  fit = 'cover',
  placeholderClassName = 'bg-[#EAEAEF] dark:bg-[#242426]',
  fallbackClassName = 'bg-gradient-to-br from-[#ECEEF2] to-[#DFE3EA] dark:from-[#1C1C1E] dark:to-[#2C2C2E]',
  onLoadSize,
}: ResilientImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center ${fallbackClassName} text-app-muted p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <ImageOff className="w-6 h-6 mb-2 opacity-60" />
        {fallbackTitle && (
          <span className="text-xs font-medium tracking-tight opacity-80 line-clamp-1">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      {!isLoaded && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 animate-pulse ${placeholderClassName}`}
        />
      )}
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        referrerPolicy="no-referrer"
        draggable={draggable}
        onDragStart={(event) => {
          // 兜底：即使外部传入 draggable，也阻止默认拖拽行为
          if (!draggable) event.preventDefault();
        }}
        onLoad={(event) => {
          setIsLoaded(true);
          onLoadSize?.({
            width: event.currentTarget.naturalWidth,
            height: event.currentTarget.naturalHeight,
          });
        }}
        onError={() => setHasError(true)}
        className={`w-full h-full max-w-full max-h-full transition-opacity duration-500 ease-out ${
          fit === 'contain' ? 'object-contain' : 'object-cover'
        } ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={interactive ? undefined : { pointerEvents: 'none' }}
      />
    </div>
  );
}
