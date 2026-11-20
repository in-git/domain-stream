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
package vip.xiaonuo.biz.modular.category.entity;

import com.baomidou.mybatisplus.annotation.*;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.Date;

/**
 * 通用分类（文章/视频/图文）实体
 *
 * @author wuwenlong
 * @date  2026/11/19 02:04
 **/
@Getter
@Setter
@TableName("biz_category")
public class BizCategory {

    /** 主键 */
    @TableId
    @Schema(description = "主键")
    private String id;

    /** 父级ID，顶级为0 */
    @Schema(description = "父级ID，顶级为0")
    private String parentId;

    /** 分类名称 */
    @Schema(description = "分类名称")
    private String name;

    /** 分类编码，业务表CATEGORY字段关联此编码 */
    @Schema(description = "分类编码，业务表CATEGORY字段关联此编码")
    private String code;

    /** 分类图片 */
    @Schema(description = "分类图片")
    private String image;

    /** 分类图标 */
    @Schema(description = "分类图标")
    private String icon;

    /** 适用模块：ARTICLE文章/VIDEO视频/GRAPHIC图文/IMAGE图片/MATERIAL素材/COMMON通用 */
    @Schema(description = "适用模块：ARTICLE文章/VIDEO视频/GRAPHIC图文/IMAGE图片/MATERIAL素材/COMMON通用")
    private String module;

    /** 分类描述 */
    @Schema(description = "分类描述")
    private String description;

    /** 状态：ENABLE启用/DISABLE禁用 */
    @Schema(description = "状态：ENABLE启用/DISABLE禁用")
    private String status;

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
