/**
 * 通用画布编辑器
 * ------------------------------------------------------------------
 * 一块画布 = 一个 Leafer App + editor。画布按设计像素绘制，再整体缩放到
 * 容器内居中，所以任意尺寸的设计稿（如 PC 1440×900、移动端 390×844）都能
 * 用同一套 1:1 的拖拽逻辑，存下来的坐标直接就是设计像素。
 *
 * 能力：
 *   - 单选 / 框选多选（Editor 插件的 multipleSelect + boxSelect 属性）
 *   - 滚轮缩放（改画布根的 scale，锚定指针，20%–400%，比例提示缩放后短暂显示）
 *   - 空格 + 拖动平移视图
 *   - 移动吸附（beforeMove 钩子 + 辅助线，画布边/中线与其它元素都参与，
 *     单选、多选、整组拖拽同一套逻辑；组件勾选「超出画布」时允许拖出画布）
 *   - 元素旋转 / 缩放 / 倾斜（由每个组件自己的交互开关控制，写回节点 rotation 等字段）
 *   - 双击文本原位编辑（浮出 textarea，失焦 / Esc 提交）
 *   - 撤销 / 重做（文档层快照，Ctrl+Z / Ctrl+Shift+Z，不放按钮）
 *   - 图层锁定 / 编组：锁定后不可选中，同组节点整组选中一起移动
 *   - 复制 / 粘贴 / 创建副本（Ctrl+C / Ctrl+V / Ctrl+D，编组关系一并复制）
 *   - 快捷键：Delete 删除、[ 置底、] 置顶、Ctrl+G 编组、Ctrl+Shift+G 取消编组、Ctrl+Shift+L 锁定、
 *     T 文本、I 图片、H HTML 代码；R / O / S 进入矩形 / 圆形 / SVG 的鼠标拖拽绘制模式（Esc 退出）
 *   - 拖拽本地文件到画布：图片 / SVG 变成节点、视频换成背景，先本地预览，保存配置时再上传
 *   - 左侧图层面板（固定宽度，编组以可折叠的组节点展示）+ 右侧属性面板
 *
 * 与业务解耦：只认 CanvasDoc（尺寸 + 底色 + 节点数组），不关心存库格式；
 * 图片从哪来由 pickImage 决定（不传则用内置文件选择器），右侧属性面板可以
 * 用 renderInspector 整块替换。
 *
 * 画布元素与 React 状态双向同步：
 *   拖拽 / 缩放 / 双击改文案 → pointerup、选中变化、内编辑结束时读回元素几何；
 *   右侧属性面板改样式 → 直接 set 到 Leafer 元素上，避免整块重建丢选中。
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import {
  App,
  Box,
  Ellipse,
  Image as LeaferImage,
  PointerEvent as LeaferPointerEvent,
  Rect,
  Text as LeaferText,
  type IFontWeight,
  type IEditorConfig,
  type IFilter,
  type IUI,
  type IUIEvent,
} from 'leafer-ui';
import {
  Editor,
  EditorEvent,
  InnerEditorEvent,
} from '@leafer-in/editor';
import '@leafer-in/resize';
import '@leafer-in/filter';
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Circle,
  ClipboardPaste,
  Code2,
  Copy,
  CopyPlus,
  Group as GroupIcon,
  HelpCircle,
  Image as ImageIcon,
  Lock,
  LockOpen,
  Shapes,
  Square,
  Trash2,
  Type,
  Ungroup,
} from 'lucide-react';
import { FilePicker } from '../FilePicker.tsx';
import { VideoPicker } from '../VideoPicker.tsx';
import { snowyFetch } from '../../lib/snowy.ts';
import type { VideoItem } from '../../types/cms.ts';
import { toOpenUrl, type DevFile } from '../../lib/fileCenter.ts';
import { registerPendingFile } from '../../lib/pendingUploads.ts';
import {
  CanvasNodeInspector,
  type CanvasInspectorContext,
} from './CanvasNodeInspector';
import { CanvasLayerPanel } from './CanvasLayerPanel';
import { HtmlCodeDialog } from './HtmlCodeDialog';
import { Hint } from './Hint';
import { snapMove } from './snap';
import { loadVideoFrame } from './videoFrame';
import {
  createCanvasGroupId,
  createCanvasNodeId,
  createEllipseNode,
  createHtmlNode,
  createImageNode,
  createRectNode,
  createSvgNode,
  createTextNode,
  defaultInkColor,
  filterCss,
  imageBoxFor,
  previewUrl,
  round1,
  sameCanvasFilter,
  type CanvasAlignMode,
  type CanvasDoc,
  type CanvasFilterParams,
  type CanvasHtmlNode,
  type CanvasImageMode,
  type CanvasNode,
  type CanvasNodeBox,
  type CanvasSize,
  type CanvasTextDecoration,
  type CanvasTextNode,
} from './types';
import './canvasFilters';

/** iframe 里的基础样式：去掉默认白底和边距，与客户端直接插入 HTML 的效果一致 */
const HTML_FRAME_STYLE =
  '<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden;}</style>';

/**  Leafer 元素的最小读写面：几何可直接读，样式统一走 set */
type LeaferElement = IUI & {
  set(data: Record<string, unknown>): void;
  text?: string;
};

/** 只用到 name / parent 链，用来从命中元素往上找画布节点 */
type LeaferLeafLike = { name?: string; parent?: LeaferLeafLike };

/** 编辑器：移动 + 缩放 + 旋转，支持框选与多选；旋转 / 缩放 / 倾斜按选中组件的开关生效 */
const EDITOR_CONFIG = {
  moveable: true,
  resizeable: true,
  rotateable: true,
  skewable: false,
  hideRotatePoints: false,
  multipleSelect: true,
  boxSelect: 'hit',
  keyEvent: false,
  editSize: 'size',
} satisfies IEditorConfig;

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 4;
/** 吸附阈值（屏幕像素），换算成设计像素后参与计算 */
const SNAP_PX = 6;
const HISTORY_LIMIT = 60;
/** 连续同类改动（拖滑杆）在这个时间内合并成一条历史 */
const HISTORY_COALESCE_MS = 600;

/**
 * 复制缓冲区：放在模块级而不是实例里，
 * 这样在 PC 画布复制后切到移动端画布也能直接粘贴。
 */
let clipboardNodes: CanvasNode[] = [];

/** 悬浮栏可新增的组件类型 */
export type CanvasToolKey = 'text' | 'image' | 'rect' | 'ellipse' | 'svg' | 'html';

const DEFAULT_TOOLS: CanvasToolKey[] = ['text', 'image', 'rect', 'ellipse', 'svg', 'html'];

/** 快捷键帮助面板的内容 */
const SHORTCUTS: [string, string][] = [
  ['Ctrl+Z / Ctrl+Shift+Z', '撤销 / 重做'],
  ['Ctrl+C / Ctrl+V / Ctrl+D', '复制 / 粘贴 / 创建副本'],
  ['Ctrl+G / Ctrl+Shift+G', '编组 / 取消编组'],
  ['Ctrl+Shift+L', '锁定 / 解锁图层'],
  ['Delete / Backspace', '删除选中组件'],
  ['[ / ]', '置底 / 置顶'],
  ['T / I / H', '新增文本 / 图片 / HTML'],
  ['R / O / S', '矩形 / 圆形 / SVG 拖拽绘制'],
  ['Shift + 拖动', '绘制正圆 / 正方形'],
  ['空格 + 拖动', '平移画布'],
  ['滚轮', '缩放画布'],
  ['Esc', '退出绘制 / 关闭弹窗'],
];

/** 内置文件选择器的标题：按当前挑选目标区分 */
const PICKER_TITLES = {
  node: '选择画布图片',
  svg: '选择 SVG 图形',
  'background-image': '选择背景图',
  'background-video': '选择背景视频',
} as const;

/** 绘制模式：按快捷键后鼠标拖拽画出的图形 */
type CanvasDrawMode = 'rect' | 'ellipse' | 'svg';

export interface CanvasEditorProps {
  /** 画布文档；作为初始值使用，外部换成另一份文档时整块重挂 */
  value: CanvasDoc;
  onChange: (next: CanvasDoc) => void;
  /** 画布内浮层（图片选择、右键菜单）开关，供外层弹窗判断 Esc 归谁处理 */
  onOverlayChange?: (open: boolean) => void;
  /**
   * 自定义图片选择：resolve 出后端存储路径，取消返回 null。
   * 不传则使用内置 FilePicker。
   */
  pickImage?: () => string | null | Promise<string | null>;
  /** 悬浮栏显示哪些新增入口（顺序即渲染顺序），默认 文本 / 图片 / 矩形 / 圆形 / SVG / 进度条 */
  tools?: CanvasToolKey[];
  /** 替换右侧属性面板；传 () => null 可隐藏 */
  renderInspector?:
    | ReactNode
    | ((context: CanvasInspectorContext) => ReactNode)
    | null;
  /** 移动时是否吸附到画布与其它元素的边/中线，默认开启 */
  snap?: boolean;
  /** 是否显示左侧图层面板，默认显示 */
  layers?: boolean;
  className?: string;
}

/** 配置里存纯后端路径，预览时补回 /snowy 代理前缀（见 types.ts） */

/** 量一下文本在画布字体下的宽度，新增文本的框直接贴合文字 */
let measureContext: CanvasRenderingContext2D | null = null;
function measureTextWidth(text: string, fontSize: number, fontWeight: number): number {
  if (!measureContext) {
    measureContext = document.createElement('canvas').getContext('2d');
  }
  if (!measureContext) {
    return Math.round(text.length * fontSize * 0.6);
  }
  measureContext.font = `${fontWeight} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`;
  const width = measureContext.measureText(text).width;
  // 留一点字形边距，避免贴得太紧被裁掉
  return Math.max(fontSize, Math.ceil(width + fontSize * 0.2));
}

/** 读取图片原始尺寸；失败时按 16:10 兜底，保证仍能落到画布上 */
function loadNaturalSize(url: string): Promise<CanvasSize> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () =>
      resolve({
        width: img.naturalWidth || 1440,
        height: img.naturalHeight || 900,
      });
    img.onerror = () => resolve({ width: 1440, height: 900 });
    img.src = url;
  });
}

/** 焦点在可输入元素里时，快捷键交给输入框自己处理 */
function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element || !element.tagName) return false;
  return (
    element.isContentEditable ||
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'SELECT'
  );
}

/** 组内所有节点 id（未编组时只有自己），用于整组选中 / 整组操作 */
function groupIdsOf(nodes: CanvasNode[], id: string): string[] {
  const node = nodes.find((item) => item.id === id);
  if (!node?.groupId) return [id];
  const ids = nodes.filter((item) => item.groupId === node.groupId).map((item) => item.id);
  return ids.length > 1 ? ids : [id];
}

/**
 * 平移光标写在内层 .leafer-app-view 上：canvas 是 pointer-events:none，
 * 真正接收指针的是这层 div，Leafer 也会用行内样式改它的光标。
 */
function setPanCursor(host: HTMLElement | null, cursor: '' | 'grab' | 'grabbing') {
  const view = host?.querySelector<HTMLElement>('.leafer-app-view');
  if (view) view.style.cursor = cursor;
}

/** 文本装饰：Leafer 的取值转成 CSS，供原位编辑浮层保持一致 */
function textDecorationCss(decoration: CanvasTextDecoration | undefined): string {
  if (decoration === 'under') return 'underline';
  if (decoration === 'delete') return 'line-through';
  if (decoration === 'under-delete') return 'underline line-through';
  return 'none';
}

/** 组件交互开关 → Leafer 的 editConfig；单选时由元素自己的配置决定手柄 */
function nodeEditConfig(node: CanvasNode) {
  return {
    rotateable: node.allowRotate !== false,
    resizeable: node.allowResize !== false,
    skewable: node.allowSkew === true,
  };
}

/** 组件是否允许拖出画布；允许时清掉拖拽边界 */
function nodeDragBounds(node: CanvasNode): 'parent' | undefined {
  return node.overflow ? undefined : 'parent';
}

/**
 * SVG 走后端下载接口时内容类型通常是 application/octet-stream，
 * Leafer 不会按图片解码，表现为「图层在但画布空白」。
 * 这里取文本重新包成 data URI（image/svg+xml）后再交给 Leafer。
 */
const svgDataUrlCache = new Map<string, Promise<string>>();

function loadSvgDataUrl(proxyUrl: string): Promise<string> {
  const cached = svgDataUrlCache.get(proxyUrl);
  if (cached) return cached;
  const task = (async () => {
    try {
      const res = proxyUrl.startsWith('http')
        ? await fetch(proxyUrl)
        : await snowyFetch(proxyUrl.replace(/^\/snowy/, ''));
      if (!res.ok) return proxyUrl;
      const text = await res.text();
      // 返回的可能是登录失效的 JSON 或错误页，只有真正的 SVG 才转 data URI
      if (!/<svg[\s>]/i.test(text)) return proxyUrl;
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
    } catch {
      return proxyUrl;
    }
  })();
  svgDataUrlCache.set(proxyUrl, task);
  return task;
}

