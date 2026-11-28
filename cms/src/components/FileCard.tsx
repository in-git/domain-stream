/**
 * 通用文件卡片
 * ------------------------------------------------------------------
 * 文件中心、素材中心、素材资源库、文件选择器共用。
 * 封面按 缩略图 → 原图 → 类型占位 依次回退；图片 / 视频 / 音频统一由
 * FileMedia 与内联播放处理。操作按钮通过 actions 数组传入，没传就不显示，
 * 因此文件选择器天然不带删除、编辑等入口。
 *
 * variant="card"  标准卡片：4:3 封面 + 名称/大小 + 选择圈 + 悬浮操作条
 * variant="icon"  仅渲染正方形媒体块，供图标/SVG 小方块网格使用
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Check,
  File as FileIcon,
  FileText,
  Film,
  Images,
  Music,
  Pause,
  Play,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  categoryLabel,
  isAudioFile,
  isImageFile,
  isVideoFile,
  toOpenUrl,
  toPlayableVideoUrl,
  toStreamUrl,
  type DevFile,
} from '../lib/fileCenter.ts';
import { useFileThumbSrc } from '../lib/useFileThumb.ts';
import { FileMedia } from './FileMedia.tsx';

export interface FileCardAction {
  key: string;
  label: string;
  icon: LucideIcon;
  /** 点击回调；与 href 二选一 */
  onClick?: () => void;
  /** 需要新窗口打开的地址（如下载） */
  href?: string;
  /** 危险操作（删除）用红色悬浮态 */
  danger?: boolean;
}

export interface FileCardProps {
  file: DevFile;
  /** 展示名称，默认取 file.name（资源库通常用标题而不是带后缀的文件名） */
  title?: string;
  /** 标题最多显示的字符数，超出用省略号截断，默认 18 */
  maxTitleLength?: number;
  /** 外部指定的封面/媒体地址（如资源库代理地址），优先于自动解析 */
  src?: string;
  selected?: boolean;
  /** 是否显示选择圈并启用单击选择，默认 true */
  selectable?: boolean;
  onToggleSelect?: (id: string) => void;
  /** 双击 / 回车打开 */
  onOpen?: (file: DevFile) => void;
  /** 悬浮操作按钮，按传入顺序渲染 */
  actions?: FileCardAction[];
  /** 右上角角标，如“已加入”；有操作条时悬停自动让位 */
  badge?: ReactNode;
  /** 底部右侧信息，默认“大小 · 格式” */
  meta?: ReactNode;
  variant?: 'card' | 'icon';
  /** 图片填充方式，默认 cover；图标/SVG 建议 contain */
  fit?: 'cover' | 'contain';
  /** 封面加载失败回调，调用方可切换到远程直链等 */
  onCoverError?: (file: DevFile) => void;
  className?: string;
}

/** 当前正在播放的卡片音频，切换播放时先暂停上一个 */
let activeAudio: HTMLAudioElement | null = null;

/** 占位图标：按文件类型区分 */
function coverIcon(file: DevFile) {
  if (isVideoFile(file)) return Film;
  if (isAudioFile(file)) return Music;
  if (isImageFile(file)) return Images;
  if ((file.category || '') === 'DOC') return FileText;
  return FileIcon;
}

