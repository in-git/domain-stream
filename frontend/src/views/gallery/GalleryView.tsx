import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Heart, Star } from 'lucide-react';
import type { PhotoItem } from '../../data/content';
import { SWIFTUI_BOUNCY, SWIFTUI_SMOOTH, SWIFTUI_SNAPPY } from '../../lib/motion';
import { ResilientImage } from '../../components/ResilientImage';
import NoteDetail from './NoteDetail';

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

const ALL = '全部';

/** 判定为「滑动」而非「点击」的位移阈值（px） */
const SWIPE_THRESHOLD = 30;

/* ------------------------------------------------------------------ */
/* 笔记卡片（小红书版式）                                              */
/* ------------------------------------------------------------------ */

interface NoteCardProps {
  note: PhotoItem;
  index: number;
  liked: boolean;
  /** 是否已收藏，决定收藏图标的状态 */
  saved: boolean;
  onOpen: () => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
}

/**
 * 小红书式笔记卡片
 * - 图片原始比例展示（不裁切、不留底色），瀑布流自然错落
 * - 多图可左右拖动 / 点击箭头切换
 * - 底部标题 + 作者 + 点赞，整体紧凑
 */
function NoteCard({ note, index, liked, saved, onOpen, onToggleLike, onToggleSave }: NoteCardProps) {
  const [active, setActive] = useState(0);
  const total = note.images.length;
  const containerRef = useRef<HTMLDivElement>(null);

  const dragStartX = useRef<number | null>(null);
  const dragged = useRef(false);
  const [dragDelta, setDragDelta] = useState(0);
  const [width, setWidth] = useState(0);

  const goTo = (next: number) => setActive(((next % total) + total) % total);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new ResizeObserver(() => setWidth(node.clientWidth));
    observer.observe(node);
    setWidth(node.clientWidth);
    return () => observer.disconnect();
  }, []);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (total <= 1) return;
    dragStartX.current = event.clientX;
    dragged.current = false;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStartX.current === null) return;
    const delta = event.clientX - dragStartX.current;
    if (Math.abs(delta) > 6) dragged.current = true;
    setDragDelta(delta);
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLDivElement>) {
    if (dragStartX.current === null) return;
    const delta = dragDelta;
    dragStartX.current = null;
    setDragDelta(0);
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (Math.abs(delta) >= SWIPE_THRESHOLD) {
      goTo(delta < 0 ? active + 1 : active - 1);
      window.setTimeout(() => {
        dragged.current = false;
      }, 0);
    } else {
      dragged.current = false;
    }
  }

  const trackOffset = -(active * 100) + (width ? (dragDelta / width) * 100 : 0);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ ...SWIFTUI_SMOOTH, delay: Math.min(index, 10) * 0.02 }}
      className="break-inside-avoid pb-4"
    >
      {/* 图片：竖版 3:4，小红书图文的标准比例；卡片大小由列宽控制 */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg bg-[#F2F2F7] dark:bg-[#1C1C1E]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onClick={() => {
          if (dragged.current) return;
          onOpen();
        }}
        style={{ aspectRatio: '3 / 4', touchAction: total > 1 ? 'pan-y' : undefined, userSelect: 'none' }}
      >
        <div
          className="absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${total}, 100%)`,
            gridTemplateRows: '100%',
            transform: `translate3d(${trackOffset}%, 0, 0)`,
            transition:
              dragStartX.current === null ? 'transform 300ms cubic-bezier(0.25,0.8,0.25,1)' : 'none',
          }}
        >
          {note.images.map((url, i) => (
            <div
              key={`${url}-${i}`}
              aria-hidden={i !== active}
              className="relative overflow-hidden"
              style={{ gridColumn: i + 1, gridRow: 1 }}
            >
              <ResilientImage
                src={url}
                alt={i === active ? note.title : ''}
                fallbackTitle={note.title}
                fit="cover"
                className="w-full h-full select-none pointer-events-none"
                draggable={false}
              />
            </div>
          ))}
        </div>

        {/* 多图角标 */}
        {total > 1 && (
          <span className="absolute right-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-[12px] font-medium text-white backdrop-blur-sm tabular-nums">
            {active + 1}/{total}
          </span>
        )}

        {/* 图片底部压暗：桌面端叠加文字才需要 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-1/2 bg-gradient-to-t from-black/75 via-black/30 to-transparent md:block" />

        {/* 标题 + 描述：移动端不显示，桌面端左下角显示 */}
        <div className="pointer-events-none absolute inset-x-3 bottom-6 right-16 hidden md:block">
          <p className="line-clamp-2 text-[17px] font-semibold leading-[1.35] text-white drop-shadow-sm">
            {note.title}
          </p>
          {note.content && (
            <p className="mt-1 line-clamp-2 text-[13px] leading-[1.5] text-white/85 drop-shadow-sm">
              {note.content}
            </p>
          )}
        </div>

        {/* 点赞 / 收藏：右下角竖向排列，按钮 42px，间距收紧 */}
        <div className="absolute bottom-6 right-2 flex flex-col items-center gap-1 text-white">
          <motion.button
            type="button"
            whileTap={{ scale: 0.85 }}
            transition={SWIFTUI_BOUNCY}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onToggleLike();
            }}
            aria-pressed={liked}
            aria-label={liked ? '取消点赞' : '点赞'}
            className="flex h-[42px] w-[42px] flex-col items-center justify-center drop-shadow-sm"
          >
            <Heart
              className={`h-4 w-4 ${liked ? 'fill-[#FF2442] text-[#FF2442]' : ''}`}
              strokeWidth={1.8}
            />
            <span className="mt-0.5 text-[11px] font-medium leading-none tabular-nums">
              {note.likeCount || ''}
            </span>
          </motion.button>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onToggleSave();
            }}
            aria-pressed={saved}
            aria-label={saved ? '取消收藏' : '收藏'}
            className="flex h-[42px] w-[42px] items-center justify-center drop-shadow-sm"
          >
            <Star
              className={`h-4 w-4 ${saved ? 'fill-[#FFB300] text-[#FFB300]' : ''}`}
              strokeWidth={1.8}
            />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

