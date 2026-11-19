import type { ModuleKey, UserProfile } from '../types/cms.ts';
import {
  getCachedMenu,
  getCachedUserInfo,
  type SnowyLoginUser,
  type SnowyMenu,
} from './snowy.ts';

/**
 * 动态路由 / 菜单映射层
 * ------------------------------------------------------------------
 * 参照 snowy-admin-web：后端 loginMenu 返回模块树，前端按 component/path
 * 把菜单映射为 CueStudio 的 ModuleKey，据此动态生成侧边栏与可访问路由。
 * CueStudio 的页面组件是固定的几个（React 静态导入），因此这里不是像 Vue
 * 那样按 component 动态 import 组件，而是做「权限/可见性」的动态映射。
 */

export interface DynamicModule {
  key: ModuleKey;
  label: string;
  /** 后端菜单 path，直接作为前端路由路径（如 /biz/video） */
  path: string;
  /** 后端菜单图标（snowy icon 名） */
  icon?: string;
  sortCode: number;
}

/** 后端菜单缺失时的兜底路径，保证三大核心模块始终可访问 */
const DEFAULT_PATHS: Record<ModuleKey, string> = {
  dashboard: '/biz/index',
  videos: '/biz/video',
  imagetexts: '/biz/graphic',
  articles: '/biz/article',
  category: '/biz/category',
  messages: '/biz/message',
  files: '/biz/file',
  materials: '/biz/material',
  profile: '/profile',
};

/** dashboard / profile 为 CueStudio 内置页，不依赖后端菜单 */
const BUILTIN_MODULES: DynamicModule[] = [
  { key: 'dashboard', label: '业务首页', path: DEFAULT_PATHS.dashboard, sortCode: 0 },
  { key: 'profile', label: '个人中心', path: DEFAULT_PATHS.profile, sortCode: 9999 },
];

interface ModuleMatcher {
  key: ModuleKey;
  label: string;
  /** 命中任一 keyword 即视为该模块（对 component 与 path 做小写包含匹配） */
  keywords: string[];
}

const MATCHERS: ModuleMatcher[] = [
  { key: 'dashboard', label: '业务首页', keywords: ['biz/index', 'bizindex'] },
  { key: 'videos', label: '视频管理', keywords: ['biz/video', 'bizvideo'] },
  { key: 'articles', label: '文章管理', keywords: ['biz/article', 'bizarticle'] },
  { key: 'imagetexts', label: '图文管理', keywords: ['biz/graphic', 'bizgraphic'] },
  // 通用分类：菜单 component = biz/category/index，path = /biz/category
  { key: 'category', label: '通用分类', keywords: ['biz/category', 'bizcategory'] },
  // 留言管理：菜单 component = biz/message/index，path = /biz/message
  { key: 'messages', label: '留言管理', keywords: ['biz/message', 'bizmessage'] },
  // 文件中心（素材库）：菜单 component = biz/file/index，path = /biz/file
  { key: 'files', label: '文件中心', keywords: ['biz/file', 'bizfile'] },
  // 素材中心：菜单 component = biz/material/index，path = /biz/material
  { key: 'materials', label: '素材中心', keywords: ['biz/material', 'bizmaterial'] },
];

function matchModule(node: SnowyMenu): ModuleMatcher | undefined {
  const haystack = `${node.component || ''} ${node.path || ''} ${node.name || ''}`.toLowerCase();
  return MATCHERS.find((m) => m.keywords.some((k) => haystack.includes(k)));
}

/**
 * 把单个菜单节点映射到 CueStudio 已内置页面的 ModuleKey。
 * 返回 null 表示该菜单来自小诺后台、CueStudio 尚无对应页面（外部菜单）。
 * 供侧边栏树形渲染时判断高亮、徽标与点击分流使用。
 */
export function menuNodeToModule(node: SnowyMenu): ModuleKey | null {
  return matchModule(node)?.key ?? null;
}

/** 递归展平菜单树，取出能映射到 CueStudio 模块的可访问菜单项 */
function flattenMenu(menus: SnowyMenu[]): DynamicModule[] {
  const found: DynamicModule[] = [];
  const seen = new Set<ModuleKey>();
  const walk = (nodes: SnowyMenu[]) => {
    nodes.forEach((node) => {
      // visible 明确为 NO/FALSE 的菜单不展示
      const hidden =
        node.visible === 'NO' ||
        node.visible === 'FALSE' ||
        node.meta?.hidden === true;
      const matched = matchModule(node);
      if (matched && !hidden && !seen.has(matched.key)) {
        seen.add(matched.key);
        found.push({
          key: matched.key,
          label: node.meta?.title || node.title || matched.label,
          path: node.path || DEFAULT_PATHS[matched.key],
          icon: node.icon || node.meta?.icon,
          sortCode: node.sortCode ?? 50,
        });
      }
      if (node.children?.length) walk(node.children);
    });
  };
  walk(menus);
  return found;
}

