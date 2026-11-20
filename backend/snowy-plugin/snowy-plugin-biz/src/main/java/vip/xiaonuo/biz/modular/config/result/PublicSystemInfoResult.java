package vip.xiaonuo.biz.modular.config.result;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;

/**
 * 公共系统基础信息（无需登录）
 *
 * @author domain-stream
 * @date 2026/11/20
 */
@Getter
@Setter
public class PublicSystemInfoResult {

    /** 站点名称，取系统配置 SNOWY_SYS_NAME */
    @Schema(description = "站点名称")
    private String siteName;

    /** 网页标题 / 开屏文本，取 CLIENT_CONFIG 中的 title */
    @Schema(description = "网页标题")
    private String title;

    /** 客户端配置全部属性（供后续扩展） */
    @Schema(description = "客户端配置属性")
    private Map<String, String> config;
}
