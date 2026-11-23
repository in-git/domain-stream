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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Lorem Picsum 图片发现（开放列表 API，无需 key）
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Slf4j
@Component
public class PicsumAssetSource implements AssetSource {

    private static final String API = "https://picsum.photos/v2/list";
    private static final String UA = "domain-stream-asset/1.0";

    @Override
    public String source() {
        return BizAssetSourceEnum.PICSUM.getValue();
    }

    @Override
    public List<AssetItem> fetch(JSONObject config) {
        List<AssetItem> items = new ArrayList<>();
        int pages = config.getInt("picsumPages", 12);
        int wallpaperLimit = config.getInt("wallpaperLimit", 20);
        int perAuthor = config.getInt("picsumPerAuthor", 2);
        Map<String, Integer> authorCount = new HashMap<>();
        for (int page = 1; page <= pages && items.size() < wallpaperLimit; page++) {
            String url = API + "?page=" + page + "&limit=30";
            HttpRequest request = HttpRequest.get(url).header("User-Agent", UA).timeout(10000);
            AssetHttpUtil.applyProxy(request);
            try (HttpResponse response = request.execute()) {
                if (!response.isOk()) {
                    throw new IllegalStateException("HTTP " + response.getStatus());
                }
                JSONArray rows = JSONUtil.parseArray(response.body());
                for (int i = 0; i < rows.size() && items.size() < wallpaperLimit; i++) {
                    cn.hutool.json.JSONObject row = rows.getJSONObject(i);
                    String id = row.getStr("id");
                    if (id == null) continue;
                    int width = row.getInt("width", 1920);
                    int height = row.getInt("height", 1080);
                    String author = row.getStr("author", "");
                    String category = StrUtil.isNotBlank(author) ? author : "unknown";
                    int used = authorCount.getOrDefault(category, 0);
                    if (used >= perAuthor) {
                        continue;
                    }
                    authorCount.put(category, used + 1);

                    AssetItem item = new AssetItem();
                    item.setSource(source());
                    item.setSourceKey("picsum:" + id);
                    item.setType(BizAssetCategoryEnum.WALLPAPER.getValue());
                    item.setTitle("Photo #" + id + " by " + author);
                    item.setDescription("Photograph by " + author + " (" + width + "x" + height + ")");
                    item.setTags(String.join(",", "picsum", "photo", "wallpaper", category));
                    item.setCategory(category);
                    item.setLicense("Lorem Picsum");
                    item.setAuthor(author);
                    item.setHomepage(row.getStr("url", ""));
                    item.setPreviewUrl("https://picsum.photos/id/" + id + "/400/250");
                    item.setImageUrl("https://picsum.photos/id/" + id + "/" + width + "/" + height);
                    item.setSuffix("jpg");
                    items.add(item);
                }
            } catch (Exception e) {
                log.warn("Picsum 第 {} 页获取失败：{}", page, e.getMessage());
            }
        }
        return items;
    }
}
