/**
 * 通用分类（BIZ_CATEGORY）接口对接层
 * ------------------------------------------------------------------
 * 后端：vip.xiaonuo.biz.modular.category.controller.BizCategoryController
 * 路由：/biz/category/*（GET page / detail，POST add / edit / delete / exportData）
 * 前端统一经 /snowy 代理访问，与登录态 token 保持一致。
 *
 * 说明：搜索 / 模块 / 状态筛选均通过 page 接口在服务端完成；
 * 列表接口只负责按条件逐页拉取，树形组装仍在组件内完成。
 */
import { useEffect, useState } from 'react';
import { categoryModuleDictApi } from './dict.ts';
import { SnowyAuthError, snowyFetch, snowyRequest } from './snowy.ts';

const BASE = '/biz/category';

/** 适用模块字典项（来自系统业务字典 CATEGORY_MODULE） */
export interface CategoryModuleOption {
  id?: string;
  value: string;
  label: string;
  color?: string;
  sortCode?: number;
}

export type CategoryModule = string;

let categoryModuleCache: CategoryModuleOption[] = [];
let categoryModulePromise: Promise<CategoryModuleOption[]> | null = null;
const categoryModuleListeners = new Set<() => void>();

function notifyCategoryModulesChanged(): void {
  categoryModuleListeners.forEach((listener) => listener());
}

/** 拉取并缓存适用模块字典；并发调用共用同一个 Promise */
export function loadCategoryModules(force = false): Promise<CategoryModuleOption[]> {
  if (!force && categoryModulePromise) return categoryModulePromise;
  categoryModulePromise = categoryModuleDictApi
    .options()
    .then((rows) => {
      categoryModuleCache = rows
        .map((row) => ({
          id: row.id,
          value: row.dictValue || '',
          label: row.dictLabel || row.dictValue || '',
          color: row.dictColor,
          sortCode: row.sortCode ?? 0,
        }))
        .filter((item) => !!item.value);
      notifyCategoryModulesChanged();
      return categoryModuleCache;
    })
    .catch(() => {
      categoryModulePromise = null;
      return categoryModuleCache;
    });
  return categoryModulePromise;
}

/** 订阅适用模块字典，字典变化后组件会自动重新渲染 */
export function useCategoryModules(): CategoryModuleOption[] {
  const [options, setOptions] = useState<CategoryModuleOption[]>(() => [...categoryModuleCache]);
  useEffect(() => {
    let alive = true;
    const listener = () => {
      if (alive) setOptions([...categoryModuleCache]);
    };
    categoryModuleListeners.add(listener);
    void loadCategoryModules().then((rows) => {
      if (alive) setOptions([...rows]);
    });
    return () => {
      alive = false;
      categoryModuleListeners.delete(listener);
    };
  }, []);
  return options;
}

/** 状态枚举：与 BIZ_CATEGORY.STATUS 字段注释一致 */
export const CATEGORY_STATUSES = [
  { value: 'ENABLE', label: '启用' },
  { value: 'DISABLE', label: '禁用' },
  { value: 'PRIVATE', label: '私密' },
] as const;

export function categoryModuleLabel(value?: string): string {
  if (!value) return '-';
  return categoryModuleCache.find((m) => m.value === value)?.label || value;
}

export function categoryStatusLabel(value?: string): string {
  return CATEGORY_STATUSES.find((s) => s.value === value)?.label || value || '-';
}

/** BIZ_CATEGORY 实体（后端字段为驼峰） */
export interface BizCategory {
  id: string;
  parentId?: string;
  name?: string;
  code?: string;
  image?: string;
  icon?: string;
  module?: string;
  description?: string;
  status?: string;
  sortCode?: number;
  remark?: string;
  extJson?: string;
  deleteFlag?: string;
  createTime?: string;
  createUser?: string;
  updateTime?: string;
  updateUser?: string;
}

/** 分类列表服务端查询条件 */
export interface CategoryPageQuery {
  searchKey?: string;
  module?: string;
  status?: string;
}

