import { FileText, Film, Images } from 'lucide-react';
import type { ContentModule } from '../lib/router.ts';
import { PageShell } from './PageShell.tsx';

interface QuickCreatePageProps {
  onSelect: (module: ContentModule) => void;
  onBack: () => void;
}

/** 原快速上传弹窗改为独立选择页 */
export function QuickCreatePage({ onSelect, onBack }: QuickCreatePageProps) {
  const options = [
    {
      module: 'videos' as const,
      icon: Film,
      iconClass: 'bg-[#0071E3]/12 text-[#0071E3]',
      title: '上传视频作品',
      description: '支持拖入 MP4/MOV/WebM，自动识别时长与首帧封面',
    },
    {
      module: 'imagetexts' as const,
      icon: Images,
      iconClass: 'bg-[#34C759]/12 text-[#16A34A]',
      title: '发布多图图文',
      description: '批量拖入多张图片，自由排序与指定首页封面',
    },
    {
      module: 'articles' as const,
      icon: FileText,
      iconClass: 'bg-[#5856D6]/12 text-[#5856D6]',
      title: '撰写专栏文章',
      description: '沉浸式排版编辑器，支持实时预览与头图上传',
    },
  ];

  return (
    <PageShell
      title="选择要发布的内容类型"
      subtitle="选择后将进入对应内容的独立编辑页面"
      onBack={onBack}
      backLabel="返回工作台"
      maxWidth="max-w-[720px]"
    >
      <div className="space-y-3">
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <button
              key={option.module}
              type="button"
              onClick={() => onSelect(option.module)}
              className="w-full p-4 rounded-2xl bg-[#F5F5F7] hover:bg-[#ECECF0] flex items-center gap-4 text-left transition-colors"
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${option.iconClass}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[14px] font-semibold text-[#1D1D1F]">{option.title}</div>
                <div className="text-[12px] text-[#6E6E73] mt-0.5">{option.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </PageShell>
  );
}
