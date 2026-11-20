/**
 * 访客在线追踪（WebSocket）
 * ------------------------------------------------------------------
 * 仅上报关键事件（进入板块 PV / 内容浏览 CONTENT_VIEW），心跳走 WebSocket，
 * 不产生 HTTP 请求、不写数据库。在线会话由后端在内存中维护。
 */

const HEARTBEAT_INTERVAL_MS = 60_000;
const RECONNECT_DELAY_MS = 5_000;

type PageType = 'HOME' | 'VIDEO' | 'ARTICLE' | 'GRAPHIC' | 'MESSAGE' | 'PROFILE';

interface VisitorIdentity {
  visitorId: string;
  sessionId: string;
  device: string;
  source: string;
}

let socket: WebSocket | null = null;
let heartbeatTimer: number | null = null;
let reconnectTimer: number | null = null;
let started = false;

function randomId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function detectDevice(): string {
  const ua = navigator.userAgent || '';
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ? 'MOBILE' : 'DESKTOP';
}

function detectSource(): string {
  try {
    const ref = document.referrer;
    if (!ref) return 'DIRECT';
    if (/baidu|google|bing|sogou|so\.com|360/i.test(ref)) return 'SEARCH';
    if (/weibo|weixin|qq\.com|twitter|facebook|douyin|xiaohongshu/i.test(ref)) return 'SOCIAL';
    return 'DIRECT';
  } catch {
    return 'DIRECT';
  }
}

function getIdentity(): VisitorIdentity {
  let visitorId = '';
  let sessionId = '';
  try {
    visitorId = localStorage.getItem('VISITOR_ID') || '';
    if (!visitorId) {
      visitorId = randomId('v');
      localStorage.setItem('VISITOR_ID', visitorId);
    }
    sessionId = sessionStorage.getItem('SESSION_ID') || '';
    if (!sessionId) {
      sessionId = randomId('s');
      sessionStorage.setItem('SESSION_ID', sessionId);
    }
  } catch {
    visitorId = visitorId || randomId('v');
    sessionId = sessionId || randomId('s');
  }
  return { visitorId, sessionId, device: detectDevice(), source: detectSource() };
}

function send(payload: Record<string, unknown>): void {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

function startHeartbeat(): void {
  stopHeartbeat();
  heartbeatTimer = window.setInterval(() => send({ type: 'HEARTBEAT' }), HEARTBEAT_INTERVAL_MS);
}

function stopHeartbeat(): void {
  if (heartbeatTimer !== null) {
    window.clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

function scheduleReconnect(): void {
  if (!started || reconnectTimer !== null) return;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, RECONNECT_DELAY_MS);
}

function connect(): void {
  const identity = getIdentity();
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const query = new URLSearchParams({
    visitorId: identity.visitorId,
    sessionId: identity.sessionId,
    device: identity.device,
    source: identity.source,
  });
  const url = `${protocol}://${window.location.host}/ws/biz/visitor/ws?${query.toString()}`;
  try {
    const ws = new WebSocket(url);
    socket = ws;
    ws.onopen = () => {
      startHeartbeat();
      send({ type: 'HEARTBEAT' });
    };
    ws.onclose = () => {
      stopHeartbeat();
      if (socket === ws) socket = null;
      scheduleReconnect();
    };
    ws.onerror = () => {
      // onclose 会负责重连
    };
  } catch {
    scheduleReconnect();
  }
}

/** 启动访客追踪：建立 WebSocket 连接并维持心跳。页面卸载时自动关闭。 */
export function startVisitorTracking(): () => void {
  if (started) return () => stopVisitorTracking();
  started = true;
  connect();
  window.addEventListener('beforeunload', handleUnload);
  return () => stopVisitorTracking();
}

function handleUnload(): void {
  stopVisitorTracking();
}

/** 停止访客追踪（关闭连接、清理定时器）。 */
export function stopVisitorTracking(): void {
  started = false;
  stopHeartbeat();
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (socket) {
    const closing = socket;
    socket = null;
    closing.onclose = null;
    closing.close();
  }
  window.removeEventListener('beforeunload', handleUnload);
}

/** 上报一次页面浏览（进入某个板块时调用，低频）。 */
export function trackPageView(pageType: PageType): void {
  send({ type: 'PV', pageType });
}

/** 上报一次内容浏览（打开内容详情时调用）。 */
export function trackContentView(pageType: PageType, contentId: string, contentTitle?: string): void {
  send({ type: 'CONTENT_VIEW', pageType, contentId, contentTitle });
}
