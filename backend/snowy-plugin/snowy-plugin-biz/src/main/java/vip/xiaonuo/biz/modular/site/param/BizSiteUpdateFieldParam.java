
package vip.xiaonuo.biz.modular.site.param;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import jakarta.validation.constraints.NotBlank;

/**
 * 网页数据单字段更新参数
 *
 * @author wuwenlong
 * @date  2026/08/08 16:42
 **/
@Getter
@Setter
public class BizSiteUpdateFieldParam {

    /** 主键ID */
    @Schema(description = "主键ID", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "id不能为空")
    private String id;

    /** 待更新的字段名，当前仅支持 visible（是否可见）、isRecommend（是否推荐） */
    @Schema(description = "待更新的字段名：visible|isRecommend", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "field不能为空")
    private String field;

    /** 字段新值，Y|N */
    @Schema(description = "字段新值：Y|N", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "value不能为空")
    private String value;
}
