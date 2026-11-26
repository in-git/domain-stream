import { AnimatePresence, motion } from 'motion/react';
import { Star, Heart } from 'lucide-react';
import { EmptyState } from '../../components/PortalStates';
import { ResilientImage } from '../../components/ResilientImage';
import { ArticleReader } from '../../components/ArticleReader';
import { ImmersiveModal } from '../../components/ImmersiveModal';
import NoteDetail from '../../components/NoteDetail';
import { SWIFTUI_SMOOTH } from '../../lib/motion';
import { KIND_META, TABS, useFavoritesModel, type FavoritesViewProps } from './favoritesModel';

/** PC 端收藏/喜欢列表：固定桌面布局，不使用移动端响应式分支 */
export function FavoritesPCView(props: FavoritesViewProps) {
  const { videos, articles, photos } = props;
  const {
    meta,
    mode,
    tab,
    setTab,
    counts,
    visibleEntries,
    emptyHint,
    activeItem,
    onToggle,
    likedIds,
    savedIds,
    onToggleLike,
    onToggleSave,
    openItem,
    closeItem,
  } = useFavoritesModel(props);

  const activeVideo =
    activeItem?.kind === 'video' ? videos.find((item) => item.id === activeItem.id) : undefined;
  const activePhoto =
    activeItem?.kind === 'graphic' ? photos.find((item) => item.id === activeItem.id) ?? null : null;
  const activeVideoIndex = activeVideo
    ? Math.max(0, videos.findIndex((item) => item.id === activeVideo.id))
    : 0;

  return (
    <>
      <section
        aria-labelledby={`${mode}-pc-heading`}
        className="space-y-6 bg-app-card px-8 py-7 dark:bg-app-card"
      >
        <div className="flex items-center justify-between gap-6">
          <div className="space-y-1">
            <h2
              id={`${mode}-pc-heading`}
              className="text-lg font-semibold tracking-tight text-app-text"
            >
              {meta.heading}
            </h2>
            <p className="text-xs text-app-muted">
              共 {counts.all} 条 · {meta.orderHint}
            </p>
          </div>

          <div
            role="tablist"
            aria-label={`${meta.heading}类型筛选`}
            className="flex items-center gap-1 rounded-full bg-app-surface p-1 dark:bg-app-surface"
          >
            {TABS.map((item) => {
              const isActive = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setTab(item.id)}
                  className={`relative px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? 'text-app-text'
                      : 'text-app-subtle dark:text-app-muted hover:text-app-text dark:hover:text-app-text'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId={meta.indicator}
                      transition={SWIFTUI_SMOOTH}
                      className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-app-primary"
                    />
                  )}
                  <span className="relative">
                    {item.label}
                    <span className="ml-1 tabular-nums opacity-60">{counts[item.id]}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {visibleEntries.length === 0 ? (
            <motion.div
              key={`${mode}-pc-empty-${tab}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={SWIFTUI_SMOOTH}
            >
              <EmptyState
                icon={meta.EmptyIcon}
                title={mode === 'favorite' ? '暂无收藏' : '暂无喜欢'}
                description={emptyHint}
                compact
              />
            </motion.div>
          ) : (
            <motion.ul
              key={`${mode}-pc-${tab}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={SWIFTUI_SMOOTH}
              className="grid grid-cols-4 gap-4"
            >
              {visibleEntries.map((entry) => {
                const { label, Icon } = KIND_META[entry.kind];
                const isFavorite = mode === 'favorite';
                const ToggleIcon = isFavorite ? Star : Heart;
                const activeToggleClass = isFavorite
                  ? 'bg-app-favorite/25 text-app-favorite ring-1 ring-app-favorite/60 hover:bg-app-favorite/35'
                  : 'bg-[#FF2C55]/25 text-[#FF6B7E] ring-1 ring-[#FF2C55]/60 hover:bg-[#FF2C55]/35';
                return (
                  <li
                    key={`${entry.kind}-${entry.id}`}
                    className="group relative overflow-hidden rounded-app bg-[#111111] transition duration-300 hover:-translate-y-0.5"
                  >
                    <button
                      type="button"
                      onClick={() => openItem(entry.kind, entry.id)}
                      className="block w-full text-left"
                      aria-label={`查看${label}：${entry.title}`}
                    >
                      <ResilientImage
                        src={entry.cover}
                        alt={entry.title}
                        fallbackTitle={entry.title}
                        className="aspect-[3/4] w-full transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                      <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-md">
                        <Icon className="h-3 w-3" />
                        {label}
                      </span>
                      <span className="absolute inset-x-0 bottom-0 block p-3">
                        <span className="block text-[13px] font-medium leading-snug text-white line-clamp-2">
                          {entry.title}
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-white/60">
                          {entry.meta}
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggle(entry.id)}
                      aria-label={`${meta.removeLabel}：${entry.title}`}
                      className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-colors ${activeToggleClass}`}
                    >
                      <ToggleIcon className="h-3.5 w-3.5 fill-current" />
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </section>

      {activeItem?.kind === 'article' && (
        <ArticleReader
          articles={articles}
          articleId={activeItem.id}
          likedIds={likedIds}
          savedIds={savedIds}
          onToggleLike={onToggleLike}
          onToggleSave={onToggleSave}
          onClose={closeItem}
        />
      )}

      {activePhoto && (
        <NoteDetail
          note={activePhoto}
          liked={likedIds.includes(activePhoto.id)}
          saved={savedIds.includes(activePhoto.id)}
          onToggleLike={() => onToggleLike(activePhoto.id)}
          onToggleSave={() => onToggleSave(activePhoto.id)}
          onClose={closeItem}
        />
      )}

      {activeVideo && (
        <ImmersiveModal
          videos={videos}
          initialIndex={activeVideoIndex}
          likedIds={likedIds}
          savedIds={savedIds}
          onToggleLike={onToggleLike}
          onToggleSave={onToggleSave}
          onClose={closeItem}
        />
      )}
    </>
  );
}
