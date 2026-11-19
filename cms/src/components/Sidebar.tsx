import { useEffect, useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  Bot,
  Boxes,
  ChevronDown,
  Circle,
  Clock,
  Database,
  ExternalLink,
  FileText,
  Film,
  Image,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Mail,
  MapPin,
  Network,
  PanelsTopLeft,
  Rocket,
  Settings,
  Shield,
  Smartphone,
  Terminal,
  UserCircle2,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { ModuleKey, UserProfile } from '../types/cms.ts';
import type { SnowyMenu } from '../lib/snowy.ts';
import { menuNodeToModule } from '../lib/menu.ts';
import { MediaImage } from './MediaImage.tsx';

interface SidebarProps {
  /** /sys/userCenter/loginMenu 返回的原始菜单树（模块 -> 目录 -> 菜单，可任意层级） */
  menuTree: SnowyMenu[];
  activeModule: ModuleKey;
  /** 当前选中的外部菜单节点 id（CueStudio 未内置页面的菜单） */
  activeMenuId: string | null;
  onSelectModule: (mod: ModuleKey) => void;
  /** 点击任意菜单叶子节点；由 App 层分流到内置模块或外部菜单占位页 */
  onSelectMenu: (node: SnowyMenu) => void;
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

/* ------------------------------------------------------------------ */
/* 图标：snowy/antd 风格 icon 名 -> lucide                              */
/* ------------------------------------------------------------------ */

const ICON_RULES: Array<{ test: RegExp; icon: LucideIcon }> = [
  { test: /home|dashboard/, icon: LayoutDashboard },
  { test: /appstore|profile|pic-left|grid|project/, icon: LayoutGrid },
  { test: /apartment|cluster|deployment|branch|org/, icon: Network },
  { test: /user-switch|usergroup|team|user|group/, icon: Users },
  { test: /setting|cog|tool|build|sliders|wrench/, icon: Settings },
  { test: /file-image|picture|images?/, icon: Image },
  { test: /copy|files|file-text|file-search|file-word|read|file/, icon: FileText },
  { test: /video|play|film|media/, icon: Film },
  { test: /send|mail|message|sms|email/, icon: Mail },
  { test: /hdd|database|server|console-sql|storage/, icon: Database },
  { test: /field-time|clock|history|schedule/, icon: Clock },
  { test: /robot|bot/, icon: Bot },
  { test: /bars|chart|pie|line|monitor/, icon: BarChart3 },
  { test: /rocket|code|gen|develop/, icon: Rocket },
  { test: /environment|compass|map|position/, icon: MapPin },
  { test: /mobile|smartphone|phone/, icon: Smartphone },
  { test: /lock|key|safety|shield|auth/, icon: Shield },
  { test: /bell|notice|notify/, icon: Bell },
  { test: /terminal|console/, icon: Terminal },
  { test: /eye|scan|activity/, icon: Activity },
];

function iconForNode(node: SnowyMenu): LucideIcon {
  const raw = (node.icon || node.meta?.icon || node.name || '').toLowerCase();
  if (!raw) return Circle;
  const hit = ICON_RULES.find((rule) => rule.test.test(raw));
  return hit?.icon || Circle;
}

/** 顶层模块分组图标，按 code 区分系统 / 业务 */
const MODULE_ICONS: Record<string, LucideIcon> = {
  system: Settings,
  biz: Boxes,
};
function moduleIcon(node: SnowyMenu): LucideIcon {
  return MODULE_ICONS[(node.code || '').toLowerCase()] || PanelsTopLeft;
}

/* ------------------------------------------------------------------ */
/* 菜单树工具                                                          */
/* ------------------------------------------------------------------ */

function isHidden(node: SnowyMenu): boolean {
  return (
    node.visible === 'NO' ||
    node.visible === 'FALSE' ||
    node.meta?.hidden === true
  );
}

function nodeTitle(node: SnowyMenu): string {
  return node.meta?.title || node.title || node.name || '未命名菜单';
}

/** 是否有可展开的子节点（目录 / 模块） */
function isBranch(node: SnowyMenu): boolean {
  return !!node.children?.length && (node.menuType === 'CATALOG' || node.category === 'MODULE');
}

/** 查找命中节点，返回从根到该节点的 id 路径；用于自动展开所在分支 */
function findNodePath(
  nodes: SnowyMenu[],
  predicate: (node: SnowyMenu) => boolean,
  trail: string[] = []
): string[] | null {
  for (const node of nodes) {
    if (isHidden(node)) continue;
    const next = [...trail, node.id];
    if (predicate(node)) return next;
    if (node.children?.length) {
      const hit = findNodePath(node.children, predicate, next);
      if (hit) return hit;
    }
  }
  return null;
}

const MODULE_COUNTS: Partial<Record<ModuleKey, keyof SidebarProps['counts']>> = {
  videos: 'videos',
  imagetexts: 'imagetexts',
  articles: 'articles',
};

interface RenderCtx {
  expanded: Set<string>;
  toggle: (id: string) => void;
  activeModule: ModuleKey;
  activeMenuId: string | null;
  counts: SidebarProps['counts'];
  onSelectMenu: (node: SnowyMenu) => void;
  onCloseMobile: () => void;
}

/* ------------------------------------------------------------------ */
/* 递归菜单节点                                                        */
/* ------------------------------------------------------------------ */

function MenuNodes({
  nodes,
  ctx,
}: {
  nodes: SnowyMenu[];
  ctx: RenderCtx;
}) {
  const visible = nodes.filter((n) => !isHidden(n));
  return (
    <>
      {visible.map((node) => {
        if (isBranch(node)) {
          const open = ctx.expanded.has(node.id);
          const Icon = iconForNode(node);
          return (
            <div key={node.id}>
              <button
                type="button"
                onClick={() => ctx.toggle(node.id)}
                className="w-full h-9 pl-2.5 pr-2.5 rounded-xl flex items-center gap-2.5 text-[13px] font-semibold text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors"
                aria-expanded={open}
              >
                <span className="w-6 h-6 rounded-lg bg-[#EFEFF1] flex items-center justify-center shrink-0">
                  <Icon className="w-3.5 h-3.5 text-[#636366]" strokeWidth={2} />
                </span>
                <span className="flex-1 truncate text-left">{nodeTitle(node)}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 shrink-0 text-[#AEAEB2] transition-transform ${
                    open ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>
              {open && (
                <div className="ml-[23px] border-l border-[#E5E5EA] pl-2.5">
                  <MenuNodes nodes={node.children || []} ctx={ctx} />
                </div>
              )}
            </div>
          );
        }

        const target = menuNodeToModule(node);
        const isExternal = target === null;
        const active = isExternal
          ? ctx.activeMenuId === node.id
          : ctx.activeMenuId === null && ctx.activeModule === target;
        const countKey = target ? MODULE_COUNTS[target] : undefined;
        const count = countKey ? ctx.counts[countKey] : undefined;
        const Icon = iconForNode(node);

        return (
          <button
            key={node.id}
            type="button"
            onClick={() => {
              ctx.onSelectMenu(node);
              ctx.onCloseMobile();
            }}
            className={`relative w-full h-8 pl-2 pr-2.5 rounded-lg flex items-center gap-2 text-[12.5px] transition-colors ${
              active
                ? 'bg-[#0071E3]/10 text-[#0071E3] font-semibold'
                : 'text-[#48484A] hover:bg-[#F5F5F7] font-medium'
            }`}
            title={nodeTitle(node)}
          >
            <span className="absolute -left-2.5 top-1/2 w-2 h-px bg-[#D1D1D6] pointer-events-none" />
            <Icon
              className={`w-3.5 h-3.5 shrink-0 ${active ? 'text-[#0071E3]' : 'text-[#9A9A9E]'}`}
              strokeWidth={1.8}
            />
            <span className="flex-1 truncate text-left">{nodeTitle(node)}</span>
            {count !== undefined && (
              <span
                className={`text-[11px] tabular-nums shrink-0 ${
                  active ? 'text-[#0071E3]' : 'text-[#AEAEB2]'
                }`}
              >
                {count}
              </span>
            )}
            {isExternal && (
              <ExternalLink
                className={`w-3 h-3 shrink-0 ${active ? 'text-[#0071E3]' : 'text-[#C7C7CC]'}`}
                strokeWidth={1.8}
              />
            )}
          </button>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* 侧边栏                                                             */
/* ------------------------------------------------------------------ */

export function Sidebar({
  menuTree,
  activeModule,
  activeMenuId,
  onSelectModule,
  onSelectMenu,
  user,
  counts,
  onLogout,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const set = new Set<string>();
    const first = menuTree.find((n) => !isHidden(n));
    if (first) set.add(first.id);
    const path = findNodePath(
      menuTree,
      (n) => !isBranch(n) && menuNodeToModule(n) === activeModule
    );
    if (path) {
      set.add(path[0]);
      path.slice(0, -1).forEach((id) => set.add(id));
    }
    return set;
  });

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 路由切换到某内置模块时，自动展开它所在的菜单分支（只增不减，不覆盖用户手动折叠）
  useEffect(() => {
    if (activeMenuId) return;
    const path = findNodePath(
      menuTree,
      (n) => !isBranch(n) && menuNodeToModule(n) === activeModule
    );
    if (!path) return;
    setExpanded((prev) => {
      const need = [path[0], ...path.slice(0, -1)];
      if (need.every((id) => prev.has(id))) return prev;
      const next = new Set(prev);
      need.forEach((id) => next.add(id));
      return next;
    });
  }, [menuTree, activeModule, activeMenuId]);

  const ctx: RenderCtx = {
    expanded,
    toggle,
    activeModule,
    activeMenuId,
    counts,
    onSelectMenu,
    onCloseMobile,
  };

  const topModules = menuTree.filter((n) => !isHidden(n));

  const content = (
    <aside className="w-[264px] h-full bg-white/90 backdrop-blur-xl border-r border-[#E5E5EA] flex flex-col select-none">
      <div className="h-16 px-5 flex items-center justify-between border-b border-[#F2F2F7] shrink-0">
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

      <nav
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1"
        aria-label="动态菜单导航"
      >
        {topModules.length === 0 && (
          <div className="px-3 py-6 text-[13px] text-[#86868B]">
            暂无可访问的菜单
          </div>
        )}
        {topModules.map((mod, idx) => {
          const open = expanded.has(mod.id);
          const Icon = moduleIcon(mod);
          return (
            <div
              key={mod.id}
              className={idx > 0 ? 'mt-3 pt-3 border-t border-[#F2F2F7]' : ''}
            >
              <button
                type="button"
                onClick={() => toggle(mod.id)}
                className="w-full h-8 px-3 rounded-lg flex items-center gap-2 text-[11px] font-semibold tracking-wide text-[#86868B] hover:bg-[#F5F5F7] transition-colors"
                aria-expanded={open}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.8} />
                <span className="flex-1 truncate text-left">{nodeTitle(mod)}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 shrink-0 text-[#AEAEB2] transition-transform ${
                    open ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>
              {open && (
                <div className="mt-1 ml-3 border-l border-[#E5E5EA] pl-2.5 space-y-0.5">
                  <MenuNodes nodes={mod.children || []} ctx={ctx} />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-[#F2F2F7] space-y-1.5 shrink-0">
        <button
          type="button"
          onClick={() => {
            onSelectModule('profile');
            onCloseMobile();
          }}
          className={`w-full p-2.5 rounded-xl flex items-center gap-3 text-left transition-colors ${
            activeModule === 'profile' && !activeMenuId
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
                activeModule === 'profile' && !activeMenuId
                  ? 'text-[#0071E3]'
                  : 'text-[#1D1D1F]'
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
              activeModule === 'profile' && !activeMenuId
                ? 'text-[#0071E3]'
                : 'text-[#86868B]'
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
