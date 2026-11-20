/**
 * 系统基础信息（公共接口 /public/system/info）
 * ------------------------------------------------------------------
 * 模块级 store：应用启动时拉取一次，所有组件通过 useSystemInfo() 订阅。
 * title 来自系统配置 CLIENT_CONFIG 的 title，网页标题与开屏文本共用该值。
 */
import { useSyncExternalStore } from 'react';
import { portalApi, type PublicSystemInfo } from './api';

const FALLBACK_TITLE = '吴文龙的私域';

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
    emit();
  } catch {
    loaded = false;
  }
}

/** 订阅系统信息，组件无需手动传 props */
export function useSystemInfo(): PublicSystemInfo {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
