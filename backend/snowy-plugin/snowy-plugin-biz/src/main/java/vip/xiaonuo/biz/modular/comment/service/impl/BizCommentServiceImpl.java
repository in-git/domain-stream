package vip.xiaonuo.biz.modular.comment.service.impl;

import cn.hutool.core.collection.CollStreamUtil;
import cn.hutool.core.collection.CollectionUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vip.xiaonuo.auth.api.SaBaseLoginUserApi;
import vip.xiaonuo.auth.core.pojo.SaBaseClientLoginUser;
import vip.xiaonuo.auth.core.util.StpClientUtil;
import vip.xiaonuo.biz.modular.article.entity.BizArticle;
import vip.xiaonuo.biz.modular.article.mapper.BizArticleMapper;
import vip.xiaonuo.biz.modular.comment.entity.BizComment;
import vip.xiaonuo.biz.modular.comment.mapper.BizCommentMapper;
import vip.xiaonuo.biz.modular.comment.param.BizCommentAuditParam;
import vip.xiaonuo.biz.modular.comment.param.BizCommentIdParam;
import vip.xiaonuo.biz.modular.comment.param.BizCommentPageParam;
import vip.xiaonuo.biz.modular.comment.param.BizCommentSubmitParam;
import vip.xiaonuo.biz.modular.comment.service.BizCommentService;
import vip.xiaonuo.biz.modular.graphic.entity.BizGraphic;
import vip.xiaonuo.biz.modular.graphic.mapper.BizGraphicMapper;
import vip.xiaonuo.biz.modular.video.entity.BizVideo;
import vip.xiaonuo.biz.modular.video.mapper.BizVideoMapper;
import vip.xiaonuo.common.exception.CommonException;
import vip.xiaonuo.common.page.CommonPageRequest;
import vip.xiaonuo.common.util.CommonIpAddressUtil;
import vip.xiaonuo.dev.api.DevConfigApi;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 评论服务实现：按 targetType + targetId 绑定内容，path 物化路径支持无限回复。
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Slf4j
@Service
public class BizCommentServiceImpl extends ServiceImpl<BizCommentMapper, BizComment> implements BizCommentService {

    private static final String TYPE_ARTICLE = "ARTICLE";
    private static final String TYPE_VIDEO = "VIDEO";
    private static final String TYPE_IMAGE_TEXT = "IMAGE_TEXT";
    private static final String STATUS_APPROVED = "APPROVED";
    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_REJECTED = "REJECTED";
    private static final String PUBLISHED = "PUBLISHED";
    private static final String CLIENT_CONFIG_KEY = "CLIENT_CONFIG";
    private static final String ALLOW_COMMENT_KEY = "allowComment";

    @Resource
    private DevConfigApi devConfigApi;

    @Resource(name = "clientLoginUserApi")
    private SaBaseLoginUserApi clientLoginUserApi;

    @Resource
    private BizArticleMapper bizArticleMapper;

    @Resource
    private BizVideoMapper bizVideoMapper;

    @Resource
    private BizGraphicMapper bizGraphicMapper;

    @Override
    public Page<BizComment> page(BizCommentPageParam param) {
        LambdaQueryWrapper<BizComment> query = new LambdaQueryWrapper<>();
        if (StrUtil.isNotBlank(param.getTargetType())) query.eq(BizComment::getTargetType, param.getTargetType());
        if (StrUtil.isNotBlank(param.getTargetId())) query.eq(BizComment::getTargetId, param.getTargetId());
        if (StrUtil.isNotBlank(param.getStatus())) query.eq(BizComment::getStatus, param.getStatus());
        if (StrUtil.isNotBlank(param.getSearchKey())) {
            String keyword = param.getSearchKey().trim();
            query.and(wrapper -> wrapper.like(BizComment::getContent, keyword)
                    .or().like(BizComment::getUserId, keyword));
        }
        query.orderByDesc(BizComment::getCreateTime).orderByAsc(BizComment::getId);
        Page<BizComment> page = this.page(CommonPageRequest.defaultPage(), query);
        fillDisplayFields(page.getRecords());
        return page;
    }

