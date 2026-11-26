import { createContext, useContext, type ReactNode } from 'react';
import { AnimatePresence } from 'motion/react';
import { LeftSidebar } from './LeftSidebar';
import { MobileTabBar } from './MobileTabBar';

interface PortalNavContextValue {
  activeSection: string;
  onSelectSection: (section: string, force?: boolean) => void;
  /** 视频板块的底部导航透明显示，让播放区铺满全屏 */
  transparent?: boolean;
}

const PortalNavContext = createContext<PortalNavContextValue>({
  activeSection: 'videos',
  onSelectSection: () => {},
  transparent: false,
});

export function PortalNavProvider({
  value,
  children,
}: {
  value: PortalNavContextValue;
  children: ReactNode;
}) {
  return <PortalNavContext.Provider value={value}>{children}</PortalNavContext.Provider>;
}

/**
 * 板块级导航：PC 左侧栏 + 移动端底部 TabBar。
 * 各模块自己引用，而不是由 PortalShell 统一渲染，
 * 便于不同模块控制导航的显示与样式。
 */
export function PortalNav({ hideMobileTabBar = false }: { hideMobileTabBar?: boolean }) {
  const { activeSection, onSelectSection, transparent } = useContext(PortalNavContext);
  return (
    <>
      <LeftSidebar activeSection={activeSection} onSelectSection={onSelectSection} />
      <AnimatePresence>
        {!hideMobileTabBar && (
          <MobileTabBar
            key="mobile-tabbar"
            activeSection={activeSection}
            onSelectSection={onSelectSection}
            transparent={transparent}
            animated={transparent}
          />
        )}
      </AnimatePresence>
    </>
  );
}
