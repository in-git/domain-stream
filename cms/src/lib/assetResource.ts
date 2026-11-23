/**
 * 远端素材资源接口
 * 后端：vip.xiaonuo.biz.modular.asset（BizAssetResourceController）
 * 路由：/biz/asset-resource/*
 *
 * 素材只保存元数据与远程 URL，列表与预览不落地；用户选择后登记进素材中心。
 */
import { snowyRequest } from './snowy.ts';

const BASE = '/biz/asset-resource';

export interface AssetResource {
  id: string;
  source: string;
  sourceKey?: string;
  type: 'ICON' | 'WALLPAPER' | string;
  title: string;
  description?: string;
  tags?: string;
  license?: string;
  author?: string;
  homepage?: string;
  inMaterial: string;
  materialFileId?: string;
  createTime?: string;
  previewUrl: string;
  imageUrl: string;
  remotePreviewUrl?: string;
  remoteImageUrl?: string;
}

export interface AssetResourcePage {
  records: AssetResource[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

export interface AssetSiteStat {
  value: string;
  label: string;
  assetCount: number;
}

export interface AssetTypeSite {
  value: string;
  label: string;
  assetCount: number;
  sites: AssetSiteStat[];
}

export interface AssetResourceQuery {
  current?: number;
  size?: number;
  type?: string;
  source?: string;
  tag?: string;
  inMaterial?: string;
  keyword?: string;
}

function qs(params: Record<string, unknown> = {}): string {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== ''
  );
  if (!entries.length) return '';
  return '?' + entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('&');
}

export const assetResourceApi = {
  page(params: AssetResourceQuery = {}): Promise<AssetResourcePage> {
    return snowyRequest<AssetResourcePage>(`${BASE}/page${qs({ ...params })}`);
  },
  sites(): Promise<AssetTypeSite[]> {
    return snowyRequest<AssetTypeSite[]>(`${BASE}/sites`);
  },
  collect(): Promise<string> {
    return snowyRequest<string>(`${BASE}/collect`, { method: 'POST' });
  },
  addToMaterial(ids: string[]): Promise<void> {
    return snowyRequest<void>(`${BASE}/add-to-material`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },
};

/** 代理地址由 snowyRequest 的统一前缀转发 */
export function proxyUrl(raw?: string): string {
  if (!raw) return '';
  return raw.startsWith('/') ? `/snowy${raw}` : raw;
}
