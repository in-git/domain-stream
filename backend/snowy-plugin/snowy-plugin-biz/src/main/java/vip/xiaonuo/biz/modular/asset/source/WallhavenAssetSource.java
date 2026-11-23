package vip.xiaonuo.biz.modular.asset.source;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import vip.xiaonuo.biz.modular.asset.enums.BizAssetCategoryEnum;
import vip.xiaonuo.biz.modular.asset.enums.BizAssetSourceEnum;
import vip.xiaonuo.biz.modular.asset.util.AssetConfigUtil;
import vip.xiaonuo.biz.modular.asset.util.AssetHttpUtil;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Wallhaven 壁纸采集：API key 可选（ASSET_WALLHAVEN_KEY），无 key 时使用匿名额度。
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Slf4j
@Component
public class WallhavenAssetSource implements AssetSource {

    private static final String API = "https://wallhaven.cc/api/v1/search";

    @Override
    public String source() {
        return BizAssetSourceEnum.WALLHAVEN.getValue();
    }

    @Override
    public List<AssetItem> fetch(JSONObject config) {
        List<AssetItem> items = new ArrayList<>();
        String query = AssetConfigUtil.get(config, "wallhaven.query", "nature landscape wallpaper");
        String key = AssetConfigUtil.get(config, "wallhaven.key", "");
        String categories = AssetConfigUtil.get(config, "wallhaven.categories", "111");
        String purity = AssetConfigUtil.get(config, "wallhaven.purity", "100");
        String sorting = AssetConfigUtil.get(config, "wallhaven.sorting", "toplist");
        int limit = AssetConfigUtil.getInt(config, "wallpaperLimit", 20);

        String url = API + "?q=" + URLEncoder.encode(query, StandardCharsets.UTF_8)
                + "&categories=" + URLEncoder.encode(categories, StandardCharsets.UTF_8)
                + "&purity=" + URLEncoder.encode(purity, StandardCharsets.UTF_8)
                + "&sorting=" + URLEncoder.encode(sorting, StandardCharsets.UTF_8)
                + "&page=1"
                + (StrUtil.isBlank(key) ? "" : "&apikey=" + URLEncoder.encode(key, StandardCharsets.UTF_8));

        try {
            JSONArray rows = AssetHttpUtil.getJson(url).getJSONArray("data");
            if (rows == null || rows.isEmpty()) return items;
            for (int i = 0; i < rows.size() && items.size() < limit; i++) {
                JSONObject row = rows.getJSONObject(i);
                String imageUrl = row.getStr("path");
                if (StrUtil.isBlank(imageUrl)) continue;
                String id = StrUtil.blankToDefault(row.getStr("id"), imageUrl);
                JSONObject thumbs = row.getJSONObject("thumbs");
                String previewUrl = imageUrl;
                if (thumbs != null) {
                    previewUrl = StrUtil.blankToDefault(thumbs.getStr("large"), thumbs.getStr("small"));
                    if (StrUtil.isBlank(previewUrl)) previewUrl = imageUrl;
                }

                AssetItem item = new AssetItem();
                item.setSource(source());
                item.setSourceKey("wallhaven:" + id);
                item.setType(BizAssetCategoryEnum.WALLPAPER.getValue());
                item.setTitle(StrUtil.blankToDefault(row.getStr("id"), "Wallhaven wallpaper"));
                item.setDescription("Wallhaven wallpaper " + StrUtil.blankToDefault(row.getStr("resolution"), ""));
                item.setTags(tagsOf(row.getJSONArray("tags")));
                item.setLicense("Wallhaven License");
                item.setAuthor("Wallhaven");
                item.setHomepage("https://wallhaven.cc/w/" + id);
                item.setPreviewUrl(previewUrl);
                item.setImageUrl(imageUrl);
                item.setSuffix(suffixOf(imageUrl));
                items.add(item);
            }
        } catch (Exception e) {
            log.warn("Wallhaven 获取失败：{}", e.getMessage());
        }
        return items;
    }

    private String tagsOf(JSONArray tags) {
        if (tags == null || tags.isEmpty()) return "wallhaven,wallpaper";
        List<String> names = new ArrayList<>();
        for (int i = 0; i < tags.size(); i++) {
            JSONObject tag = tags.getJSONObject(i);
            String name = tag == null ? "" : tag.getStr("name");
            if (StrUtil.isNotBlank(name)) names.add(name);
        }
        return names.isEmpty() ? "wallhaven,wallpaper" : String.join(",", names);
    }

    private String suffixOf(String imageUrl) {
        String path = imageUrl.contains("?") ? imageUrl.substring(0, imageUrl.indexOf('?')) : imageUrl;
        String lower = path.toLowerCase();
        if (lower.endsWith(".png")) return "png";
        if (lower.endsWith(".webp")) return "webp";
        if (lower.endsWith(".jpeg")) return "jpeg";
        return "jpg";
    }
}