    @Override
    public BizComment detail(BizCommentIdParam param) {
        BizComment comment = this.getById(param.getId());
        if (comment == null) throw new CommonException("评论不存在，id值为：" + param.getId());
        fillDisplayFields(List.of(comment));
        return comment;
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void audit(BizCommentAuditParam param) {
        String status = param.getStatus().trim().toUpperCase();
        if (!STATUS_APPROVED.equals(status) && !STATUS_REJECTED.equals(status)) {
            throw new CommonException("审核状态不正确");
        }
        List<BizComment> comments = this.listByIds(param.getIds());
        if (comments.isEmpty()) return;
        for (BizComment comment : comments) {
            String oldStatus = comment.getStatus();
            if (status.equals(oldStatus)) continue;
            comment.setStatus(status);
            if (STATUS_APPROVED.equals(oldStatus) && !STATUS_APPROVED.equals(status)) {
                changeCommentCount(comment.getTargetType(), comment.getTargetId(), -1);
            } else if (!STATUS_APPROVED.equals(oldStatus) && STATUS_APPROVED.equals(status)) {
                changeCommentCount(comment.getTargetType(), comment.getTargetId(), 1);
            }
        }
        this.updateBatchById(comments);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void delete(List<BizCommentIdParam> idParamList) {
        Set<String> ids = collectSubtreeIds(CollStreamUtil.toList(idParamList, BizCommentIdParam::getId));
        if (ids.isEmpty()) return;
        List<BizComment> comments = this.listByIds(ids);
        for (BizComment comment : comments) {
            if (STATUS_APPROVED.equals(comment.getStatus())) {
                changeCommentCount(comment.getTargetType(), comment.getTargetId(), -1);
            }
        }
        this.removeByIds(ids);
    }

    @Override
    public List<BizComment> publicList(String targetType, String targetId) {
        validateTarget(targetType, targetId, true);
        LambdaQueryWrapper<BizComment> query = new LambdaQueryWrapper<>();
        query.eq(BizComment::getTargetType, targetType.trim().toUpperCase())
                .eq(BizComment::getTargetId, targetId.trim())
                .eq(BizComment::getStatus, STATUS_APPROVED)
                .orderByAsc(BizComment::getCreateTime)
                .orderByAsc(BizComment::getId);
        List<BizComment> comments = this.list(query);
        fillDisplayFields(comments);
        return comments;
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public String publicAdd(BizCommentSubmitParam param, HttpServletRequest request) {
        if (!commentAllowed()) throw new CommonException("系统已关闭评论功能");
        Object loginId = StpClientUtil.getLoginIdDefaultNull();
        if (loginId == null) throw new CommonException("请先登录后再评论");

        String targetType = param.getTargetType().trim().toUpperCase();
        String targetId = param.getTargetId().trim();
        String content = param.getContent().trim();
        if (content.isEmpty()) throw new CommonException("评论内容不能为空");
        if (content.length() > 500) throw new CommonException("评论内容不能超过500字");
        validateTarget(targetType, targetId, true);

        BizComment comment = new BizComment();
        comment.setTargetType(targetType);
        comment.setTargetId(targetId);
        comment.setUserId(StrUtil.maxLength(String.valueOf(loginId), 20));
        comment.setContent(content);
        comment.setStatus(auditEnabled() ? STATUS_PENDING : STATUS_APPROVED);
        comment.setIsOfficial("NO");
        comment.setLikeCount(0);
        comment.setIp(CommonIpAddressUtil.getIp(request));
        comment.setUserAgent(StrUtil.maxLength(request.getHeader("User-Agent"), 500));

        String parentId = StrUtil.blankToDefault(param.getParentId(), "").trim();
        if (StrUtil.isNotBlank(parentId)) {
            BizComment parent = this.getById(parentId);
            if (parent == null || !targetType.equals(parent.getTargetType()) || !targetId.equals(parent.getTargetId())) {
                throw new CommonException("回复对象不存在");
            }
            if (!STATUS_APPROVED.equals(parent.getStatus())) throw new CommonException("回复对象不可见");
            comment.setParentId(parent.getId());
            comment.setRootId(parent.getRootId());
            comment.setReplyToUserId(parent.getUserId());
            String replyTo = StrUtil.isBlank(param.getReplyToNickname())
                    ? displayNameOf(clientLoginUserApi.getClientUserById(parent.getUserId()))
                    : param.getReplyToNickname();
            comment.setReplyToNickname(StrUtil.maxLength(StrUtil.blankToDefault(replyTo, ""), 100));
        }

        this.save(comment);

        String selfPath = "/" + comment.getId() + "/";
        comment.setRootId(StrUtil.isBlank(comment.getRootId()) ? comment.getId() : comment.getRootId());
        comment.setPath((StrUtil.blankToDefault(parentIdStr(param), "")) + selfPath);
        this.updateById(comment);

        if (STATUS_APPROVED.equals(comment.getStatus())) {
            changeCommentCount(targetType, targetId, 1);
        }
        return comment.getId();
    }

    /** 父级 path 需要从数据库重新取，避免只传 parentId 时的时序问题 */
    private String parentIdStr(BizCommentSubmitParam param) {
        if (StrUtil.isBlank(param.getParentId())) return "";
        BizComment parent = this.getById(param.getParentId().trim());
        return parent == null ? "" : StrUtil.blankToDefault(parent.getPath(), "");
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void publicDelete(String id) {
        Object loginId = StpClientUtil.getLoginIdDefaultNull();
        if (loginId == null) throw new CommonException("请先登录后再删除评论");
        BizComment comment = this.getById(id);
        if (comment == null) throw new CommonException("评论不存在");
        if (!String.valueOf(loginId).equals(comment.getUserId())) throw new CommonException("只能删除自己的评论");
        Set<String> ids = collectSubtreeIds(List.of(id));
        List<BizComment> comments = this.listByIds(ids);
        for (BizComment item : comments) {
            if (STATUS_APPROVED.equals(item.getStatus())) {
                changeCommentCount(item.getTargetType(), item.getTargetId(), -1);
            }
        }
        this.removeByIds(ids);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void deleteByTarget(String targetType, List<String> targetIds) {
        if (CollectionUtil.isEmpty(targetIds)) return;
        LambdaQueryWrapper<BizComment> query = new LambdaQueryWrapper<>();
        query.eq(BizComment::getTargetType, normalizeType(targetType))
                .in(BizComment::getTargetId, targetIds);
        this.remove(query);
    }

    /** 收集待删除评论及其全部子孙 */
    private Set<String> collectSubtreeIds(List<String> rootIds) {
        Set<String> ids = new LinkedHashSet<>();
        if (CollectionUtil.isEmpty(rootIds)) return ids;
        for (String rootId : rootIds) {
            if (StrUtil.isBlank(rootId)) continue;
            BizComment root = this.getById(rootId.trim());
            if (root == null) continue;
            ids.add(root.getId());
            if (StrUtil.isBlank(root.getPath())) continue;
            LambdaQueryWrapper<BizComment> query = new LambdaQueryWrapper<>();
            query.likeRight(BizComment::getPath, root.getPath());
            for (BizComment child : this.list(query)) ids.add(child.getId());
        }
        return ids;
    }

    /** 校验内容类型、内容存在并且已发布 */
    private void validateTarget(String targetType, String targetId, boolean requirePublished) {
        String type = normalizeType(targetType);
        if (StrUtil.isBlank(targetId)) throw new CommonException("内容ID不能为空");
        if (TYPE_ARTICLE.equals(type)) {
            BizArticle article = bizArticleMapper.selectById(targetId);
            if (article == null || (requirePublished && !PUBLISHED.equals(article.getStatus()))) throw new CommonException("目标内容不存在或未发布");
        } else if (TYPE_VIDEO.equals(type)) {
            BizVideo video = bizVideoMapper.selectById(targetId);
            if (video == null || (requirePublished && !PUBLISHED.equals(video.getStatus()))) throw new CommonException("目标内容不存在或未发布");
        } else if (TYPE_IMAGE_TEXT.equals(type)) {
            BizGraphic graphic = bizGraphicMapper.selectById(targetId);
            if (graphic == null || (requirePublished && !PUBLISHED.equals(graphic.getStatus()))) throw new CommonException("目标内容不存在或未发布");
        } else {
            throw new CommonException("内容类型不正确");
        }
    }

    private String normalizeType(String targetType) {
        if (StrUtil.isBlank(targetType)) throw new CommonException("内容类型不能为空");
        return targetType.trim().toUpperCase();
    }

    /** CLIENT_CONFIG.allowComment 为 NO/FALSE/0 时禁止发表评论；缺失时默认允许 */
    private boolean commentAllowed() {
        try {
            String raw = devConfigApi.getValueByKey(CLIENT_CONFIG_KEY);
            if (StrUtil.isBlank(raw)) return true;
            JSONObject config = JSONUtil.parseObj(raw);
            Object value = config.get(ALLOW_COMMENT_KEY);
            if (value == null) return true;
            String text = String.valueOf(value).trim().toUpperCase();
            return !"NO".equals(text) && !"FALSE".equals(text) && !"0".equals(text);
        } catch (Exception e) {
            log.warn("读取评论开关配置失败，按允许处理：{}", e.getMessage());
            return true;
        }
    }

    /** COMMENT_AUDIT_ENABLED=true 时开启先审后发，默认发表即显示 */
    private boolean auditEnabled() {
        return Boolean.parseBoolean(StrUtil.blankToDefault(System.getenv("COMMENT_AUDIT_ENABLED"), "false"));
    }

    /** 原子维护内容表 COMMENT_COUNT */
    private void changeCommentCount(String targetType, String targetId, int delta) {
        if (delta == 0 || StrUtil.isBlank(targetId)) return;
        int rows;
        if (TYPE_VIDEO.equals(targetType)) {
            LambdaUpdateWrapper<BizVideo> wrapper = new LambdaUpdateWrapper<>();
            wrapper.eq(BizVideo::getId, targetId)
                    .setSql("COMMENT_COUNT = GREATEST(IFNULL(COMMENT_COUNT, 0) + " + delta + ", 0)");
            rows = bizVideoMapper.update(null, wrapper);
        } else if (TYPE_ARTICLE.equals(targetType)) {
            LambdaUpdateWrapper<BizArticle> wrapper = new LambdaUpdateWrapper<>();
            wrapper.eq(BizArticle::getId, targetId)
                    .setSql("COMMENT_COUNT = GREATEST(IFNULL(COMMENT_COUNT, 0) + " + delta + ", 0)");
            rows = bizArticleMapper.update(null, wrapper);
        } else {
            LambdaUpdateWrapper<BizGraphic> wrapper = new LambdaUpdateWrapper<>();
            wrapper.eq(BizGraphic::getId, targetId)
                    .setSql("COMMENT_COUNT = GREATEST(IFNULL(COMMENT_COUNT, 0) + " + delta + ", 0)");
            rows = bizGraphicMapper.update(null, wrapper);
        }
        if (rows == 0) log.warn("更新评论数失败：type={}, targetId={}", targetType, targetId);
    }

    /** 回填评论人昵称和内容标题 */
    private void fillDisplayFields(List<BizComment> comments) {
        if (CollectionUtil.isEmpty(comments)) return;
        Set<String> userIds = new HashSet<>();
        Map<String, String> titleByKey = new HashMap<>();
        for (BizComment comment : comments) {
            if (StrUtil.isNotBlank(comment.getUserId())) userIds.add(comment.getUserId());
            String key = comment.getTargetType() + ":" + comment.getTargetId();
            if (!titleByKey.containsKey(key)) titleByKey.put(key, titleOf(comment.getTargetType(), comment.getTargetId()));
        }
        Map<String, String> nicknameByUserId = new HashMap<>();
        userIds.forEach(userId -> nicknameByUserId.put(userId,
                displayNameOf(clientLoginUserApi.getClientUserById(userId))));
        for (BizComment comment : comments) {
            comment.setNickname(nicknameByUserId.get(comment.getUserId()));
            comment.setTargetTitle(titleByKey.get(comment.getTargetType() + ":" + comment.getTargetId()));
        }
    }

    private String titleOf(String targetType, String targetId) {
        if (StrUtil.isBlank(targetId)) return "";
        if (TYPE_ARTICLE.equals(targetType)) {
            BizArticle article = bizArticleMapper.selectById(targetId);
            return article == null ? "" : article.getTitle();
        }
        if (TYPE_VIDEO.equals(targetType)) {
            BizVideo video = bizVideoMapper.selectById(targetId);
            return video == null ? "" : video.getTitle();
        }
        if (TYPE_IMAGE_TEXT.equals(targetType)) {
            BizGraphic graphic = bizGraphicMapper.selectById(targetId);
            return graphic == null ? "" : graphic.getTitle();
        }
        return "";
    }

    private String displayNameOf(SaBaseClientLoginUser user) {
        if (user == null) return null;
        // 对外只展示昵称，绝不回退到姓名、账号或邮箱，避免暴露账户信息
        return StrUtil.isBlank(user.getNickname()) ? null : user.getNickname();
    }
}
