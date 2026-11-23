package vip.xiaonuo.biz.modular.asset.source;

import cn.hutool.core.util.StrUtil;
import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import vip.xiaonuo.biz.modular.asset.enums.BizAssetCategoryEnum;
import vip.xiaonuo.biz.modular.asset.enums.BizAssetSourceEnum;
import vip.xiaonuo.biz.modular.asset.util.AssetHttpUtil;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Bing 每日壁纸发现（官方 JSON Feed，无需 key）
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Slf4j
@Component
public class BingWallpaperAssetSource implements AssetSource {

    private static final String API = "https://www.bing.com/HPImageArchive.aspx";
    private static final String UA = "domain-stream-asset/1.0";

    @Override
    public String source() {
        return BizAssetSourceEnum.BING.getValue();
    }

    @Override
    public List<AssetItem> fetch(JSONObject config) {
        List<AssetItem> items = new ArrayList<>();
        int days = config.getInt("bingDays", 7);
        int wallpaperLimit = config.getInt("wallpaperLimit", 20);
        String marketsText = config.getStr("bingMarkets", "zh-CN,en-US,en-GB,ja-JP,de-DE,fr-FR");
        List<String> markets = Arrays.stream(marketsText.split(","))
                .map(String::trim).filter(StrUtil::isNotBlank).toList();
        if (markets.isEmpty()) {
            markets = List.of("en-US");
        }
        int perMarket = Math.max(1, (int) Math.ceil((double) wallpaperLimit / markets.size()));
        Set<String> seen = new HashSet<>();

        for (String market : markets) {
            int marketCount = 0;
            for (int idx = 0; idx < days && items.size() < wallpaperLimit && marketCount < perMarket; idx++) {
                String url = API + "?format=js&idx=" + idx + "&n=8&mkt=" + market;
                HttpRequest request = HttpRequest.get(url).header("User-Agent", UA).timeout(10000);
                AssetHttpUtil.applyProxy(request);
                try (HttpResponse response = request.execute()) {
                    if (!response.isOk()) {
                        throw new IllegalStateException("HTTP " + response.getStatus());
                    }
                    JSONArray images = JSONUtil.parseObj(response.body()).getJSONArray("images");
                    if (images == null) continue;
                    for (int i = 0; i < images.size() && items.size() < wallpaperLimit && marketCount < perMarket; i++) {
                        JSONObject image = images.getJSONObject(i);
                        String urlBase = image.getStr("urlbase");
                        if (urlBase == null || urlBase.isEmpty() || !seen.add(urlBase)) continue;
                        String base = "https://www.bing.com" + urlBase;
                        String title = image.getStr("copyright", "Bing daily wallpaper " + image.getStr("startdate")).trim();

                        AssetItem item = new AssetItem();
                        item.setSource(source());
                        item.setSourceKey("bing:" + urlBase);
                        item.setType(BizAssetCategoryEnum.WALLPAPER.getValue());
                        item.setTitle(title);
                        item.setDescription("Bing daily wallpaper [" + market + "] for " + image.getStr("startdate"));
                        item.setTags(String.join(",", "bing", "daily", "wallpaper", market));
                        item.setCategory(market);
                        item.setLicense("Bing Wallpaper (free for personal use)");
                        item.setAuthor(title);
                        item.setHomepage(base);
                        item.setPreviewUrl(base + "_400x240.jpg");
                        item.setImageUrl(base + "_1920x1080.jpg");
                        item.setSuffix("jpg");
                        items.add(item);
                        marketCount++;
                    }
                } catch (Exception e) {
                    log.warn("Bing 壁纸 market={} idx={} 获取失败：{}", market, idx, e.getMessage());
                }
            }
        }
        return items;
    }
}
