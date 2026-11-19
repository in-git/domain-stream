/**
 * 前台门户数据接口层
 * ------------------------------------------------------------------
 * 通过 Vite 代理 /api -> http://localhost:82，请求 /api/public/** 会被 rewrite 为 /public/**。
 * 所有接口无需登录，对应后端 /public/** 白名单。
 * 这里同时负责把后端实体字段映射为前台视图模型。
 */
import type { ArticleItem, PhotoItem, VideoItem, MessageItem } from '../data/content';
import { isRichHtml, markdownToHtml, richTextToPlain } from './richtext';

const API_BASE =
  ((import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE_URL as string) || '/api';

interface Envelope<T> {
  code: number;
  msg: string;
  data: T;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    throw new Error(`服务请求失败（${response.status}）`);
  }
  const json = (await response.json()) as Envelope<T>;
  if (json.code !== 200) {
    throw new Error(json.msg || '服务请求失败');
  }
  return json.data;
}

/* ------------------------------------------------------------------ */
/* 后端原始实体字段                                                     */
/* ------------------------------------------------------------------ */

export interface PortalVideo {
  id: string;
  title?: string;
  cover?: string;
  videoUrl?: string;
  duration?: string;
  summary?: string;
  category?: string;
  tags?: string;
  status?: string;
  publishTime?: string;
  viewCount?: number;
  likeCount?: number;
  extJson?: string;
  createTime?: string;
  createUser?: string;
}

export interface PortalArticle {
  id: string;
  title?: string;
  cover?: string;
  summary?: string;
  content?: string;
  category?: string;
  tags?: string;
  author?: string;
  source?: string;
  status?: string;
  publishTime?: string;
  viewCount?: number;
  likeCount?: number;
  extJson?: string;
  createTime?: string;
  createUser?: string;
}

export interface PortalGraphic {
  id: string;
  title?: string;
  cover?: string;
  images?: string;
  summary?: string;
  content?: string;
  category?: string;
  tags?: string;
  status?: string;
  publishTime?: string;
  viewCount?: number;
  likeCount?: number;
  extJson?: string;
  createTime?: string;
}

export interface PortalCategory {
  id: string;
  name?: string;
  code?: string;
  parentId?: string;
  module?: string;
  image?: string;
  icon?: string;
  description?: string;
  status?: string;
  sortCode?: number;
}

/** 后端分类的适用模块 */
export type CategoryModule = 'VIDEO' | 'ARTICLE' | 'GRAPHIC' | 'IMAGE' | 'COMMON';

export interface PortalMessage {
  id: string;
  nickname?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  content?: string;
  status?: string;
  reply?: string;
  replyTime?: string;
  createTime?: string;
  likeCount?: number;
}

/* ------------------------------------------------------------------ */
/* 映射工具                                                            */
/* ------------------------------------------------------------------ */

