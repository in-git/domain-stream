import { motion } from 'motion/react';
import {
  BookOpen,
  Film,
  Image as ImageIcon,
  MessageCircleHeart,
} from 'lucide-react';
import type { SectionId } from '../data/content';
import { SWIFTUI_SNAPPY } from '../lib/motion';

interface LeftSidebarProps {
  activeSection: SectionId;
  onSelectSection: (section: SectionId) => void;
}

const NAV_ITEMS: { id: SectionId; label: string; Icon: typeof Film }[] = [
  { id: 'videos', label: '视频', Icon: Film },
  { id: 'articles', label: '文章', Icon: BookOpen },
  { id: 'gallery', label: '图文', Icon: ImageIcon },
  { id: 'messages', label: '留言', Icon: MessageCircleHeart },
];

export function LeftSidebar({ activeSection, onSelectSection }: LeftSidebarProps) {
  return (
    <aside
      aria-label="左侧主导航"
      className="hidden md:flex flex-col justify-between sticky top-0 h-screen w-20 lg:w-60 shrink-0 border-r border-black/[0.06] dark:border-white/[0.08] bg-[#F5F5F7]/85 dark:bg-[#0D0D0F]/90 backdrop-blur-xl px-3 lg:px-4 py-5 select-none z-30"
    >
      {/* Top Brand + Primary Vertical Navigation */}
      <div className="space-y-6">
        {/* Brand Emblem & Wordmark */}
        <button
          type="button"
          onClick={() => onSelectSection('videos')}
          className="w-full flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-1.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]"
        >
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] shrink-0 shadow-xs">
            <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" aria-hidden="true">
              <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M16 9L22.5 20.5H9.5L16 9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <circle cx="16" cy="16" r="2.2" fill="#0A84FF" />
            </svg>
          </span>
          <span className="hidden lg:inline text-lg font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-nowrap">
            吴文龙的私域
          </span>
        </button>

        {/* Douyin-style Left Vertical Nav Links */}
        <nav aria-label="板块导航" className="space-y-1.5">
          {NAV_ITEMS.map(({ id, label, Icon }) => {
            const isActive = activeSection === id;
            return (
              <motion.button
                key={id}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectSection(id)}
                title={label}
                aria-current={isActive ? 'page' : undefined}
                className={`relative w-full flex items-center justify-center lg:justify-start gap-3.5 px-3 lg:px-3.5 py-3 min-h-[46px] rounded-2xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] ${
                  isActive
                    ? 'text-[#1D1D1F] dark:text-white'
                    : 'text-[#6E6E73] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="leftSidebarActivePill"
                    transition={SWIFTUI_SNAPPY}
                    className="absolute inset-0 rounded-2xl bg-white dark:bg-[#1E1E22] shadow-xs border border-black/[0.05] dark:border-white/[0.08]"
                  />
                )}
                <Icon
                  className={`relative z-10 w-5 h-5 shrink-0 ${
                    isActive ? 'text-[#0071E3] dark:text-[#0A84FF]' : ''
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.8}
                />
                <span className="relative z-10 hidden lg:inline whitespace-nowrap truncate">
                  {label}
                </span>
              </motion.button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
