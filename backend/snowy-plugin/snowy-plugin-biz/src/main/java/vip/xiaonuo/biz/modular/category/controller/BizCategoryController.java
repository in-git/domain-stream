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
package vip.xiaonuo.biz.modular.category.controller;

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
import vip.xiaonuo.biz.modular.category.entity.BizCategory;
import vip.xiaonuo.biz.modular.category.param.BizCategoryAddParam;
import vip.xiaonuo.biz.modular.category.param.BizCategoryEditParam;
import vip.xiaonuo.biz.modular.category.param.BizCategoryIdParam;
import vip.xiaonuo.biz.modular.category.param.BizCategoryPageParam;
import vip.xiaonuo.biz.modular.category.service.BizCategoryService;

import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.io.IOException;
import java.util.List;

/**
 * 通用分类（文章/视频/图文）控制器
 *
 * @author wuwenlong
 * @date  2026/11/19 02:04
 */
@Tag(name = "通用分类（文章/视频/图文）控制器")
@RestController
@Validated
public class BizCategoryController {

    @Resource
    private BizCategoryService bizCategoryService;

    /**
     * 获取通用分类（文章/视频/图文）分页
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    @Operation(summary = "获取通用分类（文章/视频/图文）分页")
    @SaCheckPermission("/biz/category/page")
    @GetMapping("/biz/category/page")
    public CommonResult<Page<BizCategory>> page(BizCategoryPageParam bizCategoryPageParam) {
        return CommonResult.data(bizCategoryService.page(bizCategoryPageParam));
    }

    /**
     * 添加通用分类（文章/视频/图文）
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    @Operation(summary = "添加通用分类（文章/视频/图文）")
    @CommonLog("添加通用分类（文章/视频/图文）")
    @SaCheckPermission("/biz/category/add")
    @PostMapping("/biz/category/add")
    public CommonResult<String> add(@RequestBody @Valid BizCategoryAddParam bizCategoryAddParam) {
        bizCategoryService.add(bizCategoryAddParam);
        return CommonResult.ok();
    }

    /**
     * 编辑通用分类（文章/视频/图文）
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    @Operation(summary = "编辑通用分类（文章/视频/图文）")
    @CommonLog("编辑通用分类（文章/视频/图文）")
    @SaCheckPermission("/biz/category/edit")
    @PostMapping("/biz/category/edit")
    public CommonResult<String> edit(@RequestBody @Valid BizCategoryEditParam bizCategoryEditParam) {
        bizCategoryService.edit(bizCategoryEditParam);
        return CommonResult.ok();
    }

    /**
     * 删除通用分类（文章/视频/图文）
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    @Operation(summary = "删除通用分类（文章/视频/图文）")
    @CommonLog("删除通用分类（文章/视频/图文）")
    @SaCheckPermission("/biz/category/delete")
    @PostMapping("/biz/category/delete")
    public CommonResult<String> delete(@RequestBody @Valid @NotEmpty(message = "集合不能为空")
                                                   List<BizCategoryIdParam> bizCategoryIdParamList) {
        bizCategoryService.delete(bizCategoryIdParamList);
        return CommonResult.ok();
    }

    /**
     * 获取通用分类（文章/视频/图文）详情
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    @Operation(summary = "获取通用分类（文章/视频/图文）详情")
    @SaCheckPermission("/biz/category/detail")
    @GetMapping("/biz/category/detail")
    public CommonResult<BizCategory> detail(@Valid BizCategoryIdParam bizCategoryIdParam) {
        return CommonResult.data(bizCategoryService.detail(bizCategoryIdParam));
    }

    /**
     * 下载通用分类（文章/视频/图文）导入模板
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    @Operation(summary = "下载通用分类（文章/视频/图文）导入模板")
    @SaCheckPermission("/biz/category/downloadImportTemplate")
    @GetMapping(value = "/biz/category/downloadImportTemplate", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public void downloadImportTemplate(HttpServletResponse response) throws IOException {
        bizCategoryService.downloadImportTemplate(response);
    }

    /**
     * 导入通用分类（文章/视频/图文）
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    @Operation(summary = "导入通用分类（文章/视频/图文）")
    @CommonLog("导入通用分类（文章/视频/图文）")
    @SaCheckPermission("/biz/category/importData")
    @PostMapping("/biz/category/importData")
    public CommonResult<JSONObject> importData(@RequestPart("file") MultipartFile file) {
        return CommonResult.data(bizCategoryService.importData(file));
    }

    /**
     * 导出通用分类（文章/视频/图文）
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    @Operation(summary = "导出通用分类（文章/视频/图文）")
    @SaCheckPermission("/biz/category/exportData")
    @PostMapping(value = "/biz/category/exportData", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public void exportData(@RequestBody List<BizCategoryIdParam> bizCategoryIdParamList, HttpServletResponse response) throws IOException {
        bizCategoryService.exportData(bizCategoryIdParamList, response);
    }
}
