/**
 * 评论登录拦截桥接：由 PortalShell 注册 goLogin，
 * 任意内容详情页的评论区在未登录时统一唤起登录弹窗。
 */
let requireLoginHandler: (() => void) | null = null;

export function registerCommentLogin(handler: () => void): void {
  requireLoginHandler = handler;
}

export function requireCommentLogin(): void {
  requireLoginHandler?.();
}
