import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { A11y, Mousewheel } from 'swiper/modules';
import type { Swiper as SwiperClass } from 'swiper';
import 'swiper/css';
import { Check, ChevronLeft, ChevronRight, Heart, MessageCircle, Star, X } from 'lucide-react';
import type { PhotoItem } from '../../data/content';
import { SWIFTUI_BOUNCY, SWIFTUI_SMOOTH } from '../../lib/motion';
import { ResilientImage } from '../../components/ResilientImage';
import { CommentPanel } from '../../components/CommentPanel.tsx';
import { useCommentEnabled } from '../../lib/systemInfo.ts';

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
  const commentsEnabled = useCommentEnabled();
  const [index, setIndex] = useState(0);
  const [commentOpen, setCommentOpen] = useState(false);
  const swiperRef = useRef<SwiperClass | null>(null);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // 切换笔记时重置到第一张
  useEffect(() => {
    setIndex(0);
    setCommentOpen(false);
  }, [note?.id]);

  // 底部缩略图跟随当前图片滚动，图片多时也不会挤在一起
  useEffect(() => {
    thumbRefs.current[index]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [index]);

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
          ? 'absolute inset-x-0 top-0 z-30 flex h-14 items-center justify-between gap-4 bg-transparent px-5 text-white md:hidden'
          : 'hidden h-16 shrink-0 items-center justify-between gap-4 border-b border-black/[0.06] px-7 md:flex dark:border-white/[0.08]'
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
    <>
      <AnimatePresence>
      {note && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 h-screen flex items-center justify-center bg-black/75 backdrop-blur-2xl p-0 sm:p-4"
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
            className="relative h-[100dvh] w-screen max-w-none rounded-none bg-black sm:h-[min(97vh,1120px)] sm:w-full sm:max-w-[min(1680px,98vw)] sm:rounded-[36px] sm:bg-white sm:ring-1 sm:ring-white/10 sm:dark:bg-[#161618] overflow-hidden flex flex-col md:flex-row shadow-[0_48px_160px_rgba(0,0,0,0.65)] will-change-transform"
          >
            {renderHeader(true)}

            {/* 左：Swiper 图片轮播
                图片完整自适应显示在容器内，宽高都不超出容器；移动端容器全屏 */}
            <div className="relative flex h-full w-full shrink-0 flex-col overflow-hidden bg-black md:h-full md:w-[68%]">
              <div className="relative min-h-0 flex-1">
                <Swiper
                  key={note.id}
                  modules={[A11y, Mousewheel]}
                  loop={note.images.length > 1}
                  speed={300}
                  threshold={10}
                  mousewheel={{ forceToAxis: false, releaseOnEdges: true, thresholdDelta: 12 }}
                  touchStartPreventDefault={false}
                  onSwiper={(swiper) => {
                    swiperRef.current = swiper;
                    setIndex(swiper.realIndex);
                  }}
                  onSlideChange={(swiper) => setIndex(swiper.realIndex)}
                  className="h-full w-full"
                >
                  {note.images.map((src, i) => (
                    <SwiperSlide key={`${src}-${i}`} className="flex h-full w-full items-center justify-center bg-black">
                      <ResilientImage
                        src={src}
                        alt={note.title}
                        fallbackTitle={note.title}
                        fit="contain"
                        interactive={false}
                        className="h-full w-full"
                      />
                    </SwiperSlide>
                  ))}
                </Swiper>

                {note.images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => goRelative(-1)}
                      aria-label="上一张"
                      className="absolute left-5 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white ring-1 ring-white/15 backdrop-blur-md transition-colors hover:bg-black/70 md:h-14 md:w-14"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => goRelative(1)}
                      aria-label="下一张"
                      className="absolute right-5 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white ring-1 ring-white/15 backdrop-blur-md transition-colors hover:bg-black/70 md:h-14 md:w-14"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              {/* 底部缩略图轮播：独立占一行，不再遮挡主图 */}
              {note.images.length > 1 && (
                <div className="hidden shrink-0 border-t border-white/10 bg-black/80 px-4 py-3 backdrop-blur-md md:block">
                  <div className="flex items-center gap-2">
                    <div
                      className="min-w-0 flex-1 overflow-x-auto [&::-webkit-scrollbar]:hidden"
                      style={{ scrollbarWidth: 'none' }}
                    >
                      <div className="mx-auto flex w-max items-center justify-center gap-2">
                        {note.images.map((url, i) => (
                          <button
                            key={i}
                            ref={(node) => { thumbRefs.current[i] = node; }}
                            type="button"
                            onClick={() => {
                              setIndex(i);
                              swiperRef.current?.slideToLoop(i);
                            }}
                            aria-label={`查看第 ${i + 1} 张图片`}
                            aria-current={i === index}
                            className={`relative flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/5 transition-all ${
                              i === index ? 'opacity-100' : 'opacity-60 hover:opacity-100'
                            }`}
                          >
                            <ResilientImage
                              src={url}
                              alt=""
                              interactive={false}
                              fit="contain"
                              className="h-full w-full"
                            />
                            {i === index && (
                              <>
                                <span className="absolute inset-0 bg-[#0071E3]/25" />
                                <span className="absolute inset-0 flex items-center justify-center">
                                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0071E3] text-white shadow-[0_4px_12px_rgba(0,0,0,0.4)] ring-2 ring-white/80">
                                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                                  </span>
                                </span>

                              </>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[11px] tabular-nums text-white/90 ring-1 ring-white/10">
                      {index + 1}/{note.images.length}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 右：正文与互动；移动端正文隐藏，仅保留底部悬浮操作栏 */}
            <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col md:static md:z-auto md:min-w-0 md:flex-1">
              {renderHeader(false)}

              <div className={`hidden md:block md:min-h-0 md:overflow-y-auto md:px-8 md:py-7 ${commentsEnabled ? 'md:max-h-[42%]' : 'md:flex-1'}`}>
                <h2 className="text-[22px] font-semibold leading-[1.35] tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
                  {note.title}
                </h2>
                {note.content &&
                  note.content.split('\n').filter(Boolean).map((line, i) => (
                    <p
                      key={i}
                      // break-words + anywhere：长串英文 / 链接也不会横向溢出
                      className="mt-3 text-[14px] leading-[1.9] whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[#3A3A3C] dark:text-[#D1D1D6]"
                    >
                      {line}
                    </p>
                  ))}
                <p className="mt-3 text-[11px] text-[#AEAEB2]">
                  {note.date}
                  {note.location ? ` · ${note.location}` : ''}
                </p>
              </div>

              {/* PC 端图文右侧评论栏 */}
              {commentsEnabled && (
                <div className="hidden md:flex md:min-h-0 md:flex-1 md:border-t md:border-black/[0.06] md:dark:border-white/[0.08]">
                  <CommentPanel
                    embedded
                    open={!!note}
                    targetType="IMAGE_TEXT"
                    targetId={note?.id || ''}
                    onClose={() => {}}
                  />
                </div>
              )}

              <div className="shrink-0 flex h-14 items-center justify-around border-t border-transparent bg-transparent px-4 text-white md:h-16 md:justify-start md:gap-2 md:border-black/[0.06] md:bg-transparent md:px-7 md:text-[#1D1D1F] md:dark:border-white/[0.08] md:dark:text-[#F5F5F7]">
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
                  {note.favoriteCount ?? 0}
                </button>

                {commentsEnabled && (
                  <button
                    type="button"
                    onClick={() => setCommentOpen(true)}
                    aria-label="查看评论"
                    className="flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] text-white/85 hover:bg-white/10 transition-colors md:hidden"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {note.commentCount ?? 0}
                  </button>
                )}

              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <CommentPanel
        open={commentOpen && !!note}
        targetType="IMAGE_TEXT"
        targetId={note?.id || ''}
        onClose={() => setCommentOpen(false)}
      />
    </>
  );
}

export default NoteDetail;
