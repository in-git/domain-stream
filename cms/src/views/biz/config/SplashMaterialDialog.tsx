/**
 * 开屏设置弹窗
 * ------------------------------------------------------------------
 * 开屏不再区分「形式」：主体始终是 PC / 移动双画布编辑器（文本、图片、进度条），
 * 背景素材在画布配置里选图片或视频，客户端按背景类型决定渲染视频还是组件。
 * 左侧只放整屏级别的设置：网页标题、开屏时间、开屏音频（背景是视频时隐藏）。
 *
 * 弹窗外壳是手写模态框：打开文件选择器时不会卸载，否则选择器关不掉。
 * Leafer 画布用 React.lazy 懒加载。
 */
import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import {
  Check,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Music,
  X,
  type LucideIcon,
} from 'lucide-react';
import { FilePicker } from '../../../components/FilePicker.tsx';
import { toOpenUrl, type DevFile } from '../../../lib/fileCenter.ts';
import { SPLASH_AUDIO_KEY, SPLASH_CANVAS_KEY, SPLASH_DURATION_KEY } from './schema';
import { parseSplashCanvas, type SplashOrientation } from './splash-canvas/types';

const SplashCanvasEditor = lazy(() => import('./splash-canvas'));

/** 网页标题与「客户端配置 → 网页标题」是同一个字段，两处编辑同一份配置 */
const TITLE_KEY = 'title';

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
  onSelect,
  onUpload,
  onRemove,
}: {
  label: string;
  hint: string;
  icon: LucideIcon;
  filled: boolean;
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
      className="relative flex h-[88px] w-full cursor-pointer items-center gap-3 rounded-xl border border-transparent bg-white/70 px-3 text-left outline-none transition-colors hover:border-[#E5E5EA] hover:bg-white focus-visible:ring-2 focus-visible:ring-[#0071E3]/40"
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
  /** 正在选择哪个素材字段；null 表示未打开 */
  const [pickerKey, setPickerKey] = useState<string | null>(null);
  /** 当前编辑的画布方向：横屏（PC）/ 竖屏（移动），两块画布数据互相独立 */
  const [orientation, setOrientation] = useState<SplashOrientation>('pc');
  /** 画布内的浮层（图片选择 / 添加模式菜单）是否展开 */
  const [canvasOverlay, setCanvasOverlay] = useState(false);

  // 每次打开时复位浮层状态
  useEffect(() => {
    if (!open) return;
    setPickerKey(null);
    setCanvasOverlay(false);
    setOrientation('pc');
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

  // Esc 关闭；选择器 / 画布浮层展开、或正在编辑文本时交给对应层处理
  useEffect(() => {
    if (!open || pickerKey || canvasOverlay) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // 画布里的文本内编辑用 textarea，Esc 先退出编辑而不是关弹窗
      if (document.activeElement instanceof HTMLTextAreaElement) return;
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, pickerKey, canvasOverlay, onClose]);

  const titleValue = values[TITLE_KEY] || '';
  const durationValue = (values[SPLASH_DURATION_KEY] || '').trim();
  const audioValue = (values[SPLASH_AUDIO_KEY] || '').trim();
  const audioFilled = !!audioValue;
  // 已选音频显示文件名（取路径最后一段并解码），未选时保持「未设置」
  const audioName = audioFilled
    ? decodeURIComponent(audioValue.split('/').pop() || '') || '已设置'
    : '未设置';
  // 画布任一方向把背景配成视频时，开屏音频不再叠加；没选图片背景时音频入口不出现
  const splashCanvasDoc = parseSplashCanvas(values[SPLASH_CANVAS_KEY]);
  const hasBackgroundImage = Boolean(
    splashCanvasDoc && (splashCanvasDoc.pc.backgroundImage || splashCanvasDoc.mobile.backgroundImage)
  );
  const hasBackgroundVideo = Boolean(
    splashCanvasDoc && (splashCanvasDoc.pc.backgroundVideo || splashCanvasDoc.mobile.backgroundVideo)
  );

  function changeDuration(raw: string) {
    // 只保留数字，最多 3 位，避免出现小数/负号等非法值
    onChange(SPLASH_DURATION_KEY, raw.replace(/[^\d]/g, '').slice(0, 3));
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
              {/* 左侧：整屏级别的设置（标题 / 时长 / 音频） */}
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

                <FieldBlock title="画布方向" subtitle="横竖屏数据互相独立">
                  <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="画布方向">
                    {(
                      [
                        { value: 'pc' as const, label: '横屏', hint: 'PC 端 · 1440 × 900' },
                        { value: 'mobile' as const, label: '竖屏', hint: '移动端 · 390 × 844' },
                      ]
                    ).map((item) => {
                      const active = orientation === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          onClick={() => setOrientation(item.value)}
                          className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                            active
                              ? 'border-[#0071E3] bg-[#F2F8FF]'
                              : 'border-[#E5E5EA] bg-white hover:border-[#0071E3]/50'
                          }`}
                        >
                          {/* 单选圆点：选中时实心蓝点 */}
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                              active ? 'border-[#0071E3]' : 'border-[#C7C7CC]'
                            }`}
                          >
                            {active && <span className="h-2 w-2 rounded-full bg-[#0071E3]" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[12.5px] font-medium leading-none text-[#1D1D1F]">
                              {item.label}
                            </span>
                            <span className="mt-1 block truncate text-[10.5px] leading-none text-[#86868B]">
                              {item.hint}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </FieldBlock>

                {hasBackgroundVideo ? (
                  <div>
                    <p className="text-[11px] text-[#86868B]">开屏音频</p>
                    <p className="mt-2 text-[10.5px] leading-relaxed text-[#A1A1A6]">
                      画布背景已使用视频，视频自带声音，不再叠加音频；把背景切回图片后可重新设置
                    </p>
                  </div>
                ) : hasBackgroundImage ? (
                  <div className="flex flex-col gap-2">
                    <p className="text-[11px] text-[#86868B]">开屏音频</p>
                    <MediaCard
                      label="音频"
                      hint={audioName}
                      icon={Music}
                      filled={audioFilled}
                      onSelect={() => setPickerKey(SPLASH_AUDIO_KEY)}
                      onUpload={() => setPickerKey(SPLASH_AUDIO_KEY)}
                      onRemove={() => onChange(SPLASH_AUDIO_KEY, '')}
                    />
                  </div>
                ) : null}

                <p className="mt-auto flex items-start gap-1.5 text-[10.5px] leading-relaxed text-[#86868B]">
                  <FolderOpen className="mt-0.5 h-3 w-3 shrink-0" />
                  背景素材在右侧画布配置里设置：选视频客户端就播视频，选图片或只放组件就是封面画布。
                </p>
              </div>

              {/* 右侧：PC / 移动双画布编辑器 */}
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
                    orientation={orientation}
                    onOverlayChange={setCanvasOverlay}
                  />
                </Suspense>
              </div>
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
        accept="audio"
        title="选择开屏音频"
        onSelect={handlePicked}
      />
    </>
  );
}

export default SplashMaterialDialog;
