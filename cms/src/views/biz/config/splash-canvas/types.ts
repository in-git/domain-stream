/**
 * 开屏画布 —— 文档模型
 * ------------------------------------------------------------------
 * 画布本身来自通用组件 `components/canvas-editor`，这里只负责开屏特有的部分：
 *   - PC（1440×900）/ 移动端（390×844）两块独立画布的组织与序列化；
 *   - 库存 JSON 的容错解析、旧配置（标题位置、横竖屏图片）迁移。
 *
 * 存库结构（splashCanvas 配置项，整体是一个 JSON 字符串）：
 *   { "version": 1, "pc": { ... }, "mobile": { ... } }
 * 两个方向各存一份独立节点，互不影响。
 */
import {
  SPLASH_DEFAULT_STYLES,
  SPLASH_IMAGE_KEYS,
  SPLASH_TITLE_COLOR_KEY,
  SPLASH_TITLE_POS_KEYS,
  SPLASH_TITLE_SIZE_KEY,
  SPLASH_VIDEO_KEYS,
  parseSplashPosition,
} from '../schema';
import {
  createCanvasNodeId as createNodeId,
  isDefaultCanvasFilter,
  legacyCanvasFilter,
  normalizeCanvasFilter,
  round1,
  type CanvasDoc,
  type CanvasFilterParams,
  type CanvasImageMode,
  type CanvasNode,
  type CanvasTextAlign,
  type CanvasTextDecoration,
} from '../../../../components/canvas-editor/types';

export type SplashNodeType = CanvasNode['type'];
export type SplashImageMode = CanvasImageMode;
export type SplashTextAlign = CanvasTextAlign;
export type SplashOrientation = 'pc' | 'mobile';

/** 画布节点与文档直接复用通用组件模型 */
export type SplashNode = CanvasNode;
export type SplashOrientationDoc = CanvasDoc;

export interface SplashCanvasDoc {
  version: 1;
  pc: SplashOrientationDoc;
  mobile: SplashOrientationDoc;
}

export const SPLASH_CANVAS_BACKGROUND = '#000000';
export const SPLASH_CANVAS_SIZES: Record<SplashOrientation, { width: number; height: number }> = {
  pc: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const MAX_TEXT_LENGTH = 200;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function readNumber(value: unknown, fallback: number): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function readColor(value: unknown, fallback: string): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  return HEX_COLOR.test(raw) ? raw.toUpperCase() : fallback;
}

/** 背景素材铺法：只认五种，脏数据回退等比铺满（与旧版整屏素材的 object-cover 一致） */
function readMode(value: unknown): CanvasImageMode {
  return value === 'fit' || value === 'cover' || value === 'stretch' || value === 'stretch-x' || value === 'stretch-y'
    ? value
    : 'cover';
}

/** 旧版滤镜强度：0-100，非法值回退 100 */
function readIntensity(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 100;
}

/** 画面调节：优先读数值参数，旧版「预设风格 + 强度」换算；默认值返回 undefined 便于省略 */
function readFilter(
  value: unknown,
  legacyStyle?: unknown,
  legacyIntensity?: unknown
): CanvasFilterParams | undefined {
  const normalized = normalizeCanvasFilter(value);
  const result = normalized ?? legacyCanvasFilter(legacyStyle, readIntensity(legacyIntensity));
  return result && !isDefaultCanvasFilter(result) ? result : undefined;
}

/** 文本装饰：只认四种，脏数据回退无装饰 */
function readDecoration(value: unknown): CanvasTextDecoration {
  return value === 'under' || value === 'delete' || value === 'under-delete' ? value : 'none';
}

