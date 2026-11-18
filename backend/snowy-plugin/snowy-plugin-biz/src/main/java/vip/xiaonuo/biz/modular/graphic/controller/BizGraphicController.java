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
package vip.xiaonuo.biz.modular.graphic.controller;

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
import vip.xiaonuo.biz.modular.graphic.entity.BizGraphic;
import vip.xiaonuo.biz.modular.graphic.param.BizGraphicAddParam;
import vip.xiaonuo.biz.modular.graphic.param.BizGraphicEditParam;
import vip.xiaonuo.biz.modular.graphic.param.BizGraphicIdParam;
import vip.xiaonuo.biz.modular.graphic.param.BizGraphicPageParam;
import vip.xiaonuo.biz.modular.graphic.service.BizGraphicService;

import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.io.IOException;
import java.util.List;

/**
 * 图文控制器
 *
 * @author wuwenlong
 * @date  2026/11/19 02:05
 */
@Tag(name = "图文控制器")
@RestController
@Validated
public class BizGraphicController {

    @Resource
    private BizGraphicService bizGraphicService;

    /**
     * 获取图文分页
     *
     * @author wuwenlong
     * @date  2026/11/19 02:05
     */
    @Operation(summary = "获取图文分页")
    @SaCheckPermission("/biz/graphic/page")
    @GetMapping("/biz/graphic/page")
    public CommonResult<Page<BizGraphic>> page(BizGraphicPageParam bizGraphicPageParam) {
        return CommonResult.data(bizGraphicService.page(bizGraphicPageParam));
    }

    /**
     * 添加图文
     *
     * @author wuwenlong
     * @date  2026/11/19 02:05
     */
    @Operation(summary = "添加图文")
    @CommonLog("添加图文")
    @SaCheckPermission("/biz/graphic/add")
    @PostMapping("/biz/graphic/add")
    public CommonResult<String> add(@RequestBody @Valid BizGraphicAddParam bizGraphicAddParam) {
        bizGraphicService.add(bizGraphicAddParam);
        return CommonResult.ok();
    }

    /**
     * 编辑图文
     *
     * @author wuwenlong
     * @date  2026/11/19 02:05
     */
    @Operation(summary = "编辑图文")
    @CommonLog("编辑图文")
    @SaCheckPermission("/biz/graphic/edit")
    @PostMapping("/biz/graphic/edit")
    public CommonResult<String> edit(@RequestBody @Valid BizGraphicEditParam bizGraphicEditParam) {
        bizGraphicService.edit(bizGraphicEditParam);
        return CommonResult.ok();
    }

    /**
     * 删除图文
     *
     * @author wuwenlong
     * @date  2026/11/19 02:05
     */
    @Operation(summary = "删除图文")
    @CommonLog("删除图文")
    @SaCheckPermission("/biz/graphic/delete")
    @PostMapping("/biz/graphic/delete")
    public CommonResult<String> delete(@RequestBody @Valid @NotEmpty(message = "集合不能为空")
                                                   List<BizGraphicIdParam> bizGraphicIdParamList) {
        bizGraphicService.delete(bizGraphicIdParamList);
        return CommonResult.ok();
    }

    /**
     * 获取图文详情
     *
     * @author wuwenlong
     * @date  2026/11/19 02:05
     */
    @Operation(summary = "获取图文详情")
    @SaCheckPermission("/biz/graphic/detail")
    @GetMapping("/biz/graphic/detail")
    public CommonResult<BizGraphic> detail(@Valid BizGraphicIdParam bizGraphicIdParam) {
        return CommonResult.data(bizGraphicService.detail(bizGraphicIdParam));
    }

    /**
     * 下载图文导入模板
     *
     * @author wuwenlong
     * @date  2026/11/19 02:05
     */
    @Operation(summary = "下载图文导入模板")
    @SaCheckPermission("/biz/graphic/downloadImportTemplate")
    @GetMapping(value = "/biz/graphic/downloadImportTemplate", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public void downloadImportTemplate(HttpServletResponse response) throws IOException {
        bizGraphicService.downloadImportTemplate(response);
    }

    /**
     * 导入图文
     *
     * @author wuwenlong
     * @date  2026/11/19 02:05
     */
    @Operation(summary = "导入图文")
    @CommonLog("导入图文")
    @SaCheckPermission("/biz/graphic/importData")
    @PostMapping("/biz/graphic/importData")
    public CommonResult<JSONObject> importData(@RequestPart("file") MultipartFile file) {
        return CommonResult.data(bizGraphicService.importData(file));
    }

    /**
     * 导出图文
     *
     * @author wuwenlong
     * @date  2026/11/19 02:05
     */
    @Operation(summary = "导出图文")
    @SaCheckPermission("/biz/graphic/exportData")
    @PostMapping(value = "/biz/graphic/exportData", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public void exportData(@RequestBody List<BizGraphicIdParam> bizGraphicIdParamList, HttpServletResponse response) throws IOException {
        bizGraphicService.exportData(bizGraphicIdParamList, response);
    }
}
