/**
 * 通用分类管理页
 * ------------------------------------------------------------------
 * 对应后端菜单：path = /biz/category，component = biz/category/index
 * 接口：vip.xiaonuo.biz.modular.category（BizCategoryController）
 *
 * 后端 page 为通用分页（无条件过滤），因此本页一次拉取全量分类，
 * 在前端完成搜索 / 模块 / 状态筛选、树形层级组装与分页展示。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FolderTree,
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  CATEGORY_MODULES,
  categoryApi,
  categoryModuleLabel,
  categoryStatusLabel,
  hasCategoryPerm,
  listAllCategories,
  type BizCategory,
  type CategoryPayload,
  type CategoryPermAction,
} from '../../../lib/category.ts';
import { formatDateShort } from '../../../lib/format.ts';
import { MediaImage } from '../../../components/MediaImage.tsx';
import {
  CategoryDeleteDialog,
  CategoryDetailDialog,
  CategoryFormDialog,
  CategoryImportDialog,
} from './dialogs.tsx';
import { SelectField } from '../../../components/SelectField.tsx';

const PAGE_SIZE = 10;
const GRID_CLASS =
  'grid grid-cols-[36px_minmax(220px,1.7fr)_110px_92px_64px_120px_132px] gap-3 items-center';

type DialogState =
  | { kind: 'form'; item: BizCategory | null }
  | { kind: 'detail'; id: string }
  | { kind: 'delete'; items: BizCategory[] }
  | { kind: 'import' }
  | null;

interface CategoryRow {
  item: BizCategory;
  depth: number;
  hasChildren: boolean;
}

interface Toast {
  kind: 'success' | 'error';
  text: string;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '操作失败，请稍后重试';
}

function isRoot(item: BizCategory, ids: Set<string>): boolean {
  return !item.parentId || item.parentId === '0' || !ids.has(item.parentId);
}

function bySort(a: BizCategory, b: BizCategory): number {
  const diff = (a.sortCode ?? 9999) - (b.sortCode ?? 9999);
  return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '', 'zh-CN');
}

/** 无筛选条件时按 parentId 组装树，并应用折叠状态 */
function buildTreeRows(
  items: BizCategory[],
  collapsed: Set<string>
): CategoryRow[] {
  const ids = new Set(items.map((i) => i.id));
  const childrenOf = new Map<string, BizCategory[]>();
  items.forEach((item) => {
    const key = item.parentId && ids.has(item.parentId) ? item.parentId : '__root__';
    const list = childrenOf.get(key) || [];
    list.push(item);
    childrenOf.set(key, list);
  });
  childrenOf.forEach((list) => list.sort(bySort));

  const rows: CategoryRow[] = [];
  const visited = new Set<string>();
  const walk = (list: BizCategory[], depth: number) => {
    list.forEach((item) => {
      if (visited.has(item.id)) return; // 防御脏数据造成的环
      visited.add(item.id);
      const children = childrenOf.get(item.id) || [];
      rows.push({ item, depth, hasChildren: children.length > 0 });
      if (children.length && !collapsed.has(item.id)) walk(children, depth + 1);
    });
  };
  walk((childrenOf.get('__root__') || []).filter((i) => isRoot(i, ids)), 0);
  // 有环或父级链断裂时，兜底把未访问到的节点挂到顶级
  items.filter((i) => !visited.has(i.id)).sort(bySort).forEach((item) => {
    rows.push({ item, depth: 0, hasChildren: false });
  });
  return rows;
}

/** 实体 -> 完整编辑参数（后端 edit 会整体复制，不能只传改动字段） */
function toPayload(item: BizCategory): CategoryPayload {
  return {
    id: item.id,
    parentId: item.parentId || '0',
    name: item.name || '',
    code: item.code || '',
    image: item.image || '',
    icon: item.icon || '',
    module: item.module || 'COMMON',
    description: item.description || '',
    status: item.status || 'ENABLE',
    sortCode: item.sortCode ?? 0,
    remark: item.remark || '',
    extJson: item.extJson || '',
  };
}

