import { Plus, Trash2 } from 'lucide-react';
import {
  parseContactLinks,
  stringifyContactLinks,
  type ContactLink,
} from './schema';

interface ContactLinksEditorProps {
  value: string;
  onChange: (next: string) => void;
}

/** 客户端「关于」页底部联系方式的可增删编辑器 */
export function ContactLinksEditor({ value, onChange }: ContactLinksEditorProps) {
  const links = parseContactLinks(value);

  function commit(next: ContactLink[]) {
    onChange(stringifyContactLinks(next));
  }

  function update(index: number, patch: Partial<ContactLink>) {
    commit(links.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function remove(index: number) {
    commit(links.filter((_, i) => i !== index));
  }

  function add() {
    commit([...links, { label: '', url: '' }]);
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-[#86868B]">
        名称与地址均可编辑，新增后可随时删除；未填写完整的条目不会显示在客户端。
      </p>

      {links.map((item, index) => (
        <div
          key={index}
          className="rounded-xl border border-[#E5E5EA] bg-white p-3 space-y-2"
        >
          <div className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-center text-[11px] font-mono text-[#AEAEB2] tabular-nums">
              {index + 1}
            </span>
            <input
              value={item.label}
              onChange={(event) => update(index, { label: event.target.value.slice(0, 12) })}
              placeholder="名称，如：B 站"
              maxLength={12}
              aria-label={`第 ${index + 1} 项名称`}
              className="h-9 min-w-0 flex-1 px-2.5 rounded-lg border border-[#D2D2D7] bg-white text-[12px] text-[#1D1D1F] outline-none focus:border-[#0071E3]"
            />
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={`删除第 ${index + 1} 项联系方式`}
              title="删除"
              className="p-1.5 rounded-lg text-[#86868B] hover:bg-[#FFF1F0] hover:text-[#CF1322] shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="pl-7">
            <input
              value={item.url}
              onChange={(event) => update(index, { url: event.target.value })}
              placeholder="https://example.com"
              aria-label={`第 ${index + 1} 项地址`}
              className="w-full h-9 px-2.5 rounded-lg border border-[#D2D2D7] bg-white text-[12px] font-mono text-[#1D1D1F] outline-none focus:border-[#0071E3]"
            />
          </div>
        </div>
      ))}

      {links.length === 0 && (
        <p className="rounded-xl bg-[#FAFAFC] border border-dashed border-[#D2D2D7] px-3 py-6 text-center text-[12px] text-[#86868B]">
          暂无联系方式，点击下方按钮新增
        </p>
      )}

      <button
        type="button"
        onClick={add}
        className="h-8 px-2.5 rounded-lg bg-[#F5F5F7] text-[12px] text-[#1D1D1F] hover:bg-[#EBEBF0] inline-flex items-center gap-1"
      >
        <Plus className="w-3.5 h-3.5" />
        新增联系方式
      </button>
    </div>
  );
}

export default ContactLinksEditor;
