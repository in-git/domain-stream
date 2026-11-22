import { FileText, Film, Images } from 'lucide-react';
import type { ModuleKey } from '../../types/cms.ts';

interface MyContentPanelProps {
  counts: { videos: number; imagetexts: number; articles: number };
  onNavigate: (module: ModuleKey) => void;
}

/** 首页内容统计卡片：视频 / 图文 / 文章，点击进入对应模块 */
export function MyContentPanel({ counts, onNavigate }: MyContentPanelProps) {
  const items = [
    {
      label: '视频',
      value: counts.videos,
      icon: Film,
      color: '#0071E3',
      module: 'videos' as ModuleKey,
    },
    {
      label: '图文',
      value: counts.imagetexts,
      icon: Images,
      color: '#34C759',
      module: 'imagetexts' as ModuleKey,
    },
    {
      label: '文章',
      value: counts.articles,
      icon: FileText,
      color: '#5856D6',
      module: 'articles' as ModuleKey,
    },
  ];

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onNavigate(item.module)}
            className="group flex items-center gap-4 rounded-[18px] border border-[#E5E5EA] bg-white px-5 py-4 text-left shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.07)] hover:border-[#D2D2D7]"
          >
            <span
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px]"
              style={{ backgroundColor: `${item.color}14`, color: item.color }}
            >
              <Icon className="h-6 w-6" strokeWidth={1.7} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] text-[#86868B]">{item.label}</span>
              <span className="mt-0.5 block text-[30px] font-semibold leading-none tracking-tight text-[#1D1D1F] tabular-nums">
                {item.value}
              </span>
            </span>
          </button>
        );
      })}
    </section>
  );
}
