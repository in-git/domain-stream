package vip.xiaonuo.biz.modular.config.param;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

/**
 * 新增页面配置属性参数
 *
 * @author domain-stream
 * @date 2026/11/20
 */
@Getter
@Setter
public class BizConfigAddParam {

    /** 属性名（JSON 中的 key） */
    @Schema(description = "属性名", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotEmpty(message = "属性名不能为空")
    private String key;

    /** 属性值 */
    @Schema(description = "属性值", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotEmpty(message = "属性值不能为空")
    private String value;
}
