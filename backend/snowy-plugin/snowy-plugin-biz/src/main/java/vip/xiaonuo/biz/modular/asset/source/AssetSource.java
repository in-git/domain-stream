package vip.xiaonuo.biz.modular.asset.source;

import cn.hutool.json.JSONObject;

import java.util.List;

/**
 * 远端素材来源适配器，只发现不下载
 *
 * @author domain-stream
 * @date 2026/11/23
 */
public interface AssetSource {

    String source();

    List<AssetItem> fetch(JSONObject config);
}
