import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { LayoutGrid, Moon, Rows3, Search, Sun, X } from 'lucide-react';
import { SWIFTUI_SMOOTH } from '../../lib/motion';
import { AccountMenu, type AccountMenuProps } from '../../components/AccountMenu';
import { Tooltip } from '../../components/Tooltip';
import { useSystemInfo } from '../../lib/systemInfo';

interface MainHeaderProps {
  searchQuery: string;
  onChangeSearch: (value: string) => void;
  /** 移动端点击搜索图标进入独立搜索模块 */
  onOpenSearch: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  account: AccountMenuProps;
  /** 移动端首页（视频板块）：顶栏透明悬浮在视频上方 */
  overlay?: boolean;
  /** 移动端卡片模式：顶栏占据空间，且背景始终纯黑 */
  solidBlack?: boolean;
  /** 移动端首页：顶栏搜索旁显示视图切换按钮 */
  showViewToggle?: boolean;
  /** 文章板块使用页面底色，与分类筛选区、卡片区域区分 */
  sectionBackground?: 'default' | 'page';
  /** PC 沉浸模式：顶栏悬浮在视频上方，不占文档流位置 */
  pcImmersive?: boolean;
  /** 移动端视频沉浸流：导航显隐使用过渡动画 */
  chromeAnimated?: boolean;
  viewMode?: 'feed' | 'grid';
  onToggleViewMode?: () => void;
  /** PC 沉浸模式分类条：放顶栏左侧，与搜索框同排 */
  feedCategories?: string[];
  feedCategory?: string;
  onFeedCategoryChange?: (category: string) => void;
  playlistOpen?: boolean;
  onTogglePlaylist?: () => void;
}

