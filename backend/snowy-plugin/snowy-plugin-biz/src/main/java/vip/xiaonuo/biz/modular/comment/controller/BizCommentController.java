package vip.xiaonuo.biz.modular.comment.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vip.xiaonuo.biz.modular.comment.entity.BizComment;
import vip.xiaonuo.biz.modular.comment.param.BizCommentAuditParam;
import vip.xiaonuo.biz.modular.comment.param.BizCommentIdParam;
import vip.xiaonuo.biz.modular.comment.param.BizCommentPageParam;
import vip.xiaonuo.biz.modular.comment.service.BizCommentService;
import vip.xiaonuo.common.annotation.CommonLog;
import vip.xiaonuo.common.pojo.CommonResult;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

/**
 * 评论管理控制器
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Tag(name = "评论管理控制器")
@RestController
@RequestMapping("/biz/comment")
@Validated
public class BizCommentController {

    @Resource
    private BizCommentService bizCommentService;

    @Operation(summary = "获取评论分页")
    @SaCheckPermission("/biz/comment/page")
    @GetMapping("/page")
    public CommonResult<Page<BizComment>> page(BizCommentPageParam param) {
        return CommonResult.data(bizCommentService.page(param));
    }

    @Operation(summary = "获取评论详情")
    @SaCheckPermission("/biz/comment/detail")
    @GetMapping("/detail")
    public CommonResult<BizComment> detail(@Valid BizCommentIdParam param) {
        return CommonResult.data(bizCommentService.detail(param));
    }

    @Operation(summary = "审核评论")
    @CommonLog("审核评论")
    @SaCheckPermission("/biz/comment/audit")
    @PostMapping("/audit")
    public CommonResult<String> audit(@RequestBody @Valid BizCommentAuditParam param) {
        bizCommentService.audit(param);
        return CommonResult.ok();
    }

    @Operation(summary = "删除评论")
    @CommonLog("删除评论")
    @SaCheckPermission("/biz/comment/delete")
    @PostMapping("/delete")
    public CommonResult<String> delete(@RequestBody @Valid @NotEmpty(message = "集合不能为空")
                                       List<BizCommentIdParam> idParamList) {
        bizCommentService.delete(idParamList);
        return CommonResult.ok();
    }
}
