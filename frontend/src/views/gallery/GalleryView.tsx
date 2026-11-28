import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronLeft, ChevronRight, Heart, Images, Star } from 'lucide-react';
import type { PhotoItem } from '../../types/content';
import { SWIFTUI_SMOOTH, SWIFTUI_SNAPPY } from '../../lib/motion';
import { ResilientImage } from '../../components/ResilientImage';
import { EmptyState } from '../../components/PortalStates';
import { ContentSection } from '../../components/ContentSection';
import { TimeSortButton, sortByTime, type TimeSortOrder } from '../../components/TimeSortButton';
import NoteDetail from '../../components/NoteDetail';

interface GalleryViewProps {
  photos: PhotoItem[];
  categories?: string[];
  category: string;
  onCategoryChange: (category: string) => void;
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
  saved: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
  onOpen: () => void;
}

/**
 * 小红书式笔记卡片
 * - 图片原始比例展示（不裁切、不留底色），瀑布流自然错落
 * - 多图可左右拖动 / 点击箭头切换
 * - 底部标题 + 作者 + 点赞，整体紧凑
 */
function NoteCard({ note, index, liked, saved, onToggleLike, onToggleSave, onOpen }: NoteCardProps) {
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
      className="break-inside-avoid pb-2"
    >
      {/* 图片：竖版 3:4，小红书图文的标准比例；卡片大小由列宽控制 */}
      <div
        ref={containerRef}
        className="group relative w-full overflow-hidden rounded-app bg-app-surface dark:bg-app-card"
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

        {/* 桌面端左右箭头：悬停时出现，移动端仍用滑动切换 */}
        {total > 1 && (
          <>
            <button
              type="button"
              aria-label="上一张"
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                goTo(active - 1);
              }}
              className="absolute left-2 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 shadow-md backdrop-blur-sm transition-opacity hover:bg-black/70 focus-visible:opacity-100 focus:outline-none md:flex group-hover:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="下一张"
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                goTo(active + 1);
              }}
              className="absolute right-2 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 shadow-md backdrop-blur-sm transition-opacity hover:bg-black/70 focus-visible:opacity-100 focus:outline-none md:flex group-hover:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}

        {/* 喜欢 / 收藏控件 */}
        <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1.5">
          <button
            type="button"
            aria-label={liked ? '取消喜欢' : '喜欢'}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onToggleLike();
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-colors ${
              liked
                ? 'bg-[#FF2C55]/25 text-[#FF6B7E] ring-1 ring-[#FF2C55]/60'
                : 'bg-black/45 text-white hover:bg-black/70'
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            aria-label={saved ? '取消收藏' : '收藏'}
            onPointerDown={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onToggleSave();
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-colors ${
              saved
                ? 'bg-app-favorite/25 text-app-favorite ring-1 ring-app-favorite/60'
                : 'bg-black/45 text-white hover:bg-black/70'
            }`}
          >
            <Star className={`h-3.5 w-3.5 ${saved ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* 图片底部压暗：桌面端叠加文字才需要 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-1/2 bg-gradient-to-t from-black/75 via-black/30 to-transparent md:block" />

        {/* 标题 + 描述：移动端不显示，桌面端左下角显示 */}
        <div className="pointer-events-none absolute inset-x-2 bottom-2 hidden md:block">
          <p className="line-clamp-2 text-[17px] font-semibold leading-[1.35] text-white drop-shadow-sm">
            {note.title}
          </p>
          {note.content && (
            <p className="mt-1 line-clamp-2 text-[13px] leading-[1.5] text-white/85 drop-shadow-sm">
              {note.content}
            </p>
          )}
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
  category,
  onCategoryChange,
  savedIds,
  likedIds,
  searchQuery = '',
  onToggleSave,
  onToggleLike,
  externalSelectedId,
  onClearExternalSelection,
}: GalleryViewProps) {
  const album = category || ALL;
  const [sortOrder, setSortOrder] = useState<TimeSortOrder>('DESC');
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
  // 分类已由后端筛选，这里只处理时间排序与搜索关键词
  const list = useMemo(
    () =>
      sortByTime(photos, sortOrder).filter((note) =>
        !query ||
        note.title.toLowerCase().includes(query) ||
        (note.content ?? '').toLowerCase().includes(query)
      ),
    [photos, query, sortOrder]
  );

  const activeNote = useMemo(() => {
    const id = externalSelectedId || activeId;
    return id ? photos.find((note) => note.id === id) ?? null : null;
  }, [photos, activeId, externalSelectedId]);

  return (
    <ContentSection aria-label="图文笔记">
      {/* 顶部分类：PC 端间距按断点递进 6/8/12/16px，移动端保持原刻度 */}
      <div className="sticky top-14 z-10 border-b border-app-border bg-app-filter/95 px-2 backdrop-blur-xl">
        <div className="flex items-center gap-2 py-2">
          <div
            role="tablist"
            aria-label="图文分类"
            className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {chips.map((item) => {
              const active = album === item;
              return (
                <button
                  key={item}
                  type="button"
                  // 全部也走一次后端请求，等价于刷新当前板块
                  onClick={() => onCategoryChange(item)}
                  aria-pressed={active}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] transition-colors ${
                    active
                      ? 'bg-app-primary font-medium text-white dark:bg-app-card dark:text-app-text'
                      : 'bg-black/[0.04] text-app-muted hover:bg-black/[0.07] dark:bg-white/[0.08] dark:text-app-muted'
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <TimeSortButton order={sortOrder} onChange={setSortOrder} className="hidden md:flex" />
        </div>
      </div>

      {/* 瀑布流：CSS columns，小红书同款自然错落 */}
      {list.length === 0 ? (
        <EmptyState
          icon={Images}
          title="还没有笔记"
          description={album === ALL && !query ? '内容发布后将在这里显示' : '换个分类或关键词试试'}
        />
      ) : (
        /* 小红书桌面端约 5 列，卡片宽 ≈ 350px；列数更多卡片自然更小 */
        <div className="mt-2 columns-2 gap-2 px-2 sm:columns-3 md:columns-4 lg:columns-5 2xl:columns-6">
          <AnimatePresence mode="popLayout">
            {list.map((note, idx) => (
              <NoteCard
                key={note.id}
                note={note}
                index={idx}
                liked={likedIds.includes(note.id)}
                saved={savedIds.includes(note.id)}
                onToggleLike={() => onToggleLike(note.id)}
                onToggleSave={() => handleToggleSave(note.id)}
                onOpen={() => {
                  setActiveId(note.id);
                  onClearExternalSelection?.();
                }}
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
              className="flex items-center gap-2 whitespace-nowrap rounded-full bg-app-primary/90 px-4 py-2 text-[13px] font-medium text-app-primary-fg shadow-lg backdrop-blur-md"
            >
              <Check className="h-4 w-4" />
              {saveToast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ContentSection>
  );
}
