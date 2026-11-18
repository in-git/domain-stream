import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  Info,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { PhotoItem } from '../data/content';
import { SWIFTUI_BOUNCY, SWIFTUI_SMOOTH, SWIFTUI_SNAPPY } from '../lib/motion';
import { ResilientImage } from './ResilientImage';

interface GalleryViewProps {
  photos: PhotoItem[];
  savedIds: string[];
  likedIds: string[];
  searchQuery?: string;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  externalSelectedId?: string | null;
  onClearExternalSelection?: () => void;
}

const ALBUMS = ['全部', '建筑', '自然', '静物', '光影'] as const;
type AlbumFilter = (typeof ALBUMS)[number];

function getAspectClass(ratio: PhotoItem['aspectRatio']): string {
  switch (ratio) {
    case '3:4':
      return 'aspect-[3/4]';
    case '4:3':
      return 'aspect-[4/3]';
    case '1:1':
      return 'aspect-square';
    case '16:9':
      return 'aspect-video';
  }
}

export function GalleryView({
  photos,
  savedIds,
  likedIds,
  searchQuery = '',
  onToggleSave,
  onToggleLike,
  externalSelectedId,
  onClearExternalSelection,
}: GalleryViewProps) {
  const [album, setAlbum] = useState<AlbumFilter>('全部');
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showExif, setShowExif] = useState(true);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredPhotos = photos.filter((p) => {
    const matchAlbum = album === '全部' || p.album === album;
    const matchQuery =
      !normalizedQuery ||
      p.title.toLowerCase().includes(normalizedQuery) ||
      p.location.toLowerCase().includes(normalizedQuery) ||
      p.camera.toLowerCase().includes(normalizedQuery);
    return matchAlbum && matchQuery;
  });

  const activeIndex = activePhotoId
    ? filteredPhotos.findIndex((p) => p.id === activePhotoId)
    : -1;
  const activePhoto = activeIndex >= 0 ? filteredPhotos[activeIndex] : null;

  useEffect(() => {
    if (externalSelectedId) {
      setAlbum('全部');
      setActivePhotoId(externalSelectedId);
      setIsZoomed(false);
      onClearExternalSelection?.();
    }
  }, [externalSelectedId, onClearExternalSelection]);

  const openPhoto = (id: string) => {
    setActivePhotoId(id);
    setIsZoomed(false);
  };

  const closePhoto = () => {
    setActivePhotoId(null);
    setIsZoomed(false);
  };

  const goPrev = () => {
    if (filteredPhotos.length === 0) return;
    setIsZoomed(false);
    const prevIdx = (activeIndex - 1 + filteredPhotos.length) % filteredPhotos.length;
    setActivePhotoId(filteredPhotos[prevIdx].id);
  };

  const goNext = () => {
    if (filteredPhotos.length === 0) return;
    setIsZoomed(false);
    const nextIdx = (activeIndex + 1) % filteredPhotos.length;
    setActivePhotoId(filteredPhotos[nextIdx].id);
  };

  useEffect(() => {
    if (!activePhoto) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePhoto();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activePhoto, activeIndex, filteredPhotos]);

  return (
    <section aria-labelledby="gallery-heading" className="space-y-10">
      {/* Header & Album Filter */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div>
          <p className="text-xs font-medium tracking-wide text-[#0071E3] dark:text-[#0A84FF] mb-1.5">
            无框视觉画廊
          </p>
          <h1
            id="gallery-heading"
            className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]"
          >
            纯图片
          </h1>
        </div>

        <div
          role="tablist"
          aria-label="图集筛选"
          className="inline-flex items-center p-1 rounded-xl bg-[#EEEEF0] dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.06] self-start md:self-auto overflow-x-auto max-w-full"
        >
          {ALBUMS.map((item) => {
            const active = album === item;
            return (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setAlbum(item)}
                className={`relative px-3.5 py-2 min-h-[40px] text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] ${
                  active
                    ? 'text-[#1D1D1F] dark:text-white'
                    : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="galleryAlbumPill"
                    transition={SWIFTUI_SNAPPY}
                    className="absolute inset-0 rounded-lg bg-white dark:bg-[#2C2C2E] shadow-xs"
                  />
                )}
                <span className="relative z-10">{item}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pure Photography Masonry Wall — unobstructed imagery, whisper-subtle hover reveal */}
      <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
        <AnimatePresence mode="popLayout">
          {filteredPhotos.map((photo) => {
            const isLiked = likedIds.includes(photo.id);
            return (
              <motion.div
                key={photo.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={SWIFTUI_SMOOTH}
                whileTap={{ scale: 0.98 }}
                className="break-inside-avoid"
              >
                <button
                  type="button"
                  onClick={() => openPhoto(photo.id)}
                  className={`group relative block w-full overflow-hidden rounded-2xl bg-[#EEEEF0] dark:bg-[#1C1C1E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] ${getAspectClass(
                    photo.aspectRatio
                  )}`}
                  aria-label={`查看大图：${photo.title}`}
                >
                  <motion.div
                    layoutId={`photo-frame-${photo.id}`}
                    transition={SWIFTUI_SMOOTH}
                    className="w-full h-full"
                  >
                    <ResilientImage
                      src={photo.src}
                      alt={photo.title}
                      fallbackTitle={photo.title}
                      className="w-full h-full transition-transform duration-700 ease-out group-hover:scale-[1.035]"
                    />
                  </motion.div>

                  {/* Subtle hover-only scrim (desktop) */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-4 text-left">
                    <div>
                      <p className="text-sm font-medium text-white">{photo.title}</p>
                      <p className="text-xs text-white/75 mt-0.5">{photo.location}</p>
                    </div>
                    {isLiked && (
                      <Heart className="w-4 h-4 text-[#FF375F] fill-current shrink-0" />
                    )}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* SwiftUI Matched-Geometry Fullscreen Lightbox */}
      <AnimatePresence>
        {activePhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-2xl text-white select-none"
            onClick={closePhoto}
            role="dialog"
            aria-modal="true"
            aria-label={activePhoto.title}
          >
            {/* Top Bar Controls */}
            <div
              className="shrink-0 px-4 sm:px-8 h-16 flex items-center justify-between z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-xs font-mono-tabular text-white/70">
                {activeIndex + 1} / {filteredPhotos.length}
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsZoomed((z) => !z)}
                  aria-label={isZoomed ? '还原缩放' : '放大查看细节'}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowExif((s) => !s)}
                  aria-label="显示或隐藏拍摄参数"
                  className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors ${
                    showExif ? 'bg-[#0A84FF] text-white' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <Info className="w-4 h-4" />
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  transition={SWIFTUI_BOUNCY}
                  onClick={() => onToggleLike(activePhoto.id)}
                  aria-label={likedIds.includes(activePhoto.id) ? '取消喜欢' : '喜欢图片'}
                  className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors ${
                    likedIds.includes(activePhoto.id)
                      ? 'bg-[#FF375F]/20 text-[#FF375F]'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <Heart
                    className={`w-4 h-4 ${
                      likedIds.includes(activePhoto.id) ? 'fill-current' : ''
                    }`}
                  />
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  transition={SWIFTUI_BOUNCY}
                  onClick={() => onToggleSave(activePhoto.id)}
                  aria-label={savedIds.includes(activePhoto.id) ? '取消收藏' : '收藏图片'}
                  className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors ${
                    savedIds.includes(activePhoto.id)
                      ? 'bg-[#0A84FF]/25 text-[#0A84FF]'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <Bookmark
                    className={`w-4 h-4 ${
                      savedIds.includes(activePhoto.id) ? 'fill-current' : ''
                    }`}
                  />
                </motion.button>

                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  onClick={closePhoto}
                  aria-label="关闭大图"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors ml-1"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Main Lightbox Stage */}
            <div className="relative flex-1 flex items-center justify-center px-4 sm:px-16 overflow-hidden">
              {/* Prev Button */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
                aria-label="上一张"
                className="hidden sm:flex absolute left-5 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center backdrop-blur-md transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </motion.button>

              <motion.div
                layoutId={`photo-frame-${activePhoto.id}`}
                transition={SWIFTUI_SMOOTH}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsZoomed((z) => !z);
                }}
                className="relative max-w-5xl max-h-[72vh] flex items-center justify-center cursor-zoom-in"
              >
                <motion.img
                  src={activePhoto.src}
                  alt={activePhoto.title}
                  referrerPolicy="no-referrer"
                  animate={{ scale: isZoomed ? 1.65 : 1 }}
                  transition={SWIFTUI_SMOOTH}
                  className="max-h-[72vh] max-w-full w-auto h-auto rounded-xl object-contain shadow-2xl"
                />
              </motion.div>

              {/* Next Button */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                }}
                aria-label="下一张"
                className="hidden sm:flex absolute right-5 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center backdrop-blur-md transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Bottom EXIF & Mobile Navigation Strip */}
            <AnimatePresence>
              {showExif && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 16 }}
                  transition={SWIFTUI_SNAPPY}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 px-5 sm:px-8 py-4 border-t border-white/10 bg-black/60 backdrop-blur-md"
                >
                  <div className="max-w-5xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        <span>{activePhoto.title}</span>
                        <span className="text-white/40" aria-hidden="true">·</span>
                        <span className="text-white/70 font-normal text-xs">
                          {activePhoto.location}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-mono-tabular text-white/60">
                        <span>{activePhoto.camera}</span>
                        <span aria-hidden="true">·</span>
                        <span>{activePhoto.lens}</span>
                        <span aria-hidden="true">·</span>
                        <span>{activePhoto.settings}</span>
                      </div>
                    </div>

                    {/* Mobile Prev/Next Buttons */}
                    <div className="flex sm:hidden items-center gap-2">
                      <button
                        type="button"
                        onClick={goPrev}
                        className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-white/10 text-xs font-medium"
                      >
                        上一张
                      </button>
                      <button
                        type="button"
                        onClick={goNext}
                        className="flex-1 py-2.5 min-h-[44px] rounded-xl bg-white/10 text-xs font-medium"
                      >
                        下一张
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
