package vip.xiaonuo.biz.modular.asset.source;

import lombok.Getter;
import lombok.Setter;

/**
 * 采集器返回的素材描述，只有元数据与远程地址
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Getter
@Setter
public class AssetItem {

    private String source;

    private String sourceKey;

    private String type;

    private String title;

    private String description;

    private String tags;

    private String category;

    private String license;

    private String author;

    private String homepage;

    private String previewUrl;

    private String imageUrl;

    private String suffix;
}
