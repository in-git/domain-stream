/**
 * 画布属性面板（默认实现）
 * ------------------------------------------------------------------
 * 固定在画布右侧、始终显示，按选中状态切换两份配置：
 *   没有选中组件 → 画布配置（尺寸、底色、背景素材、背景铺法、拖拽平移）
 *   选中组件     → 组件配置（文本 / 图片 / 进度条 + 该组件的交互开关）
 * 交互开关（旋转 / 调整宽高 / 倾斜 / 超出画布）属于组件，跟着选中组件走。
 * 点中画布空白处会取消选中，面板自然回到画布配置。
 *
 * 几何尺寸交给画布上的拖拽手柄，这里只调样式；旋转角度可以用「角度」输入精确设定，
 * 字号用下拉框 + A− / A+ 微调，加粗 / 斜体 / 下划线 / 删除线用图标开关（B / I / U / S），
 * 底部三个图标分别是创建副本 / 锁定图层 / 删除组件。所有操作按钮只放图标，含义交给 tooltip 提示。
 * 调用方可以通过 CanvasEditor 的 renderInspector 整个替换掉这块面板。
 */
import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
  Bold,
  Check,
  CopyPlus,
  Film,
  FolderOpen,
  Italic,
  Lock,
  LockOpen,
  Maximize2,
  Strikethrough,
  Trash2,
  Underline,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { ColorField } from './ColorField';
import { Hint } from './Hint';
import { loadVideoFrame } from './videoFrame';
import {
  CANVAS_FILTERS,
  CANVAS_IMAGE_MODES,
  previewUrl,
  type CanvasAlignMode,
  type CanvasFilterStyle,
  type CanvasImageMode,
  type CanvasNode,
  type CanvasTextAlign,
  type CanvasTextDecoration,
} from './types';

const ALIGNS: { value: CanvasTextAlign; label: string; icon: typeof Bold }[] = [
  { value: 'left', label: '左对齐', icon: AlignLeft },
  { value: 'center', label: '居中对齐', icon: AlignCenter },
  { value: 'right', label: '右对齐', icon: AlignRight },
];

/** 多选对齐：上排水平（左/中/右），下排垂直（顶/中/底） */
const ALIGN_MODES: { value: CanvasAlignMode; label: string; icon: typeof Bold }[] = [
  { value: 'left', label: '居左对齐', icon: AlignStartHorizontal },
  { value: 'center', label: '水平居中对齐', icon: AlignCenterHorizontal },
  { value: 'right', label: '居右对齐', icon: AlignEndHorizontal },
  { value: 'top', label: '顶对齐', icon: AlignStartVertical },
  { value: 'middle', label: '垂直居中对齐', icon: AlignCenterVertical },
  { value: 'bottom', label: '底对齐', icon: AlignEndVertical },
];

/** 字号预设：下拉框里的候选，A− / A+ 也按这个梯度走 */
const FONT_SIZES = [
  8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 96, 112, 128, 144, 160,
];

const TYPE_LABELS: Record<CanvasNode['type'], string> = {
  text: '文本',
  image: '图片',
  progress: '进度条',
};

/** 按预设梯度增减字号，落在两个预设之间时取相邻的更大 / 更小值 */
function stepFontSize(current: number, direction: 1 | -1): number {
  if (direction > 0) {
    return FONT_SIZES.find((size) => size > current) ?? FONT_SIZES[FONT_SIZES.length - 1];
  }
  for (let index = FONT_SIZES.length - 1; index >= 0; index -= 1) {
    if (FONT_SIZES[index] < current) return FONT_SIZES[index];
  }
  return FONT_SIZES[0];
}

/** 交互开关行：勾选 = 开启（画布配置里单项使用） */
function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11px] font-medium text-[#6E6E73]">{label}</span>
      <Hint label={hint} className="inline-flex shrink-0">
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={label}
          onClick={() => onChange(!checked)}
          className={`inline-flex h-4 w-4 items-center justify-center rounded border transition-colors ${
            checked
              ? 'border-[#0071E3] bg-[#0071E3] text-white'
              : 'border-[#D2D2D7] bg-white text-transparent'
          }`}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </button>
      </Hint>
    </div>
  );
}

