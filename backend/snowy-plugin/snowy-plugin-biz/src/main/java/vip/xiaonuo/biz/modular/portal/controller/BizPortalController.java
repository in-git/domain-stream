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
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vip.xiaonuo.biz.modular.article.entity.BizArticle;
import vip.xiaonuo.biz.modular.article.mapper.BizArticleMapper;
import vip.xiaonuo.biz.modular.category.entity.BizCategory;
import vip.xiaonuo.biz.modular.category.mapper.BizCategoryMapper;
import vip.xiaonuo.biz.modular.graphic.entity.BizGraphic;
import vip.xiaonuo.biz.modular.graphic.mapper.BizGraphicMapper;
import vip.xiaonuo.biz.modular.graphic.param.BizGraphicPosterApplyParam;
import vip.xiaonuo.biz.modular.graphic.param.BizGraphicPosterParam;
import vip.xiaonuo.biz.modular.graphic.service.BizGraphicPosterService;
import vip.xiaonuo.biz.modular.message.entity.BizMessage;
import vip.xiaonuo.biz.modular.message.mapper.BizMessageMapper;
import vip.xiaonuo.biz.modular.message.param.BizMessageAddParam;
import vip.xiaonuo.biz.modular.video.entity.BizVideo;
import vip.xiaonuo.biz.modular.video.mapper.BizVideoMapper;
import vip.xiaonuo.biz.modular.video.service.BizVideoService;
import vip.xiaonuo.auth.api.SaBaseLoginUserApi;
import vip.xiaonuo.auth.core.pojo.SaBaseClientLoginUser;
import vip.xiaonuo.auth.core.util.StpClientUtil;
import vip.xiaonuo.common.pojo.CommonResult;
import vip.xiaonuo.common.util.CommonIpAddressUtil;

