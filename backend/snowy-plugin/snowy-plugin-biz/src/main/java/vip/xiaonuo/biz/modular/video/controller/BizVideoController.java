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
package vip.xiaonuo.biz.modular.video.controller;

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
import vip.xiaonuo.biz.modular.video.entity.BizVideo;
import vip.xiaonuo.biz.modular.video.param.BizVideoAddParam;
import vip.xiaonuo.biz.modular.video.param.BizVideoEditParam;
import vip.xiaonuo.biz.modular.video.param.BizVideoIdParam;
import vip.xiaonuo.biz.modular.video.param.BizVideoPageParam;
import vip.xiaonuo.biz.modular.video.service.BizVideoService;

import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.io.IOException;
import java.util.List;

/**
 * 视频控制器
 *
 * @author wuwenlong
 * @date  2026/11/19 02:03
 */
@Tag(name = "视频控制器")
@RestController
@Validated
public class BizVideoController {

    @Resource
    private BizVideoService bizVideoService;

    /**
     * 获取视频分页
     *
     * @author wuwenlong
     * @date  2026/11/19 02:03
     */
    @Operation(summary = "获取视频分页")
    @SaCheckPermission("/biz/video/page")
    @GetMapping("/biz/video/page")
    public CommonResult<Page<BizVideo>> page(BizVideoPageParam bizVideoPageParam) {
        return CommonResult.data(bizVideoService.page(bizVideoPageParam));
    }

    /**
     * 添加视频
     *
     * @author wuwenlong
     * @date  2026/11/19 02:03
     */
    @Operation(summary = "添加视频")
    @CommonLog("添加视频")
    @SaCheckPermission("/biz/video/add")
    @PostMapping("/biz/video/add")
    public CommonResult<String> add(@RequestBody @Valid BizVideoAddParam bizVideoAddParam) {
        bizVideoService.add(bizVideoAddParam);
        return CommonResult.ok();
    }

    /**
     * 编辑视频
     *
     * @author wuwenlong
     * @date  2026/11/19 02:03
     */
    @Operation(summary = "编辑视频")
    @CommonLog("编辑视频")
    @SaCheckPermission("/biz/video/edit")
    @PostMapping("/biz/video/edit")
    public CommonResult<String> edit(@RequestBody @Valid BizVideoEditParam bizVideoEditParam) {
        bizVideoService.edit(bizVideoEditParam);
        return CommonResult.ok();
    }

    /**
     * 删除视频
     *
     * @author wuwenlong
     * @date  2026/11/19 02:03
     */
    @Operation(summary = "删除视频")
    @CommonLog("删除视频")
    @SaCheckPermission("/biz/video/delete")
    @PostMapping("/biz/video/delete")
    public CommonResult<String> delete(@RequestBody @Valid @NotEmpty(message = "集合不能为空")
                                                   List<BizVideoIdParam> bizVideoIdParamList) {
        bizVideoService.delete(bizVideoIdParamList);
        return CommonResult.ok();
    }

    /**
     * 获取视频详情
     *
     * @author wuwenlong
     * @date  2026/11/19 02:03
     */
    @Operation(summary = "获取视频详情")
    @SaCheckPermission("/biz/video/detail")
    @GetMapping("/biz/video/detail")
    public CommonResult<BizVideo> detail(@Valid BizVideoIdParam bizVideoIdParam) {
        return CommonResult.data(bizVideoService.detail(bizVideoIdParam));
    }

    /**
     * 下载视频导入模板
     *
     * @author wuwenlong
     * @date  2026/11/19 02:03
     */
    @Operation(summary = "下载视频导入模板")
    @SaCheckPermission("/biz/video/downloadImportTemplate")
    @GetMapping(value = "/biz/video/downloadImportTemplate", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public void downloadImportTemplate(HttpServletResponse response) throws IOException {
        bizVideoService.downloadImportTemplate(response);
    }

    /**
     * 导入视频
     *
     * @author wuwenlong
     * @date  2026/11/19 02:03
     */
    @Operation(summary = "导入视频")
    @CommonLog("导入视频")
    @SaCheckPermission("/biz/video/importData")
    @PostMapping("/biz/video/importData")
    public CommonResult<JSONObject> importData(@RequestPart("file") MultipartFile file) {
        return CommonResult.data(bizVideoService.importData(file));
    }

    /**
     * 导出视频
     *
     * @author wuwenlong
     * @date  2026/11/19 02:03
     */
    @Operation(summary = "导出视频")
    @SaCheckPermission("/biz/video/exportData")
    @PostMapping(value = "/biz/video/exportData", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public void exportData(@RequestBody List<BizVideoIdParam> bizVideoIdParamList, HttpServletResponse response) throws IOException {
        bizVideoService.exportData(bizVideoIdParamList, response);
    }
}
