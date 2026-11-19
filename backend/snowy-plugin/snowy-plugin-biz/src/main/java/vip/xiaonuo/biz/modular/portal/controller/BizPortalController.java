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
package vip.xiaonuo.biz.modular.portal.controller;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import vip.xiaonuo.biz.modular.article.entity.BizArticle;
import vip.xiaonuo.biz.modular.article.mapper.BizArticleMapper;
import vip.xiaonuo.biz.modular.category.entity.BizCategory;
import vip.xiaonuo.biz.modular.category.mapper.BizCategoryMapper;
import vip.xiaonuo.biz.modular.graphic.entity.BizGraphic;
import vip.xiaonuo.biz.modular.graphic.mapper.BizGraphicMapper;
import vip.xiaonuo.biz.modular.message.entity.BizMessage;
import vip.xiaonuo.biz.modular.message.mapper.BizMessageMapper;
import vip.xiaonuo.biz.modular.message.param.BizMessageAddParam;
import vip.xiaonuo.biz.modular.video.entity.BizVideo;
import vip.xiaonuo.biz.modular.video.mapper.BizVideoMapper;
import vip.xiaonuo.common.pojo.CommonResult;

import java.util.List;

/**
 * 前台门户接口控制器
 *
 * 面向未登录访客，提供「已发布」内容的只读列表、留言提交，以及访客之间的留言回复。
 * 所有接口已在 GlobalConfigure.NO_LOGIN_PATH_ARR 中放行，禁止在此暴露管理接口。
 *
 * @author wuwenlong
 * @date  2026/11/19
 **/
@Tag(name = "前台门户接口")
@RestController
@Validated
public class BizPortalController {

    @Resource
    private BizVideoMapper bizVideoMapper;

    @Resource
    private BizArticleMapper bizArticleMapper;

    @Resource
    private BizGraphicMapper bizGraphicMapper;

    @Resource
    private BizMessageMapper bizMessageMapper;

    @Resource
    private BizCategoryMapper bizCategoryMapper;

    /**
     * 全部分类列表（仅启用），前端按 MODULE 字段自行筛选
     *
     * @author wuwenlong
     * @date  2026/11/19
     */
    @Operation(summary = "获取全部分类")
    @GetMapping("/public/categories")
    public CommonResult<List<BizCategory>> categories() {
        LambdaQueryWrapper<BizCategory> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(BizCategory::getStatus, "ENABLE")
                .orderByAsc(BizCategory::getParentId)
                .orderByAsc(BizCategory::getSortCode);
        return CommonResult.data(bizCategoryMapper.selectList(queryWrapper));
    }

    /**
     * 已发布视频列表
     *
     * @author wuwenlong
     * @date  2026/11/19
     */
    @Operation(summary = "获取已发布视频列表")
    @GetMapping("/public/videos")
    public CommonResult<List<BizVideo>> videos() {
        LambdaQueryWrapper<BizVideo> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(BizVideo::getStatus, "PUBLISHED")
                .orderByDesc(BizVideo::getIsTop)
                .orderByAsc(BizVideo::getSortCode)
                .orderByDesc(BizVideo::getPublishTime);
        return CommonResult.data(bizVideoMapper.selectList(queryWrapper));
    }

    /**
     * 已发布文章列表
     *
     * @author wuwenlong
     * @date  2026/11/19
     */
    @Operation(summary = "获取已发布文章列表")
    @GetMapping("/public/articles")
    public CommonResult<List<BizArticle>> articles() {
        LambdaQueryWrapper<BizArticle> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(BizArticle::getStatus, "PUBLISHED")
                .orderByDesc(BizArticle::getIsTop)
                .orderByAsc(BizArticle::getSortCode)
                .orderByDesc(BizArticle::getPublishTime);
        return CommonResult.data(bizArticleMapper.selectList(queryWrapper));
    }

