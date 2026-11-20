package vip.xiaonuo.biz.modular.config.result;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 页面配置属性结果
 *
 * @author domain-stream
 * @date 2026/11/20
 */
@Getter
@Setter
public class BizConfigItemResult {

    /** 属性名 */
    @Schema(description = "属性名")
    private String key;

    /** 属性值 */
    @Schema(description = "属性值")
    private String value;
}
