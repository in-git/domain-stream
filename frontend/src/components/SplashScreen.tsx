import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
  type SyntheticEvent,
} from 'react';
import { motion } from 'motion/react';
import splashSvgRaw from '../assets/splash-icon.svg?raw';
import { APPLE_EASE, SWIFTUI_SMOOTH } from '../lib/motion';
import { publicFileUrl, useSystemInfo, useSystemInfoSettled } from '../lib/systemInfo';
import {
  parseSplashCanvas,
  resolveSplashMode,
  splashFilterCss,
  type SplashFilterParams,
  type SplashImageMode,
  type SplashNode,
  type SplashOrientationDoc,
  type SplashTextNode,
} from '../lib/splashCanvas';

const DEFAULT_SPLASH_DURATION = 1850;
const MIN_MEDIA_DURATION = 2200;
const MAX_MEDIA_DURATION = 8000;
/** 等系统配置的最长时间：超时仍用默认时长开跑，避免接口异常时开屏卡死 */
const CONFIG_WAIT_TIMEOUT = 1200;

/**
 * 开屏 SVG 内联代码：去掉 XML 声明 / DOCTYPE，并让图形铺满节点框，
 * 直接写进开屏页面渲染，绕开 <img> 对 SVG Content-Type 的依赖。
 */
const SPLASH_SVG_MARKUP = splashSvgRaw
  .replace(/^[\s\S]*?<svg/i, '<svg')
  .replace(/<svg\b/i, '<svg style="display:block;width:100%;height:100%"');


/** 标题的默认位置（百分比：x 为水平中心、y 为顶边） */
const DEFAULT_POSITIONS = {
  title: { x: 50, y: 38 },
};

/** 与后台「设置开屏素材」对应：横屏 / 竖屏各一套位置 */
const POSITION_KEYS = {
  title: ['splashTitlePosLandscape', 'splashTitlePosPortrait'],
};

interface SplashPosition {
  x: number;
  y: number;
}

/** 解析 CMS 里拖拽好的百分比位置；缺失或脏数据回退到默认位置 */
function readPosition(raw: string | undefined, fallback: SplashPosition): SplashPosition {
  const value = (raw || '').trim();
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value) as Partial<SplashPosition>;
    const x = Number(parsed.x);
    const y = Number(parsed.y);
    if (Number.isFinite(x) && Number.isFinite(y)) {
      return { x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) };
    }
  } catch {
    // 非法 JSON 直接回退
  }
  return fallback;
}

/** 开屏素材按屏幕方向取横屏或竖屏版本 */
function usePortrait(): boolean {
  const [portrait, setPortrait] = useState(
    () => typeof window !== 'undefined' && window.innerHeight > window.innerWidth
  );
  useEffect(() => {
    function sync() {
      setPortrait(window.innerHeight > window.innerWidth);
    }
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', sync);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', sync);
    };
  }, []);
  return portrait;
}

/** 用户第一次交互的事件：浏览器只允许在这些事件之后播放带声音的媒体 */
const GESTURE_EVENTS = ['pointerdown', 'keydown', 'touchstart'] as const;

/**
 * 自动播放被浏览器拦截时的补偿：注册一次性交互监听，用户一操作就立刻恢复播放。
 * 返回清理函数，组件卸载或换素材时要把监听一并移除。
 */
