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
package vip.xiaonuo.biz.modular.video.param;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.Date;

/**
 * 视频添加参数
 *
 * @author wuwenlong
 * @date  2026/11/19 02:03
 **/
@Getter
@Setter
public class BizVideoAddParam {

    /** 标题 */
    @Schema(description = "标题")
    private String title;

    /** 封面图 */
    @Schema(description = "封面图")
    private String cover;

    /** 视频地址 */
    @Schema(description = "视频地址")
    private String videoUrl;

    /** 时长 */
    @Schema(description = "时长")
    private String duration;

    /** 简介 */
    @Schema(description = "简介")
    private String summary;

    /** 分类编码，关联 BIZ_CATEGORY.CODE */
    @Schema(description = "分类编码，关联 BIZ_CATEGORY.CODE")
    private String category;

    /** 标签，多个以逗号分隔 */
    @Schema(description = "标签，多个以逗号分隔")
    private String tags;

    /** 状态：DRAFT草稿/PUBLISHED已发布/OFFLINE已下架 */
    @Schema(description = "状态：DRAFT草稿/PUBLISHED已发布/OFFLINE已下架")
    private String status;

    /** 发布时间 */
    @Schema(description = "发布时间")
    private Date publishTime;

    /** 播放量 */
    @Schema(description = "播放量")
    private Integer viewCount;

    /** 点赞量 */
    @Schema(description = "点赞量")
    private Integer likeCount;

    /** 评论量 */
    @Schema(description = "评论量")
    private Integer commentCount;

    /** 是否置顶：Y是/N否 */
    @Schema(description = "是否置顶：Y是/N否")
    private String isTop;

    /** 是否推荐：Y是/N否 */
    @Schema(description = "是否推荐：Y是/N否")
    private String isRecommend;

    /** 排序 */
    @Schema(description = "排序")
    private Integer sortCode;

    /** 备注 */
    @Schema(description = "备注")
    private String remark;

    /** 扩展信息 */
    @Schema(description = "扩展信息")
    private String extJson;

}
