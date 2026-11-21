/**
 * 导航配置解析（PC 左侧栏与移动端底部栏共用）
 * ------------------------------------------------------------------
 * 数据源为后台系统配置的 navItems JSON；解析失败或为空时回退默认导航。
 */
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
import { publicFileUrl } from '../../lib/systemInfo';

/** 板块 id → 默认图标组件；CMS 未上传自定义图标时作为兜底 */
export const NAV_ICON_MAP: Record<string, typeof Film> = {
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
export const DEFAULT_NAV: SidebarNavItem[] = [
  { id: 'videos', label: '视频' },
  { id: 'articles', label: '文章' },
  { id: 'gallery', label: '图文' },
  { id: 'messages', label: '留言' },
];

/** 导航项名称最大长度，与 CMS 保持一致（超长会挤爆侧栏/底栏） */
const LABEL_MAX_LENGTH = 4;

export interface SidebarNavItem {
  /** 板块 id：内置板块为固定字面量，自定义模块为任意字符串 */
  id: string;
  label: string;
  /** CMS 上传的自定义图标地址；留空时按 id 回退默认图标 */
  iconUrl?: string;
}

/** 解析后台配置的导航 JSON，失败或为空时回退默认 */
export function parseNav(raw: string | undefined): SidebarNavItem[] {
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

/** 取导航项的可访问图标地址（后台文件地址 → 前台代理地址） */
export function navIconUrl(item: SidebarNavItem): string {
  return publicFileUrl(item.iconUrl);
}

/** 取导航项的兜底图标组件 */
export function navIconComponent(id: string): typeof Film {
  return NAV_ICON_MAP[id] ?? Film;
}
