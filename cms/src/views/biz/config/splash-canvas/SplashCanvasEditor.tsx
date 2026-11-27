/**
 * 开屏画布编辑器
 * ------------------------------------------------------------------
 * PC / 移动两块画布互相独立：方向由弹窗左侧栏切换，这里只挂载当前方向的那一块，
 * 两边的节点各自保存在同一份 splashCanvas 文档里。画布里的改动会合并回文档，
 * 再防抖写回配置项，避免拖拽过程中每一帧都写一份 JSON。
 */
import { useEffect, useRef, useState } from 'react';
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
  /** 当前编辑的画布方向，由弹窗左侧栏切换 */
  orientation: SplashOrientation;
  /** 画布内浮层（图片选择、模式菜单）开关，转发给弹窗做 Esc 守卫 */
  onOverlayChange?: (open: boolean) => void;
}

export function SplashCanvasEditor({
  values,
  onChange,
  orientation,
  onOverlayChange,
}: SplashCanvasEditorProps) {
  // 只在挂载时取一次初始文档：之后 values 变更（选视频、改标题）不重建画布
  const [doc, setDoc] = useState<SplashCanvasDoc>(
    () => parseSplashCanvas(values[SPLASH_CANVAS_KEY]) ?? createDefaultCanvasDoc(values)
  );

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

  function handleChange(target: SplashOrientation, next: SplashOrientationDoc) {
    const merged: SplashCanvasDoc = { ...docRef.current, [target]: next };
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
      <div className="min-h-0 flex-1">
        <CanvasEditor
          key={orientation}
          value={doc[orientation]}
          onChange={(next) => handleChange(orientation, next)}
          onOverlayChange={onOverlayChange}
        />
      </div>
    </div>
  );
}

export default SplashCanvasEditor;
