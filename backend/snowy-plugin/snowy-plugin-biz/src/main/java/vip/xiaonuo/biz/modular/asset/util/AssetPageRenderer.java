package vip.xiaonuo.biz.modular.asset.util;

import cn.hutool.core.util.StrUtil;
import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.ElementHandle;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.options.LoadState;
import com.microsoft.playwright.options.Proxy;
import com.microsoft.playwright.options.WaitUntilState;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * 无头浏览器渲染：用于采集 JS 动态渲染的网页（图片由接口返回、DOM 中只有占位图）。
 * 优先使用本机安装的 Edge / Chrome，缺失时回退 Playwright 自带 Chromium。
 *
 * @author domain-stream
 * @date 2026/11/28
 */
@Slf4j
public final class AssetPageRenderer {

    private static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) "
                    + "Chrome/131.0.0.0 Safari/537.36";

    private static final int NAV_TIMEOUT = 45000;
    private static final int IDLE_TIMEOUT = 8000;
    private static final int SCROLL_TIMES = 6;
    private static final int SCROLL_WAIT = 700;

    private AssetPageRenderer() {
    }

    /** 渲染结果：渲染后的 HTML、网络响应中的媒体地址、页面内链 */
    public record Rendered(String html, List<String> networkMediaUrls, List<String> links) {
    }

    /** 渲染页面；浏览器不可用或渲染失败时返回 null，由调用方回退静态解析 */
    public static Rendered render(String url) {
        Playwright playwright = null;
        Browser browser = null;
        try {
            playwright = Playwright.create();
            browser = launch(playwright);
            if (browser == null) {
                log.warn("素材采集无头浏览器不可用，回退静态解析：{}", url);
                return null;
            }

            BrowserContext context = browser.newContext(new Browser.NewContextOptions()
                    .setUserAgent(USER_AGENT)
                    .setViewportSize(1440, 900)
                    .setLocale("zh-CN"));
            Page page = context.newPage();

            Set<String> networkUrls = Collections.synchronizedSet(new LinkedHashSet<>());
            page.onResponse(response -> {
                String mediaUrl = response.url();
                if (response.status() >= 200 && response.status() < 400
                        && looksLikeMedia(mediaUrl, response.headerValue("content-type"))) {
                    networkUrls.add(mediaUrl);
                }
            });

            page.navigate(url, new Page.NavigateOptions()
                    .setWaitUntil(WaitUntilState.DOMCONTENTLOADED)
                    .setTimeout(NAV_TIMEOUT));
            try {
                page.waitForLoadState(LoadState.NETWORKIDLE,
                        new Page.WaitForLoadStateOptions().setTimeout(IDLE_TIMEOUT));
            } catch (Exception ignored) {
                // 长轮询页面永远到不了 networkidle，继续滚动触发懒加载即可
            }
            for (int i = 0; i < SCROLL_TIMES; i++) {
                page.evaluate("window.scrollTo(0, document.body ? document.body.scrollHeight : 0)");
                page.waitForTimeout(SCROLL_WAIT);
            }
            page.waitForTimeout(1000);

            String html = page.content();
            Set<String> links = new LinkedHashSet<>();
            for (ElementHandle anchor : page.querySelectorAll("a[href]")) {
                String href = anchor.getAttribute("href");
                if (StrUtil.isNotBlank(href)) {
                    links.add(href);
                }
            }
            return new Rendered(html, new ArrayList<>(networkUrls), new ArrayList<>(links));
        } catch (Exception e) {
            log.warn("素材采集页面渲染失败：{}，{}", url, e.getMessage());
            return null;
        } finally {
            if (browser != null) {
                try {
                    browser.close();
                } catch (Exception ignored) {
                    // 关闭失败不影响采集结果
                }
            }
            if (playwright != null) {
                try {
                    playwright.close();
                } catch (Exception ignored) {
                    // 关闭失败不影响采集结果
                }
            }
        }
    }

    /** 优先用本机 Edge / Chrome，最后才尝试 Playwright 自带 Chromium */
    private static Browser launch(Playwright playwright) {
        List<String> channels = new ArrayList<>();
        channels.add("msedge");
        channels.add("chrome");
        channels.add(null);
        for (String channel : channels) {
            try {
                BrowserType.LaunchOptions options = new BrowserType.LaunchOptions()
                        .setHeadless(true)
                        .setTimeout(30000);
                if (channel != null) {
                    options.setChannel(channel);
                }
                Proxy proxy = proxy();
                if (proxy != null) {
                    options.setProxy(proxy);
                }
                return playwright.chromium().launch(options);
            } catch (Exception e) {
                log.debug("无头浏览器启动失败（channel={}）：{}", channel, e.getMessage());
            }
        }
        return null;
    }

    /** 与静态请求共用 ASSET_HTTP_PROXY_HOST / ASSET_HTTP_PROXY_PORT 代理配置 */
    private static Proxy proxy() {
        String host = System.getenv("ASSET_HTTP_PROXY_HOST");
        String portText = System.getenv("ASSET_HTTP_PROXY_PORT");
        if (StrUtil.isBlank(host) || StrUtil.isBlank(portText)) {
            return null;
        }
        try {
            int port = Integer.parseInt(portText.trim());
            if (port > 0 && port <= 65535) {
                return new Proxy("http://" + host.trim() + ":" + port);
            }
        } catch (NumberFormatException ignored) {
            // 端口非法按直连处理
        }
        return null;
    }

    /** 通过响应头或后缀判断是否为媒体资源 */
    private static boolean looksLikeMedia(String url, String contentType) {
        if (StrUtil.isNotBlank(contentType)) {
            String type = contentType.toLowerCase(Locale.ROOT);
            if (type.startsWith("image/") || type.startsWith("video/")) {
                return true;
            }
        }
        String lower = url.toLowerCase(Locale.ROOT);
        return lower.matches(".*\\.(jpg|jpeg|png|webp|gif|bmp|svg|mp4|webm|mov|m4v)(\\?.*)?$");
    }
}
