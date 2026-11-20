/**
 * 客户端配置实时预览
 * ------------------------------------------------------------------
 * 右侧窗口按当前表单值直接渲染效果。
 * 新增属性时在这里加对应的预览区块即可。
 */
import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Eye, FileJson, Globe2 } from 'lucide-react';
import icpIcon from '../../../assets/icp-icon.svg';
import policeIcon from '../../../assets/police-icon.svg';
import { draftToJson } from './schema';

interface PreviewPanelProps {
  values: Record<string, string>;
}

/** 配置里存的是纯后端路径，CMS 预览时补回 /snowy 代理前缀 */
function previewUrl(raw: string): string {
  if (!raw || raw.startsWith('/snowy') || raw.startsWith('http')) return raw;
  return `/snowy${raw}`;
}

export function PreviewPanel({ values }: PreviewPanelProps) {
  const [showJson, setShowJson] = useState(false);
  const title = values.title || '（未设置标题）';
  const logoUrl = previewUrl((values.logoUrl || '').trim());
  const icpNo = (values.icpNo || '').trim();
  const policeNo = (values.policeNo || '').trim();
  const json = useMemo(() => draftToJson(values), [values]);

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#E5E5EA] bg-[#FAFAFC]">
        <Eye className="w-4 h-4 text-[#0071E3]" />
        <span className="text-[13px] font-medium text-[#1D1D1F]">属性修改预览</span>
        <span className="ml-auto text-[11px] text-[#86868B]">实时更新</span>
      </div>

      <div className="p-4">
        {/* 模拟浏览器窗口 */}
        <div className="rounded-xl border border-[#D2D2D7] overflow-hidden bg-white">
          <div className="flex items-center gap-2 px-3 py-2 bg-[#F5F5F7] border-b border-[#E5E5EA]">
            <span className="flex gap-1.5">
              <i className="w-2 h-2 rounded-full bg-[#FF5F57]" />
              <i className="w-2 h-2 rounded-full bg-[#FEBC2E]" />
              <i className="w-2 h-2 rounded-full bg-[#28C840]" />
            </span>
            <div className="flex-1 flex items-center justify-center">
              <span className="px-3 py-0.5 rounded-md bg-white border border-[#E5E5EA] text-[10px] text-[#86868B] truncate max-w-[180px]">
                {title}
              </span>
            </div>
          </div>

          {/* 站点预览区 */}
          <div className="p-5" style={{ borderTop: '3px solid #0071E3' }}>
            <div className="flex items-center justify-between gap-2 mb-6">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-[#1D1D1F] truncate">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-5 h-5 object-contain shrink-0" />
                ) : (
                  <span className="w-5 h-5 rounded-md bg-[#1D1D1F] shrink-0" />
                )}
                {title}
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-[#86868B] flex items-center gap-1">
                  <Globe2 className="w-3 h-3" />
                  首页
                </span>
              </span>
            </div>

            <h3 className="text-[17px] font-bold text-[#1D1D1F] leading-snug">{title}</h3>
            <p className="mt-1.5 text-[11px] text-[#86868B] leading-relaxed">
              这是客户端配置应用后的效果示意。修改左侧网页标题，这里会立即呈现最新内容。
            </p>

            <button
              type="button"
              className="mt-4 px-3.5 py-1.5 rounded-lg text-[11px] font-medium text-white bg-[#0071E3]"
            >
              立即体验
            </button>

            {(icpNo || policeNo) && (
              <div className="mt-5 pt-3 border-t border-[#E5E5EA]">
                <div className="bg-black rounded-xl px-2.5 py-2 space-y-1.5">
                  {icpNo && (
                    <div className="flex items-center gap-1.5" title={icpNo}>
                      <img src={icpIcon} alt="ICP备案" className="w-4 h-4 shrink-0" />
                      <span className="text-[10px] leading-tight text-white truncate">{icpNo}</span>
                    </div>
                  )}
                  {policeNo && (
                    <div className="flex items-center gap-1.5" title={policeNo}>
                      <img src={policeIcon} alt="公安备案" className="w-4 h-4 shrink-0" />
                      <span className="text-[10px] leading-tight text-white truncate">{policeNo}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 存储结构（只读） */}
        <div className="mt-4 rounded-xl border border-[#E5E5EA] overflow-hidden">
          <button
            type="button"
            onClick={() => setShowJson((open) => !open)}
            className="w-full flex items-center gap-2 px-3 py-2 bg-[#FAFAFC] text-[12px] text-[#1D1D1F] hover:bg-[#F0F0F2]"
          >
            {showJson ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            <FileJson className="w-3.5 h-3.5 text-[#0071E3]" />
            查看存储 JSON
          </button>
          {showJson && (
            <pre className="px-3 py-3 text-[11px] leading-relaxed font-mono text-[#1D1D1F] bg-white overflow-x-auto whitespace-pre-wrap break-all">
              {json}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
