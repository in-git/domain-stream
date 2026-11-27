
package vip.xiaonuo.biz.modular.site.controller;

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
import vip.xiaonuo.biz.modular.site.entity.BizSite;
import vip.xiaonuo.biz.modular.site.param.BizSiteAddParam;
import vip.xiaonuo.biz.modular.site.param.BizSiteEditParam;
import vip.xiaonuo.biz.modular.site.param.BizSiteIdParam;
import vip.xiaonuo.biz.modular.site.param.BizSitePageParam;
import vip.xiaonuo.biz.modular.site.param.BizSiteUpdateFieldParam;
import vip.xiaonuo.biz.modular.site.service.BizSiteService;

import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.io.IOException;
import java.util.List;

/**
 * 网页数据控制器
 *
 * @author wuwenlong
 * @date  2026/08/08 16:42
 */
@Tag(name = "网页数据控制器")
@RestController
@Validated
public class BizSiteController {

    @Resource
    private BizSiteService bizSiteService;

    /**
     * 获取网页数据分页
     *
     * @author wuwenlong
     * @date  2026/08/08 16:42
     */
    @Operation(summary = "获取网页数据分页")
    @SaCheckPermission("/biz/site/page")
    @GetMapping("/biz/site/page")
    public CommonResult<Page<BizSite>> page(BizSitePageParam bizSitePageParam) {
        return CommonResult.data(bizSiteService.page(bizSitePageParam));
    }

    /**
     * 添加网页数据
     *
     * @author wuwenlong
     * @date  2026/08/08 16:42
     */
    @Operation(summary = "添加网页数据")
    @CommonLog("添加网页数据")
    @SaCheckPermission("/biz/site/add")
    @PostMapping("/biz/site/add")
    public CommonResult<String> add(@RequestBody @Valid BizSiteAddParam bizSiteAddParam) {
        bizSiteService.add(bizSiteAddParam);
        return CommonResult.ok();
    }

    /**
     * 编辑网页数据
     *
     * @author wuwenlong
     * @date  2026/08/08 16:42
     */
    @Operation(summary = "编辑网页数据")
    @CommonLog("编辑网页数据")
    @SaCheckPermission("/biz/site/edit")
    @PostMapping("/biz/site/edit")
    public CommonResult<String> edit(@RequestBody @Valid BizSiteEditParam bizSiteEditParam) {
        bizSiteService.edit(bizSiteEditParam);
        return CommonResult.ok();
    }

    /**
     * 更新网页数据单个字段（是否可见 / 是否推荐）
     *
     * @author wuwenlong
     * @date  2026/08/08 16:42
     */
    @Operation(summary = "更新网页数据单个字段")
    @CommonLog("更新网页数据单个字段")
    @SaCheckPermission("/biz/site/edit")
    @PostMapping("/biz/site/updateField")
    public CommonResult<String> updateField(@RequestBody @Valid BizSiteUpdateFieldParam bizSiteUpdateFieldParam) {
        bizSiteService.updateField(bizSiteUpdateFieldParam);
        return CommonResult.ok();
    }

    /**
     * 删除网页数据
     *
     * @author wuwenlong
     * @date  2026/08/08 16:42
     */
    @Operation(summary = "删除网页数据")
    @CommonLog("删除网页数据")
    @SaCheckPermission("/biz/site/delete")
    @PostMapping("/biz/site/delete")
    public CommonResult<String> delete(@RequestBody @Valid @NotEmpty(message = "集合不能为空")
                                                   List<BizSiteIdParam> bizSiteIdParamList) {
        bizSiteService.delete(bizSiteIdParamList);
        return CommonResult.ok();
    }

    /**
     * 获取网页数据详情
     *
     * @author wuwenlong
     * @date  2026/08/08 16:42
     */
    @Operation(summary = "获取网页数据详情")
    @SaCheckPermission("/biz/site/detail")
    @GetMapping("/biz/site/detail")
    public CommonResult<BizSite> detail(@Valid BizSiteIdParam bizSiteIdParam) {
        return CommonResult.data(bizSiteService.detail(bizSiteIdParam));
    }

    /**
     * 下载网页数据导入模板
     *
     * @author wuwenlong
     * @date  2026/08/08 16:42
     */
    @Operation(summary = "下载网页数据导入模板")
    @SaCheckPermission("/biz/site/downloadImportTemplate")
    @GetMapping(value = "/biz/site/downloadImportTemplate", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public void downloadImportTemplate(HttpServletResponse response) throws IOException {
        bizSiteService.downloadImportTemplate(response);
    }

    /**
     * 导入网页数据
     *
     * @author wuwenlong
     * @date  2026/08/08 16:42
     */
    @Operation(summary = "导入网页数据")
    @CommonLog("导入网页数据")
    @SaCheckPermission("/biz/site/importData")
    @PostMapping("/biz/site/importData")
    public CommonResult<JSONObject> importData(@RequestPart("file") MultipartFile file) {
        return CommonResult.data(bizSiteService.importData(file));
    }

    /**
     * 导出网页数据
     *
     * @author wuwenlong
     * @date  2026/08/08 16:42
     */
    @Operation(summary = "导出网页数据")
    @SaCheckPermission("/biz/site/exportData")
    @PostMapping(value = "/biz/site/exportData", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public void exportData(@RequestBody List<BizSiteIdParam> bizSiteIdParamList, HttpServletResponse response) throws IOException {
        bizSiteService.exportData(bizSiteIdParamList, response);
    }
}
