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
 *   - 快捷键：Delete 删除、[ 置底、] 置顶、Ctrl+G 编组、Ctrl+Shift+G 取消编组、Ctrl+Shift+L 锁定
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
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import {
  App,
  Box,
  Image as LeaferImage,
  PointerEvent as LeaferPointerEvent,
  Rect,
  Text as LeaferText,
  type IFontWeight,
  type IEditorConfig,
  type IUI,
  type IUIEvent,
} from 'leafer-ui';
import {
  Editor,
  EditorEvent,
  InnerEditorEvent,
} from '@leafer-in/editor';
import '@leafer-in/resize';
import {
  ArrowDownToLine,
  ArrowUpToLine,
  ClipboardPaste,
  Copy,
  CopyPlus,
  Gauge,
  Group as GroupIcon,
  Image as ImageIcon,
  Lock,
  LockOpen,
  Trash2,
  Type,
  Ungroup,
} from 'lucide-react';
import { FilePicker } from '../FilePicker.tsx';
import { VideoEditorModal } from '../video-editor/VideoEditorModal.tsx';
import { toOpenUrl, type DevFile } from '../../lib/fileCenter.ts';
import {
  CanvasNodeInspector,
  type CanvasInspectorContext,
} from './CanvasNodeInspector';
import { CanvasLayerPanel } from './CanvasLayerPanel';
import { Hint } from './Hint';
import { snapMove } from './snap';
import { loadVideoFrame } from './videoFrame';
import {
  createCanvasGroupId,
  createCanvasNodeId,
  createImageNode,
  createProgressNode,
  createTextNode,
  defaultInkColor,
  defaultProgressColors,
  hasProgress,
  imageBoxFor,
  previewUrl,
  round1,
  type CanvasAlignMode,
  type CanvasDoc,
  type CanvasImageMode,
  type CanvasNode,
  type CanvasSize,
  type CanvasTextDecoration,
  type CanvasTextNode,
} from './types';

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
export type CanvasToolKey = 'text' | 'image' | 'progress';

const DEFAULT_TOOLS: CanvasToolKey[] = ['text', 'image', 'progress'];

