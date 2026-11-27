/**
 * 通用画布编辑器 —— 文档模型
 * ------------------------------------------------------------------
 * 与具体业务解耦的「可拖拽画布」模型：画布是一份设计像素尺寸的文档，
 * 里面的节点只有文本 / 图片 / 进度条三种，坐标和尺寸都按设计像素存，
 * 展示端再按百分比换算，任何分辨率下比例都一致。
 *
 * 调用方只需要提供 { width, height, background, nodes } 即可渲染，
 * 存库格式、多套尺寸（如 PC / 移动端）由调用方自己组织。
 */
export type CanvasNodeType = 'text' | 'image' | 'progress';
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
export const CANVAS_IMAGE_MODES: { value: CanvasImageMode; label: string; tip: string }[] = [
  { value: 'cover', label: '等比铺满', tip: '等比放大撑满画布，不变形，超出部分被裁掉' },
  { value: 'fit', label: '原比例', tip: '等比缩放到完整显示，不变形，可能留边' },
  { value: 'stretch', label: '拉伸铺满', tip: '强制变形铺满整个画布，可能拉伸变形' },
  { value: 'stretch-x', label: '横向拉伸', tip: '宽度撑满画布，高度等比缩放并垂直居中' },
  { value: 'stretch-y', label: '纵向拉伸', tip: '高度撑满画布，宽度等比缩放并水平居中' },
];

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
  /** 同组节点会一起选中、一起移动 */
  groupId?: string;
  /** 组件交互开关：不写进 JSON 就用默认值（旋转 / 调整宽高默认开启，倾斜默认关闭） */
  allowRotate?: boolean;
  allowResize?: boolean;
  allowSkew?: boolean;
  /** 允许拖出画布做溢出效果，默认 false（限制在画布内） */
  overflow?: boolean;
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
}

export interface CanvasProgressNode extends CanvasNodeBase {
  type: 'progress';
  trackColor: string;
  fillColor: string;
  radius: number;
}

export type CanvasNode = CanvasTextNode | CanvasImageNode | CanvasProgressNode;

export interface CanvasDoc extends CanvasSize {
  background: string;
  /** 背景图（后端存储路径），空表示只用纯色底 */
  backgroundImage?: string;
  /** 背景视频（后端存储路径）；与背景图可同时存在，渲染时视频优先，编辑器里只取首帧做静态预览 */
  backgroundVideo?: string;
  /** 背景素材铺法：等比铺满 / 原比例 / 拉伸铺满 / 横向拉伸 / 纵向拉伸，图片与视频共用，默认等比铺满 */
  backgroundMode?: CanvasImageMode;
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

export function hasProgress(nodes: CanvasNode[]): boolean {
  return nodes.some((node) => node.type === 'progress');
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

/** 新增进度条：全画布唯一，调用方需先判断 hasProgress */
export function createProgressNode(
  canvas: CanvasSize,
  options: { width?: number; color?: string; trackColor?: string } = {}
): CanvasProgressNode {
  const width =
    options.width ??
    (canvas.width >= 1000 ? Math.round(canvas.width * 0.22) : Math.round(canvas.width * 0.45));
  const height = 6;
  return {
    id: createCanvasNodeId(),
    type: 'progress',
    x: Math.round((canvas.width - width) / 2),
    y: Math.round(canvas.height * 0.62),
    width,
    height,
    trackColor: options.trackColor ?? '#3A3A3C',
    fillColor: options.color ?? '#FFFFFF',
    radius: Math.round(height / 2),
  };
}

/** 由画布底色推算文字/进度条的默认配色，浅色底自动转深色，避免看不见 */
export function defaultInkColor(background: string): string {
  return isLightColor(background) ? '#1D1D1F' : '#FFFFFF';
}

export function defaultProgressColors(background: string): { color: string; trackColor: string } {
  return isLightColor(background)
    ? { color: '#0071E3', trackColor: '#E5E5EA' }
    : { color: '#FFFFFF', trackColor: '#3A3A3C' };
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
