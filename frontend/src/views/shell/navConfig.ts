/**
 * 导航配置解析（PC 左侧栏与移动端底部栏共用）
 * ------------------------------------------------------------------
 * 数据源为后台系统配置的 navItems JSON；解析失败或为空时回退默认导航。
 */
import { publicFileUrl } from '../../lib/systemInfo';
import { SECTION_IDS } from '../app/constants';

/** 导航模块类型：内置页面或后台配置的占位模块 */
export type NavModuleType = 'builtin' | 'placeholder';

/** 设置是内置模块预设，是否显示完全由 CMS 的 navItems 决定 */
const SETTINGS_NAV_ITEM: SidebarNavItem = {
  id: 'settings',
  moduleKey: 'settings',
  moduleType: 'builtin',
  label: '设置',
};

/** 默认导航项：配置缺失或解析失败时使用，与后台默认一致 */
export const DEFAULT_NAV: SidebarNavItem[] = [
  { id: 'videos', moduleKey: 'videos', moduleType: 'builtin', label: '视频' },
  { id: 'articles', moduleKey: 'articles', moduleType: 'builtin', label: '文章' },
  { id: 'gallery', moduleKey: 'gallery', moduleType: 'builtin', label: '图文' },
  { id: 'messages', moduleKey: 'messages', moduleType: 'builtin', label: '留言' },
  { ...SETTINGS_NAV_ITEM },
];

/** 导航项名称最大长度，与 CMS 保持一致（超长会挤爆侧栏/底栏） */
const LABEL_MAX_LENGTH = 4;

export interface SidebarNavItem {
  /** 兼容旧字段，始终等于 moduleKey */
  id: string;
  /** 永久唯一的模块 key；客户端默认板块和本地记忆都使用它 */
  moduleKey: string;
  /** 模块类型；当前用于区分内置页面和占位模块 */
  moduleType: NavModuleType;
  label: string;
  /** CMS 上传的自定义图标地址；留空时按 moduleKey 回退默认图标 */
  iconUrl?: string;
}

function inferNavModuleType(moduleKey: string): NavModuleType {
  return (SECTION_IDS as string[]).includes(moduleKey) ? 'builtin' : 'placeholder';
}

function parseModuleType(value: unknown, moduleKey: string): NavModuleType {
  if (value === 'builtin' || value === 'placeholder') return value;
  return inferNavModuleType(moduleKey);
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
      const moduleKey =
        typeof row.moduleKey === 'string' && row.moduleKey.trim()
          ? row.moduleKey.trim()
          : String(row.id ?? '').trim();
      // 按 moduleKey 去重：未知 key 保留，交给内容区渲染占位页
      if (!moduleKey || seen.has(moduleKey)) continue;
      seen.add(moduleKey);
      const label = String(row.label ?? moduleKey).trim() || moduleKey;
      const iconUrl = String(row.iconUrl ?? '').trim();
      items.push({
        id: moduleKey,
        moduleKey,
        moduleType: parseModuleType(row.moduleType, moduleKey),
        label: label.slice(0, LABEL_MAX_LENGTH),
        ...(iconUrl ? { iconUrl } : {}),
      });
    }
    return items;
  } catch {
    return DEFAULT_NAV;
  }
}

/** 取导航项的可访问图标地址（后台文件地址 → 前台代理地址） */
export function navIconUrl(item: Pick<SidebarNavItem, 'iconUrl'>): string {
  return publicFileUrl(item.iconUrl);
}
