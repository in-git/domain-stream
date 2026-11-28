/**
 * 画布属性面板用的紧凑取色器
 * ------------------------------------------------------------------
 * 使用 HeroUI ColorPicker：色板 + 色相条 + 十六进制输入，选色时实时写回。
 * 文本颜色、进度条轨道色 / 填充色共用同一个控件，保证交互一致。
 */
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  ColorArea,
  ColorField as HeroColorField,
  ColorPicker,
  ColorSlider,
  Label,
} from '@heroui/react';
import { parseColor } from '@react-stately/color';

interface ColorFieldProps {
  color: string;
  onChange: (value: string) => void;
}

/** 取色提交节流间隔：拖动色板时避免每次移动都写回画布 */
const COLOR_THROTTLE_MS = 100;

/** 兜底解析：配置里只存 hex，非法值回退白色 */
function toColor(value: string) {
  try {
    return parseColor(value);
  } catch {
    return parseColor('#FFFFFF');
  }
}

export function ColorField({ color, onChange }: ColorFieldProps) {
  const external = color.toUpperCase();
  // 本地值保证色板跟手，提交给画布走节流
  const [value, setValue] = useState(external);
  const lastEmittedRef = useRef(external);
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastRunRef = useRef(0);

  // 外部颜色变化（撤销 / 重置）时同步，并丢弃尚未提交的拖动值
  useEffect(() => {
    if (external === lastEmittedRef.current) return;
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
    lastEmittedRef.current = external;
    setValue(external);
  }, [external]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    []
  );

  function flush() {
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending === null) return;
    lastRunRef.current = Date.now();
    lastEmittedRef.current = pending;
    onChange(pending);
  }

  /** 首次立即提交，之后最多每 100ms 一次，松手时补发最后一帧 */
  function emit(next: string) {
    pendingRef.current = next;
    const wait = COLOR_THROTTLE_MS - (Date.now() - lastRunRef.current);
    if (wait <= 0) {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      flush();
      return;
    }
    if (timerRef.current === null) {
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        flush();
      }, wait);
    }
  }

  return (
    <ColorPicker
      aria-label="选择颜色"
      value={toColor(value)}
      onChange={(next) => {
        const hex = next.toString('hex').toUpperCase();
        setValue(hex);
        emit(hex);
      }}
      className="w-full"
    >
      <ColorPicker.Trigger className="flex h-8 w-full items-center gap-2 rounded-lg border border-[#D2D2D7] bg-white px-2 text-[11px] transition-colors hover:border-[#0071E3]">
        <span
          className="h-4 w-4 shrink-0 rounded-full border border-black/10"
          style={{ backgroundColor: value }}
        />
        <span className="font-mono tabular-nums text-[#6E6E73]">{value}</span>
        <ChevronDown className="ml-auto h-3.5 w-3.5 text-[#86868B]" />
      </ColorPicker.Trigger>
      <ColorPicker.Popover
        placement="bottom left"
        className="dark w-[232px] rounded-xl border border-white/10 bg-[#1C1C1E] p-3 shadow-2xl"
      >
        <ColorArea
          aria-label="饱和度与亮度"
          colorSpace="hsb"
          xChannel="saturation"
          yChannel="brightness"
          className="h-32 w-full rounded-lg"
        >
          <ColorArea.Thumb />
        </ColorArea>
        <ColorSlider aria-label="色相" channel="hue" colorSpace="hsb" className="mt-3">
          <ColorSlider.Track>
            <ColorSlider.Thumb />
          </ColorSlider.Track>
        </ColorSlider>
        <HeroColorField aria-label="十六进制颜色" className="mt-3">
          <Label className="!text-[11px] !font-normal !text-white/55">十六进制</Label>
          <HeroColorField.Group className="mt-1">
            <HeroColorField.Input className="font-mono" />
          </HeroColorField.Group>
        </HeroColorField>
      </ColorPicker.Popover>
    </ColorPicker>
  );
}

export default ColorField;