function resumeAfterGesture(resume: () => void): () => void {
  const cleanup = () => {
    GESTURE_EVENTS.forEach((name) => window.removeEventListener(name, handler, true));
  };
  const handler = () => {
    cleanup();
    resume();
  };
  GESTURE_EVENTS.forEach((name) => window.addEventListener(name, handler, true));
  return cleanup;
}

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const { title, config } = useSystemInfo();
  const systemInfoSettled = useSystemInfoSettled();
  const [mediaDuration, setMediaDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  /** 画布背景视频（封面模式下的动态背景），与开屏音频互斥 */
  const backgroundVideoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const portrait = usePortrait();
  // 开屏不再有「形式」开关：画布配了背景视频就播视频，否则渲染画布组件；
  // 完全没有画布文档的旧配置才回退到「有视频播视频，否则整屏图片」
  const canvasDoc = parseSplashCanvas(config.splashCanvas);
  const canvas = canvasDoc ? (portrait ? canvasDoc.mobile : canvasDoc.pc) : null;
  // 画布里的固定「跳过开屏」文本：位置 / 样式由后台决定，客户端拿它渲染跳过按钮
  const skipNode =
    canvas?.nodes.find(
      (node): node is SplashTextNode => node.type === 'text' && node.fixed === 'skip'
    ) ?? null;
  // 背景视频只跟随当前方向的画布，横竖屏各自独立
  const backgroundVideoUrl = canvas?.backgroundVideo
    ? publicFileUrl(canvas.backgroundVideo)
    : '';

  // 兼容旧配置与单方向配置：缺哪个方向就沿用另一个方向的素材
  const rawLandscapeVideo = publicFileUrl(config.splashVideoLandscapeUrl || config.splashVideoUrl);
  const rawPortraitVideo = publicFileUrl(config.splashVideoPortraitUrl);
  const rawLandscapeImage = publicFileUrl(config.splashImageLandscapeUrl || config.splashImageUrl);
  const rawPortraitImage = publicFileUrl(config.splashImagePortraitUrl);
  const landscapeVideo = rawLandscapeVideo || rawPortraitVideo;
  const portraitVideo = rawPortraitVideo || rawLandscapeVideo;
  const landscapeImage = rawLandscapeImage || rawPortraitImage;
  const portraitImage = rawPortraitImage || rawLandscapeImage;

  // 旧版兜底素材：画布一旦保存过就以画布为准，旧字段只在完全没有画布文档时生效
  const legacyMode = canvas ? null : resolveSplashMode(config);
  const videoUrl = legacyMode === 'video' ? (portrait ? portraitVideo : landscapeVideo) : '';
  const imageUrl =
    !videoUrl && legacyMode === 'cover' ? (portrait ? portraitImage : landscapeImage) : '';
  const hasVisualMedia = Boolean(imageUrl || videoUrl);
  // 与 CMS 拖拽预览共用同一套百分比坐标，横屏取第 0 项、竖屏取第 1 项
  const orientationIndex = portrait ? 1 : 0;
  const titlePos = readPosition(
    config[POSITION_KEYS.title[orientationIndex]],
    DEFAULT_POSITIONS.title
  );
  // 后台「设置开屏素材 → 样式」里调整过的字号 / 颜色，留空沿用默认样式
  const titleSize = Number((config.splashTitleFontSize || '').trim()) || 0;
  const titleColor = (config.splashTitleColor || '').trim();
  // 音频只在图片背景下播放：视频开屏（旧配置）和画布背景视频都自带声音，不叠加音频
  const audioUrl =
    videoUrl || backgroundVideoUrl ? '' : publicFileUrl(config.splashAudioUrl);
  // 后台「开屏时间」优先；未配置时按素材时长（限制在合理区间），再退回默认值
  const configuredSeconds = Number((config.splashDuration || '').trim());
  const configuredDuration =
    Number.isFinite(configuredSeconds) && configuredSeconds > 0 ? configuredSeconds * 1000 : 0;

  // 配置还没回来时不要开跑：否则会先用默认 1.85s 开始，等配置到达又重新计时，
  // 整体时长和后台配置不一致。最多等 1.2s 兜底，避免接口异常时卡住开屏。
  const [configTimedOut, setConfigTimedOut] = useState(false);
  useEffect(() => {
    if (systemInfoSettled) return;
    const timer = window.setTimeout(() => setConfigTimedOut(true), CONFIG_WAIT_TIMEOUT);
    return () => window.clearTimeout(timer);
  }, [systemInfoSettled]);
  const configSettled = systemInfoSettled || configTimedOut;

  /**
   * 本次开屏的持续时间：配置就绪后只取一次并锁定，
   * 后面素材元数据（video/audio 的 duration）再变化也不会重启计时，
   * 保证关闭时机用后端返回的开屏时间。
   */
  const [runDuration, setRunDuration] = useState(0);
  useEffect(() => {
    if (!configSettled || runDuration) return;
    setRunDuration(
      // 后端给了开屏时间就严格按它走，不再二次夹取
      configuredDuration
        ? configuredDuration
        : mediaDuration
          ? Math.min(Math.max(mediaDuration, MIN_MEDIA_DURATION), MAX_MEDIA_DURATION)
          : DEFAULT_SPLASH_DURATION
    );
  }, [configSettled, configuredDuration, mediaDuration, runDuration]);

  useEffect(() => {
    if (!runDuration) return;
    const done = window.setTimeout(() => {
      // 开屏结束立刻停掉媒体，否则淡出的 0.5s 里音频 / 视频还会继续响
      videoRef.current?.pause();
      backgroundVideoRef.current?.pause();
      audioRef.current?.pause();
      onComplete();
    }, runDuration);

    return () => {
      window.clearTimeout(done);
    };
  }, [runDuration, onComplete]);

  /**
   * 整屏视频（旧配置的「视频开屏」）：播放视频本身（视频自带声音），不叠加音频；
   * 画布背景视频走画布层，同样自带声音。只会有一路视频 / 音频在响。
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let stopGesture = () => {};
    // 优先带声音播放；被自动播放策略拦截时先静音保证画面，用户首次交互后再恢复声音
    video.muted = false;
    void video.play().catch(() => {
      video.muted = true;
      void video.play().catch(() => {});
      stopGesture = resumeAfterGesture(() => {
        video.muted = false;
        void video.play().catch(() => {});
      });
    });
    return () => {
      stopGesture();
      video.pause();
    };
  }, [videoUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let stopGesture = () => {};
    void audio.play().catch(() => {
      // 被拦截时等用户第一次交互再补播，否则音频永远不会响
      stopGesture = resumeAfterGesture(() => {
        void audio.play().catch(() => {});
      });
    });
    return () => {
      stopGesture();
      audio.pause();
    };
  }, [audioUrl]);

  /** 画布背景视频：带声音自动播放，被拦截就静音保画面，用户首次交互后恢复声音 */
  useEffect(() => {
    const video = backgroundVideoRef.current;
    if (!video) return;
    let stopGesture = () => {};
    video.muted = false;
    void video.play().catch(() => {
      video.muted = true;
      void video.play().catch(() => {});
      stopGesture = resumeAfterGesture(() => {
        video.muted = false;
        void video.play().catch(() => {});
      });
    });
    return () => {
      stopGesture();
      video.pause();
    };
  }, [backgroundVideoUrl]);

  useEffect(() => {
    return () => {
      videoRef.current?.pause();
      backgroundVideoRef.current?.pause();
      audioRef.current?.pause();
    };
  }, []);

  function handleMediaMetadata(event: SyntheticEvent<HTMLMediaElement>) {
    const seconds = event.currentTarget.duration;
    if (Number.isFinite(seconds) && seconds > 0) {
      setMediaDuration((current) => Math.max(current, Math.round(seconds * 1000)));
    }
  }

  return (
    <motion.div
      initial={{ opacity: 1, scale: 1 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{
        opacity: 0,
        scale: 1.045,
        filter: 'blur(8px)',
        transition: { duration: 0.52, ease: APPLE_EASE },
      }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#000000] text-app-text select-none overflow-hidden"
      aria-label="应用加载中"
    >
      {/* 开屏素材：视频优先，其次图片；音频单独播放 */}
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          onLoadedMetadata={handleMediaMetadata}
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        />
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : null}
      {hasVisualMedia && !canvas && (
        <div
          className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/10 to-black/75"
          aria-hidden="true"
        />
      )}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          autoPlay
          onLoadedMetadata={handleMediaMetadata}
          className="hidden"
        />
      )}

      {/* Subtle Apple-grade radial ambient illumination behind emblem */}
      {!hasVisualMedia && !canvas && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 0.45, scale: 1.15 }}
          transition={{ duration: 1.4, ease: APPLE_EASE }}
          className="pointer-events-none absolute w-[360px] h-[360px] rounded-full bg-radial from-app-primary/25 via-[#5E5CE6]/10 to-transparent blur-3xl -translate-y-[20dvh] md:translate-y-0"
        />
      )}

      {/* 后台画布：文本 / 图片 / 图形 / HTML 按设计像素换算成百分比铺满屏幕 */}
      {canvas && (
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            backgroundColor: videoUrl ? undefined : canvas.background,
            // 组件勾选「超出画布」时允许溢出画布；旧配置的画布级 contained 继续兼容
            overflow:
              canvas.contained === false || canvas.nodes.some((node) => node.overflow === true)
                ? 'visible'
                : 'hidden',
          }}
        >
          {/* 背景图铺在最底层，铺法跟后台画布配置一致；单独一层裁切，保证任何铺法都不超出画布 */}
          {canvas.backgroundVideo ? (
            // 背景视频与背景图互斥：有视频时整层换成视频，铺法复用同一套样式
            <div className="absolute inset-0 overflow-hidden">
              <video
                ref={backgroundVideoRef}
                src={publicFileUrl(canvas.backgroundVideo)}
                poster={canvas.backgroundVideoCover ? publicFileUrl(canvas.backgroundVideoCover) : undefined}
                autoPlay
                muted
                loop
                playsInline
                style={backgroundImageStyle(
                  canvas.backgroundMode,
                  canvas.backgroundFilter
                )}
                aria-hidden="true"
              />
            </div>
          ) : canvas.backgroundImage ? (
            <div className="absolute inset-0 overflow-hidden">
              <img
                src={publicFileUrl(canvas.backgroundImage)}
                alt=""
                aria-hidden="true"
                style={backgroundImageStyle(
                  canvas.backgroundMode,
                  canvas.backgroundFilter
                )}
              />
            </div>
          ) : null}
          {canvas.nodes
            .filter((node) => !(node.type === 'text' && node.fixed === 'skip'))
            .map((node) => (
              <CanvasNode key={node.id} node={node} canvas={canvas} />
            ))}
        </div>
      )}

      {!canvas && (
        <div
          className={
            hasVisualMedia
              ? 'pointer-events-none absolute inset-0 z-10'
              : 'relative flex flex-col items-center -translate-y-[20dvh] md:translate-y-0'
          }
        >
        {/* Wordmark with crisp Apple reveal */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...SWIFTUI_SMOOTH, delay: 0.18 }}
          style={{
            ...(hasVisualMedia
              ? { left: `${titlePos.x}%`, top: `${titlePos.y}%`, x: '-50%' }
              : {}),
            ...(titleSize ? { fontSize: `${titleSize}px` } : {}),
            ...(titleColor ? { color: titleColor } : {}),
          }}
          className={
            hasVisualMedia
              ? 'absolute max-w-3xl text-3xl font-semibold tracking-tight text-white drop-shadow-lg md:text-5xl'
              : 'text-3xl font-semibold tracking-tight text-white'
          }
        >
          {title}
        </motion.h1>
        </div>
      )}

      {/* Discreet skip control */}
      <motion.button
        type="button"
        onClick={() => {
          videoRef.current?.pause();
          backgroundVideoRef.current?.pause();
          audioRef.current?.pause();
          onComplete();
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.65 }}
        whileHover={{ opacity: 1 }}
        whileTap={{ scale: 0.96 }}
        transition={{ delay: 0.45 }}
        style={
          skipNode && canvas
            ? {
                left: `${(skipNode.x / canvas.width) * 100}%`,
                top: `${(skipNode.y / canvas.height) * 100}%`,
                width: `${(skipNode.width / canvas.width) * 100}%`,
                height: `${(skipNode.height / canvas.height) * 100}%`,
                color: skipNode.color,
                fontSize: `${(skipNode.fontSize / canvas.width) * 100}vw`,
                fontWeight: skipNode.fontWeight,
                textAlign: skipNode.align,
                justifyContent:
                  skipNode.align === 'left'
                    ? 'flex-start'
                    : skipNode.align === 'right'
                      ? 'flex-end'
                      : 'center',
                transform: skipNode.rotation
                  ? `rotate(${skipNode.rotation}deg)`
                  : undefined,
                transformOrigin: '50% 50%',
              }
            : undefined
        }
        className={
          skipNode
            ? 'absolute z-20 flex items-center justify-center p-0 text-app-subtle transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF] rounded-app'
            : `absolute z-20 ${
                hasVisualMedia ? 'top-5 right-5' : 'bottom-8'
              } px-4 py-2 min-h-[44px] text-xs font-medium text-app-subtle hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A84FF] rounded-app`
        }
      >
        {skipNode?.text || '跳过开屏'}
      </motion.button>
    </motion.div>
  );
}

