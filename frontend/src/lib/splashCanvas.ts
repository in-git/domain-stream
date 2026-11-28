/**
 * 开屏画布文档解析
 * ------------------------------------------------------------------
 * 后台「设置开屏」里编辑的两块画布（PC / 移动）以设计像素存进配置项
 * splashCanvas。客户端只需按百分比把它铺到屏幕上，所以这里只做容错解析，
 * 不做任何编辑相关逻辑；脏数据或旧配置统一回退到 null，由开屏组件走旧逻辑。
 */

export interface SplashTextNode {
  id: string;
  type: 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  /** 旋转角度（度），围绕节点中心 */
  rotation?: number;
  /** 允许该组件显示在画布外（后台组件配置里的「超出画布」） */
  overflow?: boolean;
  /** 是否可见，缺省可见；后台隐藏的组件客户端不渲染 */
  visible?: boolean;
  /** 系统固定组件（跳过开屏），不可删除 */
  fixed?: 'skip';
  text: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: 'left' | 'center' | 'right';
  /** 斜体 */
  italic?: boolean;
  /** 下划线 / 删除线，与 Leafer 的取值一致 */
  decoration?: 'none' | 'under' | 'delete' | 'under-delete';
}

export interface SplashImageNode {
  id: string;
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  /** 旋转角度（度），围绕节点中心 */
  rotation?: number;
  /** 允许该组件显示在画布外（后台组件配置里的「超出画布」） */
  overflow?: boolean;
  /** 是否可见，缺省可见；后台隐藏的组件客户端不渲染 */
  visible?: boolean;
  url: string;
  radius: number;
  opacity: number;
  /** 画面调节参数，缺省表示原图 */
  filter?: SplashFilterParams;
}

/** HTML 代码：后台画布录入的自定义片段，客户端按原样渲染 */
export interface SplashHtmlNode {
  id: string;
  type: 'html';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  overflow?: boolean;
  /** 是否可见，缺省可见；后台隐藏的组件客户端不渲染 */
  visible?: boolean;
  html: string;
  opacity: number;
}

export type SplashNode =
  | SplashTextNode
  | SplashImageNode
  | SplashRectNode
  | SplashEllipseNode
  | SplashSvgNode
  | SplashHtmlNode;

/** 矩形：后台画布里的基础色块 */
export interface SplashRectNode {
  id: string;
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  /** 旋转角度（度），围绕节点左上角 */
  rotation?: number;
  /** 允许该组件显示在画布外 */
  overflow?: boolean;
  /** 是否可见，缺省可见；后台隐藏的组件客户端不渲染 */
  visible?: boolean;
  fill: string;
  radius: number;
  opacity: number;
  stroke?: string;
  strokeWidth?: number;
}

/** 圆形 / 椭圆 */
export interface SplashEllipseNode {
  id: string;
  type: 'ellipse';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  overflow?: boolean;
  /** 是否可见，缺省可见；后台隐藏的组件客户端不渲染 */
  visible?: boolean;
  fill: string;
  opacity: number;
  stroke?: string;
  strokeWidth?: number;
}

/** SVG 图形：内置图形是 data URI，上传的 SVG 是后端存储路径 */
export interface SplashSvgNode {
  id: string;
  type: 'svg';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  overflow?: boolean;
  /** 是否可见，缺省可见；后台隐藏的组件客户端不渲染 */
  visible?: boolean;
  url: string;
  opacity: number;
}

export type SplashImageMode = 'fit' | 'cover' | 'stretch' | 'stretch-x' | 'stretch-y';

/** 画面调节：与后台 canvas-editor 的数值参数保持一致 */
export interface SplashFilterParams {
  brightness: number;
  contrast: number;
  saturate: number;
  hue: number;
  grayscale: number;
  sepia: number;
}

const DEFAULT_FILTER: SplashFilterParams = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hue: 0,
  grayscale: 0,
  sepia: 0,
};

