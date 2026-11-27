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
import java.util.List;

/**
 * 分类公开访问VO(树形结构)
 *
 * @author wuwenlong
 * @date 2026/08/08
 **/
@Getter
@Setter
public class BizSiteCategoryPublicVo {

    /** 分类ID */
    @Schema(description = "分类ID")
    private String id;

    /** 父分类ID, 顶级为空 */
    @Schema(description = "父分类ID")
    private String parentId;

    /** 分类名称 */
    @Schema(description = "分类名称")
    private String name;

    /** 图标 */
    @Schema(description = "图标")
    private String icon;

    /** 排序 */
    @Schema(description = "排序")
    private Integer sort;

    /** 所属模块 */
    @Schema(description = "所属模块")
    private String module;

    /** 子分类集合 */
    @Schema(description = "子分类集合")
    private List<BizSiteCategoryPublicVo> children = new ArrayList<>();
}