/** 文本装饰：Leafer 的取值转成 CSS */
function textDecorationCss(decoration: SplashTextNode['decoration']): string {
  if (decoration === 'under') return 'underline';
  if (decoration === 'delete') return 'line-through';
  if (decoration === 'under-delete') return 'underline line-through';
  return 'none';
}

/**
 * 背景素材铺法：与后台画布的五种模式一一对应（语义定义见 cms 的 imageBoxFor）。
 *   cover      → object-fit: cover（等比铺满，裁掉超出）
 *   fit        → object-fit: contain（完整显示，可能留边）
 *   stretch    → object-fit: fill（强制变形铺满）
 *   stretch-x  → 宽撑满、高等比，垂直居中
 *   stretch-y  → 高撑满、宽等比，水平居中
 */
function backgroundImageStyle(
  mode: SplashImageMode = 'cover',
  filter?: SplashFilterParams
): CSSProperties {
  const base: CSSProperties = { position: 'absolute', left: 0, top: 0 };
  // 画面调节：与后台编辑器共用同一套 CSS filter 语法
  const css = splashFilterCss(filter);
  if (css) base.filter = css;
  if (mode === 'fit') {
    return { ...base, width: '100%', height: '100%', objectFit: 'contain' };
  }
  if (mode === 'cover') {
    return { ...base, width: '100%', height: '100%', objectFit: 'cover' };
  }
  if (mode === 'stretch-x') {
    return { ...base, width: '100%', height: 'auto', top: '50%', transform: 'translateY(-50%)' };
  }
  if (mode === 'stretch-y') {
    return { ...base, height: '100%', width: 'auto', left: '50%', transform: 'translateX(-50%)' };
  }
  return { ...base, width: '100%', height: '100%', objectFit: 'fill' };
}

