import { useState, type ReactNode } from 'react';
import { ArrowLeft, Monitor, Smartphone, Tablet } from 'lucide-react';

export type PreviewDevice = 'desktop' | 'tablet' | 'mobile';

const DEVICES: Array<{
  key: PreviewDevice;
  label: string;
  width: string;
  icon: typeof Monitor;
}> = [
  { key: 'desktop', label: '桌面', width: '100%', icon: Monitor },
  { key: 'tablet', label: '平板', width: '768px', icon: Tablet },
  { key: 'mobile', label: '手机', width: '390px', icon: Smartphone },
];

interface EditorWorkspaceProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  actions: ReactNode;
  editor: ReactNode;
  preview: (device: PreviewDevice) => ReactNode;
}

/** 全宽编辑工作区：左侧编辑，右侧按设备尺寸实时预览 */
export function EditorWorkspace({
  title,
  subtitle,
  onBack,
  actions,
  editor,
  preview,
}: EditorWorkspaceProps) {
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const current = DEVICES.find((d) => d.key === device) || DEVICES[0];

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        {/* 左侧：编辑视图 */}
        <section className="bg-white rounded-[18px] border border-[#E5E5EA] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          <div className="px-5 sm:px-6 py-3 border-b border-[#F2F2F7] flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-[#1D1D1F]">编辑内容</span>
            <span className="text-[11px] text-[#86868B] hidden sm:inline">
              左侧编辑，右侧实时预览
            </span>
          </div>
          <div className="p-5 sm:p-6 max-h-[calc(100vh-224px)] overflow-y-auto">
            {editor}
          </div>
        </section>

        {/* 右侧：预览窗口 */}
        <section className="bg-white rounded-[18px] border border-[#E5E5EA] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)] xl:sticky xl:top-[80px]">
          <div className="px-5 sm:px-6 py-3 border-b border-[#F2F2F7] flex flex-wrap items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-[#1D1D1F]">实时预览</span>
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
          </div>

          <div className="p-4 bg-[#F5F5F7] overflow-x-auto">
            <div
              className="mx-auto overflow-hidden rounded-xl border border-[#E5E5EA] bg-white shadow-sm transition-[width] duration-200"
              style={{ width: current.width }}
            >
              <div className="max-h-[calc(100vh-268px)] min-h-[520px] overflow-y-auto">
                {preview(device)}
              </div>
            </div>
            <div className="mt-2 text-center text-[11px] text-[#86868B] tabular-nums">
              {current.label} · {current.width === '100%' ? '自适应宽度' : current.width}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
