/**
 * 侧边栏导航可视化编辑器
 * ------------------------------------------------------------------
 * 编辑 frontend 左侧导航的模块列表：拖拽排序、改名、选图标、显隐、新增、删除。
 * 值以 JSON 数组字符串存进 CLIENT_CONFIG 的 navItems 字段。
 *
 * 说明：
 *  - 名称限制 4 个字（NAV_LABEL_MAX_LENGTH），避免侧栏截断；
 *  - 编辑/新增统一走模态框，可在弹窗里同时改名称与图标；
 *  - 图标支持预设标识，也支持从文件库选择图片（存 iconUrl）。
 */
import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  ImagePlus,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { toOpenUrl, type DevFile } from '../../../lib/fileCenter.ts';
import { FilePicker } from '../../../components/FilePicker.tsx';
import { DeleteConfirmModal } from '../../../components/DeleteConfirmModal.tsx';
import {
  createCustomModuleKey,
  DEFAULT_NAV_ITEMS,
  NAV_LABEL_MAX_LENGTH,
  parseNavItems,
  stringifyNavItems,
  validateNavModuleKey,
  type NavItemConfig,
} from './schema';
import { SwitchField } from '../../../components/SwitchField.tsx';

/** 可用的内置板块选项：moduleKey 与 frontend 实际路由一一对应 */
const SECTION_OPTIONS: Array<
  Pick<NavItemConfig, 'id' | 'moduleKey' | 'sectionKey' | 'moduleType' | 'label'>
> = [
  { id: 'videos', moduleKey: 'videos', sectionKey: 'videos', moduleType: 'builtin', label: '视频' },
  { id: 'articles', moduleKey: 'articles', sectionKey: 'articles', moduleType: 'builtin', label: '文章' },
  { id: 'gallery', moduleKey: 'gallery', sectionKey: 'gallery', moduleType: 'builtin', label: '图文' },
  { id: 'messages', moduleKey: 'messages', sectionKey: 'messages', moduleType: 'builtin', label: '留言' },
  { id: 'settings', moduleKey: 'settings', sectionKey: 'settings', moduleType: 'builtin', label: '设置' },
];

/** 配置里存的是纯后端路径，CMS 预览时补回 /snowy 代理前缀 */
function previewUrl(raw: string): string {
  if (!raw) return '';
  if (raw.startsWith('/snowy') || raw.startsWith('http')) return raw;
  return `/snowy${raw}`;
}

interface NavItemsEditorProps {
  /** 配置里存储的 JSON 字符串 */
  value: string;
  onChange: (next: string) => void;
  /** 删除等结构性变更后立即同步到服务器；不传则只更新本地草稿 */
  onSync?: (next: string) => Promise<void>;
}

/** 名称截断到 4 个字，粘贴超长内容时也不会超限 */
function clampLabel(raw: string): string {
  return raw.slice(0, NAV_LABEL_MAX_LENGTH);
}

/* ------------------------------------------------------------------ */
/* 编辑弹窗                                                            */
/* ------------------------------------------------------------------ */

interface NavItemDialogProps {
  open: boolean;
  /** 编辑已有项时的初始值；新增时为默认值 */
  initial: NavItemConfig;
  /** 弹窗标题（新增 / 编辑） */
  title: string;
  /** 当前全部模块标识，用于唯一性校验 */
  existingKeys: string[];
  onClose: () => void;
  onConfirm: (next: NavItemConfig) => void;
}