/** 组件交互开关：复选框在上、名称在下，四个并排一行 */
function ToggleChip({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Hint label={hint} className="min-w-0">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="flex w-full flex-col items-center gap-1 py-0.5 outline-none"
      >
        <span
          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border transition-colors ${
            checked
              ? 'border-[#0071E3] bg-[#0071E3] text-white'
              : 'border-[#C7C7CC] bg-white text-transparent hover:border-[#0071E3]'
          }`}
        >
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
        <span
          className={`w-full truncate text-center text-[10px] leading-none transition-colors ${
            checked ? 'text-[#1D1D1F]' : 'text-[#6E6E73]'
          }`}
        >
          {label}
        </span>
      </button>
    </Hint>
  );
}

/**
 * 角度输入：本地保留正在输入的字符串，才能输入负号 / 中途的不完整数字，
 * 失焦后回到文档里的真实角度。调用方用 key={node.id} 保证换选中时清空草稿。
 */
function AngleField({ value, onChange }: { value: number; onChange: (deg: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      type="number"
      value={draft ?? String(Math.round(value * 10) / 10)}
      step={1}
      min={-180}
      max={180}
      onChange={(event) => {
        const raw = event.target.value;
        setDraft(raw);
        const next = Number(raw);
        if (raw.trim() === '' || !Number.isFinite(next)) return;
        onChange(Math.min(180, Math.max(-180, next)));
      }}
      onBlur={() => setDraft(null)}
      aria-label="旋转角度"
      className="h-7 w-[64px] rounded-md border border-[#D2D2D7] bg-white px-1 text-center text-[11px] tabular-nums text-[#1D1D1F] outline-none focus:border-[#0071E3]"
    />
  );
}

/** 下划线 / 删除线是组合值，先拆成两个开关再合并 */
function decorationState(value: CanvasTextDecoration | undefined): {
  under: boolean;
  strike: boolean;
} {
  return {
    under: value === 'under' || value === 'under-delete',
    strike: value === 'delete' || value === 'under-delete',
  };
}

/** 背景视频缩略图：优先用视频封面（视频模块带入），没有封面时抽首帧；都拿不到显示胶片占位 */
function VideoThumb({ src, posterUrl }: { src: string; posterUrl?: string }) {
  const [frame, setFrame] = useState('');
  useEffect(() => {
    if (!src || posterUrl) {
      setFrame('');
      return;
    }
    let alive = true;
    setFrame('');
    void loadVideoFrame(src).then((next) => {
      if (alive && next) setFrame(next.url);
    });
    return () => {
      alive = false;
    };
  }, [src, posterUrl]);

  if (!src || (!posterUrl && !frame)) {
    return (
      <div className="flex h-[88px] w-full items-center justify-center bg-[#F5F5F7] text-[#C7C7CC]">
        <Film className="h-5 w-5" />
      </div>
    );
  }
  return <img src={posterUrl ? previewUrl(posterUrl) : frame} alt="" className="h-[88px] w-full object-cover" />;
}

/**
 * 背景素材封面：点击封面直接打开文件中心替换；右上角悬浮「替换」「删除」
 * 两个图标按钮（绝对定位在封面上）。未设置时显示虚线上传位。
 */
function BackgroundCover({
  label,
  cover,
  filled,
  onPick,
  onRemove,
}: {
  /** 素材类型名，用于 aria 与 tooltip：图片 / 视频 */
  label: string;
  /** 封面内容：图片缩略图或视频首帧 */
  cover: ReactNode;
  filled: boolean;
  onPick: () => void;
  onRemove: () => void;
}) {
  if (!filled) {
    return (
      <button
        type="button"
        onClick={onPick}
        aria-label={`选择背景${label}`}
        className="mt-2 flex h-16 w-full items-center justify-center rounded-lg border border-dashed border-[#D2D2D7] bg-white text-[#86868B] transition-colors hover:border-[#0071E3] hover:text-[#0071E3]"
      >
        <FolderOpen className="h-4 w-4" />
      </button>
    );
  }
  return (
    <div className="relative mt-2 overflow-hidden rounded-lg border border-[#E5E5EA] bg-[#F5F5F7]">
      <button
        type="button"
        onClick={onPick}
        aria-label={`替换背景${label}`}
        className="block w-full cursor-pointer"
      >
        {cover}
      </button>
      <div className="absolute right-1.5 top-1.5 flex gap-1">
        <Hint label={`替换背景${label}`} className="inline-flex h-6 w-6">
          <button
            type="button"
            onClick={onPick}
            aria-label={`替换背景${label}`}
            className="inline-flex h-full w-full items-center justify-center rounded-md bg-white/90 text-[#6E6E73] shadow-sm transition-colors hover:text-[#0071E3]"
          >
            <FolderOpen className="h-3.5 w-3.5" />
          </button>
        </Hint>
        <Hint label={`删除背景${label}`} className="inline-flex h-6 w-6">
          <button
            type="button"
            onClick={onRemove}
            aria-label={`删除背景${label}`}
            className="inline-flex h-full w-full items-center justify-center rounded-md bg-white/90 text-[#CF1322] shadow-sm transition-colors hover:text-[#FF4D4F]"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </Hint>
      </div>
    </div>
  );
}

function toggleDecoration(
  value: CanvasTextDecoration | undefined,
  part: 'under' | 'strike'
): CanvasTextDecoration {
  const current = decorationState(value);
  const next = { ...current, [part]: !current[part] };
  if (next.under && next.strike) return 'under-delete';
  if (next.under) return 'under';
  if (next.strike) return 'delete';
  return 'none';
}

export interface CanvasInspectorContext {
  /** 当前选中的画布元素；null 时面板显示画布配置 */
  node: CanvasNode | null;
  /** 当前画布的设计尺寸，进度条宽度滑杆以画布宽度为上限 */
  canvasWidth: number;
  canvasHeight: number;
  background: string;
  /** 背景图（后端路径），空表示纯色底 */
  backgroundImage: string;
  /** 背景视频（后端路径）；与背景图可同时保留，渲染时视频优先 */
  backgroundVideo: string;
  /** 背景视频封面（后端路径，视频模块带入）；编辑器渲染背景视频缩略时优先用封面 */
  backgroundVideoCover: string;
  /** 背景素材铺法 */
  backgroundMode: CanvasImageMode;
  /** 背景画面风格滤镜 */
  backgroundFilterStyle?: CanvasFilterStyle;
  /** 背景滤镜强度 0-100 */
  backgroundFilterIntensity?: number;
  /** 画布视图交互开关：是否允许空格 + 拖动平移画布 */
  allowPan: boolean;
  /** 当前选中的节点数量，多选时提示样式会批量应用 */
  selectedCount?: number;
  onPatch: (patch: Record<string, unknown>) => void;
  onReplaceImage: () => void;
  /** 切换图片填充方式：按原始比例重新排一遍框 */
  onImageMode: (mode: CanvasImageMode) => void;
  onDelete: () => void;
  /** 创建当前选中内容的副本 */
  onDuplicate?: () => void;
  /** 锁定 / 解锁当前选中的图层 */
  onToggleLock?: () => void;
  /** 多选时按左边 / 水平中心 / 右边对齐选中元素 */
  onAlign?: (mode: CanvasAlignMode) => void;
  /** 精确设置旋转角度（度），以元素视觉中心为轴 */
  onRotate?: (deg: number) => void;
  /** 画布级配置：底色 / 背景图 / 背景视频 / 背景铺法 / 背景滤镜 / 拖拽平移开关 */
  onCanvasPatch: (patch: {
    background?: string;
    backgroundImage?: string;
    backgroundVideo?: string;
    backgroundMode?: CanvasImageMode;
    backgroundFilterStyle?: CanvasFilterStyle;
    backgroundFilterIntensity?: number;
    allowPan?: boolean;
  }) => void;
  /** 视图复位到「适配画布」 */
  onFitView?: () => void;
  onPickBackgroundImage: () => void;
  onClearBackgroundImage: () => void;
  onPickBackgroundVideo: () => void;
  onClearBackgroundVideo: () => void;
}

export type CanvasNodeInspectorProps = CanvasInspectorContext;

export function CanvasNodeInspector({
  node,
  canvasWidth,
  canvasHeight,
  background,
  backgroundImage,
  backgroundVideo,
  backgroundVideoCover,
  backgroundMode,
  backgroundFilterStyle,
  backgroundFilterIntensity,
  allowPan,
  selectedCount = 0,
  onPatch,
  onReplaceImage,
  onImageMode,
  onDelete,
  onDuplicate,
  onToggleLock,
  onAlign,
  onRotate,
  onCanvasPatch,
  onFitView,
  onPickBackgroundImage,
  onClearBackgroundImage,
  onPickBackgroundVideo,
  onClearBackgroundVideo,
}: CanvasNodeInspectorProps) {
  const title = node ? `${TYPE_LABELS[node.type]}样式` : '画布配置';
  /** 背景素材类型：默认按已有素材推断；切换分段只改当前展示的槽位，不清空素材 */
  const [bgKind, setBgKind] = useState<'image' | 'video'>(backgroundVideo ? 'video' : 'image');
  useEffect(() => {
    // 上传完成 / 删除 / 换方向后让分段控件跟上实际内容；两边都空时保留用户刚选的那一类
    if (backgroundVideo) setBgKind('video');
    else if (backgroundImage) setBgKind('image');
  }, [backgroundVideo, backgroundImage]);

  const fontSizes = FONT_SIZES.includes(node?.type === 'text' ? node.fontSize : -1)
    ? FONT_SIZES
    : [...FONT_SIZES, node?.type === 'text' ? node.fontSize : 0]
        .filter((size) => size > 0)
        .sort((a, b) => a - b);

  return (
    <aside className="flex h-full w-[220px] shrink-0 flex-col border-l border-[#E5E5EA] bg-white">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-[#F2F2F7] px-4">
        <span className="text-[12px] font-semibold text-[#1D1D1F]">{title}</span>
        {node && selectedCount > 1 && (
          <span className="ml-auto text-[10.5px] tabular-nums text-[#86868B]">
            已选 {selectedCount} 个
          </span>
        )}
      </div>

      {!node ? (
        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg bg-[#F5F5F7] px-3 py-2 text-[11px] tabular-nums text-[#6E6E73]">
              画布 {canvasWidth} × {canvasHeight}
            </div>
            <IconButton icon={Maximize2} label="适配画布" onClick={() => onFitView?.()} className="h-[34px] w-[34px]" />
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-medium text-[#6E6E73]">背景色</span>
            <ColorField
              color={background}
              onChange={(value) => onCanvasPatch({ background: value })}
            />
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-medium text-[#6E6E73]">背景素材</span>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-[#F0F0F3] p-0.5">
              {(
                [
                  { value: 'image' as const, label: '图片' },
                  { value: 'video' as const, label: '视频' },
                ]
              ).map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setBgKind(item.value)}
                  aria-pressed={bgKind === item.value}
                  className={`inline-flex h-7 items-center justify-center rounded-md text-[11px] font-medium transition-colors ${
                    bgKind === item.value
                      ? 'bg-white text-[#1D1D1F] shadow-sm'
                      : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {bgKind === 'video' ? (
              <div className="flex flex-col gap-2">
                <BackgroundCover
                  label="视频"
                  filled={!!backgroundVideo}
                  onPick={onPickBackgroundVideo}
                  onRemove={onClearBackgroundVideo}
                  cover={<VideoThumb src={backgroundVideo} posterUrl={backgroundVideoCover} />}
                />
                <p className="text-[10.5px] leading-relaxed text-[#86868B]">
                  编辑器里只显示首帧，前台开屏时播放
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <BackgroundCover
                  label="图片"
                  filled={!!backgroundImage}
                  onPick={onPickBackgroundImage}
                  onRemove={onClearBackgroundImage}
                  cover={
                    <img
                      src={previewUrl(backgroundImage)}
                      alt=""
                      className="h-[88px] w-full object-cover"
                    />
                  }
                />
                {backgroundVideo && (
                  <p className="text-[10.5px] leading-relaxed text-[#86868B]">
                    背景视频优先生效；删除视频后此图片才会作为背景
                  </p>
                )}
              </div>
            )}
          </div>

          {(backgroundImage || backgroundVideo) && (
            <div>
              <span className="mb-1.5 block text-[11px] font-medium text-[#6E6E73]">铺满方式</span>
              <div className="flex gap-1">
                {CANVAS_IMAGE_MODES.map((mode) => (
                  <Hint
                    key={mode.value}
                    label={mode.label}
                    className="min-w-0 flex-1"
                  >
                    <button
                      type="button"
                      aria-label={mode.label}
                      aria-pressed={backgroundMode === mode.value}
                      onClick={() => onCanvasPatch({ backgroundMode: mode.value })}
                      className={`flex h-8 w-full items-center justify-center rounded-md border transition-colors ${
                        backgroundMode === mode.value
                          ? 'border-[#0071E3] bg-[#F2F8FF] text-[#0071E3]'
                          : 'border-[#E5E5EA] bg-white text-[#6E6E73] hover:border-[#0071E3] hover:text-[#0071E3]'
                      }`}
                    >
                      <ModeGlyph mode={mode.value} className="h-4 w-5" />
                    </button>
                  </Hint>
                ))}
              </div>
            </div>
          )}

          {(backgroundImage || backgroundVideo) && (
            <FilterSection
              style={backgroundFilterStyle ?? 'none'}
              intensity={backgroundFilterIntensity ?? 100}
              onChange={(style, intensity) => {
                if (style === 'none') {
                  onCanvasPatch({ backgroundFilterStyle: 'none' });
                } else {
                  onCanvasPatch({
                    backgroundFilterStyle: style,
                    backgroundFilterIntensity: intensity,
                  });
                }
              }}
            />
          )}

          <div>
            <span className="mb-1.5 block text-[11px] font-medium text-[#6E6E73]">画布交互</span>
            <div className="flex flex-col gap-2">
              <ToggleRow
                label="拖拽平移"
                hint="勾选后按住空格拖动可平移画布"
                checked={allowPan}
                onChange={(next) => onCanvasPatch({ allowPan: next })}
              />
            </div>
          </div>

        </div>
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
            {selectedCount > 1 && (
              <div>
                <span className="mb-1.5 block text-[11px] font-medium text-[#6E6E73]">对齐</span>
                <div className="grid grid-cols-3 gap-1">
                  {ALIGN_MODES.map((item) => (
                    <IconButton
                      key={item.value}
                      icon={item.icon}
                      label={item.label}
                      onClick={() => onAlign?.(item.value)}
                      className="h-7 w-full"
                    />
                  ))}
                </div>
              </div>
            )}

            {node.type === 'text' && (
              <>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-medium text-[#6E6E73]">内容</span>
                  <textarea
                    value={node.text}
                    rows={2}
                    maxLength={200}
                    onChange={(event) => onPatch({ text: event.target.value })}
                    className="w-full resize-none rounded-lg border border-[#D2D2D7] bg-white px-2 py-1.5 text-[12px] leading-relaxed text-[#1D1D1F] outline-none focus:border-[#0071E3]"
                  />
                </label>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-[#6E6E73]">字号</span>
                  <div className="flex items-center gap-1">
                    <Hint label="减小字号" className="inline-flex h-7 w-7">
                      <button
                        type="button"
                        onClick={() => onPatch({ fontSize: stepFontSize(node.fontSize, -1) })}
                        aria-label="减小字号"
                        className="inline-flex h-full w-full items-center justify-center rounded-md border border-[#E5E5EA] bg-white text-[11px] leading-none text-[#6E6E73] transition-colors hover:border-[#0071E3] hover:text-[#0071E3]"
                      >
                        A−
                      </button>
                    </Hint>
                    <select
                      value={node.fontSize}
                      onChange={(event) => onPatch({ fontSize: Number(event.target.value) })}
                      aria-label="字号"
                      className="h-7 w-[64px] rounded-md border border-[#D2D2D7] bg-white px-1 text-center text-[11px] tabular-nums text-[#1D1D1F] outline-none focus:border-[#0071E3]"
                    >
                      {fontSizes.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                    <Hint label="增大字号" className="inline-flex h-7 w-7">
                      <button
                        type="button"
                        onClick={() => onPatch({ fontSize: stepFontSize(node.fontSize, 1) })}
                        aria-label="增大字号"
                        className="inline-flex h-full w-full items-center justify-center rounded-md border border-[#E5E5EA] bg-white text-[11px] leading-none text-[#6E6E73] transition-colors hover:border-[#0071E3] hover:text-[#0071E3]"
                      >
                        A+
                      </button>
                    </Hint>
                  </div>
                </div>

                <div>
                  <span className="mb-1.5 block text-[11px] font-medium text-[#6E6E73]">样式</span>
                  <div className="grid grid-cols-4 gap-1 rounded-lg bg-[#F0F0F3] p-0.5">
                    <TextStyleButton
                      icon={Bold}
                      label="加粗"
                      active={node.fontWeight >= 600}
                      onClick={() => onPatch({ fontWeight: node.fontWeight >= 600 ? 400 : 700 })}
                    />
                    <TextStyleButton
                      icon={Italic}
                      label="斜体"
                      active={!!node.italic}
                      onClick={() => onPatch({ italic: !node.italic })}
                    />
                    <TextStyleButton
                      icon={Underline}
                      label="下划线"
                      active={decorationState(node.decoration).under}
                      onClick={() =>
                        onPatch({ decoration: toggleDecoration(node.decoration, 'under') })
                      }
                    />
                    <TextStyleButton
                      icon={Strikethrough}
                      label="删除线"
                      active={decorationState(node.decoration).strike}
                      onClick={() =>
                        onPatch({ decoration: toggleDecoration(node.decoration, 'strike') })
                      }
                    />
                  </div>
                </div>

                <div>
                  <span className="mb-1.5 block text-[11px] font-medium text-[#6E6E73]">对齐</span>
                  <div className="grid grid-cols-3 gap-1 rounded-lg bg-[#F0F0F3] p-0.5">
                    {ALIGNS.map((item) => (
                      <TextStyleButton
                        key={item.value}
                        icon={item.icon}
                        label={item.label}
                        active={node.align === item.value}
                        onClick={() => onPatch({ align: item.value })}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <span className="mb-1.5 block text-[11px] font-medium text-[#6E6E73]">颜色</span>
                  <ColorField
                    key={node.id}
                    color={node.color}
                    onChange={(value) => onPatch({ color: value })}
                  />
                </div>
              </>
            )}

            {node.type === 'image' && (
              <>
                <IconButton
                  icon={FolderOpen}
                  label="替换图片"
                  onClick={onReplaceImage}
                  className="h-8 w-full"
                />

                <div>
                  <span className="mb-1.5 block text-[11px] font-medium text-[#6E6E73]">
                    填充方式
                  </span>
                  <div className="grid grid-cols-2 gap-1">
                    {CANVAS_IMAGE_MODES.map((mode) => (
                      <button
                        key={mode.value}
                        type="button"
                        onClick={() => onImageMode(mode.value)}
                        className={`h-7 rounded-md border text-[11px] transition-colors ${
                          node.mode === mode.value
                            ? 'border-[#0071E3] bg-[#F2F8FF] text-[#0071E3]'
                            : 'border-[#E5E5EA] bg-white text-[#6E6E73] hover:border-[#0071E3] hover:text-[#0071E3]'
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#6E6E73]">圆角</span>
                    <span className="text-[11px] tabular-nums text-[#1D1D1F]">
                      {node.radius}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={120}
                    step={1}
                    value={node.radius}
                    onChange={(event) => onPatch({ radius: Number(event.target.value) })}
                    className="w-full accent-[#0071E3]"
                    aria-label="图片圆角"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#6E6E73]">透明度</span>
                    <span className="text-[11px] tabular-nums text-[#1D1D1F]">
                      {Math.round(node.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={1}
                    value={Math.round(node.opacity * 100)}
                    onChange={(event) => onPatch({ opacity: Number(event.target.value) / 100 })}
                    className="w-full accent-[#0071E3]"
                    aria-label="图片透明度"
                  />
                </div>

                <FilterSection
                  style={node.filterStyle ?? 'none'}
                  intensity={node.filterIntensity ?? 100}
                  onChange={(style, intensity) => {
                    if (style === 'none') {
                      onPatch({ filterStyle: 'none' });
                    } else {
                      onPatch({ filterStyle: style, filterIntensity: intensity });
                    }
                  }}
                />
              </>
            )}

            {node.type === 'progress' && (
              <>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#6E6E73]">宽度</span>
                    <span className="text-[11px] tabular-nums text-[#1D1D1F]">
                      {node.width}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={canvasWidth}
                    step={1}
                    value={Math.min(node.width, canvasWidth)}
                    onChange={(event) =>
                      onPatch({
                        width: Number(event.target.value),
                        // 以中心为基准缩放，改宽度时保持水平居中
                        x: Math.round(node.x + (node.width - Number(event.target.value)) / 2),
                      })
                    }
                    className="w-full accent-[#0071E3]"
                    aria-label="进度条宽度"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#6E6E73]">粗细</span>
                    <span className="text-[11px] tabular-nums text-[#1D1D1F]">
                      {node.height}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={40}
                    step={1}
                    value={node.height}
                    onChange={(event) => {
                      const height = Number(event.target.value);
                      onPatch({
                        height,
                        radius: Math.round(height / 2),
                        // 以中心为基准变粗，避免进度条整体往下长
                        y: Math.round(node.y + (node.height - height) / 2),
                      });
                    }}
                    className="w-full accent-[#0071E3]"
                    aria-label="进度条粗细"
                  />
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-[#6E6E73]">圆角</span>
                    <span className="text-[11px] tabular-nums text-[#1D1D1F]">
                      {node.radius}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(2, Math.round(node.height / 2))}
                    step={1}
                    value={node.radius}
                    onChange={(event) => onPatch({ radius: Number(event.target.value) })}
                    className="w-full accent-[#0071E3]"
                    aria-label="进度条圆角"
                  />
                </div>

                <div>
                  <span className="mb-1.5 block text-[11px] font-medium text-[#6E6E73]">
                    轨道颜色
                  </span>
                  <ColorField
                    key={`${node.id}-track`}
                    color={node.trackColor}
                    onChange={(value) => onPatch({ trackColor: value })}
                  />
                </div>

                <div>
                  <span className="mb-1.5 block text-[11px] font-medium text-[#6E6E73]">
                    填充颜色
                  </span>
                  <ColorField
                    key={`${node.id}-fill`}
                    color={node.fillColor}
                    onChange={(value) => onPatch({ fillColor: value })}
                  />
                </div>
              </>
            )}

            <div>
              <span className="mb-1.5 block text-[11px] font-medium text-[#6E6E73]">交互</span>
              <div className="grid grid-cols-4 gap-0.5">
                <ToggleChip
                  label="旋转"
                  hint="勾选后可用四角手柄旋转该组件"
                  checked={node.allowRotate !== false}
                  onChange={(next) => onPatch({ allowRotate: next ? undefined : false })}
                />
                <ToggleChip
                  label="调整宽高"
                  hint="勾选后可用边角手柄缩放该组件"
                  checked={node.allowResize !== false}
                  onChange={(next) => onPatch({ allowResize: next ? undefined : false })}
                />
                <ToggleChip
                  label="倾斜"
                  hint="勾选后可用边线手柄倾斜该组件"
                  checked={node.allowSkew === true}
                  onChange={(next) => onPatch({ allowSkew: next ? true : undefined })}
                />
                <ToggleChip
                  label="超出画布"
                  hint="勾选后该组件可以拖出画布，做溢出效果"
                  checked={node.overflow === true}
                  onChange={(next) => onPatch({ overflow: next ? true : undefined })}
                />
              </div>
            </div>

            {selectedCount <= 1 && node.allowRotate !== false && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-[#6E6E73]">角度</span>
                <div className="flex items-center gap-1">
                  <AngleField
                    key={node.id}
                    value={node.rotation ?? 0}
                    onChange={(deg) => {
                      // 走 onRotate 以元素中心为轴旋转，直接改 rotation 会让元素绕左上角甩出去
                      if (onRotate) onRotate(deg);
                      else onPatch({ rotation: deg || undefined });
                    }}
                  />
                  <span className="w-3 text-[11px] text-[#86868B]">°</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-[#F2F2F7] p-3">
            <IconButton
              icon={CopyPlus}
              label="创建副本（Ctrl+D）"
              onClick={() => onDuplicate?.()}
              disabled={!onDuplicate}
              className="h-8 flex-1"
            />
            <IconButton
              icon={node.locked ? LockOpen : Lock}
              label={node.locked ? '解锁图层（Ctrl+Shift+L）' : '锁定图层（Ctrl+Shift+L）'}
              onClick={() => onToggleLock?.()}
              disabled={!onToggleLock}
              active={!!node.locked}
              className="h-8 flex-1"
            />
            <IconButton
              icon={Trash2}
              label="删除组件（Delete）"
              onClick={onDelete}
              danger
              className="h-8 flex-1"
            />
          </div>
        </>
      )}
    </aside>
  );
}

/** 文本样式开关：加粗 / 斜体 / 下划线 / 删除线 */
function TextStyleButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Bold;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Hint label={label} className="inline-flex h-7">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={label}
        className={`inline-flex h-full w-full items-center justify-center rounded-md transition-colors ${
          active ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-[#6E6E73] hover:text-[#1D1D1F]'
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
    </Hint>
  );
}

/**
 * 铺满方式的小示意图：外框代表画布，实心块代表图片的铺法。
 * 等比铺满撑到框外（被裁切）、原比例完整留边、拉伸铺满贴合画布、
 * 横/纵向拉伸只撑满一个方向。
 */
function ModeGlyph({ mode, className }: { mode: CanvasImageMode; className?: string }) {
  const shapes: Record<CanvasImageMode, { x: number; y: number; width: number; height: number }> = {
    cover: { x: -1, y: -1, width: 16, height: 12 },
    fit: { x: 3.5, y: 2.5, width: 7, height: 5 },
    stretch: { x: 1.5, y: 1, width: 11, height: 8 },
    'stretch-x': { x: 1.5, y: 3, width: 11, height: 4 },
    'stretch-y': { x: 5, y: 1, width: 4, height: 8 },
  };
  const shape = shapes[mode];
  return (
    <svg viewBox="0 0 14 10" fill="none" className={className} aria-hidden="true">
      <rect x="1.5" y="1" width="11" height="8" rx="0.5" stroke="currentColor" strokeOpacity="0.45" />
      <rect
        x={shape.x}
        y={shape.y}
        width={shape.width}
        height={shape.height}
        fill="currentColor"
        fillOpacity="0.25"
        stroke="currentColor"
        strokeWidth="0.9"
      />
    </svg>
  );
}

/**
 * 画面风格滤镜设置：预设风格九宫格 + 强度滑杆（强度只在选了风格后生效）。
 * 图片节点与画布背景共用；选择「原色」即清除滤镜。
 */
function FilterSection({
  style,
  intensity,
  onChange,
}: {
  style: CanvasFilterStyle;
  intensity: number;
  onChange: (style: CanvasFilterStyle, intensity: number) => void;
}) {
  const hasFilter = style !== 'none';
  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-medium text-[#6E6E73]">画面风格</span>
      <div className="grid grid-cols-3 gap-1">
        {CANVAS_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={style === item.value}
            onClick={() => onChange(item.value, intensity)}
            className={`h-7 rounded-md border text-[11px] transition-colors ${
              style === item.value
                ? 'border-[#0071E3] bg-[#F2F8FF] text-[#0071E3]'
                : 'border-[#E5E5EA] bg-white text-[#6E6E73] hover:border-[#0071E3] hover:text-[#0071E3]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className={hasFilter ? 'mt-2' : 'mt-2 opacity-40'}>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-medium text-[#6E6E73]">强度</span>
          <span className="text-[11px] tabular-nums text-[#1D1D1F]">
            {hasFilter ? `${Math.round(intensity)}%` : '—'}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(intensity)}
          disabled={!hasFilter}
          onChange={(event) => onChange(style, Number(event.target.value))}
          className="w-full accent-[#0071E3] disabled:cursor-not-allowed"
          aria-label="滤镜强度"
        />
      </div>
    </div>
  );
}

/**
 * 操作按钮：只放图标，含义交给 tooltip / aria-label 提示。
 * 危险操作（删除、移除）用红色描边，当前生效的开关用高亮色。
 */
function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
  active,
  className,
}: {
  icon: typeof Bold;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
  className?: string;
}) {
  return (
    <Hint label={label} className={`inline-flex ${className ?? ''}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active}
        className={`inline-flex h-full w-full items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:border-[#F2F2F7] disabled:text-[#C7C7CC] ${
          active
            ? 'border-[#0071E3] bg-[#F2F8FF] text-[#0071E3]'
            : danger
              ? 'border-[#FFCCC7] bg-[#FFF1F0] text-[#CF1322] hover:border-[#FF4D4F]'
              : 'border-[#E5E5EA] bg-white text-[#6E6E73] hover:border-[#0071E3] hover:text-[#0071E3]'
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
    </Hint>
  );
}

export default CanvasNodeInspector;
