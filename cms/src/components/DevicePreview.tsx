/**
 * 设备屏幕模拟
 * ------------------------------------------------------------------
 * 手机 / 平板用 devicekit 的 <device-frame> 绘制机身、状态栏与安全区，内容按
 * 设备真实 CSS 视口尺寸渲染；桌面 / 笔记本用自绘的浏览器窗口。整块外框随后
 * 等比缩放到容器内，只缩小不放大，所以任何面板高度下都能完整显示。
 *
 * 用法：把要预览的页面放进 <DevicePreview>，用 <ScreenPresetPicker> 换屏幕。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { RectangleHorizontal, RectangleVertical } from 'lucide-react';
import { Header, ListBox, Select } from '@heroui/react';
import { DeviceFrame } from '@devicekit/frame/react';
import { DEVICE_NAMES, findDevice, type Orientation } from '@devicekit/devices';
import { frameOuterSize } from '@devicekit/frame';

/** 浏览器窗口顶部工具栏高度（CSS px），计入外框总高 */
const WINDOW_CHROME = 32;

export type ScreenPreset =
  | {
      kind: 'device';
      id: string;
      label: string;
      group: string;
      /** devicekit 机型名，例如 DEVICE_NAMES.iPhone_17 */
      device: string;
    }
  | {
      kind: 'window';
      id: string;
      label: string;
      group: string;
      /** 窗口内容区尺寸（CSS px），不含工具栏 */
      width: number;
      height: number;
    };

/** 可选屏幕：手机 / 平板用真机尺寸，桌面用常见浏览器窗口尺寸 */
export const SCREEN_PRESETS: ScreenPreset[] = [
  { kind: 'device', id: 'iphone-17', label: 'iPhone 17', group: '手机', device: DEVICE_NAMES.iPhone_17 },
  { kind: 'device', id: 'iphone-se', label: 'iPhone SE', group: '手机', device: DEVICE_NAMES.iPhone_SE_3rd_gen },
  { kind: 'device', id: 'pixel-10', label: 'Pixel 10', group: '手机', device: DEVICE_NAMES.Pixel_10 },
  { kind: 'device', id: 'galaxy-s24', label: 'Galaxy S24', group: '手机', device: DEVICE_NAMES.Galaxy_S24 },
  { kind: 'device', id: 'ipad-mini', label: 'iPad mini', group: '平板', device: DEVICE_NAMES.iPad_Mini },
  { kind: 'device', id: 'ipad-pro-13', label: 'iPad Pro 13', group: '平板', device: DEVICE_NAMES.iPad_Pro_13 },
  { kind: 'device', id: 'galaxy-tab-s9', label: 'Galaxy Tab S9', group: '平板', device: DEVICE_NAMES.Galaxy_Tab_S9 },
  { kind: 'window', id: 'laptop-1280', label: '笔记本 1280 × 800', group: '桌面', width: 1280, height: 800 },
  { kind: 'window', id: 'desktop-1440', label: '桌面 1440 × 900', group: '桌面', width: 1440, height: 900 },
  { kind: 'window', id: 'desktop-1920', label: '桌面 1920 × 1080', group: '桌面', width: 1920, height: 1080 },
];

/** 未缩放外框尺寸：机型取真实机身尺寸，窗口取内容区加工具栏 */
function presetSize(preset: ScreenPreset, orientation: Orientation) {
  if (preset.kind === 'window') {
    return { width: preset.width, height: preset.height + WINDOW_CHROME };
  }
  const profile = findDevice(preset.device);
  if (!profile) return { width: 402, height: 874 };
  return frameOuterSize(profile, orientation);
}

/** 屏幕本身的 CSS 尺寸（不含机身 / 窗口工具栏），用于按屏宽决定字号等 */
export function presetScreenSize(preset: ScreenPreset, orientation: Orientation) {
  if (preset.kind === 'window') {
    return { width: preset.width, height: preset.height };
  }
  const profile = findDevice(preset.device);
  const screen = profile?.screen;
  if (!screen) {
    return orientation === 'landscape' ? { width: 874, height: 402 } : { width: 402, height: 874 };
  }
  return orientation === 'landscape'
    ? { width: screen.height, height: screen.width }
    : { width: screen.width, height: screen.height };
}

/** 量容器、算出能完整放下外框的缩放比（上限 1:1） */
function useFitScale(contentWidth: number, contentHeight: number, padding: number) {
  const [scale, setScale] = useState(0);
  const observerRef = useRef<ResizeObserver | null>(null);

  // 用回调 ref：弹窗只在打开时挂载容器，对象 ref 会错过第一次测量
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!node) return;

      const measure = () => {
        const width = node.clientWidth - padding * 2;
        const height = node.clientHeight - padding * 2;
        if (width <= 0 || height <= 0) return;
        setScale(Math.min(width / contentWidth, height / contentHeight, 1));
      };

      measure();
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(measure);
      observer.observe(node);
      observerRef.current = observer;
    },
    [contentWidth, contentHeight, padding],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return { ref, scale };
}

