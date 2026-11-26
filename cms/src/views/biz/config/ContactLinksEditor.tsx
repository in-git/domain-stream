/**
 * 客户端「关于」页底部联系方式编辑器
 * ------------------------------------------------------------------
 * 以列表形式展示已配置项，新增/编辑统一走弹窗；
 * 值以 JSON 数组字符串存进 CLIENT_CONFIG 的 contactLinks 字段。
 */
import { useEffect, useRef, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  parseContactLinks,
  stringifyContactLinks,
  type ContactLink,
} from './schema';

interface ContactLinksEditorProps {
  value: string;
  onChange: (next: string) => void;
}

const LABEL_MAX_LENGTH = 12;

/* ------------------------------------------------------------------ */
/* 编辑弹窗                                                            */
/* ------------------------------------------------------------------ */

interface ContactLinkDialogProps {
  open: boolean;
  /** 编辑已有项时的初始值；新增时为空白 */
  initial: ContactLink;
  title: string;
  onClose: () => void;
  onConfirm: (next: ContactLink) => void;
}

/** 名称 + 地址的编辑弹窗 */
function ContactLinkDialog({ open, initial, title, onClose, onConfirm }: ContactLinkDialogProps) {
  const [label, setLabel] = useState(initial.label);
  const [url, setUrl] = useState(initial.url);
  const [error, setError] = useState('');
  const labelRef = useRef<HTMLInputElement>(null);

  // 每次打开都按初始值重置，避免残留上一次的编辑内容
  useEffect(() => {
    if (!open) return;
    setLabel(initial.label.slice(0, LABEL_MAX_LENGTH));
    setUrl(initial.url);
    setError('');
    const timer = window.setTimeout(() => {
      labelRef.current?.focus();
      labelRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
    // 仅在打开瞬间同步
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  function handleConfirm() {
    const nextLabel = label.trim();
    const nextUrl = url.trim();
    if (!nextLabel) {
      setError('请输入名称');
      return;
    }
    if (!nextUrl) {
      setError('请输入地址');
      return;
    }
    onConfirm({ label: nextLabel.slice(0, LABEL_MAX_LENGTH), url: nextUrl });
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E5E5EA] overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5EA]">
          <h3 className="text-[16px] font-semibold text-[#1D1D1F]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#86868B] hover:bg-[#F5F5F7]"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <label className="block">
            <span className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-medium text-[#1D1D1F]">名称</span>
              <span className="text-[11px] text-[#86868B] tabular-nums">
                {label.length}/{LABEL_MAX_LENGTH}
              </span>
            </span>
            <input
              ref={labelRef}
              value={label}
              onChange={(event) => {
                setLabel(event.target.value.slice(0, LABEL_MAX_LENGTH));
                setError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleConfirm();
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  onClose();
                }
              }}
              maxLength={LABEL_MAX_LENGTH}
              placeholder="如：B 站"
              className="w-full h-10 px-3 rounded-xl border border-[#D2D2D7] bg-white text-[13px] text-[#1D1D1F] outline-none focus:border-[#0071E3]"
            />
          </label>

          <label className="block">
            <span className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">地址</span>
            <input
              value={url}
              onChange={(event) => {
                setUrl(event.target.value);
                setError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleConfirm();
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  onClose();
                }
              }}
              placeholder="https://example.com"
              className="w-full h-10 px-3 rounded-xl border border-[#D2D2D7] bg-white text-[13px] font-mono text-[#1D1D1F] outline-none focus:border-[#0071E3]"
            />
            <span className="mt-1 block text-[11px] text-[#86868B]">
              名称与地址均填写后才会显示在客户端
            </span>
          </label>

          {error && (
            <div className="px-3 py-2 rounded-xl bg-[#FFF1F0] border border-[#FFCCC7] text-[12px] text-[#CF1322]">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[#E5E5EA] bg-[#FAFAFC]">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-xl border border-[#D2D2D7] text-[13px] text-[#1D1D1F] hover:bg-white"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="h-9 px-4 rounded-xl bg-[#0071E3] text-white text-[13px] font-medium hover:bg-[#0077ED]"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 编辑器                                                              */
/* ------------------------------------------------------------------ */

/** 客户端「关于」页联系方式的可增删编辑器：列表展示，点编辑弹窗修改 */
export function ContactLinksEditor({ value, onChange }: ContactLinksEditorProps) {
  const links = parseContactLinks(value);
  /** 弹窗状态：editingIndex 为 null 表示新增 */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draftItem, setDraftItem] = useState<ContactLink | null>(null);

  function commit(next: ContactLink[]) {
    onChange(stringifyContactLinks(next));
  }

  /** 打开新增弹窗 */
  function openCreate() {
    setEditingIndex(null);
    setDraftItem({ label: '', url: '' });
    setDialogOpen(true);
  }

  /** 打开编辑弹窗 */
  function openEdit(index: number) {
    setEditingIndex(index);
    setDraftItem(links[index]);
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setDraftItem(null);
    setEditingIndex(null);
  }

  /** 弹窗确定：新增追加到末尾，编辑原地替换 */
  function handleDialogConfirm(next: ContactLink) {
    if (editingIndex === null) {
      commit([...links, next]);
    } else {
      commit(links.map((item, index) => (index === editingIndex ? next : item)));
    }
    closeDialog();
  }

  function remove(index: number) {
    commit(links.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
  

      {links.length > 0 ? (
        <div className="divide-y divide-[#F0F0F2] rounded-xl border border-[#E5E5EA] bg-white overflow-hidden">
          {links.map((item, index) => (
            <div key={index} className="group flex items-center gap-2 px-3 py-2.5">
              <span className="w-5 shrink-0 text-center text-[11px] font-mono text-[#AEAEB2] tabular-nums">
                {index + 1}
              </span>

              <button
                type="button"
                onClick={() => openEdit(index)}
                title="点击编辑"
                className="flex-1 min-w-0 text-left"
              >
                <span className="block truncate text-[13px] font-medium text-[#1D1D1F]">
                  {item.label || '（未填写名称）'}
                </span>
                <span className="mt-0.5 block truncate text-[11px] font-mono text-[#86868B]">
                  {item.url || '（未填写地址）'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => openEdit(index)}
                className="shrink-0 p-1.5 rounded-lg text-[#0071E3] bg-[#0071E3]/8 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                title="编辑联系方式"
                aria-label={`编辑「${item.label || `第 ${index + 1} 项`}」`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => remove(index)}
                className="p-1.5 rounded-lg text-[#86868B] hover:bg-[#FFF1F0] hover:text-[#CF1322] shrink-0"
                title="删除"
                aria-label={`删除第 ${index + 1} 项联系方式`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-xl bg-[#FAFAFC] border border-dashed border-[#D2D2D7] px-3 py-6 text-center text-[12px] text-[#86868B]">
          暂无联系方式，点击上方「新增联系方式」添加
        </p>
      )}

      {draftItem && (
        <ContactLinkDialog
          open={dialogOpen}
          initial={draftItem}
          title={editingIndex === null ? '新增联系方式' : '编辑联系方式'}
          onClose={closeDialog}
          onConfirm={handleDialogConfirm}
        />
      )}
    </div>
  );
}

export default ContactLinksEditor;
