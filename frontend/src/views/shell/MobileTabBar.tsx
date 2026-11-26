import { motion } from 'motion/react';
import { SWIFTUI_SNAPPY } from '../../lib/motion';
import { useSystemInfo } from '../../lib/systemInfo';
import { navIconUrl, parseNav } from './navConfig';

interface MobileTabBarProps {
  activeSection: string;
  onSelectSection: (section: string, force?: boolean) => void;
  /** 首页（视频板块）使用透明紧凑样式，让视频铺满全屏 */
  transparent?: boolean;
}

export function MobileTabBar({
  activeSection,
  onSelectSection,
  transparent = false,
}: MobileTabBarProps) {
  const { config } = useSystemInfo();
  // 与 PC 左侧栏共用后台导航配置：数量、顺序、名称、图标均由接口决定
  const navItems = parseNav(config.navItems);

  return (
    <nav
      aria-label="底部导航"
      className={`md:hidden fixed bottom-0 left-0 right-0 z-30 ${
        transparent
          ? 'bg-transparent'
          : 'border-t border-app-border bg-app-card/95 backdrop-blur-md'
      }`}
    >
      <div
        className="h-12 items-center px-1"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
      >
        {navItems.map(({ id, label, iconUrl }) => {
          const isActive = activeSection === id;
          const customIcon = navIconUrl({ iconUrl });
          return (
            <motion.button
              key={id}
              type="button"
              whileTap={{ scale: 0.9 }}
              transition={SWIFTUI_SNAPPY}
              onClick={() => onSelectSection(id, true)}
              className={`relative flex items-center justify-center gap-1.5 h-12 min-w-0 select-none [-webkit-tap-highlight-color:transparent] transition-colors focus-visible:outline-none ${
                transparent
                  ? isActive
                    ? 'text-white'
                    : 'text-white/55'
                  : isActive
                    ? 'text-app-text'
                    : 'text-app-subtle dark:text-white/55'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              {customIcon && (
                <motion.div
                  animate={{ scale: isActive ? 1.08 : 1 }}
                  transition={SWIFTUI_SNAPPY}
                  className="shrink-0"
                >
                  <img
                    src={customIcon}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="w-[22px] h-[22px] object-contain"
                  />
                </motion.div>
              )}
              <span className="text-[14px] font-normal leading-none tracking-tight whitespace-nowrap">
                {label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
