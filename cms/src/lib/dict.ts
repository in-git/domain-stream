/**
 * 系统业务字典对接层
 * ------------------------------------------------------------------
 * 当前用于「通用分类适用模块」字典项：
 * 字典类型：CATEGORY_MODULE
 * 后端接口：/biz/category/dict/*（options / detail / add / edit / delete）
 */
import { snowyRequest } from './snowy.ts';

const BASE = '/biz/category/dict';

/** 系统业务字典项（DEV_DICT，category = BIZ） */
export interface BizDictItem {
  id: string;
  parentId?: string;
  dictLabel?: string;
  dictValue?: string;
  dictColor?: string;
  category?: string;
  sortCode?: number;
  extJson?: string;
}

export interface BizDictItemPayload {
  dictLabel: string;
  dictValue: string;
  dictColor: string;
  sortCode: number;
}

export interface BizDictItemEditPayload extends BizDictItemPayload {
  id: string;
}

/** 通用分类适用模块字典 CRUD */
export const categoryModuleDictApi = {
  options: () => snowyRequest<BizDictItem[]>(`${BASE}/options`),

  detail: (id: string) =>
    snowyRequest<BizDictItem>(`${BASE}/detail?id=${encodeURIComponent(id)}`),

  add: (payload: BizDictItemPayload) =>
    snowyRequest<string>(`${BASE}/add`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  edit: (payload: BizDictItemEditPayload) =>
    snowyRequest<string>(`${BASE}/edit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  delete: (ids: string[]) =>
    snowyRequest<string>(`${BASE}/delete`, {
      method: 'POST',
      body: JSON.stringify(ids.map((id) => ({ id }))),
    }),
};
