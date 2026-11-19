/**
 * 通用模块关系流程图
 * ------------------------------------------------------------------
 * 纯展示、数据驱动的流程图组件，可在任意页面复用：
 * - 通过 nodes / edges / groups 描述内容与关系，组件本身不含业务跳转逻辑
 * - 支持鼠标 / 触摸拖拽平移，滚轮以指针为中心缩放，工具栏按钮缩放与重置
 * - 节点支持主色、普通、虚线三种样式，可附带一行说明文字
 */
import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';

export interface FlowChartNode {
  id: string;
  label: string;
  /** 节点下方的一行说明 */
  description?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  color: string;
  /** 主节点：实色填充 */
  primary?: boolean;
  /** 独立节点：虚线边框，无连线 */
  dashed?: boolean;
  /** 左侧圆形徽标文字，默认取 label 首字 */
  icon?: string;
}

export interface FlowChartEdge {
  from: string;
  to: string;
  /** 连线中点标注 */
  label?: string;
  dashed?: boolean;
}

export interface FlowChartGroup {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  fill?: string;
  stroke?: string;
  titleColor?: string;
}

export interface ModuleFlowChartProps {
  nodes: FlowChartNode[];
  edges?: FlowChartEdge[];
  groups?: FlowChartGroup[];
  /** SVG 逻辑画布尺寸，缩放/平移均在该坐标系内计算 */
  width?: number;
  height?: number;
  className?: string;
  minZoom?: number;
  maxZoom?: number;
  showToolbar?: boolean;
}

const DEFAULT_W = 168;
const DEFAULT_H = 64;

