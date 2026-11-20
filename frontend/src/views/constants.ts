import type { SectionId } from '../data/content';

/** 需要后端数据的板块（profile 的数据来自其他板块，不单独拉取） */
export type ContentSection = 'videos' | 'articles' | 'gallery' | 'messages';

export const SECTION_IDS: SectionId[] = ['videos', 'articles', 'gallery', 'messages', 'profile'];

/** 记住用户上次停留的板块，下次进入站点直接回到该路由 */
export const LAST_SECTION_KEY = 'lumina:last-section';

export function isSectionId(value: unknown): value is SectionId {
  return typeof value === 'string' && (SECTION_IDS as string[]).includes(value);
}

/** 收藏存储结构：用户ID -> 收藏的内容ID列表（未登录用 guest 作为键） */
export type FavoriteBuckets = Record<string, string[]>;
export const FAVORITES_KEY = 'lumina:favorites';
/** 旧版本用过的全站共享收藏键，首次加载时迁移到 guest 桶 */
export const LEGACY_FAVORITES_KEY = 'lumina:saved';

export function isFavoriteBuckets(value: unknown): value is FavoriteBuckets {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (list) => Array.isArray(list) && list.every((item) => typeof item === 'string')
  );
}
