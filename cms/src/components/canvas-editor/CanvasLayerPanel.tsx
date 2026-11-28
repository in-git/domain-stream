/**
 * 图层面板（默认实现）
 * ------------------------------------------------------------------
 * 固定在画布左侧（与右侧属性面板同宽），按层级从上到下列出画布里的节点。
 * 编组的节点会聚合成一个可折叠的组节点（树形结构）：
 *   点组行 → 整组选中；点子项 → 也是整组选中（与画布行为一致）
 *   点锁 → 组行锁整组，子项只锁自己
 * 文档数组是从下往上存的，所以这里反序渲染，最上面的图层显示在最前。
 */
import {
  ChevronDown,
  ChevronRight,
  Circle,
  Code2,
  Eye,
  EyeOff,
  Group as GroupIcon,
  Image as ImageIcon,
  Lock,
  LockOpen,
  Shapes,
  Square,
  Trash2,
  Type,
} from 'lucide-react';
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, type ReactNode } from 'react';
import type { CanvasNode } from './types';

export interface CanvasLayerPanelProps {
  /** 画布节点，按从下到上的层级顺序 */
  nodes: CanvasNode[];
  /** 当前选中的节点 id */
  selectedIds: string[];
  onSelect: (id: string) => void;
  /** 锁定 / 解锁指定节点（组行会传整组，子项只传自己） */
  onToggleLock: (ids: string[]) => void;
  /** 显示 / 隐藏指定节点（组行会传整组，子项只传自己） */
  onToggleVisible: (ids: string[]) => void;
  /** 删除指定节点 */
  onDelete: (ids: string[]) => void;
  /** 拖拽排序：传入从下到上的完整节点 id 顺序 */
  onReorder: (orderedIds: string[]) => void;
}

const TYPE_ICONS: Record<CanvasNode['type'], typeof Type> = {
  text: Type,
  image: ImageIcon,
  html: Code2,
  rect: Square,
  ellipse: Circle,
  svg: Shapes,
};

const TYPE_LABELS: Record<CanvasNode['type'], string> = {
  text: '文本',
  image: '图片',
  html: 'HTML 代码',
  rect: '矩形',
  ellipse: '圆形',
  svg: 'SVG 图形',
};

/** 图层名：文本取内容，其它用类型名 */
function layerLabel(node: CanvasNode): string {
  if (node.type === 'text') return node.text.trim().replace(/\s+/g, ' ') || '文本';
  return TYPE_LABELS[node.type];
}

type LayerItem =
  | { kind: 'group'; groupId: string; members: CanvasNode[] }
  | { kind: 'node'; node: CanvasNode };

/** 从上到下展开图层：同 groupId 的节点聚合成组，组的位置取最上层成员的位置 */
function buildItems(nodes: CanvasNode[]): LayerItem[] {
  const items: LayerItem[] = [];
  const groups = new Map<string, { kind: 'group'; groupId: string; members: CanvasNode[] }>();
  [...nodes].reverse().forEach((node) => {
    if (!node.groupId) {
      items.push({ kind: 'node', node });
      return;
    }
    let group = groups.get(node.groupId);
    if (!group) {
      group = { kind: 'group', groupId: node.groupId, members: [] };
      groups.set(node.groupId, group);
      items.push(group);
    }
    group.members.push(node);
  });
  // 只剩一个成员的组按普通图层显示（删掉同组其它成员后会出现）
  return items.flatMap<LayerItem>((item) =>
    item.kind === 'group' && item.members.length < 2
      ? [{ kind: 'node', node: item.members[0] }]
      : [item]
  );
}

/** 排序项的 id：组用 group: 前缀，普通图层用节点 id */
function itemId(item: LayerItem): string {
  return item.kind === 'group' ? `group:${item.groupId}` : item.node.id;
}

/** 按当前展示顺序摊平成节点 id（从上层到下层） */
function flattenNodes(items: LayerItem[]): string[] {
  return items.flatMap((item) =>
    item.kind === 'group' ? item.members.map((member) => member.id) : [item.node.id]
  );
}