/**
 * 由后端菜单树解析出当前用户可访问的模块列表。
 * - 始终包含内置 dashboard / profile
 * - 业务模块按后端菜单存在性与 visible 决定
 * - 按 sortCode 排序，dashboard 永远在最前，profile 永远在最后
 */
export function modulesFromMenu(menus: SnowyMenu[] | null): DynamicModule[] {
  const business = menus?.length ? flattenMenu(menus) : [];
  const dashboard = business.find((m) => m.key === 'dashboard') || BUILTIN_MODULES[0];
  const profile = BUILTIN_MODULES[1];
  return [
    dashboard,
    ...business.filter((m) => m.key !== 'dashboard').sort((a, b) => a.sortCode - b.sortCode),
    profile,
  ];
}

/** 从 localStorage 的 MENU 缓存解析可访问模块 */
export function modulesFromCache(): DynamicModule[] {
  return modulesFromMenu(getCachedMenu());
}

/** 模块对应的后端路由路径（优先取 loginMenu 返回的 path） */
export function modulePath(key: ModuleKey, modules?: DynamicModule[]): string {
  const list = modules || modulesFromCache();
  return list.find((m) => m.key === key)?.path || DEFAULT_PATHS[key];
}

/** 全部模块的 路径 -> 模块 映射，供路由解析使用（长路径优先） */
export function menuPathEntries(): Array<{ path: string; module: ModuleKey }> {
  return modulesFromCache()
    .map((m) => ({ path: m.path.replace(/\/+$/, ''), module: m.key }))
    .filter((item) => !!item.path)
    .sort((a, b) => b.path.length - a.path.length);
}

/** 判断某模块是否在当前用户可访问列表内 */
export function isModuleAccessible(modules: DynamicModule[], key: ModuleKey): boolean {
  return modules.some((m) => m.key === key);
}

/** 选择默认落地模块：优先用户偏好，需可访问；否则取第一个业务模块，最后回退 dashboard */
export function resolveDefaultModule(
  modules: DynamicModule[],
  preferred?: ModuleKey | string
): ModuleKey {
  if (preferred && isModuleAccessible(modules, preferred as ModuleKey)) {
    return preferred as ModuleKey;
  }
  const firstBusiness = modules.find((m) => m.key !== 'dashboard' && m.key !== 'profile');
  return firstBusiness?.key || 'dashboard';
}

/** 权限码判断：读取 USER_INFO.buttonCodeList，对齐 snowy-admin-web 的 hasPerm */
export function hasPerm(codes: string | string[], rule: 'or' | 'and' = 'or'): boolean {
  const list = codes ? (Array.isArray(codes) ? codes : [codes]) : [];
  if (!list.length) return true;
  let user: UserProfile | SnowyLoginUser | null = null;
  try {
    // 优先读 App 内存态由调用方注入；此处读缓存兜底
    user = getCachedUserInfo() as SnowyLoginUser | null;
  } catch {
    // ignore
  }
  const perms = (user as SnowyLoginUser | null)?.buttonCodeList || [];
  return rule === 'and'
    ? list.every((c) => perms.includes(c))
    : list.some((c) => perms.includes(c));
}

/** 模块代码权限前缀 */
const MODULE_PERM_PREFIX: Record<Exclude<ModuleKey, 'dashboard' | 'profile'>, string> = {
  videos: 'bizVideo',
  imagetexts: 'bizGraphic',
  articles: 'bizArticle',
  category: 'bizCategory',
  messages: 'bizMessage',
  files: 'bizFile',
  materials: 'bizMaterial',
};

/** 判断当前用户对某模块是否有某动作（add/edit/delete/detail）权限 */
export function hasModulePerm(
  module: ModuleKey,
  action: 'Add' | 'Edit' | 'Delete' | 'Detail',
  perms?: string[] | null
): boolean {
  if (module === 'dashboard' || module === 'profile') return true;
  // 调用方可传入内存态权限列表（优先），否则读缓存
  let codes = perms;
  if (!codes) {
    const user = getCachedUserInfo() as SnowyLoginUser | null;
    codes = user?.buttonCodeList || [];
  }
  const code = `${MODULE_PERM_PREFIX[module]}${action}`;
  return (codes || []).includes(code);
}
