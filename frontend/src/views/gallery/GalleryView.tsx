import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Heart, Plus } from 'lucide-react';
import type { PhotoItem } from '../../data/content';
import { SWIFTUI_BOUNCY, SWIFTUI_SMOOTH } from '../../lib/motion';
import { ResilientImage } from '../../components/ResilientImage';
import { NoteComposer } from './NoteComposer';
import { NoteDetail } from './NoteDetail';

interface GalleryViewProps {
  photos: PhotoItem[];
  categories?: string[];
  savedIds: string[];
  likedIds: string[];
  searchQuery?: string;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  /** 发布成功后的刷新回调 */
  onPublished?: () => void;
  /** 当前用户昵称，用于新笔记署名 */
  currentUserName?: string;
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
  onOpen: () => void;
  onToggleLike: () => void;
}

/**
 * 小红书式笔记卡片
 * - 图片原始比例展示（不裁切、不留底色），瀑布流自然错落
 * - 多图可左右拖动 / 点击箭头切换
 * - 底部标题 + 作者 + 点赞，整体紧凑
 */
function NoteCard({ note, index, liked, onOpen, onToggleLike }: NoteCardProps) {
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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ ...SWIFTUI_SMOOTH, delay: Math.min(index, 10) * 0.025 }}
      className="mb-2 break-inside-avoid"
    >
      {/* 图片区：无圆角包裹、无边框，就是一张图（小红书原样） */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-lg bg-[#F5F5F7] dark:bg-[#1C1C1E]"
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

        {/* 多图角标：右上角「1/3」 */}
        {total > 1 && (
          <span className="absolute right-2 top-2 rounded-full bg-black/40 px-1.5 py-[1px] text-[10px] font-medium text-white backdrop-blur-sm tabular-nums">
            {active + 1}/{total}
          </span>
        )}

        {/* 图片底部压暗：让覆盖在图片上的标题与点赞始终清晰 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />

        {/* 标题 + 描述：左下角，标题更大，描述紧贴其下 */}
        <div className="pointer-events-none absolute inset-x-2 bottom-2 pr-9">
          <p className="line-clamp-2 text-[15px] font-semibold leading-[1.35] text-white drop-shadow-sm">
            {note.title}
          </p>
          {note.content && (
            <p className="mt-0.5 line-clamp-2 text-[11px] leading-[1.5] text-white/80 drop-shadow-sm">
              {note.content}
            </p>
          )}
        </div>

        {/* 点赞：右下角（不参与拖拽/打开详情） */}
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
          className="absolute bottom-2 right-2 flex items-center gap-0.5 rounded-full px-1 text-[11px] font-medium text-white tabular-nums drop-shadow-sm"
        >
          <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-[#FF2442] text-[#FF2442]' : ''}`} />
          {(note.likeCount || 0) + (liked ? 1 : 0) || ''}
        </motion.button>
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
  onPublished,
  currentUserName,
  externalSelectedId,
  onClearExternalSelection,
}: GalleryViewProps) {
  const [album, setAlbum] = useState<string>(ALL);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);

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
      {/* 顶部分类：小红书式的横向 chip 条，吸顶滚动 */}
      <div className="sticky top-14 z-20 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 bg-[#FBFBFD]/95 dark:bg-black/95 px-4 sm:px-6 lg:px-8 xl:px-10 backdrop-blur-xl">
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
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-[#FF2442] px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#e81f3b]"
          >
            <Plus className="h-3.5 w-3.5" />
            发布
          </button>
        </div>
      </div>

      {/* 瀑布流：CSS columns，小红书同款自然错落 */}
      {list.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-[13px] text-[#86868B]">还没有笔记，发布第一篇试试。</p>
        </div>
      ) : (
        <div className="columns-2 gap-2 md:columns-3 lg:columns-4 xl:columns-5">
          <AnimatePresence mode="popLayout">
            {list.map((note, idx) => (
              <NoteCard
                key={note.id}
                note={note}
                index={idx}
                liked={likedIds.includes(note.id)}
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
        onToggleSave={() => activeNote && onToggleSave(activeNote.id)}
        onClose={() => {
          setActiveId(null);
          onClearExternalSelection?.();
        }}
      />

      <NoteComposer
        open={composerOpen}
        authorName={currentUserName}
        onClose={() => setComposerOpen(false)}
        onPublished={() => onPublished?.()}
      />
    </section>
  );
}
