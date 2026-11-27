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
  url: string;
  radius: number;
  opacity: number;
}

export interface SplashProgressNode {
  id: string;
  type: 'progress';
  x: number;
  y: number;
  width: number;
  height: number;
  /** 旋转角度（度），围绕节点中心 */
  rotation?: number;
  /** 允许该组件显示在画布外（后台组件配置里的「超出画布」） */
  overflow?: boolean;
  trackColor: string;
  fillColor: string;
  radius: number;
}

export type SplashNode = SplashTextNode | SplashImageNode | SplashProgressNode;

export type SplashImageMode = 'fit' | 'stretch' | 'stretch-x' | 'stretch-y';

export interface SplashOrientationDoc {
  width: number;
  height: number;
  background: string;
  /** 背景图（后端路径），空表示纯色底 */
  backgroundImage?: string;
  /** 背景视频（后端路径），与背景图互斥；有视频时不再叠加开屏音频 */
  backgroundVideo?: string;
  /** 背景素材铺法，缺省按拉伸铺满 */
  backgroundMode?: SplashImageMode;
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

  if (row.type === 'progress') {
    return {
      ...base,
      type: 'progress',
      trackColor: color(row.trackColor, '#3A3A3C'),
      fillColor: color(row.fillColor, '#FFFFFF'),
      radius: num(row.radius, 3),
    };
  }

  if (row.type === 'image') {
    return {
      ...base,
      type: 'image',
      url: typeof row.url === 'string' ? row.url.trim() : '',
      radius: num(row.radius, 0),
      opacity: Math.min(1, Math.max(0, num(row.opacity, 1))),
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
  // 两种背景素材都保留时视频优先：忽略背景图，避免双层背景
  if (doc.backgroundVideo) doc.backgroundImage = '';
  doc.backgroundMode =
    row.backgroundMode === 'fit' ||
    row.backgroundMode === 'stretch-x' ||
    row.backgroundMode === 'stretch-y'
      ? row.backgroundMode
      : 'stretch';
  doc.contained = row.contained === false ? false : undefined;

  const list = Array.isArray(row.nodes) ? row.nodes : [];
  let progressTaken = false;
  const ids = new Set<string>();
  list.forEach((entry, index) => {
    const node = parseNode(entry, size, index);
    if (!node) return;
    // 进度条唯一：异常数据里出现多个时只渲染第一个
    if (node.type === 'progress') {
      if (progressTaken) return;
      progressTaken = true;
    }
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
