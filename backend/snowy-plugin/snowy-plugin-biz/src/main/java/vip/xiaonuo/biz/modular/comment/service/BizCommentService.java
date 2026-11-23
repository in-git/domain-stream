package vip.xiaonuo.biz.modular.comment.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import jakarta.servlet.http.HttpServletRequest;
import vip.xiaonuo.biz.modular.comment.entity.BizComment;
import vip.xiaonuo.biz.modular.comment.param.BizCommentAuditParam;
import vip.xiaonuo.biz.modular.comment.param.BizCommentIdParam;
import vip.xiaonuo.biz.modular.comment.param.BizCommentPageParam;
import vip.xiaonuo.biz.modular.comment.param.BizCommentSubmitParam;

import java.util.List;

/**
 * 评论服务接口
 *
 * @author domain-stream
 * @date 2026/11/23
 */
public interface BizCommentService extends IService<BizComment> {

    Page<BizComment> page(BizCommentPageParam param);

    BizComment detail(BizCommentIdParam param);

    void audit(BizCommentAuditParam param);

    void delete(List<BizCommentIdParam> idParamList);

    List<BizComment> publicList(String targetType, String targetId);

    String publicAdd(BizCommentSubmitParam param, HttpServletRequest request);

    void publicDelete(String id);

    void deleteByTarget(String targetType, List<String> targetIds);
}
