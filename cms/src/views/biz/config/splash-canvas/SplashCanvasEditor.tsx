/**
 * 开屏画布编辑器
 * ------------------------------------------------------------------
 * PC / 移动两块画布互相独立：Tab 切换时只挂载当前方向的那一块，两边的节点
 * 各自保存在同一份 splashCanvas 文档里。画布里的改动会合并回文档，再防抖
 * 写回配置项，避免拖拽过程中每一帧都写一份 JSON。
 */
import { useEffect, useRef, useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { SPLASH_CANVAS_KEY } from '../schema';
import { CanvasEditor } from '../../../../components/canvas-editor';
import {
  createDefaultCanvasDoc,
  parseSplashCanvas,
  stringifySplashCanvas,
  type SplashCanvasDoc,
  type SplashOrientation,
  type SplashOrientationDoc,
} from './types';

interface SplashCanvasEditorProps {
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  /** 画布内浮层（图片选择、模式菜单）开关，转发给弹窗做 Esc 守卫 */
  onOverlayChange?: (open: boolean) => void;
}

const TABS: {
  value: SplashOrientation;
  label: string;
  hint: string;
  icon: typeof Monitor;
}[] = [
  { value: 'pc', label: 'PC 端', hint: '横屏 · 1440×900', icon: Monitor },
  { value: 'mobile', label: '移动端', hint: '竖屏 · 390×844', icon: Smartphone },
];

export function SplashCanvasEditor({
  values,
  onChange,
  onOverlayChange,
}: SplashCanvasEditorProps) {
  // 只在挂载时取一次初始文档：之后 values 变更（选视频、改标题）不重建画布
  const [doc, setDoc] = useState<SplashCanvasDoc>(
    () => parseSplashCanvas(values[SPLASH_CANVAS_KEY]) ?? createDefaultCanvasDoc(values)
  );
  const [tab, setTab] = useState<SplashOrientation>('pc');

  const docRef = useRef<SplashCanvasDoc>(doc);
  const dirtyRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  function flush() {
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    onChangeRef.current(SPLASH_CANVAS_KEY, stringifySplashCanvas(docRef.current));
  }

  function handleChange(orientation: SplashOrientation, next: SplashOrientationDoc) {
    const merged: SplashCanvasDoc = { ...docRef.current, [orientation]: next };
    docRef.current = merged;
    setDoc(merged);
    dirtyRef.current = true;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      flush();
    }, 250);
  }

  // 首次挂载即把当前文档写回草稿：画布所见即保存（老配置顺带完成迁移），
  // 卸载时把防抖中的最后一次改动落盘
  useEffect(() => {
    dirtyRef.current = true;
    flush();
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      flush();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-[#E5E5EA] bg-[#FAFAFC] px-3 py-2">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setTab(item.value)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] transition-colors ${
                active
                  ? 'bg-white text-[#1D1D1F] shadow-sm'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            >
              <Icon className={`h-3.5 w-3.5 ${active ? 'text-[#0071E3]' : ''}`} />
              {item.label}
              <span className="text-[10.5px] text-[#A1A1A6]">{item.hint}</span>
            </button>
          );
        })}
        <span className="ml-auto text-[10.5px] text-[#C7C7CC]">
          两块画布内容互相独立
        </span>
      </div>

      <div className="min-h-0 flex-1">
        <CanvasEditor
          key={tab}
          value={doc[tab]}
          onChange={(next) => handleChange(tab, next)}
          onOverlayChange={onOverlayChange}
        />
      </div>
    </div>
  );
}

export default SplashCanvasEditor;
