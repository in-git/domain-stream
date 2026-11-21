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
package vip.xiaonuo.biz.modular.userfavorite.controller;

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
import vip.xiaonuo.common.annotation.CommonLog;
import vip.xiaonuo.common.pojo.CommonResult;
import vip.xiaonuo.biz.modular.userfavorite.entity.BizUserFavorite;
import vip.xiaonuo.biz.modular.userfavorite.param.BizUserFavoriteAddParam;
import vip.xiaonuo.biz.modular.userfavorite.param.BizUserFavoriteEditParam;
import vip.xiaonuo.biz.modular.userfavorite.param.BizUserFavoriteIdParam;
import vip.xiaonuo.biz.modular.userfavorite.param.BizUserFavoritePageParam;
import vip.xiaonuo.biz.modular.userfavorite.service.BizUserFavoriteService;

import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.io.IOException;
import java.util.List;

/**
 * 用户收藏控制器
 *
 * @author wuwenlong
 * @date  2026/11/19 20:53
 */
@Tag(name = "用户收藏控制器")
@RestController
@Validated
public class BizUserFavoriteController {

    @Resource
    private BizUserFavoriteService bizUserFavoriteService;

    /**
     * 前台：指定类型各内容的收藏数（公开）
     *
     * @author domain-stream
     * @date  2026/11/21
     */
    @Operation(summary = "前台：统计收藏数")
    @GetMapping("/public/favorite/counts")
    public CommonResult<java.util.Map<String, Integer>> counts(@RequestParam("targetType") String targetType) {
        return CommonResult.data(bizUserFavoriteService.countByTargetType(targetType));
    }

    /**
     * 获取用户收藏分页
     *
     * @author wuwenlong
     * @date  2026/11/19 20:53
     */
    @Operation(summary = "获取用户收藏分页")
    @SaCheckPermission("/biz/userfavorite/page")
    @GetMapping("/biz/userfavorite/page")
    public CommonResult<Page<BizUserFavorite>> page(BizUserFavoritePageParam bizUserFavoritePageParam) {
        return CommonResult.data(bizUserFavoriteService.page(bizUserFavoritePageParam));
    }

    /**
     * 添加用户收藏
     *
     * @author wuwenlong
     * @date  2026/11/19 20:53
     */
    @Operation(summary = "添加用户收藏")
    @CommonLog("添加用户收藏")
    @SaCheckPermission("/biz/userfavorite/add")
    @PostMapping("/biz/userfavorite/add")
    public CommonResult<String> add(@RequestBody @Valid BizUserFavoriteAddParam bizUserFavoriteAddParam) {
        bizUserFavoriteService.add(bizUserFavoriteAddParam);
        return CommonResult.ok();
    }

    /**
     * 编辑用户收藏
     *
     * @author wuwenlong
     * @date  2026/11/19 20:53
     */
    @Operation(summary = "编辑用户收藏")
    @CommonLog("编辑用户收藏")
    @SaCheckPermission("/biz/userfavorite/edit")
    @PostMapping("/biz/userfavorite/edit")
    public CommonResult<String> edit(@RequestBody @Valid BizUserFavoriteEditParam bizUserFavoriteEditParam) {
        bizUserFavoriteService.edit(bizUserFavoriteEditParam);
        return CommonResult.ok();
    }

    /**
     * 删除用户收藏
     *
     * @author wuwenlong
     * @date  2026/11/19 20:53
     */
    @Operation(summary = "删除用户收藏")
    @CommonLog("删除用户收藏")
    @SaCheckPermission("/biz/userfavorite/delete")
    @PostMapping("/biz/userfavorite/delete")
    public CommonResult<String> delete(@RequestBody @Valid @NotEmpty(message = "集合不能为空")
                                                   List<BizUserFavoriteIdParam> bizUserFavoriteIdParamList) {
        bizUserFavoriteService.delete(bizUserFavoriteIdParamList);
        return CommonResult.ok();
    }

    /**
     * 获取用户收藏详情
     *
     * @author wuwenlong
     * @date  2026/11/19 20:53
     */
    @Operation(summary = "获取用户收藏详情")
    @SaCheckPermission("/biz/userfavorite/detail")
    @GetMapping("/biz/userfavorite/detail")
    public CommonResult<BizUserFavorite> detail(@Valid BizUserFavoriteIdParam bizUserFavoriteIdParam) {
        return CommonResult.data(bizUserFavoriteService.detail(bizUserFavoriteIdParam));
    }

    /**
     * 下载用户收藏导入模板
     *
     * @author wuwenlong
     * @date  2026/11/19 20:53
     */
    @Operation(summary = "下载用户收藏导入模板")
    @SaCheckPermission("/biz/userfavorite/downloadImportTemplate")
    @GetMapping(value = "/biz/userfavorite/downloadImportTemplate", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public void downloadImportTemplate(HttpServletResponse response) throws IOException {
        bizUserFavoriteService.downloadImportTemplate(response);
    }

    /**
     * 导入用户收藏
     *
     * @author wuwenlong
     * @date  2026/11/19 20:53
     */
    @Operation(summary = "导入用户收藏")
    @CommonLog("导入用户收藏")
    @SaCheckPermission("/biz/userfavorite/importData")
    @PostMapping("/biz/userfavorite/importData")
    public CommonResult<JSONObject> importData(@RequestPart("file") MultipartFile file) {
        return CommonResult.data(bizUserFavoriteService.importData(file));
    }

    /**
     * 导出用户收藏
     *
     * @author wuwenlong
     * @date  2026/11/19 20:53
     */
    @Operation(summary = "导出用户收藏")
    @SaCheckPermission("/biz/userfavorite/exportData")
    @PostMapping(value = "/biz/userfavorite/exportData", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public void exportData(@RequestBody List<BizUserFavoriteIdParam> bizUserFavoriteIdParamList, HttpServletResponse response) throws IOException {
        bizUserFavoriteService.exportData(bizUserFavoriteIdParamList, response);
    }
}