    /**
     * 已发布图文列表
     *
     * @author wuwenlong
     * @date  2026/11/19
     */
    @Operation(summary = "获取已发布图文列表")
    @GetMapping("/public/graphics")
    public CommonResult<List<BizGraphic>> graphics() {
        LambdaQueryWrapper<BizGraphic> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(BizGraphic::getStatus, "PUBLISHED")
                .orderByDesc(BizGraphic::getIsTop)
                .orderByAsc(BizGraphic::getSortCode)
                .orderByDesc(BizGraphic::getPublishTime);
        return CommonResult.data(bizGraphicMapper.selectList(queryWrapper));
    }

    /**
     * 已通过留言列表（含回复，单表递归：parentId 为空为顶级留言，
     * 否则为对某条留言/回复的回复；前台自行按 parentId 组装树形结构）
     *
     * @author wuwenlong
     * @date  2026/11/19
     */
    @Operation(summary = "获取已通过留言列表")
    @GetMapping("/public/messages")
    public CommonResult<List<BizMessage>> messages() {
        LambdaQueryWrapper<BizMessage> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(BizMessage::getStatus, "APPROVED")
                .orderByAsc(BizMessage::getCreateTime)
                .orderByAsc(BizMessage::getId);
        return CommonResult.data(bizMessageMapper.selectList(queryWrapper));
    }

    /**
     * 提交留言或回复（单表递归）：parentId 为空时为顶级留言；
     * 不为空时为访客回复，可回复任意一条已通过的留言或回复（包括自己发布的）。
     * 默认审核通过，不接受 reply/replyUser 等管理字段。
     *
     * @author wuwenlong
     * @date  2026/11/19
     */
    @Operation(summary = "提交留言或回复")
    @PostMapping("/public/messages")
    public CommonResult<String> addMessage(@RequestBody BizMessageAddParam bizMessageAddParam,
                                            HttpServletRequest request) {
        if (bizMessageAddParam == null || StrUtil.isBlank(bizMessageAddParam.getNickname())
                || StrUtil.isBlank(bizMessageAddParam.getContent())) {
            return CommonResult.error("昵称和留言内容不能为空");
        }
        if (bizMessageAddParam.getContent().length() > 500) {
            return CommonResult.error("留言内容不能超过500字");
        }

        BizMessage bizMessage = new BizMessage();
        bizMessage.setNickname(StrUtil.maxLength(bizMessageAddParam.getNickname().trim(), 100));
        bizMessage.setAvatar(bizMessageAddParam.getAvatar());
        bizMessage.setEmail(bizMessageAddParam.getEmail());
        bizMessage.setPhone(bizMessageAddParam.getPhone());
        bizMessage.setContent(bizMessageAddParam.getContent().trim());
        bizMessage.setStatus("APPROVED");

        // 带父ID即为回复：父级必须存在，不限制审核状态（允许对任意留言/回复进行回复）
        String parentId = bizMessageAddParam.getParentId();
        if (StrUtil.isNotBlank(parentId)) {
            BizMessage parent = bizMessageMapper.selectById(parentId.trim());
            if (parent == null) {
                return CommonResult.error("回复对象不存在");
            }
            bizMessage.setParentId(parent.getId());
            String replyTo = StrUtil.isBlank(bizMessageAddParam.getReplyToNickname())
                    ? parent.getNickname() : bizMessageAddParam.getReplyToNickname();
            bizMessage.setReplyToNickname(StrUtil.isBlank(replyTo)
                    ? null : StrUtil.maxLength(replyTo.trim(), 100));
        }

        bizMessage.setIp(getClientIp(request));
        bizMessage.setUserAgent(StrUtil.maxLength(request.getHeader("User-Agent"), 500));
        bizMessageMapper.insert(bizMessage);
        // 返回新生成的主键，用于前端回填真实ID（否则前端临时ID无法作为后续回复的parentId）
        return CommonResult.data(bizMessage.getId());
    }

    /**
     * 获取访客IP
     *
     * @author wuwenlong
     * @date  2026/11/19
     */
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (StrUtil.isBlank(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (StrUtil.isBlank(ip)) {
            ip = request.getRemoteAddr();
        }
        return StrUtil.maxLength(ip.split(",")[0].trim(), 50);
    }
}
