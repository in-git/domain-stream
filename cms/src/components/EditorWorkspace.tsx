import { useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  BatteryFull,
  Eye,
  EyeOff,
  Monitor,
  Smartphone,
  Tablet,
  Wifi,
} from 'lucide-react';
import {
  DevicePreview,
  SCREEN_PRESETS,
  ScreenPresetPicker,
  presetScreenSize,
  type ScreenPreset,
} from './DevicePreview.tsx';

export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

/** 通用设备模拟器的默认屏幕：沿用原先的桌面预览 */
const DEFAULT_PREVIEW_PRESET =
  SCREEN_PRESETS.find((preset) => preset.id === 'desktop-1440') ?? SCREEN_PRESETS[0];

/** 按模拟屏幕宽度决定预览用哪套排版（对应客户端 768 / 1024 断点） */
function previewDeviceOf(screenWidth: number): PreviewDevice {
  if (screenWidth < 768) return 'mobile';
  if (screenWidth < 1024) return 'tablet';
  return 'desktop';
}

const DEVICES: Array<{
  key: PreviewDevice;
  label: string;
  width: string;
  hint: string;
  icon: typeof Monitor;
}> = [
  { key: 'desktop', label: '桌面', width: '100%', hint: '桌面浏览器 · 自适应宽度', icon: Monitor },
  { key: 'tablet', label: '平板', width: '768px', hint: 'iPad · 768px', icon: Tablet },
  { key: 'mobile', label: '手机', width: '390px', hint: 'iPhone · 390px', icon: Smartphone },
];

/** 设备状态栏（手机/平板顶部）：时间 + 信号/WiFi/电池 */
function DeviceStatusBar({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between shrink-0 bg-white ${
        compact ? 'h-11 px-6 pt-1.5' : 'h-9 px-7'
      } text-[#1D1D1F]`}
    >
      <span className={`font-semibold tabular-nums ${compact ? 'text-[13px]' : 'text-[12px]'}`}>
        9:41
      </span>
      <div className="flex items-center gap-1.5">
        {/* 信号格 */}
        <span className="flex items-end gap-[2px] h-3.5">
          <i className="w-[3px] h-[5px] rounded-[1px] bg-current block" />
          <i className="w-[3px] h-[7px] rounded-[1px] bg-current block" />
          <i className="w-[3px] h-[10px] rounded-[1px] bg-current block" />
          <i className="w-[3px] h-[13px] rounded-[1px] bg-current block" />
        </span>
        <Wifi className={compact ? 'w-4 h-4' : 'w-3.5 h-3.5'} strokeWidth={2.4} />
        <BatteryFull className={compact ? 'w-[19px] h-[19px]' : 'w-[17px] h-[17px]'} strokeWidth={2.2} />
      </div>
    </div>
  );
}

/** 真机外壳：桌面为浏览器窗口，平板/手机为带边框、刘海与 Home 条的设备 */
function DeviceFrame({
  device,
  children,
}: {
  device: PreviewDevice;
  children: ReactNode;
}) {
  if (device === 'desktop') {
    return (
      <div className="w-full h-full flex flex-col rounded-xl overflow-hidden border border-[#D2D2D7] bg-white shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
        {/* 浏览器标签栏 */}
        <div className="h-9 shrink-0 flex items-center gap-2 px-3 bg-[#F5F5F7] border-b border-[#E5E5EA]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
          </div>
          <div className="flex-1 max-w-[320px] mx-auto h-6 rounded-md bg-white border border-[#E5E5EA] flex items-center justify-center gap-1 text-[10px] text-[#8E8E93]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#34C759]" />
            domain-stream.cn
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
      </div>
    );
  }

  if (device === 'tablet') {
    return (
      <div className="w-full h-full rounded-[30px] bg-[#2C2C2E] p-[10px] shadow-[0_14px_40px_rgba(0,0,0,0.22)]">
        <div className="w-full h-full flex flex-col rounded-[22px] overflow-hidden bg-white relative">
          {/* 前置摄像头 */}
          <span className="absolute top-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#3A3A3C] z-10" />
          <DeviceStatusBar />
          <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
        </div>
      </div>
    );
  }

  // 手机：灵动岛 + 状态栏 + 底部 Home 指示条
  return (
    <div className="w-full h-full rounded-[46px] bg-[#1D1D1F] p-[11px] shadow-[0_18px_48px_rgba(0,0,0,0.28)]">
      <div className="w-full h-full flex flex-col rounded-[36px] overflow-hidden bg-white relative">
        {/* 灵动岛 */}
        <span className="absolute top-2 left-1/2 -translate-x-1/2 w-[92px] h-[26px] rounded-full bg-[#1D1D1F] z-10" />
        <DeviceStatusBar compact />
        <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
        {/* Home 指示条 */}
        <div className="h-6 shrink-0 flex items-start justify-center bg-white">
          <span className="w-[110px] h-[5px] rounded-full bg-[#1D1D1F]/80" />
        </div>
      </div>
    </div>
  );
}

interface EditorWorkspaceProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  actions: ReactNode;
  editor: ReactNode;
  preview: (device: PreviewDevice) => ReactNode;
  /** 可选信息栏：提供后由两栏变为「信息 / 正文 / 预览」三栏布局 */
  info?: ReactNode;
  /** 预览开关（可选受控）：外部传入时由外部控制，如视频上传成功后自动打开 */
  previewOpen?: boolean;
  onPreviewOpenChange?: (open: boolean) => void;
  /** 用通用设备模拟器（真机外框 + 屏幕预设）替代内置的桌面/平板/手机三档预览 */
  deviceSimulator?: boolean;
}

