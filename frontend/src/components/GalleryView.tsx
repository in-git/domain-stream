import { useEffect, useMemo, useState } from 'react';
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
  categories?: string[];
  savedIds: string[];
  likedIds: string[];
  searchQuery?: string;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  externalSelectedId?: string | null;
  onClearExternalSelection?: () => void;
}

const DEFAULT_ALBUMS = ['建筑', '自然', '静物', '光影'];
type AlbumFilter = string;

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

interface PhotoCardProps {
  photo: PhotoItem;
  index: number;
  liked: boolean;
  saved: boolean;
  onOpen: (id: string, slide: number) => void;
  onToggleLike: (id: string) => void;
  onToggleSave: (id: string) => void;
}

/**
 * 图文卡片：一条图文只占一张卡，多图在封面上轮播
 * （与 CMS 图文列表一致，不再把多图拆成多张并列卡片）
 */
function PhotoCard({
  photo,
  index,
  liked,
  saved,
  onOpen,
  onToggleLike,
  onToggleSave,
}: PhotoCardProps) {
  const total = photo.images.length;
  const [slide, setSlide] = useState(0);
  const currentSlide = Math.min(slide, Math.max(total - 1, 0));
  const current = photo.images[currentSlide] ?? photo.src;

  const step = (delta: number) => {
    if (total < 2) return;
    setSlide((idx) => (idx + delta + total) % total);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ ...SWIFTUI_SMOOTH, delay: Math.min(index, 8) * 0.03 }}
      className="break-inside-avoid mb-5"
    >
      <div className="group overflow-hidden rounded-2xl bg-white dark:bg-[#161618] border border-black/[0.05] dark:border-white/[0.07] transition-shadow hover:shadow-md">
        <div
          className={`relative w-full max-h-[360px] overflow-hidden bg-[#EEEEF0] dark:bg-[#1C1C1E] ${getAspectClass(
            photo.aspectRatio
          )}`}
        >
          <button
            type="button"
            onClick={() => onOpen(photo.id, currentSlide)}
            className="absolute inset-0 w-full h-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0071E3]"
            aria-label={`查看大图：${photo.title}`}
          >
            <motion.div
              layoutId={`photo-frame-${photo.id}-${currentSlide}`}
              transition={SWIFTUI_SMOOTH}
              className="w-full h-full"
            >
              <ResilientImage
                src={current}
                alt={photo.title}
                fallbackTitle={photo.title}
                className="w-full h-full transition-transform duration-700 ease-out group-hover:scale-[1.035]"
              />
            </motion.div>
          </button>

          <span className="absolute left-2 top-2 px-2 py-0.5 rounded-full bg-black/45 text-[10px] font-medium text-white backdrop-blur-sm">
            {photo.album}
          </span>

          {total > 1 && (
            <>
              <div className="absolute right-2 top-2 px-2 py-0.5 rounded-full bg-black/45 text-[10px] font-medium text-white backdrop-blur-sm tabular-nums">
                {currentSlide + 1} / {total}
              </div>
              <button
                type="button"
                aria-label="上一张"
                onClick={() => step(-1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm flex items-center justify-center opacity-90 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="下一张"
                onClick={() => step(1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-sm flex items-center justify-center opacity-90 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        <div className="px-3 pt-2.5 pb-3">
          <button
            type="button"
            onClick={() => onOpen(photo.id, currentSlide)}
            className="block w-full text-left focus-visible:outline-none"
          >
            <h3 className="text-[13px] sm:text-sm font-medium leading-relaxed text-[#1D1D1F] dark:text-[#F5F5F7] line-clamp-2">
              {photo.title}
            </h3>
          </button>

          <p className="mt-1 text-[11px] text-[#6E6E73] dark:text-[#98989D] truncate">
            {photo.location} · {photo.date}
          </p>

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono-tabular text-[#86868B] dark:text-[#8E8E93] truncate">
              {photo.camera}
            </span>

            <div className="flex items-center gap-0.5 shrink-0">
              <motion.button
                type="button"
                whileTap={{ scale: 0.85 }}
                transition={SWIFTUI_BOUNCY}
                onClick={() => onToggleLike(photo.id)}
                aria-label={liked ? '取消喜欢' : '喜欢图片'}
                aria-pressed={liked}
                className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                  liked
                    ? 'text-[#FF2E4D]'
                    : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#FF2E4D]'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.85 }}
                transition={SWIFTUI_BOUNCY}
                onClick={() => onToggleSave(photo.id)}
                aria-label={saved ? '取消收藏' : '收藏图片'}
                aria-pressed={saved}
                className={`flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
                  saved
                    ? 'text-[#0071E3] dark:text-[#0A84FF]'
                    : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function GalleryView({
  photos,
  categories,
  savedIds,
  likedIds,
  searchQuery = '',
  onToggleSave,
  onToggleLike,
  externalSelectedId,
  onClearExternalSelection,
}: GalleryViewProps) {
  const filterAlbums = categories && categories.length ? categories : DEFAULT_ALBUMS;
  const [album, setAlbum] = useState<AlbumFilter>('全部');
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  // 当前图文内正在查看的图片索引（详情按图片浏览）
  const [activeSlide, setActiveSlide] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showExif, setShowExif] = useState(true);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredPhotos = useMemo(
    () =>
      photos.filter((p) => {
        const matchAlbum = album === '全部' || p.album === album;
        const matchQuery =
          !normalizedQuery ||
          p.title.toLowerCase().includes(normalizedQuery) ||
          p.location.toLowerCase().includes(normalizedQuery) ||
          p.camera.toLowerCase().includes(normalizedQuery);
        return matchAlbum && matchQuery;
      }),
    [photos, album, normalizedQuery]
  );

  // 展平后的图片序列：详情里可跨图文连续浏览
  const slideList = useMemo(
    () =>
      filteredPhotos.flatMap((photo, cardIndex) =>
        photo.images.map((src, imageIndex) => ({ photo, cardIndex, imageIndex, src }))
      ),
    [filteredPhotos]
  );

  const activeSlideIndex = activePhotoId
    ? slideList.findIndex(
        (item) => item.photo.id === activePhotoId && item.imageIndex === activeSlide
      )
    : -1;
  const activeItem = activeSlideIndex >= 0 ? slideList[activeSlideIndex] : null;
  const activePhoto = activeItem?.photo ?? null;

  useEffect(() => {
    if (externalSelectedId) {
      setAlbum('全部');
      setActivePhotoId(externalSelectedId);
      setActiveSlide(0);
      setIsZoomed(false);
      onClearExternalSelection?.();
    }
  }, [externalSelectedId, onClearExternalSelection]);

  const openPhoto = (id: string, slide = 0) => {
    setActivePhotoId(id);
    setActiveSlide(slide);
    setIsZoomed(false);
  };

  const closePhoto = () => {
    setActivePhotoId(null);
    setActiveSlide(0);
    setIsZoomed(false);
  };

  const goPrev = () => {
    if (slideList.length === 0) return;
    setIsZoomed(false);
    const prev = (activeSlideIndex - 1 + slideList.length) % slideList.length;
    setActivePhotoId(slideList[prev].photo.id);
    setActiveSlide(slideList[prev].imageIndex);
  };

  const goNext = () => {
    if (slideList.length === 0) return;
    setIsZoomed(false);
    const next = (activeSlideIndex + 1) % slideList.length;
    setActivePhotoId(slideList[next].photo.id);
    setActiveSlide(slideList[next].imageIndex);
  };

  useEffect(() => {
    if (!activeItem) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closePhoto();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeItem, activeSlideIndex, slideList]);

  return (
    <section aria-labelledby="gallery-heading" className="space-y-10">
      {/* Header & Album Filter */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
        <div>
          <p className="text-xs font-medium tracking-wide text-[#0071E3] dark:text-[#0A84FF] mb-1.5">
            影像图文志
          </p>
          <h1
            id="gallery-heading"
            className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]"
          >
            图文
          </h1>
        </div>

        <div
          role="tablist"
          aria-label="图集筛选"
          className="inline-flex items-center p-1 rounded-xl bg-[#EEEEF0] dark:bg-[#1C1C1E] border border-black/[0.04] dark:border-white/[0.06] self-start md:self-auto overflow-x-auto max-w-full"
        >
          {(['全部', ...filterAlbums] as AlbumFilter[]).map((item) => {
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

      {/* Image-and-Text Masonry Wall — 一条图文一张卡，多图封面轮播 */}
      <div className="columns-1 sm:columns-2 md:columns-3 xl:columns-4 2xl:columns-5 gap-5 xl:gap-6">
        <AnimatePresence mode="popLayout">
          {filteredPhotos.map((photo, idx) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              index={idx}
              liked={likedIds.includes(photo.id)}
              saved={savedIds.includes(photo.id)}
              onOpen={openPhoto}
              onToggleLike={onToggleLike}
              onToggleSave={onToggleSave}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* SwiftUI Matched-Geometry Fullscreen Lightbox */}
      <AnimatePresence>
        {activeItem && activePhoto && (
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
                {activeSlideIndex + 1} / {slideList.length}
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
                layoutId={`photo-frame-${activePhoto.id}-${activeItem.imageIndex}`}
                transition={SWIFTUI_SMOOTH}
                onClick={(e) => {
                  e.stopPropagation();
                  setIsZoomed((z) => !z);
                }}
                className="relative max-w-5xl max-h-[72vh] flex items-center justify-center cursor-zoom-in"
              >
                <motion.img
                  src={activeItem.src}
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
                        {activePhoto.images.length > 1 && (
                          <>
                            <span className="text-white/40" aria-hidden="true">·</span>
                            <span className="text-white/70 font-normal text-xs tabular-nums">
                              第 {activeItem.imageIndex + 1} / {activePhoto.images.length} 张
                            </span>
                          </>
                        )}
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
