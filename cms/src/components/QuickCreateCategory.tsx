/**
 * 快捷创建分类
 * ------------------------------------------------------------------
 * 调用时指定业务模块，用户只需填写分类名称即可创建。
 * 其余字段（编码、父级、状态、排序）由组件自动补全：
 *   - code      自动生成
 *   - parentId  默认顶级分类
 *   - status    默认启用
 *   - sortCode  按同模块已有分类数量递推，保持追加在末尾
 *
 * 用法：
 *   <QuickCreateCategory
 *     open={open}
 *     module="MATERIAL"                 // 必填：适用模块
 *     onClose={() => setOpen(false)}
 *     onCreated={(category) => { ... }}  // 返回新建的分类详情
 *   />
 */
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, FolderPlus, Loader2, X } from 'lucide-react';
import {
  categoryApi,
  categoryModuleLabel,
  generateCategoryCode,
  type BizCategory,
} from '../lib/category.ts';

interface QuickCreateCategoryProps {
  open: boolean;
  /** 必填：新分类适用的业务模块，如 MATERIAL / VIDEO / ARTICLE */
  module: string;
  onClose: () => void;
  /** 创建成功回调，参数为后端返回的最新分类详情 */
  onCreated?: (category: BizCategory) => void;
  /** 弹窗标题，默认「新建分类」 */
  title?: string;
  /** 额外提示文案，例如「新分类将用于本次上传」 */
  hint?: string;
}

/** 统计同模块已有分类数量，用于追加排序值 */
async function nextSortCode(moduleCode: string): Promise<number> {
  let total = 0;
  let maxSort = 0;
  for (let current = 1; ; current++) {
    const page = await categoryApi.page({ current, size: 20 });
    const records = page?.records || [];
    total += records.length;
    records.forEach((item) => {
      if (item.module === moduleCode && typeof item.sortCode === 'number') {
        maxSort = Math.max(maxSort, item.sortCode);
      }
    });
    if (records.length < 20 || total >= (page?.total ?? total)) break;
    if (current >= 500) break;
  }
  return maxSort + 1;
}

export function QuickCreateCategory({
  open,
  module,
  onClose,
  onCreated,
  title = '新建分类',
  hint,
}: QuickCreateCategoryProps) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 关闭时重置表单
  useEffect(() => {
    if (open) return;
    setName('');
    setError('');
    setSubmitting(false);
  }, [open]);

  const handleSubmit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('请输入分类名称');
      return;
    }
    if (!module) {
      setError('未指定适用模块，无法创建分类');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      // 追加到同模块末尾，避免覆盖已有排序
      const sortCode = await nextSortCode(module);
      const code = generateCategoryCode();
      const id = await categoryApi.add({
        parentId: '0',
        name: trimmed,
        code,
        module,
        status: 'ENABLE',
        sortCode,
      });
      // 拉取详情回传给调用方；详情不可用时用提交值兜底，保证 code 可用
      let created: BizCategory | null = null;
      try {
        created = await categoryApi.detail(id);
      } catch {
        created = null;
      }
      onCreated?.(
        created ?? {
          id,
          name: trimmed,
          code,
          module,
          status: 'ENABLE',
          sortCode,
        }
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建分类失败');
    } finally {
      setSubmitting(false);
    }
  }, [module, name, onClose, onCreated]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-[#E5E5EA] overflow-hidden">
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-[#F2F2F7]">
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-[#1D1D1F] flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4 text-[#0071E3]" />
              {title}
            </h3>
            <p className="mt-0.5 text-[11px] text-[#86868B]">
              适用模块：{categoryModuleLabel(module)}（{module || '-'}）
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1 rounded-lg text-[#86868B] hover:bg-[#F5F5F7] disabled:opacity-40"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5" htmlFor="quick-cat-name">
            分类名称 <span className="text-[#CF1322]">*</span>
          </label>
          <input
            id="quick-cat-name"
            autoFocus
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleSubmit();
            }}
            disabled={submitting}
            placeholder="例如：风景素材"
            className="w-full h-10 px-3 rounded-xl border border-[#D2D2D7] bg-white text-[13px] text-[#1D1D1F] outline-none focus:border-[#0071E3] disabled:bg-[#F5F5F7]"
          />
          {hint && <p className="mt-2 text-[11px] text-[#86868B]">{hint}</p>}
          {error && (
            <p className="mt-2 flex items-center gap-1 text-[12px] text-[#CF1322]">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 bg-[#FAFAFC] border-t border-[#F2F2F7]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="h-9 px-4 rounded-xl border border-[#D2D2D7] text-[13px] text-[#1D1D1F] hover:bg-white disabled:opacity-40"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="h-9 px-4 rounded-xl bg-[#0071E3] text-white text-[13px] font-medium hover:bg-[#0077ED] disabled:opacity-50 flex items-center gap-1.5"
          >
            {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            创建
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuickCreateCategory;
