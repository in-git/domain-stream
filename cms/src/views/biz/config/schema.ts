/**
 * 客户端配置属性定义（schema）
 * ------------------------------------------------------------------
 * 数据库里 CLIENT_CONFIG 存的是一个 JSON 对象，例如：
 *   { "title": "吴文龙的私域" }
 *
 * CMS 不直接暴露 JSON 编辑，而是由本文件定义「有哪些属性、怎么预览」。
 * 页面只让用户填值，属性名由 schema 决定。
 *
 * 后续要加新属性：在 CONFIG_FIELDS 里加一项即可，表单与预览会自动出现。
 */
import type { PageConfigItem } from '../../../lib/pageConfig.ts';

/**
 * 编辑控件类型：
 * - text    文本框
 * - upload  图片上传（前端转 WebP 后走文件中心上传）
 * - navList 侧边栏导航列表（值是 JSON 数组字符串，由专用编辑器维护）
 */
export type ConfigControl = 'text' | 'upload' | 'navList';

export interface ConfigFieldDef {
  /** JSON 中的属性名（回写数据库时使用） */
  key: string;
  /** 页面上显示的中文名 */
  label: string;
  /** 属性说明 */
  description?: string;
  /** 编辑控件类型，默认 text */
  control?: ConfigControl;
  /** 数据库中还没有该属性时的初始值 */
  defaultValue: string;
  placeholder?: string;
  /** 兼容旧数据里用过的属性名（读值时优先按 aliases 兜底） */
  aliases?: string[];
}

/** 客户端可配置属性清单 —— 新增属性只改这里 */
export const CONFIG_FIELDS: ConfigFieldDef[] = [
  {
    key: 'title',
    label: '网页标题',
    description: '浏览器标签页与站点顶部显示的名称',
    defaultValue: '吴文龙的私域',
    placeholder: '请输入网页标题',
  },
  {
    key: 'faviconUrl',
    label: '网页图标（favicon）',
    description: '浏览器标签页图标，上传后自动转 WebP 存入文件中心；留空用默认',
    control: 'upload',
    defaultValue: '',
  },
  {
    key: 'logoUrl',
    label: '网页 Logo',
    description: '侧边栏与登录页品牌图标，上传后自动转 WebP；留空用默认',
    control: 'upload',
    defaultValue: '',
  },
  {
    key: 'icpNo',
    label: 'ICP 备案号',
    description: '显示在客户端侧边栏底部，如：粤ICP备12345678号',
    defaultValue: '',
    placeholder: '请输入 ICP 备案号，留空则不显示',
    aliases: ['备案信息', '备案号'],
  },
  {
    key: 'policeNo',
    label: '公安备案号',
    description: '显示在 ICP 备案号下方，如：粤公网安备44030002000000号',
    defaultValue: '',
    placeholder: '请输入公安备案号，留空则不显示',
    aliases: ['公安备案信息', '公安备案号'],
  },
  {
    key: 'navItems',
    label: '侧边栏导航',
    description: '客户端左侧导航的模块与顺序，可新增、排序与显隐；改完保存后刷新客户端生效',
    control: 'navList',
    defaultValue: '',
  },
];

/* ------------------------------------------------------------------ */
/* 侧边栏导航                                                          */
/* ------------------------------------------------------------------ */

/** 前端可用的侧边栏图标标识，需与 frontend 的图标映射保持一致 */
export const NAV_ICON_OPTIONS = [
  { value: 'video', label: '视频' },
  { value: 'article', label: '文章' },
  { value: 'gallery', label: '图文' },
  { value: 'message', label: '留言' },
  { value: 'star', label: '收藏' },
  { value: 'music', label: '音乐' },
  { value: 'image', label: '图片' },
] as const;

export type NavIconKey = (typeof NAV_ICON_OPTIONS)[number]['value'];

/** 侧边栏导航项 */
export interface NavItemConfig {
  /** 唯一标识，前端用作 key；需对应 frontend 已存在的板块 id */
  id: string;
  /** 显示名称，限 4 个字符 */
  label: string;
  /** 图标地址（文件库图片）；留空时前台按 id 回退默认图标 */
  iconUrl?: string;
  /** 是否显示该导航 */
  enabled: boolean;
}

/** 导航名称最大长度：侧栏宽度有限，超过 4 个字会被截断 */
export const NAV_LABEL_MAX_LENGTH = 4;

/** 默认导航项，与 frontend 原有四个板块一致 */
export const DEFAULT_NAV_ITEMS: NavItemConfig[] = [
  { id: 'videos', label: '视频', enabled: true },
  { id: 'articles', label: '文章', enabled: true },
  { id: 'gallery', label: '图文', enabled: true },
  { id: 'messages', label: '留言', enabled: true },
];

/** 解析配置里的导航 JSON，异常时回退默认值 */
export function parseNavItems(raw: string | undefined): NavItemConfig[] {
  if (!raw || !raw.trim()) return DEFAULT_NAV_ITEMS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_NAV_ITEMS;
    const items: NavItemConfig[] = [];
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue;
      const row = entry as Record<string, unknown>;
      const id = typeof row.id === 'string' ? row.id.trim() : '';
      if (!id) continue;
      const iconUrl = typeof row.iconUrl === 'string' ? row.iconUrl.trim() : '';
      items.push({
        id,
        label:
          typeof row.label === 'string' && row.label.trim()
            ? row.label.trim().slice(0, NAV_LABEL_MAX_LENGTH)
            : id.slice(0, NAV_LABEL_MAX_LENGTH),
        // 图标仅保留文件库图片地址；旧数据里的 icon 标识会被忽略
        ...(iconUrl ? { iconUrl } : {}),
        // 兼容旧数据：未写 enabled 视为启用
        enabled: row.enabled !== false,
      });
    }
    return items.length ? items : DEFAULT_NAV_ITEMS;
  } catch {
    return DEFAULT_NAV_ITEMS;
  }
}

/** 序列化导航项，空列表写成空串 */
export function stringifyNavItems(items: NavItemConfig[]): string {
  return items.length ? JSON.stringify(items) : '';
}

/** 页面草稿：值 + 数据库中实际命中的属性名 */
export interface ConfigDraft {
  values: Record<string, string>;
  /** key 为 schema 属性名，value 为数据库中实际的属性名；null 表示尚未写入 */
  storedKeys: Record<string, string | null>;
}

/** 把后端返回的属性列表合并成草稿（缺失属性用默认值，兼容 aliases） */
export function draftFromItems(items: PageConfigItem[]): ConfigDraft {
  const stored = new Map(items.map((item) => [item.key, item.value]));
  const values: Record<string, string> = {};
  const storedKeys: Record<string, string | null> = {};

  for (const field of CONFIG_FIELDS) {
    let matchedKey: string | null = null;
    let value: string | undefined = stored.get(field.key);
    if (value !== undefined) {
      matchedKey = field.key;
    } else {
      for (const alias of field.aliases ?? []) {
        const aliasValue = stored.get(alias);
        if (aliasValue !== undefined) {
          value = aliasValue;
          matchedKey = alias;
          break;
        }
      }
    }
    values[field.key] = value ?? field.defaultValue;
    storedKeys[field.key] = matchedKey;
  }

  return { values, storedKeys };
}

/** 草稿生成将要写入数据库的 JSON（只包含 schema 中定义的属性） */
export function draftToJson(values: Record<string, string>): string {
  const json: Record<string, string> = {};
  for (const field of CONFIG_FIELDS) {
    json[field.key] = values[field.key] ?? field.defaultValue;
  }
  return JSON.stringify(json, null, 2);
}
