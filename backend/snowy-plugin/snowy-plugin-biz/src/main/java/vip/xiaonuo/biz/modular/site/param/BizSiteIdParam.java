
package vip.xiaonuo.biz.modular.site.param;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import jakarta.validation.constraints.NotBlank;

/**
 * 网页数据Id参数
 *
 * @author wuwenlong
 * @date  2026/08/08 16:42
 **/
@Getter
@Setter
public class BizSiteIdParam {

    /** 主键ID */
    @Schema(description = "主键ID", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "id不能为空")
    private String id;
}
