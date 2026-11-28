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
  sectionKey: 'settings',
  moduleType: 'builtin',
  label: '设置',
};

/** 默认导航项：配置缺失或解析失败时使用，与后台默认一致 */
export const DEFAULT_NAV: SidebarNavItem[] = [
  { id: 'videos', moduleKey: 'videos', sectionKey: 'videos', moduleType: 'builtin', label: '视频' },
  { id: 'articles', moduleKey: 'articles', sectionKey: 'articles', moduleType: 'builtin', label: '文章' },
  { id: 'gallery', moduleKey: 'gallery', sectionKey: 'gallery', moduleType: 'builtin', label: '图文' },
  { id: 'messages', moduleKey: 'messages', sectionKey: 'messages', moduleType: 'builtin', label: '留言' },
  { ...SETTINGS_NAV_ITEM },
];

/** 导航项名称最大长度，与 CMS 保持一致（超长会挤爆侧栏/底栏） */
const LABEL_MAX_LENGTH = 4;

export interface SidebarNavItem {
  /** 兼容旧字段，始终等于 moduleKey */
  id: string;
  /** 前台导航定位用的模块 key；客户端本地记忆使用它 */
  moduleKey: string;
  /** 内置页面的真实板块标识；moduleKey 改名后仍按它渲染对应页面 */
  sectionKey?: string;
  /** 模块类型；当前用于区分内置页面和占位模块 */
  moduleType: NavModuleType;
  label: string;
  /** CMS 上传的自定义图标地址；留空时按 moduleKey 回退默认图标 */
  iconUrl?: string;
}

function inferNavModuleType(moduleKey: string, sectionKey?: string): NavModuleType {
  return (SECTION_IDS as string[]).includes((sectionKey || moduleKey).trim())
    ? 'builtin'
    : 'placeholder';
}

function parseModuleType(
  value: unknown,
  moduleKey: string,
  sectionKey?: string
): NavModuleType {
  // 内置板块以代码为准：CMS 可能把新接入的内置模块仍标成 placeholder，这里强制纠正
  if ((SECTION_IDS as string[]).includes((sectionKey || moduleKey).trim())) return 'builtin';
  if (value === 'builtin' || value === 'placeholder') return value;
  return inferNavModuleType(moduleKey, sectionKey);
}

/** 取导航项对应的真实页面标识；旧配置按 moduleKey 推断 */
export function sectionKeyOf(item: Pick<SidebarNavItem, 'moduleKey' | 'sectionKey'>): string {
  return (item.sectionKey || '').trim() || item.moduleKey;
}

/** 根据当前 moduleKey 找到它真正要渲染的页面标识 */
export function sectionKeyByModuleKey(items: SidebarNavItem[], moduleKey: string): string {
  const item = items.find((entry) => entry.moduleKey === moduleKey);
  return item ? sectionKeyOf(item) : moduleKey;
}

/** 根据真实页面标识反查当前可用的 moduleKey */
export function findModuleKeyBySection(
  items: SidebarNavItem[],
  sectionKey: string
): string | null {
  return items.find((item) => sectionKeyOf(item) === sectionKey)?.moduleKey ?? null;
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
      const rawSectionKey = typeof row.sectionKey === 'string' ? row.sectionKey.trim() : '';
      const sectionKey =
        rawSectionKey || ((SECTION_IDS as string[]).includes(moduleKey) ? moduleKey : '');
      const label = String(row.label ?? moduleKey).trim() || moduleKey;
      const iconUrl = String(row.iconUrl ?? '').trim();
      items.push({
        id: moduleKey,
        moduleKey,
        ...(sectionKey ? { sectionKey } : {}),
        moduleType: parseModuleType(row.moduleType, moduleKey, sectionKey),
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