const FILTER_LIMITS: { key: keyof SplashFilterParams; min: number; max: number }[] = [
  { key: 'brightness', min: 0, max: 200 },
  { key: 'contrast', min: 0, max: 200 },
  { key: 'saturate', min: 0, max: 200 },
  { key: 'hue', min: -180, max: 180 },
  { key: 'grayscale', min: 0, max: 100 },
  { key: 'sepia', min: 0, max: 100 },
];

function clampFilter(value: SplashFilterParams): SplashFilterParams {
  const result = { ...DEFAULT_FILTER };
  for (const field of FILTER_LIMITS) {
    result[field.key] = Math.min(field.max, Math.max(field.min, Math.round(value[field.key])));
  }
  return result;
}

function normalizeFilter(value: unknown): SplashFilterParams | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const row = value as Record<string, unknown>;
  const result = { ...DEFAULT_FILTER };
  for (const field of FILTER_LIMITS) {
    const num = Number(row[field.key]);
    if (Number.isFinite(num)) result[field.key] = num;
  }
  return clampFilter(result);
}

/** 旧版「预设风格 + 强度」换算为数值参数，兼容已保存的开屏配置 */
function legacyFilter(style: unknown, intensity?: number): SplashFilterParams | undefined {
  if (typeof style !== 'string' || style === 'none') return undefined;
  const p = Math.min(100, Math.max(0, Math.round(intensity ?? 100))) / 100;
  if (p <= 0) return undefined;
  const value = { ...DEFAULT_FILTER };
  switch (style) {
    case 'grayscale':
      value.grayscale = 100 * p;
      break;
    case 'sepia':
      value.sepia = 100 * p;
      break;
    case 'vintage':
      value.sepia = 45 * p;
      value.contrast = 100 - 10 * p;
      value.brightness = 100 + 6 * p;
      value.saturate = 100 - 20 * p;
      break;
    case 'warm':
      value.saturate = 100 + 25 * p;
      value.brightness = 100 + 5 * p;
      value.sepia = 18 * p;
      break;
    case 'cool':
      value.saturate = 100 + 15 * p;
      value.brightness = 100 + 3 * p;
      value.hue = -12 * p;
      break;
    case 'vivid':
      value.saturate = 100 + 80 * p;
      value.contrast = 100 + 12 * p;
      break;
    case 'fade':
      value.contrast = 100 - 25 * p;
      value.brightness = 100 + 10 * p;
      value.saturate = 100 - 45 * p;
      break;
    case 'drama':
      value.contrast = 100 + 30 * p;
      value.brightness = 100 - 8 * p;
      value.saturate = 100 + 15 * p;
      break;
    default:
      return undefined;
  }
  return clampFilter(value);
}

function filterIntensity(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? Math.min(100, Math.max(0, result)) : 100;
}

function isDefaultFilter(filter: SplashFilterParams): boolean {
  return FILTER_LIMITS.every((field) => filter[field.key] === DEFAULT_FILTER[field.key]);
}

/** 解析画面调节：优先读数值参数，旧版预设风格换算；默认值返回 undefined */
function parseFilter(
  value: unknown,
  legacyStyle?: unknown,
  legacyIntensity?: unknown
): SplashFilterParams | undefined {
  const result = normalizeFilter(value) ?? legacyFilter(legacyStyle, filterIntensity(legacyIntensity));
  return result && !isDefaultFilter(result) ? result : undefined;
}

/**
 * 滤镜 CSS：后台编辑器与客户端共用同一套 CSS filter 语法，保证所见即所得。
 * 默认参数返回空字符串，调用方不要设置 filter。
 */
export function splashFilterCss(filter?: Partial<SplashFilterParams>): string {
  if (!filter) return '';
  const value = { ...DEFAULT_FILTER, ...filter };
  const parts: string[] = [];
  if (value.brightness !== 100) parts.push(`brightness(${value.brightness / 100})`);
  if (value.contrast !== 100) parts.push(`contrast(${value.contrast / 100})`);
  if (value.saturate !== 100) parts.push(`saturate(${value.saturate / 100})`);
  if (value.hue !== 0) parts.push(`hue-rotate(${value.hue}deg)`);
  if (value.grayscale > 0) parts.push(`grayscale(${value.grayscale / 100})`);
  if (value.sepia > 0) parts.push(`sepia(${value.sepia / 100})`);
  return parts.join(' ');
}