/** 设置 SVG 元素地址：data / blob 直接用，后端路径先转 data URI */
function applySvgUrl(element: LeaferElement, raw: string) {
  const marker = element as unknown as { __svgUrl?: string };
  if (marker.__svgUrl === raw) return;
  marker.__svgUrl = raw;
  const url = previewUrl(raw);
  if (!url || url.startsWith('data:') || url.startsWith('blob:')) {
    element.set({ url });
    return;
  }
  void loadSvgDataUrl(url).then((resolved) => {
    if (marker.__svgUrl === raw) element.set({ url: resolved });
  });
}

function createElement(node: CanvasNode): LeaferElement {
  const base = {
    name: node.id,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    // 旋转围绕节点中心，正值为顺时针
    rotation: node.rotation ?? 0,
    // 锁定的图层不可选中 / 不可拖动，但仍可右键解锁
    editable: !node.locked,
    draggable: !node.locked,
    // 勾选「超出画布」的组件才允许拖出画布范围
    dragBounds: nodeDragBounds(node),
    // 旋转 / 缩放 / 倾斜按组件自己的开关决定
    editConfig: nodeEditConfig(node),
  };

  if (node.type === 'text') {
    return new LeaferText({
      ...base,
      text: node.text,
      fontSize: node.fontSize,
      fontWeight: node.fontWeight as IFontWeight,
      italic: node.italic ?? false,
      textDecoration: node.decoration ?? 'none',
      fill: node.color,
      textAlign: node.align,
      verticalAlign: 'middle',
      lineHeight: Math.round(node.fontSize * 1.4),
      textWrap: 'break',
    }) as unknown as LeaferElement;
  }

  if (node.type === 'image') {
    return new LeaferImage({
      ...base,
      url: previewUrl(node.url),
      cornerRadius: node.radius,
      opacity: node.opacity,
    }) as unknown as LeaferElement;
  }

  if (node.type === 'rect') {
    return new Rect({
      ...base,
      fill: node.fill,
      cornerRadius: node.radius,
      opacity: node.opacity,
      stroke: node.stroke,
      strokeWidth: node.strokeWidth ?? 0,
    }) as unknown as LeaferElement;
  }

  if (node.type === 'ellipse') {
    return new Ellipse({
      ...base,
      fill: node.fill,
      opacity: node.opacity,
      stroke: node.stroke,
      strokeWidth: node.strokeWidth ?? 0,
    }) as unknown as LeaferElement;
  }

  if (node.type === 'svg') {
    const image = new LeaferImage({
      ...base,
      url: previewUrl(node.url),
      opacity: node.opacity,
    }) as unknown as LeaferElement;
    applySvgUrl(image, node.url);
    return image;
  }

  // HTML 代码：Leafer 不能直接渲染 HTML，这里只放一个透明的命中框，
  // 真正的 HTML 由上层 iframe 浮层按节点位置渲染（见 syncHtmlOverlays）
  if (node.type === 'html') {
    return new Rect({
      ...base,
      fill: 'rgba(255,255,255,0.001)',
      opacity: node.opacity,
    }) as unknown as LeaferElement;
  }

  return new Rect({ ...base, fill: 'rgba(255,255,255,0.001)' }) as unknown as LeaferElement;
}

