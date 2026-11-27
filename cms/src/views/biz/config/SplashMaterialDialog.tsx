/**
 * 开屏设置弹窗
 * ------------------------------------------------------------------
 * 开屏只有两种形式，互斥生效：
 *   视频 —— 右侧直接预览横屏/竖屏视频（设备外框 + 播放器），左侧只放视频槽位；
 *   封面 —— 右侧是 PC / 移动双画布编辑器，文本、图片、进度条都在画布里增删。
 *
 * 弹窗外壳是手写模态框：占屏幕 70% 宽、80% 高，打开文件选择器时不会卸载，
 * 否则选择器关不掉。Leafer 画布用 React.lazy 懒加载，只在切到封面时下载。
 */
import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import {
  Check,
  Film,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Monitor,
  Music,
  RotateCcw,
  Smartphone,
  X,
  type LucideIcon,
} from 'lucide-react';
import { FilePicker } from '../../../components/FilePicker.tsx';
import {
  DevicePreview,
  SCREEN_PRESETS,
  ScreenPresetPicker,
  type ScreenPreset,
} from '../../../components/DevicePreview.tsx';
import { toOpenUrl, toPlayableVideoUrl, type DevFile } from '../../../lib/fileCenter.ts';
import {
  SPLASH_AUDIO_KEY,
  SPLASH_DURATION_KEY,
  SPLASH_TYPE_KEY,
  SPLASH_VIDEO_KEYS,
  resolveSplashKind,
  type SplashKind,
} from './schema';

const SplashCanvasEditor = lazy(() => import('./splash-canvas'));

/** 网页标题与「客户端配置 → 网页标题」是同一个字段，两处编辑同一份配置 */
const TITLE_KEY = 'title';

/** 横屏视频对应 PC 端，竖屏视频对应移动端 */
const LANDSCAPE_PRESET =
  SCREEN_PRESETS.find((preset) => preset.id === 'desktop-1440') ?? SCREEN_PRESETS[0];
const PORTRAIT_PRESET =
  SCREEN_PRESETS.find((preset) => preset.id === 'iphone-17') ?? SCREEN_PRESETS[0];
/** 横屏只列 PC 窗口，竖屏只列移动设备，避免出现方向相反的组合 */
const WINDOW_PRESETS = SCREEN_PRESETS.filter((preset) => preset.kind === 'window');
const DEVICE_PRESETS = SCREEN_PRESETS.filter((preset) => preset.kind === 'device');

type VideoSlot = 'landscape' | 'portrait';

/** 左侧栏字段块：标题 + 可选说明 + 控件 */
function FieldBlock({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-[11px] text-[#86868B]">{title}</p>
      {subtitle && <p className="mt-0.5 text-[10.5px] text-[#C7C7CC]">{subtitle}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

/** 素材卡片：整卡点击选中（未设置时直接开选择器），按钮上传 / 删除 */
function MediaCard({
  label,
  hint,
  icon: Icon,
  filled,
  active,
  onSelect,
  onUpload,
  onRemove,
}: {
  label: string;
  hint: string;
  icon: LucideIcon;
  filled: boolean;
  active: boolean;
  onSelect: () => void;
  onUpload: () => void;
  onRemove: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect();
        }
      }}
      className={`relative flex h-[88px] w-full cursor-pointer items-center gap-3 rounded-xl border px-3 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[#0071E3]/40 ${
        active
          ? 'border-[#0071E3]/40 bg-white shadow-sm'
          : 'border-transparent bg-white/70 hover:border-[#E5E5EA] hover:bg-white'
      }`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E5E5EA] bg-[#F5F5F7]">
        <Icon className={`h-5 w-5 ${filled ? 'text-[#0071E3]' : 'text-[#86868B]'}`} />
      </span>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-[#1D1D1F]">{label}</span>
        <span className="mt-0.5 block truncate text-[10.5px] text-[#86868B]">{hint}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onUpload();
          }}
          className="h-6 rounded-md bg-[#0071E3] px-2 text-[11px] font-medium text-white hover:bg-[#0077ED]"
        >
          上传
        </button>
        {filled && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
            className="h-6 rounded-md border border-[#D2D2D7] bg-white px-2 text-[11px] text-[#CF1322] hover:border-[#FFCCC7] hover:bg-[#FFF1F0]"
          >
            删除
          </button>
        )}
      </div>
      {filled && (
        <Check className="absolute right-2 top-2 h-4 w-4 text-[#34C759]" aria-label="已设置" />
      )}
    </div>
  );
}