export interface SplashOrientationDoc {
  width: number;
  height: number;
  background: string;
  /** 背景图（后端路径），空表示纯色底 */
  backgroundImage?: string;
  /** 背景视频（后端路径），与背景图可同时保留；是否渲染由 backgroundKind 决定 */
  backgroundVideo?: string;
  /** 背景视频封面（后端路径，视频模块带入）；渲染背景视频时作为 poster */
  backgroundVideoCover?: string;
  /** 背景模式：image 显示背景图，video 显示背景视频，缺省时有视频即视频 */
  backgroundKind?: 'image' | 'video';
  /** 背景素材铺法，缺省按等比铺满 */
  backgroundMode?: SplashImageMode;
  /** 背景画面调节参数（图片 / 视频背景共用），缺省表示原图 */
  backgroundFilter?: SplashFilterParams;
  /** 是否把元素限制在画布内（旧版画布级配置，现按组件存 overflow，这里保留兼容） */
  contained?: boolean;
  nodes: SplashNode[];
}

export interface SplashCanvasDoc {
  pc: SplashOrientationDoc;
  mobile: SplashOrientationDoc;
}

const SIZES = {
  pc: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function num(value: unknown, fallback: number): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

function color(value: unknown, fallback: string): string {
  const raw = typeof value === 'string' ? value.trim() : '';
  return HEX_COLOR.test(raw) ? raw : fallback;
}

function parseNode(
  raw: unknown,
  size: { width: number; height: number },
  index: number
): SplashNode | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === 'string' && row.id ? row.id : `n${index}`;
  const base = {
    id,
    x: num(row.x, 0),
    y: num(row.y, 0),
    width: num(row.width, size.width * 0.5),
    height: num(row.height, 48),
    rotation: num(row.rotation, 0),
    overflow: row.overflow === true ? true : undefined,
    visible: row.visible === false ? false : undefined,
    fixed: row.fixed === 'skip' ? ('skip' as const) : undefined,
  };

  if (row.type === 'text') {
    const align = row.align === 'left' || row.align === 'right' ? row.align : 'center';
    const decoration =
      row.decoration === 'under' ||
      row.decoration === 'delete' ||
      row.decoration === 'under-delete'
        ? row.decoration
        : 'none';
    return {
      ...base,
      type: 'text',
      text: typeof row.text === 'string' ? row.text : '',
      fontSize: num(row.fontSize, 24),
      fontWeight: num(row.fontWeight, 600),
      color: color(row.color, '#FFFFFF'),
      align,
      italic: row.italic === true,
      decoration,
    };
  }

  if (row.type === 'rect') {
    return {
      ...base,
      type: 'rect',
      fill: color(row.fill, '#FFFFFF'),
      radius: Math.max(0, num(row.radius, 0)),
      opacity: Math.min(1, Math.max(0, num(row.opacity, 1))),
      stroke: typeof row.stroke === 'string' && row.stroke.trim() ? color(row.stroke, '#000000') : undefined,
      strokeWidth: Math.max(0, num(row.strokeWidth, 0)) || undefined,
    };
  }

  if (row.type === 'ellipse') {
    return {
      ...base,
      type: 'ellipse',
      fill: color(row.fill, '#FFFFFF'),
      opacity: Math.min(1, Math.max(0, num(row.opacity, 1))),
      stroke: typeof row.stroke === 'string' && row.stroke.trim() ? color(row.stroke, '#000000') : undefined,
      strokeWidth: Math.max(0, num(row.strokeWidth, 0)) || undefined,
    };
  }

  if (row.type === 'html') {
    return {
      ...base,
      type: 'html',
      html: typeof row.html === 'string' ? row.html : '',
      opacity: Math.min(1, Math.max(0, num(row.opacity, 1))),
    };
  }

  if (row.type === 'svg') {
    return {
      ...base,
      type: 'svg',
      url: typeof row.url === 'string' ? row.url.trim() : '',
      opacity: Math.min(1, Math.max(0, num(row.opacity, 1))),
    };
  }

  if (row.type === 'image') {
    return {
      ...base,
      type: 'image',
      url: typeof row.url === 'string' ? row.url.trim() : '',
      radius: num(row.radius, 0),
      opacity: Math.min(1, Math.max(0, num(row.opacity, 1))),
      filter: parseFilter(row.filter, row.filterStyle, row.filterIntensity),
    };
  }

  return null;
}

