package vip.xiaonuo.biz.modular.asset.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 素材分类统计：value 与 label 均使用原始分类值
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Getter
@Setter
public class BizAssetCategoryStatVo {

    @Schema(description = "分类值，用于筛选")
    private String value;

    @Schema(description = "分类显示名，直接使用原始值")
    private String label;

    @Schema(description = "分类下素材数量")
    private Integer assetCount;
}
