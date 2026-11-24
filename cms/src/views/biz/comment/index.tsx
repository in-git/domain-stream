import { useCallback, useEffect, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { DeleteConfirmModal } from '../../../components/DeleteConfirmModal.tsx';
import { showToast } from '../../../components/AppToast.tsx';
import { formatDateShort } from '../../../lib/format.ts';
import {
  commentApi,
  hasCommentPerm,
  COMMENT_STATUS_LABELS,
  COMMENT_TARGET_LABELS,
  type BizComment,
} from '../../../lib/comment.ts';

const PAGE_SIZE = 20;

/** 评论表格列布局：选择 / 用户 / 评论内容 / 目标内容 / 状态 / 时间 / 操作 */
const GRID_CLASS =
  'grid grid-cols-[36px_minmax(140px,1fr)_minmax(220px,1.8fr)_minmax(160px,1.3fr)_88px_130px_132px] gap-3 items-center';

const STATUS_TABS = [
  { key: '', label: '全部' },
  { key: 'APPROVED', label: '已通过' },
  { key: 'PENDING', label: '待审核' },
  { key: 'REJECTED', label: '已拒绝' },
];

const TYPE_CHIPS = [
  { value: '', label: '全部' },
  { value: 'ARTICLE', label: '文章' },
  { value: 'VIDEO', label: '视频' },
  { value: 'IMAGE_TEXT', label: '图文' },
];

function statusClass(status?: string): string {
  if (status === 'APPROVED') return 'bg-[#34C759]/10 text-[#248A3D]';
  if (status === 'REJECTED') return 'bg-[#FF3B30]/10 text-[#D70015]';
  return 'bg-[#FF9500]/10 text-[#B26A00]';
}

export default function CommentView({ permissions }: { permissions: string[] }) {
  const [items, setItems] = useState<BizComment[]>([]);
  const [current, setCurrent] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [targetType, setTargetType] = useState('');
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<BizComment | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);

  const can = useCallback(
    (action: 'page' | 'detail' | 'audit' | 'delete') => hasCommentPerm(permissions, action),
    [permissions]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(keyword.trim());
      setCurrent(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [keyword]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await commentApi.page({
        current,
        size: PAGE_SIZE,
        targetType,
        status,
        searchKey: search,
      });
      setItems(page.records || []);
      setTotal(Number(page.total || 0));
      setSelected(new Set());
    } catch (error) {
      showToast(error instanceof Error ? error.message : '评论列表加载失败', 'danger');
    } finally {
      setLoading(false);
    }
  }, [current, targetType, status, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const allSelected = items.length > 0 && items.every((item) => selected.has(item.id));
  const someSelected = items.some((item) => selected.has(item.id));

  async function handleAudit(ids: string[], nextStatus: string) {
    try {
      await commentApi.audit(ids, nextStatus);
      showToast(nextStatus === 'APPROVED' ? '已通过审核' : '已拒绝评论', 'success');
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '审核失败', 'danger');
    }
  }

  async function handleDelete() {
    try {
      await commentApi.delete(deleteIds);
      showToast(`已删除 ${deleteIds.length} 条评论`, 'success');
      setDeleteIds([]);
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除失败', 'danger');
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) items.forEach((item) => next.delete(item.id));
      else items.forEach((item) => next.add(item.id));
      return next;
    });
  }

  function clearFilters() {
    setKeyword('');
    setSearch('');
    setTargetType('');
    setStatus('');
    setCurrent(1);
  }

  const hasFilter = !!(keyword || targetType || status);

  return (
    <div className="space-y-5">
      {/* Toolbar：与文章管理一致 */}
      <div className="bg-white rounded-[18px] border border-[#E5E5EA] p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-2.5 flex-1 min-w-[260px]">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 max-w-[320px]">
              <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索评论内容或用户ID..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#F5F5F7] text-[13px] text-[#1D1D1F] placeholder:text-[#86868B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 transition-all"
              />
            </div>
            {hasFilter && (
              <button
                type="button"
                onClick={clearFilters}
                className="h-9 px-2.5 rounded-xl text-[12px] text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] inline-flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                清除筛选
              </button>
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
          </div>

          <div className="flex items-center p-0.5 bg-[#F2F2F7] rounded-[10px] w-fit">
            {STATUS_TABS.map((tab) => {
              const active = status === tab.key;
              return (
                <button
                  key={tab.key || 'all'}
                  type="button"
                  onClick={() => { setStatus(tab.key); setCurrent(1); }}
                  className={`px-3 py-1 text-[12px] font-medium rounded-[8px] transition-all whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white text-[#1D1D1F] shadow-xs'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 类型 chip：与文章分类 chip 一致 */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TYPE_CHIPS.map((chip) => {
          const active = targetType === chip.value;
          return (
            <button
              key={chip.value || 'all'}
              type="button"
              onClick={() => { setTargetType(chip.value); setCurrent(1); }}
              aria-pressed={active}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] transition-colors ${
                active
                  ? 'bg-[#1D1D1F] font-medium text-white'
                  : 'bg-black/[0.04] text-[#6E6E73] hover:bg-black/[0.07]'
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* 批量操作条：与文章管理一致 */}
      {can('delete') && items.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#E5E5EA] bg-white px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={toggleSelectAll}
              aria-label={allSelected ? '取消全选' : '全选'}
              className={`flex h-4 w-4 items-center justify-center rounded border ${
                allSelected
                  ? 'border-[#0071E3] bg-[#0071E3] text-white'
                  : someSelected
                    ? 'border-[#0071E3] text-[#0071E3]'
                    : 'border-[#C7C7CC] text-transparent'
              }`}
            >
              {allSelected ? (
                <Check className="h-3 w-3" strokeWidth={3} />
              ) : someSelected ? (
                <span className="h-0.5 w-2 rounded-full bg-[#0071E3]" />
              ) : null}
            </button>
            <span className={`text-[13px] font-medium ${selected.size > 0 ? 'text-[#0071E3]' : 'text-[#6E6E73]'}`}>
              全选 · 已选择 {selected.size} 条评论
            </span>
          </div>
          <div className="flex items-center gap-2">
            {can('audit') && selected.size > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => void handleAudit(Array.from(selected), 'APPROVED')}
                  className="h-8 px-3 rounded-[10px] bg-[#34C759]/10 text-[12px] font-medium text-[#248A3D] hover:bg-[#34C759]/20"
                >
                  批量通过
                </button>
                <button
                  type="button"
                  onClick={() => void handleAudit(Array.from(selected), 'REJECTED')}
                  className="h-8 px-3 rounded-[10px] bg-[#FF9500]/10 text-[12px] font-medium text-[#B26A00] hover:bg-[#FF9500]/20"
                >
                  批量拒绝
                </button>
              </>
            )}
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
              onClick={() => setDeleteIds(Array.from(selected))}
              disabled={selected.size === 0}
              className="h-8 px-3 rounded-[10px] bg-[#FF3B30] hover:bg-[#D70015] disabled:opacity-40 text-white text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              批量删除{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>
          </div>
        </div>
      )}

      {/* 评论表格 */}
      <div className="bg-white rounded-[18px] border border-[#E5E5EA] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="overflow-x-auto">
          <div className="min-w-[1080px]">
            <div
              className={`${GRID_CLASS} px-5 h-10 bg-[#FAFAFC] border-b border-[#F2F2F7] text-[12px] font-medium text-[#86868B]`}
            >
              <input
                type="checkbox"
                aria-label="全选当前页"
                checked={allSelected}
                onChange={toggleSelectAll}
                disabled={items.length === 0}
                className="w-3.5 h-3.5 accent-[#0071E3] cursor-pointer disabled:opacity-40"
              />
              <span>用户</span>
              <span>评论内容</span>
              <span>目标内容</span>
              <span>审核状态</span>
              <span>提交时间</span>
              <span className="text-right">操作</span>
            </div>

            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3 text-[#86868B]">
                <Loader2 className="w-6 h-6 animate-spin text-[#0071E3]" />
                <span className="text-[13px]">正在加载评论数据...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="py-20 px-6 text-center">
                <MessageSquare className="w-10 h-10 text-[#C7C7CC] mx-auto mb-3" strokeWidth={1.5} />
                <h3 className="text-[16px] font-semibold text-[#1D1D1F]">
                  {hasFilter ? '没有匹配的评论' : '暂无评论'}
                </h3>
                <p className="text-[13px] text-[#6E6E73] mt-1">
                  {hasFilter
                    ? '试试调整搜索词或筛选条件'
                    : '文章、视频和图文下的用户评论会显示在这里'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F2F2F7]">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`${GRID_CLASS} px-5 py-2.5 text-[13px] hover:bg-[#FAFAFC] transition-colors`}
                  >
                    <input
                      type="checkbox"
                      aria-label={`选择 ${item.nickname || '用户'}`}
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-3.5 h-3.5 accent-[#0071E3] cursor-pointer"
                    />

                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-[#1D1D1F] truncate">
                        {item.nickname || '用户'}
                      </div>
                      <div className="text-[11px] text-[#AEAEB2] truncate" title={item.userId || ''}>
                        {item.userId || '-'}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-[13px] leading-5 text-[#3A3A3C]" title={item.content}>
                        {item.replyToNickname && !/^@\S+\s*/.test(item.content || '') && (
                          <span className="text-[#0071E3]">@{item.replyToNickname}：</span>
                        )}
                        {item.content || '-'}
                      </p>
                      {item.ip && (
                        <div className="text-[11px] text-[#AEAEB2] truncate">IP {item.ip}</div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="text-[12px] text-[#6E6E73] truncate" title={item.targetTitle || ''}>
                        {item.targetTitle || '-'}
                      </div>
                      <div className="text-[11px] text-[#AEAEB2]">
                        {COMMENT_TARGET_LABELS[item.targetType || ''] || item.targetType || '-'}
                      </div>
                    </div>

                    <span
                      className={`inline-flex w-fit px-2 py-0.5 rounded-md text-[11px] font-medium ${statusClass(item.status)}`}
                    >
                      {COMMENT_STATUS_LABELS[item.status || ''] || item.status || '-'}
                    </span>

                    <span className="text-[12px] text-[#86868B] tabular-nums">
                      {item.createTime ? formatDateShort(item.createTime) : '-'}
                    </span>

                    <div className="flex items-center justify-end gap-0.5">
                      {can('detail') && (
                        <button
                          type="button"
                          onClick={() => setDetail(item)}
                          className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#0071E3] hover:bg-[#F2F2F7] transition-colors"
                          title="详情"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      {can('audit') && item.status !== 'APPROVED' && (
                        <button
                          type="button"
                          onClick={() => void handleAudit([item.id], 'APPROVED')}
                          className="p-1.5 rounded-lg text-[#248A3D] hover:bg-[#34C759]/10 transition-colors"
                          title="通过"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {can('audit') && item.status !== 'REJECTED' && (
                        <button
                          type="button"
                          onClick={() => void handleAudit([item.id], 'REJECTED')}
                          className="p-1.5 rounded-lg text-[#B26A00] hover:bg-[#FF9500]/10 transition-colors"
                          title="拒绝"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {can('delete') && (
                        <button
                          type="button"
                          onClick={() => setDeleteIds([item.id])}
                          className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#D70015] hover:bg-[#FF3B30]/8 transition-colors"
                          title="删除"
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

        {!loading && total > 0 && (
          <div className="px-5 py-3 border-t border-[#F2F2F7] flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#86868B]">
            <span>
              共 {total} 条{selected.size ? ` · 已选 ${selected.size} 条` : ''} · 第 {current}/{pages} 页
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={current <= 1}
                onClick={() => setCurrent((p) => Math.max(1, p - 1))}
                aria-label="上一页"
                className="h-8 w-8 rounded-lg border border-[#E5E5EA] flex items-center justify-center text-[#3A3A3C] hover:bg-[#F5F5F7] disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 tabular-nums text-[#3A3A3C]">{current}</span>
              <button
                type="button"
                disabled={current >= pages}
                onClick={() => setCurrent((p) => Math.min(pages, p + 1))}
                aria-label="下一页"
                className="h-8 w-8 rounded-lg border border-[#E5E5EA] flex items-center justify-center text-[#3A3A3C] hover:bg-[#F5F5F7] disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {detail && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[#E5E5EA] bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-[16px] font-semibold text-[#1D1D1F]">评论详情</h3>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="text-[#86868B] hover:text-[#1D1D1F]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <dl className="mt-4 space-y-2 text-[13px] text-[#6E6E73]">
              <div className="flex gap-3"><dt className="w-20 shrink-0">内容</dt><dd>{detail.targetTitle || '-'}</dd></div>
              <div className="flex gap-3"><dt className="w-20 shrink-0">用户</dt><dd>{detail.nickname || detail.userId || '-'}</dd></div>
              <div className="flex gap-3"><dt className="w-20 shrink-0">回复</dt><dd>{detail.replyToNickname || '-'}</dd></div>
              <div className="flex gap-3"><dt className="w-20 shrink-0">状态</dt><dd>{COMMENT_STATUS_LABELS[detail.status || ''] || '-'}</dd></div>
              <div className="flex gap-3"><dt className="w-20 shrink-0">时间</dt><dd>{formatDateShort(detail.createTime || '')}</dd></div>
              <div className="flex gap-3"><dt className="w-20 shrink-0">IP</dt><dd>{detail.ip || '-'}</dd></div>
            </dl>
            <div className="mt-4 rounded-xl bg-[#F5F5F7] p-3 text-[13px] leading-6 text-[#1D1D1F]">
              {detail.content}
            </div>
          </div>
        </div>
      )}

      {deleteIds.length > 0 && (
        <DeleteConfirmModal
          title="删除评论"
          description={`删除后，选中的 ${deleteIds.length} 条评论及其全部下层回复将一并移除，此操作不可撤销。`}
          onClose={() => setDeleteIds([])}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
