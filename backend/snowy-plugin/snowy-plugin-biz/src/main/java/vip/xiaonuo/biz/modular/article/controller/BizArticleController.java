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
package vip.xiaonuo.biz.modular.article.controller;

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
import vip.xiaonuo.biz.modular.article.entity.BizArticle;
import vip.xiaonuo.biz.modular.article.param.BizArticleAddParam;
import vip.xiaonuo.biz.modular.article.param.BizArticleEditParam;
import vip.xiaonuo.biz.modular.article.param.BizArticleIdParam;
import vip.xiaonuo.biz.modular.article.param.BizArticlePageParam;
import vip.xiaonuo.biz.modular.article.service.BizArticleService;

import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.io.IOException;
import java.util.List;

/**
 * 文章控制器
 *
 * @author wuwenlong
 * @date  2026/11/19 02:04
 */
@Tag(name = "文章控制器")
@RestController
@Validated
public class BizArticleController {

    @Resource
    private BizArticleService bizArticleService;

    /**
     * 获取文章分页
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    @Operation(summary = "获取文章分页")
    @SaCheckPermission("/biz/article/page")
    @GetMapping("/biz/article/page")
    public CommonResult<Page<BizArticle>> page(BizArticlePageParam bizArticlePageParam) {
        return CommonResult.data(bizArticleService.page(bizArticlePageParam));
    }

    /**
     * 添加文章
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    @Operation(summary = "添加文章")
    @CommonLog("添加文章")
    @SaCheckPermission("/biz/article/add")
    @PostMapping("/biz/article/add")
    public CommonResult<String> add(@RequestBody @Valid BizArticleAddParam bizArticleAddParam) {
        bizArticleService.add(bizArticleAddParam);
        return CommonResult.ok();
    }

    /**
     * 编辑文章
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    @Operation(summary = "编辑文章")
    @CommonLog("编辑文章")
    @SaCheckPermission("/biz/article/edit")
    @PostMapping("/biz/article/edit")
    public CommonResult<String> edit(@RequestBody @Valid BizArticleEditParam bizArticleEditParam) {
        bizArticleService.edit(bizArticleEditParam);
        return CommonResult.ok();
    }

    /**
     * 删除文章
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    @Operation(summary = "删除文章")
    @CommonLog("删除文章")
    @SaCheckPermission("/biz/article/delete")
    @PostMapping("/biz/article/delete")
    public CommonResult<String> delete(@RequestBody @Valid @NotEmpty(message = "集合不能为空")
                                                   List<BizArticleIdParam> bizArticleIdParamList) {
        bizArticleService.delete(bizArticleIdParamList);
        return CommonResult.ok();
    }

    /**
     * 获取文章详情
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    @Operation(summary = "获取文章详情")
    @SaCheckPermission("/biz/article/detail")
    @GetMapping("/biz/article/detail")
    public CommonResult<BizArticle> detail(@Valid BizArticleIdParam bizArticleIdParam) {
        return CommonResult.data(bizArticleService.detail(bizArticleIdParam));
    }

    /**
     * 下载文章导入模板
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    @Operation(summary = "下载文章导入模板")
    @SaCheckPermission("/biz/article/downloadImportTemplate")
    @GetMapping(value = "/biz/article/downloadImportTemplate", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public void downloadImportTemplate(HttpServletResponse response) throws IOException {
        bizArticleService.downloadImportTemplate(response);
    }

    /**
     * 导入文章
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    @Operation(summary = "导入文章")
    @CommonLog("导入文章")
    @SaCheckPermission("/biz/article/importData")
    @PostMapping("/biz/article/importData")
    public CommonResult<JSONObject> importData(@RequestPart("file") MultipartFile file) {
        return CommonResult.data(bizArticleService.importData(file));
    }

    /**
     * 导出文章
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    @Operation(summary = "导出文章")
    @SaCheckPermission("/biz/article/exportData")
    @PostMapping(value = "/biz/article/exportData", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public void exportData(@RequestBody List<BizArticleIdParam> bizArticleIdParamList, HttpServletResponse response) throws IOException {
        bizArticleService.exportData(bizArticleIdParamList, response);
    }
}
