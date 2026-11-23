package vip.xiaonuo.biz.modular.asset.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 远端素材列表视图
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Getter
@Setter
public class BizAssetResourceVo {

    private String id;

    private String source;

    private String sourceKey;

    private String type;

    private String title;

    private String description;

    private String tags;

    private String license;

    private String author;

    private String homepage;

    private String inMaterial;

    private String materialFileId;

    private String createTime;

    /** 预览代理地址，由后端转发远程图片，不落地存储 */
    private String previewUrl;

    /** 原图代理地址 */
    private String imageUrl;

    /** 远程预览直链，代理失败时前端可回退直连 */
    private String remotePreviewUrl;

    /** 远程原图直链 */
    private String remoteImageUrl;
}
