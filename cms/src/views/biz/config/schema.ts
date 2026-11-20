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

/** 编辑控件类型：文本框 / 图片上传（前端转 WebP 后走文件中心上传） */
export type ConfigControl = 'text' | 'upload';

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
];

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
