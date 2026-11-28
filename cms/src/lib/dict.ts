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
export interface BizDictTypePayload {
  dictLabel: string;
  dictValue: string;
  dictColor?: string;
  sortCode: number;
}

export interface BizDictTypeEditPayload extends BizDictTypePayload {
  id: string;
}

export interface BizDictItemCreatePayload {
  typeId: string;
  dictLabel: string;
  dictValue: string;
  dictColor?: string;
  sortCode: number;
}

export interface BizDictItemUpdatePayload {
  id: string;
  dictLabel: string;
  dictValue: string;
  dictColor?: string;
  sortCode: number;
}

/** 业务字典管理 CRUD（字典类型 + 字典项，DEV_DICT category = BIZ） */
export const businessDictApi = {
  typeList: () => snowyRequest<BizDictItem[]>('/biz/business-dict/type/list'),

  itemList: (typeId: string) =>
    snowyRequest<BizDictItem[]>(
      `/biz/business-dict/item/list?typeId=${encodeURIComponent(typeId)}`
    ),

  /** 按类型编码取字典项，业务页面下拉/筛选项使用 */
  options: (typeCode: string) =>
    snowyRequest<BizDictItem[]>(
      `/biz/business-dict/options?typeCode=${encodeURIComponent(typeCode)}`
    ),

  addType: (payload: BizDictTypePayload) =>
    snowyRequest<string>('/biz/business-dict/type/add', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  editType: (payload: BizDictTypeEditPayload) =>
    snowyRequest<string>('/biz/business-dict/type/edit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteTypes: (ids: string[]) =>
    snowyRequest<string>('/biz/business-dict/type/delete', {
      method: 'POST',
      body: JSON.stringify(ids.map((id) => ({ id }))),
    }),

  addItem: (payload: BizDictItemCreatePayload) =>
    snowyRequest<string>('/biz/business-dict/item/add', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  editItem: (payload: BizDictItemUpdatePayload) =>
    snowyRequest<string>('/biz/business-dict/item/edit', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  deleteItems: (ids: string[]) =>
    snowyRequest<string>('/biz/business-dict/item/delete', {
      method: 'POST',
      body: JSON.stringify(ids.map((id) => ({ id }))),
    }),
};

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
