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
package vip.xiaonuo.biz.modular.userfavorite.entity;

import com.baomidou.mybatisplus.annotation.*;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.Date;

/**
 * 用户收藏实体
 *
 * @author wuwenlong
 * @date  2026/11/19 20:53
 **/
@Getter
@Setter
@TableName("biz_user_favorite")
public class BizUserFavorite {

    /** 主键 */
    @TableId
    @Schema(description = "主键")
    private String id;

    /** 收藏人ID */
    @Schema(description = "收藏人ID")
    private String userId;

    /** 收藏目标ID */
    @Schema(description = "收藏目标ID")
    private String targetId;

    /** 收藏类型（IMAGE_TEXT-图文，ARTICLE-文章，VIDEO-视频） */
    @Schema(description = "收藏类型（IMAGE_TEXT-图文，ARTICLE-文章，VIDEO-视频）")
    private String targetType;

    /** 标题 */
    @Schema(description = "标题")
    private String title;

    /** 封面图 */
    @Schema(description = "封面图")
    private String cover;

    /** 摘要 */
    @Schema(description = "摘要")
    private String digest;

    /** 作者/来源 */
    @Schema(description = "作者/来源")
    private String author;

    /** 原始链接 */
    @Schema(description = "原始链接")
    private String sourceUrl;

    /** 收藏时间 */
    @Schema(description = "收藏时间")
    private Date favoriteTime;

    /** 排序码 */
    @Schema(description = "排序码")
    private Integer sortCode;

    /** 状态（ENABLE-正常，DISABLED-停用） */
    @Schema(description = "状态（ENABLE-正常，DISABLED-停用）")
    private String status;

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

    /** 创建时间 */
    @Schema(description = "创建时间")
    @TableField(fill = FieldFill.INSERT)
    private Date createTime;

    /** 创建用户 */
    @Schema(description = "创建用户")
    @TableField(fill = FieldFill.INSERT)
    private String createUser;

    /** 修改时间 */
    @Schema(description = "修改时间")
    @TableField(fill = FieldFill.UPDATE)
    private Date updateTime;

    /** 修改用户 */
    @Schema(description = "修改用户")
    @TableField(fill = FieldFill.UPDATE)
    private String updateUser;
}
