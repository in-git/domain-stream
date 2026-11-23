/**
 * 留言管理页
 * ------------------------------------------------------------------
 * 对应后端菜单：path = /biz/message，component = biz/message/index
 * 接口：vip.xiaonuo.biz.modular.message（BizMessageController）
 *
 * 参照通用分类模块的自包含结构：本页自行加载 / 筛选 / 分页 / 增删改，
 * 编辑复用 /biz/message/edit 接口（整体提交实体字段）。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CornerDownRight,
  Eye,
  Loader2,
  MessageSquareText,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  MESSAGE_STATUSES,
  hasMessagePerm,
  listAllMessages,
  messageApi,
  messageStatusClass,
  messageStatusLabel,
  type BizMessage,
  type MessagePayload,
  type MessagePermAction,
} from '../../../lib/message.ts';
import { formatDateTime } from '../../../lib/format.ts';
import { showToast } from '../../../components/AppToast.tsx';
import {
  MessageDeleteDialog,
  MessageDetailDialog,
  MessageFormDialog,
} from './dialogs.tsx';
import { SelectField } from '../../../components/SelectField.tsx';

const PAGE_SIZE = 10;
const GRID_CLASS =
  'grid grid-cols-[36px_minmax(320px,3.4fr)_92px_130px_140px_112px] gap-3 items-center';

/** 树形行：顶级留言为 depth 0，访客回复按 parentId 嵌套 */
interface MessageRow {
  item: BizMessage;
  depth: number;
  hasChildren: boolean;
  childCount: number;
}

/** 回复按提交时间正序展示（与前台留言墙一致） */
function byCreateTime(a: BizMessage, b: BizMessage): number {
  const diff = (a.createTime || '').localeCompare(b.createTime || '');
  return diff !== 0 ? diff : (a.id || '').localeCompare(b.id || '');
}

/** 无筛选条件时按 parentId 组装树（单表递归：顶级留言 + 访客回复），并应用折叠状态 */
function buildTreeRows(items: BizMessage[], collapsed: Set<string>): MessageRow[] {
  const ids = new Set(items.map((i) => i.id));
  const isRoot = (item: BizMessage) =>
    !item.parentId || item.parentId === '0' || !ids.has(item.parentId);

  const childrenOf = new Map<string, BizMessage[]>();
  items.forEach((item) => {
    const key = isRoot(item) ? '__root__' : item.parentId!;
    const list = childrenOf.get(key) || [];
    list.push(item);
    childrenOf.set(key, list);
  });
  childrenOf.forEach((list) => list.sort(byCreateTime));

  const roots = [...(childrenOf.get('__root__') || [])].sort((a, b) => {
    // 顶级留言保持原有展示顺序：时间倒序（新留言在前）
    return -byCreateTime(a, b);
  });

  // 先按完整父子关系标记可达节点（不受折叠影响）。这样「因折叠而被跳过」的子节点
  // 不会被下面的环/断链兜底误当成孤儿捞回顶级——否则折叠只会压平层级而藏不住行。
  const reachable = new Set<string>();
  const markReachable = (list: BizMessage[]) => {
    list.forEach((item) => {
      if (reachable.has(item.id)) return;
      reachable.add(item.id);
      markReachable(childrenOf.get(item.id) || []);
    });
  };
  markReachable(roots);
  // 仅把真正的孤儿节点（父级链断裂/成环）兜底挂到顶级
  const orphans = items.filter((i) => !reachable.has(i.id)).sort(byCreateTime);

  const rows: MessageRow[] = [];
  const visited = new Set<string>();
  const walk = (list: BizMessage[], depth: number) => {
    list.forEach((item) => {
      if (visited.has(item.id)) return; // 防御脏数据造成的环
      visited.add(item.id);
      const children = childrenOf.get(item.id) || [];
      rows.push({ item, depth, hasChildren: children.length > 0, childCount: children.length });
      if (children.length && !collapsed.has(item.id)) walk(children, depth + 1);
    });
  };
  walk([...roots, ...orphans], 0);
  return rows;
}

type DialogState =
  | { kind: 'form'; item: BizMessage | null }
  | { kind: 'detail'; id: string }
  | { kind: 'delete'; items: BizMessage[] }
  | null;


function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '操作失败，请稍后重试';
}

