/**
 * 画布属性面板用的紧凑取色器
 * ------------------------------------------------------------------
 * 点色板展开 react-colorful 的取色盘，选色时实时写回。
 * 文本颜色、进度条轨道色 / 填充色共用同一个控件，保证交互一致。
 */
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';

interface ColorFieldProps {
  color: string;
  onChange: (value: string) => void;
}

export function ColorField({ color, onChange }: ColorFieldProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex h-8 items-center gap-2 rounded-lg border border-[#D2D2D7] bg-white px-2 text-[11px] transition-colors hover:border-[#0071E3]"
      >
        <span
          className="h-4 w-4 shrink-0 rounded-full border border-black/10"
          style={{ backgroundColor: color }}
        />
        <span className="font-mono tabular-nums text-[#6E6E73]">{color.toUpperCase()}</span>
        <ChevronDown
          className={`ml-auto h-3.5 w-3.5 text-[#86868B] transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="rounded-xl border border-[#E5E5EA] bg-white p-2">
          <HexColorPicker color={color} onChange={onChange} style={{ width: '100%', height: 150 }} />
        </div>
      )}
    </div>
  );
}

export default ColorField;
