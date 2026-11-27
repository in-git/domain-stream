/**
 * 画布移动吸附
 * ------------------------------------------------------------------
 * 拖动元素时把「选区包围盒」的边/中点吸附到画布边线与中心线、以及其他元素的
 * 边与中线，命中时返回修正后的位移和用于画辅助线的坐标（设计像素）。
 * 阈值由调用方按当前缩放换算成设计像素传入，保证屏幕上的手感一致。
 */
import type { CanvasNode, CanvasSize } from './types';

export interface NodeBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface SnapInput {
  /** 本次移动位移（设计像素） */
  delta: { x: number; y: number };
  /** 被移动节点的合并包围盒 */
  moving: NodeBounds;
  /** 其他节点，作为吸附参照 */
  others: CanvasNode[];
  canvas: CanvasSize;
  /** 吸附阈值（设计像素） */
  threshold: number;
}

export interface SnapOutput {
  x: number;
  y: number;
  /** 命中的竖直辅助线 x 坐标；未命中为 null */
  guideX: number | null;
  /** 命中的水平辅助线 y 坐标；未命中为 null */
  guideY: number | null;
}

/** 合并多个节点的包围盒 */
export function unionBounds(nodes: CanvasNode[]): NodeBounds {
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const node of nodes) {
    left = Math.min(left, node.x);
    top = Math.min(top, node.y);
    right = Math.max(right, node.x + node.width);
    bottom = Math.max(bottom, node.y + node.height);
  }
  return { left, top, right, bottom };
}

export function snapMove({ delta, moving, others, canvas, threshold }: SnapInput): SnapOutput {
  const proposed = {
    left: moving.left + delta.x,
    right: moving.right + delta.x,
    centerX: (moving.left + moving.right) / 2 + delta.x,
    top: moving.top + delta.y,
    bottom: moving.bottom + delta.y,
    centerY: (moving.top + moving.bottom) / 2 + delta.y,
  };

  const verticalLines = [0, canvas.width / 2, canvas.width];
  const horizontalLines = [0, canvas.height / 2, canvas.height];
  for (const node of others) {
    verticalLines.push(node.x, node.x + node.width / 2, node.x + node.width);
    horizontalLines.push(node.y, node.y + node.height / 2, node.y + node.height);
  }

  const best = (lines: number[], anchors: number[]) => {
    let result: { diff: number; line: number } | null = null;
    for (const line of lines) {
      for (const anchor of anchors) {
        const diff = line - anchor;
        if (Math.abs(diff) > threshold) continue;
        if (!result || Math.abs(diff) < Math.abs(result.diff)) result = { diff, line };
      }
    }
    return result;
  };

  const snapX = best(verticalLines, [proposed.left, proposed.centerX, proposed.right]);
  const snapY = best(horizontalLines, [proposed.top, proposed.centerY, proposed.bottom]);

  return {
    x: delta.x + (snapX?.diff ?? 0),
    y: delta.y + (snapY?.diff ?? 0),
    guideX: snapX?.line ?? null,
    guideY: snapY?.line ?? null,
  };
}