/* ------------------------------------------------------------------ */
/* 列表                                                                */
/* ------------------------------------------------------------------ */

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
  const [album, setAlbum] = useState<string>(ALL);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  useEffect(() => {
    if (!saveToast) return;
    const timer = window.setTimeout(() => setSaveToast(null), 2000);
    return () => window.clearTimeout(timer);
  }, [saveToast]);

  /** 收藏 / 取消收藏：切换状态并给出轻提示（卡片与详情共用） */
  function handleToggleSave(noteId: string) {
    const wasSaved = savedIds.includes(noteId);
    onToggleSave(noteId);
    setSaveToast(wasSaved ? '已取消收藏' : '已收藏');
  }

  // 分类标签：全部 + 数据里出现的分类
  const chips = useMemo(() => {
    const fromData = photos.map((p) => p.album).filter(Boolean);
    const merged = Array.from(new Set([...(categories ?? []), ...fromData]));
    return [ALL, ...merged.slice(0, 12)];
  }, [categories, photos]);

  const query = searchQuery.trim().toLowerCase();
  const list = useMemo(
    () =>
      photos.filter((note) => {
        const okAlbum = album === ALL || note.album === album;
        const okQuery =
          !query ||
          note.title.toLowerCase().includes(query) ||
          (note.content ?? '').toLowerCase().includes(query);
        return okAlbum && okQuery;
      }),
    [photos, album, query]
  );

  const activeNote = useMemo(() => {
    const id = externalSelectedId || activeId;
    return id ? photos.find((note) => note.id === id) ?? null : null;
  }, [photos, activeId, externalSelectedId]);

  return (
    <section aria-label="图文笔记" className="space-y-3">
      {/* 顶部分类：小红书式的横向 chip 条，吸顶滚动。
          层级压到 z-10，必须低于 Header(z-20) 与账号下拉弹层(z-100)，
          否则会盖住右上角的个人信息菜单 */}
      <div className="sticky top-14 z-10 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 bg-[#FBFBFD]/95 dark:bg-black/95 px-4 sm:px-6 lg:px-8 xl:px-10 backdrop-blur-xl">
        <div className="flex items-center gap-2 overflow-x-auto py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map((item) => {
            const active = album === item;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setAlbum(item)}
                aria-pressed={active}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] transition-colors ${
                  active
                    ? 'bg-[#1D1D1F] font-medium text-white dark:bg-white dark:text-[#1D1D1F]'
                    : 'bg-black/[0.04] text-[#6E6E73] hover:bg-black/[0.07] dark:bg-white/[0.08] dark:text-[#98989D]'
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {/* 瀑布流：CSS columns，小红书同款自然错落 */}
      {list.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-[13px] text-[#86868B]">还没有笔记。</p>
        </div>
      ) : (
        /* 小红书桌面端约 5 列，卡片宽 ≈ 350px；列数更多卡片自然更小 */
        <div className="columns-2 gap-2.5 sm:columns-3 md:columns-4 lg:columns-5 2xl:columns-6">
          <AnimatePresence mode="popLayout">
            {list.map((note, idx) => (
              <NoteCard
                key={note.id}
                note={note}
                index={idx}
                liked={likedIds.includes(note.id)}
                saved={savedIds.includes(note.id)}
                onToggleSave={() => handleToggleSave(note.id)}
                onOpen={() => {
                  setActiveId(note.id);
                  onClearExternalSelection?.();
                }}
                onToggleLike={() => onToggleLike(note.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <NoteDetail
        note={activeNote}
        liked={activeNote ? likedIds.includes(activeNote.id) : false}
        saved={activeNote ? savedIds.includes(activeNote.id) : false}
        onToggleLike={() => activeNote && onToggleLike(activeNote.id)}
        onToggleSave={() => activeNote && handleToggleSave(activeNote.id)}
        onClose={() => {
          setActiveId(null);
          onClearExternalSelection?.();
        }}
      />

      {/* 收藏反馈 toast：外层负责定位，内层做动画，避免 transform 冲突 */}
      <div className="pointer-events-none fixed bottom-24 left-1/2 z-[60] -translate-x-1/2">
        <AnimatePresence>
          {saveToast && (
            <motion.div
              key={saveToast}
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={SWIFTUI_SNAPPY}
              className="flex items-center gap-2 whitespace-nowrap rounded-full bg-[#1D1D1F]/90 px-4 py-2 text-[13px] font-medium text-white shadow-lg backdrop-blur-md dark:bg-white/90 dark:text-[#1D1D1F]"
            >
              <Check className="h-4 w-4" />
              {saveToast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
