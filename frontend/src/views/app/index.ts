/**
 * 应用状态模块
 *
 * 收拢门户级共享状态与通用能力：
 * - constants：板块标识、收藏存储键与校验
 * - usePersistentState：同步 localStorage 的通用 state hook
 * - useUserSession：登录态、用户资料、收藏/点赞、主题、路由会话
 * - usePortalData：门户内容按板块懒加载
 * - usePersistentPlayer：悬浮迷你播放器与播放进度
 *
 * 外部统一从本入口导入，避免直接依赖模块内部文件路径。
 */
export * from './constants';
export * from './usePersistentState';
export * from './useUserSession';
export * from './usePortalData';
export * from './usePersistentPlayer';