/** 分组 / 锁定属于编辑期状态，存一份保证再次打开画布时还原 */
function readGroupId(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** 序列化：坐标保留一位小数，压缩成单行 JSON */
export function stringifySplashCanvas(doc: SplashCanvasDoc): string {
  return JSON.stringify({
    version: 1,
    pc: normalizeOrientation(doc.pc, 'pc'),
    mobile: normalizeOrientation(doc.mobile, 'mobile'),
  });
}

function normalizeOrientation(
  doc: SplashOrientationDoc,
  orientation: SplashOrientation
): SplashOrientationDoc {
  const size = SPLASH_CANVAS_SIZES[orientation];
  return {
    width: size.width,
    height: size.height,
    background: readColor(doc.background, SPLASH_CANVAS_BACKGROUND),
    backgroundImage: (doc.backgroundImage || '').trim(),
    // 背景图 / 背景视频可同时保留，客户端渲染时视频优先
    backgroundVideo: (doc.backgroundVideo || '').trim(),
    // 视频封面：从视频模块选视频时带入，客户端渲染背景视频时作 poster
    backgroundVideoCover: (doc.backgroundVideoCover || '').trim(),
    backgroundMode: readMode(doc.backgroundMode),
    // 背景画面调节：默认值时省略
    backgroundFilter: readFilter(doc.backgroundFilter),
    // 画布级只保留视图交互：拖拽平移默认开，关掉时才写进 JSON
    allowPan: doc.allowPan === false ? false : undefined,
    nodes: doc.nodes.map((node) => normalizeNode(node, size)),
  };
}

function normalizeNode(node: SplashNode, _size: { width: number; height: number }): SplashNode {
  const base = {
    id: node.id || createNodeId(),
    x: round1(node.x),
    y: round1(node.y),
    width: Math.max(1, round1(node.width)),
    height: Math.max(1, round1(node.height)),
    // 旋转角度为 0 时不写进 JSON，避免每条节点都多一个无意义字段
    rotation: round1(node.rotation ?? 0) || undefined,
    locked: node.locked ? true : undefined,
    groupId: readGroupId(node.groupId),
    // 组件交互开关只在非默认值时写入：旋转 / 调整宽高默认开，倾斜 / 超出画布默认关
    allowRotate: node.allowRotate === false ? false : undefined,
    allowResize: node.allowResize === false ? false : undefined,
    allowSkew: node.allowSkew === true ? true : undefined,
    overflow: node.overflow === true ? true : undefined,
    fixed: node.fixed,
  };

  if (node.type === 'text') {
    return {
      ...base,
      type: 'text',
      text: node.text.slice(0, MAX_TEXT_LENGTH),
      fontSize: Math.max(6, Math.round(node.fontSize)),
      fontWeight: Math.round(clamp(node.fontWeight, 100, 900)),
      color: readColor(node.color, '#FFFFFF'),
      align: node.align,
      italic: node.italic ? true : undefined,
      decoration: node.decoration && node.decoration !== 'none' ? node.decoration : undefined,
    };
  }

  if (node.type === 'image') {
    return {
      ...base,
      type: 'image',
      url: node.url,
      mode: node.mode,
      radius: Math.max(0, round1(node.radius)),
      opacity: clamp(round1(node.opacity), 0, 1),
      // 画面调节：默认值时省略
      filter: readFilter(node.filter),
    };
  }

  if (node.type === 'rect') {
    return {
      ...base,
      type: 'rect',
      fill: readColor(node.fill, '#FFFFFF'),
      radius: Math.max(0, round1(node.radius)),
      opacity: clamp(round1(node.opacity), 0, 1),
      stroke: node.stroke ? readColor(node.stroke, '#000000') : undefined,
      strokeWidth: node.strokeWidth ? Math.max(0, round1(node.strokeWidth)) : undefined,
    };
  }

  if (node.type === 'ellipse') {
    return {
      ...base,
      type: 'ellipse',
      fill: readColor(node.fill, '#FFFFFF'),
      opacity: clamp(round1(node.opacity), 0, 1),
      stroke: node.stroke ? readColor(node.stroke, '#000000') : undefined,
      strokeWidth: node.strokeWidth ? Math.max(0, round1(node.strokeWidth)) : undefined,
    };
  }

  if (node.type === 'html') {
    return {
      ...base,
      type: 'html',
      html: typeof node.html === 'string' ? node.html : '',
      opacity: clamp(round1(node.opacity ?? 1), 0, 1),
    };
  }

  if (node.type === 'svg') {
    return {
      ...base,
      type: 'svg',
      // 内置图形是 data URI，上传的 SVG 是后端路径，都原样保留
      url: (node.url || '').trim(),
      preset: node.preset,
      color: node.color ? readColor(node.color, '#FFFFFF') : undefined,
      opacity: clamp(round1(node.opacity), 0, 1),
    };
  }

  return node;
}

function parseNode(raw: unknown, size: { width: number; height: number }): SplashNode | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const type = row.type;
  if (
    type !== 'text' &&
    type !== 'image' &&
    type !== 'rect' &&
    type !== 'ellipse' &&
    type !== 'svg' &&
    type !== 'html'
  ) {
    return null;
  }

  const base = {
    id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : createNodeId(),
    x: readNumber(row.x, 0),
    y: readNumber(row.y, 0),
    width: readNumber(row.width, size.width * 0.5),
    height: readNumber(row.height, 48),
    rotation: readNumber(row.rotation, 0),
    locked: row.locked === true ? true : undefined,
    groupId: readGroupId(row.groupId),
    allowRotate: row.allowRotate === false ? false : undefined,
    allowResize: row.allowResize === false ? false : undefined,
    allowSkew: row.allowSkew === true ? true : undefined,
    overflow: row.overflow === true ? true : undefined,
    fixed: row.fixed === 'skip' ? ('skip' as const) : undefined,
  };

  if (type === 'text') {
    const alignRaw = row.align;
    const align: SplashTextAlign =
      alignRaw === 'left' || alignRaw === 'right' ? alignRaw : 'center';
    return {
      ...base,
      type: 'text',
      text: typeof row.text === 'string' ? row.text.slice(0, MAX_TEXT_LENGTH) : '',
      fontSize: readNumber(row.fontSize, Math.round(size.width * 0.045)),
      fontWeight: readNumber(row.fontWeight, 600),
      color: readColor(row.color, '#FFFFFF'),
      align,
      italic: row.italic === true,
      decoration: readDecoration(row.decoration),
    };
  }

  if (type === 'rect') {
    return {
      ...base,
      type: 'rect',
      fill: readColor(row.fill, '#FFFFFF'),
      radius: Math.max(0, readNumber(row.radius, 0)),
      opacity: clamp(readNumber(row.opacity, 1), 0, 1),
      stroke:
        typeof row.stroke === 'string' && row.stroke.trim()
          ? readColor(row.stroke, '#000000')
          : undefined,
      strokeWidth: Math.max(0, readNumber(row.strokeWidth, 0)) || undefined,
    };
  }

  if (type === 'ellipse') {
    return {
      ...base,
      type: 'ellipse',
      fill: readColor(row.fill, '#FFFFFF'),
      opacity: clamp(readNumber(row.opacity, 1), 0, 1),
      stroke:
        typeof row.stroke === 'string' && row.stroke.trim()
          ? readColor(row.stroke, '#000000')
          : undefined,
      strokeWidth: Math.max(0, readNumber(row.strokeWidth, 0)) || undefined,
    };
  }

  if (type === 'html') {
    return {
      ...base,
      type: 'html',
      html: typeof row.html === 'string' ? row.html : '',
      opacity: clamp(readNumber(row.opacity, 1), 0, 1),
    };
  }

  if (type === 'svg') {
    return {
      ...base,
      type: 'svg',
      url: typeof row.url === 'string' ? row.url.trim() : '',
      preset:
        typeof row.preset === 'string' && row.preset.trim() ? row.preset.trim() : undefined,
      color:
        typeof row.color === 'string' && row.color.trim()
          ? readColor(row.color, '#FFFFFF')
          : undefined,
      opacity: clamp(readNumber(row.opacity, 1), 0, 1),
    };
  }

  const modeRaw = row.mode;
  const mode: SplashImageMode =
    modeRaw === 'stretch' || modeRaw === 'stretch-x' || modeRaw === 'stretch-y'
      ? modeRaw
      : 'fit';
  return {
    ...base,
    type: 'image',
    url: typeof row.url === 'string' ? row.url.trim() : '',
    mode,
    radius: readNumber(row.radius, 0),
    opacity: readNumber(row.opacity, 1),
    filter: readFilter(row.filter, row.filterStyle, row.filterIntensity),
  };
}

