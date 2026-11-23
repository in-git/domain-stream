package vip.xiaonuo.biz.modular.asset.util;

import cn.hutool.core.util.StrUtil;
import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;

import java.net.InetSocketAddress;
import java.net.Proxy;
import java.util.Map;

/**
 * 素材平台 HTTP JSON 请求工具
 *
 * @author domain-stream
 * @date 2026/11/23
 */
public class AssetHttpUtil {

    private AssetHttpUtil() {
    }

    public static JSONObject getJson(String url) {
        return getJson(url, null);
    }

    public static JSONObject getJson(String url, Map<String, String> headers) {
        HttpRequest request = HttpRequest.get(url)
                .header("User-Agent", "domain-stream-asset/1.0")
                .header("Accept", "application/json, text/plain, */*")
                .setFollowRedirects(true)
                .timeout(10000);
        applyProxy(request);
        if (headers != null) {
            headers.forEach(request::header);
        }
        try (HttpResponse response = request.execute()) {
            if (!response.isOk()) {
                throw new IllegalStateException("HTTP " + response.getStatus());
            }
            return JSONUtil.parseObj(response.body());
        }
    }

    /**
     * 可选 HTTP 代理：部署环境无法直连部分国外平台时，
     * 配置 ASSET_HTTP_PROXY_HOST / ASSET_HTTP_PROXY_PORT 后统一走代理。
     */
    public static void applyProxy(HttpRequest request) {
        String host = System.getenv("ASSET_HTTP_PROXY_HOST");
        String portText = System.getenv("ASSET_HTTP_PROXY_PORT");
        if (StrUtil.isBlank(host) || StrUtil.isBlank(portText)) return;
        try {
            int port = Integer.parseInt(portText.trim());
            if (port > 0 && port <= 65535) {
                request.setProxy(new Proxy(Proxy.Type.HTTP, new InetSocketAddress(host.trim(), port)));
            }
        } catch (NumberFormatException ignored) {
            // 代理端口非法时按直连处理
        }
    }
}
