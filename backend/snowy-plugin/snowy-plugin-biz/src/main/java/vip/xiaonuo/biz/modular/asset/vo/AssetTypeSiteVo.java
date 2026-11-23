package vip.xiaonuo.biz.modular.asset.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * 类型与站点树
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Getter
@Setter
public class AssetTypeSiteVo {

    @Schema(description = "类型值")
    private String value;

    @Schema(description = "类型显示名")
    private String label;

    @Schema(description = "类型素材数量")
    private Integer assetCount;

    @Schema(description = "站点列表")
    private List<AssetSiteStatVo> sites;
}