/** 解析库存 JSON；空值或整体非法返回 null，由调用方决定回退默认文档 */
export function parseSplashCanvas(raw?: string): SplashCanvasDoc | null {
  const value = (raw || '').trim();
  if (!value) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const row = parsed as Record<string, unknown>;
  // 只要存过画布结构就算有效（允许用户把组件全删光，此时应该什么都不要渲染）
  if (!row.pc && !row.mobile) return null;
  const pc = parseOrientation(row.pc, 'pc');
  const mobile = parseOrientation(row.mobile, 'mobile');
  return ensureSkipNode({ version: 1, pc, mobile });
}

/**
 * 移动端画布固定带一个「跳过开屏」文本组件：
 * 不可删除，设计师只负责调整位置与样式，客户端用它渲染跳过按钮。
 */
function skipTextNode(size: { width: number; height: number }): CanvasNode {
  const width = Math.max(64, Math.round(size.width * 0.24));
  return {
    id: 'sys-skip',
    type: 'text',
    fixed: 'skip',
    text: '跳过开屏',
    x: size.width - width - 16,
    y: 24,
    width,
    height: 28,
    fontSize: size.width >= 600 ? 16 : 13,
    fontWeight: 500,
    color: '#FFFFFF',
    align: 'right',
  };
}

function ensureSkipNode(doc: SplashCanvasDoc): SplashCanvasDoc {
  if (doc.mobile.nodes.some((node) => node.fixed === 'skip')) return doc;
  return {
    ...doc,
    mobile: { ...doc.mobile, nodes: [...doc.mobile.nodes, skipTextNode(doc.mobile)] },
  };
}