/** 内置文件选择器的标题：按当前挑选目标区分 */
const PICKER_TITLES = {
  node: '选择画布图片',
  'background-image': '选择背景图',
  'background-video': '选择背景视频',
} as const;

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
  /** 悬浮栏显示哪些新增入口（顺序即渲染顺序），默认 文本 / 图片 / 进度条 */
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
  /**
   * 选中背景视频后自动进入剪辑弹窗（裁剪 / 调整时长 / 压缩，设置开屏使用）；
   * 产物作为新文件上传素材库后回填背景视频。不传则选中即直接使用原视频。
   */
  editBackgroundVideo?: boolean;
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

  // 进度条：外框是轨道，内部细条是填充色（按百分比跟随便于拉伸预览）。
  // 宽高既可以在画布上拖拽，也可以在右侧属性面板里精确调整。
  const track = new Box({
    ...base,
    fill: node.trackColor,
    cornerRadius: node.radius,
  });
  const bar = new Rect({
    x: 0,
    y: 0,
    width: '62%',
    height: '100%',
    fill: node.fillColor,
    cornerRadius: node.radius,
    editable: false,
    hittable: false,
  });
  track.add(bar);
  (track as unknown as { __fillBar?: Rect }).__fillBar = bar;
  return track as unknown as LeaferElement;
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
  editBackgroundVideo = false,
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
    backgroundMode: CanvasImageMode;
    /** 画布视图交互开关：是否允许空格 + 拖动平移 */
    allowPan: boolean;
  }>({
    width: value.width,
    height: value.height,
    background: value.background,
    backgroundImage: (value.backgroundImage || '').trim(),
    backgroundVideo: (value.backgroundVideo || '').trim(),
    backgroundMode: value.backgroundMode ?? 'cover',
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
  /** 打开选择器时在挑什么：组件图片 / 画布背景图 / 画布背景视频 */
  const [pickerTarget, setPickerTarget] = useState<'node' | 'background-image' | 'background-video'>(
    'node'
  );
  /** 剪辑弹窗的源视频：editBackgroundVideo 开启时，选中背景视频后自动进入 */
  const [videoEditorSource, setVideoEditorSource] = useState<{ name: string; url: string } | null>(null);
  /** 右键菜单：命中节点 + 菜单在画布容器内的坐标 */
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null);
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
  /** 文本原位编辑浮层：节点 id + 当前内容 + 覆盖在画布上的样式 */
  const [textEditing, setTextEditing] = useState<{
    id: string;
    value: string;
    style: CSSProperties;
  } | null>(null);
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

  /** 画布级配置（底色 / 背景图 / 背景视频 / 拖拽平移开关）：直接改根节点，不重建画布、不打断缩放 */
  const patchCanvas = useCallback(
    (
      patch: Partial<
        Pick<
          CanvasDoc,
          'background' | 'backgroundImage' | 'backgroundVideo' | 'backgroundMode' | 'allowPan'
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
        patch.backgroundMode !== undefined
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
      (value.backgroundMode ?? 'cover') === meta.backgroundMode &&
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
      backgroundMode: value.backgroundMode ?? 'cover',
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

  // 告诉外层弹窗：选择器 / 剪辑弹窗 / 右键菜单打开时 Esc 先由它们自己处理
  useEffect(() => {
    onOverlayChange?.(pickerOpen || videoEditorSource !== null || menu !== null);
  }, [pickerOpen, videoEditorSource, menu, onOverlayChange]);

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

  // 组件的「超出画布」开关变化时同步拖拽边界
  useEffect(() => {
    nodesRef.current.forEach((node) => {
      elementsRef.current.get(node.id)?.set({ dragBounds: nodeDragBounds(node) });
    });
  }, [nodes, revision]);

  /** 批量改属性：同一批选中节点里，只有和主节点同类型的才应用 */
  const patchNodes = useCallback(
    (ids: string[], patch: Record<string, unknown>, key?: string) => {
      if (!ids.length) return;
      const next = nodesRef.current.map((node) =>
        ids.includes(node.id) ? ({ ...node, ...patch } as CanvasNode) : node
      );
      ids.forEach((id) => {
        const element = elementsRef.current.get(id);
        const updated = next.find((node) => node.id === id);
        if (element && updated) applyNodeToElement(element, updated);
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
      const texts = [...nodesRef.current]
        .reverse()
        .filter(
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
  }, [openTextEditor]);

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
        if (element && updated) applyNodeToElement(element, updated);
      });
      commitNodes(next);
      // 元素位置变了，多选框要重新贴合
      editorRef.current?.updateEditBox();
    },
    [commitNodes]
  );

  const removeNodes = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      editorRef.current?.cancel();
      ids.forEach((id) => {
        const element = elementsRef.current.get(id);
        if (!element) return;
        element.remove();
        elementsRef.current.delete(id);
      });
      commitNodes(nodesRef.current.filter((node) => !ids.includes(node.id)));
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

  /** 选画布背景视频：同样写进画布配置（与背景图并存，视频优先渲染） */
  function pickBackgroundVideo() {
    setReplacingId(null);
    setPickerTarget('background-video');
    setPickerOpen(true);
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
      // 设置开屏：选中视频后先进剪辑弹窗，产物回填背景视频；关闭则用原视频
      if (editBackgroundVideo) {
        setVideoEditorSource({ name: file.name || file.objName || '背景视频', url: toOpenUrl(file) });
        return;
      }
      patchCanvas({ backgroundVideo: stored });
      return;
    }
    if (target === 'background-image') {
      patchCanvas({ backgroundImage: stored });
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
  const progressExists = hasProgress(nodes);
  const toolList = tools ?? DEFAULT_TOOLS;

  const inspectorContext: CanvasInspectorContext = {
    node: selectedNode,
    canvasWidth: metaRef.current.width,
    canvasHeight: metaRef.current.height,
    background: metaRef.current.background,
    backgroundImage: metaRef.current.backgroundImage,
    backgroundVideo: metaRef.current.backgroundVideo,
    backgroundMode: metaRef.current.backgroundMode,
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
    onClearBackgroundVideo: () => patchCanvas({ backgroundVideo: '' }),
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
        >
          <div ref={hostRef} className="absolute inset-0" />

          {/* 画布尺寸标记：跟着画布左上角，随缩放 / 平移一起移动 */}
          <span
            ref={sizeBadgeRef}
            className="pointer-events-none absolute z-10 rounded bg-white/70 px-1 text-[10px] tabular-nums leading-[14px] text-[#86868B] shadow-[0_1px_3px_rgba(0,0,0,0.06)] backdrop-blur-sm"
          >
            {value.width} × {value.height}
          </span>

          {/* 右下角：缩放比例只在缩放后短暂出现 */}
          <div className="pointer-events-none absolute bottom-4 right-3 z-10 flex items-end gap-2">
            <span
              className={`rounded-full bg-[#1D1D1F]/85 px-2 py-0.5 text-[10.5px] tabular-nums text-white shadow-[0_4px_12px_rgba(0,0,0,0.16)] transition-opacity duration-200 ${
                zoomVisible ? 'opacity-100' : 'opacity-0'
              }`}
              aria-hidden={!zoomVisible}
            >
              {zoomPercent}%
            </span>
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
                        onClick={() => openImagePicker()}
                      />
                    );
                  }
                  return (
                    <FloatingButton
                      key={key}
                      icon={Gauge}
                      label="进度条"
                      disabled={progressExists}
                      title={progressExists ? '进度条全画布唯一' : '新增进度条'}
                      onClick={() =>
                        addNode(
                          createProgressNode(
                            metaRef.current,
                            defaultProgressColors(metaRef.current.background)
                          ),
                          'top'
                        )
                      }
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
        accept={pickerTarget === 'background-video' ? 'video' : 'image'}
        title={PICKER_TITLES[pickerTarget]}
        onSelect={handlePicked}
      />

      {/* 背景视频剪辑弹窗（editBackgroundVideo 开启时）：产物上传素材库后回填背景视频 */}
      <VideoEditorModal
        open={videoEditorSource !== null}
        item={videoEditorSource ? { title: videoEditorSource.name, videoUrl: videoEditorSource.url } : null}
        onClose={() => setVideoEditorSource(null)}
        onApplied={(url) => patchCanvas({ backgroundVideo: url.replace(/^\/snowy/, '') })}
      />
    </div>
  );
}

/** 把节点属性写回 Leafer 元素（几何 + 样式） */
function applyNodeToElement(element: LeaferElement, node: CanvasNode) {
  const geometry = {
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    rotation: node.rotation ?? 0,
    editable: !node.locked,
    draggable: !node.locked,
    // 组件级交互开关：拖拽边界 + 旋转 / 缩放 / 倾斜手柄
    dragBounds: nodeDragBounds(node),
    editConfig: nodeEditConfig(node),
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
    });
    return;
  }

  element.set({ ...geometry, fill: node.trackColor, cornerRadius: node.radius });
  const fillBar = (element as unknown as { __fillBar?: Rect }).__fillBar;
  fillBar?.set({ fill: node.fillColor, cornerRadius: node.radius });
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
