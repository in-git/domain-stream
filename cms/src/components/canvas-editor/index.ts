/**
 * 通用画布编辑器入口
 * ------------------------------------------------------------------
 * 任意需要「可拖拽画布 + 属性面板」的场景都可以直接用，不绑定具体业务：
 *
 *   const [doc, setDoc] = useState<CanvasDoc>({
 *     width: 1440,
 *     height: 900,
 *     background: '#000000',
 *     nodes: [],
 *   });
 *
 *   <CanvasEditor value={doc} onChange={setDoc} />
 *
 * 常用扩展点：
 *   tools={['text', 'image']}          只保留部分新增入口
 *   pickImage={() => Promise<url>}     换成业务自己的图片选择器
 *   renderInspector={false}            隐藏右侧属性面板，或传自定义面板
 *   snap={false}                       关闭移动吸附
 *   layers={false}                     隐藏左侧图层面板
 *
 * 内置交互：框选多选（多选后可水平 / 垂直对齐）、滚轮缩放（20%–400%，比例只在
 * 缩放时短暂显示，点右下角图标可复位）、移动吸附（画布与其它元素的边/中线 +
 * 辅助线）、空格 + 拖动平移视图、元素旋转、双击文本原位编辑、
 * Ctrl+Z / Ctrl+Shift+Z 撤销重做、编组（图层面板里以树形组节点展示）与锁定。
 * 组件级交互开关（旋转 / 调整宽高 / 倾斜 / 超出画布）存在每个节点的字段上，
 * 画布级只保留「拖拽平移」视图开关。
 * 快捷键：Ctrl+C 复制、Ctrl+V 粘贴、Ctrl+D 创建副本、Delete 删除、[ 置底、
 * ] 置顶、Ctrl+G 编组、Ctrl+Shift+G 取消编组、Ctrl+Shift+L 锁定。
 * 左侧固定图层面板，右侧固定属性面板。
 *
 * 文档模型与节点工厂（createTextNode / createImageNode / createProgressNode）
 * 都在 types.ts 里导出，调用方可以自行拼默认文档、做序列化与容错解析。
 */
export {
  CanvasEditor,
  type CanvasEditorProps,
  type CanvasToolKey,
} from './CanvasEditor';
export {
  CanvasNodeInspector,
  type CanvasInspectorContext,
  type CanvasNodeInspectorProps,
} from './CanvasNodeInspector';
export { CanvasLayerPanel, type CanvasLayerPanelProps } from './CanvasLayerPanel';
export { ColorField } from './ColorField';
export * from './types';
