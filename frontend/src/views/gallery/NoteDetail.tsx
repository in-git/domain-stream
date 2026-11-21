import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y } from 'swiper/modules';
import type { Swiper as SwiperClass } from 'swiper';
import 'swiper/css';
import { ChevronLeft, ChevronRight, Heart, Share2, Star, X } from 'lucide-react';
import type { PhotoItem } from '../../data/content';
import { SWIFTUI_BOUNCY, SWIFTUI_SMOOTH } from '../../lib/motion';
import { ResilientImage } from '../../components/ResilientImage';

interface NoteDetailProps {
  note: PhotoItem | null;
  liked: boolean;
  saved: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onClose: () => void;
}

/**
 * 笔记详情：小红书式左右结构
 * 左侧图片轮播（3:4 竖图），右侧作者 / 标题 / 正文 / 互动。
 * 窄屏自动切换为上下堆叠。
 */
export function NoteDetail({ note, liked, saved, onToggleLike, onToggleSave, onClose }: NoteDetailProps) {
  const [index, setIndex] = useState(0);
  const swiperRef = useRef<SwiperClass | null>(null);

  // 切换笔记时重置到第一张
  useEffect(() => {
    setIndex(0);
  }, [note?.id]);

  const goRelative = useCallback(
    (step: number) => {
      const total = note?.images.length ?? 0;
      if (total <= 1) return;
      const swiper = swiperRef.current;
      if (!swiper) {
        setIndex((i) => (i + step + total) % total);
        return;
      }
      if (step < 0) swiper.slidePrev();
      else swiper.slideNext();
    },
    [note?.images.length]
  );

  useEffect(() => {
    if (!note) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') goRelative(-1);
      if (event.key === 'ArrowRight') goRelative(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [note, onClose, goRelative]);

  /** 标题 + 关闭栏：移动端悬浮在图片上方，桌面端仍在正文区顶部 */
  const renderHeader = (mobile: boolean) => (
    <div
      className={
        mobile
          ? 'absolute inset-x-0 top-0 z-30 flex h-14 items-center justify-between gap-4 bg-black/35 px-5 text-white backdrop-blur-sm md:hidden'
          : 'hidden h-14 shrink-0 items-center justify-between gap-4 px-5 md:flex'
      }
    >
      <h2
        className={`min-w-0 flex-1 truncate text-[14px] font-semibold ${
          mobile ? 'text-white' : 'text-[#1D1D1F] dark:text-[#F5F5F7]'
        }`}
      >
        {note?.title || '图文详情'}
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label="关闭"
        className={`p-2 rounded-full shrink-0 ${
          mobile ? 'text-white hover:bg-white/15' : 'text-[#86868B] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
        }`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <AnimatePresence>
      {note && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 h-screen flex items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-6"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={note.title}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.99 }}
            transition={SWIFTUI_SMOOTH}
            onClick={(event) => event.stopPropagation()}
            className="relative h-[100dvh] w-screen max-w-none rounded-none bg-black sm:h-[min(88vh,760px)] sm:w-full sm:max-w-4xl sm:rounded-3xl sm:bg-white sm:dark:bg-[#161618] overflow-hidden flex flex-col md:flex-row shadow-2xl will-change-transform"
          >
            {renderHeader(true)}

            {/* 左：Swiper 图片轮播
                图片完整自适应显示在容器内，宽高都不超出容器；移动端容器全屏 */}
            <div className="relative h-full w-full md:w-[54%] md:h-full shrink-0 bg-black overflow-hidden">
              <Swiper
                key={note.id}
                modules={[A11y]}
                loop={note.images.length > 1}
                speed={300}
                threshold={10}
                touchStartPreventDefault={false}
                onSwiper={(swiper) => {
                  swiperRef.current = swiper;
                  setIndex(swiper.realIndex);
                }}
                onSlideChange={(swiper) => setIndex(swiper.realIndex)}
                className="h-full w-full"
              >
                {note.images.map((src, i) => (
                  <SwiperSlide key={`${src}-${i}`} className="h-full w-full bg-black">
                    <div className="h-full w-full">
                      <ResilientImage
                        src={src}
                        alt={note.title}
                        fallbackTitle={note.title}
                        fit="contain"
                        interactive={false}
                        className="h-full w-full"
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>

              {note.images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => goRelative(-1)}
                    aria-label="上一张"
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goRelative(1)}
                    aria-label="下一张"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-sm transition-colors z-10"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  {/* 页码圆点 */}
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                    {note.images.map((_, i) => (
                      <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${
                          i === index ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* 右：正文与互动；移动端正文隐藏，仅保留底部悬浮操作栏 */}
            <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col md:static md:z-auto md:min-w-0 md:flex-1">
              {renderHeader(false)}

              <div className="hidden md:block md:flex-1 md:min-h-0 md:overflow-y-auto md:px-5 md:py-4">
                <h2 className="text-[16px] font-semibold leading-snug text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {note.title}
                </h2>
                {note.content &&
                  note.content.split('\n').filter(Boolean).map((line, i) => (
                    <p
                      key={i}
                      // break-words + anywhere：长串英文 / 链接也不会横向溢出
                      className="mt-2 text-[13px] leading-[1.85] whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[#3A3A3C] dark:text-[#D1D1D6]"
                    >
                      {line}
                    </p>
                  ))}
                <p className="mt-3 text-[11px] text-[#AEAEB2]">
                  {note.date}
                  {note.location ? ` · ${note.location}` : ''}
                </p>
              </div>

              <div className="shrink-0 flex h-14 items-center justify-around border-t border-white/15 bg-black/45 px-4 text-white backdrop-blur-sm dark:border-white/[0.08] md:border-black/[0.06] md:bg-transparent md:text-[#1D1D1F] md:dark:text-[#F5F5F7]">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  transition={SWIFTUI_BOUNCY}
                  onClick={onToggleLike}
                  aria-pressed={liked}
                  className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] transition-colors ${
                    liked
                      ? 'text-[#FF6B7E] bg-[#FF2E4D]/15 md:text-[#FF2E4D]'
                      : 'text-white/85 hover:bg-white/10 md:text-[#6E6E73] md:hover:bg-black/[0.04] md:dark:text-[#98989D]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                  {note.likeCount || 0}
                </motion.button>

                <button
                  type="button"
                  onClick={onToggleSave}
                  aria-pressed={saved}
                  className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] transition-colors ${
                    saved
                      ? 'text-white bg-white/15 md:bg-[#0071E3]/10 md:text-[#0071E3]'
                      : 'text-white/85 hover:bg-white/10 md:text-[#6E6E73] md:hover:bg-black/[0.04] md:dark:text-[#98989D]'
                  }`}
                >
                  <Star className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
                  收藏
                </button>

                <button
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(`${note.title}\n${note.content || ''}`)}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] text-white/85 hover:bg-white/10 transition-colors md:text-[#6E6E73] md:hover:bg-black/[0.04] md:dark:text-[#98989D]"
                >
                  <Share2 className="w-4 h-4" />
                  分享
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NoteDetail;
