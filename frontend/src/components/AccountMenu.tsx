import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';
import { SWIFTUI_SNAPPY } from '../lib/motion';

export interface AccountMenuProps {
  isLoggedIn: boolean;
  displayName: string;
  avatarUrl?: string;
  onGoLogin: () => void;
  onGoRegister: () => void;
  onGoProfile: () => void;
  onLogout: () => void;
}

/** 顶部右侧账号入口：未登录显示登录/注册，登录后显示头像下拉 */
export function AccountMenu({
  isLoggedIn,
  displayName,
  avatarUrl,
  onGoLogin,
  onGoRegister,
  onGoProfile,
  onLogout,
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
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onGoLogin}
          className="h-8 px-2.5 sm:px-3.5 rounded-full text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
        >
          登录
        </button>
        <button
          type="button"
          onClick={onGoRegister}
          className="h-8 px-2.5 sm:px-3.5 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] text-white text-[12px] font-medium hover:brightness-110 transition-all"
        >
          注册
        </button>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="账号菜单"
        className="flex items-center gap-1.5 sm:gap-2 h-9 pl-1 pr-1.5 sm:pr-2.5 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-black/[0.08] dark:border-white/[0.12]" />
        ) : (
          <span className="w-7 h-7 rounded-full bg-[#0071E3]/10 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center text-[12px] font-medium">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="hidden sm:block max-w-[110px] truncate text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
          {displayName}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#86868B] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={SWIFTUI_SNAPPY}
            className="absolute right-0 top-[calc(100%+8px)] w-44 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.1] p-1.5 z-50 shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onGoProfile();
              }}
              className="w-full flex items-center gap-2.5 h-9 px-3 rounded-xl text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#F5F5F7] dark:hover:bg-white/[0.08] transition-colors"
            >
              <UserRound className="w-4 h-4 text-[#86868B]" />
              个人中心
            </button>
            <div className="h-px bg-black/[0.06] dark:bg-white/[0.08] my-1" />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2.5 h-9 px-3 rounded-xl text-[13px] text-[#FF3B30] hover:bg-[#FF3B30]/8 transition-colors"
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