/** dnd-kit 的可排序容器：统一处理位移、动画与拖拽中样式 */
function SortableWrapper({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${className ?? ''} ${isDragging ? 'opacity-50' : ''}`}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  );
}

export function CanvasLayerPanel({
  nodes,
  selectedIds,
  onSelect,
  onToggleLock,
  onToggleVisible,
  onDelete,
  onReorder,
}: CanvasLayerPanelProps) {
  const items = buildItems(nodes);
  const selected = new Set(selectedIds);
  /** 折叠的组：默认展开 */
  const [collapsed, setCollapsed] = useState<string[]>([]);
  /** 需要拖动一小段距离才触发排序，避免影响行内按钮点击 */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const toggleCollapsed = (groupId: string) =>
    setCollapsed((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId]
    );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => itemId(item) === active.id);
    const newIndex = items.findIndex((item) => itemId(item) === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    // 面板从上到下展示，节点数组从下到上，摊平后反转即可
    onReorder(flattenNodes(arrayMove(items, oldIndex, newIndex)).reverse());
  };

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-r border-[#E5E5EA] bg-white">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[#F2F2F7] px-4">
        <span className="text-[12px] font-semibold text-[#1D1D1F]">图层</span>
        <span className="ml-auto text-[10.5px] tabular-nums text-[#86868B]">{nodes.length}</span>
      </div>

      {nodes.length === 0 ? (
        <p className="p-4 text-[11px] leading-relaxed text-[#A1A1A6]">
          画布还没有图层，用下方工具栏添加文本、图片、图形或进度条。
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={items.map(itemId)}
              strategy={verticalListSortingStrategy}
            >
              {items.map((item) => {
                if (item.kind === 'node') {
                  return (
                    <LayerRow
                      key={item.node.id}
                      sortableId={item.node.id}
                      node={item.node}
                      active={selected.has(item.node.id)}
                      onSelect={() => onSelect(item.node.id)}
                      onToggleLock={() => onToggleLock([item.node.id])}
                      onToggleVisible={() => onToggleVisible([item.node.id])}
                      onDelete={() => onDelete([item.node.id])}
                    />
                  );
                }

                const { groupId, members } = item;
                const groupActive = members.some((member) => selected.has(member.id));
                const groupLocked = members.every((member) => member.locked);
                const groupHidden = members.every((member) => member.visible === false);
                const isCollapsed = collapsed.includes(groupId);
                return (
                  <div key={groupId} className="flex flex-col">
                    <SortableWrapper
                      id={`group:${groupId}`}
                      className={`group flex items-center gap-0.5 rounded-none px-1 transition-colors ${
                        groupActive ? 'bg-[#F2F8FF]' : 'hover:bg-[#F5F5F7]'
                      }`}
                    >
                  <div className="inline-flex h-6 w-5 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleCollapsed(groupId)}
                      aria-label={isCollapsed ? '展开组' : '折叠组'}
                      className="inline-flex h-full w-full items-center justify-center rounded text-[#86868B] transition-colors hover:text-[#1D1D1F]"
                    >
                      {isCollapsed ? (
                        <ChevronRight className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                  <div className="flex min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onSelect(members[0].id)}
                      className={`flex w-full min-w-0 items-center gap-1.5 py-1.5 text-left text-[11.5px] transition-colors ${
                        groupActive ? 'text-[#0071E3]' : 'text-[#1D1D1F]'
                      }`}
                    >
                      <GroupIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">组</span>
                      <span className="shrink-0 text-[10.5px] tabular-nums text-[#A1A1A6]">
                        {members.length}
                      </span>
                    </button>
                  </div>
                  <div className="inline-flex h-6 w-6 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleVisible(members.map((member) => member.id))}
                      aria-label={groupHidden ? '显示整组' : '隐藏整组'}
                      className={`inline-flex h-full w-full items-center justify-center rounded transition-colors ${
                        groupHidden
                          ? 'text-[#0071E3]'
                          : 'text-[#C7C7CC] opacity-0 group-hover:opacity-100 hover:text-[#1D1D1F]'
                      }`}
                    >
                      {groupHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </button>
                  </div>
                  <div className="inline-flex h-6 w-6 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleLock(members.map((member) => member.id))}
                      aria-label={groupLocked ? '解锁整组' : '锁定整组'}
                      className={`inline-flex h-full w-full items-center justify-center rounded transition-colors ${
                        groupLocked
                          ? 'text-[#0071E3]'
                          : 'text-[#C7C7CC] opacity-0 group-hover:opacity-100 hover:text-[#1D1D1F]'
                      }`}
                    >
                      {groupLocked ? (
                        <Lock className="h-3 w-3" />
                      ) : (
                        <LockOpen className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                </SortableWrapper>

                {!isCollapsed &&
                  members.map((member) => (
                    <LayerRow
                      key={member.id}
                      sortableId={member.id}
                      node={member}
                      indented
                      active={selected.has(member.id)}
                      onSelect={() => onSelect(member.id)}
                      onToggleLock={() => onToggleLock([member.id])}
                      onToggleVisible={() => onToggleVisible([member.id])}
                      onDelete={() => onDelete([member.id])}
                    />
                  ))}
              </div>
            );
          })}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </aside>
  );
}

interface LayerRowProps {
  /** 排序 id（普通图层用节点 id） */
  sortableId: string;
  node: CanvasNode;
  active: boolean;
  indented?: boolean;
  onSelect: () => void;
  onToggleLock: () => void;
  onToggleVisible: () => void;
  onDelete: () => void;
}

/** 单个图层行：类型图标 + 名称 + 可见 / 锁定 / 删除开关，支持拖拽排序 */
function LayerRow({
  sortableId,
  node,
  active,
  indented,
  onSelect,
  onToggleLock,
  onToggleVisible,
  onDelete,
}: LayerRowProps) {
  const Icon = TYPE_ICONS[node.type];
  const hidden = node.visible === false;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: sortableId });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      className={`group flex items-center gap-1 rounded-none transition-colors ${
        isDragging ? 'opacity-50' : ''
      } ${active ? 'bg-[#F2F8FF]' : 'hover:bg-[#F5F5F7]'}`}
    >
      <div className="flex min-w-0 flex-1">
        <button
          type="button"
          onClick={onSelect}
          disabled={node.locked}
          className={`flex w-full min-w-0 items-center gap-1.5 py-1.5 text-left text-[11.5px] transition-colors disabled:cursor-not-allowed ${
            indented ? 'pl-7' : 'pl-1.5'
          } ${
            active
              ? 'text-[#0071E3]'
              : node.locked || hidden
                ? 'text-[#A1A1A6]'
                : 'text-[#1D1D1F]'
          }`}
        >
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{layerLabel(node)}</span>
        </button>
      </div>
      <div className="inline-flex h-6 w-6 shrink-0">
        <button
          type="button"
          onClick={onToggleVisible}
          disabled={!!node.fixed}
          aria-label={hidden ? '显示图层' : '隐藏图层'}
          className={`inline-flex h-full w-full items-center justify-center rounded transition-colors disabled:cursor-not-allowed ${
            hidden
              ? 'text-[#0071E3]'
              : 'text-[#C7C7CC] opacity-0 group-hover:opacity-100 hover:text-[#1D1D1F]'
          }`}
        >
          {hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
        </button>
      </div>
      <div className="inline-flex h-6 w-6 shrink-0">
        <button
          type="button"
          onClick={onToggleLock}
          aria-label={node.locked ? '解锁图层' : '锁定图层'}
          className={`inline-flex h-full w-full items-center justify-center rounded transition-colors ${
            node.locked
              ? 'text-[#0071E3]'
              : 'text-[#C7C7CC] opacity-0 group-hover:opacity-100 hover:text-[#1D1D1F]'
          }`}
        >
          {node.locked ? <Lock className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
        </button>
      </div>
      <div className="inline-flex h-6 w-6 shrink-0">
        {!node.fixed && (
          <button
            type="button"
            onClick={onDelete}
            aria-label="删除图层"
            className="inline-flex h-full w-full items-center justify-center rounded text-[#C7C7CC] opacity-0 transition-colors group-hover:opacity-100 hover:text-[#CF1322]"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

export default CanvasLayerPanel;
