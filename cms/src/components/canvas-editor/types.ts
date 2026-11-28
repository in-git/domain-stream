/**
 * 通用画布编辑器 —— 文档模型
 * ------------------------------------------------------------------
 * 与具体业务解耦的「可拖拽画布」模型：画布是一份设计像素尺寸的文档，
 * 里面的节点有文本 / 图片 / 进度条 / 矩形 / 圆形 / SVG，坐标和尺寸都按设计像素存，
 * 展示端再按百分比换算，任何分辨率下比例都一致。
 *
 * 调用方只需要提供 { width, height, background, nodes } 即可渲染，
 * 存库格式、多套尺寸（如 PC / 移动端）由调用方自己组织。
 */
export type CanvasNodeType = 'text' | 'image' | 'rect' | 'ellipse' | 'svg' | 'html';
/**
 * 图片 / 背景素材的填充方式。
 * 与前台 CSS 的 object-fit 语义一一对应（见 imageBoxFor 的注释）：
 *   fit        → contain（完整显示，可能留边）
 *   cover      → cover（等比放大铺满，超出部分裁掉）
 *   stretch    → fill（强制变形铺满）
 *   stretch-x  → 宽撑满、高等比（可能上下溢出）
 *   stretch-y  → 高撑满、宽等比（可能左右溢出）
 */
export type CanvasImageMode = 'fit' | 'cover' | 'stretch' | 'stretch-x' | 'stretch-y';
export type CanvasTextAlign = 'left' | 'center' | 'right';
/** 多选对齐方式：水平按左/中/右，垂直按顶/中/底 */
export type CanvasAlignMode = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
/** 文本装饰，和 Leafer 的 textDecoration 对齐 */
export type CanvasTextDecoration = 'none' | 'under' | 'delete' | 'under-delete';

export interface CanvasSize {
  width: number;
  height: number;
}

/** 图片填充方式：决定图片加入画布时的初始框（之后仍可自由拖拽缩放） */
export const CANVAS_IMAGE_MODES: { value: CanvasImageMode; label: string }[] = [
  { value: 'cover', label: '等比铺满' },
  { value: 'fit', label: '原比例' },
  { value: 'stretch', label: '拉伸铺满' },
  { value: 'stretch-x', label: '横向拉伸' },
  { value: 'stretch-y', label: '纵向拉伸' },
];

/**
 * 画面调节（图片节点 / 画布背景共用）。
 * 编辑器里通过 Leafer 的 @leafer-in/filter 插件渲染（同一套 CSS filter 语法），
 * 客户端直接用 CSS filter，两边视觉效果一致。
 */
export interface CanvasFilterParams {
  /** 亮度 0-200，100 为原图 */
  brightness: number;
  /** 对比度 0-200，100 为原图 */
  contrast: number;
  /** 饱和度 0-200，100 为原图 */
  saturate: number;
  /** 色相 -180-180 度，0 为原图 */
  hue: number;
  /** 灰度 0-100，0 为原图 */
  grayscale: number;
  /** 复古（棕调）0-100，0 为原图 */
  sepia: number;
}

export const DEFAULT_CANVAS_FILTER: CanvasFilterParams = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hue: 0,
  grayscale: 0,
  sepia: 0,
};

/** 面板上的数值项：与 CanvasFilterParams 字段一一对应 */
export const CANVAS_FILTER_FIELDS: {
  key: keyof CanvasFilterParams;
  label: string;
  min: number;
  max: number;
  unit: string;
}[] = [
  { key: 'brightness', label: '亮度', min: 0, max: 200, unit: '%' },
  { key: 'contrast', label: '对比度', min: 0, max: 200, unit: '%' },
  { key: 'saturate', label: '饱和度', min: 0, max: 200, unit: '%' },
  { key: 'hue', label: '色相', min: -180, max: 180, unit: '°' },
  { key: 'grayscale', label: '灰度', min: 0, max: 100, unit: '%' },
  { key: 'sepia', label: '复古', min: 0, max: 100, unit: '%' },
];

