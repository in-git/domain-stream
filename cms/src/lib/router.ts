import type { ModuleKey } from '../types/cms.ts';
import { menuPathEntries, modulePath } from './menu.ts';

/** 支持独立页面的内容模块 */
export type ContentModule = 'videos' | 'imagetexts' | 'articles';
/** 内容模块的页面动作 */
export type ContentAction = 'new' | 'edit' | 'view' | 'delete';

/**
 * 应用路由：
 * - module: 列表页，如 #/videos
 * - content: 内容独立页面，如 #/videos/new、#/videos/123/edit
 * - quick: 快速创建选择页，如 #/quick-create
 */
export type AppRoute =
  | { kind: 'module'; module: ModuleKey }
  | { kind: 'content'; module: ContentModule; action: ContentAction; id?: string; slide?: number }
  | { kind: 'quick' };

/** 合法的模块路由（与 ModuleKey 一致） */
const MODULES: ModuleKey[] = [
  'dashboard',
  'videos',
  'imagetexts',
  'articles',
  'category',
  'profile',
];
const CONTENT_MODULES: ContentModule[] = ['videos', 'imagetexts', 'articles'];
const CONTENT_ACTIONS: ContentAction[] = ['new', 'edit', 'view', 'delete'];

const HASH_KEY = 'ACTIVE_MODULE';

function isModuleKey(value: string | null | undefined): value is ModuleKey {
  return !!value && (MODULES as string[]).includes(value);
}

function isContentModule(value: string | undefined): value is ContentModule {
  return !!value && (CONTENT_MODULES as string[]).includes(value);
}

function isContentAction(value: string | undefined): value is ContentAction {
  return !!value && (CONTENT_ACTIONS as string[]).includes(value);
}

/** 解析内容子路由的动作段：new / {id}/edit|view|delete */
function parseContentTail(module: ContentModule, rest: string[]): AppRoute {
  if (rest[0] === 'new') {
    return { kind: 'content', module, action: 'new' };
  }
  const [rawId, action, slideSeg] = rest;
  if (rawId && action && isContentAction(action)) {
    let id = rawId;
    try {
      id = decodeURIComponent(rawId);
    } catch {
      // 保留原始片段
    }
    const slide = /^\d+$/.test(slideSeg || '') ? Number(slideSeg) : undefined;
    return { kind: 'content', module, action, id, slide };
  }
  return { kind: 'module', module };
}

/** 按后端菜单 path（如 /biz/video）匹配路由，长路径优先 */
function matchMenuPath(segments: string[]): { module: ModuleKey; rest: string[] } | null {
  const fullPath = `/${segments.join('/')}`;
  for (const entry of menuPathEntries()) {
    if (fullPath === entry.path || fullPath.startsWith(`${entry.path}/`)) {
      const used = entry.path.split('/').filter(Boolean).length;
      return { module: entry.module, rest: segments.slice(used) };
    }
  }
  return null;
}

/** 从 URL hash 解析完整路由（同时兼容 #/biz/video 与旧的 #/videos） */
export function parseRoute(hash?: string): AppRoute {
  try {
    const raw = (hash ?? window.location.hash).replace(/^#\/?/, '').split('?')[0];
    const segments = raw.split('/').filter(Boolean);
    const [head, second, third, fourth] = segments;

    if (head === 'quick-create') return { kind: 'quick' };

    // 优先按后端菜单 path 解析
    const menuHit = matchMenuPath(segments);
    if (menuHit) {
      const { module, rest } = menuHit;
      if (!rest.length) return { kind: 'module', module };
      return isContentModule(module) ? parseContentTail(module, rest) : { kind: 'module', module };
    }

    // 兼容旧路由：#/videos、#/videos/123/edit
    if (isContentModule(head)) {
      return parseContentTail(head, segments.slice(1));
    }
    if (isModuleKey(head)) return { kind: 'module', module: head };
    return { kind: 'module', module: 'dashboard' };
  } catch {
    return { kind: 'module', module: 'dashboard' };
  }
}

/** 路由对应的 URL hash：列表/子页面统一使用后端菜单 path 作为路径 */
export function routeHash(route: AppRoute): string {
  if (route.kind === 'quick') return '#/quick-create';
  const base = modulePath(route.module);
  if (route.kind === 'module') return `#${base}`;
  if (route.action === 'new') return `#${base}/new`;
  const slide = route.slide !== undefined ? `/${route.slide}` : '';
  return `#${base}/${encodeURIComponent(route.id || '')}/${route.action}${slide}`;
}

/** 路由对应的侧边栏高亮模块；快速创建页保持上一个模块高亮 */
export function routeModule(route: AppRoute, fallback: ModuleKey = 'dashboard'): ModuleKey {
  if (route.kind !== 'module') {
    return route.kind === 'content' ? route.module : fallback;
  }
  return route.module;
}

/** 从 localStorage 读取上次记住的模块 */
export function moduleFromStorage(): ModuleKey | null {
  try {
    const raw = localStorage.getItem(HASH_KEY);
    return isModuleKey(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** 从 URL hash（如 #/videos）解析模块，兼容旧调用 */
export function moduleFromHash(): ModuleKey | null {
  const route = parseRoute();
  return route.kind === 'module' ? route.module : route.kind === 'content' ? route.module : null;
}

/**
 * 综合恢复：优先 URL hash，其次 localStorage，最后回退默认模块。
 * 只有 hash 为空/非法时才走 localStorage，避免覆盖正在访问的子页面。
 */
export function resolveInitialRoute(fallback: ModuleKey = 'dashboard'): AppRoute {
  try {
    const raw = window.location.hash.replace(/^#\/?/, '').trim();
    if (raw) return parseRoute();
    return { kind: 'module', module: moduleFromStorage() || fallback };
  } catch {
    return { kind: 'module', module: fallback };
  }
}

/** 兼容旧调用：恢复初始模块 */
export function resolveInitialModule(fallback: ModuleKey = 'dashboard'): ModuleKey {
  return routeModule(resolveInitialRoute(fallback), fallback);
}

/** 记住模块到 localStorage */
export function rememberModule(mod: ModuleKey): void {
  try {
    localStorage.setItem(HASH_KEY, mod);
  } catch {
    // ignore
  }
}

/**
 * 跳转到指定路由并同步 URL。
 * - 列表切换用 replace，避免污染历史
 * - 进入编辑/预览/确认等子页面用 push，支持浏览器返回列表
 */
export function navigateToRoute(route: AppRoute, replace = false): AppRoute {
  const hash = routeHash(route);
  // 快速创建页不覆盖记住的模块，便于返回时保持原高亮
  if (route.kind !== 'quick') rememberModule(routeModule(route));
  try {
    if (window.location.hash !== hash) {
      const url = `${window.location.pathname}${window.location.search}${hash}`;
      if (replace) {
        window.history.replaceState(null, '', url);
      } else {
        window.history.pushState(null, '', url);
      }
    }
  } catch {
    window.location.hash = hash;
  }
  return route;
}

/** 兼容旧调用：跳转到某模块 */
export function navigateTo(mod: ModuleKey): ModuleKey {
  navigateToRoute({ kind: 'module', module: mod }, true);
  return mod;
}

/** 清除记住的路由（退出登录时调用） */
export function forgetModule(): void {
  try {
    localStorage.removeItem(HASH_KEY);
  } catch {
    // ignore
  }
}
