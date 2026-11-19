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
package vip.xiaonuo.biz.modular.visitor.entity;

import com.baomidou.mybatisplus.annotation.*;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.Date;

/**
 * 访客访问事件实体
 *
 * @author domain-stream
 * @date  2026/11/19
 **/
@Getter
@Setter
@TableName("biz_visitor_event")
public class BizVisitorEvent {

    /** 主键 */
    @TableId
    @Schema(description = "主键")
    private String id;

    /** 访客唯一标识（用于UV去重） */
    @Schema(description = "访客唯一标识")
    private String visitorId;

    /** 会话标识（用于在线人数去重） */
    @Schema(description = "会话标识")
    private String sessionId;

    /** 事件类型：PV/HEARTBEAT/CONTENT_VIEW */
    @Schema(description = "事件类型")
    private String eventType;

    /** 页面类型：HOME/VIDEO/ARTICLE/GRAPHIC */
    @Schema(description = "页面类型")
    private String pageType;

    /** 内容ID */
    @Schema(description = "内容ID")
    private String contentId;

    /** 内容标题快照 */
    @Schema(description = "内容标题快照")
    private String contentTitle;

    /** 来源：DIRECT/SEARCH/SOCIAL/RSS */
    @Schema(description = "来源")
    private String source;

    /** 终端：MOBILE/DESKTOP/TABLET */
    @Schema(description = "终端")
    private String device;

    /** IP */
    @Schema(description = "IP")
    private String ip;

    /** 浏览器UA */
    @Schema(description = "浏览器UA")
    private String userAgent;

    /** 停留时长（秒） */
    @Schema(description = "停留时长（秒）")
    private Integer durationSec;

    /** 备注 */
    @Schema(description = "备注")
    private String remark;

    /** 扩展信息 */
    @Schema(description = "扩展信息")
    private String extJson;

    /** 删除标志 */
    @Schema(description = "删除标志")
    @TableLogic
    @TableField(fill = FieldFill.INSERT)
    private String deleteFlag;

    /** 创建时间（访问发生时间） */
    @Schema(description = "创建时间")
    @TableField(fill = FieldFill.INSERT)
    private Date createTime;

    /** 创建用户 */
    @Schema(description = "创建用户")
    @TableField(fill = FieldFill.INSERT)
    private String createUser;

    /** 更新时间 */
    @Schema(description = "更新时间")
    @TableField(fill = FieldFill.UPDATE)
    private Date updateTime;

    /** 更新用户 */
    @Schema(description = "更新用户")
    @TableField(fill = FieldFill.UPDATE)
    private String updateUser;
}