/** 全宽编辑工作区：默认左侧编辑 + 右侧实时预览；提供 info 时为三栏 */
export function EditorWorkspace({
  title,
  subtitle,
  onBack,
  actions,
  editor,
  preview,
  info,
  previewOpen,
  onPreviewOpenChange,
  deviceSimulator = false,
}: EditorWorkspaceProps) {
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  /** 通用设备模拟器的屏幕与朝向 */
  const [preset, setPreset] = useState<ScreenPreset>(DEFAULT_PREVIEW_PRESET);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  // 默认打开预览窗口，编辑时即时看到效果
  const [internalShowPreview, setInternalShowPreview] = useState(true);
  // 受控优先：外部传 previewOpen 时由外部决定，否则用内部 state
  const showPreview = previewOpen ?? internalShowPreview;
  const setPreviewOpen = (open: boolean) => {
    if (previewOpen === undefined) setInternalShowPreview(open);
    onPreviewOpenChange?.(open);
  };
  const current = DEVICES.find((d) => d.key === device) || DEVICES[0];
  const simulatorDevice = previewDeviceOf(presetScreenSize(preset, orientation).width);
  const hasInfo = info !== undefined && info !== null;

  return (
    <div className="w-full h-full min-h-0 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white border border-[#E5E5EA] text-[13px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            返回列表
          </button>
          <div className="min-w-0">
            <h1 className="text-[21px] font-semibold tracking-tight text-[#1D1D1F] truncate">
              {title}
            </h1>
            {subtitle && <p className="text-[12px] text-[#6E6E73] mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">{actions}</div>
      </div>

      <div
        className={`grid grid-cols-1 gap-4 flex-1 min-h-0 items-stretch ${
          hasInfo
            ? showPreview
              ? 'lg:grid-cols-[minmax(210px,260px)_minmax(0,1fr)] xl:grid-cols-[minmax(210px,250px)_minmax(0,1.05fr)_minmax(0,1fr)]'
              : 'lg:grid-cols-[minmax(210px,260px)_minmax(0,1fr)]'
            : showPreview
              ? 'xl:grid-cols-2'
              : 'grid-cols-1'
        }`}
      >
        {/* 可选左栏：编辑信息，从上往下排列 */}
        {hasInfo && (
          <section className="bg-white rounded-[18px] border border-[#E5E5EA] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col min-h-0 lg:h-full">
            <div className="px-5 py-3 border-b border-[#F2F2F7] shrink-0">
              <span className="text-[13px] font-semibold text-[#1D1D1F]">文章信息</span>
            </div>
            <div className="p-5 flex-1 min-h-0 overflow-y-auto">{info}</div>
          </section>
        )}

        {/* 中间：正文编辑视图 */}
        <section className="bg-white rounded-[18px] border border-[#E5E5EA] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col min-h-0 lg:h-full">
          <div className="px-5 sm:px-6 py-3 border-b border-[#F2F2F7] flex items-center justify-between gap-2 shrink-0">
            <span className="text-[13px] font-semibold text-[#1D1D1F]">正文内容</span>
            <button
              type="button"
              onClick={() => setPreviewOpen(!showPreview)}
              title={showPreview ? '关闭预览窗口' : '打开预览窗口'}
              aria-pressed={showPreview}
              className={`h-7 px-2.5 rounded-[9px] inline-flex items-center gap-1.5 text-[12px] font-medium transition-colors ${
                showPreview
                  ? 'bg-[#0071E3]/10 text-[#0071E3]'
                  : 'bg-[#F5F5F7] text-[#6E6E73] hover:bg-[#E5E5EA] hover:text-[#1D1D1F]'
              }`}
            >
              {showPreview ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{showPreview ? '关闭预览' : '打开预览'}</span>
            </button>
          </div>
          <div className={`flex-1 min-h-0 ${hasInfo ? 'p-4 overflow-hidden' : 'p-5 sm:p-6 overflow-y-auto'}`}>
            {editor}
          </div>
        </section>

        {/* 右侧：预览窗口（受中间栏开关控制，默认关闭） */}
        {showPreview && (
        <section className="bg-white rounded-[18px] border border-[#E5E5EA] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)] flex flex-col min-h-0 lg:h-full">
          <div className="px-5 sm:px-6 py-3 border-b border-[#F2F2F7] flex flex-wrap items-center justify-between gap-2 shrink-0">
            <span className="text-[13px] font-semibold text-[#1D1D1F]">实时预览</span>
            {deviceSimulator ? (
              <ScreenPresetPicker
                value={preset}
                onChange={setPreset}
                orientation={orientation}
                onOrientationChange={setOrientation}
                className="w-[240px] max-w-full shrink-0"
              />
            ) : (
              <div className="flex items-center p-0.5 bg-[#F2F2F7] rounded-[10px]">
                {DEVICES.map((item) => {
                  const Icon = item.icon;
                  const active = device === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setDevice(item.key)}
                      title={`${item.label}预览`}
                      className={`h-7 px-2.5 rounded-[8px] inline-flex items-center gap-1.5 text-[12px] font-medium transition-all ${
                        active ? 'bg-white text-[#1D1D1F] shadow-xs' : 'text-[#6E6E73]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {deviceSimulator ? (
            <div className="flex-1 min-h-0 overflow-hidden bg-[#EFEFF2] p-3">
              <DevicePreview
                preset={preset}
                orientation={orientation}
                padding={12}
                url="domain-stream.cn"
              >
                <div className="h-full overflow-y-auto bg-white">{preview(simulatorDevice)}</div>
              </DevicePreview>
            </div>
          ) : (
            <div className="p-4 bg-[#EFEFF2] flex-1 min-h-0 flex flex-col items-center gap-3 overflow-hidden">
              <div
                className="transition-[width] duration-200 flex-1 min-h-0"
                style={{ width: current.width, maxWidth: '100%' }}
              >
                <DeviceFrame device={device}>{preview(device)}</DeviceFrame>
              </div>
              <div className="text-center text-[11px] text-[#86868B] tabular-nums shrink-0">
                {current.hint}
              </div>
            </div>
          )}
        </section>
        )}
      </div>
    </div>
  );
}
