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
import java.math.BigDecimal;
import java.util.Date;

/**
 * 留言实体
 *
 * @author wuwenlong
 * @date  2026/11/19 11:32
 **/
@Getter
@Setter
@TableName("biz_message")
public class BizMessage {

    /** 主键 */
    @TableId
    @Schema(description = "主键")
    private String id;

    /** 父留言ID：顶级留言为空；访客回复指向被回复的留言或回复，单表递归 */
    @Schema(description = "父留言ID，顶级留言为空")
    private String parentId;

    /** 被回复者昵称，用于前台展示「回复 @xxx」 */
    @Schema(description = "被回复者昵称")
    private String replyToNickname;

    /** 留言用户ID */
    @Schema(description = "留言用户ID")
    private String userId;

    /** 留言人昵称：按 USER_ID 从用户服务回填，仅用于展示，不落库 */
    @Schema(description = "留言人昵称（派生展示字段）")
    @TableField(exist = false)
    private String nickname;

    /** 留言内容 */
    @Schema(description = "留言内容")
    private String content;

    /** 状态：PENDING待审核/APPROVED已通过/REJECTED已拒绝 */
    @Schema(description = "状态：PENDING待审核/APPROVED已通过/REJECTED已拒绝")
    private String status;

    /** 管理员回复内容 */
    @Schema(description = "管理员回复内容")
    private String reply;

    /** 回复时间 */
    @Schema(description = "回复时间")
    private Date replyTime;

    /** 回复人 */
    @Schema(description = "回复人")
    private String replyUser;

    /** 留言IP */
    @Schema(description = "留言IP")
    private String ip;

    /** 浏览器UA */
    @Schema(description = "浏览器UA")
    private String userAgent;

    /** 排序 */
    @Schema(description = "排序")
    private Integer sortCode;

    /** 备注 */
    @Schema(description = "备注")
    private String remark;

    /** 扩展信息 */
    @Schema(description = "扩展信息")
    private String extJson;

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
