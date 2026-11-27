package vip.xiaonuo.biz.modular.asset.param;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 按网址采集素材参数
 *
 * @author domain-stream
 * @date 2026/11/27
 */
@Getter
@Setter
public class BizAssetCollectUrlParam {

    @Schema(description = "资源网址（http/https）", requiredMode = Schema.RequiredMode.REQUIRED)
    private String url;

    @Schema(description = "资源类型：IMAGE图片/VIDEO视频/SVG矢量图/ICON图标", requiredMode = Schema.RequiredMode.REQUIRED)
    private String type;

    @Schema(description = "自定义名称，为空则从网址推断")
    private String name;

    @Schema(description = "网页采集时最多采集的资源数，默认20，最大50；深度搜索时忽略此限制")
    private Integer limit;

    @Schema(description = "是否深度搜索整站内链，默认false")
    private Boolean deepSearch;
}