export default function ModuleFlowChart({
  nodes,
  edges = [],
  groups = [],
  width = 960,
  height = 420,
  className = '',
  minZoom = 0.5,
  maxZoom = 2.5,
  showToolbar = true,
}: ModuleFlowChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const markerId = `module-flow-arrow-${useId().replace(/:/g, '')}`;

  const apply = useCallback(
    (nextScale: number, nextOffset: { x: number; y: number }) => {
      const clamped = Math.min(maxZoom, Math.max(minZoom, nextScale));
      scaleRef.current = clamped;
      offsetRef.current = nextOffset;
      setScale(clamped);
      setOffset(nextOffset);
    },
    [minZoom, maxZoom]
  );

  /** 以画布内某点 (px, py) 为锚点缩放，保持该点在屏幕上的位置不变 */
  const zoomAt = useCallback(
    (factor: number, px?: number, py?: number) => {
      const current = scaleRef.current;
      const origin = offsetRef.current;
      const ax = px ?? width / 2;
      const ay = py ?? height / 2;
      const next = Math.min(maxZoom, Math.max(minZoom, current * factor));
      const ratio = next / current;
      apply(next, {
        x: ax - (ax - origin.x) * ratio,
        y: ay - (ay - origin.y) * ratio,
      });
    },
    [apply, width, height, minZoom, maxZoom]
  );

  // 滚轮缩放需用原生监听（React 合成 onWheel 为 passive，无法 preventDefault）
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const ratio = rect.width / width || 1;
      const px = (event.clientX - rect.left) / ratio;
      const py = (event.clientY - rect.top) / ratio;
      zoomAt(event.deltaY < 0 ? 1.12 : 1 / 1.12, px, py);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [width, zoomAt]);

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      px: event.clientX,
      py: event.clientY,
      ox: offsetRef.current.x,
      oy: offsetRef.current.y,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = rect.width / width || 1;
    apply(scaleRef.current, {
      x: drag.ox + (event.clientX - drag.px) / ratio,
      y: drag.oy + (event.clientY - drag.py) / ratio,
    });
  };

  const handlePointerEnd = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const nodeW = (node: FlowChartNode) => node.width ?? DEFAULT_W;
  const nodeH = (node: FlowChartNode) => node.height ?? DEFAULT_H;

  return (
    <div
      className={`relative overflow-hidden rounded-[18px] border border-[#E5E5EA] bg-white ${className}`}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="模块关系流程图，可拖拽移动、滚轮缩放"
        className={`block w-full touch-none select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#B8BCC4" />
          </marker>
        </defs>

        <g transform={`translate(${offset.x} ${offset.y}) scale(${scale})`}>
          {groups.map((group) => (
            <g key={group.title}>
              <rect
                x={group.x}
                y={group.y}
                width={group.width}
                height={group.height}
                rx={18}
                fill={group.fill ?? '#F8F9FC'}
                stroke={group.stroke ?? '#EDEEF3'}
              />
              <text
                x={group.x + 18}
                y={group.y + 24}
                fontSize="12"
                fontWeight="600"
                fill={group.titleColor ?? '#8E8E93'}
              >
                {group.title}
              </text>
            </g>
          ))}

          {edges.map((edge, index) => {
            const from = nodeMap.get(edge.from);
            const to = nodeMap.get(edge.to);
            if (!from || !to) return null;
            const ax = from.x + nodeW(from);
            const ay = from.y + nodeH(from) / 2;
            const bx = to.x;
            const by = to.y + nodeH(to) / 2;
            const bend = Math.max(40, (bx - ax) * 0.5);
            const labelX = (ax + bx) / 2;
            const labelY = (ay + by) / 2 - 7;
            return (
              <g key={`${edge.from}-${edge.to}-${index}`}>
                <path
                  d={`M ${ax} ${ay} C ${ax + bend} ${ay}, ${bx - bend} ${by}, ${bx} ${by}`}
                  fill="none"
                  stroke="#C7C7CC"
                  strokeWidth="1.8"
                  strokeDasharray={edge.dashed ? '6 5' : undefined}
                  markerEnd={`url(#${markerId})`}
                />
                {edge.label && (
                  <>
                    <rect
                      x={labelX - 22}
                      y={labelY - 12}
                      width="44"
                      height="18"
                      rx="9"
                      fill="#FFFFFF"
                    />
                    <text
                      x={labelX}
                      y={labelY + 1}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#86868B"
                    >
                      {edge.label}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {nodes.map((node) => {
            const w = nodeW(node);
            const h = nodeH(node);
            const midY = node.y + h / 2;
            const fill = node.primary ? node.color : '#FFFFFF';
            const textColor = node.primary ? '#FFFFFF' : '#1D1D1F';
            return (
              <g key={node.id}>
                <rect
                  x={node.x}
                  y={node.y}
                  width={w}
                  height={h}
                  rx={14}
                  fill={fill}
                  stroke={node.primary || node.dashed ? node.color : '#E5E5EA'}
                  strokeWidth={node.dashed ? 1.6 : node.primary ? 0 : 1.2}
                  strokeDasharray={node.dashed ? '6 5' : undefined}
                />
                <circle
                  cx={node.x + 28}
                  cy={midY}
                  r={13}
                  fill={node.primary ? 'rgba(255,255,255,0.22)' : `${node.color}1A`}
                />
                <text
                  x={node.x + 28}
                  y={midY + 4.5}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill={node.primary ? '#FFFFFF' : node.color}
                >
                  {node.icon ?? node.label.slice(0, 1)}
                </text>
                <text
                  x={node.x + 52}
                  y={node.description ? midY - 3 : midY + 5}
                  fontSize="14"
                  fontWeight="600"
                  fill={textColor}
                >
                  {node.label}
                </text>
                {node.description && (
                  <text
                    x={node.x + 52}
                    y={midY + 15}
                    fontSize="11"
                    fill={node.primary ? 'rgba(255,255,255,0.82)' : '#86868B'}
                  >
                    {node.description}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="pointer-events-none absolute bottom-3 left-3 text-[11px] text-[#AEAEB2]">
        拖拽移动 · 滚轮缩放
      </div>

      {showToolbar && (
        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-xl border border-[#E5E5EA] bg-white/95 p-1 shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={() => zoomAt(1 / 1.15)}
            aria-label="缩小"
            title="缩小"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6E6E73] transition-colors hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[42px] text-center text-[11px] tabular-nums text-[#86868B]">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => zoomAt(1.15)}
            aria-label="放大"
            title="放大"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6E6E73] transition-colors hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <span className="mx-0.5 h-4 w-px bg-[#E5E5EA]" />
          <button
            type="button"
            onClick={() => apply(1, { x: 0, y: 0 })}
            aria-label="重置视图"
            title="重置视图"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6E6E73] transition-colors hover:bg-[#F2F2F7] hover:text-[#1D1D1F]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
