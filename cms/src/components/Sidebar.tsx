import {
  FileText,
  Film,
  Images,
  LayoutDashboard,
  LogOut,
  UserCircle2,
  X,
} from 'lucide-react';
import type { ModuleKey, UserProfile } from '../types/cms.ts';
import { MediaImage } from './MediaImage.tsx';

interface SidebarProps {
  activeModule: ModuleKey;
  onSelectModule: (mod: ModuleKey) => void;
  user: UserProfile;
  counts: {
    videos: number;
    imagetexts: number;
    articles: number;
  };
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  activeModule,
  onSelectModule,
  user,
  counts,
  onLogout,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navItems: Array<{
    key: ModuleKey;
    label: string;
    icon: typeof LayoutDashboard;
    count?: number;
  }> = [
    { key: 'dashboard', label: '首页看板', icon: LayoutDashboard },
    { key: 'videos', label: '视频管理', icon: Film, count: counts.videos },
    { key: 'imagetexts', label: '图文管理', icon: Images, count: counts.imagetexts },
    { key: 'articles', label: '文章管理', icon: FileText, count: counts.articles },
  ];

  const content = (
    <aside className="w-[252px] h-full bg-white/90 backdrop-blur-xl border-r border-[#E5E5EA] flex flex-col justify-between select-none">
      <div>
        <div className="h-16 px-5 flex items-center justify-between border-b border-[#F2F2F7]">
          <button
            type="button"
            onClick={() => {
              onSelectModule('dashboard');
              onCloseMobile();
            }}
            className="text-[18px] font-semibold tracking-tight text-[#1D1D1F] whitespace-nowrap shrink-0"
          >
            CueStudio
          </button>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="关闭侧边栏"
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-[#6E6E73] hover:bg-[#F5F5F7]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="p-3 space-y-1" aria-label="主导航">
          <div className="px-3 pt-2 pb-1.5 text-[11px] font-medium text-[#86868B]">
            工作区模块
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeModule === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  onSelectModule(item.key);
                  onCloseMobile();
                }}
                className={`w-full h-10 px-3 rounded-xl flex items-center justify-between text-[14px] transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#0071E3]/10 text-[#0071E3] font-semibold'
                    : 'text-[#1D1D1F] hover:bg-[#F5F5F7] font-medium'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon
                    className={`w-[18px] h-[18px] ${
                      active ? 'text-[#0071E3]' : 'text-[#6E6E73]'
                    }`}
                    strokeWidth={1.8}
                  />
                  <span>{item.label}</span>
                </span>
                {item.count !== undefined && (
                  <span
                    className={`text-[12px] tabular-nums ${
                      active ? 'text-[#0071E3]' : 'text-[#86868B]'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-[#F2F2F7] space-y-1.5">
        <button
          type="button"
          onClick={() => {
            onSelectModule('profile');
            onCloseMobile();
          }}
          className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-left transition-colors ${
            activeModule === 'profile'
              ? 'bg-[#0071E3]/10'
              : 'hover:bg-[#F5F5F7]'
          }`}
        >
          <MediaImage
            src={user.avatarUrl}
            alt={user.name}
            fallbackLabel={user.name.slice(0, 1)}
            className="w-9 h-9 rounded-full object-cover shrink-0 border border-[#E5E5EA]"
          />
          <div className="min-w-0 flex-1">
            <div
              className={`text-[13px] font-semibold truncate ${
                activeModule === 'profile' ? 'text-[#0071E3]' : 'text-[#1D1D1F]'
              }`}
            >
              {user.name}
            </div>
            <div className="text-[12px] text-[#6E6E73] truncate">
              {user.roleTitle}
            </div>
          </div>
          <UserCircle2
            className={`w-4 h-4 shrink-0 ${
              activeModule === 'profile' ? 'text-[#0071E3]' : 'text-[#86868B]'
            }`}
          />
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="w-full h-9 px-3 rounded-xl flex items-center gap-2.5 text-[13px] font-medium text-[#6E6E73] hover:text-[#D70015] hover:bg-[#FF3B30]/8 transition-colors"
        >
          <LogOut className="w-4 h-4" strokeWidth={1.8} />
          <span>退出登录</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden lg:block shrink-0 h-screen sticky top-0">
        {content}
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/25 backdrop-blur-xs"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 h-full">{content}</div>
        </div>
      )}
    </>
  );
}