export function MainHeader({
  searchQuery,
  onChangeSearch,
  onOpenSearch,
  isDark,
  onToggleTheme,
  account,
  overlay = false,
  solidBlack = false,
  showViewToggle = false,
  sectionBackground = 'default',
  pcImmersive = false,
  chromeAnimated = false,
  viewMode = 'feed',
  onToggleViewMode,
  feedCategories = [],
  feedCategory = '全部',
  onFeedCategoryChange,
  playlistOpen = false,
  onTogglePlaylist,
}: MainHeaderProps) {
  const { title } = useSystemInfo();
  // 搜索框草稿：输入只改 draft，点搜索按钮 / Enter 才提交为真正的查询
  const [draft, setDraft] = useState(searchQuery);
  useEffect(() => setDraft(searchQuery), [searchQuery]);

  const submitSearch = () => onChangeSearch(draft.trim());
  const clearSearch = () => {
    setDraft('');
    onChangeSearch('');
  };

  const shellClass = pcImmersive
    ? 'fixed top-0 right-0 md:left-20 lg:left-60 z-40 bg-gradient-to-b from-black/65 via-black/25 to-transparent'
    : solidBlack
      ? 'sticky top-0 z-30 border-b border-white/10 bg-black/55 backdrop-blur-xl'
      : overlay
        ? 'fixed inset-x-0 top-0 z-30 bg-black/55 backdrop-blur-xl md:sticky md:z-20 md:border-b md:border-app-border dark:md:border-white/[0.08] md:bg-app-surface/85 dark:md:bg-[#0A0A0C]/85 md:backdrop-blur-xl'
        : sectionBackground === 'page'
          ? 'sticky top-0 z-20 border-b border-app-border bg-app-header backdrop-blur-xl'
          : 'sticky top-0 z-20 border-b border-app-border bg-app-surface/85 dark:bg-app-bg/85 backdrop-blur-xl';

  const iconClass = pcImmersive || solidBlack || overlay
    ? 'text-white hover:bg-white/15'
    : 'text-app-text hover:bg-black/[0.05] dark:hover:bg-white/[0.08]';

  return (
    <motion.header
      initial={chromeAnimated ? { y: -20, opacity: 0 } : false}
      animate={chromeAnimated ? { y: 0, opacity: 1 } : undefined}
      exit={chromeAnimated ? { y: -20, opacity: 0 } : undefined}
      transition={SWIFTUI_SMOOTH}
      className={`h-14 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 transition-colors duration-300 ease-out ${shellClass}`}
    >
      {/* Left: 移动端品牌 / PC 沉浸模式分类条（与搜索框同排） */}
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`md:hidden text-base font-semibold tracking-tight ${
            pcImmersive || overlay || solidBlack ? 'text-white drop-shadow' : 'text-app-text'
          }`}
        >
          {title}
        </span>
        {pcImmersive && (
          <div className="hidden md:flex min-w-0 items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div role="tablist" aria-label="视频分类" className="flex items-center gap-1">
              {(['全部', ...feedCategories] as const).map((item) => {
                const active = feedCategory === item;
                return (
                  <button
                    key={item}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onFeedCategoryChange?.(item)}
                    className={`shrink-0 rounded-app px-3 py-1.5 text-xs font-medium transition-colors ${
                      active
                        ? 'bg-app-card text-app-text'
                        : 'text-white/75 hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Center: 桌面端内联搜索框（移动端改为图标入口） */}
      <div className="hidden md:block flex-1 max-w-md">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-app-muted absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                submitSearch();
              }
            }}
            placeholder="搜索视频、文章、作品或留言"
            aria-label="搜索内容"
            className={`w-full h-9 pl-9 pr-[4.5rem] rounded-full border border-transparent focus:border-app-primary/40 focus:outline-none transition-colors text-xs sm:text-sm ${
              pcImmersive
                ? 'bg-white/15 backdrop-blur-md text-white placeholder:text-white/60 focus:bg-white/25'
                : 'bg-app-surface dark:bg-app-card focus:bg-app-card dark:focus:bg-app-surface text-app-text placeholder:text-app-muted'
            }`}
          />
          {draft && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="清空搜索"
              className="absolute right-10 w-5 h-5 rounded-full flex items-center justify-center text-app-muted hover:text-app-text dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={submitSearch}
            aria-label="搜索"
            title="搜索"
            className="absolute right-1.5 w-7 h-7 rounded-full bg-app-primary hover:bg-app-primary text-white flex items-center justify-center transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Right: Playlist Toggle + Mobile Search Entry + View Toggle + Theme Toggle + Account */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {pcImmersive && onTogglePlaylist && (
          <button
            type="button"
            onClick={onTogglePlaylist}
            aria-label={playlistOpen ? '收起播放列表' : '展开播放列表'}
            title={playlistOpen ? '收起播放列表' : '播放列表'}
            aria-pressed={playlistOpen}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-app transition-colors ${
              playlistOpen
                ? 'bg-app-card text-app-text'
                : iconClass
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        )}
        {showViewToggle && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onToggleViewMode}
            aria-label={viewMode === 'feed' ? '切换到网格视图' : '切换到刷看视图'}
            className={`md:hidden w-9 h-9 flex items-center justify-center rounded-full transition-colors ${iconClass}`}
          >
            {viewMode === 'feed' ? (
              <Rows3 className="w-4 h-4" />
            ) : (
              <LayoutGrid className="w-4 h-4" />
            )}
          </motion.button>
        )}
        <Tooltip label="搜索" side="bottom">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onOpenSearch}
            aria-label="搜索"
            className={`md:hidden w-9 h-9 flex items-center justify-center rounded-full transition-colors ${iconClass}`}
          >
            <Search className="w-4 h-4" />
          </motion.button>
        </Tooltip>
        <Tooltip label={isDark ? '浅色外观' : '深色外观'} side="bottom">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onToggleTheme}
            aria-label={isDark ? '切换至浅色外观' : '切换至深色外观'}
            className={`hidden md:flex w-9 h-9 items-center justify-center rounded-full transition-colors ${iconClass}`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </motion.button>
        </Tooltip>
        <AccountMenu {...account} overlay={pcImmersive || overlay || solidBlack} />
      </div>
    </motion.header>
  );
}