/** 解析库存 / 外部传入的调节参数：缺失字段回退默认值，并夹到合法区间 */
export function normalizeCanvasFilter(value: unknown): CanvasFilterParams | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const row = value as Record<string, unknown>;
  const result = { ...DEFAULT_CANVAS_FILTER };
  for (const field of CANVAS_FILTER_FIELDS) {
    const num = Number(row[field.key]);
    if (!Number.isFinite(num)) continue;
    result[field.key] = Math.min(field.max, Math.max(field.min, Math.round(num)));
  }
  return result;
}

export function isDefaultCanvasFilter(filter?: CanvasFilterParams): boolean {
  if (!filter) return true;
  return CANVAS_FILTER_FIELDS.every((field) => filter[field.key] === DEFAULT_CANVAS_FILTER[field.key]);
}

/** 两个调节参数是否一致（用于外部文档同步判断） */
export function sameCanvasFilter(
  a?: CanvasFilterParams,
  b?: CanvasFilterParams
): boolean {
  if (!a || !b) return a === b;
  return CANVAS_FILTER_FIELDS.every((field) => a[field.key] === b[field.key]);
}

/** 生成 CSS filter；全部为默认值时返回空字符串，表示不加滤镜 */
export function filterCss(filter?: Partial<CanvasFilterParams>): string {
  if (!filter) return '';
  const value = { ...DEFAULT_CANVAS_FILTER, ...filter };
  const parts: string[] = [];
  if (value.brightness !== 100) parts.push(`brightness(${value.brightness / 100})`);
  if (value.contrast !== 100) parts.push(`contrast(${value.contrast / 100})`);
  if (value.saturate !== 100) parts.push(`saturate(${value.saturate / 100})`);
  if (value.hue !== 0) parts.push(`hue-rotate(${value.hue}deg)`);
  if (value.grayscale > 0) parts.push(`grayscale(${value.grayscale / 100})`);
  if (value.sepia > 0) parts.push(`sepia(${value.sepia / 100})`);
  return parts.join(' ');
}

/** 旧版预设风格，仅用于读取历史配置时换算成数值参数 */
export type LegacyCanvasFilterStyle =
  | 'none'
  | 'grayscale'
  | 'sepia'
  | 'vintage'
  | 'warm'
  | 'cool'
  | 'vivid'
  | 'fade'
  | 'drama';

/** 旧版「预设风格 + 强度」换算为数值参数；未知风格或强度为 0 返回 undefined */
export function legacyCanvasFilter(
  style: unknown,
  intensity?: number
): CanvasFilterParams | undefined {
  if (typeof style !== 'string' || style === 'none') return undefined;
  const p = Math.min(100, Math.max(0, Math.round(intensity ?? 100))) / 100;
  if (p <= 0) return undefined;
  const value = { ...DEFAULT_CANVAS_FILTER };
  switch (style as LegacyCanvasFilterStyle) {
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
  return normalizeCanvasFilter(value);
}

/** 所有节点共用的几何与状态字段 */
export interface CanvasNodeBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** 旋转角度（度），顺时针为正；渲染时绕节点左上角旋转（与前台 CSS transform-origin: 0 0 一致） */
  rotation?: number;
  /** 锁定后不能在画布上选中 / 拖动，仍可右键解锁 */
  locked?: boolean;
  /** 是否可见，不写默认可见；隐藏后画布与客户端都不渲染该组件 */
  visible?: boolean;
  /** 同组节点会一起选中、一起移动 */
  groupId?: string;
  /** 组件交互开关：不写进 JSON 就用默认值（旋转 / 调整宽高默认开启，倾斜默认关闭） */
  allowRotate?: boolean;
  allowResize?: boolean;
  allowSkew?: boolean;
  /** 允许拖出画布做溢出效果，默认 false（限制在画布内） */
  overflow?: boolean;
  /** 系统固定组件（如「跳过开屏」），不可删除 */
  fixed?: 'skip';
}

export interface CanvasTextNode extends CanvasNodeBase {
  type: 'text';
  text: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: CanvasTextAlign;
  /** 斜体 */
  italic?: boolean;
  /** 下划线 / 删除线 */
  decoration?: CanvasTextDecoration;
}

