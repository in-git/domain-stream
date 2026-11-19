import { motion } from 'motion/react';
import { Moon, Search, Sun, X } from 'lucide-react';
import type { SectionId } from '../data/content';

interface MainHeaderProps {
  activeSection: SectionId;
  searchQuery: string;
  onChangeSearch: (value: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

const SECTION_LABELS: Record<SectionId, string> = {
  videos: '推荐视频',
  articles: '精选文章',
  gallery: '图文',
  profile: '个人中心',
};

export function MainHeader({
  activeSection,
  searchQuery,
  onChangeSearch,
  isDark,
  onToggleTheme,
}: MainHeaderProps) {
  return (
    <header className="sticky top-0 z-20 h-14 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#FBFBFD]/85 dark:bg-[#0A0A0C]/85 backdrop-blur-xl">
      {/* Left: Mobile Brand + Active Section Title */}
      <div className="flex items-center gap-2.5 shrink-0">
        <span className="md:hidden text-base font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7]">
          吴文龙的私域
        </span>
        <span className="md:hidden text-black/20 dark:text-white/20" aria-hidden="true">
          /
        </span>
        <span className="text-sm font-medium text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-nowrap">
          {SECTION_LABELS[activeSection]}
        </span>
      </div>

      {/* Center: Douyin-style Compact Frosted Search Input */}
      <div className="flex-1 max-w-md">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onChangeSearch(e.target.value)}
            placeholder="搜索视频、文章或摄影作品"
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

      {/* Right: Mobile Theme Toggle */}
      <div className="flex items-center gap-2 shrink-0">
        <motion.button
          type="button"
          whileTap={{ scale: 0.92 }}
          onClick={onToggleTheme}
          aria-label={isDark ? '切换至浅色外观' : '切换至深色外观'}
          className="md:hidden min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </motion.button>
      </div>
    </header>
  );
}
