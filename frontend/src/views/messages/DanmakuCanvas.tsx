import { useEffect, useRef } from 'react';

export interface DanmakuItem {
  id: string;
  nickname: string;
  content: string;
}

interface DanmakuCanvasProps {
  items: DanmakuItem[];
  laneCount?: number;
  className?: string;
}

interface Particle {
  nickname: string;
  content: string;
  nicknameWidth: number;
  textWidth: number;
  lane: number;
  direction: 1 | -1;
  x: number;
  speed: number;
  delay: number;
}

const FONT_SIZE = 11;
const FONT_FAMILY = 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
const PADDING_X = 7;
const PILL_HEIGHT = 20;
const TEXT_GAP = 4;

function drawRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}

function measureDanmaku(
  context: CanvasRenderingContext2D,
  item: DanmakuItem,
  maxWidth: number
) {
  context.font = `600 ${FONT_SIZE}px ${FONT_FAMILY}`;
  const nicknameWidth = context.measureText(item.nickname || '访').width;

  context.font = `400 ${FONT_SIZE}px ${FONT_FAMILY}`;
  let content = item.content || '';
  let contentWidth = context.measureText(content).width;
  const available = Math.max(0, maxWidth - PADDING_X * 2 - nicknameWidth - TEXT_GAP);

  if (contentWidth > available) {
    while (content.length > 0 && contentWidth > available) {
      content = content.slice(0, -1);
      contentWidth = context.measureText(content ? `${content}…` : '…').width;
    }
    content = content ? `${content}…` : '…';
  }

  return {
    content,
    nicknameWidth,
    textWidth: Math.min(maxWidth, PADDING_X * 2 + nicknameWidth + TEXT_GAP + contentWidth),
  };
}

function entryX(direction: 1 | -1, width: number, textWidth: number) {
  return direction === 1 ? -textWidth - PADDING_X : width;
}

function hasExited(particle: Particle, width: number) {
  return particle.direction === 1
    ? particle.x > width
    : particle.x + particle.textWidth < 0;
}

/** 留言回复的 Canvas 弹幕：从画布边缘进入，每条随机向左或向右，循环播放 */
export function DanmakuCanvas({ items, laneCount = 4, className = '' }: DanmakuCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas || items.length === 0) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let frameId = 0;
    let lastTime = 0;
    let visible = true;

    function rebuild() {
      const rect = wrapper!.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      context!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const safeLanes = Math.max(1, laneCount);
      const maxTextWidth = Math.max(60, width - 12);

      particles = items.map((item, index) => {
        const measured = measureDanmaku(context!, item, maxTextWidth);
        const direction: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
        const duration = 8 + Math.random() * 4;
        const distance = width + measured.textWidth * 2;
        return {
          nickname: item.nickname,
          content: measured.content,
          nicknameWidth: measured.nicknameWidth,
          textWidth: measured.textWidth,
          lane: index % safeLanes,
          direction,
          x: entryX(direction, width, measured.textWidth),
          speed: distance / duration,
          delay: index * 0.4 + Math.random() * 1.2,
        };
      });
    }

    function drawParticle(particle: Particle) {
      const safeLanes = Math.max(1, laneCount);
      const laneHeight = (height - 12) / safeLanes;
      const y = 6 + particle.lane * laneHeight + Math.max(0, (laneHeight - PILL_HEIGHT) / 2);

      context!.globalAlpha = 0.96;
      drawRoundRect(context!, particle.x, y, particle.textWidth, PILL_HEIGHT, 6);
      context!.fillStyle = 'rgba(0, 0, 0, 0.55)';
      context!.fill();

      context!.textBaseline = 'middle';
      context!.font = `600 ${FONT_SIZE}px ${FONT_FAMILY}`;
      context!.fillStyle = '#8FC0FF';
      context!.fillText(particle.nickname, particle.x + PADDING_X, y + PILL_HEIGHT / 2);

      context!.font = `400 ${FONT_SIZE}px ${FONT_FAMILY}`;
      context!.fillStyle = 'rgba(255, 255, 255, 0.95)';
      context!.fillText(
        particle.content,
        particle.x + PADDING_X + particle.nicknameWidth + TEXT_GAP,
        y + PILL_HEIGHT / 2
      );
      context!.globalAlpha = 1;
    }

    function tick(time: number) {
      frameId = window.requestAnimationFrame(tick);
      if (!visible) {
        lastTime = time;
        return;
      }

      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
      lastTime = time;
      context!.clearRect(0, 0, width, height);

      particles.forEach((particle) => {
        if (particle.delay > 0) {
          particle.delay -= delta;
          return;
        }

        particle.x += particle.direction * particle.speed * delta;

        if (hasExited(particle, width)) {
          particle.direction = Math.random() < 0.5 ? 1 : -1;
          particle.lane = Math.floor(Math.random() * Math.max(1, laneCount));
          particle.speed = (width + particle.textWidth * 2) / (8 + Math.random() * 4);
          particle.x = entryX(particle.direction, width, particle.textWidth);
          particle.delay = Math.random() * 0.8;
          return;
        }

        drawParticle(particle);
      });
    }

    rebuild();

    const resizeObserver = new ResizeObserver(rebuild);
    resizeObserver.observe(wrapper);

    const intersectionObserver =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(
            (entries) => {
              visible = entries[0]?.isIntersecting ?? true;
            },
            { rootMargin: '80px' }
          )
        : null;
    intersectionObserver?.observe(wrapper);

    frameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
    };
  }, [items, laneCount]);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className={`pointer-events-none overflow-hidden ${className}`}
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
