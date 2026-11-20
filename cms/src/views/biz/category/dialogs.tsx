/**
 * 通用分类弹窗集合：新增/编辑表单、详情、删除确认、Excel 导入
 * 供 biz/category/index 使用，UI 风格与 CueStudio 工作台保持一致。
 */
import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  ImagePlus,
  Loader2,
  Settings2,
  Upload,
  X,
} from 'lucide-react';
import { uploadFileWithProgress } from '../../../lib/api.ts';
import {
  CATEGORY_MODULES,
  categoryApi,
  categoryModuleLabel,
  categoryStatusLabel,
  generateCategoryCode,
  type BizCategory,
  type CategoryImportResult,
  type CategoryPayload,
} from '../../../lib/category.ts';
import { formatDateShort } from '../../../lib/format.ts';
import { SelectField } from '../../../components/SelectField.tsx';
import { SwitchField } from '../../../components/SwitchField.tsx';

const INPUT_CLASS =
  'w-full h-9 px-3 rounded-xl bg-[#F5F5F7] border border-transparent text-[13px] text-[#1D1D1F] placeholder:text-[#AEAEB2] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 focus:border-[#0071E3]/30 transition-all';
const LABEL_CLASS = 'block text-[12px] font-medium text-[#3A3A3C] mb-1.5';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '操作失败，请稍后重试';
}

/** 通用弹窗外框 */
export function CategoryModal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  width = 'max-w-2xl',
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${width} max-h-[90vh] flex flex-col bg-white rounded-2xl border border-[#E5E5EA] shadow-[0_20px_60px_rgba(0,0,0,0.16)] overflow-hidden`}
      >
        <div className="px-6 py-4 border-b border-[#F2F2F7] flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold text-[#1D1D1F] truncate">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12px] text-[#86868B]">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-[#86868B] hover:bg-[#F5F5F7] hover:text-[#1D1D1F] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-[#F2F2F7] flex items-center justify-end gap-2 shrink-0 bg-[#FAFAFC]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="h-9 px-4 rounded-xl bg-white border border-[#E5E5EA] text-[13px] font-medium text-[#3A3A3C] hover:bg-[#F5F5F7] disabled:opacity-50 transition-colors"
    >
      {children}
    </button>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  busy,
  danger,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  danger?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      className={`h-9 px-4 rounded-xl text-white text-[13px] font-medium inline-flex items-center gap-1.5 disabled:opacity-60 transition-colors ${
        danger ? 'bg-[#D70015] hover:bg-[#C20012]' : 'bg-[#0071E3] hover:bg-[#0077ED]'
      }`}
    >
      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
}

function InlineError({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-[#FF3B30]/8 px-3 py-2 text-[12px] text-[#D70015]">
      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>{children}</span>
    </div>
  );
}

/** 计算自身 + 所有子孙 id，编辑时避免把父级设成自己或自己的子节点 */
function selfAndDescendants(categories: BizCategory[], rootId: string): Set<string> {
  const blocked = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    categories.forEach((c) => {
      if (c.parentId && blocked.has(c.parentId) && !blocked.has(c.id)) {
        blocked.add(c.id);
        changed = true;
      }
    });
  }
  return blocked;
}

function byCategorySort(a: BizCategory, b: BizCategory): number {
  const diff = (a.sortCode ?? 9999) - (b.sortCode ?? 9999);
  return diff !== 0 ? diff : (a.name || '').localeCompare(b.name || '', 'zh-CN');
}

