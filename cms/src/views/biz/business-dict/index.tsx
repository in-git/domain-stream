/**
 * 业务字典管理
 * ------------------------------------------------------------------
 * 参照「通用分类 - 管理模块」的业务字典用法，独立成一个模块：
 * 左侧维护字典类型（DEV_DICT.PARENT_ID = 0），右侧维护类型下的字典项。
 * 素材资源库的「图片/视频/SVG/图标」等类型即来自 ASSET_TYPE 字典。
 */
import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import {
  businessDictApi,
  type BizDictItem,
} from '../../../lib/dict.ts';
import { hasPerm } from '../../../lib/menu.ts';
import { showToast } from '../../../components/AppToast.tsx';
import { DeleteConfirmModal } from '../../../components/DeleteConfirmModal.tsx';
import {
  CategoryModal,
  PrimaryButton,
  SecondaryButton,
} from '../category/dialogs.tsx';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '操作失败，请稍后重试';
}

const INPUT_CLASS =
  'w-full h-9 px-3 rounded-xl bg-[#F5F5F7] border border-transparent text-[13px] text-[#1D1D1F] placeholder:text-[#AEAEB2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 focus:border-[#0071E3]/30 transition-all';
const LABEL_CLASS = 'block text-[12px] font-medium text-[#3A3A3C] mb-1.5';

