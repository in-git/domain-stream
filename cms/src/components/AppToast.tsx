import { useEffect, useState } from 'react';
import { AlertCircle, Check, Info, X } from 'lucide-react';

/** 全局轻提示：底部居中的胶囊提示，全站统一使用 */
export type ToastKind = 'success' | 'error' | 'danger' | 'warning' | 'info';

interface ToastItem {
  id: number;
  text: string;
  kind: ToastKind;
  description?: string;
}

let nextToastId = 1;
type Listener = (toast: ToastItem) => void;
const listeners = new Set<Listener>();

/** 触发一条全局轻提示（任意模块可直接调用，无需 hook） */
export function showToast(text: string, kind: ToastKind = 'success', description?: string) {
  const toast: ToastItem = { id: nextToastId++, text, kind, description };
  listeners.forEach((listener) => listener(toast));
}

/** 挂在应用根部的全局 Toast 渲染器（纯 CSS 动画，无额外依赖） */
export function AppToast() {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const listener: Listener = (t) => {
      setToast(t);
      setVisible(true);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  // 自动消失：先淡出，再卸载
  useEffect(() => {
    if (!toast) return;
    const fadeTimer = window.setTimeout(() => setVisible(false), 3400);
    const removeTimer = window.setTimeout(() => setToast(null), 3650);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [toast]);

  const close = () => {
    setVisible(false);
    window.setTimeout(() => setToast(null), 250);
  };

  const isError = toast?.kind === 'error' || toast?.kind === 'danger' || toast?.kind === 'warning';
  const Icon = toast?.kind === 'info' ? Info : isError ? AlertCircle : Check;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[200] -translate-x-1/2">
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center gap-2 whitespace-nowrap rounded-full px-5 py-3 text-[13px] font-medium text-white shadow-lg backdrop-blur-md transition-all duration-200 ease-out ${
            isError ? 'bg-[#D70015]/92' : 'bg-[#1D1D1F]/92'
          } ${
            visible ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-95 opacity-0'
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span>{toast.text}</span>
          {toast.description && <span className="opacity-80">{toast.description}</span>}
          <button
            type="button"
            onClick={close}
            aria-label="关闭提示"
            className="pointer-events-auto ml-1 opacity-60 transition-opacity hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
