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
import java.util.Map;

/**
 * Icons8 图标采集：支持 key，也可匿名访问但官方会提示警告
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Slf4j
@Component
public class Icons8AssetSource implements AssetSource {

    private static final String API = "https://search.icons8.com/api/iconsets/v5/search";

    @Override
    public String source() {
        return BizAssetSourceEnum.ICONS8.getValue();
    }

    @Override
    public List<AssetItem> fetch(JSONObject config) {
        List<AssetItem> items = new ArrayList<>();
        String key = AssetConfigUtil.get(config, "icons8.key", null);
        String query = AssetConfigUtil.get(config, "icons8.query", "home,folder,user,search,settings");
        int limit = AssetConfigUtil.getInt(config, "iconLimitPerCollection", 20);
        String platform = AssetConfigUtil.get(config, "icons8.platform", "color");

        for (String term : query.split(",")) {
            String word = term.trim();
            if (word.isEmpty()) continue;
            String url = API + "?term=" + URLEncoder.encode(word, StandardCharsets.UTF_8)
                    + "&amount=" + limit
                    + "&platform=" + URLEncoder.encode(platform, StandardCharsets.UTF_8);
            try {
                Map<String, String> headers = StrUtil.isBlank(key) ? null : Map.of("Api-Key", key);
                JSONArray icons = AssetHttpUtil.getJson(url, headers).getJSONArray("icons");
                if (icons == null) continue;
                for (int i = 0; i < icons.size(); i++) {
                    JSONObject row = icons.getJSONObject(i);
                    String previewUrl = row.getStr("previewUrl");
                    if (StrUtil.isBlank(previewUrl)) {
                        String commonName = row.getStr("commonName");
                        if (StrUtil.isNotBlank(commonName)) {
                            previewUrl = "https://img.icons8.com/" + platform + "/96/" + commonName + ".png";
                        }
                    }
                    if (StrUtil.isBlank(previewUrl)) continue;
                    AssetItem item = new AssetItem();
                    item.setSource(source());
                    item.setSourceKey("icons8:" + row.getStr("id", previewUrl));
                    item.setType(BizAssetCategoryEnum.ICON.getValue());
                    item.setTitle(row.getStr("name", "Icons8 icon"));
                    item.setDescription(row.getStr("category", ""));
                    item.setTags(String.join(",", word, row.getStr("platform", "icons8")));
                    item.setLicense("Icons8 License");
                    item.setAuthor(row.getStr("authorApiCode", "Icons8"));
                    item.setHomepage("https://icons8.com/icons");
                    item.setPreviewUrl(previewUrl);
                    item.setImageUrl(previewUrl);
                    item.setSuffix("png");
                    items.add(item);
                }
            } catch (Exception e) {
                log.warn("Icons8 关键词 {} 获取失败：{}", word, e.getMessage());
            }
        }
        return items;
    }
}