export interface CanvasImageNode extends CanvasNodeBase {
  type: 'image';
  /** 后端返回的存储路径，展示时由调用方补代理前缀 */
  url: string;
  mode: CanvasImageMode;
  radius: number;
  opacity: number;
  /** 画面调节参数，缺省表示原图 */
  filter?: CanvasFilterParams;
}

/** 几何框，绘制图形时由拖拽范围决定 */
export type CanvasNodeBox = Pick<CanvasNodeBase, 'x' | 'y' | 'width' | 'height'>;

export interface CanvasRectNode extends CanvasNodeBase {
  type: 'rect';
  fill: string;
  radius: number;
  opacity: number;
  /** 描边颜色；不写表示无描边 */
  stroke?: string;
  /** 描边宽度（设计像素） */
  strokeWidth?: number;
}

export interface CanvasEllipseNode extends CanvasNodeBase {
  type: 'ellipse';
  fill: string;
  opacity: number;
  /** 描边颜色；不写表示无描边 */
  stroke?: string;
  /** 描边宽度（设计像素） */
  strokeWidth?: number;
}

export interface CanvasSvgNode extends CanvasNodeBase {
  type: 'svg';
  /** 图片地址：内置图形的 data URI，或上传 SVG 的后端存储路径 */
  url: string;
  /** 内置图形标识；上传的 SVG 没有该字段 */
  preset?: string;
  /** 内置图形的着色（改色时按它重新生成 data URI） */
  color?: string;
  opacity: number;
}

/** HTML 代码组件：画布内以代码占位显示，客户端开屏按原始 HTML 渲染 */
export interface CanvasHtmlNode extends CanvasNodeBase {
  type: 'html';
  /** 用户输入的 HTML 片段 */
  html: string;
  opacity: number;
}

export type CanvasNode =
  | CanvasTextNode
  | CanvasImageNode
  | CanvasRectNode
  | CanvasEllipseNode
  | CanvasSvgNode
  | CanvasHtmlNode;

export interface CanvasDoc extends CanvasSize {
  background: string;
  /** 背景图（后端存储路径），空表示只用纯色底 */
  backgroundImage?: string;
  /** 背景视频（后端存储路径）；与背景图可同时存在，客户端按 backgroundKind 决定显示哪一类，编辑器里只取首帧做静态预览 */
  backgroundVideo?: string;
  /** 背景素材类型：图片 / 视频，客户端开屏按它渲染，旧配置缺省时有视频即视频 */
  backgroundKind?: 'image' | 'video';
  /** 背景视频封面（后端存储路径，来自视频模块记录）；编辑器与客户端渲染背景视频时作为 poster，免去抽帧 */
  backgroundVideoCover?: string;
  /** 背景素材铺法：等比铺满 / 原比例 / 拉伸铺满 / 横向拉伸 / 纵向拉伸，图片与视频共用，默认等比铺满 */
  backgroundMode?: CanvasImageMode;
  /** 背景画面调节参数（图片 / 视频背景共用），缺省表示原图 */
  backgroundFilter?: CanvasFilterParams;
  /** 画布视图交互开关：是否允许空格 + 拖动平移画布，默认开启 */
  allowPan?: boolean;
  nodes: CanvasNode[];
}

/** 配置里存纯后端路径，展示时补回 /snowy 代理前缀 */
export function previewUrl(raw: string): string {
  const value = (raw || '').trim();
  if (!value) return '';
  if (
    value.startsWith('/snowy') ||
    value.startsWith('http') ||
    value.startsWith('blob:') ||
    value.startsWith('data:')
  ) {
    return value;
  }
  return `/snowy${value}`;
}