function parseOrientation(raw: unknown, key: 'pc' | 'mobile'): SplashOrientationDoc {
  const size = SIZES[key];
  const doc: SplashOrientationDoc = {
    width: size.width,
    height: size.height,
    background: '#000000',
    nodes: [],
  };
  if (!raw || typeof raw !== 'object') return doc;
  const row = raw as Record<string, unknown>;
  doc.background = color(row.background, '#000000');
  doc.backgroundImage = typeof row.backgroundImage === 'string' ? row.backgroundImage.trim() : '';
  doc.backgroundVideo = typeof row.backgroundVideo === 'string' ? row.backgroundVideo.trim() : '';
  doc.backgroundVideoCover =
    typeof row.backgroundVideoCover === 'string' ? row.backgroundVideoCover.trim() : '';
  // 背景模式：图片 / 视频，两种素材都保留时按它只渲染其中一类；旧配置按「有视频即视频」
  doc.backgroundKind =
    row.backgroundKind === 'image' || row.backgroundKind === 'video'
      ? row.backgroundKind
      : doc.backgroundVideo
        ? 'video'
        : 'image';
  doc.backgroundMode =
    row.backgroundMode === 'fit' ||
    row.backgroundMode === 'cover' ||
    row.backgroundMode === 'stretch' ||
    row.backgroundMode === 'stretch-x' ||
    row.backgroundMode === 'stretch-y'
      ? row.backgroundMode
      :         // 脏数据 / 旧字段缺失时回退等比铺满（与旧版整屏素材的 object-cover 一致）
        'cover';
  doc.backgroundFilter = parseFilter(
    row.backgroundFilter,
    row.backgroundFilterStyle,
    row.backgroundFilterIntensity
  );
  doc.contained = row.contained === false ? false : undefined;

  const list = Array.isArray(row.nodes) ? row.nodes : [];
  const ids = new Set<string>();
  list.forEach((entry, index) => {
    const node = parseNode(entry, size, index);
    if (!node) return;
    if (ids.has(node.id)) return;
    ids.add(node.id);
    doc.nodes.push(node);
  });
  return doc;
}

/** 解析配置项；没有画布或解析失败返回 null（调用方回退旧版开屏） */
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
  // 只要存过画布结构就算有效（后台允许把组件全删光，此时只渲染底色 / 背景图）
  if (!row.pc && !row.mobile) return null;
  const pc = parseOrientation(row.pc, 'pc');
  const mobile = parseOrientation(row.mobile, 'mobile');
  return { pc, mobile };
}

export type SplashMode = 'video' | 'cover';

/**
 * 开屏形式：视频与封面画布互斥，只生效一种。
 * 老配置没有 splashType 时按「配了视频就播视频」推断。
 */
export function resolveSplashMode(config: Record<string, string>): SplashMode {
  const explicit = (config.splashType || '').trim();
  if (explicit === 'video' || explicit === 'cover') return explicit;
  const video =
    config.splashVideoLandscapeUrl ||
    config.splashVideoUrl ||
    config.splashVideoPortraitUrl ||
    '';
  return video.trim() ? 'video' : 'cover';
}