interface SplashMaterialDialogProps {
  open: boolean;
  values: Record<string, string>;
  /** 写入草稿；互斥清理由外层统一处理 */
  onChange: (key: string, value: string) => void;
  onClose: () => void;
}

export function SplashMaterialDialog({
  open,
  values,
  onChange,
  onClose,
}: SplashMaterialDialogProps) {
  /** 开屏形式：视频 / 封面画布，二选一 */
  const [kind, setKind] = useState<SplashKind>(() => resolveSplashKind(values));
  /** 类型是否已按「本次打开」同步过：避免打开瞬间先闪一下另一种面板 */
  const [kindSynced, setKindSynced] = useState(false);
  if (open !== kindSynced) {
    setKindSynced(open);
    if (open) setKind(resolveSplashKind(values));
  }
  /** 视频模式当前预览的方向 */
  const [videoSlot, setVideoSlot] = useState<VideoSlot>('landscape');
  /** 右侧预览的模拟屏幕 */
  const [screenPreset, setScreenPreset] = useState<ScreenPreset>(LANDSCAPE_PRESET);
  const [screenOrientation, setScreenOrientation] = useState<'portrait' | 'landscape'>('landscape');
  /** 设备下拉是否展开：展开时 Esc 由下拉自己收起，不关弹窗 */
  const [screenMenuOpen, setScreenMenuOpen] = useState(false);
  /** 递增后重新挂载视频节点，用于「重新预览」 */
  const [previewNonce, setPreviewNonce] = useState(0);
  /** 正在选择哪个素材字段；null 表示未打开 */
  const [pickerKey, setPickerKey] = useState<string | null>(null);
  /** 画布内的浮层（图片选择 / 添加模式菜单）是否展开 */
  const [canvasOverlay, setCanvasOverlay] = useState(false);

  // 每次打开时按当前配置复位预览方向与各类浮层
  useEffect(() => {
    if (!open) return;
    setVideoSlot('landscape');
    setScreenPreset(LANDSCAPE_PRESET);
    setScreenOrientation('landscape');
    setScreenMenuOpen(false);
    setPreviewNonce(0);
    setPickerKey(null);
    setCanvasOverlay(false);
    // 只在打开时同步一次；values 变化（选完文件）不应重置当前选择
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // 打开期间锁定页面滚动
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Esc 关闭；选择器 / 设备下拉 / 画布浮层展开、或正在编辑文本时交给对应层处理
  useEffect(() => {
    if (!open || pickerKey || canvasOverlay || screenMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // 画布里的文本内编辑用 textarea，Esc 先退出编辑而不是关弹窗
      if (document.activeElement instanceof HTMLTextAreaElement) return;
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, pickerKey, canvasOverlay, screenMenuOpen, onClose]);

  const titleValue = values[TITLE_KEY] || '';
  const durationValue = (values[SPLASH_DURATION_KEY] || '').trim();
  const landscapeFilled = !!(values[SPLASH_VIDEO_KEYS[0]] || '').trim();
  const portraitFilled = !!(values[SPLASH_VIDEO_KEYS[1]] || '').trim();
  const audioFilled = !!(values[SPLASH_AUDIO_KEY] || '').trim();

  const videoKey = SPLASH_VIDEO_KEYS[videoSlot === 'landscape' ? 0 : 1];
  const fallbackVideoKey = SPLASH_VIDEO_KEYS[videoSlot === 'landscape' ? 1 : 0];
  const previewVideoRaw = (values[videoKey] || values[fallbackVideoKey] || '').trim();
  const previewVideoUrl = previewVideoRaw ? toPlayableVideoUrl(previewVideoRaw) : '';
  const videoSlotLabel = videoSlot === 'landscape' ? '横屏视频' : '竖屏视频';

  const pickerAccept = pickerKey === SPLASH_AUDIO_KEY ? 'audio' : 'video';
  const pickerTitle = pickerKey === SPLASH_AUDIO_KEY ? '选择开屏音频' : '选择开屏视频';

  function changeDuration(raw: string) {
    // 只保留数字，最多 3 位，避免出现小数/负号等非法值
    onChange(SPLASH_DURATION_KEY, raw.replace(/[^\d]/g, '').slice(0, 3));
  }

  function changeKind(next: SplashKind) {
    setKind(next);
    onChange(SPLASH_TYPE_KEY, next);
    setScreenMenuOpen(false);
  }

  /** 选中要预览的视频方向；没设置过就直接打开文件选择器 */
  function selectVideoSlot(next: VideoSlot) {
    const landscape = next === 'landscape';
    setVideoSlot(next);
    setScreenOrientation(landscape ? 'landscape' : 'portrait');
    setScreenPreset(landscape ? LANDSCAPE_PRESET : PORTRAIT_PRESET);
    const filled = !!(values[SPLASH_VIDEO_KEYS[landscape ? 0 : 1]] || '').trim();
    if (!filled) setPickerKey(SPLASH_VIDEO_KEYS[landscape ? 0 : 1]);
  }

  function handlePicked(files: DevFile[]) {
    const file = files[0];
    setPickerKey(null);
    if (!file || !pickerKey) return;
    // 文件选择器返回带 /snowy 的地址，存纯后端路径供 frontend 使用
    onChange(pickerKey, toOpenUrl(file).replace(/^\/snowy/, ''));
  }

  return (
    <>
      {/* 手写模态框：不随文件选择器开关而卸载，保证设置面板始终存在 */}
      {open && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/45 p-3 sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="设置开屏"
            className="flex flex-col overflow-hidden rounded-2xl border border-[#E5E5EA] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.3)]"
            style={{ width: 'min(max(1040px, 82vw), 96vw)', height: '86vh', maxWidth: '96vw' }}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#F0F0F2] px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5F5F7] text-[#0071E3]">
                  <ImageIcon className="h-4 w-4" />
                </span>
                <h2 className="text-[16px] font-semibold text-[#1D1D1F]">设置开屏</h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="关闭"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#86868B] transition-colors hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex min-h-0 flex-1 overflow-hidden">
              {/* 左侧：整屏级别的设置（标题 / 时长 / 形式 / 素材） */}
              <div className="flex w-[280px] shrink-0 flex-col gap-3 overflow-y-auto border-r border-[#E5E5EA] bg-[#FAFAFC] p-4">
                <h3 className="text-[13px] font-semibold text-[#1D1D1F]">标题与开屏</h3>

                <FieldBlock title="网页标题">
                  <input
                    type="text"
                    value={titleValue}
                    onChange={(event) => onChange(TITLE_KEY, event.target.value)}
                    placeholder="请输入网页标题"
                    className="h-9 w-full rounded-xl border border-[#D2D2D7] bg-white px-3 text-[13px] text-[#1D1D1F] outline-none transition-colors placeholder:text-[#C7C7CC] focus:border-[#0071E3]"
                  />
                </FieldBlock>

                <FieldBlock title="开屏时间" subtitle="启动后停留几秒">
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={60}
                      step={1}
                      inputMode="numeric"
                      value={durationValue}
                      onChange={(event) => changeDuration(event.target.value)}
                      placeholder="3"
                      className="h-9 w-full rounded-xl border border-[#D2D2D7] bg-white pl-3 pr-9 text-[13px] text-[#1D1D1F] outline-none focus:border-[#0071E3]"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-[#86868B]">
                      秒
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10.5px] text-[#86868B]">留空按素材时长</p>
                </FieldBlock>

                <FieldBlock title="开屏形式">
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#EDEDF1] p-0.5">
                    {(
                      [
                        { value: 'video' as const, label: '视频', icon: Film },
                        { value: 'cover' as const, label: '封面', icon: ImageIcon },
                      ]
                    ).map((item) => {
                      const ActiveIcon = item.icon;
                      const active = kind === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => changeKind(item.value)}
                          aria-pressed={active}
                          className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-[10px] text-[12px] font-medium transition-colors ${
                            active
                              ? 'bg-white text-[#1D1D1F] shadow-sm'
                              : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                          }`}
                        >
                          <ActiveIcon className="h-3.5 w-3.5" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </FieldBlock>

                {kind === 'video' ? (
                  <div className="flex flex-col gap-2">
                    <MediaCard
                      label="横屏视频"
                      hint={landscapeFilled ? '已设置 · PC 端' : '未设置'}
                      icon={Monitor}
                      filled={landscapeFilled}
                      active={videoSlot === 'landscape'}
                      onSelect={() => selectVideoSlot('landscape')}
                      onUpload={() => setPickerKey(SPLASH_VIDEO_KEYS[0])}
                      onRemove={() => onChange(SPLASH_VIDEO_KEYS[0], '')}
                    />
                    <MediaCard
                      label="竖屏视频"
                      hint={portraitFilled ? '已设置 · 移动端' : '未设置'}
                      icon={Smartphone}
                      filled={portraitFilled}
                      active={videoSlot === 'portrait'}
                      onSelect={() => selectVideoSlot('portrait')}
                      onUpload={() => setPickerKey(SPLASH_VIDEO_KEYS[1])}
                      onRemove={() => onChange(SPLASH_VIDEO_KEYS[1], '')}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] text-[#86868B]">开屏音频</p>
                    <MediaCard
                      label="音频"
                      hint={audioFilled ? '已设置' : '未设置'}
                      icon={Music}
                      filled={audioFilled}
                      active={false}
                      onSelect={() => setPickerKey(SPLASH_AUDIO_KEY)}
                      onUpload={() => setPickerKey(SPLASH_AUDIO_KEY)}
                      onRemove={() => onChange(SPLASH_AUDIO_KEY, '')}
                    />
                  </div>
                )}

             
              </div>

              {/* 右侧：视频预览 或 双画布编辑器 */}
              {kind === 'video' ? (
                <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 bg-white p-6">
                  <div className="flex shrink-0 items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-[#1D1D1F]">{videoSlotLabel}</p>
                      <p
                        className="mt-0.5 truncate text-[11px] text-[#86868B]"
                        title={previewVideoRaw || undefined}
                      >
                        {previewVideoRaw ? '已选择视频' : '未选择视频'}
                      </p>
                    </div>
                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setPreviewNonce((nonce) => nonce + 1)}
                        disabled={!previewVideoRaw}
                        title="重新加载预览"
                        className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#D2D2D7] bg-white px-2.5 text-[12px] text-[#1D1D1F] hover:border-[#0071E3] hover:text-[#0071E3] disabled:opacity-40 disabled:hover:border-[#D2D2D7] disabled:hover:text-[#1D1D1F]"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        预览
                      </button>
                    </div>
                  </div>

                  <ScreenPresetPicker
                    value={screenPreset}
                    onChange={setScreenPreset}
                    orientation={screenOrientation}
                    presets={videoSlot === 'landscape' ? WINDOW_PRESETS : DEVICE_PRESETS}
                    onOpenChange={setScreenMenuOpen}
                    className="shrink-0"
                  />

                  <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border border-[#E5E5EA] bg-[#F5F5F7]">
                    {!previewVideoUrl ? (
                      <div className="flex flex-col items-center gap-2 text-[#C7C7CC]">
                        <Film className="h-10 w-10" />
                        <span className="text-[12px]">未选择视频</span>
                        <button
                          type="button"
                          onClick={() => setPickerKey(videoKey)}
                          title={`从文件中心选择${videoSlotLabel}`}
                          className="mt-1 inline-flex h-8 items-center gap-1.5 rounded-lg border border-[#D2D2D7] bg-white px-3 text-[12px] text-[#1D1D1F] transition-colors hover:border-[#0071E3] hover:text-[#0071E3]"
                        >
                          <FolderOpen className="h-3.5 w-3.5" />
                          打开文件中心
                        </button>
                      </div>
                    ) : (
                      <DevicePreview
                        preset={screenPreset}
                        orientation={screenOrientation}
                        padding={24}
                        url={titleValue || 'localhost'}
                      >
                        <div className="relative h-full w-full overflow-hidden bg-black">
                          <video
                            key={`${previewVideoRaw}-${previewNonce}`}
                            src={previewVideoUrl}
                            controls
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="absolute inset-0 h-full w-full bg-black object-cover"
                          />
                        </div>
                      </DevicePreview>
                    )}
                  </div>
                </div>
              ) : (
                <div className="min-w-0 flex-1 bg-white">
                  <Suspense
                    fallback={
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-[#86868B]">
                        <Loader2 className="h-5 w-5 animate-spin text-[#0071E3]" />
                        <span className="text-[12px]">正在加载画布…</span>
                      </div>
                    }
                  >
                    <SplashCanvasEditor
                      values={values}
                      onChange={onChange}
                      onOverlayChange={setCanvasOverlay}
                    />
                  </Suspense>
                </div>
              )}
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#F0F0F2] px-5 py-3.5">
              <span className="text-[11px] text-[#86868B]">保存后生效</span>
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-xl bg-[#0071E3] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[#0077ED]"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 文件选择器是独立全屏浮层，叠在弹窗之上，本弹窗保持挂载 */}
      <FilePicker
        open={pickerKey !== null}
        onClose={() => setPickerKey(null)}
        accept={pickerAccept}
        title={pickerTitle}
        onSelect={handlePicked}
      />
    </>
  );
}

export default SplashMaterialDialog;
