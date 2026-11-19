import { useState, type ReactNode } from 'react';
import { ArrowLeft, Eye, EyeOff, Monitor, Smartphone, Tablet } from 'lucide-react';

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
  /** 可选信息栏：提供后由两栏变为「信息 / 正文 / 预览」三栏布局 */
  info?: ReactNode;
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
}: EditorWorkspaceProps) {
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const [showPreview, setShowPreview] = useState(false);
  const current = DEVICES.find((d) => d.key === device) || DEVICES[0];
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
              onClick={() => setShowPreview((v) => !v)}
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

          <div className="p-4 bg-[#F5F5F7] flex-1 min-h-0 flex flex-col gap-2 overflow-x-auto">
            <div
              className="mx-auto overflow-hidden rounded-xl border border-[#E5E5EA] bg-white shadow-sm transition-[width] duration-200 flex-1 min-h-0 flex flex-col"
              style={{ width: current.width }}
            >
              <div className="flex-1 min-h-0 overflow-y-auto">
                {preview(device)}
              </div>
            </div>
            <div className="text-center text-[11px] text-[#86868B] tabular-nums shrink-0">
              {current.label} · {current.width === '100%' ? '自适应宽度' : current.width}
            </div>
          </div>
        </section>
        )}
      </div>
    </div>
  );
}
