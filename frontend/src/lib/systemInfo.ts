/**
 * 系统基础信息（公共接口 /public/system/info）
 * ------------------------------------------------------------------
 * 模块级 store：应用启动时拉取一次，所有组件通过 useSystemInfo() 订阅。
 * title 来自系统配置 CLIENT_CONFIG 的 title，网页标题与开屏文本共用该值。
 */
import { useSyncExternalStore } from 'react';
import { portalApi, type PublicSystemInfo } from './api';

const FALLBACK_TITLE = '私域';

let info: PublicSystemInfo = { siteName: FALLBACK_TITLE, title: FALLBACK_TITLE, config: {} };
let loaded = false;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): PublicSystemInfo {
  return info;
}

function snapshotLoaded(): boolean {
  return loaded;
}

/**
 * 把配置里存的纯后端文件地址转成前台可访问地址。
 * CMS 存的是 /dev/file/download?id=...&sign=...（公开文件带签名），
 * 这里转成前台代理下的 /api/public/file/stream（支持图片直接渲染）。
 */
export function publicFileUrl(raw?: string): string {
  const value = (raw || '').trim();
  if (!value || value.startsWith('http')) return value;
  try {
    const u = new URL(value, window.location.origin);
    if (!u.pathname.includes('/dev/file/download')) return value;
    const id = u.searchParams.get('id');
    const sign = u.searchParams.get('sign');
    if (id && sign) {
      return `/api/public/file/stream?id=${encodeURIComponent(id)}&sign=${encodeURIComponent(sign)}`;
    }
    return value;
  } catch {
    return value;
  }
}

/** 应用配置的 favicon；留空时移除，回退到浏览器默认图标 */
function applyFavicon(url: string): void {
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!url) {
    link?.remove();
    return;
  }
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}

/** 读取一次系统信息（多次调用只请求一次；失败时允许下次重试） */
export async function loadSystemInfo(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const data = await portalApi.systemInfo();
    info = {
      siteName: data.siteName || FALLBACK_TITLE,
      title: data.title || data.siteName || FALLBACK_TITLE,
      config: data.config ?? {},
    };
    document.title = info.title;
    applyFavicon(publicFileUrl(info.config.faviconUrl));
    emit();
  } catch {
    loaded = false;
  }
}

/** 订阅系统信息，组件无需手动传 props */
export function useSystemInfo(): PublicSystemInfo {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** 系统信息是否已从后端加载完成 */
export function useSystemInfoLoaded(): boolean {
  return useSyncExternalStore(subscribe, snapshotLoaded, () => false);
}

/** CLIENT_CONFIG.allowComment 为 NO/FALSE/0 时关闭评论；缺失时默认允许 */
export function commentEnabled(config?: Record<string, string>): boolean {
  const value = (config?.allowComment ?? 'YES').trim().toUpperCase();
  return value !== 'NO' && value !== 'FALSE' && value !== '0';
}

/** 组件中直接订阅评论开关 */
export function useCommentEnabled(): boolean {
  const { config } = useSystemInfo();
  return commentEnabled(config);
}
