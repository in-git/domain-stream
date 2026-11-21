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
package vip.xiaonuo.biz.modular.userlike.param;

import com.alibaba.excel.annotation.ExcelProperty;
import com.alibaba.excel.annotation.format.DateTimeFormat;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.Date;

/**
 * 用户喜欢/点赞记录编辑参数
 *
 * @author wuwenlong
 * @date  2026/11/21 19:55
 **/
@Getter
@Setter
public class BizUserLikeEditParam {

    /** 主键 */
    @ExcelProperty("主键")
    @Schema(description = "主键", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "id不能为空")
    private String id;

    /** 点赞用户ID，关联 CLIENT_USER.ID */
    @ExcelProperty("点赞用户ID，关联 CLIENT_USER.ID")
    @Schema(description = "点赞用户ID，关联 CLIENT_USER.ID")
    private String userId;

    /** 目标内容ID */
    @ExcelProperty("目标内容ID")
    @Schema(description = "目标内容ID")
    private String targetId;

    /** 目标类型：IMAGE_TEXT-图文，ARTICLE-文章，VIDEO-视频 */
    @ExcelProperty("目标类型：IMAGE_TEXT-图文，ARTICLE-文章，VIDEO-视频")
    @Schema(description = "目标类型：IMAGE_TEXT-图文，ARTICLE-文章，VIDEO-视频")
    private String targetType;

    /** 喜欢状态：LIKED-已喜欢，UNLIKED-已取消 */
    @ExcelProperty("喜欢状态：LIKED-已喜欢，UNLIKED-已取消")
    @Schema(description = "喜欢状态：LIKED-已喜欢，UNLIKED-已取消")
    private String status;

    /** 首次喜欢时间 */
    @DateTimeFormat("yyyy-MM-dd HH:mm:ss")
    @ExcelProperty("首次喜欢时间")
    @Schema(description = "首次喜欢时间")
    private Date likeTime;

    /** 备注 */
    @ExcelProperty("备注")
    @Schema(description = "备注")
    private String remark;

}
