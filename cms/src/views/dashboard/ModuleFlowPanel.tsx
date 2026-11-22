import { hasModulePerm } from '../../lib/menu.ts';
import type { ModuleKey } from '../../types/cms.ts';
import ModuleFlowChart, {
  type FlowChartEdge,
  type FlowChartGroup,
  type FlowChartNode,
} from '../../components/ModuleFlowChart.tsx';

interface ModuleFlowPanelProps {
  onNavigate: (module: ModuleKey) => void;
  permissions: string[];
}

/** 节点定义（不含坐标），坐标在下面统一计算 */
interface NodeDef {
  id: FlowChartNode['id'];
  label: string;
  color: string;
  icon: string;
  dashed?: boolean;
  primary?: boolean;
  onClick: () => void;
}

/** 首页导航图：三列布局（基础数据 → 内容 → 产出与互动），节点点击跳转 */
export function ModuleFlowPanel({ onNavigate, permissions }: ModuleFlowPanelProps) {
  const can = (module: ModuleKey) => hasModulePerm(module, 'Detail', permissions);
  // 文件中心 / 素材中心 / 客户端配置为后加模块：若后端未配置对应按钮码，按“菜单可见即允许”处理
  const canLoose = (module: 'files' | 'materials' | 'config', prefix: string) =>
    !permissions.some((code) => code.startsWith(prefix)) || can(module);

  const contents = [
    { id: 'videos' as const, label: '视频', color: '#0071E3' },
    { id: 'imagetexts' as const, label: '图文', color: '#1D9E5F' },
    { id: 'articles' as const, label: '文章', color: '#5E5CE6' },
  ].filter((item) => can(item.id));

  const showCategory = can('category');
  const showFiles = canLoose('files', 'bizFile');
  const showMaterials = canLoose('materials', 'bizMaterial');
  const showConfig = canLoose('config', 'bizConfig');
  const showMessages = can('messages');

  // 横向三列布局参数
  const COL_W = 164;
  const COL_GAP = 52;
  const COL_Y = 10;
  const COL_H = 248;
  const NODE_H = 56;
  const colX = (index: number) => 8 + index * (COL_W + COL_GAP);

  // 左列：基础数据 —— 通用分类、素材中心
  const leftDefs: NodeDef[] = [];
  if (showCategory) {
    leftDefs.push({
      id: 'category',
      label: '通用分类',
      color: '#0071E3',
      icon: '分',
      primary: true,
      onClick: () => onNavigate('category'),
    });
  }
  if (showMaterials) {
    leftDefs.push({
      id: 'materials',
      label: '素材中心',
      color: '#1D9E5F',
      icon: '素',
      onClick: () => onNavigate('materials'),
    });
  }

  // 右列：文件中心、留言、客户端配置（等间距排布）
  const rightDefs: NodeDef[] = [];
  if (showFiles) {
    rightDefs.push({
      id: 'files',
      label: '文件中心',
      color: '#3478C0',
      icon: '文',
      onClick: () => onNavigate('files'),
    });
  }
  if (showMessages) {
    rightDefs.push({
      id: 'messages',
      label: '留言',
      color: '#8E8E93',
      dashed: true,
      icon: '留',
      onClick: () => onNavigate('messages'),
    });
  }
  if (showConfig) {
    rightDefs.push({
      id: 'config',
      label: '客户端配置',
      color: '#AF52DE',
      dashed: true,
      icon: '配',
      onClick: () => onNavigate('config'),
    });
  }

  /* 左列节点在固定高度内均分，节点增多时自动压缩间距 */
  const listStart = COL_Y + 22;
  const listEnd = COL_Y + COL_H - 22;
  const leftStep =
    leftDefs.length > 1
      ? Math.min(78, (listEnd - listStart - NODE_H) / (leftDefs.length - 1))
      : 0;

  /* 右列分组高度按节点数与固定间距推算，保证不溢出且间距一致 */
  const RIGHT_PAD = 22;
  const RIGHT_GAP = 24;
  const RIGHT_H = Math.max(
    COL_H,
    RIGHT_PAD * 2 + rightDefs.length * NODE_H + Math.max(0, rightDefs.length - 1) * RIGHT_GAP
  );

  const leftNodes: FlowChartNode[] = leftDefs.map((def, index) => ({
    id: def.id,
    label: def.label,
    x: colX(0) + 10,
    y: Math.round(listStart + leftStep * index),
    width: COL_W - 20,
    height: NODE_H,
    color: def.color,
    icon: def.icon,
    primary: def.primary,
    onClick: def.onClick,
  }));

  // 中列：视频 / 图文 / 文章纵向排列，彼此之间不画连线
  const contentNodes: FlowChartNode[] = contents.map((item, index) => ({
    id: item.id,
    label: item.label,
    x: colX(1) + 10,
    y: 26 + index * 78,
    width: COL_W - 20,
    height: NODE_H,
    color: item.color,
    onClick: () => onNavigate(item.id),
  }));

  const rightNodes: FlowChartNode[] = rightDefs.map((def, index) => ({
    id: def.id,
    label: def.label,
    x: colX(2) + 10,
    y: COL_Y + RIGHT_PAD + index * (NODE_H + RIGHT_GAP),
    width: COL_W - 20,
    height: NODE_H,
    color: def.color,
    dashed: def.dashed,
    icon: def.icon,
    onClick: def.onClick,
  }));

  const groups: FlowChartGroup[] = [];
  if (leftNodes.length) {
    groups.push({ x: colX(0), y: COL_Y, width: COL_W, height: COL_H, fill: '#F5F8FF', stroke: '#E6EDFB' });
  }
  if (contentNodes.length) {
    groups.push({ x: colX(1), y: COL_Y, width: COL_W, height: COL_H, fill: '#FAFAFC', stroke: '#EDEDF1' });
  }
  if (rightNodes.length) {
    groups.push({ x: colX(2), y: COL_Y, width: COL_W, height: RIGHT_H, fill: '#F5FBF7', stroke: '#E4F3E9' });
  }

  const nodes: FlowChartNode[] = [...leftNodes, ...contentNodes, ...rightNodes];

  const edges: FlowChartEdge[] = [];
  // 分类与素材为内容提供公共分类与备用素材
  leftNodes.forEach((src) => {
    contentNodes.forEach((dst) => edges.push({ from: src.id, to: dst.id }));
  });
  // 内容上传后沉淀为文件中心的文件
  if (showFiles) {
    contentNodes.forEach((src) => edges.push({ from: src.id, to: 'files' }));
  }

  if (nodes.length === 0) return null;

  // 画布高度同时取决于节点与分组，避免分组底板被裁切
  const canvasHeight =
    Math.max(
      ...nodes.map((n) => n.y + (n.height ?? 64)),
      ...groups.map((g) => g.y + g.height),
      120
    ) + 20;

  return (
    <section
      aria-label="导航"
      className="h-full bg-white rounded-[18px] border border-[#E5E5EA] overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
    >
      <ModuleFlowChart
        nodes={nodes}
        edges={edges}
        groups={groups}
        width={612}
        height={canvasHeight}
        minZoom={0.4}
      />
    </section>
  );
}
