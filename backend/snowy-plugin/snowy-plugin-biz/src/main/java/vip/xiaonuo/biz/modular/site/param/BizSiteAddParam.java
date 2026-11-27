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
package vip.xiaonuo.biz.modular.site.param;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

/**
 * 网页数据添加参数
 *
 * @author wuwenlong
 * @date  2026/08/08 16:42
 **/
@Getter
@Setter
public class BizSiteAddParam {

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

    /** 是否推荐(Y|N) */
    @Schema(description = "是否推荐(Y|N)")
    private String isRecommend;

    /** 封面 */
    @Schema(description = "封面")
    private String cover;

    /** 排序号 */
    @Schema(description = "排序号")
    private Integer orderNum;

    /** 关联分类ID列表 */
    @Schema(description = "关联分类ID列表")
    private List<String> categoryIds;

    /** 终端类型(PC|MOBILE|COMPATIBLE) */
    @Schema(description = "终端类型(PC|MOBILE|COMPATIBLE)")
    @NotBlank(message = "终端类型不能为空")
    private String device;

    /** 信号值(1-5) */
    @Schema(description = "信号值(1-5)", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull(message = "信号值不能为空")
    @Min(value = 1, message = "信号值范围为 1-5")
    @Max(value = 5, message = "信号值范围为 1-5")
    private Integer signal;

}