/** 桌面 / 笔记本：自绘的浏览器窗口，地址栏借用网页标题 */
function BrowserWindow({
  preset,
  url,
  children,
}: {
  preset: Extract<ScreenPreset, { kind: 'window' }>;
  url?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-xl border border-[#D2D2D7] bg-white shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
      style={{ width: preset.width, height: preset.height + WINDOW_CHROME }}
    >
      <div className="flex h-8 shrink-0 items-center gap-1.5 border-b border-[#E5E5EA] bg-[#F5F5F7] px-3">
        <span className="h-2 w-2 rounded-full bg-[#FF5F57]" />
        <span className="h-2 w-2 rounded-full bg-[#FEBC2E]" />
        <span className="h-2 w-2 rounded-full bg-[#28C840]" />
        <span className="ml-2 min-w-0 flex-1 truncate rounded-md bg-white px-2 py-[3px] text-[10px] text-[#86868B]">
          {url || 'localhost'}
        </span>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden bg-black">{children}</div>
    </div>
  );
}

export interface DevicePreviewProps {
  preset: ScreenPreset;
  /** 仅手机 / 平板生效，窗口固定为横向 */
  orientation?: Orientation;
  /** 外框与容器边缘的留白 */
  padding?: number;
  /** 窗口地址栏里显示的文本 */
  url?: string;
  className?: string;
  children: ReactNode;
}

/** 把内容放进对应屏幕外框，并等比缩放到父容器 */
export function DevicePreview({
  preset,
  orientation = 'portrait',
  padding = 20,
  url,
  className,
  children,
}: DevicePreviewProps) {
  const size = presetSize(preset, orientation);
  const { ref, scale } = useFitScale(size.width, size.height, padding);

  return (
    <div
      ref={ref}
      className={`relative flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden ${
        className ?? ''
      }`}
    >
      <div
        className={scale > 0 ? 'relative shrink-0' : 'relative shrink-0 invisible'}
        style={{
          width: Math.round(size.width * scale),
          height: Math.round(size.height * scale),
        }}
      >
        <div
          style={{
            width: size.width,
            height: size.height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {preset.kind === 'device' ? (
            <DeviceFrame
              device={preset.device}
              orientation={orientation}
              immersive
              statusBar="9:41"
              statusBarTextStyle="white"
              statusBarBackground="rgba(0, 0, 0, 0.28)"
            >
              {children}
            </DeviceFrame>
          ) : (
            <BrowserWindow preset={preset} url={url}>
              {children}
            </BrowserWindow>
          )}
        </div>
      </div>
    </div>
  );
}

export interface ScreenPresetPickerProps {
  value: ScreenPreset;
  onChange: (preset: ScreenPreset) => void;
  orientation?: Orientation;
  onOrientationChange?: (orientation: Orientation) => void;
  /** 下拉展开状态，外层弹窗可据此让 Esc 先交给下拉处理 */
  onOpenChange?: (open: boolean) => void;
  /** 可选屏幕列表，默认全部；传入后只展示这些预设 */
  presets?: ScreenPreset[];
  className?: string;
}

/** 屏幕选择：按手机 / 平板 / 桌面分组，机型可切横竖屏 */
export function ScreenPresetPicker({
  value,
  onChange,
  orientation = 'portrait',
  onOrientationChange,
  onOpenChange,
  presets = SCREEN_PRESETS,
  className,
}: ScreenPresetPickerProps) {
  const groups = useMemo(() => {
    const map = new Map<string, ScreenPreset[]>();
    for (const preset of presets) {
      const list = map.get(preset.group);
      if (list) list.push(preset);
      else map.set(preset.group, [preset]);
    }
    return Array.from(map.entries());
  }, [presets]);

  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <div className="min-w-0 flex-1">
        <Select
          aria-label="模拟屏幕"
          fullWidth
          selectedKey={value.id}
          onOpenChange={onOpenChange}
          onSelectionChange={(key) => {
            const next = SCREEN_PRESETS.find((preset) => preset.id === key);
            if (next) onChange(next);
          }}
        >
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {groups.map(([group, presets]) => (
                <ListBox.Section key={group} id={group}>
                  <Header>{group}</Header>
                  {presets.map((preset) => (
                    <ListBox.Item key={preset.id} id={preset.id} textValue={preset.label}>
                      {preset.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox.Section>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
      </div>

      {value.kind === 'device' && onOrientationChange && (
        <div className="grid shrink-0 grid-cols-2 gap-0.5 rounded-lg bg-[#EDEDF1] p-0.5">
          {([
            { value: 'portrait' as const, label: '竖屏', icon: RectangleVertical },
            { value: 'landscape' as const, label: '横屏', icon: RectangleHorizontal },
          ]).map((item) => {
            const Icon = item.icon;
            const active = orientation === item.value;
            return (
              <button
                key={item.value}
                type="button"
                aria-label={item.label}
                title={item.label}
                onClick={() => onOrientationChange(item.value)}
                className={`flex h-7 w-8 items-center justify-center rounded-md transition-colors ${
                  active ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default DevicePreview;
