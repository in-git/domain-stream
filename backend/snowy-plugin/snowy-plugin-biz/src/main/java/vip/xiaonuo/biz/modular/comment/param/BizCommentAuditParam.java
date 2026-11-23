package vip.xiaonuo.biz.modular.comment.param;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * 评论审核参数
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Getter
@Setter
public class BizCommentAuditParam {

    @Schema(description = "评论ID集合", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotEmpty(message = "评论ID集合不能为空")
    private List<String> ids;

    @Schema(description = "审核状态：APPROVED/REJECTED", requiredMode = Schema.RequiredMode.REQUIRED)
    @NotBlank(message = "审核状态不能为空")
    private String status;
}
