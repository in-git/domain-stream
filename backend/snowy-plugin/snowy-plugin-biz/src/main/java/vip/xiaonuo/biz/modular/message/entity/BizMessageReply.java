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
package vip.xiaonuo.biz.modular.message.entity;

import com.baomidou.mybatisplus.annotation.*;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import java.util.Date;

/**
 * 留言回复实体
 *
 * 面向前台门户：任何登录访客都可以回复任意一条已通过的留言（包括自己发布的留言），
 * 回复默认即时展示，不占用 BIZ_MESSAGE.REPLY 的管理员回复字段。
 *
 * @author wuwenlong
 * @date  2026/11/19
 **/
@Getter
@Setter
@TableName("biz_message_reply")
public class BizMessageReply {

    /** 主键 */
    @TableId
    @Schema(description = "主键")
    private String id;

    /** 所属留言ID */
    @Schema(description = "所属留言ID")
    private String messageId;

    /** 被回复的回复ID（可空，表示直接回复留言） */
    @Schema(description = "被回复的回复ID")
    private String parentReplyId;

    /** 被回复者昵称，用于前台展示「回复 @xxx」 */
    @Schema(description = "被回复者昵称")
    private String replyToNickname;

    /** 回复人昵称 */
    @Schema(description = "回复人昵称")
    private String nickname;

    /** 回复人头像 */
    @Schema(description = "回复人头像")
    private String avatar;

    /** 回复人邮箱 */
    @Schema(description = "回复人邮箱")
    private String email;

    /** 回复内容 */
    @Schema(description = "回复内容")
    private String content;

    /** 删除标志：NOT_DELETE正常/DELETED删除 */
    @Schema(description = "删除标志：NOT_DELETE正常/DELETED删除")
    @TableLogic
    @TableField(fill = FieldFill.INSERT)
    private String deleteFlag;

    /** 创建时间 */
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