/** 父级下拉候选：按 parentId 组装树形层级展开（缩进展示），排除不可选节点 */
function flattenParentOptions(
  categories: BizCategory[],
  exclude: Set<string>
): Array<{ item: BizCategory; depth: number }> {
  const ids = new Set(categories.map((c) => c.id));
  const childrenOf = new Map<string, BizCategory[]>();
  categories.forEach((c) => {
    const key = c.parentId && ids.has(c.parentId) ? c.parentId : '__root__';
    const list = childrenOf.get(key) || [];
    list.push(c);
    childrenOf.set(key, list);
  });
  childrenOf.forEach((list) => list.sort(byCategorySort));

  const out: Array<{ item: BizCategory; depth: number }> = [];
  const visited = new Set<string>();
  const walk = (list: BizCategory[], depth: number) => {
    list.forEach((c) => {
      if (visited.has(c.id)) return; // 防御脏数据环形父子
      visited.add(c.id);
      if (!exclude.has(c.id)) out.push({ item: c, depth });
      walk(childrenOf.get(c.id) || [], depth + 1);
    });
  };
  walk(childrenOf.get('__root__') || [], 0);
  // 环形或断链节点兜底平铺
  categories
    .filter((c) => !visited.has(c.id) && !exclude.has(c.id))
    .sort(byCategorySort)
    .forEach((c) => out.push({ item: c, depth: 0 }));
  return out;
}

/* ------------------------------------------------------------------ */
/* 新增 / 编辑                                                         */
/* ------------------------------------------------------------------ */

