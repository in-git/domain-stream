/**
 * 通用分类管理页
 * ------------------------------------------------------------------
 * 对应后端菜单：path = /biz/category，component = biz/category/index
 * 接口：vip.xiaonuo.biz.modular.category（BizCategoryController）
 *
 * 搜索 / 模块 / 状态筛选通过 page 接口在服务端完成；
 * 本页仅负责树形层级组装与分页展示。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CornerDownRight,
  Download,
  Eye,
  FolderTree,
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import {
  categoryApi,
  categoryModuleLabel,
  categoryStatusLabel,
  hasCategoryPerm,
  listAllCategories,
  useCategoryModules,
  type BizCategory,
  type CategoryPageQuery,
  type CategoryPayload,
  type CategoryPermAction,
} from '../../../lib/category.ts';
import { formatDateShort } from '../../../lib/format.ts';
import { MediaImage } from '../../../components/MediaImage.tsx';
import { showToast } from '../../../components/AppToast.tsx';
import {
  CategoryDeleteDialog,
  CategoryDetailDialog,
  CategoryFormDialog,
  CategoryModuleManageDialog,
} from './dialogs.tsx';

const PAGE_SIZE = 10;
const DEFAULT_QUERY: CategoryPageQuery = {};
const GRID_CLASS =
  'grid grid-cols-[36px_minmax(220px,1.7fr)_110px_92px_64px_120px_132px] gap-3 items-center';

type DialogState =
  | { kind: 'form'; item: BizCategory | null; parentId?: string }
  | { kind: 'detail'; id: string }
  | { kind: 'delete'; items: BizCategory[] }
  | null;

interface CategoryRow {
  item: BizCategory;
  depth: number;
  hasChildren: boolean;
  childCount: number;
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
      rows.push({ item, depth, hasChildren: children.length > 0, childCount: children.length });
      if (children.length && !collapsed.has(item.id)) walk(children, depth + 1);
    });
  };
  walk((childrenOf.get('__root__') || []).filter((i) => isRoot(i, ids)), 0);
  // 有环或父级链断裂时，兜底把未访问到的节点挂到顶级
  items.filter((i) => !visited.has(i.id)).sort(bySort).forEach((item) => {
    rows.push({ item, depth: 0, hasChildren: false, childCount: 0 });
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
  const categoryModules = useCategoryModules();
  const can = useCallback(
    (action: CategoryPermAction) => hasCategoryPerm(permissions, action),
    [permissions]
  );

  const [items, setItems] = useState<BizCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState<CategoryPageQuery>(DEFAULT_QUERY);
  const [searchText, setSearchText] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);

  const [exporting, setExporting] = useState(false);

  const notify = useCallback(
    (kind: 'success' | 'error', text: string) => showToast(text, kind === 'error' ? 'danger' : 'success'),
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listAllCategories(query);
      setItems(data);
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSearchText(query.searchKey || '');
  }, [query.searchKey]);

  // 搜索防抖后由服务端返回匹配结果
  useEffect(() => {
    const keyword = searchText.trim();
    if (keyword === (query.searchKey || '').trim()) return;
    const timer = window.setTimeout(() => {
      setQuery((prev) => ({ ...prev, searchKey: keyword }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchText, query.searchKey]);

  const hasFilter = !!query.searchKey?.trim() || !!query.module || !!query.status;

  // 服务端已按条件筛选，这里只做树形组装
  const filtered = items;

  const rows = useMemo<CategoryRow[]>(() => {
    if (hasFilter) {
      return [...filtered].sort(bySort).map((item) => ({
        item,
        depth: 0,
        hasChildren: false,
        childCount: 0,
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
  }, [query.searchKey, query.module, query.status]);

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

  async function handleSave(payload: CategoryPayload) {
    if (payload.id) await categoryApi.edit(payload);
    else await categoryApi.add(payload);
    // 新建子级后自动展开父节点，保证新增结果立即可见
    if (!payload.id && payload.parentId && payload.parentId !== '0') {
      setCollapsed((prev) => {
        const next = new Set(prev);
        next.delete(payload.parentId as string);
        return next;
      });
    }
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
        <div className="flex flex-col gap-2.5 flex-1 min-w-[260px]">
          {/* 第一行：搜索 */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-[300px] min-w-[180px]">
              <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索名称、描述、备注..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#F5F5F7] text-[13px] text-[#1D1D1F] placeholder:text-[#86868B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 transition-all"
              />
            </div>
            {hasFilter && (
              <button
                type="button"
                onClick={() => {
                  setSearchText('');
                  setQuery(DEFAULT_QUERY);
                }}
                className="h-9 px-2.5 rounded-xl text-[12px] text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] inline-flex items-center gap-1 transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
                清除筛选
              </button>
            )}
          </div>

          {/* 第二行：模块（独占一行） */}
          <div className="flex items-start gap-2">
            <span className="h-8 leading-8 text-[12px] text-[#86868B] shrink-0">模块</span>
            <div
              role="radiogroup"
              aria-label="按适用模块筛选"
              className="flex flex-wrap items-center gap-1"
            >
              {[
                { value: 'all', label: '全部模块' },
                ...categoryModules.map((m) => ({ value: m.value, label: m.label })),
                { value: '', label: '未设置' },
              ].map((m) => {
                const active = (query.module === '__EMPTY__' ? '' : query.module || 'all') === m.value;
                return (
                  <button
                    key={m.value || 'none'}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setQuery((prev) => ({
                      ...prev,
                      module: m.value === 'all' ? undefined : m.value === '' ? '__EMPTY__' : m.value,
                    }))}
                    className={`h-8 px-2.5 rounded-lg text-[12px] font-medium transition-colors ${
                      active
                        ? 'bg-[#0071E3] text-white'
                        : 'bg-[#F5F5F7] text-[#6E6E73] hover:bg-[#EBEBF0] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
              {(can('add') || can('edit') || can('delete')) && (
                <button
                  type="button"
                  onClick={() => setModuleDialogOpen(true)}
                  className="h-8 px-2.5 rounded-lg text-[12px] font-medium inline-flex items-center gap-1 text-[#0071E3] hover:bg-[#0071E3]/8 transition-colors"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  管理模块
                </button>
              )}
            </div>
          </div>

          {/* 第三行：状态（独占一行） */}
          <div className="flex items-start gap-2">
            <span className="h-8 leading-8 text-[12px] text-[#86868B] shrink-0">状态</span>
            <div
              role="radiogroup"
              aria-label="按状态筛选"
              className="flex flex-wrap items-center gap-1"
            >
              {[
                { value: 'all', label: '全部状态' },
                { value: 'ENABLE', label: '已启用' },
                { value: 'DISABLE', label: '已禁用' },
              ].map((s) => {
                const active = (query.status || 'all') === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setQuery((prev) => ({
                      ...prev,
                      status: s.value === 'all' ? undefined : s.value,
                    }))}
                    className={`h-8 px-2.5 rounded-lg text-[12px] font-medium transition-colors ${
                      active
                        ? 'bg-[#0071E3] text-white'
                        : 'bg-[#F5F5F7] text-[#6E6E73] hover:bg-[#EBEBF0] hover:text-[#1D1D1F]'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            title="刷新列表"
            className="h-9 w-9 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-center text-[#6E6E73] hover:bg-[#F5F5F7] disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
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

      {/* 批量操作条：全选当前页与已选数量放一起，单独一行常驻显示 */}
      {can('delete') && rows.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#E5E5EA] bg-white px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              aria-label="全选当前页"
              checked={allPageSelected}
              onChange={toggleSelectPage}
              className="w-4 h-4 accent-[#0071E3] cursor-pointer"
            />
            <span
              className={`text-[13px] font-medium ${
                selected.size > 0 ? 'text-[#0071E3]' : 'text-[#6E6E73]'
              }`}
            >
              全选当前页 · 已选择 {selected.size} 个分类
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              disabled={selected.size === 0}
              className="h-8 px-3 rounded-[10px] text-[12px] font-medium text-[#6E6E73] hover:bg-[#F5F5F7] disabled:opacity-40 disabled:hover:bg-transparent transition-colors inline-flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              取消选择
            </button>
            {can('export') && (
              <button
                type="button"
                onClick={() => void handleExport()}
                disabled={exporting}
                className="h-8 px-3 rounded-[10px] bg-white border border-[#E5E5EA] text-[#3A3A3C] text-[12px] font-medium inline-flex items-center gap-1.5 hover:bg-[#F5F5F7] disabled:opacity-50 transition-colors"
              >
                {exporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                导出{selected.size ? `选中 (${selected.size})` : '全部'}
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                setDialog({
                  kind: 'delete',
                  items: items.filter((i) => selected.has(i.id)),
                })
              }
              disabled={selected.size === 0}
              className="h-8 px-3 rounded-[10px] bg-[#FF3B30] hover:bg-[#D70015] disabled:opacity-40 text-white text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              批量删除{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>
          </div>
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
                {pageRows.map(({ item, depth, hasChildren, childCount }) => (
                  <div
                    key={item.id}
                    className={`${GRID_CLASS} px-5 py-2.5 text-[13px] hover:bg-[#FAFAFC] transition-colors ${
                      depth > 0 ? 'bg-[#FAFAFC]/60' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      aria-label={`选择 ${item.name || item.id}`}
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-3.5 h-3.5 accent-[#0071E3] cursor-pointer"
                    />

                    <div
                      className="relative flex items-center gap-2 min-w-0"
                      style={{ paddingLeft: depth * 18 }}
                    >
                      {depth > 0 && (
                        <CornerDownRight className="w-3.5 h-3.5 shrink-0 text-[#C7C7CC]" />
                      )}
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
                          blankFallback
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => can('detail') && setDialog({ kind: 'detail', id: item.id })}
                          className={`block max-w-full truncate text-left hover:text-[#0071E3] transition-colors ${
                            depth > 0 ? 'text-[#3A3A3C]' : 'font-medium text-[#1D1D1F]'
                          }`}
                          title={item.description || item.name}
                        >
                          {item.name || '未命名分类'}
                        </button>
                        <div className="text-[11px] text-[#AEAEB2] truncate">
                          {item.description ||
                            (childCount ? `包含 ${childCount} 个子分类` : `ID ${item.id}`)}
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
                      {can('add') && (
                        <button
                          type="button"
                          onClick={() => setDialog({ kind: 'form', item: null, parentId: item.id })}
                          aria-label={`为 ${item.name} 新增子级`}
                          title="新增子级"
                          className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#0071E3] hover:bg-[#F2F2F7] transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
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
          key={`${dialog.item?.id || 'new'}-${dialog.parentId || 'root'}`}
          item={dialog.item}
          initialParentId={dialog.parentId}
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
      {moduleDialogOpen && (
        <CategoryModuleManageDialog
          categories={items}
          can={can}
          onClose={() => setModuleDialogOpen(false)}
          onChanged={(message) => notify('success', message)}
        />
      )}

    </div>
  );
}
