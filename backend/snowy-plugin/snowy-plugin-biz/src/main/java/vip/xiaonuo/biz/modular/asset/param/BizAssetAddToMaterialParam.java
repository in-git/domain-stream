package vip.xiaonuo.biz.modular.asset.param;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * 加入素材中心参数
 *
 * @author domain-stream
 * @date 2026/11/28
 */
@Getter
@Setter
public class BizAssetAddToMaterialParam {

    @Schema(description = "素材资源id集合")
    private List<String> ids;

    @Schema(description = "素材分类编码（通用分类 MATERIAL 模块），为空时按资源类型使用默认分类")
    private String categoryCode;
}
