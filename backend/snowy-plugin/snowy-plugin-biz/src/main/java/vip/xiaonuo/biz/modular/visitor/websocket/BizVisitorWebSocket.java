package vip.xiaonuo.biz.modular.visitor.websocket;

import cn.hutool.core.util.StrUtil;
import cn.hutool.extra.spring.SpringUtil;
import cn.hutool.http.HttpUtil;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import jakarta.websocket.CloseReason;
import jakarta.websocket.OnClose;
import jakarta.websocket.OnError;
import jakarta.websocket.OnMessage;
import jakarta.websocket.OnOpen;
import jakarta.websocket.Session;
import jakarta.websocket.server.ServerEndpoint;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import vip.xiaonuo.biz.modular.visitor.param.BizVisitorTrackParam;
import vip.xiaonuo.biz.modular.visitor.service.BizVisitorService;

import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 访客在线会话WebSocket
 * <p>
 * 仅维护在线会话（内存），心跳不再写数据库；只有 PV / CONTENT_VIEW 事件落库。
 *
 * @author domain-stream
 * @date 2026/11/20
 */
@Component
@Slf4j
@ServerEndpoint("/biz/visitor/ws")
public class BizVisitorWebSocket {

    /** 超过该时长（毫秒）无心跳的会话视为离线 */
    private static final long ONLINE_TIMEOUT_MS = 5 * 60 * 1000L;

    /** ws sessionId -> 连接会话，用于关闭/清理 */
    private static final ConcurrentHashMap<String, Session> SESSION_POOL = new ConcurrentHashMap<>();

    /** ws sessionId -> 访客信息（含最后活跃时间） */
    private static final ConcurrentHashMap<String, VisitorSession> VISITOR_POOL = new ConcurrentHashMap<>();

    @OnOpen
    public void onOpen(Session session) {
        try {
            String query = session.getQueryString();
            Map<String, String> params = HttpUtil.decodeParamMap(StrUtil.blankToDefault(query, ""), StandardCharsets.UTF_8);
            String visitorId = params.get("visitorId");
            if (StrUtil.isBlank(visitorId)) {
                session.close();
                return;
            }
            VisitorSession info = new VisitorSession();
            info.visitorId = visitorId;
            info.sessionId = StrUtil.blankToDefault(params.get("sessionId"), visitorId);
            info.device = StrUtil.blankToDefault(params.get("device"), "DESKTOP");
            info.source = StrUtil.blankToDefault(params.get("source"), "DIRECT");
            info.lastActive = System.currentTimeMillis();
            SESSION_POOL.put(session.getId(), session);
            VISITOR_POOL.put(session.getId(), info);
        } catch (Exception e) {
            log.error("VisitorWebSocket onOpen error", e);
        }
    }

    @OnMessage
    public void onMessage(String message, Session session) {
        VisitorSession info = VISITOR_POOL.get(session.getId());
        if (info == null) {
            return;
        }
        // 任意消息都视为一次活跃心跳
        info.lastActive = System.currentTimeMillis();
        try {
            JSONObject json = JSONUtil.parseObj(message);
            String type = json.getStr("type");
            // 只把关键事件写入数据库：页面浏览 / 内容浏览
            if ("PV".equals(type) || "CONTENT_VIEW".equals(type)) {
                BizVisitorTrackParam param = new BizVisitorTrackParam();
                param.setVisitorId(info.visitorId);
                param.setSessionId(info.sessionId);
                param.setEventType(type);
                param.setPageType(json.getStr("pageType"));
                param.setContentId(json.getStr("contentId"));
                param.setContentTitle(json.getStr("contentTitle"));
                param.setSource(info.source);
                param.setDevice(info.device);
                param.setDurationSec(json.getInt("durationSec"));
                SpringUtil.getBean(BizVisitorService.class).track(param, "", "");
            }
        } catch (Exception e) {
            log.warn("VisitorWebSocket onMessage error: {}", message, e);
        }
    }

    @OnClose
    public void onClose(Session session) {
        SESSION_POOL.remove(session.getId());
        VISITOR_POOL.remove(session.getId());
    }

    @OnError
    public void onError(Session session, Throwable error) {
        onClose(session);
    }

    /** 当前在线会话数（按 sessionId 去重），惰性清理超时会话 */
    public static int onlineCount() {
        long now = System.currentTimeMillis();
        VISITOR_POOL.entrySet().removeIf((entry) -> {
            Session session = SESSION_POOL.get(entry.getKey());
            boolean expired = now - entry.getValue().lastActive > ONLINE_TIMEOUT_MS;
            if (expired || session == null || !session.isOpen()) {
                SESSION_POOL.remove(entry.getKey());
                return true;
            }
            return false;
        });
        Set<String> sessions = new HashSet<>();
        VISITOR_POOL.values().forEach((info) -> sessions.add(info.sessionId));
        return sessions.size();
    }

    /** 应用关闭时释放连接 */
    public static void closeAll() {
        SESSION_POOL.values().forEach((session) -> {
            try {
                if (session.isOpen()) {
                    session.close(new CloseReason(CloseReason.CloseCodes.GOING_AWAY, "服务器关闭"));
                }
            } catch (Exception ignored) {
                // ignore
            }
        });
        SESSION_POOL.clear();
        VISITOR_POOL.clear();
    }

    private static class VisitorSession {
        private String visitorId;
        private String sessionId;
        private String device;
        private String source;
        private long lastActive;
    }
}
