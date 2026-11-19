import { ArrowLeft, ExternalLink, Info, Layers, Link2, Tag } from 'lucide-react';
import type { SnowyMenu } from '../lib/snowy.ts';

/** 小诺后台管理前端（snowy-admin-web）默认端口；未启动时外链按钮不可用属正常 */
const ADMIN_WEB_ORIGIN = `http://${window.location.hostname}:8081`;

interface ExternalMenuViewProps {
  node: SnowyMenu;
  onBack: () => void;
}

function externalHref(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${ADMIN_WEB_ORIGIN}/#${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * 外部菜单占位页
 * ------------------------------------------------------------------
 * /sys/userCenter/loginMenu 返回的菜单完整覆盖小诺后台全部功能，而
 * CueStudio 工作台只内置了首页看板 / 视频 / 图文 / 文章 / 通用分类 / 个人中心。
 * 点击其余菜单时渲染本页，展示菜单元数据并提供跳转后台的入口，
 * 避免「点了没反应」或白屏。
 */
export function ExternalMenuView({ node, onBack }: ExternalMenuViewProps) {
  const title = node.meta?.title || node.title || node.name || '未命名菜单';
  const rows: Array<{ label: string; value: string }> = [
    { label: '菜单标识', value: node.id },
    { label: '路由路径', value: node.path || '-' },
    { label: '菜单编码', value: node.code || '-' },
    { label: '菜单类型', value: node.menuType || node.category || '-' },
    { label: '图标', value: node.icon || node.meta?.icon || '-' },
  ];

  return (
    <div className="w-full max-w-[760px] mx-auto">
      <button
        type="button"
        onClick={onBack}
        className="mb-5 h-9 px-3 rounded-xl inline-flex items-center gap-2 text-[13px] font-medium text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回工作台
      </button>

      <div className="bg-white border border-[#E5E5EA] rounded-2xl overflow-hidden">
        <div className="px-7 py-6 border-b border-[#F2F2F7] flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0071E3]/10 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6 text-[#0071E3]" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <h2 className="text-[20px] font-semibold tracking-tight text-[#1D1D1F] truncate">
              {title}
            </h2>
            <p className="mt-1 text-[13px] text-[#6E6E73]">
              来自小诺后台菜单（sys/userCenter/loginMenu）
            </p>
          </div>
        </div>

        <div className="px-7 py-5">
          <div className="rounded-xl bg-[#F5F5F7] p-4 flex gap-3">
            <Info className="w-4 h-4 text-[#0071E3] shrink-0 mt-0.5" />
            <p className="text-[13px] leading-6 text-[#3A3A3C]">
              该菜单由后端动态下发，CueStudio 工作台尚未内置对应页面。侧边栏会完整呈现你有权访问的全部菜单；
              如需使用此功能，可在小诺后台管理系统中打开。
            </p>
          </div>

          <dl className="mt-5 divide-y divide-[#F2F2F7]">
            {rows.map((row) => (
              <div
                key={row.label}
                className="py-3 flex items-center gap-4 text-[13px]"
              >
                <dt className="w-24 shrink-0 text-[#86868B] flex items-center gap-1.5">
                  {row.label === '路由路径' ? (
                    <Link2 className="w-3.5 h-3.5" />
                  ) : row.label === '菜单编码' ? (
                    <Tag className="w-3.5 h-3.5" />
                  ) : null}
                  {row.label}
                </dt>
                <dd className="flex-1 min-w-0 text-[#1D1D1F] font-mono text-[12px] break-all">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={externalHref(node.path || '')}
              target="_blank"
              rel="noreferrer"
              className="h-10 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              在小诺后台打开
            </a>
            <button
              type="button"
              onClick={onBack}
              className="h-10 px-4 rounded-xl bg-white border border-[#E5E5EA] text-[13px] font-medium text-[#3A3A3C] hover:bg-[#F5F5F7] transition-colors"
            >
              返回工作台
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
