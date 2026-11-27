
package vip.xiaonuo.biz.modular.siteCategory.param;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.Date;

/**
 * 网页分类中间表添加参数
 *
 * @author wuwenlong
 * @date  2026/08/08 16:44
 **/
@Getter
@Setter
public class BizSiteCategoryAddParam {

    /** 网页ID */
    @Schema(description = "网页ID")
    private String siteId;

    /** CATEGORY_ID */
    @Schema(description = "CATEGORY_ID")
    private String categoryId;

    /** ID */
    @Schema(description = "ID")
    private String id;

}
