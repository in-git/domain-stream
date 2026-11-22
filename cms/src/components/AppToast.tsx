import {
  Toast,
  ToastContent,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastQueue,
} from '@heroui/react';

/** HeroUI 全局 Toast 队列：任何模块调用 showToast 即可弹出提示 */
export const toastQueue = new ToastQueue();

export type ToastKind = 'success' | 'danger' | 'warning' | 'info';

/** 触发一条全局提示 */
export function showToast(title: string, kind: ToastKind = 'success', description?: string) {
  toastQueue.add(
    {
      title,
      description,
      variant: kind === 'info' ? 'default' : kind,
    },
    { timeout: 3600 }
  );
}

/** 挂在应用根部的 Toast 渲染器 */
export function AppToast() {
  return (
    <ToastProvider queue={toastQueue} placement="top" maxVisibleToasts={3}>
      {({ toast }) => (
        <Toast toast={toast}>
          <ToastContent>
            <ToastTitle />
            {toast.content.description && <ToastDescription />}
          </ToastContent>
        </Toast>
      )}
    </ToastProvider>
  );
}
