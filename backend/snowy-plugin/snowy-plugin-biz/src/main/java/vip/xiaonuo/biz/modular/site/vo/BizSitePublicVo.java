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
package vip.xiaonuo.biz.modular.site.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * 网页数据公开访问VO
 * <p>
 * 对外输出统一为驼峰字段, 且把数据库中的 Y|N 字符串转换为布尔值,
 * 前端无需再关心 'Y'/'N' 这种存储细节。
 *
 * @author wuwenlong
 * @date 2026/08/08
 **/
@Getter
@Setter
public class BizSitePublicVo {

    /** 主键ID */
    @Schema(description = "主键ID")
    private String id;

    /** 网页名称 */
    @Schema(description = "网页名称")
    private String name;

    /** LOGO */
    @Schema(description = "LOGO")
    private String logo;

    /** 封面图 */
    @Schema(description = "封面图")
    private String cover;

    /** 描述 */
    @Schema(description = "描述")
    private String des;

    /** 链接 */
    @Schema(description = "链接")
    private String link;

    /** 点击量 */
    @Schema(description = "点击量")
    private Integer count;

    /** 是否推荐, 由 IS_RECOMMEND 的 Y|N 转换而来 */
    @Schema(description = "是否推荐")
    private Boolean recommend;

    /** 背景颜色 */
    @Schema(description = "背景颜色")
    private String background;

    /** 排序号, 数值越低越靠前 */
    @Schema(description = "排序号")
    private Integer orderNum;

    /** 终端类型(PC|MOBILE|COMPATIBLE) */
    @Schema(description = "终端类型(PC|MOBILE|COMPATIBLE)")
    private String device;

    /** 信号值(1-5) */
    @Schema(description = "信号值(1-5)")
    private Integer signal;

    /** 创建时间 */
    @Schema(description = "创建时间")
    private Date createTime;

    /** 所属分类集合, 来源于中间表 BIZ_SITE_CATEGORY */
    @Schema(description = "所属分类集合")
    private List<BizSiteCategoryPublicVo> categoryList = new ArrayList<>();
}
