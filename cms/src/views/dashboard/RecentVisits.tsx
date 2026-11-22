import { useState } from 'react';
import { ChevronLeft, ChevronRight, Globe2, MapPin, Monitor, Smartphone, Tablet } from 'lucide-react';
import type { LatestVisit } from '../../types/cms.ts';

/** 最近访问记录每页条数 */
const VISIT_PAGE_SIZE = 10;

const PAGE_TYPE_LABEL: Record<string, string> = {
  HOME: '首页',
  VIDEO: '视频',
  ARTICLE: '文章',
  GRAPHIC: '图文',
};

function DeviceIcon({ device }: { device: string }) {
  if (device === 'MOBILE') return <Smartphone className="w-3.5 h-3.5" />;
  if (device === 'TABLET') return <Tablet className="w-3.5 h-3.5" />;
  return <Monitor className="w-3.5 h-3.5" />;
}

function deviceLabel(device: string): string {
  if (device === 'MOBILE') return '手机';
  if (device === 'TABLET') return '平板';
  if (device === 'DESKTOP') return '电脑';
  return device || '未知设备';
}

/** 把冗长的 User-Agent 简化为「系统/浏览器」简短名称，去掉版本与参数 */
function simplifyUserAgent(ua: string): string {
  if (!ua) return '-';
  const s = ua.toLowerCase();
  // 操作系统/平台
  let os = '其他';
  if (s.includes('windows')) os = 'Windows';
  else if (s.includes('iphone') || s.includes('ipad') || s.includes('ios')) os = 'iOS';
  else if (s.includes('android')) os = 'Android';
  else if (s.includes('mac os') || s.includes('macintosh')) os = 'Mac';
  else if (s.includes('linux')) os = 'Linux';
  // 浏览器（按优先级）
  let browser = '';
  if (s.includes('edg/')) browser = 'Edge';
  else if (s.includes('opr/') || s.includes('opera')) browser = 'Opera';
  else if (s.includes('firefox/')) browser = 'Firefox';
  else if (s.includes('chrome/') || s.includes('crios/')) browser = 'Chrome';
  else if (s.includes('safari/') && !s.includes('chrome')) browser = 'Safari';
  else if (s.includes('micromessenger')) browser = '微信';
  else if (s.includes('msie') || s.includes('trident/')) browser = 'IE';
  return browser ? `${os} · ${browser}` : os;
}

/** 最近访问记录：按IP聚合后的列表，带表头与分页 */
export function RecentVisits({ visits }: { visits: LatestVisit[] }) {
  const [visitPage, setVisitPage] = useState(1);

  const visitTotalPages = Math.max(1, Math.ceil(visits.length / VISIT_PAGE_SIZE));
  const currentVisitPage = Math.min(visitPage, visitTotalPages);
  const pageVisits = visits.slice(
    (currentVisitPage - 1) * VISIT_PAGE_SIZE,
    currentVisitPage * VISIT_PAGE_SIZE
  );

  return (
    <section className="bg-white rounded-[18px] border border-[#E5E5EA] shadow-[0_2px_10px_rgba(0,0,0,0.02)] overflow-hidden h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5EA]">
        <h2 className="text-[15px] font-semibold text-[#1D1D1F]">最近访问记录</h2>
        <span className="text-[12px] text-[#86868B]">最近 {visits.length} 条</span>
      </div>

      {visits.length === 0 ? (
        <div className="px-5 py-10 text-center text-[13px] text-[#86868B]">暂无访问记录</div>
      ) : (
        <div className="overflow-x-auto flex-1">
          <table className="w-full min-w-[760px]">
            <thead>
              <tr className="border-y border-[#E5E5EA] bg-[#FAFAFC]">
                <th className="px-5 py-2.5 text-left text-[12px] font-medium text-[#86868B]">访问内容</th>
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-[#86868B]">设备</th>
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-[#86868B]">地区</th>
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-[#86868B]">IP</th>
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-[#86868B]">User-Agent</th>
                <th className="px-4 py-2.5 text-left text-[12px] font-medium text-[#86868B]">停留时长</th>
                <th className="px-5 py-2.5 text-right text-[12px] font-medium text-[#86868B]">访问时间</th>
              </tr>
            </thead>
            <tbody>
              {pageVisits.map((v) => (
                <tr
                  key={v.id}
                  className="border-b border-[#F0F0F2] last:border-b-0 hover:bg-[#FAFAFC] transition-colors"
                >
                  <td className="px-5 py-2.5">
                    {(() => {
                      const pages = v.pages?.length
                        ? v.pages
                        : [
                            `${PAGE_TYPE_LABEL[v.pageType] ?? v.pageType ?? '页面'}${
                              v.contentTitle ? `·${v.contentTitle}` : ''
                            }`,
                          ];
                      // 多条页面时只显示访问次数，不罗列内容
                      if (pages.length > 1) {
                        return (
                          <span className="text-[12px] text-[#6E6E73]">
                            共 {v.visitCount || pages.length} 次访问
                          </span>
                        );
                      }
                      return (
                        <span className="text-[12px] text-[#1D1D1F] truncate block max-w-[240px]" title={pages[0]}>
                          {pages[0]}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-[#6E6E73]">
                    <span className="inline-flex items-center gap-1.5">
                      <DeviceIcon device={v.device} />
                      {deviceLabel(v.device)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-[#6E6E73]">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {v.region || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-[#6E6E73] tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <Globe2 className="w-3 h-3" />
                      {v.ip || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-[#6E6E73] whitespace-nowrap">
                    <span title={v.userAgent || undefined}>
                      {simplifyUserAgent(v.userAgent)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-[#6E6E73] tabular-nums">
                    {v.durationSec > 0 ? `${v.durationSec}s` : '-'}
                  </td>
                  <td className="px-5 py-2.5 text-right text-[11px] text-[#AEAEB2] tabular-nums">
                    {v.createTime ? v.createTime.slice(5) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {visits.length > VISIT_PAGE_SIZE && (
        <div className="px-5 py-3 border-t border-[#F2F2F7] flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#86868B]">
          <span>
            共 {visits.length} 条 · 第 {currentVisitPage}/{visitTotalPages} 页
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentVisitPage <= 1}
              onClick={() => setVisitPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 rounded-lg border border-[#E5E5EA] flex items-center justify-center text-[#3A3A3C] hover:bg-[#F5F5F7] disabled:opacity-40 transition-colors"
              aria-label="上一页"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 tabular-nums text-[#3A3A3C]">{currentVisitPage}</span>
            <button
              type="button"
              disabled={currentVisitPage >= visitTotalPages}
              onClick={() => setVisitPage((p) => Math.min(visitTotalPages, p + 1))}
              className="h-8 w-8 rounded-lg border border-[#E5E5EA] flex items-center justify-center text-[#3A3A3C] hover:bg-[#F5F5F7] disabled:opacity-40 transition-colors"
              aria-label="下一页"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
