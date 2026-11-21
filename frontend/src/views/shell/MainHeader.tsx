import { motion } from 'motion/react';
import { LayoutGrid, Moon, Rows3, Search, Sun, X } from 'lucide-react';
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
  viewMode?: 'feed' | 'grid';
  onToggleViewMode?: () => void;
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
  viewMode = 'feed',
  onToggleViewMode,
}: MainHeaderProps) {
  const { title } = useSystemInfo();
  const shellClass = solidBlack
    ? 'sticky top-0 z-30 border-b border-white/10 bg-black'
    : overlay
      ? 'fixed inset-x-0 top-0 z-30 bg-black md:sticky md:z-20 md:border-b md:border-black/[0.06] dark:md:border-white/[0.08] md:bg-[#FBFBFD]/85 dark:md:bg-[#0A0A0C]/85 md:backdrop-blur-xl'
      : 'sticky top-0 z-20 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#FBFBFD]/85 dark:bg-[#0A0A0C]/85 backdrop-blur-xl';

  const iconClass = solidBlack || overlay
    ? 'text-white hover:bg-white/15'
    : 'text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]';

  return (
    <header
      className={`h-14 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 ${shellClass}`}
    >
      {/* Left: Mobile Brand */}
      <div className="flex items-center gap-2.5 shrink-0">
        <span
          className={`md:hidden text-base font-semibold tracking-tight ${
            overlay || solidBlack ? 'text-white drop-shadow' : 'text-[#1D1D1F] dark:text-[#F5F5F7]'
          }`}
        >
          {title}
        </span>
      </div>

      {/* Center: 桌面端内联搜索框（移动端改为图标入口） */}
      <div className="hidden md:block flex-1 max-w-md">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onChangeSearch(e.target.value)}
            placeholder="搜索视频、文章、作品或留言"
            aria-label="搜索内容"
            className="w-full h-9 pl-9 pr-8 rounded-full bg-[#EEEEF0] dark:bg-[#1C1C1E] border border-transparent focus:border-[#0071E3]/40 dark:focus:border-[#0A84FF]/50 focus:bg-white dark:focus:bg-[#242426] text-xs sm:text-sm text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onChangeSearch('')}
              aria-label="清空搜索"
              className="absolute right-2.5 w-5 h-5 rounded-full flex items-center justify-center text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Right: Mobile Search Entry + View Toggle (仅首页) + Theme Toggle + Account */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
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
            className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${iconClass}`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </motion.button>
        </Tooltip>
        <AccountMenu {...account} overlay={overlay || solidBlack} />
      </div>
    </header>
  );
}
