import { motion } from 'motion/react';
import { BookOpen, Film, Image as ImageIcon, MessageCircleHeart } from 'lucide-react';
import type { SectionId } from '../data/content';
import { SWIFTUI_SNAPPY } from '../lib/motion';

interface MobileTabBarProps {
  activeSection: SectionId;
  onSelectSection: (section: SectionId) => void;
  /** 首页（视频板块）使用透明紧凑样式，让视频铺满全屏 */
  transparent?: boolean;
}

const MOBILE_TABS: { id: SectionId; label: string; Icon: typeof Film }[] = [
  { id: 'videos', label: '视频', Icon: Film },
  { id: 'articles', label: '文章', Icon: BookOpen },
  { id: 'gallery', label: '图文', Icon: ImageIcon },
  { id: 'messages', label: '留言', Icon: MessageCircleHeart },
];

export function MobileTabBar({
  activeSection,
  onSelectSection,
  transparent = false,
}: MobileTabBarProps) {
  return (
    <nav
      aria-label="底部导航"
      className={`md:hidden fixed bottom-0 left-0 right-0 z-30 ${
        transparent
          ? 'bg-transparent'
          : 'bg-[#FBFBFD]/95 dark:bg-black/85 backdrop-blur-xl'
      }`}
    >
      <div className="grid grid-cols-4 h-12 items-center px-1">
        {MOBILE_TABS.map(({ id, label, Icon }) => {
          const isActive = activeSection === id;
          return (
            <motion.button
              key={id}
              type="button"
              whileTap={{ scale: 0.9 }}
              transition={SWIFTUI_SNAPPY}
              onClick={() => onSelectSection(id)}
              className={`relative flex items-center justify-center gap-1.5 h-12 min-w-0 select-none [-webkit-tap-highlight-color:transparent] transition-colors focus-visible:outline-none ${
                transparent
                  ? isActive
                    ? 'text-white'
                    : 'text-white/55'
                  : isActive
                    ? 'text-[#1D1D1F] dark:text-white'
                    : 'text-[#8E8E93] dark:text-white/55'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <motion.div
                animate={{ scale: isActive ? 1.08 : 1 }}
                transition={SWIFTUI_SNAPPY}
                className="shrink-0"
              >
                <Icon
                  className="w-[22px] h-[22px]"
                  strokeWidth={isActive ? 2.4 : 1.8}
                  fill={isActive ? 'currentColor' : 'none'}
                  fillOpacity={isActive ? 0.12 : 0}
                />
              </motion.div>
              <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">
                {label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
