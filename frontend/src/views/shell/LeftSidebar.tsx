import { motion } from 'motion/react';
import {
  BookOpen,
  Film,
  Image as ImageIcon,
  ImagePlus,
  MessageCircleHeart,
  Music,
  Star,
  UserRound,
} from 'lucide-react';
import icpIcon from '../../assets/icp-icon.svg';
import policeIcon from '../../assets/police-icon.svg';
import { SWIFTUI_SNAPPY } from '../../lib/motion';
import { publicFileUrl, useSystemInfo } from '../../lib/systemInfo';

interface LeftSidebarProps {
  activeSection: string;
  onSelectSection: (section: string) => void;
}

/** 板块 id → 默认图标组件；CMS 未上传自定义图标时作为兜底 */
const ICON_MAP: Record<string, typeof Film> = {
  videos: Film,
  articles: BookOpen,
  gallery: ImageIcon,
  messages: MessageCircleHeart,
  profile: UserRound,
  star: Star,
  music: Music,
  image: ImagePlus,
};

/** 默认导航项：配置缺失或解析失败时使用，与后台默认一致 */
const DEFAULT_NAV: SidebarNavItem[] = [
  { id: 'videos', label: '视频' },
  { id: 'articles', label: '文章' },
  { id: 'gallery', label: '图文' },
  { id: 'messages', label: '留言' },
];

/**
 * 已内置页面的板块 id。
 * 不在此列表中的 id（CMS 新增的自定义模块）仍然渲染入口，
 * 但内容区会退化为占位页面，避免「点了没反应」。
 */
export const BUILTIN_SECTIONS: readonly string[] = ['videos', 'articles', 'gallery', 'messages', 'profile'];

/** 导航项名称最大长度，与 CMS 保持一致（超长会挤爆侧栏） */
const LABEL_MAX_LENGTH = 4;

export interface SidebarNavItem {
  /** 板块 id：内置板块为固定字面量，自定义模块为任意字符串 */
  id: string;
  label: string;
  /** CMS 上传的自定义图标地址；留空时按 id 回退默认图标 */
  iconUrl?: string;
}

/** 解析后台配置的导航 JSON，失败或为空时回退默认 */
function parseNav(raw: string | undefined): SidebarNavItem[] {
  if (!raw || !raw.trim()) return DEFAULT_NAV;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_NAV;
    const items: SidebarNavItem[] = [];
    const seen = new Set<string>();
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue;
      const row = entry as Record<string, unknown>;
      if (row.enabled === false) continue;
      const id = String(row.id ?? '').trim();
      // 仅去重：未知 id 保留，交给内容区渲染占位页
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const label = String(row.label ?? id).trim() || id;
      const iconUrl = String(row.iconUrl ?? '').trim();
      items.push({
        id,
        label: label.slice(0, LABEL_MAX_LENGTH),
        ...(iconUrl ? { iconUrl } : {}),
      });
    }
    return items.length ? items : DEFAULT_NAV;
  } catch {
    return DEFAULT_NAV;
  }
}

export function LeftSidebar({ activeSection, onSelectSection }: LeftSidebarProps) {
  const { title, config } = useSystemInfo();
  const logoUrl = publicFileUrl(config.logoUrl);
  const icpNo = (config.icpNo || '').trim();
  const policeNo = (config.policeNo || '').trim();
  const navItems = parseNav(config.navItems);
  return (
    <aside
      aria-label="左侧主导航"
      className="hidden md:flex flex-col justify-between sticky top-0 h-screen w-20 lg:w-60 shrink-0 border-r border-black/[0.06] dark:border-white/[0.08] bg-[#F5F5F7]/85 dark:bg-[#0D0D0F]/90 backdrop-blur-xl px-3 lg:px-4 pt-5 pb-3 select-none z-30"
    >
      {/* Top Brand + Primary Vertical Navigation */}
      <div className="space-y-6">
        {/* Brand Emblem & Wordmark */}
        <button
          type="button"
          onClick={() => onSelectSection('videos')}
          className="w-full flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-3 py-1.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]"
        >
          <span className="flex items-center justify-center w-9 h-9 shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="w-full h-full flex items-center justify-center rounded-xl bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] shadow-xs">
                <svg viewBox="0 0 32 32" className="w-5 h-5" fill="none" aria-hidden="true">
                  <circle cx="16" cy="16" r="10" stroke="currentColor" strokeWidth="2" />
                  <path d="M16 9L22.5 20.5H9.5L16 9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  <circle cx="16" cy="16" r="2.2" fill="#0A84FF" />
                </svg>
              </span>
            )}
          </span>
          <span className="hidden lg:inline text-lg font-semibold tracking-tight text-[#1D1D1F] dark:text-[#F5F5F7] whitespace-nowrap">
            {title}
          </span>
        </button>

        {/* Douyin-style Left Vertical Nav Links */}
        <nav aria-label="板块导航" className="space-y-1.5">
          {navItems.map(({ id, label, iconUrl }) => {
            const isActive = activeSection === id;
            // 图标完全由 CMS 提供；未上传时按板块 id 回退默认图标
            const Icon = ICON_MAP[id] ?? Film;
            const customIcon = publicFileUrl(iconUrl);
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
                {customIcon ? (
                  <img
                    src={customIcon}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="relative z-10 w-5 h-5 shrink-0 object-contain"
                  />
                ) : (
                  <Icon
                    className={`relative z-10 w-5 h-5 shrink-0 ${
                      isActive ? 'text-[#0071E3] dark:text-[#0A84FF]' : ''
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                )}
                <span className="relative z-10 hidden lg:inline whitespace-nowrap truncate">
                  {label}
                </span>
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* 备案模块：固定在侧栏底部，右对齐（公安备案在最下方），点击跳转官方查询站 */}
      {(icpNo || policeNo) && (
        <div className="hidden lg:flex shrink-0 flex-col items-end gap-1 pt-3 border-t border-black/[0.05] dark:border-white/[0.06]">
          {icpNo && (
            <a
              href="https://beian.miit.gov.cn"
              target="_blank"
              rel="noopener noreferrer"
              title={`${icpNo}（点击前往工信部备案查询）`}
              className="group flex items-center gap-1.5 max-w-full pl-1.5 pr-2 py-1 -mr-1.5 rounded-lg text-[#8E8E93] dark:text-[#8E8E93] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors"
            >
              <img
                src={icpIcon}
                alt=""
                aria-hidden="true"
                className="w-3 h-3 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
              />
              <span className="text-[10px] leading-none truncate">{icpNo}</span>
            </a>
          )}
          {policeNo && (
            <a
              href="https://beian.gov.cn"
              target="_blank"
              rel="noopener noreferrer"
              title={`${policeNo}（点击前往公安备案查询）`}
              className="group flex items-center gap-1.5 max-w-full pl-1.5 pr-2 py-1 -mr-1.5 rounded-lg text-[#8E8E93] dark:text-[#8E8E93] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors"
            >
              <img
                src={policeIcon}
                alt=""
                aria-hidden="true"
                className="w-3 h-3 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity"
              />
              <span className="text-[10px] leading-none truncate">{policeNo}</span>
            </a>
          )}
        </div>
      )}
    </aside>
  );
}
