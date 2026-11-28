/**
 * 业务字典项管理弹窗（通用）
 * ------------------------------------------------------------------
 * 传入字典类型编码（如 ASSET_TYPE），即可维护该类型下的字典项。
 * 供素材资源库的「文件类型」等入口直接复用，交互参照通用分类的模块管理。
 */
import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { businessDictApi, type BizDictItem } from '../lib/dict.ts';
import { showToast } from './AppToast.tsx';
import { DeleteConfirmModal } from './DeleteConfirmModal.tsx';

const INPUT_CLASS =
  'w-full h-9 px-3 rounded-xl bg-[#F5F5F7] border border-transparent text-[13px] text-[#1D1D1F] placeholder:text-[#AEAEB2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 focus:border-[#0071E3]/30 transition-all';
const LABEL_CLASS = 'block text-[12px] font-medium text-[#3A3A3C] mb-1.5';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '操作失败，请稍后重试';
}

type Editing = BizDictItem | 'new' | null;

export default function DictItemsManageDialog({
  typeCode,
  title,
  onClose,
  onChanged,
}: {
  typeCode: string;
  title?: string;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [type, setType] = useState<BizDictItem | null>(null);
  const [items, setItems] = useState<BizDictItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState<Editing>(null);
  const [form, setForm] = useState({ label: '', value: '', sort: '10' });
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BizDictItem | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const types = await businessDictApi.typeList();
      const found = types.find((item) => item.dictValue === typeCode) || null;
      setType(found);
      setItems(found ? await businessDictApi.itemList(found.id) : []);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [typeCode]);

  useEffect(() => {
    void load();
  }, [load]);

  function startAdd() {
    const nextSort = items.length
      ? Math.max(...items.map((item) => item.sortCode ?? 0)) + 10
      : 10;
    setEditing('new');
    setForm({ label: '', value: '', sort: String(nextSort) });
    setFormError('');
  }

  function startEdit(item: BizDictItem) {
    setEditing(item);
    setForm({
      label: item.dictLabel || '',
      value: item.dictValue || '',
      sort: String(item.sortCode ?? 10),
    });
    setFormError('');
  }

  async function save() {
    if (!type) return;
    const label = form.label.trim();
    const value = form.value.trim();
    if (!label) return setFormError('请填写名称');
    if (!value) return setFormError('请填写字典值');
    const sortCode = Number(form.sort);
    if (!Number.isFinite(sortCode)) return setFormError('排序需为数字');

    setBusy(true);
    setFormError('');
    try {
      if (editing && editing !== 'new') {
        await businessDictApi.editItem({
          id: editing.id,
          dictLabel: label,
          dictValue: value,
          dictColor: editing.dictColor || 'default',
          sortCode: Math.trunc(sortCode),
        });
        showToast('字典项已更新', 'success');
      } else {
        await businessDictApi.addItem({
          typeId: type.id,
          dictLabel: label,
          dictValue: value,
          dictColor: 'default',
          sortCode: Math.trunc(sortCode),
        });
        showToast('字典项已新增', 'success');
      }
      setEditing(null);
      await load();
      onChanged?.();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    await businessDictApi.deleteItems([deleteTarget.id]);
    showToast('字典项已删除', 'success');
    setDeleteTarget(null);
    await load();
    onChanged?.();
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgba(0,0,0,0.24)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#F2F2F7] px-5 py-4">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold text-[#1D1D1F]">
                {title || `管理${type?.dictLabel || '字典项'}`}
              </h3>
              <p className="mt-0.5 truncate font-mono text-[11px] text-[#86868B]">
                {typeCode}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="关闭"
              className="h-8 w-8 shrink-0 rounded-lg inline-flex items-center justify-center text-[#86868B] hover:bg-[#F5F5F7]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-[13px] text-[#86868B]">
                <Loader2 className="h-4 w-4 animate-spin" />
                加载中...
              </div>
            ) : error ? (
              <div className="rounded-xl border border-[#FF3B30]/20 bg-[#FF3B30]/8 px-3 py-2 text-[12px] text-[#D70015]">
                {error}
              </div>
            ) : !type ? (
              <p className="py-10 text-center text-[13px] text-[#86868B]">
                未找到字典类型 {typeCode}，请先在「业务字典」中创建
              </p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] text-[#86868B]">
                    {type.dictLabel || typeCode}（{items.length} 项）
                  </span>
                  {!editing && (
                    <button
                      type="button"
                      onClick={startAdd}
                      className="h-8 px-3 rounded-[10px] inline-flex items-center gap-1 bg-[#0071E3] text-white text-[12px] font-medium hover:bg-[#0077ED]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      新增一项
                    </button>
                  )}
                </div>

                {editing && (
                  <div className="rounded-xl border border-[#0071E3]/25 bg-[#0071E3]/4 p-3 space-y-3">
                    {formError && (
                      <p className="rounded-lg bg-[#FF3B30]/8 px-2.5 py-1.5 text-[12px] text-[#D70015]">
                        {formError}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={LABEL_CLASS}>名称</label>
                        <input
                          value={form.label}
                          onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                          placeholder="如：图片"
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div>
                        <label className={LABEL_CLASS}>字典值</label>
                        <input
                          value={form.value}
                          onChange={(event) => setForm((prev) => ({ ...prev, value: event.target.value }))}
                          placeholder="如：IMAGE"
                          spellCheck={false}
                          className={`${INPUT_CLASS} font-mono`}
                        />
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="w-28">
                        <label className={LABEL_CLASS}>排序</label>
                        <input
                          value={form.sort}
                          onChange={(event) => setForm((prev) => ({ ...prev, sort: event.target.value }))}
                          inputMode="numeric"
                          className={INPUT_CLASS}
                        />
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing(null)}
                          disabled={busy}
                          className="h-8 px-3 rounded-[10px] border border-[#E5E5EA] bg-white text-[12px] text-[#3A3A3C] hover:bg-[#F5F5F7] disabled:opacity-50"
                        >
                          取消
                        </button>
                        <button
                          type="button"
                          onClick={() => void save()}
                          disabled={busy}
                          className="h-8 px-3 rounded-[10px] bg-[#0071E3] text-white text-[12px] font-medium hover:bg-[#0077ED] disabled:opacity-60 inline-flex items-center gap-1"
                        >
                          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          保存
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {items.length === 0 && !editing ? (
                  <p className="py-8 text-center text-[13px] text-[#86868B]">还没有字典项</p>
                ) : (
                  <div className="space-y-1.5">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-xl border border-[#F2F2F7] bg-[#FAFAFC] px-3 py-2"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-[#1D1D1F]">
                            {item.dictLabel || '-'}
                          </p>
                          <p className="truncate font-mono text-[11px] text-[#86868B]">
                            {item.dictValue || '-'} · 排序 {item.sortCode ?? '-'}
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label="编辑"
                          onClick={() => startEdit(item)}
                          className="h-7 w-7 rounded-lg inline-flex items-center justify-center text-[#6E6E73] hover:bg-white hover:text-[#0071E3]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="删除"
                          onClick={() => setDeleteTarget(item)}
                          className="h-7 w-7 rounded-lg inline-flex items-center justify-center text-[#6E6E73] hover:bg-white hover:text-[#D70015]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-end border-t border-[#F2F2F7] px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl border border-[#E5E5EA] bg-white text-[13px] font-medium text-[#3A3A3C] hover:bg-[#F5F5F7]"
            >
              关闭
            </button>
          </div>
        </div>
      </div>

      {deleteTarget && (
        <DeleteConfirmModal
          title={`确认删除「${deleteTarget.dictLabel || deleteTarget.dictValue || ''}」？`}
          itemTitles={[deleteTarget.dictLabel || deleteTarget.dictValue || '']}
          description="删除后素材资源库等页面会立即同步，操作不可撤销。"
          onConfirm={remove}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}
