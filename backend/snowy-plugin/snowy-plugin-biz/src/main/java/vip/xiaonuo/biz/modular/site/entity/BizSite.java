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
package vip.xiaonuo.biz.modular.site.entity;

import com.baomidou.mybatisplus.annotation.*;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.Date;
import java.util.List;

/**
 * 网页数据实体
 *
 * @author wuwenlong
 * @date  2026/08/08 16:42
 **/
@Getter
@Setter
@TableName("BIZ_SITE")
public class BizSite {

    /** 主键ID */
    @TableId
    @Schema(description = "主键ID")
    private String id;

    /** 网页名称 */
    @Schema(description = "网页名称")
    private String name;

    /** LOGO */
    @Schema(description = "LOGO")
    private String logo;

    /** 描述 */
    @Schema(description = "描述")
    private String des;

    /** 链接 */
    @Schema(description = "链接")
    private String link;

    /** 点击量 */
    @Schema(description = "点击量")
    private Integer count;

    /** 是否可见(Y|N) */
    @Schema(description = "是否可见(Y|N)")
    private String visible;

    /** 背景颜色 */
    @Schema(description = "背景颜色")
    private String background;

    /** 删除标志 */
    @Schema(description = "删除标志")
    @TableLogic
    @TableField(fill = FieldFill.INSERT)
    private String deleteFlag;

    /** 是否推荐(Y|N) */
    @Schema(description = "是否推荐(Y|N)")
    private String isRecommend;

    /** 排序号 */
    @Schema(description = "排序号")
    private Integer orderNum;

    /** 创建时间 */
    @Schema(description = "创建时间")
    @TableField(fill = FieldFill.INSERT)
    private Date createTime;

    /** 更新时间 */
    @Schema(description = "更新时间")
    @TableField(fill = FieldFill.UPDATE)
    private Date updateTime;

    /** 创建的用户 */
    @Schema(description = "创建的用户")
    @TableField(fill = FieldFill.INSERT)
    private String createUser;

    /**
     * 关联分类ID列表
     * <p>
     * 该字段不存在于数据库表中, 仅用于接口返回时携带网页关联的分类,
     * 使用 exist = false 告知 MyBatis-Plus 不要拼进 SQL。
     */
    @TableField(exist = false)
    @Schema(description = "关联分类ID列表")
    private List<String> categoryIds;

    private String cover;

    /** 终端类型(PC|MOBILE|COMPATIBLE) */
    @Schema(description = "终端类型(PC|MOBILE|COMPATIBLE)")
    private String device;

    /** 信号值(1-5) */
    @Schema(description = "信号值(1-5)")
    @TableField("`SIGNAL`")
    private Integer signal;

}
