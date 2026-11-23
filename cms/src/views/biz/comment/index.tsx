import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Check, X, Trash2, RefreshCw, Search } from 'lucide-react';
import { PageShell } from '../../../components/PageShell.tsx';
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

function depthOf(comment: BizComment): number {
  if (!comment.path) return 0;
  return Math.max(0, (comment.path.match(/\//g) || []).length - 1);
}

function statusClass(status?: string): string {
  if (status === 'APPROVED') return 'bg-[#34C759]/10 text-[#248A3D]';
  if (status === 'REJECTED') return 'bg-[#FF3B30]/10 text-[#D70015]';
  return 'bg-[#FF9500]/10 text-[#B26A00]';
}

export default function CommentView({
  permissions,
  onBack,
}: {
  permissions: string[];
  onBack: () => void;
}) {
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
      showToast(`已删除 ${deleteIds.length} 条评论及其回复`, 'success');
      setDeleteIds([]);
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '删除失败', 'danger');
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const hasFilter = useMemo(
    () => !!(targetType || status || search),
    [targetType, status, search]
  );

  return (
    <PageShell
      title="评论管理"
      subtitle="管理文章、视频和图文下的评论与无限层级回复"
      onBack={onBack}
      backLabel="返回首页"
    >
      <div className="rounded-2xl border border-[#E5E5EA] bg-white overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#F2F2F7] px-4 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8E8E93]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setCurrent(1);
                  void load();
                }
              }}
              placeholder="搜索评论内容或用户ID"
              className="h-9 w-56 rounded-xl border border-[#D2D2D7] pl-8 pr-3 text-[12px] outline-none focus:border-[#0071E3]"
            />
          </div>
          <select
            value={targetType}
            onChange={(e) => { setTargetType(e.target.value); setCurrent(1); }}
            className="h-9 rounded-xl border border-[#D2D2D7] bg-white px-3 text-[12px] outline-none focus:border-[#0071E3]"
          >
            <option value="">全部内容类型</option>
            {Object.entries(COMMENT_TARGET_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setCurrent(1); }}
            className="h-9 rounded-xl border border-[#D2D2D7] bg-white px-3 text-[12px] outline-none focus:border-[#0071E3]"
          >
            <option value="">全部状态</option>
            {Object.entries(COMMENT_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => { setCurrent(1); void load(); }}
            className="h-9 rounded-xl bg-[#0071E3] px-3 text-[12px] font-medium text-white hover:bg-[#0077ED]"
          >
            查询
          </button>
          {hasFilter && (
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setTargetType('');
                setStatus('');
                setCurrent(1);
              }}
              className="h-9 rounded-xl border border-[#D2D2D7] px-3 text-[12px] text-[#6E6E73] hover:bg-[#F5F5F7]"
            >
              清除
            </button>
          )}
          <button
            type="button"
            onClick={() => void load()}
            className="h-9 rounded-xl border border-[#D2D2D7] p-2 text-[#6E6E73] hover:bg-[#F5F5F7]"
            title="刷新"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          {selected.size > 0 && can('audit') && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[12px] text-[#6E6E73]">已选 {selected.size} 条</span>
              <button
                type="button"
                onClick={() => void handleAudit(Array.from(selected), 'APPROVED')}
                className="h-9 rounded-xl bg-[#34C759]/10 px-3 text-[12px] font-medium text-[#248A3D] hover:bg-[#34C759]/20"
              >
                批量通过
              </button>
              <button
                type="button"
                onClick={() => void handleAudit(Array.from(selected), 'REJECTED')}
                className="h-9 rounded-xl bg-[#FF9500]/10 px-3 text-[12px] font-medium text-[#B26A00] hover:bg-[#FF9500]/20"
              >
                批量拒绝
              </button>
              {can('delete') && (
                <button
                  type="button"
                  onClick={() => setDeleteIds(Array.from(selected))}
                  className="h-9 rounded-xl bg-[#FF3B30]/10 px-3 text-[12px] font-medium text-[#D70015] hover:bg-[#FF3B30]/20"
                >
                  批量删除
                </button>
              )}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-[#F5F5F7] text-[12px] text-[#6E6E73]">
              <tr>
                <th className="w-10 px-4 py-3" />
                <th className="px-4 py-3 font-medium">内容</th>
                <th className="px-4 py-3 font-medium">评论用户</th>
                <th className="px-4 py-3 font-medium">评论内容</th>
                <th className="px-4 py-3 font-medium">层级</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">时间</th>
                <th className="px-4 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F2F7]">
              {items.map((item) => {
                const depth = depthOf(item);
                return (
                  <tr key={item.id} className={loading ? 'opacity-60' : ''}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                        className="h-3.5 w-3.5 accent-[#0071E3]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1D1D1F]">
                        {item.targetTitle || '-'}
                      </div>
                      <div className="mt-0.5 text-[11px] text-[#8E8E93]">
                        {COMMENT_TARGET_LABELS[item.targetType || ''] || item.targetType || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-[#1D1D1F]">{item.nickname || '用户'}</div>
                      <div className="mt-0.5 text-[11px] text-[#8E8E93]">{item.userId || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="max-w-md truncate text-[#3A3A3C]"
                        style={{ paddingLeft: Math.min(depth, 8) * 14 }}
                      >
                        {depth > 0 && <span className="mr-1 text-[#C7C7CC]">└</span>}
                        {item.replyToNickname && (
                          <span className="text-[#0071E3]">回复 @{item.replyToNickname}：</span>
                        )}
                        {item.content || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] tabular-nums text-[#8E8E93]">
                      {depth + 1} 层
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${statusClass(item.status)}`}>
                        {COMMENT_STATUS_LABELS[item.status || ''] || item.status || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#8E8E93]">
                      {formatDateShort(item.createTime || '')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {can('detail') && (
                          <button
                            type="button"
                            onClick={() => setDetail(item)}
                            className="rounded-lg p-1.5 text-[#6E6E73] hover:bg-[#F2F2F7]"
                            title="详情"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        )}
                        {can('audit') && item.status !== 'APPROVED' && (
                          <button
                            type="button"
                            onClick={() => void handleAudit([item.id], 'APPROVED')}
                            className="rounded-lg p-1.5 text-[#248A3D] hover:bg-[#34C759]/10"
                            title="通过"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        {can('audit') && item.status !== 'REJECTED' && (
                          <button
                            type="button"
                            onClick={() => void handleAudit([item.id], 'REJECTED')}
                            className="rounded-lg p-1.5 text-[#B26A00] hover:bg-[#FF9500]/10"
                            title="拒绝"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        {can('delete') && (
                          <button
                            type="button"
                            onClick={() => setDeleteIds([item.id])}
                            className="rounded-lg p-1.5 text-[#D70015] hover:bg-[#FF3B30]/10"
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-[13px] text-[#8E8E93]">
                    暂无评论
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F2F2F7] px-4 py-3 text-[12px] text-[#8E8E93]">
            <div>共 {total} 条</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrent((p) => Math.max(1, p - 1))}
                disabled={current <= 1}
                className="rounded-lg border border-[#D2D2D7] px-2.5 py-1.5 hover:bg-[#F5F5F7] disabled:opacity-40"
              >
                上一页
              </button>
              <span className="tabular-nums">{current} / {pages}</span>
              <button
                type="button"
                onClick={() => setCurrent((p) => Math.min(pages, p + 1))}
                disabled={current >= pages}
                className="rounded-lg border border-[#D2D2D7] px-2.5 py-1.5 hover:bg-[#F5F5F7] disabled:opacity-40"
              >
                下一页
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
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-[16px] font-semibold text-[#1D1D1F]">评论详情</h3>
              <button type="button" onClick={() => setDetail(null)} className="text-[#86868B] hover:text-[#1D1D1F]">
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
    </PageShell>
  );
}
