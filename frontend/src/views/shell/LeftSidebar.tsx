import { motion } from 'motion/react';
import icpIcon from '../../assets/icp-icon.svg';
import policeIcon from '../../assets/police-icon.svg';
import { SWIFTUI_SNAPPY } from '../../lib/motion';
import { publicFileUrl, useSystemInfo } from '../../lib/systemInfo';
import { navIconUrl, parseNav } from './navConfig';

interface LeftSidebarProps {
  activeSection: string;
  onSelectSection: (section: string, force?: boolean) => void;
}

/**
 * 已内置页面的板块 id。
 * 不在此列表中的 id（CMS 新增的自定义模块）仍然渲染入口，
 * 但内容区会退化为占位页面，避免「点了没反应」。
 */
export const BUILTIN_SECTIONS: readonly string[] = [
  'videos',
  'articles',
  'gallery',
  'messages',
  'profile',
  'settings',
];

export function LeftSidebar({ activeSection, onSelectSection }: LeftSidebarProps) {
  const { title, config } = useSystemInfo();
  const logoUrl = publicFileUrl(config.logoUrl);
  const icpNo = (config.icpNo || '').trim();
  const policeNo = (config.policeNo || '').trim();
  const navItems = parseNav(config.navItems);
  return (
    <aside
      aria-label="左侧主导航"
      className="hidden md:flex flex-col justify-between fixed left-0 top-0 h-screen w-20 lg:w-60 border-r border-app-border bg-app-surface/85 dark:bg-[#0D0D0F]/90 backdrop-blur-xl px-3 lg:px-4 pt-5 pb-3 select-none z-30"
    >
      {/* Top Brand + Primary Vertical Navigation */}
      <div className="space-y-6">
        {/* Brand Emblem & Wordmark */}
        <button
          type="button"
          onClick={() => onSelectSection('videos', true)}
          className="w-full flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-1.5 rounded-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-primary"
        >
          <span className="flex items-center justify-center w-9 h-9 shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="w-full h-full flex items-center justify-center rounded-app bg-app-primary text-app-primary-fg shadow-xs">
                <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" aria-hidden="true">
                  <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="2" />
                  <path d="M16 9L22.5 20.5H9.5L16 9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <circle cx="16" cy="16" r="2.2" fill="var(--app-color-primary)" />
                </svg>
              </span>
            )}
          </span>
          <span className="hidden lg:inline text-lg font-semibold tracking-tight text-app-text whitespace-nowrap">
            {title}
          </span>
        </button>

        {/* Douyin-style Left Vertical Nav Links */}
        <nav aria-label="板块导航" className="space-y-1.5">
          {navItems.map(({ id, label, iconUrl }) => {
            const isActive = activeSection === id;
            const customIcon = navIconUrl({ iconUrl });
            return (
              <motion.button
                key={id}
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectSection(id, true)}
                title={label}
                aria-current={isActive ? 'page' : undefined}
                className={`relative w-full flex items-center justify-center lg:justify-start gap-3.5 px-3 lg:px-3.5 py-3 min-h-[46px] rounded-app text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-primary ${
                  isActive
                    ? 'text-app-text'
                    : 'text-app-muted hover:text-app-text dark:hover:text-app-text hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="leftSidebarActivePill"
                    transition={SWIFTUI_SNAPPY}
                    className="absolute inset-0 rounded-app bg-app-card dark:bg-[#1E1E22] shadow-xs border border-black/[0.05] dark:border-app-border"
                  />
                )}
                {customIcon ? (
                  <img
                    src={customIcon}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="relative z-10 w-5 h-5 shrink-0 object-contain"
                  />
                ) : (
                  <span className="relative z-10 lg:hidden whitespace-nowrap truncate text-[12px]">
                    {label}
                  </span>
                )}
                <span className="relative z-10 hidden lg:inline whitespace-nowrap truncate">
                  {label}
                </span>
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* 备案模块：纯黑背景、靠左对齐，点击跳转官方查询站 */}
      {(icpNo || policeNo) && (
        <div className="hidden lg:flex shrink-0 mt-3 -mx-4 -mb-3 flex-col items-start gap-1.5 bg-black px-4 py-2">
          {icpNo && (
            <a
              href="https://beian.miit.gov.cn"
              target="_blank"
              rel="noopener noreferrer"
              title={`${icpNo}（点击前往工信部备案查询）`}
              className="group flex items-center gap-1.5 max-w-full py-0.5 text-white/70 hover:text-white transition-colors"
            >
              <img
                src={icpIcon}
                alt=""
                aria-hidden="true"
                className="w-3 h-3 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
              />
              <span className="text-[10px] leading-none truncate">{icpNo}</span>
            </a>
          )}
          {policeNo && (
            <a
              href="https://beian.mps.gov.cn"
              target="_blank"
              rel="noopener noreferrer"
              title={`${policeNo}（点击前往公安备案查询）`}
              className="group flex items-center gap-1.5 max-w-full py-0.5 text-white/70 hover:text-white transition-colors"
            >
              <img
                src={policeIcon}
                alt=""
                aria-hidden="true"
                className="w-3 h-3 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
              />
              <span className="text-[10px] leading-none truncate">{policeNo}</span>
            </a>
          )}
        </div>
      )}
    </aside>
  );
}
