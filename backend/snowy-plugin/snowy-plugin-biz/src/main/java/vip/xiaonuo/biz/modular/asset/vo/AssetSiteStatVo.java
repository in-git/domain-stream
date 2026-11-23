package vip.xiaonuo.biz.modular.asset.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 站点统计
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Getter
@Setter
public class AssetSiteStatVo {

    @Schema(description = "站点值")
    private String value;

    @Schema(description = "站点显示名")
    private String label;

    @Schema(description = "站点素材数量")
    private Integer assetCount;
}
