/**
 * 客户端配置属性定义（schema）
 * ------------------------------------------------------------------
 * 数据库里 CLIENT_CONFIG 存的是一个 JSON 对象，例如：
 *   { "title": "私域" }
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
 * - switch  布尔开关（值存 YES / NO）
 * - color   颜色选择（值存 #RRGGBB）
 * - number  数字输入（值存数字字符串，如 8）
 * - navList 侧边栏导航列表（值是 JSON 数组字符串，由专用编辑器维护）
 */
export type ConfigControl =
  | 'text'
  | 'upload'
  | 'switch'
  | 'color'
  | 'number'
  | 'navList'
  | 'contactList';

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
  /** 颜色控件的预设候选色 */
  presets?: { label: string; value: string }[];
  /** 兼容旧数据里用过的属性名（读值时优先按 aliases 兜底） */
  aliases?: string[];
}

/** 知名企业高亮色，供 CMS 配置时快速选取 */
export const THEME_COLOR_PRESETS: { label: string; value: string }[] = [
  { label: 'Apple', value: '#0071E3' },
  { label: 'Google', value: '#4285F4' },
  { label: 'Microsoft', value: '#0078D4' },
  { label: 'Meta', value: '#1877F2' },
  { label: 'Amazon', value: '#FF9900' },
  { label: 'Netflix', value: '#E50914' },
  { label: 'Spotify', value: '#1DB954' },
  { label: 'NVIDIA', value: '#76B900' },
  { label: 'Tesla', value: '#E82127' },
  { label: 'Adobe', value: '#EB1000' },
  { label: 'Coca-Cola', value: '#F40009' },
  { label: 'X', value: '#000000' },
];

/** 客户端「关于」页底部的联系方式条目 */
export interface ContactLink {
  label: string;
  url: string;
}

/** 初始联系方式；CMS 中可自由增删改，写回后前台不再使用硬编码链接 */
export const DEFAULT_CONTACT_LINKS: ContactLink[] = [
  {
    label: 'B 站',
    url: 'https://space.bilibili.com/3706965849016893?spm_id_from=333.1007.0.0',
  },
  { label: '抖音', url: 'https://www.douyin.com/' },
  { label: 'GitHub', url: 'https://github.com/in-git/domain-stream' },
];

/** 解析配置里的联系方式 JSON，兼容旧字段结构 */
export function parseContactLinks(raw?: string): ContactLink[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.reduce<ContactLink[]>((acc, entry) => {
      if (!entry || typeof entry !== 'object') return acc;
      const row = entry as Record<string, unknown>;
      const label =
        typeof row.label === 'string' && row.label.trim()
          ? row.label.trim()
          : typeof row.name === 'string' && row.name.trim()
            ? row.name.trim()
            : '';
      const url =
        typeof row.url === 'string' && row.url.trim()
          ? row.url.trim()
          : typeof row.href === 'string' && row.href.trim()
            ? row.href.trim()
            : '';
      acc.push({ label, url });
      return acc;
    }, []);
  } catch {
    return [];
  }
}

/** 序列化时保留空行，方便编辑器继续输入；渲染端会过滤无效条目 */
export function stringifyContactLinks(items: ContactLink[]): string {
  return JSON.stringify(
    items.map((item) => ({ label: item.label.trim(), url: item.url.trim() }))
  );
}

