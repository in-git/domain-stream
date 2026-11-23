package vip.xiaonuo.biz.modular.comment.param;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 评论分页参数
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Getter
@Setter
public class BizCommentPageParam {

    @Schema(description = "当前页码")
    private Integer current;

    @Schema(description = "每页条数")
    private Integer size;

    @Schema(description = "内容类型：ARTICLE/VIDEO/IMAGE_TEXT")
    private String targetType;

    @Schema(description = "内容ID")
    private String targetId;

    @Schema(description = "状态")
    private String status;

    @Schema(description = "关键词")
    private String searchKey;
}