interface CanvasNodeProps {
  node: SplashNode;
  canvas: SplashOrientationDoc;
}

/**
 * 画布节点渲染
 * ------------------------------------------------------------------
 * 后台存的是设计像素（PC 1440×900 / 移动 390×844），这里统一换算成百分比：
 * 位置和尺寸用 % 交给容器，字号、圆角这类绝对单位按画布宽度折算成 vw，
 * 保证任何屏幕宽度下视觉比例都与后台画布一致。
 */
function CanvasNode({ node, canvas }: CanvasNodeProps) {
  const left = `${(node.x / canvas.width) * 100}%`;
  const top = `${(node.y / canvas.height) * 100}%`;
  const width = `${(node.width / canvas.width) * 100}%`;
  const height = `${(node.height / canvas.height) * 100}%`;
  const scaled = (value: number) => `${(value / canvas.width) * 100}vw`;

  if (node.type === 'text') {
    const justify =
      node.align === 'left' ? 'flex-start' : node.align === 'right' ? 'flex-end' : 'center';
    return (
      <div
        style={{
          position: 'absolute',
          left,
          top,
          width,
          height,
          // 围绕左上角旋转，和后台 Leafer 画布的旋转轴心一致
          transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
          transformOrigin: '50% 50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: justify,
          color: node.color,
          fontSize: scaled(node.fontSize),
          fontWeight: node.fontWeight,
          fontStyle: node.italic ? 'italic' : 'normal',
          textDecoration: textDecorationCss(node.decoration),
          lineHeight: 1.4,
          textAlign: node.align,
          whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word',
          textShadow: '0 2px 12px rgba(0, 0, 0, 0.35)',
        }}
      >
        {node.text}
      </div>
    );
  }

  if (node.type === 'html') {
    return (
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left,
          top,
          width,
          height,
          transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
          transformOrigin: '50% 50%',
          opacity: node.opacity,
        }}
        dangerouslySetInnerHTML={{ __html: node.html }}
      />
    );
  }

  if (node.type === 'image') {
    return (
      <img
        src={publicFileUrl(node.url)}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          left,
          top,
          width,
          height,
          transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
          transformOrigin: '50% 50%',
          objectFit: 'fill',
          borderRadius: scaled(node.radius),
          opacity: node.opacity,
          filter: splashFilterCss(node.filter) || undefined,
        }}
      />
    );
  }

  if (node.type === 'rect') {
    return (
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left,
          top,
          width,
          height,
          transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
          transformOrigin: '50% 50%',
          borderRadius: scaled(node.radius),
          backgroundColor: node.fill,
          border:
            node.stroke && node.strokeWidth
              ? `${scaled(node.strokeWidth)} solid ${node.stroke}`
              : undefined,
          opacity: node.opacity,
        }}
      />
    );
  }

  if (node.type === 'ellipse') {
    return (
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left,
          top,
          width,
          height,
          transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
          transformOrigin: '50% 50%',
          borderRadius: '50%',
          backgroundColor: node.fill,
          border:
            node.stroke && node.strokeWidth
              ? `${scaled(node.strokeWidth)} solid ${node.stroke}`
              : undefined,
          opacity: node.opacity,
        }}
      />
    );
  }

  if (node.type === 'svg') {
    // 内置图形是 data URI，直接当图片显示；上传的 SVG 内联写入页面
    if (node.url.startsWith('data:')) {
      return (
        <img
          src={node.url}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute',
            left,
            top,
            width,
            height,
            transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
            transformOrigin: '50% 50%',
            objectFit: 'contain',
            opacity: node.opacity,
          }}
        />
      );
    }
    return (
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left,
          top,
          width,
          height,
          transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
          transformOrigin: '50% 50%',
          opacity: node.opacity,
        }}
        dangerouslySetInnerHTML={{ __html: SPLASH_SVG_MARKUP }}
      />
    );
  }

  return null;
}