/** add / edit 允许提交的业务字段（不含审计字段） */
export interface CategoryPayload {
  id?: string;
  parentId?: string;
  name?: string;
  code?: string;
  image?: string;
  icon?: string;
  module?: string;
  description?: string;
  status?: string;
  sortCode?: number;
  remark?: string;
  extJson?: string;
}

/** MyBatis-Plus 分页对象 */
export interface CategoryPage {
  records: BizCategory[];
  total: number;
  size: number;
  current: number;
  pages: number;
}

/**
 * 分类编码不由用户填写：新增时自动生成。
 * 业务表以该编码关联分类，因此不能留空。
 */
export function generateCategoryCode(): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `cat_${random}`;
}

/**
 * 按分类编码去重。
 * 业务表以 code 关联分类，下拉框也以 code 作为唯一值，
 * 因此同 code 跨模块（尤其 COMMON）同时出现时必须只保留一个。
 */
export function dedupePublishCategoryOptions(
  options: PublishCategoryOption[],
  module: PublishCategoryModule
): PublishCategoryOption[] {
  const current = module.toUpperCase();
  const byCode = new Map<string, PublishCategoryOption>();
  for (const option of options) {
    const code = (option.code || '').trim();
    if (!code) continue;
    const existing = byCode.get(code);
    if (!existing) {
      byCode.set(code, option);
      continue;
    }
    const priority = (item: PublishCategoryOption) => {
      const itemModule = (item.module || '').toUpperCase();
      if (itemModule === current) return 2;
      if (itemModule === 'COMMON' || !itemModule) return 1;
      return 0;
    };
    if (priority(option) > priority(existing)) byCode.set(code, option);
  }
  return Array.from(byCode.values());
}

function qs(params: Record<string, unknown> = {}): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (!entries.length) return '';
  return (
    '?' +
    entries
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&')
  );
}

/** 分类动作权限码，兼容 Snowy 按钮码与 SaCheckPermission 的路径码两种写法 */
export type CategoryPermAction =
  | 'page'
  | 'detail'
  | 'add'
  | 'edit'
  | 'delete'
  | 'export';

const PERM_CODES: Record<CategoryPermAction, string[]> = {
  page: ['bizCategoryPage', '/biz/category/page'],
  detail: ['bizCategoryDetail', '/biz/category/detail'],
  add: ['bizCategoryAdd', '/biz/category/add'],
  edit: ['bizCategoryEdit', '/biz/category/edit'],
  delete: ['bizCategoryDelete', 'bizCategoryBatchDelete', '/biz/category/delete'],
  export: ['bizCategoryExport', '/biz/category/exportData'],
};

/**
 * 菜单可见即代表有该模块的访问权限；权限列表为空（超管/未下发按钮码）时
 * 不隐藏按钮，由后端 @SaCheckPermission 兜底，避免有菜单却无法操作。
 */
export function hasCategoryPerm(
  permissions: string[] | undefined | null,
  action: CategoryPermAction
): boolean {
  if (!permissions || permissions.length === 0) return true;
  const codes = PERM_CODES[action];
  return permissions.some((c) => c === '*' || codes.includes(c));
}

function timestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function filenameFromDisposition(raw: string | null): string {
  if (!raw) return '';
  // RFC 5987: filename*=UTF-8''%E9%80%9A...
  const star = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(raw);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ''));
    } catch {
      return star[1].trim();
    }
  }
  const plain = /filename\s*=\s*"([^"]+)"|filename\s*=\s*([^;]+)/i.exec(raw);
  return (plain?.[1] || plain?.[2] || '').trim();
}

