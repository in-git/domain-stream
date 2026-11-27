
package vip.xiaonuo.biz.modular.siteCategory.param;

import com.alibaba.excel.annotation.ExcelProperty;
import com.alibaba.excel.annotation.format.DateTimeFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.Date;

/**
 * 网页分类中间表编辑参数
 *
 * @author wuwenlong
 * @date  2026/08/08 16:44
 **/
@Getter
@Setter
public class BizSiteCategoryEditParam {

    /** SITE_ID */
    @ExcelProperty("SITE_ID")
    @Schema(description = "SITE_ID", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "siteId不能为空")
    private String siteId;

    /** CATEGORY_ID */
    @ExcelProperty("CATEGORY_ID")
    @Schema(description = "CATEGORY_ID")
    private String categoryId;

    /** ID */
    @ExcelProperty("ID")
    @Schema(description = "ID")
    private String id;

}