function parseOrientation(
  raw: unknown,
  orientation: SplashOrientation
): SplashOrientationDoc {
  const size = SPLASH_CANVAS_SIZES[orientation];
  const base: SplashOrientationDoc = {
    width: size.width,
    height: size.height,
    background: SPLASH_CANVAS_BACKGROUND,
    nodes: [],
  };
  if (!raw || typeof raw !== 'object') return base;
  const row = raw as Record<string, unknown>;
  base.background = readColor(row.background, SPLASH_CANVAS_BACKGROUND);
  base.backgroundImage = typeof row.backgroundImage === 'string' ? row.backgroundImage.trim() : '';
  base.backgroundVideo = typeof row.backgroundVideo === 'string' ? row.backgroundVideo.trim() : '';
  base.backgroundVideoCover =
    typeof row.backgroundVideoCover === 'string' ? row.backgroundVideoCover.trim() : '';
  base.backgroundMode = readMode(row.backgroundMode);
  base.backgroundFilter = readFilter(
    row.backgroundFilter,
    row.backgroundFilterStyle,
    row.backgroundFilterIntensity
  );
  // 画布级只保留视图交互：拖拽平移
  base.allowPan = row.allowPan === false ? false : undefined;

  const list = Array.isArray(row.nodes) ? row.nodes : [];
  const ids = new Set<string>();
  for (const entry of list) {
    const node = parseNode(entry, size);
    if (!node) continue;
    if (ids.has(node.id)) node.id = createNodeId();
    ids.add(node.id);
    base.nodes.push(node);
  }
  return base;
}

/* ------------------------------------------------------------------ */
/* 旧配置迁移                                                          */
/* ------------------------------------------------------------------ */

