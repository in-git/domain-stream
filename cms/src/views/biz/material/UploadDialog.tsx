/**
 * 素材上传模态框
 * ------------------------------------------------------------------
 * 流程：选择文件（仅暂存在浏览器）→ 选择分类 → 点击「保存」才真正上传
 * 分类来自通用分类中 MODULE = MATERIAL 且状态为启用的分类。
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  File as FileIcon,
  Film,
  Image as ImageIcon,
  ImagePlus,
  Loader2,
  Music,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { categoryApi, type BizCategory } from '../../../lib/category.ts';
import { isAudioFile, isImageFile, isVideoFile } from '../../../lib/fileCenter.ts';
import { SelectField } from '../../../components/SelectField.tsx';

export interface UploadSubmitPayload {
  files: File[];
  categoryCode: string;
}

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: UploadSubmitPayload, onProgress: (percent: number) => void) => Promise<void>;
  /** 打开时预填的文件（如页面拖拽进来的文件） */
  initialFiles?: File[];
}

function fileIcon(file: File) {
  if (file.type.startsWith('video/')) return Film;
  if (file.type.startsWith('audio/')) return Music;
  if (file.type.startsWith('image/')) return ImageIcon;
  return FileIcon;
}

function readableSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function UploadDialog({ open, onClose, onSubmit, initialFiles }: UploadDialogProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [categoryCode, setCategoryCode] = useState('');
  const [categories, setCategories] = useState<BizCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  /** 拉取素材模块的分类（逐页拉全量，避免大分页） */
  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const all: BizCategory[] = [];
      for (let current = 1; ; current++) {
        const result = await categoryApi.page({ current, size: 20 });
        const records = result?.records || [];
        all.push(...records);
        if (records.length < 20 || all.length >= (result?.total ?? all.length)) break;
        if (current >= 500) break;
      }
      const list = all.filter(
        (item) => item.module === 'MATERIAL' && (item.status || 'ENABLE') === 'ENABLE'
      );
      setCategories(list.sort((a, b) => (a.sortCode ?? 0) - (b.sortCode ?? 0)));
    } catch {
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadCategories();
    // 拖拽打开时预填文件
    if (initialFiles?.length) setFiles(initialFiles);
    // 仅在打开瞬间同步一次，避免父组件重渲染覆盖用户增删
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 关闭时重置
  useEffect(() => {
    if (open) return;
    setFiles([]);
    setCategoryCode('');
    setDragging(false);
    setError('');
    setPercent(0);
    setSubmitting(false);
    if (inputRef.current) inputRef.current.value = '';
  }, [open]);

  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  function appendFiles(list: FileList | File[] | null) {
    if (!list) return;
    const incoming = Array.from(list);
    if (!incoming.length) return;
    setError('');
    setFiles((prev) => {
      // 按 名称+大小+修改时间 去重，避免重复添加同一文件
      const keys = new Set(prev.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
      const merged = [...prev];
      for (const file of incoming) {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (!keys.has(key)) {
          keys.add(key);
          merged.push(file);
        }
      }
      return merged;
    });
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!files.length) {
      setError('请先选择要上传的文件');
      return;
    }
    if (!categoryCode) {
      setError('请选择分类');
      return;
    }
    setSubmitting(true);
    setPercent(0);
    setError('');
    try {
      await onSubmit({ files, categoryCode }, (value) => setPercent(value));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#E5E5EA] overflow-hidden flex flex-col max-h-[86vh]">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5EA]">
          <h3 className="text-[16px] font-semibold text-[#1D1D1F] flex items-center gap-2">
            <ImagePlus className="w-4 h-4 text-[#0071E3]" />
            上传素材
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-[#86868B] hover:bg-[#F5F5F7] disabled:opacity-40"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* 选择文件 */}
          <div>
            <label className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">
              选择文件 <span className="text-[#86868B] font-normal">（可多选）</span>
            </label>
            <div
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                appendFiles(event.dataTransfer.files);
              }}
              onClick={() => !submitting && inputRef.current?.click()}
              className={`flex flex-col items-center justify-center gap-2 py-7 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
                dragging
                  ? 'border-[#0071E3] bg-[#0071E3]/6'
                  : 'border-[#D2D2D7] bg-[#FAFAFC] hover:border-[#0071E3]/50'
              }`}
            >
              <UploadCloud className="w-7 h-7 text-[#0071E3]" strokeWidth={1.6} />
              <div className="text-[13px] text-[#1D1D1F]">点击选择或拖拽文件到此处</div>
              <div className="text-[11px] text-[#86868B]">支持图片、视频、音频与文档</div>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="hidden"
                disabled={submitting}
                onChange={(event) => {
                  appendFiles(event.target.files);
                  event.target.value = '';
                }}
              />
            </div>
          </div>

          {/* 已选文件列表 */}
          {files.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-medium text-[#1D1D1F]">
                  已选 {files.length} 个文件
                </span>
                <span className="text-[11px] text-[#86868B]">共 {readableSize(totalSize)}</span>
              </div>
              <div className="max-h-40 overflow-y-auto rounded-xl border border-[#E5E5EA] divide-y divide-[#F0F0F2]">
                {files.map((file, index) => {
                  const Icon = fileIcon(file);
                  return (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}`}
                      className="flex items-center gap-2.5 px-3 py-2"
                    >
                      <Icon className="w-4 h-4 text-[#0071E3] shrink-0" />
                      <span className="flex-1 text-[12px] text-[#1D1D1F] truncate" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-[11px] text-[#86868B] shrink-0">
                        {readableSize(file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        disabled={submitting}
                        className="p-1 rounded-md text-[#86868B] hover:bg-[#FFF1F0] hover:text-[#CF1322] disabled:opacity-40"
                        title="移除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 分类 */}
          <div>
            {loadingCategories ? (
              <>
                <span className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">
                  分类 <span className="text-[#CF1322]">*</span>
                </span>
                <div className="flex items-center gap-2 h-10 px-3 text-[12px] text-[#86868B]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  正在加载分类...
                </div>
              </>
            ) : categories.length === 0 ? (
              <>
                <span className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">
                  分类 <span className="text-[#CF1322]">*</span>
                </span>
                <div className="px-3 py-2.5 rounded-xl bg-[#FFF7E6] border border-[#FFE0A3] text-[12px] text-[#AD6800]">
                  暂无可用分类，请先在「通用分类」中创建 <b>素材</b> 模块的分类
                </div>
              </>
            ) : (
              <SelectField
                label={
                  <>
                    分类 <span className="text-[#CF1322]">*</span>
                  </>
                }
                value={categoryCode}
                onChange={setCategoryCode}
                isDisabled={submitting}
                options={[
                  { value: '', label: '请选择分类' },
                  ...categories.map((item) => ({ value: item.code || '', label: item.name || '未命名分类' })),
                ]}
              />
            )}
          </div>

          {error && (
            <div className="px-3 py-2 rounded-xl bg-[#FFF1F0] border border-[#FFCCC7] text-[12px] text-[#CF1322]">
              {error}
            </div>
          )}

          {submitting && (
            <div>
              <div className="flex items-center justify-between mb-1 text-[11px] text-[#0071E3]">
                <span>正在上传...</span>
                <span>{percent}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#E5E5EA] overflow-hidden">
                <div
                  className="h-full bg-[#0071E3] transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 底部 */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[#E5E5EA] bg-[#FAFAFC]">
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
            onClick={() => void handleSave()}
            disabled={submitting || !files.length || !categoryCode}
            className="h-9 px-4 rounded-xl bg-[#0071E3] text-white text-[13px] font-medium hover:bg-[#0077ED] disabled:opacity-40 flex items-center gap-1.5"
          >
            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            保存并上传
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadDialog;
