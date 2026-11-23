package vip.xiaonuo.biz.modular.comment.param;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/**
 * 评论 ID 参数
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Getter
@Setter
public class BizCommentIdParam {

    @Schema(description = "主键", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "id不能为空")
    private String id;
}