export function CanvasEditor({
  value,
  onChange,
  onOverlayChange,
  pickImage,
  tools,
  renderInspector,
  snap = true,
  layers = true,
  className,
}: CanvasEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<Box | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const elementsRef = useRef<Map<string, LeaferElement>>(new Map());
  /** 最近一次指针按下是否发生在画布上：快捷键只在这种状态下生效，避免误删 */
  const canvasActiveRef = useRef(false);
  /** 吸附辅助线：新增 / 粘贴元素后要把它们重新提到最上层 */
  const guidesRef = useRef<{ x: Rect; y: Rect } | null>(null);
  /** 是否按住空格：按住时指针拖动画布 = 平移视图 */
  const spaceRef = useRef(false);
  /** 指针是否停在画布上：hover 时按空格也能直接平移 */
  const pointerInsideRef = useRef(false);
  /** 正在原位编辑的文本节点 id，非空时屏蔽画布快捷键 / 缩放 / 平移 */
  const editingRef = useRef<string | null>(null);

  const metaRef = useRef<{
    width: number;
    height: number;
    background: string;
    backgroundImage: string;
    backgroundVideo: string;
    backgroundVideoCover: string;
    backgroundMode: CanvasImageMode;
    backgroundFilter?: CanvasFilterParams;
    /** 画布视图交互开关：是否允许空格 + 拖动平移 */
    allowPan: boolean;
  }>({
    width: value.width,
    height: value.height,
    background: value.background,
    backgroundImage: (value.backgroundImage || '').trim(),
    backgroundVideo: (value.backgroundVideo || '').trim(),
    backgroundVideoCover: (value.backgroundVideoCover || '').trim(),
    backgroundMode: value.backgroundMode ?? 'cover',
    backgroundFilter: value.backgroundFilter,
    allowPan: value.allowPan !== false,
  });
  const backgroundSyncRef = useRef<(() => void) | null>(null);
  /** 选中组件的交互开关变化时同步到 Editor 的 config（Leafer 每次交互都会实时合并 config） */
  const applyFlagsRef = useRef<((ids?: string[], refresh?: boolean) => void) | null>(null);
  const sizeBadgeRef = useRef<HTMLSpanElement | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [nodes, setNodes] = useState<CanvasNode[]>(() => value.nodes);
  const nodesRef = useRef<CanvasNode[]>(nodes);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const selectedIdsRef = useRef<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  /** 打开文件选择器时的目标：null 表示新增，否则是待替换的图片节点 */
  const [replacingId, setReplacingId] = useState<string | null>(null);
  /** 打开选择器时在挑什么：组件图片 / SVG 图形 / 画布背景图 / 画布背景视频 */
  const [pickerTarget, setPickerTarget] = useState<
    'node' | 'svg' | 'background-image' | 'background-video'
  >('node');
  /** 右键菜单：命中节点 + 菜单在画布容器内的坐标 */
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  /** 背景视频选择器（视频模块）：替代文件中心选择视频 */
  const [videoPickerOpen, setVideoPickerOpen] = useState(false);
  const rightDownRef = useRef<string | null>(null);
  /** 外部换文档 / 撤销重做时递增，用来强制重挂 Leafer 实例 */
  const [revision, setRevision] = useState(0);
  /** 视图：相对「适配容器」的缩放与平移（屏幕像素） */
  const viewRef = useRef({ zoom: 1, panX: 0, panY: 0 });
  const baseScaleRef = useRef(1);
  const resetViewRef = useRef<(() => void) | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);
  /** 缩放比例提示：只在滚轮缩放后短暂显示，定时自动关闭 */
  const [zoomVisible, setZoomVisible] = useState(false);
  const zoomTimerRef = useRef<number | null>(null);
  /** 平移光标：none 普通、grab 按住空格、grabbing 正在拖动 */
  const [panState, setPanState] = useState<'none' | 'grab' | 'grabbing'>('none');
  /** 当前绘制模式：非空时鼠标在画布上拖拽画图形 */
  const [drawMode, setDrawMode] = useState<CanvasDrawMode | null>(null);
  /** 绘制中的预览框（相对画布容器的屏幕像素） */
  const [drawDraft, setDrawDraft] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  /** 绘制起点（屏幕坐标），拖拽过程中不变 */
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  /** 文件正拖在画布上方：显示投放提示，松手后本地预览 */
  const [dropActive, setDropActive] = useState(false);
  /** 文本原位编辑浮层：节点 id + 当前内容 + 覆盖在画布上的样式 */
  const [textEditing, setTextEditing] = useState<{
    id: string;
    value: string;
    style: CSSProperties;
  } | null>(null);
  /** HTML 代码弹窗：id 为空表示新增，否则编辑已有组件 */
  const [htmlDialog, setHtmlDialog] = useState<{ id: string | null; code: string } | null>(null);
  /** 右下角快捷键帮助面板开关 */
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement | null>(null);

  // 点击帮助面板以外区域 / 按 Esc 关闭
  useEffect(() => {
    if (!helpOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!helpRef.current?.contains(event.target as Node)) setHelpOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setHelpOpen(false);
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [helpOpen]);
  /** HTML 渲染浮层：节点 id → 包裹层，位置随视图同步 */
  const htmlLayersRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const syncHtmlOverlaysRef = useRef<() => void>(() => {});

  /** 按当前视图（适配缩放 × 滚轮缩放 + 平移）摆放 HTML 浮层 */
  const syncHtmlOverlays = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const { zoom, panX, panY } = viewRef.current;
    const scale = baseScaleRef.current * zoom;
    if (!scale) return;
    const rootX = (container.clientWidth - metaRef.current.width * scale) / 2 + panX;
    const rootY = (container.clientHeight - metaRef.current.height * scale) / 2 + panY;
    for (const node of nodesRef.current) {
      if (node.type !== 'html') continue;
      const layer = htmlLayersRef.current.get(node.id);
      if (!layer) continue;
      layer.style.left = `${rootX + node.x * scale}px`;
      layer.style.top = `${rootY + node.y * scale}px`;
      layer.style.width = `${node.width * scale}px`;
      layer.style.height = `${node.height * scale}px`;
      layer.style.transform = node.rotation ? `rotate(${node.rotation}deg)` : '';
      layer.style.opacity = String(node.opacity);
      const frame = layer.firstElementChild as HTMLIFrameElement | null;
      if (frame) {
        // iframe 按设计像素排版，再整体缩放到当前画布比例，保证内容比例一致
        frame.style.width = `${node.width}px`;
        frame.style.height = `${node.height}px`;
        frame.style.transform = `scale(${scale})`;
      }
    }
  }, []);

  useEffect(() => {
    syncHtmlOverlaysRef.current = syncHtmlOverlays;
    syncHtmlOverlays();
  });
  const historyRef = useRef<{
    past: CanvasNode[][];
    future: CanvasNode[][];
    lastKey: string | null;
    lastAt: number;
  }>({ past: [], future: [], lastKey: null, lastAt: 0 });
  const closeMenu = useCallback(() => setMenu(null), []);

  /** 只把节点写回 React / 调用方，不动历史 */
  const applyNodes = useCallback((next: CanvasNode[]) => {
    nodesRef.current = next;
    setNodes(next);
    onChangeRef.current({ ...metaRef.current, nodes: next });
  }, []);

  /**
   * 提交一次改动并记历史。
   * key 相同且间隔很短的连续改动会合并（例如拖着滑杆调字号），
   * 一次撤销就能回到拖动前，而不是退几十步。
   */
  const commitNodes = useCallback(
    (next: CanvasNode[], options?: { key?: string }) => {
      const prev = nodesRef.current;
      if (next === prev) return;
      const history = historyRef.current;
      const now = Date.now();
      const coalesce =
        !!options?.key &&
        history.lastKey === options.key &&
        now - history.lastAt < HISTORY_COALESCE_MS;
      if (!coalesce) {
        history.past.push(prev);
        if (history.past.length > HISTORY_LIMIT) history.past.shift();
        history.future = [];
      }
      history.lastKey = options?.key ?? null;
      history.lastAt = now;
      applyNodes(next);
    },
    [applyNodes]
  );

  const undo = useCallback(() => {
    const history = historyRef.current;
    const prev = history.past.pop();
    if (!prev) return;
    history.future.push(nodesRef.current);
    history.lastKey = null;
    history.lastAt = 0;
    applyNodes(prev);
    setMenu(null);
    setSelectedIds([]);
    selectedIdsRef.current = [];
    setRevision((current) => current + 1);
  }, [applyNodes]);

  const redo = useCallback(() => {
    const history = historyRef.current;
    const next = history.future.pop();
    if (!next) return;
    history.past.push(nodesRef.current);
    history.lastKey = null;
    history.lastAt = 0;
    applyNodes(next);
    setMenu(null);
    setSelectedIds([]);
    selectedIdsRef.current = [];
    setRevision((current) => current + 1);
  }, [applyNodes]);

  /** 画布级配置（底色 / 背景图 / 背景视频及封面 / 拖拽平移开关）：直接改根节点，不重建画布、不打断缩放 */
  const patchCanvas = useCallback(
    (
      patch: Partial<
        Pick<
          CanvasDoc,
          | 'background'
          | 'backgroundImage'
          | 'backgroundVideo'
          | 'backgroundVideoCover'
          | 'backgroundMode'
          | 'backgroundFilter'
          | 'allowPan'
        >
      >
    ) => {
      metaRef.current = { ...metaRef.current, ...patch };
      if (patch.background !== undefined) {
        rootRef.current?.set({ fill: metaRef.current.background });
      }
      if (
        patch.backgroundImage !== undefined ||
        patch.backgroundVideo !== undefined ||
        patch.backgroundVideoCover !== undefined ||
        patch.backgroundMode !== undefined ||
        patch.backgroundFilter !== undefined
      ) {
        backgroundSyncRef.current?.();
      }
      onChangeRef.current({ ...metaRef.current, nodes: nodesRef.current });
    },
    []
  );


  /** 从 Leafer 元素读回几何与文案；没有变化就不写回，避免无意义刷新 */
  const syncFromCanvas = useCallback(() => {
    let changed = false;
    const next = nodesRef.current.map((node) => {
      const element = elementsRef.current.get(node.id);
      if (!element) return node;
      const geometry = {
        x: round1(element.x ?? 0),
        y: round1(element.y ?? 0),
        width: round1(element.width ?? 0),
        height: round1(element.height ?? 0),
        rotation: round1(Number(element.rotation ?? 0)),
      };
      if (
        Math.abs(geometry.x - node.x) > 0.05 ||
        Math.abs(geometry.y - node.y) > 0.05 ||
        Math.abs(geometry.width - node.width) > 0.05 ||
        Math.abs(geometry.height - node.height) > 0.05 ||
        Math.abs(geometry.rotation - (node.rotation ?? 0)) > 0.05
      ) {
        changed = true;
      }
      if (node.type === 'text') {
        const text = String(element.text ?? node.text);
        if (text !== node.text) {
          changed = true;
          return { ...node, ...geometry, text };
        }
      }
      return { ...node, ...geometry };
    });
    if (changed) commitNodes(next);
  }, [commitNodes]);

  const updateSelection = useCallback((ids: string[]) => {
    selectedIdsRef.current = ids;
    setSelectedIds(ids);
  }, []);

  // 外部换了文档（引用不同且不是自己刚抛出去的）：重置内部状态并重挂画布
  useEffect(() => {
    const meta = metaRef.current;
    if (
      value.nodes === nodesRef.current &&
      value.width === meta.width &&
      value.height === meta.height &&
      value.background === meta.background &&
      (value.backgroundImage || '').trim() === meta.backgroundImage &&
      (value.backgroundVideo || '').trim() === meta.backgroundVideo &&
      (value.backgroundVideoCover || '').trim() === meta.backgroundVideoCover &&
      (value.backgroundMode ?? 'cover') === meta.backgroundMode &&
      sameCanvasFilter(value.backgroundFilter, meta.backgroundFilter) &&
      (value.allowPan !== false) === meta.allowPan
    ) {
      return;
    }
    metaRef.current = {
      width: value.width,
      height: value.height,
      background: value.background,
      backgroundImage: (value.backgroundImage || '').trim(),
      backgroundVideo: (value.backgroundVideo || '').trim(),
      backgroundVideoCover: (value.backgroundVideoCover || '').trim(),
      backgroundMode: value.backgroundMode ?? 'cover',
      backgroundFilter: value.backgroundFilter,
      allowPan: value.allowPan !== false,
    };
    nodesRef.current = value.nodes;
    setNodes(value.nodes);
    setSelectedIds([]);
    selectedIdsRef.current = [];
    setMenu(null);
    historyRef.current = { past: [], future: [], lastKey: null, lastAt: 0 };
    setRevision((current) => current + 1);
  }, [value]);

  // 挂载 Leafer：容器尺寸变化时重算缩放，设计稿整体等比居中
  useEffect(() => {
    const container = containerRef.current;
    const host = hostRef.current;
    if (!container || !host) return;

    // 吸附辅助线：先建好元素，等 root 就绪后再挂到最上层
    const guideX = new Rect({
      visible: false,
      fill: '#FF4D4F',
      hittable: false,
      editable: false,
      width: 1,
      height: 1,
    });
    const guideY = new Rect({
      visible: false,
      fill: '#FF4D4F',
      hittable: false,
      editable: false,
      width: 1,
      height: 1,
    });
    const hideGuides = () => {
      guideX.visible = false;
      guideY.visible = false;
    };

    /** 移动前的吸附：把修正后的位移还给编辑器，并画出命中的辅助线 */
    const handleBeforeMove = (data: { x: number; y: number }) => {
      if (!snap) return;
      const ids = selectedIdsRef.current;
      if (!ids.length) return;
      // 用元素实时位置算选中区域的合并包围盒：单选 / 多选 / 整组共用一套吸附
      let left = Number.POSITIVE_INFINITY;
      let top = Number.POSITIVE_INFINITY;
      let right = Number.NEGATIVE_INFINITY;
      let bottom = Number.NEGATIVE_INFINITY;
      for (const id of ids) {
        const element = elementsRef.current.get(id);
        if (!element) continue;
        const x = Number(element.x ?? 0);
        const y = Number(element.y ?? 0);
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x + Number(element.width ?? 0));
        bottom = Math.max(bottom, y + Number(element.height ?? 0));
      }
      if (!Number.isFinite(left)) return;
      const selectedSet = new Set(ids);
      const others = nodesRef.current.filter((node) => !selectedSet.has(node.id));
      const scale = rootRef.current?.scaleX || 1;
      const result = snapMove({
        delta: { x: data.x, y: data.y },
        moving: { left, top, right, bottom },
        others,
        canvas: metaRef.current,
        threshold: SNAP_PX / scale,
      });

      const lineWidth = 1 / scale;
      if (result.guideX === null) {
        guideX.visible = false;
      } else {
        guideX.set({
          visible: true,
          x: result.guideX - lineWidth / 2,
          y: 0,
          width: lineWidth,
          height: metaRef.current.height,
        });
      }
      if (result.guideY === null) {
        guideY.visible = false;
      } else {
        guideY.set({
          visible: true,
          x: 0,
          y: result.guideY - lineWidth / 2,
          width: metaRef.current.width,
          height: lineWidth,
        });
      }

      // 出界限制：选中的组件都没勾「超出画布」时，把整个选中区域夹在画布内
      let nextX = result.x;
      let nextY = result.y;
      const contained = nodesRef.current
        .filter((node) => selectedSet.has(node.id))
        .every((node) => !node.overflow);
      if (contained) {
        const canvas = metaRef.current;
        nextX = Math.min(nextX, canvas.width - right);
        nextX = Math.max(nextX, -left);
        nextY = Math.min(nextY, canvas.height - bottom);
        nextY = Math.max(nextY, -top);
      }

      return { x: nextX, y: nextY };
    };

    const app = new App({
      view: host,
      width: Math.max(1, container.clientWidth),
      height: Math.max(1, container.clientHeight),
      editor: { ...EDITOR_CONFIG, beforeMove: handleBeforeMove },
      // 视图缩放 / 平移由画布根自己控制，关掉框架的视窗交互避免叠加
      wheel: { preventDefault: true },
      zoom: { disabled: true },
      move: { disabled: true },
    });
    const root = new Box({
      x: 0,
      y: 0,
      width: metaRef.current.width,
      height: metaRef.current.height,
      fill: metaRef.current.background,
      // 允许元素拖出画布时，子元素也要画在画布矩形外（否则渲染范围只到画布边界）
      overflow: 'show',
    });
    app.tree.add(root);
    rootRef.current = root;

    // 插件正常会由 App 自动创建 editor；极端情况下兜底手动挂到 sky 层
    const editor =
      (app as unknown as { editor?: Editor }).editor ??
      new Editor({ ...EDITOR_CONFIG, beforeMove: handleBeforeMove });
    if (!(app as unknown as { editor?: Editor }).editor) app.sky.add(editor);
    editorRef.current = editor;

    /**
     * 组件交互开关 → Editor 配置：单选时由元素 editConfig 决定手柄，
     * 多选时 Leafer 只认 Editor 级配置，这里按「选中组件全部允许才开启」合并。
     *
     * refresh 只在面板里改开关时为 true：SELECT 事件里 Editor 还没建好
     * editTool，同步调 updateEditBox 会抛错并把选中框的渲染打断。
     */
    const applyEditorFlags = (ids?: string[], refresh = true) => {
      const current = editorRef.current;
      if (!current) return;
      const targets = ids ?? selectedIdsRef.current;
      const picked = nodesRef.current.filter((node) => targets.includes(node.id));
      current.config.rotateable = picked.every((node) => node.allowRotate !== false);
      current.config.resizeable = picked.every((node) => node.allowResize !== false);
      current.config.skewable = picked.length > 0 && picked.every((node) => node.allowSkew === true);
      if (refresh) current.updateEditBox();
    };
    applyFlagsRef.current = applyEditorFlags;
    // 初挂载还没有选中项，不需要刷新编辑框
    applyEditorFlags(undefined, false);

    nodesRef.current.forEach((node) => {
      const element = createElement(node);
      elementsRef.current.set(node.id, element);
      root.add(element);
    });

    // 背景素材：始终压在所有节点下面，不可选中、不参与吸附
    // 用一层裁切框把素材限制在画布内：横向 / 纵向拉伸时会超出画布，溢出部分不该露出来
    // 背景视频在编辑器里不播放，抽首帧当静态图铺进来，真实播放交给前台
    const backgroundFrame = new Box({
      x: 0,
      y: 0,
      width: metaRef.current.width,
      height: metaRef.current.height,
      overflow: 'hide',
      editable: false,
      hittable: false,
    });
    let backgroundElement: LeaferImage | null = null;
    const syncBackground = () => {
      const { backgroundImage, backgroundVideo, backgroundMode } = metaRef.current;
      const imageUrl = (backgroundImage || '').trim();
      const videoUrl = (backgroundVideo || '').trim();
      if (!imageUrl && !videoUrl) {
        if (backgroundElement) {
          backgroundElement.remove();
          backgroundElement = null;
          backgroundFrame.remove();
        }
        return;
      }
      if (!backgroundElement) {
        backgroundElement = new LeaferImage({
          x: 0,
          y: 0,
          width: metaRef.current.width,
          height: metaRef.current.height,
          editable: false,
          hittable: false,
        });
        backgroundFrame.add(backgroundElement);
        root.add(backgroundFrame, 0);
      }
      const element = backgroundElement;
      // 背景画面调节：与图片节点共用同一套滤镜（CSS filter 语法）
      element.set({
        filter: leaferFilter(metaRef.current.backgroundFilter),
      });
      const canvas = { width: metaRef.current.width, height: metaRef.current.height };
      /** 按素材原始比例铺进画布，规则与前台 CSS 的 object-fit 一致 */
      const applyBox = (natural: CanvasSize) => {
        if (natural.width <= 0 || natural.height <= 0) return;
        if (backgroundMode === 'stretch') {
          element.set({ visible: true, x: 0, y: 0, ...canvas });
          return;
        }
        element.set({ visible: true, ...imageBoxFor(backgroundMode, natural, canvas) });
      };

      if (videoUrl) {
        const coverUrl = (metaRef.current.backgroundVideoCover || '').trim();
        // 有视频封面（视频模块带入）直接用封面渲染，省去每次抽首帧
        if (coverUrl) {
          void loadNaturalSize(previewUrl(coverUrl)).then((natural) => {
            if (backgroundElement !== element) return;
            if (metaRef.current.backgroundVideo !== videoUrl) return;
            element.set({ visible: true, url: previewUrl(coverUrl) });
            applyBox(natural);
          });
          return;
        }
        // 换素材期间先藏起来，避免上一张图残留在画布上
        element.set({ visible: false });
        void loadVideoFrame(videoUrl).then((frame) => {
          if (backgroundElement !== element) return;
          if (metaRef.current.backgroundVideo !== videoUrl) return;
          // 抽帧失败（编码不支持 / 跨域）就只留画布底色，不影响其它编辑
          if (!frame) {
            element.set({ visible: false, url: '' });
            return;
          }
          element.set({ url: frame.url });
          applyBox({ width: frame.width, height: frame.height });
        });
        return;
      }

      element.set({ visible: true, url: previewUrl(imageUrl) });
      if (backgroundMode === 'stretch') {
        element.set({ x: 0, y: 0, ...canvas });
        return;
      }
      void loadNaturalSize(previewUrl(imageUrl)).then((natural) => {
        if (backgroundElement !== element || metaRef.current.backgroundImage !== imageUrl) {
          return;
        }
        element.set(imageBoxFor(backgroundMode, natural, canvas));
      });
    };
    backgroundSyncRef.current = syncBackground;
    syncBackground();

    root.add(guideX);
    root.add(guideY);
    guidesRef.current = { x: guideX, y: guideY };

    const handleSelect = () => {
      const picked = editor.list
        .map((item) => item?.name)
        .filter((name): name is string => !!name);
      // 编组：选中组内任一成员时整组一起选中（锁定的成员跳过，框选到部分成员同样补齐）
      const expanded = new Set(picked);
      picked.forEach((id) => {
        const node = nodesRef.current.find((item) => item.id === id);
        if (!node?.groupId) return;
        nodesRef.current.forEach((item) => {
          if (item.groupId === node.groupId && !item.locked) expanded.add(item.id);
        });
      });
      if (expanded.size > picked.length) {
        const elements = Array.from(expanded)
          .map((id) => elementsRef.current.get(id))
          .filter((element): element is LeaferElement => !!element);
        if (elements.length === expanded.size) {
          editor.select(elements);
          // 交给下一次 SELECT 事件同步选中态，避免这里和编辑器互相打架
          return;
        }
      }
      updateSelection(picked);
      // 选中变化后按新选中的组件刷新开关；编辑框由 Editor 自己重建，这里不主动刷新
      applyEditorFlags(picked, false);
      syncFromCanvas();
    };
    editor.on(EditorEvent.SELECT, handleSelect);
    editor.on(InnerEditorEvent.CLOSE, () => syncFromCanvas());

    /** 按当前视图（适配缩放 × 滚轮缩放 + 平移）摆放画布根 */
    const applyView = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      const { zoom, panX, panY } = viewRef.current;
      const scale = baseScaleRef.current * zoom;
      const rootX = (width - metaRef.current.width * scale) / 2 + panX;
      const rootY = (height - metaRef.current.height * scale) / 2 + panY;
      root.set({ scale, x: rootX, y: rootY });
      // 尺寸标记跟着画布左上角走（贴在画布上沿外侧）
      const badge = sizeBadgeRef.current;
      if (badge) {
        badge.style.left = `${rootX}px`;
        badge.style.top = `${rootY - 18}px`;
      }
      // 视图缩放后编辑框要重新贴合，否则选中框会停在旧比例上
      if (editorRef.current?.list.length) editorRef.current.updateEditBox();
      // HTML 浮层跟着画布一起缩放 / 平移
      syncHtmlOverlaysRef.current();
    };

    /** 视图变化后短暂亮出缩放比例，1.2s 后自动隐藏 */
    const flashZoom = () => {
      setZoomVisible(true);
      if (zoomTimerRef.current !== null) window.clearTimeout(zoomTimerRef.current);
      zoomTimerRef.current = window.setTimeout(() => {
        zoomTimerRef.current = null;
        setZoomVisible(false);
      }, 1200);
    };

    const fit = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      app.resize({ width, height });
      baseScaleRef.current = Math.min(
        width / metaRef.current.width,
        height / metaRef.current.height
      );
      applyView();
    };
    fit();

    resetViewRef.current = () => {
      viewRef.current = { zoom: 1, panX: 0, panY: 0 };
      setZoomPercent(100);
      flashZoom();
      applyView();
    };

    const observer = new ResizeObserver(fit);
    observer.observe(container);

    /** 滚轮缩放：以指针位置为锚点，限制在 20%–400% */
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      // 正在原位编辑文本时不动画布
      if (editingRef.current) return;
      const rect = container.getBoundingClientRect();
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height || !rect.width) return;
      const view = viewRef.current;
      const nextZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, view.zoom * Math.pow(1.0015, -event.deltaY))
      );
      if (Math.abs(nextZoom - view.zoom) < 0.0005) return;

      const pointerX = event.clientX - rect.left;
      const pointerY = event.clientY - rect.top;
      const prevScale = baseScaleRef.current * view.zoom;
      // 指针下的设计坐标，缩放后保持不动
      const designX =
        (pointerX - ((width - metaRef.current.width * prevScale) / 2 + view.panX)) / prevScale;
      const designY =
        (pointerY - ((height - metaRef.current.height * prevScale) / 2 + view.panY)) / prevScale;
      const nextScale = baseScaleRef.current * nextZoom;

      view.zoom = nextZoom;
      view.panX = pointerX - designX * nextScale - (width - metaRef.current.width * nextScale) / 2;
      view.panY = pointerY - designY * nextScale - (height - metaRef.current.height * nextScale) / 2;
      applyView();
      const percent = Math.round(nextZoom * 100);
      setZoomPercent((current) => (current === percent ? current : percent));
      flashZoom();
    };
    container.addEventListener('wheel', handleWheel, { passive: false });

    /**
     * 空格 + 拖动 = 平移画布。
     * 在容器捕获阶段截获按下事件，Leafer 收不到这次交互，所以不会触发选择 / 吸附。
     */
    let panning = false;
    let panStart = { x: 0, y: 0, panX: 0, panY: 0 };
    const handlePanDown = (event: PointerEvent) => {
      if (!metaRef.current.allowPan) return;
      if (!spaceRef.current || event.button !== 0 || editingRef.current) return;
      const target = event.target as Node | null;
      // 只从画布区域开始拖；浮动工具栏 / 缩放按钮上的按下照常响应
      if (!target || !host.contains(target)) return;
      event.preventDefault();
      event.stopPropagation();
      panning = true;
      panStart = {
        x: event.clientX,
        y: event.clientY,
        panX: viewRef.current.panX,
        panY: viewRef.current.panY,
      };
      setPanState('grabbing');
      setPanCursor(host, 'grabbing');
    };
    const handlePanMove = (event: PointerEvent) => {
      if (!panning) return;
      // Leafer 会在 pointermove 里重写 canvas 光标，这里每次拖动都压回去
      setPanCursor(host, 'grabbing');
      viewRef.current.panX = panStart.panX + (event.clientX - panStart.x);
      viewRef.current.panY = panStart.panY + (event.clientY - panStart.y);
      applyView();
    };
    const handlePanUp = () => {
      if (!panning) return;
      panning = false;
      setPanState(spaceRef.current ? 'grab' : 'none');
      setPanCursor(host, spaceRef.current ? 'grab' : '');
    };
    container.addEventListener('pointerdown', handlePanDown, true);
    window.addEventListener('pointermove', handlePanMove);
    window.addEventListener('pointerup', handlePanUp);

    const handlePointerUp = () => {
      // 只有从画布上按下的这一次交互才需要收尾，避免右侧面板里的点击也触发读回
      if (!canvasActiveRef.current) return;
      hideGuides();
      syncFromCanvas();
    };
    // 指针可能在画布外抬起（快速拖出容器），挂在 window 上才能保证落点被读回
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    /** 记录最近一次按下的位置，快捷键与拖动收尾都以此判断画布是否处于交互中 */
    const handleDocPointerDown = (event: PointerEvent) => {
      canvasActiveRef.current = container.contains(event.target as Node);
    };
    document.addEventListener('pointerdown', handleDocPointerDown, true);

    // 指针悬停在画布上时也算「激活」，方便直接空格 + 拖动平移
    const handlePointerEnter = () => {
      pointerInsideRef.current = true;
    };
    const handlePointerLeave = () => {
      pointerInsideRef.current = false;
    };
    container.addEventListener('pointerenter', handlePointerEnter);
    container.addEventListener('pointerleave', handlePointerLeave);

    // 右键：Leafer 的 pointerdown 带 right 标记，先记住命中的节点，再在 contextmenu 里弹菜单
    const handleRightDown = (event: IUIEvent) => {
      if (!event.right) return;
      let leaf = event.target as unknown as LeaferLeafLike | undefined;
      rightDownRef.current = null;
      while (leaf) {
        if (leaf.name && elementsRef.current.has(leaf.name)) {
          rightDownRef.current = leaf.name;
          break;
        }
        leaf = leaf.parent;
      }
    };
    app.tree.on(LeaferPointerEvent.DOWN, handleRightDown);

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      const id = rightDownRef.current;
      rightDownRef.current = null;
      const element = id ? elementsRef.current.get(id) : null;
      const node = id ? nodesRef.current.find((item) => item.id === id) : null;
      if (!id || !element || !node) {
        setMenu(null);
        return;
      }
      // 锁定的节点不能被选中，但菜单照样弹出，方便解锁
      if (!node.locked) {
        const targetIds = groupIdsOf(nodesRef.current, id).filter(
          (item) => !nodesRef.current.find((row) => row.id === item)?.locked
        );
        const targets = targetIds
          .map((item) => elementsRef.current.get(item))
          .filter((item): item is LeaferElement => !!item);
        if (targets.length) editor.select(targets.length === 1 ? targets[0] : targets);
        updateSelection(targetIds);
      }
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(event.clientX - rect.left, rect.width - 148));
      const y = Math.max(0, Math.min(event.clientY - rect.top, rect.height - 288));
      setMenu({ id, x, y });
    };
    container.addEventListener('contextmenu', handleContextMenu);

    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('pointerdown', handlePanDown, true);
      window.removeEventListener('pointermove', handlePanMove);
      window.removeEventListener('pointerup', handlePanUp);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      document.removeEventListener('pointerdown', handleDocPointerDown, true);
      container.removeEventListener('pointerenter', handlePointerEnter);
      container.removeEventListener('pointerleave', handlePointerLeave);
      pointerInsideRef.current = false;
      if (zoomTimerRef.current !== null) {
        window.clearTimeout(zoomTimerRef.current);
        zoomTimerRef.current = null;
      }
      canvasActiveRef.current = false;
      container.removeEventListener('contextmenu', handleContextMenu);
      app.tree.off(LeaferPointerEvent.DOWN, handleRightDown);
      observer.disconnect();
      resetViewRef.current = null;
      backgroundSyncRef.current = null;
      applyFlagsRef.current = null;
      elementsRef.current.clear();
      guidesRef.current = null;
      editorRef.current = null;
      rootRef.current = null;
      app.destroy();
      // destroy 不会移除 Leafer 插入的画布节点：重建实例时会在同一 host 里叠出多个 canvas
      host.replaceChildren();
    };
    // revision：外部换文档 / 撤销重做时重挂实例
  }, [syncFromCanvas, revision, snap, updateSelection]);

  // 告诉外层弹窗：选择器 / 视频选择器 / 右键菜单 / 绘制模式打开时 Esc 先由它们自己处理
  useEffect(() => {
    onOverlayChange?.(pickerOpen || videoPickerOpen || menu !== null || drawMode !== null);
  }, [pickerOpen, videoPickerOpen, menu, drawMode, onOverlayChange]);

  // 右键菜单打开时 Esc 只关菜单
  useEffect(() => {
    if (!menu) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menu]);

  // 空格 + 拖动平移画布：按住空格时画布显示抓手光标
  useEffect(() => {
    const setSpace = (pressed: boolean) => {
      spaceRef.current = pressed;
      setPanState(pressed ? 'grab' : 'none');
      setPanCursor(hostRef.current, pressed ? 'grab' : '');
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.key !== ' ') return;
      if (!metaRef.current.allowPan) return;
      if (isEditableTarget(event.target) || editingRef.current) return;
      // 刚点过画布或指针正停在画布上都算激活
      if (!canvasActiveRef.current && !pointerInsideRef.current) return;
      // 阻止空格滚动页面
      event.preventDefault();
      if (!event.repeat) setSpace(true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.key !== ' ') return;
      setSpace(false);
    };
    const onBlur = () => setSpace(false);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // 组件的「超出画布」开关变化时同步拖拽边界。
  // 用签名做依赖：拖动滑杆改宽高时签名不变，避免每帧重设所有元素的拖拽边界造成闪烁。
  const dragBoundsSignature = useMemo(
    () => nodes.map((node) => `${node.id}:${node.overflow === true ? 1 : 0}`).join('|'),
    [nodes]
  );
  useEffect(() => {
    nodesRef.current.forEach((node) => {
      elementsRef.current.get(node.id)?.set({ dragBounds: nodeDragBounds(node) });
    });
  }, [dragBoundsSignature, revision]);

  /** 批量改属性：同一批选中节点里，只有和主节点同类型的才应用 */
  const patchNodes = useCallback(
    (ids: string[], patch: Record<string, unknown>, key?: string) => {
      if (!ids.length) return;
      const next = nodesRef.current.map((node) =>
        ids.includes(node.id) ? ({ ...node, ...patch } as CanvasNode) : node
      );
      // 只有交互相关字段变化时才重设编辑框配置，普通属性（宽高 / 颜色 / 滤镜）不打断拖拽
      const touchesControl =
        'locked' in patch ||
        'allowRotate' in patch ||
        'allowResize' in patch ||
        'allowSkew' in patch ||
        'overflow' in patch;
      ids.forEach((id) => {
        const element = elementsRef.current.get(id);
        const updated = next.find((node) => node.id === id);
        if (element && updated) applyNodeToElement(element, updated, touchesControl);
      });
      commitNodes(next, { key });
      // 交互开关可能刚被改过：按最新节点刷新编辑框手柄
      if (
        'allowRotate' in patch ||
        'allowResize' in patch ||
        'allowSkew' in patch ||
        'overflow' in patch
      ) {
        applyFlagsRef.current?.(ids);
      }
    },
    [commitNodes]
  );

  /** 精确设置旋转角度：以元素当前视觉中心为轴，等价于拖旋转手柄，元素不会甩出去 */
  const setRotation = useCallback(
    (deg: number) => {
      const ids = selectedIdsRef.current.filter((id) => {
        const node = nodesRef.current.find((item) => item.id === id);
        return node ? node.allowRotate !== false : false;
      });
      if (!ids.length) return;
      let changed = false;
      ids.forEach((id) => {
        const element = elementsRef.current.get(id);
        if (!element) return;
        const delta = deg - Number(element.rotation ?? 0);
        if (Math.abs(delta) < 0.01) return;
        element.rotateOf('center', delta);
        changed = true;
      });
      if (!changed) return;
      const next = nodesRef.current.map((node) => {
        const element = elementsRef.current.get(node.id);
        if (!element) return node;
        return {
          ...node,
          x: round1(element.x ?? 0),
          y: round1(element.y ?? 0),
          rotation: round1(Number(element.rotation ?? 0)),
        };
      });
      // 连续输入角度合并成一条历史记录
      commitNodes(next, { key: 'rotation' });
    },
    [commitNodes]
  );

  /** 打开 HTML 代码弹窗：传 id 编辑已有组件，不传则新增（双击 / 快捷键 / 工具栏共用） */
  const openHtmlEditor = useCallback((id?: string) => {
    const node = id ? nodesRef.current.find((item) => item.id === id) : null;
    if (node?.type === 'html') setHtmlDialog({ id: node.id, code: node.html });
    else setHtmlDialog({ id: null, code: '' });
  }, []);

  /** 双击文本：在元素上方浮出文本框原位编辑 */
  const openTextEditor = useCallback(
    (node: CanvasTextNode) => {
      const element = elementsRef.current.get(node.id);
      if (!element) return;
      const scale = rootRef.current?.scaleX || 1;
      const width = node.width * scale;
      const height = node.height * scale;
      // 用元素中心的世界坐标摆放浮层：旋转时也正好盖在原位置上
      const center = element.getWorldPoint({ x: node.width / 2, y: node.height / 2 });
      const lines = Math.max(1, node.text.split('\n').length);
      setTextEditing({
        id: node.id,
        value: node.text,
        style: {
          left: center.x - width / 2,
          top: center.y - height / 2,
          width,
          height,
          paddingTop: Math.max(0, (height - lines * node.fontSize * 1.4 * scale) / 2),
          fontSize: node.fontSize * scale,
          fontWeight: node.fontWeight,
          fontStyle: node.italic ? 'italic' : 'normal',
          textDecoration: textDecorationCss(node.decoration),
          color: node.color,
          textAlign: node.align,
          lineHeight: 1.4,
          transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
        },
      });
      editingRef.current = node.id;
      // 原元素先隐藏，避免和编辑框里的文字重影
      element.set({ visible: false });
      editorRef.current?.cancel();
      // 面板保持在这条文本上，方便同时调字号 / 颜色
      updateSelection([node.id]);
    },
    [updateSelection]
  );

  /** 关闭原位编辑：传入内容时写回文档（内容没变不记历史） */
  const closeTextEditor = useCallback(
    (value?: string) => {
      const id = editingRef.current;
      if (!id) return;
      editingRef.current = null;
      elementsRef.current.get(id)?.set({ visible: true });
      setTextEditing(null);
      const node = nodesRef.current.find((item) => item.id === id);
      if (typeof value === 'string' && node?.type === 'text' && value !== node.text) {
        patchNodes([id], { text: value.slice(0, 200) }, `${id}:text`);
      }
    },
    [patchNodes]
  );

  // 双击画布上的文本进入原位编辑（第一次点击已经把节点选中了）
  useEffect(() => {
    const container = containerRef.current;
    const host = hostRef.current;
    if (!container || !host) return;
    const onDoubleClick = (event: MouseEvent) => {
      if (spaceRef.current || editingRef.current) return;
      const ids = selectedIdsRef.current;
      if (!ids.length) return;
      // 反序遍历：nodes 从下往上存，先命中上层
      const reversed = [...nodesRef.current].reverse();
      // HTML 组件双击打开代码弹窗
      const htmlTarget = reversed.find(
        (item): item is CanvasHtmlNode =>
          item.type === 'html' && ids.includes(item.id) && !item.locked
      );
      if (htmlTarget) {
        openHtmlEditor(htmlTarget.id);
        return;
      }
      const texts = reversed.filter(
        (item): item is CanvasTextNode =>
          item.type === 'text' && ids.includes(item.id) && !item.locked
      );
      if (!texts.length) return;
      // 单选直接进入编辑；编组 / 多选时按双击位置找命中的那一条文本
      const target =
        ids.length === 1
          ? texts[0]
          : (() => {
              const rect = host.getBoundingClientRect();
              const world = { x: event.clientX - rect.left, y: event.clientY - rect.top };
              return texts.find((item) => elementsRef.current.get(item.id)?.hit(world));
            })();
      if (target) openTextEditor(target);
    };
    container.addEventListener('dblclick', onDoubleClick);
    return () => container.removeEventListener('dblclick', onDoubleClick);
  }, [openTextEditor, openHtmlEditor]);

  /** 吸附辅助线要始终盖在节点上面：新增 / 粘贴元素后重新提到最上层 */
  const raiseGuides = useCallback(() => {
    const root = rootRef.current;
    const guides = guidesRef.current;
    if (!root || !guides) return;
    root.add(guides.x);
    root.add(guides.y);
  }, []);

  const addNode = useCallback(
    (node: CanvasNode, position: 'top' | 'bottom') => {
      const root = rootRef.current;
      const element = createElement(node);
      elementsRef.current.set(node.id, element);
      if (root) {
        // 置底：有背景图时压在背景图上面，没有背景图就放到最底层
        const bottomIndex =
          metaRef.current.backgroundImage || metaRef.current.backgroundVideo ? 1 : 0;
        root.add(element, position === 'bottom' ? bottomIndex : undefined);
        raiseGuides();
      }
      const next =
        position === 'bottom' ? [node, ...nodesRef.current] : [...nodesRef.current, node];
      commitNodes(next);
      editorRef.current?.select(element);
      updateSelection([node.id]);
    },
    [commitNodes, raiseGuides, updateSelection]
  );

  /** 新增文本：框宽按文字宽度给，位置仍居中 */
  const addTextNode = useCallback(() => {
    const canvas = metaRef.current;
    const text = '文本';
    const fontSize = canvas.width >= 1000 ? 48 : 24;
    addNode(
      createTextNode(canvas, text, {
        fontSize,
        color: defaultInkColor(canvas.background),
        width: measureTextWidth(text, fontSize, 600),
      }),
      'top'
    );
  }, [addNode]);

  const commitHtml = useCallback(
    (code: string) => {
      if (!htmlDialog) return;
      if (htmlDialog.id) {
        patchNodes([htmlDialog.id], { html: code }, `${htmlDialog.id}:html`);
      } else {
        addNode(createHtmlNode(metaRef.current, code), 'top');
      }
      setHtmlDialog(null);
    },
    [addNode, htmlDialog, patchNodes]
  );

  /** 屏幕坐标 → 画布设计坐标（含适配缩放、滚轮缩放与平移） */
  const toDesignPoint = useCallback((clientX: number, clientY: number) => {
    const container = containerRef.current;
    if (!container) return null;
    const scale = baseScaleRef.current * viewRef.current.zoom;
    if (!scale) return null;
    const rect = container.getBoundingClientRect();
    const rootX =
      (container.clientWidth - metaRef.current.width * scale) / 2 + viewRef.current.panX;
    const rootY =
      (container.clientHeight - metaRef.current.height * scale) / 2 + viewRef.current.panY;
    return {
      x: (clientX - rect.left - rootX) / scale,
      y: (clientY - rect.top - rootY) / scale,
    };
  }, []);

  /** 进入绘制模式：先取消选中，避免选中框挡在绘制层下面 */
  const startDraw = useCallback(
    (mode: CanvasDrawMode) => {
      editorRef.current?.cancel();
      updateSelection([]);
      drawStartRef.current = null;
      setDrawDraft(null);
      setDrawMode(mode);
    },
    [updateSelection]
  );

  const handleDrawPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drawStartRef.current = { x: event.clientX, y: event.clientY };
    setDrawDraft({ x: 0, y: 0, width: 0, height: 0 });
  }, []);

  const handleDrawPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const start = drawStartRef.current;
    const container = containerRef.current;
    if (!start || !container) return;
    const rect = container.getBoundingClientRect();
    let width = Math.abs(event.clientX - start.x);
    let height = Math.abs(event.clientY - start.y);
    let left = Math.min(start.x, event.clientX);
    let top = Math.min(start.y, event.clientY);
    // 圆形默认按正圆绘制；矩形 / SVG 按住 Shift 锁定正方形
    if (event.shiftKey || drawMode === 'ellipse') {
      const size = Math.max(width, height);
      width = size;
      height = size;
      left = event.clientX >= start.x ? start.x : start.x - size;
      top = event.clientY >= start.y ? start.y : start.y - size;
    }
    setDrawDraft({
      x: left - rect.left,
      y: top - rect.top,
      width,
      height,
    });
  }, [drawMode]);

  const cancelDraw = useCallback(() => {
    drawStartRef.current = null;
    setDrawDraft(null);
    setDrawMode(null);
  }, []);

  /** 松手：把拖拽范围换算成设计像素并创建对应图形；几乎没拖动时给默认大小 */
  const handleDrawPointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const start = drawStartRef.current;
      const mode = drawMode;
      drawStartRef.current = null;
      setDrawDraft(null);
      setDrawMode(null);
      if (!start || !mode) return;
      const from = toDesignPoint(start.x, start.y);
      const to = toDesignPoint(event.clientX, event.clientY);
      if (!from || !to) return;
      const canvas = metaRef.current;
      let width = Math.abs(to.x - from.x);
      let height = Math.abs(to.y - from.y);
      let x = Math.min(from.x, to.x);
      let y = Math.min(from.y, to.y);
      // 圆形始终保持正圆；矩形 / SVG 按住 Shift 时锁定正方形
      if (event.shiftKey || mode === 'ellipse') {
        const size = Math.max(width, height);
        width = size;
        height = size;
        x = to.x >= from.x ? from.x : from.x - size;
        y = to.y >= from.y ? from.y : from.y - size;
      }
      if (width < 8 || height < 8) {
        const defaultWidth = canvas.width >= 1000 ? 240 : 120;
        if (mode === 'svg') {
          width = canvas.width >= 1000 ? 160 : 96;
          height = width;
        } else if (mode === 'ellipse') {
          width = defaultWidth;
          height = defaultWidth;
        } else {
          width = defaultWidth;
          height = Math.round(defaultWidth * 0.65);
        }
        x = from.x - width / 2;
        y = from.y - height / 2;
      }
      // 绘制范围限制在画布内
      width = Math.max(8, Math.min(width, canvas.width));
      height = Math.max(8, Math.min(height, canvas.height));
      const box: CanvasNodeBox = {
        x: Math.round(Math.max(0, Math.min(x, canvas.width - width))),
        y: Math.round(Math.max(0, Math.min(y, canvas.height - height))),
        width: Math.round(width),
        height: Math.round(height),
      };
      const fill = defaultInkColor(canvas.background);
      if (mode === 'rect') addNode(createRectNode(canvas, { box, fill }), 'top');
      else if (mode === 'ellipse') addNode(createEllipseNode(canvas, { box, fill }), 'top');
      else addNode(createSvgNode(canvas, { box, color: fill }), 'top');
    },
    [addNode, drawMode, toDesignPoint]
  );

  // 绘制模式下 Esc 退出；捕获阶段拦下，避免外层弹窗跟着关闭
  useEffect(() => {
    if (!drawMode) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      cancelDraw();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [drawMode, cancelDraw]);

  /** 把拖入的文件落到画布上：图片 / SVG 变成节点，视频换成背景；文件先本地预览，保存时再上传 */
  const dropFiles = useCallback(
    async (files: File[], at: { x: number; y: number }) => {
      const canvas = metaRef.current;
      let offset = 0;
      for (const file of files) {
        const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
        const isImage = isSvg || file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        if (isVideo) {
          patchCanvas({ backgroundVideo: registerPendingFile(file), backgroundVideoCover: '' });
          continue;
        }
        if (!isImage) continue;
        const url = registerPendingFile(file);
        const natural = await loadNaturalSize(url);
        const nw = natural.width > 0 ? natural.width : canvas.width * 0.5;
        const nh = natural.height > 0 ? natural.height : canvas.height * 0.5;
        // 限制在画布 60% 以内，避免一张大图铺满整块画布
        const scale = Math.min(1, (canvas.width * 0.6) / nw, (canvas.height * 0.6) / nh);
        const width = Math.max(16, Math.round(nw * scale));
        const height = Math.max(16, Math.round(nh * scale));
        const x = Math.round(Math.max(0, Math.min(at.x - width / 2 + offset, canvas.width - width)));
        const y = Math.round(Math.max(0, Math.min(at.y - height / 2 + offset, canvas.height - height)));
        offset += 20;
        if (isSvg) {
          addNode(
            {
              ...createSvgNode(canvas),
              x,
              y,
              width,
              height,
              url,
              preset: undefined,
              color: undefined,
            },
            'top'
          );
        } else {
          addNode({ ...createImageNode(canvas, url, 'fit', natural), x, y, width, height }, 'top');
        }
      }
    },
    [addNode, patchCanvas]
  );

  const handleCanvasDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    setDropActive(true);
  }, []);

  const handleCanvasDragLeave = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    // 指针在画布内部移动时不算离开
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setDropActive(false);
  }, []);

  const handleCanvasDrop = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      if (!event.dataTransfer.types.includes('Files')) return;
      event.preventDefault();
      setDropActive(false);
      const files = Array.from(event.dataTransfer.files ?? []);
      if (!files.length) return;
      const at = toDesignPoint(event.clientX, event.clientY) ?? {
        x: metaRef.current.width / 2,
        y: metaRef.current.height / 2,
      };
      void dropFiles(files, at);
    },
    [dropFiles, toDesignPoint]
  );


  /** 多选对齐：左 / 水平居中 / 右 / 顶 / 垂直居中 / 底，按选中元素的合并范围对齐 */
  const alignSelected = useCallback(
    (mode: CanvasAlignMode) => {
      const ids = selectedIdsRef.current;
      if (ids.length < 2) return;
      const selected = nodesRef.current.filter((node) => ids.includes(node.id));
      if (selected.length < 2) return;
      const left = Math.min(...selected.map((node) => node.x));
      const right = Math.max(...selected.map((node) => node.x + node.width));
      const center = (left + right) / 2;
      const top = Math.min(...selected.map((node) => node.y));
      const bottom = Math.max(...selected.map((node) => node.y + node.height));
      const middle = (top + bottom) / 2;
      const next = nodesRef.current.map((node) => {
        if (!ids.includes(node.id)) return node;
        if (mode === 'top' || mode === 'middle' || mode === 'bottom') {
          const y =
            mode === 'top' ? top : mode === 'bottom' ? bottom - node.height : middle - node.height / 2;
          return { ...node, y: round1(y) };
        }
        const x =
          mode === 'left'
            ? left
            : mode === 'right'
              ? right - node.width
              : center - node.width / 2;
        return { ...node, x: round1(x) };
      });
      ids.forEach((id) => {
        const element = elementsRef.current.get(id);
        const updated = next.find((node) => node.id === id);
        if (element && updated) applyNodeToElement(element, updated, false);
      });
      commitNodes(next);
      // 元素位置变了，多选框要重新贴合
      editorRef.current?.updateEditBox();
    },
    [commitNodes]
  );

  const removeNodes = useCallback(
    (ids: string[]) => {
      // 系统固定组件（如「跳过开屏」）不允许删除
      const removable = ids.filter(
        (id) => !nodesRef.current.find((node) => node.id === id)?.fixed
      );
      if (!removable.length) return;
      editorRef.current?.cancel();
      removable.forEach((id) => {
        const element = elementsRef.current.get(id);
        if (!element) return;
        element.remove();
        elementsRef.current.delete(id);
      });
      commitNodes(nodesRef.current.filter((node) => !removable.includes(node.id)));
      updateSelection([]);
    },
    [commitNodes, updateSelection]
  );

  /**
   * 层级调整：把选中的节点整体置顶 / 置底。
   * 不改用 toTop / toBottom，避免把元素塞到背景图下面，直接重排 root 的子元素。
   */
  const shiftSelection = useCallback(
    (direction: 'top' | 'bottom', ids?: string[]) => {
      const root = rootRef.current;
      const editor = editorRef.current;
      const targets = ids?.length ? ids : selectedIdsRef.current;
      if (!root || !editor || !targets.length) return;
      const targetSet = new Set(targets);
      const selected = nodesRef.current.filter((node) => targetSet.has(node.id));
      const others = nodesRef.current.filter((node) => !targetSet.has(node.id));
      const next = direction === 'top' ? [...others, ...selected] : [...selected, ...others];
      // 置底要压在背景图上面：有背景图时从索引 1 开始，否则从最底层开始
      const bottomIndex =
        metaRef.current.backgroundImage || metaRef.current.backgroundVideo ? 1 : 0;
      editor.cancel();
      next.forEach((node, index) => {
        const element = elementsRef.current.get(node.id);
        if (!element) return;
        element.remove();
        root.add(element, bottomIndex + index);
      });
      const elements = selected
        .map((node) => elementsRef.current.get(node.id))
        .filter((element): element is LeaferElement => !!element);
      if (elements.length) editor.select(elements.length === 1 ? elements[0] : elements);
      updateSelection(selected.map((node) => node.id));
      commitNodes(next);
    },
    [commitNodes, updateSelection]
  );

  /** 图层拖拽排序：按传入的从下到上节点 id 顺序重排，并同步 Leafer 层级 */
  const reorderNodes = useCallback(
    (orderedIds: string[]) => {
      const root = rootRef.current;
      if (!root) return;
      const current = nodesRef.current;
      const byId = new Map(current.map((node) => [node.id, node]));
      const next: CanvasNode[] = [];
      orderedIds.forEach((id) => {
        const node = byId.get(id);
        if (!node) return;
        next.push(node);
        byId.delete(id);
      });
      // 容错：没被传入的节点保持在最上层
      byId.forEach((node) => next.push(node));
      if (
        next.length === current.length &&
        next.every((node, index) => node.id === current[index].id)
      ) {
        return;
      }
      const bottomIndex =
        metaRef.current.backgroundImage || metaRef.current.backgroundVideo ? 1 : 0;
      editorRef.current?.cancel();
      next.forEach((node, i) => {
        const element = elementsRef.current.get(node.id);
        if (!element) return;
        element.remove();
        root.add(element, bottomIndex + i);
      });
      raiseGuides();
      commitNodes(next);
      const kept = selectedIdsRef.current.filter((id) => next.some((node) => node.id === id));
      const elements = kept
        .map((id) => elementsRef.current.get(id))
        .filter((element): element is LeaferElement => !!element);
      if (elements.length) {
        editorRef.current?.select(elements.length === 1 ? elements[0] : elements);
      }
      updateSelection(kept);
    },
    [commitNodes, raiseGuides, updateSelection]
  );

  /** 锁定 / 解锁：锁定的节点不再被选中，避免误拖；解锁后重新选中方便继续编辑 */
  const toggleLock = useCallback(
    (ids?: string[]) => {
      const targets = ids?.length ? ids : selectedIdsRef.current;
      if (!targets.length) return;
      const selected = nodesRef.current.filter((node) => targets.includes(node.id));
      // 只要还有未锁定的，就整体锁定；全都锁定时再统一解锁
      const lock = selected.some((node) => !node.locked);
      const next = nodesRef.current.map((node) =>
        targets.includes(node.id)
          ? ({ ...node, locked: lock || undefined } as CanvasNode)
          : node
      );
      targets.forEach((id) => {
        elementsRef.current.get(id)?.set({ editable: !lock, draggable: !lock });
      });
      const editor = editorRef.current;
      editor?.cancel();
      commitNodes(next);
      if (!lock) {
        const elements = targets
          .map((id) => elementsRef.current.get(id))
          .filter((element): element is LeaferElement => !!element);
        if (elements.length) editor?.select(elements.length === 1 ? elements[0] : elements);
        updateSelection(targets);
      } else {
        updateSelection([]);
      }
    },
    [commitNodes, updateSelection]
  );

  /** 图层面板点行选中：锁定图层不可选，编组由画布统一扩展成整组 */
  const selectFromLayers = useCallback(
    (id: string) => {
      const node = nodesRef.current.find((item) => item.id === id);
      const element = elementsRef.current.get(id);
      const editor = editorRef.current;
      if (!node || !element || !editor || node.locked) return;
      editor.select(element);
      // 编组节点交给 SELECT 事件补齐全组，这里不要用单个 id 覆盖
      if (!node.groupId) updateSelection([id]);
    },
    [updateSelection]
  );

  /** 图层面板点锁：组行传整组，子项只锁自己 */
  const toggleLayerLock = useCallback(
    (ids: string[]) => toggleLock(ids),
    [toggleLock]
  );

  /** 编组：选中的节点共用一个 groupId，之后点击任一成员即整组选中 */
  const groupSelected = useCallback(
    (ids?: string[]) => {
      const targets = ids?.length ? ids : selectedIdsRef.current;
      if (targets.length < 2) return;
      const groupId = createCanvasGroupId();
      const next = nodesRef.current.map((node) =>
        targets.includes(node.id) ? ({ ...node, groupId } as CanvasNode) : node
      );
      commitNodes(next);
    },
    [commitNodes]
  );

  /** 取消编组：把选中节点从各自的组里摘出来 */
  const ungroupSelected = useCallback(
    (ids?: string[]) => {
      const targets = ids?.length ? ids : selectedIdsRef.current;
      if (!targets.length) return;
      const hasGroup = nodesRef.current.some((node) => targets.includes(node.id) && node.groupId);
      if (!hasGroup) return;
      const next = nodesRef.current.map((node) =>
        targets.includes(node.id) ? ({ ...node, groupId: undefined } as CanvasNode) : node
      );
      commitNodes(next);
    },
    [commitNodes]
  );

  /** 复制选中的节点到内存剪贴板（保留相对位置与编组关系） */
  const copySelected = useCallback(() => {
    const ids = selectedIdsRef.current;
    if (!ids.length) return;
    clipboardNodes = nodesRef.current.filter((node) => ids.includes(node.id));
  }, []);

  /**
   * 粘贴：生成新 id、整体偏移 16px，编组关系复制成新的组；
   * 贴到右下会超出画布时反向偏移，保证副本仍落在画布里。
   */
  const pasteClipboard = useCallback(() => {
    const source = clipboardNodes;
    const root = rootRef.current;
    if (!source.length || !root) return;
    const canvas = metaRef.current;
    const offset = 16;
    const overflow = source.some(
      (node) =>
        node.x + node.width + offset > canvas.width || node.y + node.height + offset > canvas.height
    );
    const dx = overflow ? -offset : offset;
    const dy = dx;
    const groups = new Map<string, string>();
    const pasted: CanvasNode[] = [];
    source.forEach((node) => {
      let groupId: string | undefined;
      if (node.groupId) {
        groupId = groups.get(node.groupId);
        if (!groupId) {
          groupId = createCanvasGroupId();
          groups.set(node.groupId, groupId);
        }
      }
      // 副本默认不锁定，避免粘贴出一个动不了的图层
      const copy = {
        ...node,
        id: createCanvasNodeId(),
        x: round1(node.x + dx),
        y: round1(node.y + dy),
        locked: undefined,
        groupId,
      } as CanvasNode;
      pasted.push(copy);
      const element = createElement(copy);
      elementsRef.current.set(copy.id, element);
      root.add(element);
    });
    raiseGuides();
    commitNodes([...nodesRef.current, ...pasted]);
    const elements = pasted
      .map((node) => elementsRef.current.get(node.id))
      .filter((element): element is LeaferElement => !!element);
    if (elements.length) {
      editorRef.current?.select(elements.length === 1 ? elements[0] : elements);
    }
    updateSelection(pasted.map((node) => node.id));
  }, [commitNodes, raiseGuides, updateSelection]);

  /** 创建副本：等价于复制当前选中内容后立刻粘贴 */
  const duplicateSelected = useCallback(() => {
    copySelected();
    pasteClipboard();
  }, [copySelected, pasteClipboard]);

  /**
   * 画布快捷键（焦点不在输入框、也不在文本内编辑时生效）：
   *   Ctrl/Cmd+Z 撤销、Ctrl/Cmd+Shift+Z / Ctrl+Y 重做
   *   Ctrl/Cmd+C 复制、Ctrl/Cmd+V 粘贴、Ctrl/Cmd+D 创建副本
   *   Delete / Backspace 删除、[ 置底、] 置顶（与 Figma 一致）
   *   Ctrl/Cmd+G 编组、Ctrl/Cmd+Shift+G 取消编组、Ctrl/Cmd+Shift+L 锁定 / 解锁
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target) || editorRef.current?.innerEditing) return;
      const mod = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      // 最近一次按下不在画布上（例如正在右侧面板里操作）时，不响应会改动画布的快捷键；
      // 撤销 / 重做沿用原来的全局行为
      const onCanvas = canvasActiveRef.current;

      if (mod) {
        if (key === 'z') {
          event.preventDefault();
          if (event.shiftKey) redo();
          else undo();
          return;
        }
        if (key === 'y') {
          event.preventDefault();
          redo();
          return;
        }
        if (!onCanvas) return;
        if (key === 'c') {
          event.preventDefault();
          copySelected();
          return;
        }
        if (key === 'v') {
          event.preventDefault();
          pasteClipboard();
          return;
        }
        if (key === 'd') {
          event.preventDefault();
          duplicateSelected();
          return;
        }
        if (key === 'g') {
          event.preventDefault();
          if (event.shiftKey) ungroupSelected();
          else groupSelected();
          return;
        }
        if (key === 'l' && event.shiftKey) {
          // 与 Figma 一致：Ctrl/Cmd+Shift+L 锁定 / 解锁
          event.preventDefault();
          toggleLock();
        }
        return;
      }

      // 快捷键新增组件：鼠标悬停在画布上即可触发
      //   T 文本、I 图片、H HTML 代码；R / O / S 进入矩形 / 圆形 / SVG 的拖拽绘制模式
      if (
        key === 't' ||
        key === 'i' ||
        key === 'h' ||
        key === 'r' ||
        key === 'o' ||
        key === 's'
      ) {
        if (!canvasActiveRef.current && !pointerInsideRef.current) return;
        event.preventDefault();
        if (key === 't') {
          addTextNode();
        } else if (key === 'i') {
          openImagePicker();
        } else if (key === 'h') {
          openHtmlEditor();
        } else {
          startDraw(key === 'r' ? 'rect' : key === 'o' ? 'ellipse' : 'svg');
        }
        return;
      }

      if (!onCanvas) return;
      if (key === 'delete' || key === 'backspace') {
        if (!selectedIdsRef.current.length) return;
        event.preventDefault();
        setMenu(null);
        removeNodes(selectedIdsRef.current);
        return;
      }
      if (key === '[') {
        event.preventDefault();
        shiftSelection('bottom');
        return;
      }
      if (key === ']') {
        event.preventDefault();
        shiftSelection('top');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    undo,
    redo,
    copySelected,
    pasteClipboard,
    duplicateSelected,
    groupSelected,
    ungroupSelected,
    toggleLock,
    removeNodes,
    shiftSelection,
    startDraw,
    addTextNode,
    addNode,
    openImagePicker,
    openHtmlEditor,
  ]);

  /** 落图：替换时只换地址，新增时铺满画布并压到最底层，不裁剪 */
  async function applyImage(url: string, replaceId: string | null) {
    const stored = (url || '').trim();
    if (!stored) return;
    if (replaceId) {
      patchNodes([replaceId], { url: stored });
      return;
    }
    const natural = await loadNaturalSize(previewUrl(stored));
    addNode(createImageNode(metaRef.current, stored, 'stretch', natural), 'bottom');
  }

  /** 打开图片来源：优先用调用方提供的 pickImage，否则弹内置文件选择器 */
  function openImagePicker(replaceId: string | null = null) {
    if (pickImage) {
      Promise.resolve(pickImage())
        .then((url) => (url ? applyImage(url, replaceId) : undefined))
        .catch(() => undefined);
      return;
    }
    setPickerTarget('node');
    setReplacingId(replaceId);
    setPickerOpen(true);
  }

  /** 选择 / 替换 SVG 图形：上传或从文件中心挑 .svg 文件 */
  function openSvgPicker(replaceId: string | null = null) {
    setPickerTarget('svg');
    setReplacingId(replaceId);
    setPickerOpen(true);
  }

  /** 选画布背景图：结果写进画布配置而不是变成组件（与背景视频并存，视频优先渲染） */
  function pickBackgroundImage() {
    if (pickImage) {
      Promise.resolve(pickImage())
        .then((url) => (url ? patchCanvas({ backgroundImage: url.trim() }) : undefined))
        .catch(() => undefined);
      return;
    }
    setReplacingId(null);
    setPickerTarget('background-image');
    setPickerOpen(true);
  }

  /** 选画布背景视频：打开视频选择器（视频模块），选中后视频与封面一起写进画布配置 */
  function pickBackgroundVideo() {
    setVideoPickerOpen(true);
  }

  /** 视频选择器确认：视频地址与封面都存纯后端路径，与背景图并存（视频优先渲染） */
  function handleVideoPicked(items: VideoItem[]) {
    const video = items[0];
    setVideoPickerOpen(false);
    if (!video) return;
    const toStored = (raw?: string) =>
      (raw || '').trim().replace(/^https?:\/\/[^/]+/i, '').replace(/^\/snowy/, '');
    patchCanvas({
      backgroundVideo: toStored(video.videoUrl),
      backgroundVideoCover: toStored(video.coverUrl),
    });
  }

  function closePicker() {
    setPickerOpen(false);
    setReplacingId(null);
    setPickerTarget('node');
  }

  function handlePicked(files: DevFile[]) {
    const file = files[0];
    const replaceId = replacingId;
    const target = pickerTarget;
    closePicker();
    if (!file) return;
    const stored = toOpenUrl(file).replace(/^\/snowy/, '');
    // 背景：图 / 视频可以同时保留，渲染时视频优先；删除由封面上的删除按钮负责
    if (target === 'background-video') {
      patchCanvas({ backgroundVideo: stored });
      return;
    }
    if (target === 'background-image') {
      patchCanvas({ backgroundImage: stored });
      return;
    }
    // SVG 组件：换图后不再关联内置图形，颜色由文件本身决定
    if (target === 'svg') {
      if (replaceId) {
        patchNodes([replaceId], { url: stored, preset: undefined, color: undefined });
      }
      return;
    }
    void applyImage(stored, replaceId);
  }

  /** 切换填充方式：重新读取图片原始比例，按新模式重排框 */
  async function applyImageMode(id: string, mode: CanvasImageMode) {
    const node = nodesRef.current.find((item) => item.id === id);
    if (!node || node.type !== 'image' || !node.url) return;
    const natural = await loadNaturalSize(previewUrl(node.url));
    patchNodes([id], { mode, ...imageBoxFor(mode, natural, metaRef.current) });
  }

  const selectedNode = nodes.find((node) => node.id === selectedIds[0]) ?? null;
  const toolList = tools ?? DEFAULT_TOOLS;
  const htmlNodes = nodes.filter((node) => node.type === 'html');

  const inspectorContext: CanvasInspectorContext = {
    node: selectedNode,
    canvasWidth: metaRef.current.width,
    canvasHeight: metaRef.current.height,
    background: metaRef.current.background,
    backgroundImage: metaRef.current.backgroundImage,
    backgroundVideo: metaRef.current.backgroundVideo,
    backgroundVideoCover: metaRef.current.backgroundVideoCover,
    backgroundMode: metaRef.current.backgroundMode,
    backgroundFilter: metaRef.current.backgroundFilter,
    allowPan: metaRef.current.allowPan,
    selectedCount: selectedIds.length,
    onPatch: (patch) => {
      if (!selectedNode) return;
      const ids = selectedIds.filter((id) => {
        const node = nodes.find((item) => item.id === id);
        return node?.type === selectedNode.type;
      });
      patchNodes(ids, patch, `${ids.join(',')}:${Object.keys(patch).join(',')}`);
    },
    onReplaceImage: () => {
      if (selectedNode) openImagePicker(selectedNode.id);
    },
    onReplaceSvg: () => {
      if (selectedNode) openSvgPicker(selectedNode.id);
    },
    onEditHtml: () => {
      if (selectedNode?.type === 'html') openHtmlEditor(selectedNode.id);
    },
    onFitText: () => {
      if (selectedNode?.type !== 'text') return;
      // 多行文本按最长一行算宽度，和真实排版一致
      const width = Math.max(
        ...selectedNode.text
          .split('\n')
          .map((line) => measureTextWidth(line || ' ', selectedNode.fontSize, selectedNode.fontWeight))
      );
      patchNodes([selectedNode.id], { width }, `${selectedNode.id}:fit-width`);
    },
    onImageMode: (mode) => {
      if (selectedNode) void applyImageMode(selectedNode.id, mode);
    },
    onDelete: () => removeNodes(selectedIds),
    onDuplicate: duplicateSelected,
    onAlign: alignSelected,
    onRotate: setRotation,
    onToggleLock: () => toggleLock(),
    onCanvasPatch: patchCanvas,
    onFitView: () => resetViewRef.current?.(),
    onPickBackgroundImage: pickBackgroundImage,
    onClearBackgroundImage: () => patchCanvas({ backgroundImage: '' }),
    onPickBackgroundVideo: pickBackgroundVideo,
    onClearBackgroundVideo: () => patchCanvas({ backgroundVideo: '', backgroundVideoCover: '' }),
  };

  const inspector =
    typeof renderInspector === 'function'
      ? renderInspector(inspectorContext)
      : (renderInspector ?? <CanvasNodeInspector {...inspectorContext} />);

  const menuNode = menu ? (nodes.find((node) => node.id === menu.id) ?? null) : null;
  // 右键菜单按「整组」操作，组内任一成员被右键都作用于整组
  const menuIds = menuNode ? groupIdsOf(nodes, menuNode.id) : [];

  return (
    <div className={className ?? 'flex h-full min-h-0 flex-col'}>
      <div className="flex min-h-0 flex-1">
        {/* 图层面板：固定占位在左侧，和右侧属性面板对称 */}
        {layers && (
          <CanvasLayerPanel
            nodes={nodes}
            selectedIds={selectedIds}
            onSelect={selectFromLayers}
            onToggleLock={toggleLayerLock}
            onDelete={removeNodes}
            onReorder={reorderNodes}
          />
        )}

        {/* 画布：Leafer 画布铺满容器，设计稿按比例居中缩放 */}
        <div
          ref={containerRef}
          className={`relative min-h-0 min-w-0 flex-1 overflow-hidden bg-[#ECECF0] ${
            panState === 'grabbing'
              ? 'cursor-grabbing'
              : panState === 'grab'
                ? 'cursor-grab'
                : ''
          }`}
          onDragOver={handleCanvasDragOver}
          onDragLeave={handleCanvasDragLeave}
          onDrop={handleCanvasDrop}
        >
          <div ref={hostRef} className="absolute inset-0" />

          {/* 绘制模式：覆盖在画布上，按下快捷键后用鼠标拖拽画出图形 */}
          {drawMode && (
            <div
              className="absolute inset-0 z-10 cursor-crosshair touch-none"
              onPointerDown={handleDrawPointerDown}
              onPointerMove={handleDrawPointerMove}
              onPointerUp={handleDrawPointerUp}
              onPointerCancel={cancelDraw}
            >
              {drawDraft && drawDraft.width > 0 && drawDraft.height > 0 && (
                <div
                  className="pointer-events-none absolute border border-dashed border-[#0071E3] bg-[#0071E3]/10"
                  style={{
                    left: drawDraft.x,
                    top: drawDraft.y,
                    width: drawDraft.width,
                    height: drawDraft.height,
                    borderRadius: drawMode === 'ellipse' ? '50%' : drawMode === 'svg' ? 4 : 0,
                  }}
                />
              )}
              <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
                <span className="rounded-full bg-[#1D1D1F]/85 px-3 py-1 text-[11px] text-white shadow">
                  {`${
                    drawMode === 'rect'
                      ? '拖拽绘制矩形'
                      : drawMode === 'ellipse'
                        ? '拖拽绘制圆形'
                        : '拖拽绘制 SVG 图形'
                  }，按 Esc 退出`}
                </span>
              </div>
            </div>
          )}

          {/* 文件拖入提示：松手后先在画布本地预览，保存配置时才上传 */}
          {dropActive && (
            <div className="pointer-events-none absolute inset-2 z-20 flex items-center justify-center rounded-lg bg-[#0071E3]/5 ring-2 ring-inset ring-[#0071E3]">
              <span className="rounded-full bg-[#0071E3] px-3 py-1 text-[11px] text-white shadow">
                松开添加到画布，保存配置时上传
              </span>
            </div>
          )}

          {/* 画布尺寸标记：跟着画布左上角，随缩放 / 平移一起移动 */}
          <span
            ref={sizeBadgeRef}
            className="pointer-events-none absolute z-10 rounded bg-white/70 px-1 text-[10px] tabular-nums leading-[14px] text-[#86868B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] backdrop-blur-sm"
          >
            {value.width} × {value.height}
          </span>

          {/* 右下角：缩放比例 + 快捷键帮助 */}
          <div
            ref={helpRef}
            className="absolute bottom-4 right-3 z-20 flex flex-col items-end gap-2"
          >
            <div
              className={`pointer-events-none rounded-full bg-[#1D1D1F]/85 px-2 py-0.5 text-[10.5px] tabular-nums text-white shadow-[0_4px_12px_rgba(0,0,0,0.16)] transition-opacity duration-200 ${
                zoomVisible ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden={!zoomVisible}
            >
              {zoomPercent}%
            </div>

            {helpOpen && (
              <div className="w-[250px] rounded-xl border border-black/[0.06] bg-white/95 p-3 shadow-[0_12px_32px_rgba(0,0,0,0.18)] backdrop-blur">
                <div className="mb-2 text-[11px] font-semibold text-[#1D1D1F]">快捷键</div>
                <ul className="space-y-1">
                  {SHORTCUTS.map(([key, text]) => (
                    <li
                      key={key}
                      className="flex items-center justify-between gap-2 text-[10.5px] text-[#6E6E73]"
                    >
                      <kbd className="shrink-0 rounded bg-[#F5F5F7] px-1.5 py-0.5 font-mono text-[10px] text-[#3A3A3C]">
                        {key}
                      </kbd>
                      <span className="truncate">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              type="button"
              onClick={() => setHelpOpen((open) => !open)}
              aria-label="快捷键帮助"
              aria-pressed={helpOpen}
              className={`inline-flex h-7 w-7 items-center justify-center rounded-full border shadow-[0_4px_12px_rgba(0,0,0,0.16)] transition-colors ${
                helpOpen
                  ? 'border-[#0071E3] bg-[#0071E3] text-white'
                  : 'border-[#E5E5EA] bg-white/95 text-[#6E6E73] hover:text-[#0071E3]'
              }`}
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          </div>

          {/* 文本原位编辑：双击文本后在原位置浮出输入框 */}
          {textEditing && (
            <textarea
              key={textEditing.id}
              autoFocus
              value={textEditing.value}
              spellCheck={false}
              onChange={(event) =>
                setTextEditing((current) =>
                  current ? { ...current, value: event.target.value } : current
                )
              }
              onFocus={(event) => {
                const element = event.currentTarget;
                if (!element.dataset.selected) {
                  element.dataset.selected = '1';
                  element.select();
                }
              }}
              onBlur={() => closeTextEditor(textEditing.value)}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === 'Escape' || ((event.metaKey || event.ctrlKey) && event.key === 'Enter')) {
                  event.preventDefault();
                  closeTextEditor(textEditing.value);
                }
              }}
              style={{
                position: 'absolute',
                zIndex: 15,
                margin: 0,
                border: 'none',
                outline: 'none',
                resize: 'none',
                overflow: 'hidden',
                background: 'transparent',
                caretColor: textEditing.style.color,
                ...textEditing.style,
              }}
              aria-label="编辑文本"
            />
          )}

          {/* HTML 组件：真正的 HTML 用 iframe 浮层渲染，不拦截指针，可正常拖拽选中 */}
          {htmlNodes.map((node) => (
            <div
              key={node.id}
              ref={(element) => {
                if (element) htmlLayersRef.current.set(node.id, element);
                else htmlLayersRef.current.delete(node.id);
              }}
              style={{
                position: 'absolute',
                zIndex: 8,
                pointerEvents: 'none',
                transformOrigin: '50% 50%',
              }}
            >
              <iframe
                title="HTML 内容"
                srcDoc={`${HTML_FRAME_STYLE}${node.html}`}
                sandbox=""
                scrolling="no"
                tabIndex={-1}
                style={{
                  border: 0,
                  background: 'transparent',
                  pointerEvents: 'none',
                  transformOrigin: '0 0',
                  overflow: 'hidden',
                }}
              />
            </div>
          ))}

          {/* 悬浮工具栏：画布正中心下方，只放新增组件 */}
          {toolList.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center">
              <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-black/[0.06] bg-white/95 px-1.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.16)] backdrop-blur">
                {toolList.map((key) => {
                  if (key === 'text') {
                    return (
                      <FloatingButton
                        key={key}
                        icon={Type}
                        label="文本"
                        title="文本(T)"
                        onClick={addTextNode}
                      />
                    );
                  }
                  if (key === 'image') {
                    return (
                      <FloatingButton
                        key={key}
                        icon={ImageIcon}
                        label="图片"
                        title="图片(I)"
                        onClick={() => openImagePicker()}
                      />
                    );
                  }
                  if (key === 'rect') {
                    return (
                      <FloatingButton
                        key={key}
                        icon={Square}
                        label="矩形"
                        title="矩形(R)"
                        onClick={() =>
                          addNode(
                            createRectNode(metaRef.current, {
                              fill: defaultInkColor(metaRef.current.background),
                            }),
                            'top'
                          )
                        }
                      />
                    );
                  }
                  if (key === 'ellipse') {
                    return (
                      <FloatingButton
                        key={key}
                        icon={Circle}
                        label="圆形"
                        title="圆(O)"
                        onClick={() =>
                          addNode(
                            createEllipseNode(metaRef.current, {
                              fill: defaultInkColor(metaRef.current.background),
                            }),
                            'top'
                          )
                        }
                      />
                    );
                  }
                  if (key === 'svg') {
                    return (
                      <FloatingButton
                        key={key}
                        icon={Shapes}
                        label="SVG 图形"
                        title="SVG(S)"
                        onClick={() =>
                          addNode(
                            createSvgNode(metaRef.current, {
                              color: defaultInkColor(metaRef.current.background),
                            }),
                            'top'
                          )
                        }
                      />
                    );
                  }
                  return (
                    <FloatingButton
                      key={key}
                      icon={Code2}
                      label="HTML 代码"
                      title="HTML(H)"
                      onClick={() => openHtmlEditor()}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* 右键菜单：复制 / 层级 / 编组 / 锁定 / 删除 */}
          {menu && (
            <>
              <div
                className="absolute inset-0 z-20"
                onClick={closeMenu}
                onContextMenu={(event) => {
                  event.preventDefault();
                  closeMenu();
                }}
              />
              <div
                className="absolute z-30 min-w-[148px] overflow-hidden rounded-lg border border-[#E5E5EA] bg-white py-1 shadow-[0_10px_28px_rgba(0,0,0,0.16)]"
                style={{ left: menu.x, top: menu.y }}
                role="menu"
              >
                <MenuItem
                  icon={ArrowUpToLine}
                  label="置顶"
                  hint="]"
                  onClick={() => {
                    shiftSelection('top', menuIds);
                    closeMenu();
                  }}
                />
                <MenuItem
                  icon={ArrowDownToLine}
                  label="置底"
                  hint="["
                  onClick={() => {
                    shiftSelection('bottom', menuIds);
                    closeMenu();
                  }}
                />
                <div className="my-1 h-px bg-[#F2F2F7]" />
                <MenuItem
                  icon={Copy}
                  label="复制"
                  hint="Ctrl+C"
                  onClick={() => {
                    copySelected();
                    closeMenu();
                  }}
                />
                <MenuItem
                  icon={CopyPlus}
                  label="创建副本"
                  hint="Ctrl+D"
                  onClick={() => {
                    duplicateSelected();
                    closeMenu();
                  }}
                />
                <MenuItem
                  icon={ClipboardPaste}
                  label="粘贴"
                  hint="Ctrl+V"
                  disabled={!clipboardNodes.length}
                  onClick={() => {
                    pasteClipboard();
                    closeMenu();
                  }}
                />
                <div className="my-1 h-px bg-[#F2F2F7]" />
                {menuNode?.groupId ? (
                  <MenuItem
                    icon={Ungroup}
                    label="取消编组"
                    hint="Ctrl+Shift+G"
                    onClick={() => {
                      ungroupSelected(menuIds);
                      closeMenu();
                    }}
                  />
                ) : (
                  selectedIds.length > 1 && (
                    <MenuItem
                      icon={GroupIcon}
                      label="编组"
                      hint="Ctrl+G"
                      onClick={() => {
                        groupSelected();
                        closeMenu();
                      }}
                    />
                  )
                )}
                <MenuItem
                  icon={menuNode?.locked ? LockOpen : Lock}
                  label={menuNode?.locked ? '解锁图层' : '锁定图层'}
                  hint="Ctrl+Shift+L"
                  onClick={() => {
                    toggleLock(menuIds);
                    closeMenu();
                  }}
                />
                <div className="my-1 h-px bg-[#F2F2F7]" />
                <MenuItem
                  icon={Trash2}
                  label="删除"
                  hint="Delete"
                  danger
                  onClick={() => {
                    removeNodes(menuIds);
                    closeMenu();
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* 属性面板：固定占位并始终显示，选中变化时画布宽度不变 */}
        {inspector}
      </div>

      <FilePicker
        open={pickerOpen}
        onClose={closePicker}
        accept={
          pickerTarget === 'background-video'
            ? 'video'
            : pickerTarget === 'svg'
              ? '.svg'
              : 'image'
        }
        title={PICKER_TITLES[pickerTarget]}
        onSelect={handlePicked}
      />

      {/* 背景视频选择器：从视频模块选视频，视频地址与封面一起回填画布 */}
      <VideoPicker
        open={videoPickerOpen}
        onClose={() => setVideoPickerOpen(false)}
        onSelect={handleVideoPicked}
        title="选择背景视频"
      />

      {/* HTML 代码弹窗：新增或编辑 HTML 组件 */}
      <HtmlCodeDialog
        open={htmlDialog !== null}
        title={htmlDialog?.id ? '编辑 HTML 代码' : '新增 HTML 代码'}
        value={htmlDialog?.code ?? ''}
        onClose={() => setHtmlDialog(null)}
        onConfirm={commitHtml}
      />
    </div>
  );
}

/** 把画面调节参数转成 Leafer filter 属性值；默认参数返回 undefined 清除已设置的滤镜 */
function leaferFilter(filter?: CanvasFilterParams): IFilter | undefined {
  const css = filterCss(filter);
  return css ? { type: 'dsFilter', css } : undefined;
}

function applyNodeToElement(element: LeaferElement, node: CanvasNode, withControl = true) {
  const geometry = {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    rotation: node.rotation ?? 0,
    // 组件级交互开关：仅在开关类属性变化时重设，避免拖动数值滑杆时反复刷新编辑框
    ...(withControl
      ? {
          editable: !node.locked,
          draggable: !node.locked,
          dragBounds: nodeDragBounds(node),
          editConfig: nodeEditConfig(node),
        }
      : {}),
  };

  if (node.type === 'text') {
    element.set({
      ...geometry,
      text: node.text,
      fontSize: node.fontSize,
      fontWeight: node.fontWeight as IFontWeight,
      italic: node.italic ?? false,
      textDecoration: node.decoration ?? 'none',
      fill: node.color,
      textAlign: node.align,
      lineHeight: Math.round(node.fontSize * 1.4),
    });
    return;
  }

  if (node.type === 'image') {
    element.set({
      ...geometry,
      url: previewUrl(node.url),
      cornerRadius: node.radius,
      opacity: node.opacity,
      filter: leaferFilter(node.filter),
    });
    return;
  }

  if (node.type === 'rect') {
    element.set({
      ...geometry,
      fill: node.fill,
      cornerRadius: node.radius,
      opacity: node.opacity,
      stroke: node.stroke,
      strokeWidth: node.strokeWidth ?? 0,
    });
    return;
  }

  if (node.type === 'ellipse') {
    element.set({
      ...geometry,
      fill: node.fill,
      opacity: node.opacity,
      stroke: node.stroke,
      strokeWidth: node.strokeWidth ?? 0,
    });
    return;
  }

  if (node.type === 'svg') {
    element.set({ ...geometry, opacity: node.opacity });
    applySvgUrl(element, node.url);
    return;
  }

  if (node.type === 'html') {
    element.set({ ...geometry, opacity: node.opacity });
  }
}

/** 悬浮栏按钮：只放图标，含义交给 tooltip */
function FloatingButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  title,
}: {
  icon: typeof Type;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <Hint label={title ?? label} className="inline-flex h-9 w-9">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        className="inline-flex h-full w-full items-center justify-center rounded-full text-[#1D1D1F] transition-colors hover:bg-[#F0F0F3] disabled:cursor-not-allowed disabled:text-[#C7C7CC] disabled:hover:bg-transparent"
      >
        <Icon className="h-4 w-4" />
      </button>
    </Hint>
  );
}

/** 右键菜单项 */
function MenuItem({
  icon: Icon,
  label,
  hint,
  danger,
  disabled,
  onClick,
}: {
  icon: typeof Type;
  label: string;
  /** 快捷键提示，右对齐显示 */
  hint?: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors disabled:cursor-not-allowed disabled:text-[#C7C7CC] disabled:hover:bg-transparent ${
        danger
          ? 'text-[#CF1322] hover:bg-[#FFF1F0]'
          : 'text-[#1D1D1F] hover:bg-[#F5F5F7]'
      }`}
    >
      <Icon
        className={`h-3.5 w-3.5 ${
          disabled ? 'text-[#C7C7CC]' : danger ? 'text-[#FF4D4F]' : 'text-[#86868B]'
        }`}
      />
      {label}
      {hint && (
        <span className="ml-auto pl-4 text-[10.5px] tabular-nums text-[#A1A1A6]">{hint}</span>
      )}
    </button>
  );
}

export default CanvasEditor;
