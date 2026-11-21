import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Heart, MessageCircle, Share2, X } from 'lucide-react';
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

  // 切换笔记时重置到第一张
  useEffect(() => {
    setIndex(0);
  }, [note?.id]);

  useEffect(() => {
    if (!note) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') setIndex((i) => (i - 1 + note.images.length) % note.images.length);
      if (event.key === 'ArrowRight') setIndex((i) => (i + 1) % note.images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [note, onClose]);

  return (
    <AnimatePresence>
      {note && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-6"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={note.title}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={SWIFTUI_SMOOTH}
            onClick={(event) => event.stopPropagation()}
            className="w-full sm:max-w-4xl h-full sm:h-[min(88vh,760px)] bg-white dark:bg-[#161618] sm:rounded-3xl overflow-hidden flex flex-col md:flex-row shadow-2xl"
          >
            {/* 左：图片轮播
                容器按竖图比例留位，图片 contain 完整显示，不裁切也不被压小 */}
            <div className="relative md:w-[54%] shrink-0 bg-black dark:bg-black flex items-center justify-center overflow-hidden">
              <div className="relative h-[46vh] md:h-full w-full flex items-center justify-center">
                {/* 尺寸约束放在外层容器：ResilientImage 自身是 w-full h-full，
                    直接给它 max-h 不生效，会导致图片被裁剪 */}
                <div className="relative h-full w-full">
                  <ResilientImage
                    src={note.images[Math.min(index, note.images.length - 1)]}
                    alt={note.title}
                    fallbackTitle={note.title}
                    fit="contain"
                    interactive={false}
                    className="w-full h-full"
                  />
                </div>

                {note.images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIndex((i) => (i - 1 + note.images.length) % note.images.length)}
                      aria-label="上一张"
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIndex((i) => (i + 1) % note.images.length)}
                      aria-label="下一张"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center backdrop-blur-sm transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    {/* 页码圆点 */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
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
            </div>

            {/* 右：正文与互动 */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="shrink-0 flex items-center justify-between px-5 h-14 border-b border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF2E4D] to-[#FF8A5B] flex items-center justify-center text-[11px] font-semibold text-white shrink-0">
                    {(note.author || '匿').slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] truncate">
                      {note.author || '匿名用户'}
                    </p>
                    <p className="text-[10px] text-[#86868B] truncate">{note.album}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="关闭"
                  className="p-2 rounded-full text-[#86868B] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
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

              <div className="shrink-0 flex items-center justify-around px-4 h-14 border-t border-black/[0.06] dark:border-white/[0.08]">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.88 }}
                  transition={SWIFTUI_BOUNCY}
                  onClick={onToggleLike}
                  aria-pressed={liked}
                  className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] transition-colors ${
                    liked
                      ? 'text-[#FF2E4D] bg-[#FF2E4D]/10'
                      : 'text-[#6E6E73] dark:text-[#98989D] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                  {(note.likeCount || 0) + (liked ? 1 : 0)}
                </motion.button>

                <button
                  type="button"
                  onClick={onToggleSave}
                  aria-pressed={saved}
                  className={`flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] transition-colors ${
                    saved
                      ? 'text-[#0071E3] bg-[#0071E3]/10'
                      : 'text-[#6E6E73] dark:text-[#98989D] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  收藏
                </button>

                <button
                  type="button"
                  onClick={() => void navigator.clipboard?.writeText(`${note.title}\n${note.content || ''}`)}
                  className="flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] text-[#6E6E73] dark:text-[#98989D] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
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
