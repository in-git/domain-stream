/**
 * 页面配置 API
 * ------------------------------------------------------------------
 * 对应后端 vip.xiaonuo.biz.modular.config（BizConfigController），
 * 管理 dev_config 中 CLIENT_CONFIG 配置里的 JSON 属性。
 */
import { snowyRequest } from './snowy.ts';

export interface PageConfigItem {
  key: string;
  value: string;
}

function jsonBody(body: unknown): RequestInit {
  return { method: 'POST', body: JSON.stringify(body) };
}

export const pageConfigApi = {
  /** 全部属性（按 JSON 中的顺序） */
  list: () => snowyRequest<PageConfigItem[]>('/biz/config/list'),

  /** 单个属性 */
  detail: (key: string) =>
    snowyRequest<PageConfigItem>(`/biz/config/detail?key=${encodeURIComponent(key)}`),

  /** 原始 JSON 字符串 */
  rawJson: () => snowyRequest<string>('/biz/config/json'),

  /** 新增属性，属性名重复时后端报错 */
  add: (key: string, value: string) =>
    snowyRequest<void>('/biz/config/add', jsonBody({ key, value })),

  /** 编辑属性值 */
  edit: (key: string, value: string) =>
    snowyRequest<void>('/biz/config/edit', jsonBody({ key, value })),

  /** 删除属性 */
  remove: (key: string) =>
    snowyRequest<void>('/biz/config/delete', jsonBody({ key })),
};
