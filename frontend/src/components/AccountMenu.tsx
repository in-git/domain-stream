import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { SWIFTUI_SNAPPY } from '../lib/motion';

export interface AccountMenuProps {
  isLoggedIn: boolean;
  displayName: string;
  avatarUrl?: string;
  onGoLogin: () => void;
  onGoProfile: () => void;
  onLogout: () => void;
  /** 悬浮在视频上方时使用白色图标 */
  overlay?: boolean;
}

/** 顶部右侧账号入口：未登录显示登录入口，登录后显示头像下拉 */
export function AccountMenu({
  isLoggedIn,
  displayName,
  avatarUrl,
  onGoLogin,
  onGoProfile,
  onLogout,
  overlay = false,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  if (!isLoggedIn) {
    return (
      <button
        type="button"
        onClick={onGoLogin}
        aria-label="登录"
        title="登录"
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
          overlay
            ? 'text-white hover:bg-white/15'
            : 'text-app-text hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
        }`}
      >
        <UserRound className="w-[18px] h-[18px]" />
      </button>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="账号菜单"
        className={`flex items-center gap-1.5 sm:gap-2 h-9 pl-1 pr-1.5 sm:pr-2 rounded-full transition-colors ${
          overlay ? 'hover:bg-white/15' : 'hover:bg-black/[0.05] dark:hover:bg-white/[0.08]'
        }`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-black/[0.08] dark:border-white/[0.12]" />
        ) : (
          <span
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-medium ${
              overlay
                ? 'bg-white/20 text-white'
                : 'bg-app-primary/10 text-app-primary'
            }`}
          >
            {displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span
          className={`hidden sm:block max-w-[110px] truncate text-[12px] font-medium ${
            overlay ? 'text-white' : 'text-app-text'
          }`}
        >
          {displayName}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform ${overlay ? 'text-white/80' : 'text-app-muted'} ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={SWIFTUI_SNAPPY}
            className="absolute right-0 top-[calc(100%+8px)] w-44 rounded-app bg-app-card border border-black/[0.08] dark:border-white/[0.1] p-1.5 z-50 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onGoProfile();
              }}
              className="w-full flex items-center gap-2 h-9 px-3 rounded-app text-[13px] text-app-text hover:bg-app-surface dark:hover:bg-white/[0.08] transition-colors"
            >
              <UserRound className="w-4 h-4 text-app-muted" />
              个人中心
            </button>
            <div className="h-px bg-black/[0.06] dark:bg-white/[0.08] my-1" />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2 h-9 px-3 rounded-app text-[13px] text-[#FF3B30] hover:bg-[#FF3B30]/8 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
