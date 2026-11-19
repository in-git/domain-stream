/*
 * Copyright [2022] [https://www.xiaonuo.vip]
 *
 * Snowy采用APACHE LICENSE 2.0开源协议，您在使用过程中，需要注意以下几点：
 *
 * 1.请不要删除和修改根目录下的LICENSE文件。
 * 2.请不要删除和修改Snowy源码头部的版权声明。
 * 3.本项目代码可免费商业使用，商业使用请保留源码和相关描述文件的项目出处，作者声明等。
 * 4.分发源码时候，请注明软件出处 https://www.xiaonuo.vip
 * 5.不可二次分发开源参与同类竞品，如有想法可联系团队xiaonuobase@qq.com商议合作。
 * 6.若您的项目无法满足以上几点，需要更多功能代码，获取Snowy商业授权许可，请在官网购买授权，地址为 https://www.xiaonuo.vip
 */
package vip.xiaonuo.biz.modular.visitor.param;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * 访客访问上报参数
 *
 * @author domain-stream
 * @date  2026/11/19
 **/
@Getter
@Setter
public class BizVisitorTrackParam {

    /** 访客唯一标识（前端生成并持久化，用于UV去重） */
    @Schema(description = "访客唯一标识", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "访客唯一标识不能为空")
    private String visitorId;

    /** 会话标识 */
    @Schema(description = "会话标识")
    private String sessionId;

    /** 事件类型：PV/HEARTBEAT/CONTENT_VIEW，默认 PV */
    @Schema(description = "事件类型")
    private String eventType;

    /** 页面类型：HOME/VIDEO/ARTICLE/GRAPHIC */
    @Schema(description = "页面类型")
    private String pageType;

    /** 内容ID */
    @Schema(description = "内容ID")
    private String contentId;

    /** 内容标题 */
    @Schema(description = "内容标题")
    private String contentTitle;

    /** 来源：DIRECT/SEARCH/SOCIAL/RSS */
    @Schema(description = "来源")
    private String source;

    /** 终端：MOBILE/DESKTOP/TABLET */
    @Schema(description = "终端")
    private String device;

    /** 停留时长（秒） */
    @Schema(description = "停留时长（秒）")
    private Integer durationSec;
}
