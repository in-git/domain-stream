import { FileText, Film, Images } from 'lucide-react';
import type { ModuleKey } from '../../types/cms.ts';

interface MyContentPanelProps {
  counts: { videos: number; imagetexts: number; articles: number };
  onNavigate: (module: ModuleKey) => void;
}

/** 首页内容统计列表：视频 / 图文 / 文章，点击进入对应模块 */
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
    <section className="flex h-full flex-col rounded-[18px] border border-[#E5E5EA] bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div>
        <h2 className="text-[17px] font-semibold tracking-tight text-[#1D1D1F]">我的内容</h2>
        <p className="text-[13px] text-[#6E6E73] mt-0.5">我发布的视频、图文与文章</p>
      </div>
      <ul className="mt-4 flex-1 space-y-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => onNavigate(item.module)}
                className="flex w-full items-center gap-3 rounded-[12px] px-2 py-2 text-left transition-colors hover:bg-[#F5F5F7]"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                  style={{ backgroundColor: `${item.color}14`, color: item.color }}
                >
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
                </span>
                <span className="min-w-0 flex-1 text-[14px] text-[#1D1D1F]">{item.label}</span>
                <span className="text-[18px] font-semibold leading-none tracking-tight text-[#1D1D1F] tabular-nums">
                  {item.value}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
