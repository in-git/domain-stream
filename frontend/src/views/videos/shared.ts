import type { VideoItem } from '../../data/content';
import { portalApi } from '../../lib/api';

export const VIDEO_PAGE_SIZE = 8;
export const DEFAULT_CATEGORIES = ['设计纪实', '城市影像', '自然声景'];
export type CategoryFilter = string;
export type ViewMode = 'feed' | 'grid';

/** 同一个浏览器标签页内，每个视频只上报一次播放量，避免重复滑动/暂停重播刷量 */
const countedVideoViews = new Set<string>();
export function countVideoViewOnce(id: string) {
  if (!id || countedVideoViews.has(id)) return;
  countedVideoViews.add(id);
  void portalApi.recordVideoView(id).catch(() => {
    countedVideoViews.delete(id);
  });
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/** PC 与移动端分类条共用的入参 */
export interface CategoryBarProps {
  categories: string[];
  category: CategoryFilter;
  onChange: (category: CategoryFilter) => void;
}

/** PC 与移动端卡片网格共用的入参（触底加载由主入口统一处理） */
export interface VideoGridProps {
  videos: VideoItem[];
  likedIds: string[];
  savedIds: string[];
  onToggleLike: (id: string) => void;
  onToggleSave: (id: string) => void;
  onOpen: (video: VideoItem) => void;
}
