/**
 * 轻量前端路由：门户只有首页 / 登录 / 注册 / 三方回调四个页面，
 * 直接用 History API，避免为此引入额外路由依赖。
 */
export type RouteKind = 'home' | 'login' | 'register' | 'callback' | 'profile';

export interface RouteInfo {
  kind: RouteKind;
  platform?: string;
}

export function currentRoute(): RouteInfo {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/login') return { kind: 'login' };
  if (path === '/register') return { kind: 'register' };
  if (path === '/profile') return { kind: 'profile' };
  const matched = path.match(/^\/callback\/([^/]+)$/);
  if (matched) return { kind: 'callback', platform: decodeURIComponent(matched[1]) };
  return { kind: 'home' };
}

export function navigate(path: string, replace = false): void {
  if (replace) window.history.replaceState(null, '', path);
  else window.history.pushState(null, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function subscribeRoute(handler: () => void): () => void {
  window.addEventListener('popstate', handler);
  return () => window.removeEventListener('popstate', handler);
}