export default function MessageView({ permissions }: { permissions?: string[] }) {
  const can = useCallback(
    (action: MessagePermAction) => hasMessagePerm(permissions, action),
    [permissions]
  );

  const [items, setItems] = useState<BizMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<DialogState>(null);
  const notify = useCallback(
    (kind: 'success' | 'error', text: string) => showToast(text, kind === 'error' ? 'danger' : 'success'),
    []
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await listAllMessages();
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

  const hasFilter = !!search.trim() || statusFilter !== 'all';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...items]
      .filter((item) => {
        if (statusFilter !== 'all' && (item.status || '') !== statusFilter) return false;
        if (!q) return true;
        return [item.nickname, item.userId, item.content, item.replyToNickname]
          .some((v) => (v || '').toLowerCase().includes(q));
      })
      .sort((a, b) => {
        return (b.createTime || '').localeCompare(a.createTime || '');
      });
  }, [items, search, statusFilter]);

  const rows = useMemo<MessageRow[]>(() => {
    if (hasFilter) {
      // 筛选时平铺展示匹配结果（含回复），不做层级嵌套
      return filtered.map((item) => ({
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
  const replyCount = rows.length - rootCount;

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  /** 有回复的留言 id（用于展开/折叠全部） */
  const collapsibleIds = useMemo(
    () => new Set(rows.filter((r) => r.hasChildren).map((r) => r.item.id)),
    [rows]
  );

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setCollapsed(new Set());
  }

  function collapseAll() {
    setCollapsed(new Set(collapsibleIds));
  }

  const counts = useMemo(() => {
    const result: Record<string, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    items.forEach((item) => {
      const key = item.status || 'APPROVED';
      result[key] = (result[key] || 0) + 1;
    });
    return result;
  }, [items]);

  /** 顶级留言 / 访客回复数量（按数据本身统计，不受折叠影响） */
  const statRootCount = useMemo(
    () => items.filter((i) => !i.parentId || i.parentId === '0').length,
    [items]
  );
  const statReplyCount = items.length - statRootCount;

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
      if (allPageSelected) pageRows.forEach((row) => next.delete(row.item.id));
      else pageRows.forEach((row) => next.add(row.item.id));
      return next;
    });
  }

  async function handleSave(payload: MessagePayload) {
    if (payload.id) await messageApi.edit(payload);
    else await messageApi.add(payload);
    await load();
    setDialog(null);
    notify('success', payload.id ? '留言已更新' : '留言已创建');
  }

  async function handleDelete(targets: BizMessage[]) {
    await messageApi.remove(targets.map((t) => t.id));
    await load();
    setSelected(new Set());
    setDialog(null);
    notify('success', `已删除 ${targets.length} 条留言`);
  }

  return (
    <div className="space-y-5">
      {/* 概览 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: '全部留言', value: statRootCount, icon: MessageSquareText },
          { label: '访客回复', value: statReplyCount, icon: CornerDownRight },
          { label: '待审核', value: counts.PENDING || 0, icon: Loader2 },
          { label: '已通过', value: counts.APPROVED || 0, icon: CheckCircle2 },
          { label: '已拒绝', value: counts.REJECTED || 0, icon: X },
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
              placeholder="搜索用户名字、内容..."
              className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#F5F5F7] text-[13px] text-[#1D1D1F] placeholder:text-[#86868B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 transition-all"
            />
          </div>
          <SelectField
            value={statusFilter}
            onChange={setStatusFilter}
            ariaLabel="按审核状态筛选"
            className="w-[132px]"
            options={[
              { value: 'all', label: '全部状态' },
              ...MESSAGE_STATUSES.map((s) => ({ value: s.value, label: s.label })),
            ]}
          />
          {hasFilter && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
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
          {can('add') && (
            <button
              type="button"
              onClick={() => setDialog({ kind: 'form', item: null })}
              className="h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              新增留言
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl bg-[#FF3B30]/8 border border-[#FF3B30]/20 px-4 py-3 flex items-center justify-between gap-3 text-[13px] text-[#D70015]">
          <span>留言列表加载失败：{loadError}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="shrink-0 font-medium underline underline-offset-2"
          >
            重试
          </button>
        </div>
      )}

      {/* 批量操作条：全选当前页与已选数量放一起，始终显示（有数据时） */}
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
              全选当前页 · 已选择 {selected.size} 条留言
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
          <div className="min-w-[1060px]">
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
              <span>留言内容</span>
              <span>审核状态</span>
              <span>用户名字</span>
              <span>提交时间</span>
              <span className="text-right">操作</span>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#86868B]">
                <Loader2 className="w-6 h-6 animate-spin text-[#0071E3]" />
                <span className="text-[13px]">正在加载留言数据...</span>
              </div>
            ) : pageRows.length === 0 ? (
              <div className="py-20 px-6 text-center">
                <MessageSquareText
                  className="w-10 h-10 text-[#C7C7CC] mx-auto mb-3"
                  strokeWidth={1.5}
                />
                <h3 className="text-[16px] font-semibold text-[#1D1D1F]">
                  {hasFilter ? '没有匹配的留言' : '暂无留言'}
                </h3>
                <p className="text-[13px] text-[#6E6E73] mt-1">
                  {hasFilter
                    ? '试试调整搜索词或筛选条件'
                    : '用户提交的留言将在这里显示，可审核与回复'}
                </p>
                {!hasFilter && can('add') && (
                  <button
                    type="button"
                    onClick={() => setDialog({ kind: 'form', item: null })}
                    className="mt-5 h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    新增留言
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
                      aria-label={`选择 ${item.nickname || '匿名访客'}`}
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-3.5 h-3.5 accent-[#0071E3] cursor-pointer"
                    />

                    <div className="flex items-center gap-2.5 min-w-0" style={{ paddingLeft: depth * 18 }}>
                      {isTreeMode && hasChildren ? (
                        <button
                          type="button"
                          onClick={() => toggleCollapse(item.id)}
                          aria-label={collapsed.has(item.id) ? '展开回复' : '折叠回复'}
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
                      <div className="min-w-0 flex-1">
                        <p
                          className="truncate text-[13px] leading-5"
                          title={`${item.nickname || '匿名访客'}：${item.content || ''}`}
                        >
                          <button
                            type="button"
                            onClick={() => can('detail') && setDialog({ kind: 'detail', id: item.id })}
                            className={`transition-colors hover:text-[#0071E3] ${
                              depth > 0
                                ? 'text-[#3A3A3C]'
                                : 'font-medium text-[#1D1D1F]'
                            }`}
                          >
                            {item.nickname || '匿名访客'}
                          </button>
                          <span className="text-[#AEAEB2]">：</span>
                          {depth > 0 && (
                            <CornerDownRight className="w-3 h-3 inline-block mr-1 text-[#AEAEB2] align-[-1px]" />
                          )}
                          <span className="text-[#3A3A3C]">{item.content || '-'}</span>
                        </p>
                        <div className="text-[11px] text-[#AEAEB2] truncate">
                          {depth > 0
                            ? `回复 @${item.replyToNickname || '匿名访客'}`
                            : item.ip
                              ? item.ip
                              : `ID ${item.id}`}
                          {childCount ? ` · ${childCount} 条回复` : ''}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex w-fit px-2 py-0.5 rounded-md text-[11px] font-medium ${messageStatusClass(item.status)}`}
                    >
                      {messageStatusLabel(item.status)}
                    </span>

                    <span className="text-[12px] text-[#6E6E73] truncate" title={item.nickname || item.userId || ''}>
                      {item.nickname || item.userId || '-'}
                    </span>
                    <span className="text-[12px] text-[#86868B] tabular-nums">
                      {item.createTime ? formatDateTime(item.createTime) : '-'}
                    </span>

                    <div className="flex items-center justify-end gap-0.5">
                      {can('detail') && (
                        <button
                          type="button"
                          onClick={() => setDialog({ kind: 'detail', id: item.id })}
                          aria-label={`查看 ${item.nickname || '留言'}`}
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
                          aria-label={`编辑 ${item.nickname || '留言'}`}
                          title="编辑留言"
                          className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#0071E3] hover:bg-[#F2F2F7] transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {can('delete') && (
                        <button
                          type="button"
                          onClick={() => setDialog({ kind: 'delete', items: [item] })}
                          aria-label={`删除 ${item.nickname || '留言'}`}
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
                共 {rows.length} 条（{rootCount} 条留言 · {replyCount} 条回复）
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
        <MessageFormDialog
          item={dialog.item}
          onClose={() => setDialog(null)}
          onSubmit={handleSave}
        />
      )}
      {dialog?.kind === 'detail' && (
        <MessageDetailDialog id={dialog.id} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === 'delete' && (
        <MessageDeleteDialog
          items={dialog.items}
          onClose={() => setDialog(null)}
          onConfirm={() => handleDelete(dialog.items)}
        />
      )}

    </div>
  );
}
