package vip.xiaonuo.biz.modular.config.param;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * 保存页面配置参数（整体覆盖）
 *
 * @author domain-stream
 * @date 2026/11/20
 */
@Getter
@Setter
public class BizConfigSaveParam {

    /** 属性列表；属性名不可为空，属性值允许为空（用于清空配置） */
    @Schema(description = "属性列表", requiredMode = Schema.RequiredMode.REQUIRED)
    private List<BizConfigSaveItem> items;

    /** 单个属性 */
    @Getter
    @Setter
    public static class BizConfigSaveItem {

        /** 属性名 */
        @Schema(description = "属性名", requiredMode = Schema.RequiredMode.REQUIRED)
        private String key;

        /** 属性值，允许为空字符串 */
        @Schema(description = "属性值")
        private String value;
    }
}