export function CategoryFormDialog({
  item,
  categories,
  onClose,
  onSubmit,
}: {
  item: BizCategory | null;
  categories: BizCategory[];
  onClose: () => void;
  onSubmit: (payload: CategoryPayload) => Promise<void>;
}) {
  const isEdit = !!item;
  const [name, setName] = useState(item?.name || '');
  const [image, setImage] = useState(item?.image || '');
  const [parentId, setParentId] = useState(item?.parentId || '0');
  // 适用模块为必填项，新建时留空，强制用户显式选择
  const [module, setModule] = useState(item?.module || '');
  const [status, setStatus] = useState(item?.status || 'ENABLE');
  const [sortCode, setSortCode] = useState(String(item?.sortCode ?? categories.length + 1));
  const [icon, setIcon] = useState(item?.icon || '');
  const [description, setDescription] = useState(item?.description || '');
  const [remark, setRemark] = useState(item?.remark || '');
  const [moreOpen, setMoreOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const blocked = item ? selfAndDescendants(categories, item.id) : new Set<string>();
  const parentOptions = flattenParentOptions(categories, blocked);

  async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadFileWithProgress(file);
      setImage(url);
    } catch (err) {
      setError(`图片上传失败：${errorMessage(err)}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleSubmit() {
    const trimmedModule = module.trim();
    if (!trimmedModule) return setError('请选择适用模块');
    const trimmedName = name.trim();
    if (!trimmedName) return setError('请填写分类名称');
    const parsedSort = Number(sortCode);
    if (!Number.isFinite(parsedSort)) return setError('排序需为数字');

    const payload: CategoryPayload = {
      ...(item ? { id: item.id } : {}),
      parentId: parentId || '0',
      name: trimmedName,
      // 编码不再由用户填写：编辑保留原值（历史数据为空时补生成），新增自动生成
      code: item?.code?.trim() || generateCategoryCode(),
      image: image.trim(),
      icon: icon.trim(),
      module: trimmedModule,
      description: description.trim(),
      status,
      sortCode: Math.trunc(parsedSort),
      remark: remark.trim(),
      // 扩展信息不再维护，编辑时原样回传避免后端整体复制时丢数据
      extJson: item?.extJson || '',
    };
    setBusy(true);
    setError(null);
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <CategoryModal
      title={isEdit ? '编辑分类' : '新增分类'}
      subtitle="填写适用模块与名称即可，其余设置可展开「更多选项」调整"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={busy}>
            取消
          </SecondaryButton>
          <PrimaryButton onClick={() => void handleSubmit()} busy={busy} disabled={uploading}>
            保存
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        {error && <InlineError>{error}</InlineError>}

        <div>
          <label className={LABEL_CLASS}>
            适用模块 <span className="text-[#D70015]">*</span>
          </label>
          <div
            role="radiogroup"
            aria-label="适用模块"
            className="flex flex-wrap gap-1.5"
          >
            {CATEGORY_MODULES.map((m) => {
              const active = module === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setModule(m.value)}
                  className={`h-8 px-3 rounded-lg text-[12px] font-medium transition-colors ${
                    active
                      ? 'bg-[#0071E3] text-white'
                      : 'bg-[#F5F5F7] text-[#3A3A3C] hover:bg-[#EBEBF0]'
                  }`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-[11px] text-[#86868B]">
            决定该分类会出现在哪个发布模块的分类下拉中
          </p>
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="cat-name">
            分类名称 <span className="text-[#D70015]">*</span>
          </label>
          <input
            id="cat-name"
            className={INPUT_CLASS}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="如：设计方法论"
            maxLength={100}
          />
        </div>

        <div>
          <label className={LABEL_CLASS} htmlFor="cat-image">
            分类图片
          </label>
          <div className="flex items-center gap-2">
            <input
              id="cat-image"
              className={INPUT_CLASS}
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="图片 URL，或点击右侧上传"
            />
            <label
              className={`h-9 px-3 shrink-0 rounded-xl border border-[#E5E5EA] text-[12px] font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                uploading
                  ? 'text-[#AEAEB2] bg-[#F5F5F7]'
                  : 'text-[#3A3A3C] hover:bg-[#F5F5F7] hover:text-[#0071E3]'
              }`}
            >
              {uploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ImagePlus className="w-3.5 h-3.5" />
              )}
              {uploading ? '上传中' : '上传'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => void handleUpload(e)}
              />
            </label>
          </div>
          {image && (
            <img
              src={image}
              alt="分类图片预览"
              className="mt-2 h-16 w-28 object-cover rounded-lg border border-[#E5E5EA] bg-[#F5F5F7]"
            />
          )}
        </div>

        {/* 更多选项：默认折叠，点击才展开 */}
        <div className="pt-4 border-t border-[#F2F2F7]">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className="w-full h-10 px-3 rounded-xl bg-[#F5F5F7] flex items-center justify-between gap-2 text-[12px] font-medium text-[#3A3A3C] hover:bg-[#EDEDF0] transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5 text-[#86868B]" strokeWidth={1.8} />
              更多选项
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-normal text-[#86868B]">
              父级 / 状态 / 排序等
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`}
              />
            </span>
          </button>

          {moreOpen && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLASS}>父级分类</label>
                  <SelectField
                    value={parentId}
                    onChange={setParentId}
                    ariaLabel="父级分类"
                    className="w-full"
                    options={[
                      { value: '0', label: '顶级分类' },
                      ...parentOptions.map(({ item: c, depth }) => ({
                        value: c.id,
                        label:
                          depth > 0
                            ? `${'　'.repeat(depth)}└ ${c.name || c.id}`
                            : c.name || c.id,
                      })),
                    ]}
                  />
                </div>
                <div>
                  <label className={LABEL_CLASS}>状态</label>
                  <div className="h-9 flex items-center">
                    <SwitchField
                      checked={status === 'ENABLE'}
                      onChange={(next) => setStatus(next ? 'ENABLE' : 'DISABLE')}
                      ariaLabel="分类状态"
                      onLabel="启用"
                      offLabel="停用"
                    />
                  </div>
                </div>
                <div>
                  <label className={LABEL_CLASS} htmlFor="cat-sort">
                    排序
                  </label>
                  <input
                    id="cat-sort"
                    type="number"
                    className={INPUT_CLASS}
                    value={sortCode}
                    onChange={(e) => setSortCode(e.target.value)}
                    placeholder="数字越小越靠前"
                  />
                </div>
              </div>

              <div>
                <label className={LABEL_CLASS} htmlFor="cat-icon">
                  分类图标
                </label>
                <input
                  id="cat-icon"
                  className={INPUT_CLASS}
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="图标名称或图标 URL，如 BookOpen"
                />
              </div>

              <div>
                <label className={LABEL_CLASS} htmlFor="cat-desc">
                  分类描述
                </label>
                <textarea
                  id="cat-desc"
                  className={`${INPUT_CLASS} h-auto min-h-[72px] py-2 leading-relaxed resize-y`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="一句话说明该分类的用途"
                  maxLength={500}
                />
              </div>

              <div>
                <label className={LABEL_CLASS} htmlFor="cat-remark">
                  备注
                </label>
                <textarea
                  id="cat-remark"
                  className={`${INPUT_CLASS} h-auto min-h-[64px] py-2 resize-y`}
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  maxLength={500}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </CategoryModal>
  );
}

/* ------------------------------------------------------------------ */
/* 详情                                                               */
/* ------------------------------------------------------------------ */

export function CategoryDetailDialog({
  id,
  categories,
  onClose,
}: {
  id: string;
  categories: BizCategory[];
  onClose: () => void;
}) {
  const [item, setItem] = useState<BizCategory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    categoryApi
      .detail(id)
      .then((data) => alive && setItem(data))
      .catch((err) => alive && setError(errorMessage(err)));
    return () => {
      alive = false;
    };
  }, [id]);

  /** 从父级沿 parentId 向上追溯完整层级路径（防御环形数据） */
  const ancestorPath = (() => {
    if (!item?.parentId) return [];
    const byId = new Map(categories.map((c) => [c.id, c]));
    const chain: string[] = [];
    let cur: string | undefined = item.parentId;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      const parent = byId.get(cur);
      if (!parent) {
        chain.push(cur); // 父级数据缺失时展示原始 ID
        break;
      }
      chain.push(parent.name || cur);
      cur = parent.parentId;
    }
    return chain.reverse();
  })();
  const parentName = ancestorPath.length ? ancestorPath.join(' / ') : '顶级分类';

  const rows: Array<{ label: string; value: ReactNode }> = item
    ? [
        { label: '分类名称', value: item.name || '-' },
        { label: '层级路径', value: parentName },
        { label: '适用模块', value: `${categoryModuleLabel(item.module)}（${item.module || '-'}）` },
        { label: '状态', value: categoryStatusLabel(item.status) },
        { label: '排序', value: item.sortCode ?? '-' },
        { label: '分类图标', value: item.icon || '-' },
        { label: '分类描述', value: item.description || '-' },
        { label: '备注', value: item.remark || '-' },
        { label: '创建时间', value: item.createTime ? formatDateShort(item.createTime) : '-' },
        { label: '更新时间', value: item.updateTime ? formatDateShort(item.updateTime) : '-' },
        { label: '创建人', value: item.createUser || '-' },
        { label: '更新人', value: item.updateUser || '-' },
      ]
    : [];

  return (
    <CategoryModal
      title="分类详情"
      subtitle={`ID：${id}`}
      onClose={onClose}
      width="max-w-xl"
      footer={<SecondaryButton onClick={onClose}>关闭</SecondaryButton>}
    >
      {error ? (
        <InlineError>{error}</InlineError>
      ) : !item ? (
        <div className="py-10 flex items-center justify-center gap-2 text-[13px] text-[#86868B]">
          <Loader2 className="w-4 h-4 animate-spin" />
          正在加载分类详情...
        </div>
      ) : (
        <>
          {item.image && (
            <img
              src={item.image}
              alt={item.name || '分类图片'}
              className="mb-4 h-32 w-full object-cover rounded-xl border border-[#E5E5EA] bg-[#F5F5F7]"
            />
          )}
          <dl className="divide-y divide-[#F2F2F7]">
            {rows.map((row) => (
              <div key={row.label} className="py-2.5 flex items-start gap-4 text-[13px]">
                <dt className="w-24 shrink-0 text-[#86868B]">{row.label}</dt>
                <dd className="flex-1 min-w-0 text-[#1D1D1F] break-words whitespace-pre-wrap">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </CategoryModal>
  );
}

/* ------------------------------------------------------------------ */
/* 删除确认                                                           */
/* ------------------------------------------------------------------ */

export function CategoryDeleteDialog({
  items,
  onClose,
  onConfirm,
}: {
  items: BizCategory[];
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <CategoryModal
      title="确认删除分类？"
      subtitle="删除后不可恢复，已使用该分类的内容可能显示为未分类"
      onClose={onClose}
      width="max-w-md"
      footer={
        <>
          <SecondaryButton onClick={onClose} disabled={busy}>
            取消
          </SecondaryButton>
          <PrimaryButton onClick={() => void handleConfirm()} busy={busy} danger>
            确认删除
          </PrimaryButton>
        </>
      }
    >
      {error && <InlineError>{error}</InlineError>}
      <p className="text-[13px] text-[#3A3A3C] leading-6">
        即将删除 <span className="font-semibold text-[#D70015]">{items.length}</span> 个分类：
      </p>
      <ul className="mt-3 rounded-xl bg-[#F5F5F7] p-3 space-y-1.5 max-h-40 overflow-y-auto">
        {items.slice(0, 10).map((c) => (
          <li key={c.id} className="text-[12px] text-[#3A3A3C] truncate">
            · {c.name || c.id}
          </li>
        ))}
        {items.length > 10 && (
          <li className="text-[12px] text-[#86868B]">…等共 {items.length} 项</li>
        )}
      </ul>
    </CategoryModal>
  );
}

/* ------------------------------------------------------------------ */
/* Excel 导入                                                         */
/* ------------------------------------------------------------------ */

export function CategoryImportDialog({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<CategoryImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleTemplate() {
    setDownloading(true);
    setError(null);
    try {
      await categoryApi.downloadTemplate();
    } catch (err) {
      setError(`模板下载失败：${errorMessage(err)}`);
    } finally {
      setDownloading(false);
    }
  }

  async function handleImport() {
    if (!file) return setError('请先选择要导入的 Excel 文件');
    setBusy(true);
    setError(null);
    try {
      const data = await categoryApi.importData(file);
      setResult(data);
      onImported();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <CategoryModal
      title="导入分类数据"
      subtitle="使用后端 /biz/category/importData 接口，按模板格式批量新增或更新"
      onClose={onClose}
      width="max-w-lg"
      footer={
        <>
          <SecondaryButton onClick={onClose}>关闭</SecondaryButton>
          <PrimaryButton onClick={() => void handleImport()} busy={busy} disabled={!file || !!result}>
            <Upload className="w-3.5 h-3.5" />
            开始导入
          </PrimaryButton>
        </>
      }
    >
      <div className="space-y-4">
        {error && <InlineError>{error}</InlineError>}

        <button
          type="button"
          onClick={() => void handleTemplate()}
          disabled={downloading}
          className="w-full rounded-xl border border-dashed border-[#C7C7CC] bg-[#FAFAFC] px-4 py-4 flex items-center gap-3 text-left hover:border-[#0071E3]/50 hover:bg-[#0071E3]/4 transition-colors"
        >
          <div className="w-10 h-10 rounded-xl bg-[#0071E3]/10 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5 text-[#0071E3]" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-medium text-[#1D1D1F]">
              {downloading ? '模板生成中...' : '下载导入模板'}
            </div>
            <div className="text-[12px] text-[#86868B] mt-0.5">
              模板列与后端字段一致；填写 ID 为更新，留空 ID 的行将按规则校验
            </div>
          </div>
        </button>

        <div>
          <label className={LABEL_CLASS} htmlFor="cat-import-file">
            选择文件（.xlsx / .xls）
          </label>
          <input
            id="cat-import-file"
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setResult(null);
              setError(null);
            }}
            className="w-full text-[13px] text-[#3A3A3C] file:mr-3 file:h-9 file:px-3 file:rounded-xl file:border-0 file:bg-[#F2F2F7] file:text-[12px] file:font-medium file:text-[#3A3A3C] hover:file:bg-[#E5E5EA]"
          />
        </div>

        {result && (
          <div className="rounded-xl bg-[#F5F5F7] p-4">
            <div className="flex items-center gap-2 text-[13px] font-medium text-[#1D1D1F]">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
              导入完成
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {[
                { label: '总条数', value: result.totalCount },
                { label: '成功', value: result.successCount },
                { label: '失败', value: result.errorCount },
              ].map((s) => (
                <div key={s.label} className="rounded-lg bg-white py-2.5">
                  <div className="text-[18px] font-semibold tabular-nums text-[#1D1D1F]">
                    {s.value ?? 0}
                  </div>
                  <div className="text-[11px] text-[#86868B]">{s.label}</div>
                </div>
              ))}
            </div>
            {!!result.errorDetail?.length && (
              <ul className="mt-3 space-y-1 max-h-32 overflow-y-auto text-[12px] text-[#D70015]">
                {result.errorDetail.map((d, idx) => (
                  <li key={idx}>
                    第 {d.index ?? idx + 1} 行：{d.msg || '导入异常'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </CategoryModal>
  );
}