import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * 前台门户接口控制器
 *
 * 提供「已发布」内容的只读列表与留言墙；留言提交要求 C 端已登录，
 * 留言人身份由登录态 USER_ID 决定，不再接收昵称/邮箱/电话。
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
    private BizVideoService bizVideoService;

    @Resource
    private BizArticleMapper bizArticleMapper;

    @Resource
    private BizGraphicMapper bizGraphicMapper;

    @Resource
    private BizMessageMapper bizMessageMapper;

    @Resource
    private BizCategoryMapper bizCategoryMapper;

    @Resource
    private BizGraphicPosterService bizGraphicPosterService;

    @Resource(name = "clientLoginUserApi")
    private SaBaseLoginUserApi clientLoginUserApi;

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
    @Operation(summary = "获取已发布视频列表（随机推荐，可按分类筛选）")
    @GetMapping("/public/videos")
    public CommonResult<List<BizVideo>> videos(@RequestParam(value = "category", required = false) String category) {
        LambdaQueryWrapper<BizVideo> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(BizVideo::getStatus, "PUBLISHED")
                .eq(StrUtil.isNotBlank(category) && !"全部".equals(category), BizVideo::getCategory, category)
                .last("ORDER BY RAND()");
        return CommonResult.data(bizVideoMapper.selectList(queryWrapper));
    }

    /**
     * 上报视频播放量：仅在视频真正开始播放时由前台调用
     *
     * @author domain-stream
     * @date  2026/11/21
     */
    @Operation(summary = "上报视频播放量")
    @PostMapping("/public/videos/{id}/view")
    public CommonResult<Boolean> recordVideoView(@PathVariable("id") String id) {
        bizVideoService.recordView(id);
        return CommonResult.data(true);
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
     * 文本转图片：把访客输入的文本渲染成小红书风格的图文卡片并入库。
     * 图片由服务端绘制，不接受客户端上传图片，天然规避违规图片。
     *
     * @author domain-stream
     * @date  2026/11/21
     */
    @Operation(summary = "文本转图文")
    @PostMapping("/public/graphics/poster")
    public CommonResult<BizGraphic> createPoster(@RequestBody @Validated BizGraphicPosterParam param) {
        if (param == null || StrUtil.isBlank(param.getContent())) {
            return CommonResult.error("内容不能为空");
        }
        // 登录用户优先用真实昵称，未登录则用传参或匿名
        String author = StrUtil.isBlank(param.getNickname()) ? null : param.getNickname().trim();
        Object loginId = StpClientUtil.getLoginIdDefaultNull();
        if (StrUtil.isBlank(author) && loginId != null) {
            SaBaseClientLoginUser user = clientLoginUserApi.getClientUserById(String.valueOf(loginId));
            if (user != null && StrUtil.isNotBlank(user.getNickname())) {
                author = user.getNickname();
            }
        }
        if (StrUtil.isBlank(author)) {
            author = "匿名用户";
        }

        List<String> images = bizGraphicPosterService.render(param, author);

        BizGraphic graphic = new BizGraphic();
        String rawTitle = StrUtil.isBlank(param.getTitle()) ? param.getContent() : param.getTitle();
        graphic.setTitle(StrUtil.maxLength(rawTitle.trim(), 60));
        graphic.setCover(images.get(0));
        graphic.setImages(JSONUtil.toJsonStr(images));
        graphic.setSummary(StrUtil.maxLength(param.getContent().trim(), 200));
        graphic.setContent(param.getContent().trim());
        graphic.setStatus("PUBLISHED");
        graphic.setPublishTime(new Date());
        graphic.setViewCount(0);
        graphic.setLikeCount(0);
        graphic.setCommentCount(0);
        graphic.setExtJson(JSONUtil.createObj()
                .set("author", author)
                .set("theme", StrUtil.nullToDefault(param.getTheme(), "warm"))
                .set("source", "TEXT_POSTER")
                .toString());
        bizGraphicMapper.insert(graphic);
        return CommonResult.data(graphic);
    }

    /**
     * 文本转图文（只渲染不落库）。
     * 供 CMS「上传并编排图文」预览使用：返回图片地址，由运营勾选后再保存图文。
     *
     * @author domain-stream
     * @date  2026/11/21
     */
    @Operation(summary = "文本转图文（预览）")
    @PostMapping("/public/graphics/poster/preview")
    public CommonResult<List<String>> previewPoster(@RequestBody @Validated BizGraphicPosterParam param) {
        if (param == null || StrUtil.isBlank(param.getContent())) {
            return CommonResult.error("内容不能为空");
        }
        String author = resolveAuthor(param.getNickname());
        return CommonResult.data(bizGraphicPosterService.render(param, author));
    }

    /**
     * 应用图文预览结果：只保留用户选中的图片，按顺序入库。
     * 与重新生成不同，这里不重新排版，直接使用已渲染好的图片地址。
     *
     * @author domain-stream
     * @date  2026/11/21
     */
    @Operation(summary = "应用图文生成结果")
    @PostMapping("/public/graphics/poster/apply")
    public CommonResult<BizGraphic> applyPoster(@RequestBody @Validated BizGraphicPosterApplyParam param) {
        if (param == null || param.getImages() == null || param.getImages().isEmpty()) {
            return CommonResult.error("请至少选择一张图片");
        }
        String author = resolveAuthor(param.getNickname());
        String content = StrUtil.trimToEmpty(param.getContent());

        BizGraphic graphic = new BizGraphic();
        String rawTitle = StrUtil.isBlank(param.getTitle()) ? content : param.getTitle();
        graphic.setTitle(StrUtil.sub(StrUtil.blankToDefault(rawTitle, "图文笔记").trim(), 0, 60));
        graphic.setCover(param.getImages().get(0));
        graphic.setImages(JSONUtil.toJsonStr(param.getImages()));
        graphic.setSummary(StrUtil.sub(content, 0, 200));
        graphic.setContent(content);
        graphic.setStatus("PUBLISHED");
        graphic.setPublishTime(new Date());
        graphic.setViewCount(0);
        graphic.setLikeCount(0);
        graphic.setCommentCount(0);
        graphic.setExtJson(JSONUtil.createObj()
                .set("author", author)
                .set("theme", StrUtil.nullToDefault(param.getTheme(), "warm"))
                .set("source", "TEXT_POSTER")
                .toString());
        bizGraphicMapper.insert(graphic);
        return CommonResult.data(graphic);
    }

    /** 解析展示用作者名：入参 → 登录用户昵称 → 匿名 */
    private String resolveAuthor(String nickname) {
        String author = StrUtil.isBlank(nickname) ? null : nickname.trim();
        if (StrUtil.isBlank(author)) {
            Object loginId = StpClientUtil.getLoginIdDefaultNull();
            if (loginId != null) {
                SaBaseClientLoginUser user = clientLoginUserApi.getClientUserById(String.valueOf(loginId));
                if (user != null && StrUtil.isNotBlank(user.getNickname())) {
                    author = user.getNickname();
                }
            }
        }
        return StrUtil.isBlank(author) ? "匿名用户" : author;
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
        List<BizMessage> messages = bizMessageMapper.selectList(queryWrapper);
        Set<String> userIds = new HashSet<>();
        messages.forEach(message -> {
            if (StrUtil.isNotBlank(message.getUserId())) {
                userIds.add(message.getUserId());
            }
        });
        Map<String, String> nicknameByUserId = new HashMap<>();
        userIds.forEach(userId -> nicknameByUserId.put(userId, nicknameOf(userId)));
        messages.forEach(message -> message.setNickname(nicknameByUserId.get(message.getUserId())));
        return CommonResult.data(messages);
    }

    /** 按用户 ID 反查展示昵称：昵称 → 姓名 → 账号；用户不存在时返回空 */
    private String nicknameOf(String userId) {
        if (StrUtil.isBlank(userId)) {
            return null;
        }
        SaBaseClientLoginUser user = clientLoginUserApi.getClientUserById(userId);
        if (user == null) {
            return null;
        }
        return displayNameOf(user);
    }

    /** 展示名兜底：昵称 → 姓名 → 账号 */
    private String displayNameOf(SaBaseClientLoginUser user) {
        if (StrUtil.isNotBlank(user.getNickname())) {
            return user.getNickname();
        }
        if (StrUtil.isNotBlank(user.getName())) {
            return user.getName();
        }
        return StrUtil.isBlank(user.getAccount()) ? null : user.getAccount();
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
        if (bizMessageAddParam == null || StrUtil.isBlank(bizMessageAddParam.getContent())) {
            return CommonResult.error("留言内容不能为空");
        }
        if (bizMessageAddParam.getContent().length() > 500) {
            return CommonResult.error("留言内容不能超过500字");
        }
        Object loginId = StpClientUtil.getLoginIdDefaultNull();
        if (loginId == null) {
            return CommonResult.error("请先登录后再留言");
        }
        String loginUserId = String.valueOf(loginId);

        BizMessage bizMessage = new BizMessage();
        bizMessage.setUserId(StrUtil.maxLength(loginUserId, 20));
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
                    ? nicknameOf(parent.getUserId()) : bizMessageAddParam.getReplyToNickname();
            bizMessage.setReplyToNickname(StrUtil.isBlank(replyTo)
                    ? null : StrUtil.maxLength(replyTo.trim(), 100));
        }

        bizMessage.setIp(CommonIpAddressUtil.getIp(request));
        bizMessage.setUserAgent(StrUtil.maxLength(request.getHeader("User-Agent"), 500));
        bizMessageMapper.insert(bizMessage);
        // 返回新生成的主键，用于前端回填真实ID（否则前端临时ID无法作为后续回复的parentId）
        return CommonResult.data(bizMessage.getId());
    }

}
