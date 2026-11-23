package vip.xiaonuo.biz.modular.asset.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * 素材类型分类树：类型 -> 站点 -> 分类
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Getter
@Setter
public class BizAssetTypeCategoryVo {

    @Schema(description = "类型值，用于筛选")
    private String value;

    @Schema(description = "类型显示名，直接使用原始值")
    private String label;

    @Schema(description = "类型下素材数量")
    private Integer assetCount;

    @Schema(description = "类型下的站点列表")
    private List<BizAssetSourceCategoryVo> sources;
}