export function FileCard({
  file,
  title,
  maxTitleLength = 18,
  src,
  selected = false,
  selectable = true,
  onToggleSelect,
  onOpen,
  actions = [],
  badge,
  meta,
  variant = 'card',
  fit = 'cover',
  onCoverError,
  className = '',
}: FileCardProps) {
  const Icon = coverIcon(file);
  const isImage = isImageFile(file);
  const isVideo = isVideoFile(file);
  const isAudio = isAudioFile(file);
  const isIcon = variant === 'icon';

  /** 封面失败地址：失败后自动回退到下一候选 */
  const [failedSrc, setFailedSrc] = useState('');
  useEffect(() => setFailedSrc(''), [file.id, src]);

  // 缩略图接口需要 token，交给 hook 拉 blob；图片没有缩略图时回退原图
  const originalUrl = isImage ? toOpenUrl(file) : '';
  const autoCover = useFileThumbSrc(file, originalUrl);
  const coverCandidates = [src, autoCover, originalUrl].filter(
    (value, index, list) => !!value && list.indexOf(value) === index && value !== failedSrc
  );
  const cover = coverCandidates[0] || '';
  const showCover = isImage && !!cover;

  // 视频：静态首帧 + 悬停播放
  const [videoFailed, setVideoFailed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const videoUrl = isVideo ? src || toPlayableVideoUrl(toOpenUrl(file)) : '';

  useEffect(() => {
    setVideoFailed(false);
    setVideoPlaying(false);
  }, [file.id, src]);

  useEffect(() => {
    if (!isVideo) return;
    const video = videoRef.current;
    if (!video) return;
    if (hovered) {
      void video.play().catch(() => {
        /* 浏览器拒绝播放时保持静帧 */
      });
    } else {
      video.pause();
      if (video.readyState >= 1) video.currentTime = 0;
    }
  }, [hovered, isVideo]);

  // 音频：卡片内联播放，同一时间只允许一个在播
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioUrl = isAudio ? toStreamUrl(file) || toOpenUrl(file) : '';

  useEffect(() => {
    setAudioPlaying(false);
    setAudioTime(0);
    setAudioDuration(0);
  }, [file.id]);

  function toggleAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      if (activeAudio && activeAudio !== audio) activeAudio.pause();
      activeAudio = audio;
      void audio.play().catch(() => {
        /* 浏览器拒绝播放时保持静止 */
      });
    } else {
      audio.pause();
    }
  }

  function handleCoverError() {
    if (cover) setFailedSrc(cover);
    onCoverError?.(file);
  }

  const mediaClass = isIcon ? 'w-full h-full object-contain' : `w-full h-full ${fit === 'contain' ? 'object-contain' : 'object-cover'}`;

  /** 视频 / 图片 / 占位三种媒体画面 */
  const media = isVideo && videoUrl && !videoFailed ? (
    <video
      ref={videoRef}
      src={videoUrl}
      poster={autoCover || undefined}
      muted
      loop
      playsInline
      preload="metadata"
      onPlay={() => setVideoPlaying(true)}
      onPause={() => setVideoPlaying(false)}
      onError={() => {
        setVideoFailed(true);
        setVideoPlaying(false);
      }}
      className={isIcon ? 'w-full h-full object-contain bg-black' : 'w-full h-full object-cover'}
      aria-label={`播放 ${file.name || '视频'}`}
    />
  ) : showCover ? (
    <FileMedia
      file={file}
      src={cover}
      alt={file.name || '文件'}
      className={mediaClass}
      reveal
      onError={handleCoverError}
    />
  ) : (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 select-none">
      {isAudio ? null : (
        <>
          <Icon className={isIcon ? 'w-6 h-6 opacity-80' : 'w-8 h-8 opacity-80'} strokeWidth={1.4} />
          {!isIcon && (
            <span className="text-[9px] font-medium uppercase tracking-wide opacity-70">
              {(file.suffix || '').replace('.', '') || categoryLabel(file.category)}
            </span>
          )}
        </>
      )}
    </div>
  );

  // 图标变体：只出正方形媒体块，选择/删除等交互由调用方保留在原布局里
  if (isIcon) {
    return (
      <div className={`relative aspect-square rounded-xl overflow-hidden bg-[#F2F2F7] ${className}`}>
        {media}
      </div>
    );
  }

  const darkCover = isVideo || showCover;
  const displayName = title || file.name || '未命名素材';
  const displayChars = Array.from(displayName);
  const shownName =
    displayChars.length > maxTitleLength
      ? `${displayChars.slice(0, maxTitleLength).join('')}…`
      : displayName;
  const metaNode = meta ?? (
    <>
      {file.sizeInfo || '-'} · {(file.suffix || '').toUpperCase() || categoryLabel(file.category)}
    </>
  );

  return (
    <div
      title={onOpen ? `${displayName} · 双击打开` : displayName}
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => {
        if (selectable) onToggleSelect?.(file.id);
      }}
      onDoubleClick={() => onOpen?.(file)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (onOpen) onOpen(file);
          else if (selectable) onToggleSelect?.(file.id);
        }
      }}
      className={`group relative p-1.5 rounded-[14px] cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]/40 ${
        selected ? 'bg-[#0071E3]/8' : 'hover:bg-[#F5F5F7]'
      } ${className}`}
    >
      {/* 封面 */}
      <div
        className={`relative aspect-[4/3] rounded-[11px] overflow-hidden ${
          isVideo ? 'bg-black' : 'bg-gradient-to-br from-[#FDFDFE] via-[#F5F5F7] to-[#E9E9ED] text-[#6E6E73]'
        } ${selected ? 'ring-2 ring-[#0071E3]' : 'ring-1 ring-black/5'} transition-shadow group-hover:shadow-[0_10px_26px_rgba(0,0,0,0.10)]`}
      >
        {media}

        {isVideo && !videoPlaying && (
          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="w-10 h-10 rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-sm text-white flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.28)] transition-transform group-hover:scale-105">
              <Play className="w-4 h-4 fill-current translate-x-[1px]" />
            </span>
          </span>
        )}

        {isAudio && audioUrl && (
          <>
            <audio
              ref={audioRef}
              src={audioUrl}
              preload="metadata"
              onPlay={() => setAudioPlaying(true)}
              onPause={() => setAudioPlaying(false)}
              onEnded={() => {
                setAudioPlaying(false);
                setAudioTime(0);
              }}
              onTimeUpdate={(event) => setAudioTime(event.currentTarget.currentTime)}
              onLoadedMetadata={(event) =>
                setAudioDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)
              }
              className="hidden"
            />
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                toggleAudio();
              }}
              onDoubleClick={(event) => event.stopPropagation()}
              aria-label={`${audioPlaying ? '暂停' : '播放'} ${file.name || '音频'}`}
              title={audioPlaying ? '暂停' : '播放'}
              className="absolute inset-0 m-auto z-10 w-11 h-11 rounded-full bg-white/90 backdrop-blur-sm ring-1 ring-black/5 text-[#0071E3] shadow-[0_4px_14px_rgba(0,0,0,0.18)] flex items-center justify-center hover:scale-105 transition-transform"
            >
              {audioPlaying ? (
                <Pause className="w-4.5 h-4.5 fill-current" />
              ) : (
                <Play className="w-4.5 h-4.5 fill-current translate-x-[1px]" />
              )}
            </button>
            {(audioPlaying || audioTime > 0) && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-1 overflow-hidden rounded-b-[11px] bg-white/25">
                <div
                  className="h-full bg-[#0071E3] transition-[width] duration-150"
                  style={{
                    width: `${audioDuration > 0 ? Math.min(100, (audioTime / audioDuration) * 100) : 0}%`,
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* 底部信息：名称 + 大小/格式 */}
        <div
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-12 rounded-b-[11px] bg-gradient-to-t ${
            darkCover ? 'from-black/65 via-black/25 to-transparent' : 'from-white/95 via-white/55 to-transparent'
          }`}
        />
        <div className="pointer-events-none absolute bottom-1.5 left-1.5 right-1.5 z-10 flex items-end justify-between gap-2">
          <span
            className={`flex-1 min-w-0 truncate text-[12px] font-medium drop-shadow-sm ${
              darkCover ? 'text-white' : 'text-[#1D1D1F]'
            }`}
            title={displayName}
          >
            {shownName}
          </span>
          <span
            className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] backdrop-blur-sm ${
              darkCover ? 'bg-black/35 text-white/90' : 'bg-black/5 text-[#6E6E73]'
            }`}
          >
            {metaNode}
          </span>
        </div>

        {/* 选择圈 */}
        {selectable && (
          <button
            type="button"
            aria-label={`${selected ? '取消选择' : '选择'} ${file.name || file.id}`}
            aria-pressed={selected}
            onClick={(event) => {
              event.stopPropagation();
              onToggleSelect?.(file.id);
            }}
            className={`absolute top-1.5 left-1.5 z-10 w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${
              selected
                ? 'bg-[#0071E3] border-[#0071E3] text-white'
                : 'bg-white/85 border-black/10 text-transparent opacity-0 group-hover:opacity-100'
            }`}
          >
            <Check className="w-2.5 h-2.5" strokeWidth={3} />
          </button>
        )}

        {/* 角标：有操作条时悬停让位 */}
        {badge && (
          <span
            className={`absolute top-1.5 right-1.5 z-10 ${
              actions.length ? 'transition-opacity group-hover:opacity-0' : ''
            }`}
          >
            {badge}
          </span>
        )}

        {/* 悬浮操作条 */}
        {actions.length > 0 && (
          <div
            className="absolute top-1.5 right-1.5 z-10 flex items-center gap-0.5 p-0.5 rounded-lg bg-white/90 backdrop-blur-md shadow-sm opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all"
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
          >
            {actions.map((action) => {
              const ActionIcon = action.icon;
              const tone = action.danger
                ? 'text-[#3A3A3C] hover:text-[#D70015] hover:bg-[#FF3B30]/8'
                : 'text-[#3A3A3C] hover:text-[#0071E3] hover:bg-[#F2F2F7]';
              if (action.href) {
                return (
                  <a
                    key={action.key}
                    href={action.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${action.label} ${file.name || ''}`}
                    title={action.label}
                    className={`p-1 rounded-md transition-colors ${tone}`}
                  >
                    <ActionIcon className="w-3.5 h-3.5" />
                  </a>
                );
              }
              return (
                <button
                  key={action.key}
                  type="button"
                  onClick={action.onClick}
                  aria-label={`${action.label} ${file.name || ''}`}
                  title={action.label}
                  className={`p-1 rounded-md transition-colors ${tone}`}
                >
                  <ActionIcon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
