import { AnimatePresence, motion } from 'motion/react';
import { EmptyState } from '../../components/PortalStates';
import { ResilientImage } from '../../components/ResilientImage';
import { SWIFTUI_SMOOTH } from '../../lib/motion';
import { FavoriteDetailModal } from '../shared/FavoriteDetailModal';
import { KIND_META, TABS, useFavoritesModel, type FavoritesViewProps } from './favoritesModel';

/** 移动端收藏/喜欢列表：固定两列布局，不使用桌面响应式分支 */
export function FavoritesMobileView(props: FavoritesViewProps) {
  const {
    meta,
    mode,
    tab,
    setTab,
    counts,
    visibleEntries,
    emptyHint,
    activeTarget,
    onToggle,
    openItem,
    closeItem,
  } = useFavoritesModel(props);

  return (
    <>
      <section
        aria-labelledby={`${mode}-mobile-heading`}
        className="space-y-4 bg-app-card p-2 dark:bg-app-card"
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <h2
              id={`${mode}-mobile-heading`}
              className="text-[18px] font-bold text-app-text"
            >
              {meta.heading}
            </h2>
            <p className="text-xs text-app-muted">
              共 {counts.all} 条
            </p>
          </div>

          <div
            role="tablist"
            aria-label={`${meta.heading}类型筛选`}
            className="flex w-full items-center gap-1 rounded-[6px] bg-app-surface p-1 dark:bg-app-surface"
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
                  className={`relative flex-1 px-1 py-1.5 text-[12px] font-medium transition-colors ${
                    isActive
                      ? 'text-app-text'
                      : 'text-app-subtle dark:text-app-muted hover:text-app-text dark:hover:text-app-text'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId={meta.indicator}
                      transition={SWIFTUI_SMOOTH}
                      className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-app-primary"
                    />
                  )}
                  <span className="relative">
                    {item.label}
                    <span className="ml-0.5 tabular-nums opacity-60">{counts[item.id]}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          {visibleEntries.length === 0 ? (
            <motion.div
              key={`${mode}-mobile-empty-${tab}`}
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
              key={`${mode}-mobile-${tab}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={SWIFTUI_SMOOTH}
              className="grid grid-cols-2 gap-2"
            >
              {visibleEntries.map((entry) => {
                const { label, Icon } = KIND_META[entry.kind];
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
                      className={`absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full ring-1 backdrop-blur-md transition-colors ${
                        mode === 'favorite'
                          ? 'bg-app-favorite/25 text-app-favorite ring-app-favorite/60 hover:bg-app-favorite/35'
                          : 'bg-[#FF2C55]/25 text-[#FF6B7E] ring-[#FF2C55]/60 hover:bg-[#FF2C55]/35'
                      }`}
                    >
                      <meta.RemoveIcon className="h-3.5 w-3.5 fill-current" />
                    </button>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </section>

      <FavoriteDetailModal
        target={activeTarget}
        onClose={closeItem}
        onRemove={onToggle}
        removeLabel={meta.removeLabel}
        removeIcon={mode === 'like' ? 'heart' : 'star'}
      />
    </>
  );
}