/** 客户端可配置属性清单 —— 新增属性只改这里 */
export const CONFIG_FIELDS: ConfigFieldDef[] = [
  {
    key: 'title',
    label: '网页标题',
    description: '浏览器标签页与站点顶部显示的名称',
    defaultValue: '私域',
    placeholder: '请输入网页标题',
  },
  {
    key: 'faviconUrl',
    label: '网页图标（favicon）',
    description: '浏览器标签页图标',
    control: 'upload',
    defaultValue: '',
  },
  {
    key: 'logoUrl',
    label: '网页 Logo',
    description: '侧边栏与登录页品牌图标',
    control: 'upload',
    defaultValue: '',
  },
  {
    key: 'themeColor',
    label: '高亮色',
    description: '按钮、链接与焦点状态的高亮色',
    control: 'color',
    defaultValue: '#0071E3',
    presets: THEME_COLOR_PRESETS,
  },
  {
    key: 'themeRadius',
    label: '圆角（px）',
    description: '全局圆角，留空回退为 8px',
    control: 'number',
    defaultValue: '8',
    placeholder: '8',
  },
  {
    key: 'clientUrl',
    label: '客户端地址',
    description: '前台客户端站点的访问地址，如：https://www.example.com',
    defaultValue: '',
    placeholder: '请输入客户端地址',
  },
  {
    key: 'contactLinks',
    label: '联系方式',
    description: '各大社交平台的链接',
    control: 'contactList',
    defaultValue: stringifyContactLinks(DEFAULT_CONTACT_LINKS),
  },
  {
    key: 'cmsUrl',
    label: 'CMS 地址',
    description: '本内容管理后台的访问地址，如：https://cms.example.com',
    defaultValue: '',
    placeholder: '请输入 CMS 地址',
  },
  {
    key: 'adminUrl',
    label: '开发后台地址',
    description: '后端服务/开发后台的访问地址，如：https://api.example.com',
    defaultValue: '',
    placeholder: '请输入开发后台地址',
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
    key: 'allowComment',
    label: '是否允许评论',
    description: '各个模块的评论总开关',
    control: 'switch',
    defaultValue: 'YES',
    aliases: ['enableComment', 'commentEnabled'],
  },
  {
    key: 'navItems',
    label: '客户端导航',
    description: 'PC 侧边栏与移动端底部导航共用的模块与顺序，可新增、排序与显隐；改完保存后刷新客户端生效',
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

/** 导航模块类型：内置页面或后台配置的占位模块 */
export type NavModuleType = 'builtin' | 'placeholder';

/** 客户端已内置、拥有真实页面的模块 key，自定义模块不可占用 */
export const BUILTIN_MODULE_KEYS: string[] = [
  'videos',
  'articles',
  'gallery',
  'messages',
  'profile',
  'settings',
];

/** 自定义模块 key 前缀，避免和内置页面 key 混淆 */
export const CUSTOM_MODULE_PREFIX = 'mod_';

/** 设置是内置模块预设，是否显示由导航配置决定 */
const SETTINGS_NAV_ITEM: NavItemConfig = {
  id: 'settings',
  moduleKey: 'settings',
  moduleType: 'builtin',
  label: '设置',
  enabled: true,
};

/** 侧边栏导航项 */
export interface NavItemConfig {
  /**
   * 兼容旧字段；写出时始终等于 moduleKey。
   * 客户端老版本仍按 id 匹配，新版本优先读 moduleKey。
   */
  id: string;
  /** 前台导航定位用的唯一标识；支持修改，改名/排序/换图标互不影响 */
  moduleKey: string;
  /**
   * 内置页面的真实板块标识。moduleKey 修改后仍按它渲染对应页面；
   * 自定义模块没有该字段。
   */
  sectionKey?: string;
  /** 模块类型；决定客户端渲染内置页面还是占位模块 */
  moduleType: NavModuleType;
  /** 显示名称，限 4 个字符 */
  label: string;
  /** 图标地址（文件库图片）；留空时前台按 moduleKey 回退默认图标 */
  iconUrl?: string;
  /** 是否显示该导航 */
  enabled: boolean;
}

/** 导航名称最大长度：侧栏宽度有限，超过 4 个字会被截断 */
export const NAV_LABEL_MAX_LENGTH = 4;

/** 根据真实页面标识推断类型，兼容没有 moduleType 的旧配置 */
export function inferNavModuleType(moduleKey: string, sectionKey?: string): NavModuleType {
  const pageKey = (sectionKey || moduleKey).trim();
  return BUILTIN_MODULE_KEYS.includes(pageKey) ? 'builtin' : 'placeholder';
}

/** 取导航项对应的内置页面标识；旧配置按 moduleKey 推断 */
export function resolveSectionKey(
  moduleKey: string,
  sectionKey?: string
): string | undefined {
  const raw = (sectionKey || '').trim();
  if (raw) return raw;
  return BUILTIN_MODULE_KEYS.includes((moduleKey || '').trim())
    ? (moduleKey || '').trim()
    : undefined;
}

const MODULE_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9_-]{0,39}$/;

/** 校验模块标识：唯一、格式合法，且不能占用其他内置页面的标识 */
export function validateNavModuleKey(
  value: string,
  options: { editingKey?: string; existingKeys: string[]; sectionKey?: string }
): string | null {
  const key = (value || '').trim();
  if (!key) return '请输入模块标识';
  if (!MODULE_KEY_PATTERN.test(key)) {
    return '模块标识需以字母开头，只能包含字母、数字、下划线或短横线，最多 40 个字符';
  }
  if (options.existingKeys.some((item) => item !== options.editingKey && item === key)) {
    return '模块标识已存在，请换一个';
  }
  if (BUILTIN_MODULE_KEYS.includes(key) && options.sectionKey !== key) {
    return '该标识为系统内置页面保留';
  }
  return null;
}

/** 生成不会和内置页面冲突的自定义模块 key */
export function createCustomModuleKey(existingKeys: string[]): string {
  const used = new Set(existingKeys);
  let key = '';
  do {
    key = `${CUSTOM_MODULE_PREFIX}${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
  } while (used.has(key));
  return key;
}

/** 默认导航项，与 frontend 原有四个板块一致 */
export const DEFAULT_NAV_ITEMS: NavItemConfig[] = [
  { id: 'videos', moduleKey: 'videos', moduleType: 'builtin', label: '视频', enabled: true },
  { id: 'articles', moduleKey: 'articles', moduleType: 'builtin', label: '文章', enabled: true },
  { id: 'gallery', moduleKey: 'gallery', moduleType: 'builtin', label: '图文', enabled: true },
  { id: 'messages', moduleKey: 'messages', moduleType: 'builtin', label: '留言', enabled: true },
  { ...SETTINGS_NAV_ITEM },
];

function parseModuleType(
  value: unknown,
  moduleKey: string,
  sectionKey?: string
): NavModuleType {
  if (value === 'builtin' || value === 'placeholder') return value;
  return inferNavModuleType(moduleKey, sectionKey);
}

/** 解析配置里的导航 JSON，异常时回退默认值 */
export function parseNavItems(raw: string | undefined): NavItemConfig[] {
  if (!raw || !raw.trim()) return DEFAULT_NAV_ITEMS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_NAV_ITEMS;
    const items: NavItemConfig[] = [];
    const seen = new Set<string>();
    for (const entry of parsed) {
      if (!entry || typeof entry !== 'object') continue;
      const row = entry as Record<string, unknown>;
      const moduleKey =
        typeof row.moduleKey === 'string' && row.moduleKey.trim()
          ? row.moduleKey.trim()
          : typeof row.id === 'string'
            ? row.id.trim()
            : '';
      if (!moduleKey || seen.has(moduleKey)) continue;
      seen.add(moduleKey);
      const sectionKey = resolveSectionKey(
        moduleKey,
        typeof row.sectionKey === 'string' ? row.sectionKey : undefined
      );
      const iconUrl = typeof row.iconUrl === 'string' ? row.iconUrl.trim() : '';
      const moduleType = parseModuleType(row.moduleType, moduleKey, sectionKey);
      items.push({
        id: moduleKey,
        moduleKey,
        ...(sectionKey ? { sectionKey } : {}),
        moduleType,
        label:
          typeof row.label === 'string' && row.label.trim()
            ? row.label.trim().slice(0, NAV_LABEL_MAX_LENGTH)
            : moduleKey.slice(0, NAV_LABEL_MAX_LENGTH),
        // 图标仅保留文件库图片地址；旧数据里的 icon 标识会被忽略
        ...(iconUrl ? { iconUrl } : {}),
        // 兼容旧数据：未写 enabled 视为启用
        enabled: row.enabled !== false,
      });
    }
    return items;
  } catch {
    return DEFAULT_NAV_ITEMS;
  }
}

/** 写出前统一模块 key、类型和去重，防止旧字段造成重复 key */
export function normalizeNavItems(items: NavItemConfig[]): NavItemConfig[] {
  const seen = new Set<string>();
  const result: NavItemConfig[] = [];
  for (const item of items) {
    const moduleKey = (item.moduleKey || item.id || '').trim();
    if (!moduleKey || seen.has(moduleKey)) continue;
    seen.add(moduleKey);
    const sectionKey = resolveSectionKey(moduleKey, item.sectionKey);
    const moduleType = parseModuleType(item.moduleType, moduleKey, sectionKey);
    const label = (item.label || moduleKey).trim().slice(0, NAV_LABEL_MAX_LENGTH) || moduleKey;
    const iconUrl = (item.iconUrl || '').trim();
    result.push({
      ...item,
      id: moduleKey,
      moduleKey,
      ...(sectionKey ? { sectionKey } : {}),
      moduleType,
      label,
      ...(iconUrl ? { iconUrl } : {}),
    });
  }
  return result;
}

/** 序列化导航项，空列表保留为 []，让前端可以显式清空导航 */
export function stringifyNavItems(items: NavItemConfig[]): string {
  const normalized = normalizeNavItems(items);
  return JSON.stringify(normalized);
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

    // 旧配置里 B 站/抖音/GitHub 是三个独立字段，首次打开时迁移为可编辑列表
    if (field.key === 'contactLinks' && value === undefined) {
      const legacy = [
        { label: 'B 站', url: stored.get('bilibiliUrl') || '' },
        { label: '抖音', url: stored.get('douyinUrl') || '' },
        { label: 'GitHub', url: stored.get('githubUrl') || '' },
      ].filter((item) => item.url);
      if (legacy.length) value = stringifyContactLinks(legacy);
    }

    values[field.key] = value ?? field.defaultValue;
    storedKeys[field.key] = matchedKey;
  }

  return { values, storedKeys };
}

/** 兼容 YES/NO、true/false、1/0 的布尔值解析 */
export function configSwitchOn(value?: string): boolean {
  const normalized = (value ?? '').trim().toUpperCase();
  if (!normalized) return true;
  return normalized !== 'NO' && normalized !== 'FALSE' && normalized !== '0';
}

/** 草稿生成将要写入数据库的 JSON（只包含 schema 中定义的属性） */
export function draftToJson(values: Record<string, string>): string {
  const json: Record<string, string> = {};
  for (const field of CONFIG_FIELDS) {
    json[field.key] = values[field.key] ?? field.defaultValue;
  }
  return JSON.stringify(json, null, 2);
}
