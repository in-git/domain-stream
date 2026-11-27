/**
 * 素材资源库接口
 * 后端：vip.xiaonuo.biz.modular.asset（BizAssetResourceController）
 * 路由：/biz/asset-resource/*
 *
 * 资源通过「网址采集」录入，采集时登记到资源库，用户可手动加入素材中心。
 */
import { snowyFetch, snowyRequest } from './snowy.ts';

const BASE = '/biz/asset-resource';

export type AssetResourceType = 'IMAGE' | 'VIDEO' | 'SVG' | 'ICON';

export interface AssetResource {
  id: string;
  type: AssetResourceType;
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

export interface AssetCollectEvent {
  phase: 'progress' | 'done' | 'error';
  index: number;
  total: number;
  message: string;
  resource?: AssetResource;
}

export interface AssetResourceQuery {
  current?: number;
  size?: number;
  type?: string;
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
  collectUrl(payload: { url: string; type: string; name?: string }): Promise<string> {
    return snowyRequest<string>(`${BASE}/collect-url`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  async collectUrlStream(
    payload: { url: string; type: string; name?: string; limit?: number },
    onEvent: (event: AssetCollectEvent) => void
  ): Promise<void> {
    const response = await snowyFetch(`${BASE}/collect-url/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !response.body || !contentType.includes('event-stream')) {
      let message = `采集请求失败 (${response.status})`;
      try {
        const body = await response.json() as { msg?: string };
        message = body.msg || message;
      } catch {
        // 非 JSON 错误时保留状态码文案
      }
      throw new Error(message);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const handleFrame = (frame: string) => {
      const dataLine = frame
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.startsWith('data:'));
      if (!dataLine) return;
      const raw = dataLine.slice(5).trim();
      if (!raw || raw === '[DONE]') return;
      try {
        onEvent(JSON.parse(raw) as AssetCollectEvent);
      } catch {
        // 忽略无法解析的心跳或异常帧，继续读取后续资源
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const frames = buffer.split('\n\n');
      buffer = frames.pop() || '';
      frames.forEach(handleFrame);
    }
    if (buffer.trim()) handleFrame(buffer);
  },
  addToMaterial(ids: string[]): Promise<void> {
    return snowyRequest<void>(`${BASE}/add-to-material`, {
      method: 'POST',
      body: JSON.stringify({ ids }),
    });
  },
  /** 删除资源库记录（逻辑删除，不影响已加入素材中心的文件） */
  remove(ids: string[]): Promise<void> {
    return snowyRequest<void>(`${BASE}/delete`, {
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
