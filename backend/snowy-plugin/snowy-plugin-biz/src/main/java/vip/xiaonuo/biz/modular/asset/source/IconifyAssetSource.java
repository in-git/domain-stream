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

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Iconify 图标发现：只取图标集与搜索结果元数据，SVG 地址保留在远程
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Slf4j
@Component
public class IconifyAssetSource implements AssetSource {

    private static final String API = "https://api.iconify.design";
    private static final String UA = "domain-stream-asset/1.0";

    @Override
    public String source() {
        return BizAssetSourceEnum.ICONIFY.getValue();
    }

    @Override
    public List<AssetItem> fetch(JSONObject config) {
        Set<String> keys = new LinkedHashSet<>();
        List<AssetItem> items = new ArrayList<>();

        String prefixes = config.getStr("iconCollections", "mdi,lucide,ph,bi");
        int limit = config.getInt("iconLimitPerCollection", 60);
        for (String prefix : prefixes.split(",")) {
            String p = prefix.trim();
            if (p.isEmpty()) continue;
            try {
                JSONObject collection = getJson(API + "/collection?prefix=" + URLEncoder.encode(p, StandardCharsets.UTF_8));
                List<String> names = new ArrayList<>();
                addNames(names, collection.get("uncategorized"));
                addNames(names, collection.get("hidden"));
                JSONObject categories = collection.getJSONObject("categories");
                if (categories != null) {
                    for (String category : categories.keySet()) {
                        addNames(names, categories.get(category));
                    }
                }
                JSONObject aliases = collection.getJSONObject("aliases");
                if (aliases != null) {
                    names.addAll(aliases.keySet());
                }
                Object infoObj = getJson(API + "/collections?prefix=" + URLEncoder.encode(p, StandardCharsets.UTF_8)).get(p);
                JSONObject info = infoObj instanceof JSONObject json ? json : new JSONObject();

                int step = Math.max(1, names.size() / Math.max(limit, 1));
                int taken = 0;
                for (int i = 0; i < names.size() && taken < limit; i += step) {
                    AssetItem item = buildItem(p, names.get(i), info);
                    if (item != null && keys.add(item.getSourceKey())) {
                        items.add(item);
                        taken++;
                    }
                }
            } catch (Exception e) {
                log.warn("Iconify 图标集 {} 获取失败：{}", p, e.getMessage());
            }
        }

        String keywords = config.getStr("iconKeywords",
                "arrow,star,folder,user,download,cat,home,settings,search,heart,calendar,camera,cloud,lock,music,phone");
        for (String keyword : keywords.split(",")) {
            String k = keyword.trim();
            if (k.isEmpty()) continue;
            try {
                JSONObject data = getJson(API + "/search?query=" + URLEncoder.encode(k, StandardCharsets.UTF_8) + "&limit=32");
                JSONObject collections = data.getJSONObject("collections");
                JSONArray icons = data.getJSONArray("icons");
                if (icons == null) continue;
                for (int i = 0; i < icons.size(); i++) {
                    String full = icons.getStr(i);
                    if (full == null || !full.contains(":")) continue;
                    String[] parts = full.split(":", 2);
                    JSONObject meta = collections != null && collections.get(parts[0]) instanceof JSONObject json ? json : null;
                    AssetItem item = buildItem(parts[0], parts[1], meta == null ? new JSONObject() : meta);
                    if (item != null && keys.add(item.getSourceKey())) {
                        items.add(item);
                    }
                }
            } catch (Exception e) {
                log.warn("Iconify 关键词 {} 搜索失败：{}", k, e.getMessage());
            }
        }
        return items;
    }

    private void addNames(List<String> names, Object value) {
        if (value instanceof JSONArray array) {
            array.forEach(n -> names.add(String.valueOf(n)));
        } else if (value instanceof JSONObject object) {
            names.addAll(object.keySet());
        } else if (value instanceof String text && StrUtil.isNotBlank(text)) {
            names.add(text);
        }
    }

    private AssetItem buildItem(String prefix, String name, JSONObject meta) {
        if (name == null || name.isEmpty()) return null;
        String svgUrl = API + "/" + prefix + "/" + name + ".svg";
        AssetItem item = new AssetItem();
        item.setSource(source());
        item.setSourceKey("iconify:" + prefix + ":" + name);
        item.setType(BizAssetCategoryEnum.ICON.getValue());
        item.setTitle(prefix + " / " + name);
        item.setDescription((meta.getStr("name", prefix)) + " icon \"" + name + "\"");
        item.setTags(String.join(",", prefix, name, "icon", "svg"));
        item.setCategory(prefix);
        item.setLicense(meta.getJSONObject("license") == null ? "Apache 2.0" : meta.getJSONObject("license").getStr("title", "Apache 2.0"));
        item.setAuthor(meta.getJSONObject("author") == null ? "Iconify contributors" : meta.getJSONObject("author").getStr("name", "Iconify contributors"));
        item.setHomepage("https://icon-sets.iconify.design/");
        item.setPreviewUrl(svgUrl);
        item.setImageUrl(svgUrl);
        item.setSuffix("svg");
        return item;
    }

    private JSONObject getJson(String url) {
        HttpRequest request = HttpRequest.get(url).header("User-Agent", UA).timeout(10000);
        AssetHttpUtil.applyProxy(request);
        try (HttpResponse response = request.execute()) {
            if (!response.isOk()) {
                throw new IllegalStateException("HTTP " + response.getStatus());
            }
            return JSONUtil.parseObj(response.body());
        }
    }
}
