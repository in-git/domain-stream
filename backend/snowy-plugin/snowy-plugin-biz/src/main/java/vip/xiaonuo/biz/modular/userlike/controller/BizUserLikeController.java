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
package vip.xiaonuo.biz.modular.userlike.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vip.xiaonuo.auth.core.util.StpClientUtil;
import vip.xiaonuo.common.annotation.CommonLog;
import vip.xiaonuo.common.pojo.CommonResult;
import vip.xiaonuo.biz.modular.userlike.entity.BizUserLike;
import vip.xiaonuo.biz.modular.userlike.param.BizUserLikeAddParam;
import vip.xiaonuo.biz.modular.userlike.param.BizUserLikeToggleParam;
import vip.xiaonuo.biz.modular.userlike.param.BizUserLikeEditParam;
import vip.xiaonuo.biz.modular.userlike.param.BizUserLikeIdParam;
import vip.xiaonuo.biz.modular.userlike.param.BizUserLikePageParam;
import vip.xiaonuo.biz.modular.userlike.service.BizUserLikeService;

import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.io.IOException;
import java.util.Collections;
import java.util.List;

/**
 * 用户喜欢/点赞记录控制器
 *
 * @author wuwenlong
 * @date  2026/11/21 19:55
 */
@Tag(name = "用户喜欢/点赞记录控制器")
@RestController
@Validated
public class BizUserLikeController {

    @Resource
    private BizUserLikeService bizUserLikeService;

    /**
     * 前台：当前登录用户已喜欢的内容ID列表（未登录返回空）
     *
     * @author domain-stream
     * @date  2026/11/21
     */
    @Operation(summary = "前台：我的喜欢列表")
    @GetMapping("/public/like/mine")
    public CommonResult<List<String>> mine() {
        Object loginId = StpClientUtil.getLoginIdDefaultNull();
        if (loginId == null) {
            return CommonResult.data(Collections.emptyList());
        }
        return CommonResult.data(bizUserLikeService.likedTargetIds(String.valueOf(loginId)));
    }

    /**
     * 前台：切换喜欢状态，并同步内容表 LIKE_COUNT 统计
     *
     * @author domain-stream
     * @date  2026/11/21
     */
    @Operation(summary = "前台：切换喜欢")
    @PostMapping("/public/like/toggle")
    public CommonResult<JSONObject> toggle(@RequestBody @Valid BizUserLikeToggleParam param) {
        Object loginId = StpClientUtil.getLoginIdDefaultNull();
        if (loginId == null) {
            return CommonResult.error("请先登录后再喜欢");
        }
        return CommonResult.data(bizUserLikeService.toggle(
                String.valueOf(loginId), param.getTargetId(), param.getTargetType()));
    }

    /**
     * 获取用户喜欢/点赞记录分页
     *
     * @author wuwenlong
     * @date  2026/11/21 19:55
     */
    @Operation(summary = "获取用户喜欢/点赞记录分页")
    @SaCheckPermission("/biz/userlike/page")
    @GetMapping("/biz/userlike/page")
    public CommonResult<Page<BizUserLike>> page(BizUserLikePageParam bizUserLikePageParam) {
        return CommonResult.data(bizUserLikeService.page(bizUserLikePageParam));
    }

    /**
     * 添加用户喜欢/点赞记录
     *
     * @author wuwenlong
     * @date  2026/11/21 19:55
     */
    @Operation(summary = "添加用户喜欢/点赞记录")
    @CommonLog("添加用户喜欢/点赞记录")
    @SaCheckPermission("/biz/userlike/add")
    @PostMapping("/biz/userlike/add")
    public CommonResult<String> add(@RequestBody @Valid BizUserLikeAddParam bizUserLikeAddParam) {
        bizUserLikeService.add(bizUserLikeAddParam);
        return CommonResult.ok();
    }

    /**
     * 编辑用户喜欢/点赞记录
     *
     * @author wuwenlong
     * @date  2026/11/21 19:55
     */
    @Operation(summary = "编辑用户喜欢/点赞记录")
    @CommonLog("编辑用户喜欢/点赞记录")
    @SaCheckPermission("/biz/userlike/edit")
    @PostMapping("/biz/userlike/edit")
    public CommonResult<String> edit(@RequestBody @Valid BizUserLikeEditParam bizUserLikeEditParam) {
        bizUserLikeService.edit(bizUserLikeEditParam);
        return CommonResult.ok();
    }

    /**
     * 删除用户喜欢/点赞记录
     *
     * @author wuwenlong
     * @date  2026/11/21 19:55
     */
    @Operation(summary = "删除用户喜欢/点赞记录")
    @CommonLog("删除用户喜欢/点赞记录")
    @SaCheckPermission("/biz/userlike/delete")
    @PostMapping("/biz/userlike/delete")
    public CommonResult<String> delete(@RequestBody @Valid @NotEmpty(message = "集合不能为空")
                                                   List<BizUserLikeIdParam> bizUserLikeIdParamList) {
        bizUserLikeService.delete(bizUserLikeIdParamList);
        return CommonResult.ok();
    }

    /**
     * 获取用户喜欢/点赞记录详情
     *
     * @author wuwenlong
     * @date  2026/11/21 19:55
     */
    @Operation(summary = "获取用户喜欢/点赞记录详情")
    @SaCheckPermission("/biz/userlike/detail")
    @GetMapping("/biz/userlike/detail")
    public CommonResult<BizUserLike> detail(@Valid BizUserLikeIdParam bizUserLikeIdParam) {
        return CommonResult.data(bizUserLikeService.detail(bizUserLikeIdParam));
    }

    /**
     * 下载用户喜欢/点赞记录导入模板
     *
     * @author wuwenlong
     * @date  2026/11/21 19:55
     */
    @Operation(summary = "下载用户喜欢/点赞记录导入模板")
    @SaCheckPermission("/biz/userlike/downloadImportTemplate")
    @GetMapping(value = "/biz/userlike/downloadImportTemplate", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public void downloadImportTemplate(HttpServletResponse response) throws IOException {
        bizUserLikeService.downloadImportTemplate(response);
    }

    /**
     * 导入用户喜欢/点赞记录
     *
     * @author wuwenlong
     * @date  2026/11/21 19:55
     */
    @Operation(summary = "导入用户喜欢/点赞记录")
    @CommonLog("导入用户喜欢/点赞记录")
    @SaCheckPermission("/biz/userlike/importData")
    @PostMapping("/biz/userlike/importData")
    public CommonResult<JSONObject> importData(@RequestPart("file") MultipartFile file) {
        return CommonResult.data(bizUserLikeService.importData(file));
    }

    /**
     * 导出用户喜欢/点赞记录
     *
     * @author wuwenlong
     * @date  2026/11/21 19:55
     */
    @Operation(summary = "导出用户喜欢/点赞记录")
    @SaCheckPermission("/biz/userlike/exportData")
    @PostMapping(value = "/biz/userlike/exportData", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public void exportData(@RequestBody List<BizUserLikeIdParam> bizUserLikeIdParamList, HttpServletResponse response) throws IOException {
        bizUserLikeService.exportData(bizUserLikeIdParamList, response);
    }
}