/** 节点标识：时间戳 + 随机串，避免同一时刻连续新增撞号 */
export function createCanvasNodeId(): string {
  return `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 编组标识：同 groupId 的节点一起选中、一起移动 */
export function createCanvasGroupId(): string {
  return `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** 文本装饰的中文名，属性面板与解析共用 */
export const CANVAS_TEXT_DECORATIONS: { value: CanvasTextDecoration; label: string }[] = [
  { value: 'none', label: '无' },
  { value: 'under', label: '下划线' },
  { value: 'delete', label: '删除线' },
  { value: 'under-delete', label: '下划线 + 删除线' },
];

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * 图片 / 背景素材按模式换算成画布里的框（编辑器侧唯一实现）。
 * 前台用 CSS 渲染同一语义（object-fit / auto 尺寸），两边必须保持等价：
 *   fit        ≈ object-fit: contain
 *   cover      ≈ object-fit: cover（等比放大铺满，超出被裁切框裁掉）
 *   stretch    ≈ object-fit: fill
 *   stretch-x  ≈ width: 100% + height: auto 垂直居中
 *   stretch-y  ≈ height: 100% + width: auto 水平居中
 */
export function imageBoxFor(
  mode: CanvasImageMode,
  natural: CanvasSize,
  canvas: CanvasSize
): { x: number; y: number; width: number; height: number } {
  const nw = natural.width > 0 ? natural.width : canvas.width;
  const nh = natural.height > 0 ? natural.height : canvas.height;
  const ratio = nw / nh;

  if (mode === 'stretch') {
    return { x: 0, y: 0, width: canvas.width, height: canvas.height };
  }

  if (mode === 'stretch-x') {
    const height = canvas.width / ratio;
    return {
      x: 0,
      y: round1((canvas.height - height) / 2),
      width: canvas.width,
      height: round1(height),
    };
  }

  if (mode === 'stretch-y') {
    const width = canvas.height * ratio;
    return {
      x: round1((canvas.width - width) / 2),
      y: 0,
      width: round1(width),
      height: canvas.height,
    };
  }

  // 等比铺满（cover）：等比放大到完全覆盖画布，超出部分由裁切框裁掉
  if (mode === 'cover') {
    const scale = Math.max(canvas.width / nw, canvas.height / nh);
    const width = round1(nw * scale);
    const height = round1(nh * scale);
    return {
      x: round1((canvas.width - width) / 2),
      y: round1((canvas.height - height) / 2),
      width,
      height,
    };
  }

  // 原比例（fit）：完整显示，居中铺在画布内
  const scale = Math.min(canvas.width / nw, canvas.height / nh);
  const width = round1(nw * scale);
  const height = round1(nh * scale);
  return {
    x: round1((canvas.width - width) / 2),
    y: round1((canvas.height - height) / 2),
    width,
    height,
  };
}

export function createImageNode(
  canvas: CanvasSize,
  url: string,
  mode: CanvasImageMode,
  natural: CanvasSize
): CanvasImageNode {
  const box = imageBoxFor(mode, natural, canvas);
  return {
    id: createCanvasNodeId(),
    type: 'image',
    ...box,
    url,
    mode,
    radius: 0,
    opacity: 1,
  };
}

/** 新增文本：默认落在画布水平居中、纵向中间偏上的位置，框宽按文字实际宽度给 */
export function createTextNode(
  canvas: CanvasSize,
  text: string,
  options: {
    fontSize?: number;
    fontWeight?: number;
    color?: string;
    align?: CanvasTextAlign;
    width?: number;
  } = {}
): CanvasTextNode {
  const fontSize = options.fontSize ?? (canvas.width >= 1000 ? 48 : 24);
  const width =
    options.width && options.width > 0
      ? Math.round(options.width)
      : Math.round(canvas.width * 0.8);
  const height = Math.round(fontSize * 1.4);
  return {
    id: createCanvasNodeId(),
    type: 'text',
    x: Math.round((canvas.width - width) / 2),
    y: Math.round(canvas.height * 0.46),
    width,
    height,
    text: text || '文本',
    fontSize,
    fontWeight: options.fontWeight ?? 600,
    color: options.color ?? '#FFFFFF',
    align: options.align ?? 'center',
  };
}

/** 新增 HTML 代码组件：代码由弹窗输入，画布里显示占位预览 */
export function createHtmlNode(
  canvas: CanvasSize,
  html: string,
  box?: CanvasNodeBox
): CanvasHtmlNode {
  const width = box?.width ?? Math.min(Math.round(canvas.width * 0.5), 480);
  const height = box?.height ?? 160;
  return {
    id: createCanvasNodeId(),
    type: 'html',
    x: box?.x ?? Math.round((canvas.width - width) / 2),
    y: box?.y ?? Math.round((canvas.height - height) / 2),
    width,
    height,
    html,
    opacity: 1,
  };
}

/** 内置矢量图形：path 取 24×24 视图里的 Material 图标路径 */
export const CANVAS_SVG_PRESETS: { value: string; label: string; path: string }[] = [
  {
    value: 'star',
    label: '星形',
    path: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  },
  {
    value: 'heart',
    label: '心形',
    path: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  },
  {
    value: 'check',
    label: '对勾',
    path: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  },
  {
    value: 'arrow',
    label: '箭头',
    path: 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z',
  },
  {
    value: 'plus',
    label: '加号',
    path: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
  },
  {
    value: 'bolt',
    label: '闪电',
    path: 'M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z',
  },
];

/** 内置图形转 data URI：颜色直接写进 SVG，编辑器和前台都按图片渲染 */
export function svgPresetUrl(preset: string, color: string): string {
  const item = CANVAS_SVG_PRESETS.find((row) => row.value === preset) ?? CANVAS_SVG_PRESETS[0];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="${item.path}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/** 新增图形：默认落在画布居中；传入 box 时用拖拽画出来的框 */
export function createRectNode(
  canvas: CanvasSize,
  options: { box?: CanvasNodeBox; fill?: string } = {}
): CanvasRectNode {
  const width = canvas.width >= 1000 ? 240 : 120;
  const height = Math.round(width * 0.65);
  return {
    id: createCanvasNodeId(),
    type: 'rect',
    ...(options.box ?? {
      x: Math.round((canvas.width - width) / 2),
      y: Math.round((canvas.height - height) / 2),
      width,
      height,
    }),
    fill: options.fill ?? '#FFFFFF',
    radius: 0,
    opacity: 1,
  };
}

export function createEllipseNode(
  canvas: CanvasSize,
  options: { box?: CanvasNodeBox; fill?: string } = {}
): CanvasEllipseNode {
  const width = canvas.width >= 1000 ? 240 : 120;
  const height = Math.round(width * 0.65);
  return {
    id: createCanvasNodeId(),
    type: 'ellipse',
    ...(options.box ?? {
      x: Math.round((canvas.width - width) / 2),
      y: Math.round((canvas.height - height) / 2),
      width,
      height,
    }),
    fill: options.fill ?? '#FFFFFF',
    opacity: 1,
  };
}

export function createSvgNode(
  canvas: CanvasSize,
  options: { box?: CanvasNodeBox; preset?: string; color?: string } = {}
): CanvasSvgNode {
  const preset = options.preset ?? CANVAS_SVG_PRESETS[0].value;
  const color = options.color ?? '#FFFFFF';
  const size = canvas.width >= 1000 ? 160 : 96;
  return {
    id: createCanvasNodeId(),
    type: 'svg',
    ...(options.box ?? {
      x: Math.round((canvas.width - size) / 2),
      y: Math.round((canvas.height - size) / 2),
      width: size,
      height: size,
    }),
    url: svgPresetUrl(preset, color),
    preset,
    color,
    opacity: 1,
  };
}

/** 由画布底色推算文字 / 图形的默认配色，浅色底自动转深色，避免看不见 */
export function defaultInkColor(background: string): string {
  return isLightColor(background) ? '#1D1D1F' : '#FFFFFF';
}

/** 粗略判断底色深浅：只认 #RGB / #RRGGBB，解析失败按深色处理 */
function isLightColor(color: string): boolean {
  const hex = (color || '').replace('#', '').trim();
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((char) => char + char)
          .join('')
      : hex.slice(0, 6);
  if (full.length !== 6) return false;
  const r = Number.parseInt(full.slice(0, 2), 16);
  const g = Number.parseInt(full.slice(2, 4), 16);
  const b = Number.parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((value) => Number.isNaN(value))) return false;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}