function parseExt(raw?: string): Record<string, unknown> {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function parseDuration(raw?: string): number {
  if (!raw) return 8;
  const parts = raw.split(':').map((p) => Number(p.trim()));
  if (parts.length === 0 || parts.some((p) => Number.isNaN(p))) return 8;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function formatDuration(total: number): string {
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function formatYearMonth(raw?: string): string {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return `${date.getFullYear()}年${date.getMonth() + 1}月`;
}

function formatFullDate(raw?: string): string {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
}

/**
 * 按模块取分类名称：通用分类（COMMON）会同时并入各模块。
 * 返回可直接作为筛选标签使用的中文名称数组，已去重并排序。
 */
export function categoriesForModule(
  categories: PortalCategory[],
  module: CategoryModule
): string[] {
  const names = categories
    .filter((item) => {
      const itemModule = (item.module || '').toUpperCase();
      return itemModule === module || itemModule === 'COMMON';
    })
    .map((item) => (item.name || item.code || '').trim())
    .filter(Boolean);
  return Array.from(new Set(names));
}

/** 分类编码 -> 名称映射，用于把后端内容的 CATEGORY 编码转成展示名称 */
export function categoryNameMap(categories: PortalCategory[]): Map<string, string> {
  const map = new Map<string, string>();
  categories.forEach((item) => {
    if (item.code && item.name) map.set(item.code, item.name);
  });
  return map;
}

const VIDEO_CATEGORIES: string[] = ['设计纪实', '城市影像', '自然声景'];
const VIDEO_CATEGORY_MAP: Record<string, VideoItem['category']> = {
  design: '设计纪实',
  Design: '设计纪实',
  设计: '设计纪实',
  设计纪实: '设计纪实',
  city: '城市影像',
  urban: '城市影像',
  城市影像: '城市影像',
  nature: '自然声景',
  自然声景: '自然声景',
};

const ARTICLE_CATEGORIES: string[] = ['设计', '影像', '技术', '随笔'];
const ARTICLE_CATEGORY_MAP: Record<string, ArticleItem['category']> = {
  design: '设计',
  设计: '设计',
  photo: '影像',
  image: '影像',
  影像: '影像',
  tech: '技术',
  technology: '技术',
  技术: '技术',
  essay: '随笔',
  随笔: '随笔',
};

const ALBUMS: string[] = ['建筑', '自然', '静物', '光影'];
const ALBUM_MAP: Record<string, PhotoItem['album']> = {
  architecture: '建筑',
  建筑: '建筑',
  nature: '自然',
  自然: '自然',
  still: '静物',
  object: '静物',
  静物: '静物',
  light: '光影',
  光影: '光影',
};

const MOTION_STYLES: VideoItem['motionStyle'][] = [
  'drift-ocean',
  'precision-scan',
  'rain-shimmer',
  'sunlight-sweep',
  'prism-spectrum',
];
const ACCENT_TINTS = ['#1D4ED8', '#475569', '#0284C7', '#0D9488', '#0071E3'];
const ASPECT_RATIOS: NonNullable<PhotoItem['aspectRatio']>[] = ['3:4', '4:3', '1:1', '16:9'];

export function videoFromPortal(
  row: PortalVideo,
  index = 0,
  categoryNames?: Map<string, string>
): VideoItem {
  const ext = parseExt(row.extJson);
  const durationSeconds = num(ext.durationSec, parseDuration(row.duration));
  const chaptersRaw = ext.chapters;
  const chapters = Array.isArray(chaptersRaw)
    ? (chaptersRaw as Array<Record<string, unknown>>)
        .map((chapter) => ({ time: num(chapter.time), label: str(chapter.label, '章节') }))
        .filter((chapter) => chapter.label)
    : [
        { time: 0, label: '开始' },
        { time: Math.max(1, Math.floor(durationSeconds / 2)), label: '中段' },
        { time: Math.max(2, durationSeconds - 1), label: '结尾' },
      ];
  const rawCategory = row.category || '';
  const category =
    categoryNames?.get(rawCategory) ||
    VIDEO_CATEGORY_MAP[rawCategory] ||
    (VIDEO_CATEGORIES.includes(rawCategory)
      ? rawCategory
      : VIDEO_CATEGORIES[index % VIDEO_CATEGORIES.length]);

  return {
    id: String(row.id),
    title: row.title || '未命名视频',
    subtitle: row.summary || str(ext.subtitle),
    category,
    durationSeconds,
    durationLabel: formatDuration(durationSeconds),
    resolution: str(ext.resolution, '4K'),
    director: str(ext.director, row.createUser || ''),
    date: formatYearMonth(row.publishTime || row.createTime),
    cover: row.cover || str(ext.cover),
    src: row.videoUrl || str(ext.src),
    width: num(ext.width, 1280),
    height: num(ext.height, 720),
    accentTint: str(ext.accentTint, ACCENT_TINTS[index % ACCENT_TINTS.length]),
    motionStyle:
      (MOTION_STYLES.includes(ext.motionStyle as VideoItem['motionStyle'])
        ? (ext.motionStyle as VideoItem['motionStyle'])
        : MOTION_STYLES[index % MOTION_STYLES.length]),
    chapters,
    description: str(ext.description, row.summary || ''),
  };
}

export function articleFromPortal(
  row: PortalArticle,
  index = 0,
  categoryNames?: Map<string, string>
): ArticleItem {
  const ext = parseExt(row.extJson);
  const rawContent = row.content || '';
  const html = isRichHtml(rawContent);
  const plain = html ? richTextToPlain(rawContent) : rawContent;
  const paragraphs = html
    ? []
    : rawContent
        .split(/\n\s*\n|\n/)
        .map((p) => p.trim())
        .filter(Boolean);
  const rawCategory = row.category || '';
  const category =
    categoryNames?.get(rawCategory) ||
    ARTICLE_CATEGORY_MAP[rawCategory] ||
    (ARTICLE_CATEGORIES.includes(rawCategory)
      ? rawCategory
      : ARTICLE_CATEGORIES[index % ARTICLE_CATEGORIES.length]);

  return {
    id: String(row.id),
    title: row.title || '未命名文章',
    excerpt: row.summary || str(ext.excerpt),
    category,
    author: row.author || row.createUser || str(ext.author, '编辑部'),
    date: formatFullDate(row.publishTime || row.createTime),
    readMinutes: Math.max(1, Math.ceil(plain.length / 400)),
    likes: row.likeCount || 0,
    cover: row.cover || str(ext.cover),
    quote: str(ext.quote, paragraphs[0] || plain.slice(0, 80) || row.summary || ''),
    paragraphs: paragraphs.length ? paragraphs : [plain || row.summary || row.title || ''],
    content: rawContent ? (html ? rawContent : markdownToHtml(rawContent)) : undefined,
  };
}

export function graphicsToPhotos(
  rows: PortalGraphic[],
  categoryNames?: Map<string, string>
): PhotoItem[] {
  const result: PhotoItem[] = [];
  let index = 0;
  for (const row of rows) {
    const ext = parseExt(row.extJson);
    let images: string[] = [];
    if (row.images) {
      try {
        const parsed: unknown = JSON.parse(row.images);
        if (Array.isArray(parsed)) {
          images = parsed.filter((item): item is string => typeof item === 'string' && !!item);
        }
      } catch {
        images = [];
      }
    }
    if (!images.length && row.cover) images = [row.cover];
    const rawCategory = row.category || '';
    const album =
      categoryNames?.get(rawCategory) ||
      ALBUM_MAP[rawCategory] ||
      (ALBUMS.includes(rawCategory) ? rawCategory : ALBUMS[index % ALBUMS.length]);

    images.forEach((src, imageIndex) => {
      result.push({
        id: images.length === 1 ? String(row.id) : `${row.id}-${imageIndex + 1}`,
        title: images.length === 1 ? row.title || '未命名作品' : `${row.title || '未命名作品'} · ${imageIndex + 1}`,
        album: str(ext.album, album) as PhotoItem['album'],
        src,
        aspectRatio: (ASPECT_RATIOS.includes(ext.aspectRatio as PhotoItem['aspectRatio'])
          ? ext.aspectRatio
          : ASPECT_RATIOS[index % ASPECT_RATIOS.length]) as PhotoItem['aspectRatio'],
        location: str(ext.location, row.summary || ''),
        date: formatYearMonth(row.publishTime || row.createTime),
        camera: str(ext.camera),
        lens: str(ext.lens),
        settings: str(ext.settings),
      });
      index += 1;
    });
  }
  return result;
}

export function messageFromPortal(row: PortalMessage): MessageItem {
  return {
    id: String(row.id),
    nickname: row.nickname || '匿名访客',
    email: row.email,
    avatar: row.avatar,
    content: row.content || '',
    createdAt: row.createTime || '',
    likes: row.likeCount || 0,
    status: (['PENDING', 'APPROVED', 'REJECTED'].includes(row.status || '')
      ? row.status
      : 'APPROVED') as MessageItem['status'],
    reply: row.reply,
    replyAt: row.replyTime,
  };
}

/* ------------------------------------------------------------------ */
/* 接口                                                                */
/* ------------------------------------------------------------------ */

export interface MessageDraft {
  nickname: string;
  email?: string;
  content: string;
}

export const portalApi = {
  categories: () => request<PortalCategory[]>('/public/categories'),
  videos: () => request<PortalVideo[]>('/public/videos'),
  articles: () => request<PortalArticle[]>('/public/articles'),
  graphics: () => request<PortalGraphic[]>('/public/graphics'),
  messages: () => request<PortalMessage[]>('/public/messages'),
  addMessage: (draft: MessageDraft) =>
    request<string>('/public/messages', {
      method: 'POST',
      body: JSON.stringify({ ...draft, status: 'PENDING' }),
    }),
};
