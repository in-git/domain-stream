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
/** 请求是否已有结果（成功或失败），用于开屏等场景判断「配置是否已就绪」 */
let settled = false;
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

function snapshotSettled(): boolean {
  return settled;
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

/** 客户端「关于」页底部的联系方式条目 */
export interface ContactLink {
  label: string;
  url: string;
}

/** 解析 CMS 配置的联系方式 JSON；未填完整的条目不展示 */
export function parseContactLinks(raw?: string): ContactLink[] {
  const value = (raw || '').trim();
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.reduce<ContactLink[]>((acc, entry) => {
      if (!entry || typeof entry !== 'object') return acc;
      const row = entry as Record<string, unknown>;
      const label =
        typeof row.label === 'string' ? row.label.trim() : '';
      const url = typeof row.url === 'string' ? row.url.trim() : '';
      if (label && url) acc.push({ label, url });
      return acc;
    }, []);
  } catch {
    return [];
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

function normalizeColor(value?: string): string | undefined {
  const raw = (value || '').trim();
  if (!raw) return undefined;
  if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(raw)) return raw;
  if (typeof CSS !== 'undefined' && CSS.supports?.('color', raw)) return raw;
  return undefined;
}

/** 根据高亮色亮度选择黑/白前景，保证按钮文字可读 */
function primaryForeground(color: string): string {
  const full = color.replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i, '#$1$1$2$2$3$3');
  const hex = full.slice(1);
  if (!/^[0-9a-f]{6}$/i.test(hex)) return '#FFFFFF';
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.65 ? '#1D1D1F' : '#FFFFFF';
}

function normalizePixels(value?: string): string | undefined {
  const raw = (value || '').trim();
  if (!raw) return undefined;
  const size = Number.parseFloat(raw);
  if (!Number.isFinite(size)) return undefined;
  return `${Math.min(Math.max(size, 0), 64)}px`;
}

/**
 * 把 CMS 客户端配置里的高亮色、圆角写到根节点。
 * 背景色保持现有黑白主题不变；只覆盖有值的变量，缺省或非法值回退到 index.css 默认值。
 */
export function applyClientTheme(config: Record<string, string> = {}): void {
  const root = document.documentElement;
  const primary = normalizeColor(config.themeColor);
  const values: Record<string, string | undefined> = {
    '--app-color-primary': primary,
    '--app-color-primary-fg': primary ? primaryForeground(primary) : undefined,
    '--app-radius': normalizePixels(config.themeRadius),
  };
  Object.entries(values).forEach(([name, value]) => {
    if (value) root.style.setProperty(name, value);
    else root.style.removeProperty(name);
  });
}

/**
 * 开屏属性在 CMS 里统一存在 config.splash（JSON 对象）中，
 * 这里展开成扁平 key，组件仍按 config.splashXxx 读取。
 */
const SPLASH_SUB_KEYS: Record<string, string> = {
  splashDuration: 'duration',
  splashVideoLandscapeUrl: 'videoLandscapeUrl',
  splashVideoPortraitUrl: 'videoPortraitUrl',
  splashImageLandscapeUrl: 'imageLandscapeUrl',
  splashImagePortraitUrl: 'imagePortraitUrl',
  splashAudioUrl: 'audioUrl',
  splashTitlePosLandscape: 'titlePosLandscape',
  splashTitlePosPortrait: 'titlePosPortrait',
  splashTitleFontSize: 'titleFontSize',
  splashTitleColor: 'titleColor',
  splashCanvas: 'canvas',
};

/** 把 config.splash 展开成扁平配置；没有 splash 时保持原样（兼容旧数据） */
function normalizePortalConfig(raw: Record<string, string>): Record<string, string> {
  const splashRaw = (raw.splash || '').trim();
  if (!splashRaw) return raw;
  let parsed: unknown;
  try {
    parsed = JSON.parse(splashRaw);
  } catch {
    return raw;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return raw;
  const splash = parsed as Record<string, unknown>;
  const config = { ...raw };
  for (const [flatKey, name] of Object.entries(SPLASH_SUB_KEYS)) {
    const value = splash[name];
    if (typeof value === 'string') {
      config[flatKey] = value;
    } else if (flatKey === 'splashCanvas' && value && typeof value === 'object') {
      config[flatKey] = JSON.stringify(value);
    }
  }
  return config;
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
      config: normalizePortalConfig(data.config ?? {}),
    };
    document.title = info.title;
    applyFavicon(publicFileUrl(info.config.faviconUrl));
    applyClientTheme(info.config);
    settled = true;
    emit();
  } catch {
    // 失败也标记为已结束：开屏按默认时长继续，不让用户一直等配置
    loaded = false;
    settled = true;
    emit();
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

/** 系统信息请求是否已有结果（成功或失败均可），开屏计时以此为准 */
export function useSystemInfoSettled(): boolean {
  return useSyncExternalStore(subscribe, snapshotSettled, () => false);
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