export default function BusinessDictView() {
  const [types, setTypes] = useState<BizDictItem[]>([]);
  const [activeTypeId, setActiveTypeId] = useState('');
  const [items, setItems] = useState<BizDictItem[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState('');
  const [typeForm, setTypeForm] = useState<{ mode: 'add' | 'edit'; item?: BizDictItem } | null>(null);
  const [itemForm, setItemForm] = useState<{ mode: 'add' | 'edit'; item?: BizDictItem } | null>(null);
  const [deleteType, setDeleteType] = useState<BizDictItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<BizDictItem | null>(null);

  const activeType = types.find((type) => type.id === activeTypeId) || null;
  const canAdd = hasPerm('bizBusinessDictAdd');
  const canEdit = hasPerm('bizBusinessDictEdit');
  const canDelete = hasPerm('bizBusinessDictDelete');

  const loadTypes = useCallback(async (preferId?: string) => {
    setLoadingTypes(true);
    setError('');
    try {
      const list = await businessDictApi.typeList();
      setTypes(list);
      setActiveTypeId((prev) => {
        const next = preferId || prev;
        if (next && list.some((type) => type.id === next)) return next;
        return list[0]?.id || '';
      });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingTypes(false);
    }
  }, []);

  const loadItems = useCallback(async (typeId: string) => {
    if (!typeId) {
      setItems([]);
      return;
    }
    setLoadingItems(true);
    try {
      setItems(await businessDictApi.itemList(typeId));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingItems(false);
    }
  }, []);

  useEffect(() => {
    void loadTypes();
  }, [loadTypes]);

  useEffect(() => {
    void loadItems(activeTypeId);
  }, [activeTypeId, loadItems]);

  async function handleDeleteType() {
    if (!deleteType) return;
    await businessDictApi.deleteTypes([deleteType.id]);
    showToast('字典类型已删除', 'success');
    setDeleteType(null);
    await loadTypes();
  }

  async function handleDeleteItem() {
    if (!deleteItem) return;
    await businessDictApi.deleteItems([deleteItem.id]);
    showToast('字典项已删除', 'success');
    setDeleteItem(null);
    await loadItems(activeTypeId);
    await loadTypes(activeTypeId);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold text-[#1D1D1F]">业务字典</h1>
          <p className="mt-1 text-[13px] text-[#6E6E73]">
            统一维护业务模块使用的字典类型与字典项，素材类型等配置会同步到对应页面。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadTypes(activeTypeId)}
            disabled={loadingTypes}
            title="刷新"
            className="h-9 w-9 rounded-xl border border-[#E5E5EA] bg-white text-[#6E6E73] hover:bg-[#F5F5F7] disabled:opacity-50 inline-flex items-center justify-center transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingTypes ? 'animate-spin' : ''}`} />
          </button>
          {canAdd && (
            <PrimaryButton onClick={() => setTypeForm({ mode: 'add' })}>
              <Plus className="w-4 h-4" />
              新增字典类型
            </PrimaryButton>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-[#FF3B30]/20 bg-[#FF3B30]/8 px-4 py-3 text-[13px] text-[#D70015]">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        <aside className="rounded-[18px] border border-[#E5E5EA] bg-white p-3">
          <div className="px-2 py-1 text-[12px] font-medium text-[#86868B]">字典类型</div>
          {loadingTypes ? (
            <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-[#86868B]">
              <Loader2 className="w-4 h-4 animate-spin" />
              加载中...
            </div>
          ) : types.length === 0 ? (
            <div className="px-2 py-10 text-center text-[13px] text-[#86868B]">
              暂无字典类型
            </div>
          ) : (
            <div className="space-y-1">
              {types.map((type) => {
                const active = type.id === activeTypeId;
                return (
                  <div
                    key={type.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveTypeId(type.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') setActiveTypeId(type.id);
                    }}
                    className={`group flex items-center gap-2 rounded-xl px-2.5 py-2 cursor-pointer transition-colors ${
                      active ? 'bg-[#0071E3]/10' : 'hover:bg-[#F5F5F7]'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 shrink-0 rounded-full flex items-center justify-center ${
                        active ? 'bg-[#0071E3] text-white' : 'border border-[#D2D2D7]'
                      }`}
                    >
                      {active && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-[13px] font-medium ${
                          active ? 'text-[#0071E3]' : 'text-[#1D1D1F]'
                        }`}
                      >
                        {type.dictLabel || '未命名字典'}
                      </span>
                      <span className="block truncate font-mono text-[11px] text-[#86868B]">
                        {type.dictValue || '-'}
                      </span>
                    </span>
                    {(canEdit || canDelete) && (
                      <span className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canEdit && (
                          <button
                            type="button"
                            aria-label="编辑字典类型"
                            onClick={(event) => {
                              event.stopPropagation();
                              setTypeForm({ mode: 'edit', item: type });
                            }}
                            className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-[#6E6E73] hover:bg-white hover:text-[#0071E3]"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            aria-label="删除字典类型"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteType(type);
                            }}
                            className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-[#6E6E73] hover:bg-white hover:text-[#D70015]"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        <section className="rounded-[18px] border border-[#E5E5EA] bg-white overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F2F2F7] px-4 py-3">
            <div className="min-w-0">
              <h2 className="truncate text-[15px] font-semibold text-[#1D1D1F]">
                {activeType?.dictLabel || '字典项'}
              </h2>
              <p className="mt-0.5 truncate font-mono text-[11px] text-[#86868B]">
                {activeType?.dictValue || '请先在左侧选择字典类型'}
              </p>
            </div>
            {canAdd && activeType && (
              <PrimaryButton onClick={() => setItemForm({ mode: 'add' })}>
                <Plus className="w-4 h-4" />
                新增字典项
              </PrimaryButton>
            )}
          </div>

          {loadingItems ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[#86868B]">
              <Loader2 className="w-4 h-4 animate-spin" />
              加载中...
            </div>
          ) : !activeType ? (
            <div className="py-16 text-center text-[13px] text-[#86868B]">
              请先在左侧选择字典类型
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-[13px] text-[#86868B]">
              该类型下还没有字典项
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[13px]">
                <thead className="bg-[#FAFAFC] text-[12px] text-[#86868B]">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">名称</th>
                    <th className="px-4 py-2.5 font-medium">值</th>
                    <th className="px-4 py-2.5 font-medium">颜色</th>
                    <th className="px-4 py-2.5 font-medium">排序</th>
                    {(canEdit || canDelete) && (
                      <th className="px-4 py-2.5 text-right font-medium">操作</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-[#F2F2F7]">
                      <td className="px-4 py-3 text-[#1D1D1F]">{item.dictLabel || '-'}</td>
                      <td className="px-4 py-3 font-mono text-[12px] text-[#6E6E73]">
                        {item.dictValue || '-'}
                      </td>
                      <td className="px-4 py-3 text-[#6E6E73]">{item.dictColor || 'default'}</td>
                      <td className="px-4 py-3 text-[#6E6E73]">{item.sortCode ?? '-'}</td>
                      {(canEdit || canDelete) && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {canEdit && (
                              <button
                                type="button"
                                aria-label="编辑字典项"
                                onClick={() => setItemForm({ mode: 'edit', item })}
                                className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#0071E3]"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                aria-label="删除字典项"
                                onClick={() => setDeleteItem(item)}
                                className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[#6E6E73] hover:bg-[#FF3B30]/8 hover:text-[#D70015]"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {typeForm && (
        <TypeFormDialog
          item={typeForm.item}
          onClose={() => setTypeForm(null)}
          onSaved={(message) => {
            setTypeForm(null);
            showToast(message, 'success');
            void loadTypes(activeTypeId);
          }}
        />
      )}

      {itemForm && activeType && (
        <ItemFormDialog
          typeId={activeType.id}
          item={itemForm.item}
          onClose={() => setItemForm(null)}
          onSaved={(message) => {
            setItemForm(null);
            showToast(message, 'success');
            void loadItems(activeType.id);
            void loadTypes(activeType.id);
          }}
        />
      )}

      {deleteType && (
        <DeleteConfirmModal
          title={`确认删除字典类型「${deleteType.dictLabel || ''}」？`}
          itemTitles={[deleteType.dictLabel || deleteType.dictValue || '']}
          description="类型下存在字典项时无法删除，请先清空字典项。删除后相关业务页面将不再读取该类型。"
          onConfirm={handleDeleteType}
          onClose={() => setDeleteType(null)}
        />
      )}

      {deleteItem && (
        <DeleteConfirmModal
          title={`确认删除字典项「${deleteItem.dictLabel || ''}」？`}
          itemTitles={[deleteItem.dictLabel || deleteItem.dictValue || '']}
          description="删除后引用该字典值的页面会立即同步，操作不可撤销。"
          onConfirm={handleDeleteItem}
          onClose={() => setDeleteItem(null)}
        />
      )}
    </div>
  );
}

function TypeFormDialog({
  item,
  onClose,
  onSaved,
}: {
  item?: BizDictItem;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [label, setLabel] = useState(item?.dictLabel || '');
  const [value, setValue] = useState(item?.dictValue || '');
  const [sortCode, setSortCode] = useState(String(item?.sortCode ?? 10));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const nextLabel = label.trim();
    const nextValue = value.trim().toUpperCase();
    if (!nextLabel) return setError('请填写字典类型名称');
    if (!nextValue) return setError('请填写字典类型编码');
    if (!/^[A-Z][A-Z0-9_]*$/.test(nextValue)) {
      return setError('编码需以字母开头，只允许大写字母、数字和下划线');
    }
    const parsedSort = Number(sortCode);
    if (!Number.isFinite(parsedSort)) return setError('排序需为数字');

    setBusy(true);
    setError('');
    try {
      if (item) {
        await businessDictApi.editType({
          id: item.id,
          dictLabel: nextLabel,
          dictValue: nextValue,
          sortCode: Math.trunc(parsedSort),
        });
        onSaved('字典类型已更新');
      } else {
        await businessDictApi.addType({
          dictLabel: nextLabel,
          dictValue: nextValue,
          sortCode: Math.trunc(parsedSort),
        });
        onSaved('字典类型已新增');
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <CategoryModal
      title={item ? '编辑字典类型' : '新增字典类型'}
      subtitle="编码用于业务代码读取，例如 ASSET_TYPE；创建后不建议频繁修改"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={busy}>
            取消
          </SecondaryButton>
          <PrimaryButton onClick={() => void submit()} busy={busy}>
            保存
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <p className="rounded-xl bg-[#FF3B30]/8 px-3 py-2 text-[12px] text-[#D70015]">{error}</p>
        )}
        <div>
          <label className={LABEL_CLASS}>类型名称</label>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="如：素材类型"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>类型编码</label>
          <input
            value={value}
            onChange={(event) => setValue(event.target.value.toUpperCase())}
            placeholder="如：ASSET_TYPE"
            spellCheck={false}
            className={`${INPUT_CLASS} font-mono`}
          />
          <p className="mt-1 text-[11px] text-[#86868B]">仅允许大写字母、数字和下划线，且以字母开头</p>
        </div>
        <div>
          <label className={LABEL_CLASS}>排序</label>
          <input
            value={sortCode}
            onChange={(event) => setSortCode(event.target.value)}
            inputMode="numeric"
            className={INPUT_CLASS}
          />
        </div>
      </div>
    </CategoryModal>
  );
}

function ItemFormDialog({
  typeId,
  item,
  onClose,
  onSaved,
}: {
  typeId: string;
  item?: BizDictItem;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [label, setLabel] = useState(item?.dictLabel || '');
  const [value, setValue] = useState(item?.dictValue || '');
  const [color, setColor] = useState(item?.dictColor || 'default');
  const [sortCode, setSortCode] = useState(String(item?.sortCode ?? 10));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    const nextLabel = label.trim();
    const nextValue = value.trim();
    if (!nextLabel) return setError('请填写字典名称');
    if (!nextValue) return setError('请填写字典值');
    const parsedSort = Number(sortCode);
    if (!Number.isFinite(parsedSort)) return setError('排序需为数字');

    setBusy(true);
    setError('');
    try {
      if (item) {
        await businessDictApi.editItem({
          id: item.id,
          dictLabel: nextLabel,
          dictValue: nextValue,
          dictColor: color.trim() || 'default',
          sortCode: Math.trunc(parsedSort),
        });
        onSaved('字典项已更新');
      } else {
        await businessDictApi.addItem({
          typeId,
          dictLabel: nextLabel,
          dictValue: nextValue,
          dictColor: color.trim() || 'default',
          sortCode: Math.trunc(parsedSort),
        });
        onSaved('字典项已新增');
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <CategoryModal
      title={item ? '编辑字典项' : '新增字典项'}
      subtitle="字典值会写入业务数据，修改前请确认引用方"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={busy}>
            取消
          </SecondaryButton>
          <PrimaryButton onClick={() => void submit()} busy={busy}>
            保存
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <p className="rounded-xl bg-[#FF3B30]/8 px-3 py-2 text-[12px] text-[#D70015]">{error}</p>
        )}
        <div>
          <label className={LABEL_CLASS}>名称</label>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="如：图片"
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label className={LABEL_CLASS}>值</label>
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder="如：IMAGE"
            spellCheck={false}
            className={`${INPUT_CLASS} font-mono`}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLASS}>颜色</label>
            <input
              value={color}
              onChange={(event) => setColor(event.target.value)}
              placeholder="default"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label className={LABEL_CLASS}>排序</label>
            <input
              value={sortCode}
              onChange={(event) => setSortCode(event.target.value)}
              inputMode="numeric"
              className={INPUT_CLASS}
            />
          </div>
        </div>
      </div>
    </CategoryModal>
  );
}