function readLegacyNumber(raw: string | undefined, fallback: number): number {
  const value = Number((raw || '').trim());
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * 默认文档：新版默认画布是空的，由用户自己往画布里加组件。
 * 只有旧版开屏配置过内容（位置 / 字号 / 图片等）时才迁移成节点，
 * 避免升级后老站点开屏内容丢失。
 */
export function createDefaultCanvasDoc(values: Record<string, string> = {}): SplashCanvasDoc {
  return ensureSkipNode({
    version: 1,
    pc: createOrientationDoc('pc', values),
    mobile: createOrientationDoc('mobile', values),
  });
}

/** 旧版开屏是否配置过内容：只看开屏专属字段，网页标题等无关配置不算 */
function hasLegacySplashConfig(values: Record<string, string>): boolean {
  const keys = [
    ...SPLASH_TITLE_POS_KEYS,
    ...SPLASH_IMAGE_KEYS,
    ...SPLASH_VIDEO_KEYS,
    SPLASH_TITLE_SIZE_KEY,
    SPLASH_TITLE_COLOR_KEY,
  ];
  return keys.some((key) => (values[key] || '').trim().length > 0);
}

function createOrientationDoc(
  orientation: SplashOrientation,
  values: Record<string, string>
): SplashOrientationDoc {
  const landscape = orientation === 'pc';
  const size = SPLASH_CANVAS_SIZES[orientation];
  if (!hasLegacySplashConfig(values)) {
    return {
      width: size.width,
      height: size.height,
      background: SPLASH_CANVAS_BACKGROUND,
      nodes: [],
    };
  }
  // 旧版「视频开屏」迁移：横屏视频 → PC 画布背景视频，竖屏视频 → 移动画布背景视频。
  // 开屏形式开关已移除，客户端只按背景素材类型判断渲染。
  const legacyVideo = (values[SPLASH_VIDEO_KEYS[landscape ? 0 : 1]] || '').trim();
  if (legacyVideo) {
    return {
      width: size.width,
      height: size.height,
      background: SPLASH_CANVAS_BACKGROUND,
      backgroundVideo: legacyVideo,
      // 旧版整屏视频是 object-cover 渲染的，迁移成等比铺满保持视觉一致
      backgroundMode: 'cover',
      nodes: [],
    };
  }
  const titlePos = parseSplashPosition(
    values[SPLASH_TITLE_POS_KEYS[landscape ? 0 : 1]],
    { x: 50, y: landscape ? 34 : 38 }
  );
  const titleSize = readLegacyNumber(
    values[SPLASH_TITLE_SIZE_KEY],
    landscape ? SPLASH_DEFAULT_STYLES.titleSize : 30
  );
  const titleColor = readColor(values[SPLASH_TITLE_COLOR_KEY], '#FFFFFF');

  const titleWidth = Math.round(size.width * 0.8);
  const titleHeight = Math.round(titleSize * 1.4);
  const titleY = Math.round((titlePos.y / 100) * size.height);
  const titleX = Math.round((titlePos.x / 100) * size.width - titleWidth / 2);

  const subtitleSize = Math.max(12, Math.round(titleSize * 0.55));
  const subtitleHeight = Math.round(subtitleSize * 1.4);
  const subtitleWidth = Math.round(size.width * 0.72);
  const gap = Math.round(size.height * 0.015);
  const subtitleY = titleY + titleHeight + gap;

  // 旧版「横屏/竖屏图片」迁移成画布最底层的整屏图片，素材不丢
  const legacyImageKey = SPLASH_IMAGE_KEYS[landscape ? 0 : 1];
  const fallbackImageKey = SPLASH_IMAGE_KEYS[landscape ? 1 : 0];
  const legacyImage = (
    values[legacyImageKey] ||
    values[fallbackImageKey] ||
    ''
  ).trim();

  const nodes: SplashNode[] = [
    {
      id: createNodeId(),
      type: 'text',
      x: titleX,
      y: titleY,
      width: titleWidth,
      height: titleHeight,
      text: (values.title || '').trim() || '私域',
      fontSize: titleSize,
      fontWeight: 600,
      color: titleColor,
      align: 'center',
    },
    {
      id: createNodeId(),
      type: 'text',
      x: Math.round((size.width - subtitleWidth) / 2),
      y: subtitleY,
      width: subtitleWidth,
      height: subtitleHeight,
      text: '副标题',
      fontSize: subtitleSize,
      fontWeight: 400,
      color: '#C7C7CC',
      align: 'center',
    },
  ];

  if (legacyImage) {
    nodes.unshift({
      id: createNodeId(),
      type: 'image',
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
      url: legacyImage,
      mode: 'stretch',
      radius: 0,
      opacity: 1,
    });
  }

  return {
    width: size.width,
    height: size.height,
    background: SPLASH_CANVAS_BACKGROUND,
    nodes,
  };
}

/** 概要：给配置页摘要行显示已配置的节点数量 */
export function countCanvasNodes(raw?: string): number {
  const doc = parseSplashCanvas(raw);
  if (!doc) return 0;
  return doc.pc.nodes.length + doc.mobile.nodes.length;
}