/** 名称 + 模块标识 + 图标的编辑弹窗 */
function NavItemDialog({
  open,
  initial,
  title,
  existingKeys,
  onClose,
  onConfirm,
}: NavItemDialogProps) {
  const [label, setLabel] = useState(initial.label);
  const [moduleKey, setModuleKey] = useState(initial.moduleKey || initial.id);
  const [iconUrl, setIconUrl] = useState(initial.iconUrl || '');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 每次打开都按初始值重置，避免残留上一次的编辑内容
  useEffect(() => {
    if (!open) return;
    setLabel(clampLabel(initial.label));
    setModuleKey(initial.moduleKey || initial.id);
    setIconUrl(initial.iconUrl || '');
    setError('');
    // 打开后聚焦名称输入框
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
    // 仅在打开瞬间同步
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const trimmed = label.trim();

  function handleConfirm() {
    if (!trimmed) {
      setError('请输入模块名称');
      return;
    }
    const nextKey = moduleKey.trim();
    const keyError = validateNavModuleKey(nextKey, {
      editingKey: initial.moduleKey || initial.id,
      existingKeys,
      sectionKey: initial.sectionKey,
    });
    if (keyError) {
      setError(keyError);
      return;
    }
    onConfirm({
      ...initial,
      label: trimmed,
      id: nextKey,
      moduleKey: nextKey,
      // 空串不写入，保持数据结构干净
      ...(iconUrl ? { iconUrl } : {}),
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-[#E5E5EA] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5EA]">
          <h3 className="text-[16px] font-semibold text-[#1D1D1F]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#86868B] hover:bg-[#F5F5F7]"
            title="关闭"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* 名称 */}
          <label className="block">
            <span className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-medium text-[#1D1D1F]">模块名称</span>
              <span className="text-[11px] text-[#86868B] tabular-nums">
                {label.length}/{NAV_LABEL_MAX_LENGTH}
              </span>
            </span>
            <input
              ref={inputRef}
              value={label}
              onChange={(event) => {
                setLabel(clampLabel(event.target.value));
                setError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleConfirm();
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  onClose();
                }
              }}
              maxLength={NAV_LABEL_MAX_LENGTH}
              placeholder="如：视频"
              className="w-full h-10 px-3 rounded-xl border border-[#D2D2D7] bg-white text-[13px] text-[#1D1D1F] outline-none focus:border-[#0071E3]"
            />
            <span className="mt-1 block text-[11px] text-[#86868B]">
              最多 {NAV_LABEL_MAX_LENGTH} 个字，超出会被截断
            </span>
          </label>

          {/* 模块标识：可修改；内置页面保留 sectionKey，前台仍按原页面渲染 */}
          <label className="block">
            <span className="block mb-1.5 text-[12px] font-medium text-[#1D1D1F]">模块标识</span>
            <input
              value={moduleKey}
              onChange={(event) => {
                setModuleKey(event.target.value.trim());
                setError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleConfirm();
                } else if (event.key === 'Escape') {
                  event.preventDefault();
                  onClose();
                }
              }}
              maxLength={40}
              placeholder="如：my-videos"
              className="w-full h-10 px-3 rounded-xl border border-[#D2D2D7] bg-white text-[13px] font-mono text-[#1D1D1F] outline-none focus:border-[#0071E3]"
            />
            <span className="mt-1 block text-[11px] text-[#86868B]">
              客户端用此标识定位模块；内置页面改名后仍打开原页面
            </span>
          </label>

          {/* 图标：统一从文件库选择图片 */}
          <div>
            <span className="block text-[12px] font-medium text-[#1D1D1F] mb-1.5">图标</span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className={`relative w-12 h-12 rounded-xl border border-dashed flex items-center justify-center shrink-0 overflow-hidden transition-colors ${
                  iconUrl
                    ? 'border-[#0071E3] bg-white'
                    : 'border-[#C7C7CC] bg-[#FAFAFC] hover:border-[#0071E3]'
                }`}
                title={iconUrl ? '更换图标图片' : '从文件库选择图标'}
              >
                {iconUrl ? (
                  <img
                    src={previewUrl(iconUrl)}
                    alt="模块图标"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <ImagePlus className="w-4 h-4 text-[#C7C7CC]" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] text-[#1D1D1F] truncate">
                  {iconUrl ? '已选择图标' : '未选择图标'}
                </p>
                <p className="mt-0.5 text-[11px] text-[#86868B]">
                  {iconUrl ? '点击左侧缩略图可更换，或' : '建议使用透明背景的 PNG/SVG，'}
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="ml-0.5 text-[#0071E3] hover:underline"
                  >
                    从文件库选择
                  </button>
                </p>
              </div>
              {iconUrl && (
                <button
                  type="button"
                  onClick={() => setIconUrl('')}
                  className="p-1.5 rounded-lg text-[#86868B] hover:bg-[#FFF1F0] hover:text-[#CF1322] shrink-0"
                  title="清除图标"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="px-3 py-2 rounded-xl bg-[#FFF1F0] border border-[#FFCCC7] text-[12px] text-[#CF1322]">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[#E5E5EA] bg-[#FAFAFC]">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-xl border border-[#D2D2D7] text-[13px] text-[#1D1D1F] hover:bg-white"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!trimmed}
            className="h-9 px-4 rounded-xl bg-[#0071E3] text-white text-[13px] font-medium hover:bg-[#0077ED] disabled:opacity-40"
          >
            确定
          </button>
        </div>
      </div>

      {/* 图标选择：只允许图片，避免选了无法渲染的文件 */}
      <FilePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        accept="image"
        title="选择图标"
        onSelect={(files: DevFile[]) => {
          if (!files[0]) return;
          // 存纯后端路径（去掉 CMS 的 /snowy 代理前缀），与卡片图/Logo 一致
          setIconUrl(toOpenUrl(files[0]).replace(/^\/snowy/, ''));
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 列表行                                                              */
/* ------------------------------------------------------------------ */

/** 单行导航项：拖拽排序、点按钮弹窗编辑、显隐与删除 */
function SortableNavRow({
  item,
  index,
  onEdit,
  onChange,
  onRemove,
}: {
  item: NavItemConfig;
  index: number;
  onEdit: () => void;
  onChange: (patch: Partial<NavItemConfig>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.moduleKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const iconUrl = previewUrl(item.iconUrl || '');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-xl border transition-colors ${
        isDragging
          ? 'border-[#0071E3]/40 bg-white shadow-lg z-10 relative'
          : item.enabled
            ? 'border-[#E5E5EA] bg-white'
            : 'border-[#F0F0F2] bg-[#FAFAFC]'
      }`}
    >
      <div className="group flex items-center gap-2 px-2.5 py-2">
        {/* 拖拽把手：仅此区域可拖拽，避免与按钮冲突 */}
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="p-1 rounded-md text-[#C7C7CC] hover:text-[#86868B] cursor-grab active:cursor-grabbing touch-none shrink-0"
          title="拖拽调整顺序"
          aria-label={`拖拽调整「${item.label}」顺序`}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <span className="shrink-0 w-5 text-center text-[11px] font-mono text-[#AEAEB2] tabular-nums">
          {index + 1}
        </span>

        {/* 图标预览：仅展示文件库图片，未上传时留空占位 */}
        <span className="shrink-0 w-7 h-7 rounded-lg bg-[#F5F5F7] flex items-center justify-center overflow-hidden">
          {iconUrl && (
            <img src={iconUrl} alt="" aria-hidden="true" className="w-full h-full object-contain" />
          )}
        </span>

        {/* 名称 */}
        <button
          type="button"
          onClick={onEdit}
          title="点击编辑"
          className="flex-1 min-w-0 text-left"
        >
          <span
            className={`block text-[13px] font-medium truncate ${
              item.enabled ? 'text-[#1D1D1F]' : 'text-[#AEAEB2]'
            }`}
          >
            {item.label}
          </span>
          <span className="block text-[11px] font-mono text-[#C7C7CC] truncate">
            {item.moduleKey}
          </span>
        </button>

        {/* 悬停/键盘聚焦时出现的编辑按钮 */}
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 p-1.5 rounded-lg text-[#0071E3] bg-[#0071E3]/8 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
          title="编辑模块"
          aria-label={`编辑「${item.label}」`}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>

        {/* 显隐 */}
        <SwitchField
          checked={item.enabled}
          onChange={(next) => onChange({ enabled: next })}
          onLabel="显示"
          offLabel="隐藏"
          ariaLabel={`${item.label} 是否显示`}
          className="shrink-0"
        />

        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 rounded-lg text-[#86868B] hover:bg-[#FFF1F0] hover:text-[#CF1322] shrink-0"
          title="删除"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 编辑器                                                              */
/* ------------------------------------------------------------------ */

export function NavItemsEditor({ value, onChange, onSync }: NavItemsEditorProps) {
  const items = parseNavItems(value);
  const [activeId, setActiveId] = useState<string | null>(null);
  /** 弹窗状态：editingId 为 null 表示新增 */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftItem, setDraftItem] = useState<NavItemConfig | null>(null);
  /** 待确认删除的模块，非空时打开删除确认弹窗 */
  const [pendingDelete, setPendingDelete] = useState<NavItemConfig | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const commit = (next: NavItemConfig[]) => onChange(stringifyNavItems(next));

  function updateItem(moduleKey: string, patch: Partial<NavItemConfig>) {
    commit(
      items.map((item) => (item.moduleKey === moduleKey ? { ...item, ...patch } : item))
    );
  }

  /** 删除前先弹窗确认，确认后立刻把 navItems 同步到服务器 */
  async function confirmRemove() {
    if (!pendingDelete) return;
    const nextItems = items.filter((item) => item.moduleKey !== pendingDelete.moduleKey);
    const nextValue = stringifyNavItems(nextItems);

    onChange(nextValue);
    if (onSync) await onSync(nextValue);
    setPendingDelete(null);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((item) => item.moduleKey === active.id);
    const newIndex = items.findIndex((item) => item.moduleKey === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    commit(arrayMove(items, oldIndex, newIndex));
  }

  /** 自定义模块生成独立的 moduleKey，不复用内置页面 key */
  function createModuleKey(): string {
    return createCustomModuleKey(items.map((item) => item.moduleKey));
  }

  /** 打开新增弹窗：新增项一律作为占位模块，使用独立 moduleKey */
  function openCreate() {
    const moduleKey = createModuleKey();
    setEditingId(null);
    setDraftItem({
      id: moduleKey,
      moduleKey,
      moduleType: 'placeholder',
      label: '新模块',
      iconUrl: '',
      enabled: true,
    });
    setDialogOpen(true);
  }

  /** 打开编辑弹窗 */
  function openEdit(item: NavItemConfig) {
    setEditingId(item.moduleKey);
    setDraftItem(item);
    setDialogOpen(true);
  }

  /** 弹窗确定：新增追加到末尾，编辑按原标识定位后原地替换（允许改 moduleKey） */
  function handleDialogConfirm(next: NavItemConfig) {
    if (editingId) {
      commit(items.map((item) => (item.moduleKey === editingId ? next : item)));
    } else {
      commit([...items, next]);
    }
    setDialogOpen(false);
    setDraftItem(null);
    setEditingId(null);
  }

  /** 快速添加预设板块（沿用板块自带图标） */
  function addSection(sectionId: string) {
    const preset = SECTION_OPTIONS.find((item) => item.sectionKey === sectionId);
    if (!preset || items.some((item) => (item.sectionKey || item.moduleKey) === sectionId)) return;
    commit([
      ...items,
      { ...preset, label: preset.label, iconUrl: undefined, enabled: true },
    ]);
  }

  const availableSections = SECTION_OPTIONS.filter(
    (section) => !items.some((item) => (item.sectionKey || item.moduleKey) === section.sectionKey)
  );
  const activeItem = activeId ? items.find((item) => item.moduleKey === activeId) : null;

  return (
    <div className="space-y-2">
      {/* 顶部工具栏：新增模块 + 恢复默认 */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={openCreate}
          className="h-8 px-2.5 rounded-lg bg-[#0071E3] text-white text-[12px] font-medium hover:bg-[#0077ED] inline-flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          新增模块
        </button>
        <button
          type="button"
          onClick={() => commit(DEFAULT_NAV_ITEMS)}
          className="ml-auto h-8 px-2.5 rounded-lg text-[12px] text-[#86868B] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] inline-flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          恢复默认
        </button>
      </div>

      {items.length === 0 && (
        <p className="px-3 py-6 rounded-xl bg-[#FAFAFC] border border-dashed border-[#D2D2D7] text-[12px] text-[#86868B] text-center">
          暂无导航项，点击上方「新增模块」添加
        </p>
      )}

      {items.length > 1 && (
        <p className="text-[11px] text-[#86868B] flex items-center gap-1">
          <GripVertical className="w-3 h-3" />
          拖拽左侧把手可调整导航顺序
        </p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragCancel={() => setActiveId(null)}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((item) => item.moduleKey)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((item, index) => (
              <SortableNavRow
                key={item.moduleKey}
                item={item}
                index={index}
                onEdit={() => openEdit(item)}
                onChange={(patch) => updateItem(item.moduleKey, patch)}
                onRemove={() => setPendingDelete(item)}
              />
            ))}
          </div>
        </SortableContext>

        {/* 拖拽中的浮层：保持与行一致的观感 */}
        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeItem && (
            <div className="flex items-center gap-2 px-2.5 py-2 rounded-xl border border-[#0071E3]/40 bg-white shadow-xl">
              <GripVertical className="w-4 h-4 text-[#0071E3]" />
              <span className="text-[13px] font-medium text-[#1D1D1F]">{activeItem.label}</span>
              <span className="text-[11px] font-mono text-[#C7C7CC]">{activeItem.moduleKey}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* 快速添加预设板块 */}
      <div className="flex flex-wrap items-center gap-1.5">
        {availableSections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => addSection(section.id)}
            className="h-8 px-2.5 rounded-lg bg-[#F5F5F7] text-[12px] text-[#3A3A3C] hover:bg-[#EBEBF0] inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            {section.label}
          </button>
        ))}
        {availableSections.length === 0 && (
          <span className="text-[11px] text-[#AEAEB2]">已添加全部可用板块</span>
        )}
      </div>

      {/* 名称 + 图标编辑弹窗 */}
      {draftItem && (
        <NavItemDialog
          open={dialogOpen}
          initial={draftItem}
          title={editingId ? '编辑模块' : '新增模块'}
          existingKeys={items.map((item) => item.moduleKey)}
          onClose={() => {
            setDialogOpen(false);
            setDraftItem(null);
            setEditingId(null);
          }}
          onConfirm={handleDialogConfirm}
        />
      )}

      {/* 删除模块确认弹窗：要求手动输入模块标识，确认后立即同步服务器 */}
      {pendingDelete && (
        <DeleteConfirmModal
          title={`确认删除「${pendingDelete.label}」模块？`}
          itemTitles={[pendingDelete.label]}
          description="删除后该导航项会立即从服务器配置中移除，客户端刷新后生效；此操作不可撤销。"
          requireText={pendingDelete.moduleKey}
          onConfirm={() => confirmRemove()}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

export default NavItemsEditor;