export default function CategoryView({ permissions }: { permissions?: string[] }) {
  const can = useCallback(
    (action: CategoryPermAction) => hasCategoryPerm(permissions, action),
    [permissions]
  );

  const [items, setItems] = useState<BizCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [exporting, setExporting] = useState(false);

  const notify = useCallback((kind: Toast['kind'], text: string) => {
    setToast({ kind, text });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listAllCategories();
      setItems(data);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const hasFilter = !!search.trim() || moduleFilter !== 'all' || statusFilter !== 'all';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (moduleFilter !== 'all' && (item.module || '') !== moduleFilter) return false;
      if (statusFilter !== 'all' && (item.status || '') !== statusFilter) return false;
      if (!q) return true;
      return [item.name, item.description, item.remark]
        .some((v) => (v || '').toLowerCase().includes(q));
    });
  }, [items, search, moduleFilter, statusFilter]);

  const rows = useMemo<CategoryRow[]>(() => {
    if (hasFilter) {
      return [...filtered].sort(bySort).map((item) => ({
        item,
        depth: 0,
        hasChildren: false,
      }));
    }
    return buildTreeRows(items, collapsed);
  }, [filtered, hasFilter, items, collapsed]);

  // 树形模式完整展示整棵树（分页会把父子层级切碎）；仅筛选后的平铺列表分页
  const isTreeMode = !hasFilter;
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = isTreeMode
    ? rows
    : rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const rootCount = useMemo(() => rows.filter((r) => r.depth === 0).length, [rows]);

  useEffect(() => {
    setPage(1);
  }, [search, moduleFilter, statusFilter]);

  const enabledCount = useMemo(
    () => items.filter((i) => (i.status || 'ENABLE') === 'ENABLE').length,
    [items]
  );
  const moduleCount = useMemo(
    () => new Set(items.map((i) => i.module || 'COMMON')).size,
    [items]
  );

  const allPageSelected =
    pageRows.length > 0 && pageRows.every((row) => selected.has(row.item.id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageRows.forEach((r) => next.delete(r.item.id));
      else pageRows.forEach((r) => next.add(r.item.id));
      return next;
    });
  }

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** 有子分类的节点 id（用于展开/折叠全部） */
  const collapsibleIds = useMemo(
    () => new Set(rows.filter((r) => r.hasChildren).map((r) => r.item.id)),
    [rows]
  );

  function expandAll() {
    setCollapsed(new Set());
  }

  function collapseAll() {
    setCollapsed(new Set(collapsibleIds));
  }

  async function handleSave(payload: CategoryPayload) {
    if (payload.id) await categoryApi.edit(payload);
    else await categoryApi.add(payload);
    await load();
    setDialog(null);
    notify('success', payload.id ? '分类已更新' : '分类已创建');
  }

  async function handleDelete(targets: BizCategory[]) {
    await categoryApi.remove(targets.map((t) => t.id));
    await load();
    setSelected(new Set());
    setDialog(null);
    notify('success', `已删除 ${targets.length} 个分类`);
  }

  async function handleToggleStatus(item: BizCategory) {
    const payload = toPayload(item);
    payload.status = payload.status === 'ENABLE' ? 'DISABLE' : 'ENABLE';
    try {
      await categoryApi.edit(payload);
      await load();
      notify('success', `已${payload.status === 'ENABLE' ? '启用' : '禁用'}「${item.name || item.id}」`);
    } catch (err) {
      notify('error', errorMessage(err));
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      await categoryApi.exportData([...selected]);
      notify('success', selected.size ? `已导出选中的 ${selected.size} 个分类` : '已导出全部分类');
    } catch (err) {
      notify('error', `导出失败：${errorMessage(err)}`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* 概览 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: '全部分类', value: items.length, icon: FolderTree },
          { label: '已启用', value: enabledCount, icon: Tag },
          { label: '已禁用', value: items.length - enabledCount, icon: X },
          { label: '适用模块', value: moduleCount, icon: LayoutGrid },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-[#E5E5EA] px-4 py-3.5 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-xl bg-[#0071E3]/8 flex items-center justify-center shrink-0">
              <stat.icon className="w-4 h-4 text-[#0071E3]" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="text-[20px] font-semibold tabular-nums text-[#1D1D1F] leading-none">
                {stat.value}
              </div>
              <div className="text-[12px] text-[#86868B] mt-1">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 工具栏 */}
      <div className="bg-white rounded-[18px] border border-[#E5E5EA] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative flex-1 max-w-[300px] min-w-[180px]">
            <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索名称、描述、备注..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#F5F5F7] text-[13px] text-[#1D1D1F] placeholder:text-[#86868B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 transition-all"
            />
          </div>
          <SelectField
            value={moduleFilter}
            onChange={setModuleFilter}
            ariaLabel="按适用模块筛选"
            className="w-[140px]"
            options={[
              { value: 'all', label: '全部模块' },
              ...CATEGORY_MODULES.map((m) => ({ value: m.value, label: m.label })),
              { value: '', label: '未设置模块' },
            ]}
          />
          <SelectField
            value={statusFilter}
            onChange={setStatusFilter}
            ariaLabel="按状态筛选"
            className="w-[124px]"
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'ENABLE', label: '已启用' },
              { value: 'DISABLE', label: '已禁用' },
            ]}
          />
          {hasFilter && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setModuleFilter('all');
                setStatusFilter('all');
              }}
              className="h-9 px-2.5 rounded-xl text-[12px] text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] inline-flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              清除筛选
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isTreeMode && collapsibleIds.size > 0 && (
            <>
              <button
                type="button"
                onClick={expandAll}
                disabled={collapsed.size === 0}
                className="h-9 px-3 rounded-xl bg-white border border-[#E5E5EA] text-[12px] font-medium text-[#3A3A3C] inline-flex items-center gap-1.5 hover:bg-[#F5F5F7] disabled:opacity-50 transition-colors"
              >
                <ChevronDown className="w-3.5 h-3.5" />
                展开全部
              </button>
              <button
                type="button"
                onClick={collapseAll}
                disabled={collapsed.size === collapsibleIds.size}
                className="h-9 px-3 rounded-xl bg-white border border-[#E5E5EA] text-[12px] font-medium text-[#3A3A3C] inline-flex items-center gap-1.5 hover:bg-[#F5F5F7] disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                折叠全部
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            title="刷新列表"
            className="h-9 w-9 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-center text-[#6E6E73] hover:bg-[#F5F5F7] disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {can('delete') && selected.size > 0 && (
            <button
              type="button"
              onClick={() =>
                setDialog({
                  kind: 'delete',
                  items: items.filter((i) => selected.has(i.id)),
                })
              }
              className="h-9 px-3 rounded-xl bg-white border border-[#FF3B30]/30 text-[#D70015] text-[12px] font-medium inline-flex items-center gap-1.5 hover:bg-[#FF3B30]/8 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              批量删除 ({selected.size})
            </button>
          )}
          {can('import') && (
            <button
              type="button"
              onClick={() => setDialog({ kind: 'import' })}
              className="h-9 px-3 rounded-xl bg-white border border-[#E5E5EA] text-[12px] font-medium text-[#3A3A3C] inline-flex items-center gap-1.5 hover:bg-[#F5F5F7] transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              导入
            </button>
          )}
          {can('export') && (
            <button
              type="button"
              onClick={() => void handleExport()}
              disabled={exporting}
              className="h-9 px-3 rounded-xl bg-white border border-[#E5E5EA] text-[12px] font-medium text-[#3A3A3C] inline-flex items-center gap-1.5 hover:bg-[#F5F5F7] disabled:opacity-50 transition-colors"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              导出{selected.size ? `选中 (${selected.size})` : '全部'}
            </button>
          )}
          {can('add') && (
            <button
              type="button"
              onClick={() => setDialog({ kind: 'form', item: null })}
              className="h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新增分类
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl bg-[#FF3B30]/8 border border-[#FF3B30]/20 px-4 py-3 flex items-center justify-between gap-3 text-[13px] text-[#D70015]">
          <span>分类列表加载失败：{loadError}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="shrink-0 font-medium underline underline-offset-2"
          >
            重试
          </button>
        </div>
      )}

      {/* 列表 */}
      <div className="bg-white rounded-[18px] border border-[#E5E5EA] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div
              className={`${GRID_CLASS} px-5 h-10 bg-[#FAFAFC] border-b border-[#F2F2F7] text-[12px] font-medium text-[#86868B]`}
            >
              <input
                type="checkbox"
                aria-label="全选当前页"
                checked={allPageSelected}
                onChange={toggleSelectPage}
                className="w-3.5 h-3.5 accent-[#0071E3] cursor-pointer"
              />
              <span>分类名称</span>
              <span>适用模块</span>
              <span>状态</span>
              <span>排序</span>
              <span>更新时间</span>
              <span className="text-right">操作</span>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#86868B]">
                <Loader2 className="w-6 h-6 animate-spin text-[#0071E3]" />
                <span className="text-[13px]">正在加载分类数据...</span>
              </div>
            ) : pageRows.length === 0 ? (
              <div className="py-20 px-6 text-center">
                <FolderTree className="w-10 h-10 text-[#C7C7CC] mx-auto mb-3" strokeWidth={1.5} />
                <h3 className="text-[16px] font-semibold text-[#1D1D1F]">
                  {hasFilter ? '没有匹配的分类' : '暂无分类'}
                </h3>
                <p className="text-[13px] text-[#6E6E73] mt-1">
                  {hasFilter
                    ? '试试调整搜索词或筛选条件'
                    : '创建分类后，文章、视频与图文即可按分类归类'}
                </p>
                {!hasFilter && can('add') && (
                  <button
                    type="button"
                    onClick={() => setDialog({ kind: 'form', item: null })}
                    className="mt-5 h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    新增分类
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-[#F2F2F7]">
                {pageRows.map(({ item, depth, hasChildren }) => (
                  <div
                    key={item.id}
                    className={`${GRID_CLASS} px-5 py-2.5 text-[13px] hover:bg-[#FAFAFC] transition-colors`}
                  >
                    <input
                      type="checkbox"
                      aria-label={`选择 ${item.name || item.id}`}
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-3.5 h-3.5 accent-[#0071E3] cursor-pointer"
                    />

                    <div className="flex items-center gap-2 min-w-0" style={{ paddingLeft: depth * 18 }}>
                      {!hasFilter && hasChildren ? (
                        <button
                          type="button"
                          onClick={() => toggleCollapse(item.id)}
                          aria-label={collapsed.has(item.id) ? '展开子分类' : '折叠子分类'}
                          className="w-5 h-5 shrink-0 rounded flex items-center justify-center text-[#86868B] hover:bg-[#F2F2F7]"
                        >
                          {collapsed.has(item.id) ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      ) : (
                        <span className="w-5 shrink-0" />
                      )}
                      <div className="w-8 h-8 rounded-lg bg-[#F2F2F7] overflow-hidden shrink-0 flex items-center justify-center">
                        <MediaImage
                          src={item.image || ''}
                          alt={item.name || '分类'}
                          fallbackLabel={item.name?.slice(0, 1) || '#'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => can('detail') && setDialog({ kind: 'detail', id: item.id })}
                          className="block max-w-full truncate text-left font-medium text-[#1D1D1F] hover:text-[#0071E3] transition-colors"
                          title={item.description || item.name}
                        >
                          {item.name || '未命名分类'}
                        </button>
                        <div className="text-[11px] text-[#AEAEB2] truncate">
                          {item.description || (hasChildren ? '包含子分类' : `ID ${item.id}`)}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex w-fit px-2 py-0.5 rounded-md text-[11px] font-medium ${
                        (item.module || '') === 'COMMON' || !item.module
                          ? 'bg-[#0071E3]/10 text-[#0071E3]'
                          : 'bg-[#F2F2F7] text-[#3A3A3C]'
                      }`}
                    >
                      {categoryModuleLabel(item.module)}
                    </span>

                    <button
                      type="button"
                      onClick={() => can('edit') && void handleToggleStatus(item)}
                      disabled={!can('edit')}
                      title={can('edit') ? '点击切换启用状态' : categoryStatusLabel(item.status)}
                      className={`inline-flex w-fit px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                        (item.status || 'ENABLE') === 'ENABLE'
                          ? 'bg-[#16A34A]/10 text-[#16A34A] hover:bg-[#16A34A]/20'
                          : 'bg-[#D97706]/10 text-[#D97706] hover:bg-[#D97706]/20'
                      } disabled:cursor-default`}
                    >
                      {categoryStatusLabel(item.status)}
                    </button>

                    <span className="text-[#6E6E73] tabular-nums">{item.sortCode ?? '-'}</span>
                    <span className="text-[12px] text-[#86868B] tabular-nums">
                      {item.updateTime ? formatDateShort(item.updateTime) : '-'}
                    </span>

                    <div className="flex items-center justify-end gap-0.5">
                      {can('detail') && (
                        <button
                          type="button"
                          onClick={() => setDialog({ kind: 'detail', id: item.id })}
                          aria-label={`查看 ${item.name}`}
                          title="详情"
                          className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#0071E3] hover:bg-[#F2F2F7] transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {can('edit') && (
                        <button
                          type="button"
                          onClick={() => setDialog({ kind: 'form', item })}
                          aria-label={`编辑 ${item.name}`}
                          title="编辑"
                          className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#0071E3] hover:bg-[#F2F2F7] transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {can('delete') && (
                        <button
                          type="button"
                          onClick={() => setDialog({ kind: 'delete', items: [item] })}
                          aria-label={`删除 ${item.name}`}
                          title="删除"
                          className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#D70015] hover:bg-[#FF3B30]/8 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 分页：树形模式完整展示整棵树，不分组分页 */}
        {!loading && rows.length > 0 && (
          <div className="px-5 py-3 border-t border-[#F2F2F7] flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#86868B]">
            {isTreeMode ? (
              <span>
                共 {rows.length} 个分类（{rootCount} 个顶级分类）
                {selected.size ? ` · 已选 ${selected.size} 条` : ''}
                {collapsed.size ? ` · 已折叠 ${collapsed.size} 组` : ''}
              </span>
            ) : (
              <>
                <span>
                  共 {rows.length} 条{selected.size ? ` · 已选 ${selected.size} 条` : ''} · 第{' '}
                  {currentPage}/{totalPages} 页
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 w-8 rounded-lg border border-[#E5E5EA] flex items-center justify-center text-[#3A3A3C] hover:bg-[#F5F5F7] disabled:opacity-40 transition-colors"
                    aria-label="上一页"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-2 tabular-nums text-[#3A3A3C]">{currentPage}</span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 w-8 rounded-lg border border-[#E5E5EA] flex items-center justify-center text-[#3A3A3C] hover:bg-[#F5F5F7] disabled:opacity-40 transition-colors"
                    aria-label="下一页"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* 弹窗 */}
      {dialog?.kind === 'form' && (
        <CategoryFormDialog
          item={dialog.item}
          categories={items}
          onClose={() => setDialog(null)}
          onSubmit={handleSave}
        />
      )}
      {dialog?.kind === 'detail' && (
        <CategoryDetailDialog
          id={dialog.id}
          categories={items}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === 'delete' && (
        <CategoryDeleteDialog
          items={dialog.items}
          onClose={() => setDialog(null)}
          onConfirm={() => handleDelete(dialog.items)}
        />
      )}
      {dialog?.kind === 'import' && (
        <CategoryImportDialog
          onClose={() => setDialog(null)}
          onImported={() => void load()}
        />
      )}

      {/* 轻提示 */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-[60] max-w-[360px] px-4 py-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.14)] text-[13px] font-medium flex items-center gap-2 ${
            toast.kind === 'success'
              ? 'bg-[#1D1D1F] text-white'
              : 'bg-[#D70015] text-white'
          }`}
        >
          {toast.text}
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="关闭提示"
            className="ml-2 opacity-70 hover:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