/** 把二进制响应保存为文件；后端异常时响应可能是 JSON，需要给出可读提示 */
async function saveDownload(res: Response, fallbackName: string): Promise<void> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json') || contentType.includes('text/plain')) {
    const payload = await res.json().catch(() => null);
    if (payload?.code === 401 || res.status === 401) {
      throw new SnowyAuthError(payload?.msg || '登录已失效，请重新登录');
    }
    throw new Error(payload?.msg || `下载失败 (${res.status})`);
  }
  if (!res.ok) throw new Error(`下载失败 (${res.status})`);
  const blob = await res.blob();
  if (!blob.size) throw new Error('导出内容为空，请检查筛选条件');
  const filename = filenameFromDisposition(res.headers.get('content-disposition')) || fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export const categoryApi = {
  /** 分页（后端默认按 SORT_CODE 升序） */
  page(params: {
    current?: number;
    size?: number;
    sortField?: string;
    sortOrder?: string;
    searchKey?: string;
    module?: string;
    status?: string;
  } = {}): Promise<CategoryPage> {
    const sortOrder = params.sortOrder?.toLowerCase();
    return snowyRequest<CategoryPage>(`${BASE}/page${qs({ ...params, sortOrder })}`);
  },

  /** 详情 */
  detail(id: string): Promise<BizCategory> {
    return snowyRequest<BizCategory>(`${BASE}/detail${qs({ id })}`);
  },

  /** 新增 */
  add(payload: CategoryPayload): Promise<string> {
    return snowyRequest<string>(`${BASE}/add`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** 编辑（payload 必须带 id） */
  edit(payload: CategoryPayload): Promise<string> {
    return snowyRequest<string>(`${BASE}/edit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  /** 删除：后端要求 [{"id":"..."}] 数组，支持批量 */
  remove(ids: string[]): Promise<string> {
    return snowyRequest<string>(`${BASE}/delete`, {
      method: 'POST',
      body: JSON.stringify(ids.map((id) => ({ id }))),
    });
  },

  /** 导出：传 id 数组导出指定项，传空数组导出全部 */
  async exportData(ids: string[] = []): Promise<void> {
    const res = await snowyFetch(`${BASE}/exportData`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ids.map((id) => ({ id }))),
    });
    await saveDownload(res, `通用分类_${timestamp()}.xlsx`);
  },
};

/** 按服务端条件循环分页拉取分类 */
export async function listAllCategories(query: CategoryPageQuery = {}): Promise<BizCategory[]> {
  const all: BizCategory[] = [];
  const size = 20;
  for (let current = 1; ; current++) {
    const page = await categoryApi.page({ current, size, ...query });
    const records = page?.records || [];
    if (!records.length) break;
    // 后端可能限制每页条数或忽略 current：按 id 去重，避免重复累加或死循环
    const known = new Set(all.map((item) => item.id));
    const fresh = records.filter((item) => !known.has(item.id));
    if (!fresh.length) break;
    all.push(...fresh);
    const total = page?.total ?? all.length;
    if (all.length >= total) break;
  }
  return all;
}

/* ------------------------------------------------------------------ */
/* 发布表单分类选项                                                     */
/* ------------------------------------------------------------------ */

/** 发布表单可用的分类模块；COMMON 作为各模块共享分类 */
export type PublishCategoryModule = 'ARTICLE' | 'VIDEO' | 'GRAPHIC' | 'COMMON';

export interface PublishCategoryOption {
  /** 后端分类主键，用于重建父子层级 */
  id: string;
  /** 提交给业务接口的分类编码，对应 BIZ_CATEGORY.CODE */
  code: string;
  /** 纯分类名称，用于预览/列表展示 */
  name: string;
  /** 带层级缩进的展示文本，用于下拉框 */
  label: string;
  module?: string;
  parentId: string;
  sortCode: number;
}

/**
 * 拉取发布表单可选分类（数据源为后端通用分类模块 BIZ_CATEGORY）。
 *
 * 优先使用门户只读接口 `/public/categories?module=...`（后端按模块筛选并 ENABLE，免登录），
 * 接口不可用（如旧环境未部署）时回退到 CMS 分类管理分页接口 `/biz/category/page`。
 * 返回顺序严格按后端 sortCode 升序，不再在前端重排模块优先级。
 */
export async function fetchPublishCategories(
  module: PublishCategoryModule
): Promise<PublishCategoryOption[]> {
  let source: BizCategory[] = [];
  try {
    source = await snowyRequest<BizCategory[]>(
      `/public/categories?module=${encodeURIComponent(module)}`
    );
  } catch {
    source = await listAllCategories();
  }

  const usable = source
    .map((item) => ({
      ...item,
      code: (item.code || '').trim(),
      name: (item.name || '').trim(),
    }))
    .filter((item) => {
      if (!item.code) return false;
      // 仅排除明确禁用的分类；适用模块不作为硬过滤条件
      return !item.status || item.status === 'ENABLE';
    });

  const byId = new Map(usable.map((item) => [item.id, item]));
  const childrenOf = new Map<string, typeof usable>();
  const roots: typeof usable = [];

  for (const item of usable) {
    const parentId = item.parentId && item.parentId !== '0' ? item.parentId : '';
    // 父级不在可选集合中时按顶级处理，避免分类被隐藏
    if (!parentId || !byId.has(parentId)) {
      roots.push(item);
    } else {
      const siblings = childrenOf.get(parentId) || [];
      siblings.push(item);
      childrenOf.set(parentId, siblings);
    }
  }

  // 后端已按 sortCode 升序返回，这里只补稳定的同值兜底
  const compare = (a: (typeof usable)[number], b: (typeof usable)[number]) =>
    (a.sortCode ?? 0) - (b.sortCode ?? 0) ||
    a.name.localeCompare(b.name, 'zh-CN') ||
    a.id.localeCompare(b.id);
  roots.sort(compare);
  childrenOf.forEach((list) => list.sort(compare));

  const result: PublishCategoryOption[] = [];
  const seen = new Set<string>();
  const append = (item: (typeof usable)[number], depth: number) => {
    if (seen.has(item.id)) return;
    seen.add(item.id);
    result.push({
      id: item.id,
      code: item.code,
      name: item.name || item.code,
      label: depth > 0 ? `${'　'.repeat(depth - 1)}└ ${item.name || item.code}` : item.name || item.code,
      module: item.module,
      parentId: item.parentId || '0',
      sortCode: item.sortCode ?? 0,
    });
  };
  const walk = (items: typeof usable, depth: number) => {
    items.forEach((item) => {
      append(item, depth);
      walk(childrenOf.get(item.id) || [], depth + 1);
    });
  };
  walk(roots, 0);
  // 防御环形父子关系：未遍历到的节点补到末尾
  usable.forEach((item) => append(item, 0));

  return dedupePublishCategoryOptions(result, module);
}

/**
 * 按适用模块兜底筛选分类（发布接口已按模块返回，兼容旧数据/缓存）：
 * 只保留目标模块与「通用」（COMMON）分类。
 * 父级被筛掉时，子分类按顶级展示并重算缩进，避免出现悬空层级。
 */
export function filterPublishCategories(
  options: PublishCategoryOption[],
  module: PublishCategoryModule,
  includeCommon = true
): PublishCategoryOption[] {
  const matched = dedupePublishCategoryOptions(
    options.filter((option) => {
      const current = (option.module || '').toUpperCase();
      return current === module || (includeCommon && current === 'COMMON');
    }),
    module
  );
  if (!matched.length) return matched;

  const byId = new Map(matched.map((option) => [option.id, option]));
  return matched.map((option) => {
    let depth = 0;
    let cursor = option.parentId && option.parentId !== '0' ? option.parentId : '';
    const seen = new Set<string>();
    while (cursor && byId.has(cursor) && !seen.has(cursor)) {
      seen.add(cursor);
      depth += 1;
      const parent = byId.get(cursor);
      cursor = parent?.parentId && parent.parentId !== '0' ? parent.parentId : '';
    }
    return {
      ...option,
      label: depth > 0 ? `${'　'.repeat(depth - 1)}└ ${option.name}` : option.name,
    };
  });
}

/** 兼容历史数据：优先按编码匹配，其次按分类名称匹配 */
export function resolvePublishCategoryCode(
  options: PublishCategoryOption[],
  value?: string
): string {
  const raw = (value || '').trim();
  if (!raw) return '';
  const exact = options.find((option) => option.code === raw);
  if (exact) return exact.code;
  const byName = options.find((option) => option.name === raw || option.label === raw);
  return byName?.code || '';
}

/** 预览/列表展示用名称；找不到时保留原始值，避免历史数据展示为空 */
export function publishCategoryName(
  options: PublishCategoryOption[],
  code?: string
): string {
  if (!code) return '未分类';
  const resolved = resolvePublishCategoryCode(options, code);
  return options.find((option) => option.code === resolved)?.name || code;
}
