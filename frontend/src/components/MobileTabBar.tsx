import { motion } from 'motion/react';
import { BookOpen, Film, Image as ImageIcon, User } from 'lucide-react';
import type { SectionId } from '../data/content';
import { SWIFTUI_SNAPPY } from '../lib/motion';

interface MobileTabBarProps {
  activeSection: SectionId;
  onSelectSection: (section: SectionId) => void;
}

const MOBILE_TABS: { id: SectionId; label: string; Icon: typeof Film }[] = [
  { id: 'videos', label: '视频', Icon: Film },
  { id: 'articles', label: '文章', Icon: BookOpen },
  { id: 'gallery', label: '纯图片', Icon: ImageIcon },
  { id: 'profile', label: '个人中心', Icon: User },
];

export function MobileTabBar({ activeSection, onSelectSection }: MobileTabBarProps) {
  return (
    <nav
      aria-label="底部导航"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-black/[0.08] dark:border-white/[0.1] bg-[#FBFBFD]/88 dark:bg-[#111113]/88 backdrop-blur-xl pb-safe"
    >
      <div className="grid grid-cols-4 h-14 items-center px-2">
        {MOBILE_TABS.map(({ id, label, Icon }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectSection(id)}
              className={`relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] rounded-xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3] ${
                isActive
                  ? 'text-[#0071E3] dark:text-[#0A84FF]'
                  : 'text-[#6E6E73] dark:text-[#98989D]'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <motion.span
                  layoutId="mobileTabHighlight"
                  transition={SWIFTUI_SNAPPY}
                  className="absolute inset-x-2 inset-y-1 rounded-xl bg-[#0071E3]/[0.09] dark:bg-[#0A84FF]/[0.16]"
                />
              )}
              <motion.div
                animate={{ scale: isActive ? 1.08 : 1, y: isActive ? -1 : 0 }}
                transition={SWIFTUI_SNAPPY}
                className="relative z-10"
              >
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.2 : 1.75} />
              </motion.div>
              <span className="relative z-10 mt-0.5 text-[10px] font-medium tracking-tight whitespace-nowrap">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
