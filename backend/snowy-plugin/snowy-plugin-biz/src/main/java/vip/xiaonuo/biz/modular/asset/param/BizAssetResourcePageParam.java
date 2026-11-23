package vip.xiaonuo.biz.modular.asset.param;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 远端素材分页筛选参数
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Getter
@Setter
public class BizAssetResourcePageParam {

    @Schema(description = "类型：ICON/WALLPAPER")
    private String type;

    @Schema(description = "站点：ICONIFY/BING/PICSUM")
    private String source;

    @Schema(description = "标签")
    private String tag;

    @Schema(description = "是否已加入素材中心：YES/NO")
    private String inMaterial;

    @Schema(description = "关键词")
    private String keyword;
}
