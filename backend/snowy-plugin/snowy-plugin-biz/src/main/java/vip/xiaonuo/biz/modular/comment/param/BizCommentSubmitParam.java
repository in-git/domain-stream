package vip.xiaonuo.biz.modular.comment.param;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * 前台评论提交参数
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Getter
@Setter
public class BizCommentSubmitParam {

    @Schema(description = "内容类型：ARTICLE/VIDEO/IMAGE_TEXT", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "内容类型不能为空")
    private String targetType;

    @Schema(description = "内容ID", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "内容ID不能为空")
    private String targetId;

    @Schema(description = "父评论ID，顶级评论为空")
    private String parentId;

    @Schema(description = "被回复用户昵称")
    private String replyToNickname;

    @Schema(description = "评论内容", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "评论内容不能为空")
    private String content;
}
