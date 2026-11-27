
package vip.xiaonuo.biz.modular.siteCategory.param;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import jakarta.validation.constraints.NotBlank;

/**
 * 网页分类中间表Id参数
 *
 * @author wuwenlong
 * @date  2026/08/08 16:44
 **/
@Getter
@Setter
public class BizSiteCategoryIdParam {

    /** SITE_ID */
    @Schema(description = "SITE_ID", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "siteId不能为空")
    private String siteId;
}
