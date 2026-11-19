/**
 * 通用分类（BIZ_CATEGORY）接口对接层
 * ------------------------------------------------------------------
 * 后端：vip.xiaonuo.biz.modular.category.controller.BizCategoryController
 * 路由：/biz/category/*（GET page / detail / downloadImportTemplate，
 *       POST add / edit / delete / importData / exportData）
 * 前端统一经 /snowy 代理访问，与登录态 token 保持一致。
 *
 * 说明：后端 page() 为代码生成器默认实现，不使用 searchKey/模块等条件，
 * 因此列表接口负责分页拉取全量数据，搜索/筛选/树形组装都在组件内完成。
 */
import { SnowyAuthError, snowyFetch, snowyRequest } from './snowy.ts';

const BASE = '/biz/category';

/** 适用模块枚举：与 BIZ_CATEGORY.MODULE 字段注释一致 */
export const CATEGORY_MODULES = [
  { value: 'ARTICLE', label: '文章' },
  { value: 'VIDEO', label: '视频' },
  { value: 'GRAPHIC', label: '图文' },
  { value: 'IMAGE', label: '图片' },
  { value: 'COMMON', label: '通用' },
] as const;

export type CategoryModule = (typeof CATEGORY_MODULES)[number]['value'];

/** 状态枚举：与 BIZ_CATEGORY.STATUS 字段注释一致 */
export const CATEGORY_STATUSES = [
  { value: 'ENABLE', label: '启用' },
  { value: 'DISABLE', label: '禁用' },
] as const;

export function categoryModuleLabel(value?: string): string {
  return CATEGORY_MODULES.find((m) => m.value === value)?.label || value || '-';
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

/** importData 返回的统计结果 */
export interface CategoryImportResult {
  totalCount: number;
  successCount: number;
  errorCount: number;
  errorDetail?: Array<{ index?: number; success?: boolean; msg?: string }>;
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
  | 'import'
  | 'export'
  | 'template';

const PERM_CODES: Record<CategoryPermAction, string[]> = {
  page: ['bizCategoryPage', '/biz/category/page'],
  detail: ['bizCategoryDetail', '/biz/category/detail'],
  add: ['bizCategoryAdd', '/biz/category/add'],
  edit: ['bizCategoryEdit', '/biz/category/edit'],
  delete: ['bizCategoryDelete', 'bizCategoryBatchDelete', '/biz/category/delete'],
  import: ['bizCategoryImport', '/biz/category/importData'],
  export: ['bizCategoryExport', '/biz/category/exportData'],
  template: ['bizCategoryDownloadTemplate', '/biz/category/downloadImportTemplate'],
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

async function readJson<T>(res: Response): Promise<T> {
  const payload = await res.json().catch(() => null);
  if (!payload) throw new Error(`请求失败 (${res.status})：响应格式异常`);
  if (payload.code === 401 || res.status === 401) {
    throw new SnowyAuthError(payload.msg || '登录已失效，请重新登录');
  }
  if (payload.code !== 200) {
    throw new Error(payload.msg || `请求失败 (${res.status})`);
  }
  return payload.data as T;
}

export const categoryApi = {
  /** 分页（后端默认按 SORT_CODE 升序） */
  page(params: {
    current?: number;
    size?: number;
    sortField?: string;
    sortOrder?: string;
    searchKey?: string;
  } = {}): Promise<CategoryPage> {
    return snowyRequest<CategoryPage>(`${BASE}/page${qs(params)}`);
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

  /** 下载导入模板 */
  async downloadTemplate(): Promise<void> {
    const res = await snowyFetch(`${BASE}/downloadImportTemplate`);
    await saveDownload(res, `通用分类导入模板_${timestamp()}.xlsx`);
  },

  /** 导入 Excel（multipart/form-data，字段名为 file） */
  async importData(file: File): Promise<CategoryImportResult> {
    const form = new FormData();
    form.append('file', file);
    const res = await snowyFetch(`${BASE}/importData`, {
      method: 'POST',
      body: form,
    });
    return readJson<CategoryImportResult>(res);
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

/** 循环分页拉取全部分类（后端 page 不支持条件查询，列表页在前端过滤） */
export async function listAllCategories(): Promise<BizCategory[]> {
  const all: BizCategory[] = [];
  const size = 200;
  for (let current = 1; current <= 50; current++) {
    const page = await categoryApi.page({ current, size });
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
