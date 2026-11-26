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
import { draftToJson, parseContactLinks, parseNavItems } from './schema';

interface PreviewPanelProps {
  values: Record<string, string>;
  /** 外部布局类，用于铺满容器高度 */
  className?: string;
}

/** 配置里存的是纯后端路径，CMS 预览时补回 /snowy 代理前缀 */
function previewUrl(raw: string): string {
  if (!raw || raw.startsWith('/snowy') || raw.startsWith('http')) return raw;
  return `/snowy${raw}`;
}

export function PreviewPanel({ values, className }: PreviewPanelProps) {
  // 默认展开存储 JSON，便于核对配置内容
  const [showJson, setShowJson] = useState(true);
  const title = values.title || '（未设置标题）';
  const logoUrl = previewUrl((values.logoUrl || '').trim());
  const icpNo = (values.icpNo || '').trim();
  const policeNo = (values.policeNo || '').trim();
  const themeColor = values.themeColor || '#0071E3';
  const themeRadius = values.themeRadius || '8';
  const json = useMemo(() => draftToJson(values), [values]);
  // 仅展示已启用的导航项，与 PC 侧边栏、移动端底部导航一致
  const navItems = useMemo(
    () => parseNavItems(values.navItems).filter((item) => item.enabled),
    [values.navItems]
  );
  const contacts = useMemo(
    () => parseContactLinks(values.contactLinks).filter((item) => item.label && item.url),
    [values.contactLinks]
  );

  return (
    <div
      className={`h-full bg-white rounded-2xl border border-[#E5E5EA] overflow-hidden shadow-sm flex flex-col ${className ?? ''}`}
    >
      <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-[#E5E5EA] bg-[#FAFAFC]">
        <Eye className="w-4 h-4 text-[#0071E3]" />
        <span className="text-[13px] font-medium text-[#1D1D1F]">属性修改预览</span>
        <span className="ml-auto text-[11px] text-[#86868B]">实时更新</span>
      </div>

      <div className="flex-1 min-h-0 p-4 flex flex-col">
        {/* 模拟浏览器窗口：占满预览区全部剩余高度 */}
        <div
          className="flex-1 min-h-0 flex flex-col border border-[#D2D2D7] overflow-hidden bg-white"
          style={{ borderRadius: `${themeRadius}px` }}
        >
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 bg-[#F5F5F7] border-b border-[#E5E5EA]">
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

          {/* 站点预览区：左侧为侧边栏导航示意，右侧为主内容 */}
          <div className="flex-1 min-h-0 flex" style={{ borderTop: `3px solid ${themeColor}` }}>
            <div className="w-[128px] shrink-0 border-r border-[#E5E5EA] bg-[#FAFAFC] px-2 pt-3 pb-2 flex flex-col">
              <div className="flex items-center justify-start gap-2 mb-2 px-1">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-5 h-5 object-contain shrink-0" />
                ) : (
                  <span className="w-5 h-5 rounded-md bg-[#1D1D1F] shrink-0" />
                )}
                <span className="text-[9px] font-semibold text-[#1D1D1F] truncate">{title}</span>
              </div>
              <div className="space-y-1">
                {navItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md ${
                      index === 0 ? 'bg-white shadow-xs border border-black/5' : ''
                    }`}
                  >
                    {item.iconUrl ? (
                      <img
                        src={previewUrl(item.iconUrl)}
                        alt=""
                        aria-hidden="true"
                        className="w-3 h-3 rounded-sm object-contain shrink-0"
                      />
                    ) : (
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          index === 0 ? 'bg-[#0071E3]' : 'bg-[#C7C7CC]'
                        }`}
                      />
                    )}
                    <span
                      className={`flex-1 min-w-0 text-[10px] truncate ${
                        index === 0 ? 'text-[#1D1D1F] font-medium' : 'text-[#86868B]'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
                {navItems.length === 0 && (
                  <p className="text-[9px] text-[#C7C7CC] text-center leading-tight">
                    无启用导航
                  </p>
                )}
              </div>
              {/* 备案信息与客户端一致：固定在侧边栏底部、右对齐，公安备案在最下方 */}
              {(icpNo || policeNo) && (
                <div className="mt-auto pt-2 flex flex-col items-end gap-1 border-t border-black/5">
                  {icpNo && (
                    <div
                      className="flex items-center gap-1 max-w-full pl-1 pr-1.5 py-0.5 rounded text-[#8E8E93]"
                      title={icpNo}
                    >
                      <img
                        src={icpIcon}
                        alt=""
                        aria-hidden="true"
                        className="w-3 h-3 shrink-0 opacity-70"
                      />
                      <span className="text-[9px] leading-none truncate">{icpNo}</span>
                    </div>
                  )}
                  {policeNo && (
                    <div
                      className="flex items-center gap-1 max-w-full pl-1 pr-1.5 py-0.5 rounded text-[#8E8E93]"
                      title={policeNo}
                    >
                      <img
                        src={policeIcon}
                        alt=""
                        aria-hidden="true"
                        className="w-3 h-3 shrink-0 opacity-70"
                      />
                      <span className="text-[9px] leading-none truncate">{policeNo}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 p-4">
            <div className="flex items-center justify-between gap-2 mb-4">
              <span className="flex items-center gap-2 text-[12px] font-semibold text-[#1D1D1F] truncate">
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

            {contacts.length > 0 && (
              <div className="mt-5 border-t border-[#E5E5EA] pt-3">
                <span className="text-[10px] font-semibold tracking-wide text-[#86868B]">
                  联系方式
                </span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {contacts.map((item, index) => (
                    <a
                      key={`${item.label}-${index}`}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-full items-center gap-1 rounded-md border border-[#E5E5EA] bg-[#FAFAFC] px-2 py-1 text-[10px] text-[#1D1D1F] hover:border-[#0071E3]"
                    >
                      <Globe2 className="h-2.5 w-2.5 shrink-0 text-[#0071E3]" />
                      <span className="truncate">{item.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* 存储结构（只读） */}
        {/* 存储结构：仅展开时占用空间，避免挤压上方预览 */}
        <div className="shrink-0 mt-3 rounded-xl border border-[#E5E5EA] overflow-hidden flex flex-col">
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
            <pre className="max-h-[160px] overflow-auto px-3 py-3 text-[11px] leading-relaxed font-mono text-[#1D1D1F] bg-white whitespace-pre-wrap break-all">
              {json}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
