package vip.xiaonuo.biz.modular.asset.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * 素材站点分类：站点下挂分类列表，数量均基于全表统计
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Getter
@Setter
public class BizAssetSourceCategoryVo {

    @Schema(description = "站点值，用于筛选")
    private String value;

    @Schema(description = "站点显示名，直接使用原始值")
    private String label;

    @Schema(description = "站点下素材数量")
    private Integer assetCount;

    @Schema(description = "站点下的分类列表")
    private List<BizAssetCategoryStatVo> categories;
}
