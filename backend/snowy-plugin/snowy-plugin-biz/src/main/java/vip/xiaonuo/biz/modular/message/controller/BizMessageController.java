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
package vip.xiaonuo.biz.modular.message.controller;

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
import vip.xiaonuo.biz.modular.message.entity.BizMessage;
import vip.xiaonuo.biz.modular.message.param.BizMessageAddParam;
import vip.xiaonuo.biz.modular.message.param.BizMessageEditParam;
import vip.xiaonuo.biz.modular.message.param.BizMessageIdParam;
import vip.xiaonuo.biz.modular.message.param.BizMessagePageParam;
import vip.xiaonuo.biz.modular.message.service.BizMessageService;

import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.io.IOException;
import java.util.List;

/**
 * 留言控制器
 *
 * @author wuwenlong
 * @date  2026/11/19 11:32
 */
@Tag(name = "留言控制器")
@RestController
@Validated
public class BizMessageController {

    @Resource
    private BizMessageService bizMessageService;

    /**
     * 获取留言分页
     *
     * @author wuwenlong
     * @date  2026/11/19 11:32
     */
    @Operation(summary = "获取留言分页")
    @SaCheckPermission("/biz/message/page")
    @GetMapping("/biz/message/page")
    public CommonResult<Page<BizMessage>> page(BizMessagePageParam bizMessagePageParam) {
        return CommonResult.data(bizMessageService.page(bizMessagePageParam));
    }

    /**
     * 添加留言
     *
     * @author wuwenlong
     * @date  2026/11/19 11:32
     */
    @Operation(summary = "添加留言")
    @CommonLog("添加留言")
    @SaCheckPermission("/biz/message/add")
    @PostMapping("/biz/message/add")
    public CommonResult<String> add(@RequestBody @Valid BizMessageAddParam bizMessageAddParam) {
        bizMessageService.add(bizMessageAddParam);
        return CommonResult.ok();
    }

    /**
     * 编辑留言
     *
     * @author wuwenlong
     * @date  2026/11/19 11:32
     */
    @Operation(summary = "编辑留言")
    @CommonLog("编辑留言")
    @SaCheckPermission("/biz/message/edit")
    @PostMapping("/biz/message/edit")
    public CommonResult<String> edit(@RequestBody @Valid BizMessageEditParam bizMessageEditParam) {
        bizMessageService.edit(bizMessageEditParam);
        return CommonResult.ok();
    }

    /**
     * 删除留言
     *
     * @author wuwenlong
     * @date  2026/11/19 11:32
     */
    @Operation(summary = "删除留言")
    @CommonLog("删除留言")
    @SaCheckPermission("/biz/message/delete")
    @PostMapping("/biz/message/delete")
    public CommonResult<String> delete(@RequestBody @Valid @NotEmpty(message = "集合不能为空")
                                                   List<BizMessageIdParam> bizMessageIdParamList) {
        bizMessageService.delete(bizMessageIdParamList);
        return CommonResult.ok();
    }

    /**
     * 获取留言详情
     *
     * @author wuwenlong
     * @date  2026/11/19 11:32
     */
    @Operation(summary = "获取留言详情")
    @SaCheckPermission("/biz/message/detail")
    @GetMapping("/biz/message/detail")
    public CommonResult<BizMessage> detail(@Valid BizMessageIdParam bizMessageIdParam) {
        return CommonResult.data(bizMessageService.detail(bizMessageIdParam));
    }

    /**
     * 下载留言导入模板
     *
     * @author wuwenlong
     * @date  2026/11/19 11:32
     */
    @Operation(summary = "下载留言导入模板")
    @SaCheckPermission("/biz/message/downloadImportTemplate")
    @GetMapping(value = "/biz/message/downloadImportTemplate", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public void downloadImportTemplate(HttpServletResponse response) throws IOException {
        bizMessageService.downloadImportTemplate(response);
    }

    /**
     * 导入留言
     *
     * @author wuwenlong
     * @date  2026/11/19 11:32
     */
    @Operation(summary = "导入留言")
    @CommonLog("导入留言")
    @SaCheckPermission("/biz/message/importData")
    @PostMapping("/biz/message/importData")
    public CommonResult<JSONObject> importData(@RequestPart("file") MultipartFile file) {
        return CommonResult.data(bizMessageService.importData(file));
    }

    /**
     * 导出留言
     *
     * @author wuwenlong
     * @date  2026/11/19 11:32
     */
    @Operation(summary = "导出留言")
    @SaCheckPermission("/biz/message/exportData")
    @PostMapping(value = "/biz/message/exportData", produces = MediaType.APPLICATION_OCTET_STREAM_VALUE)
    public void exportData(@RequestBody List<BizMessageIdParam> bizMessageIdParamList, HttpServletResponse response) throws IOException {
        bizMessageService.exportData(bizMessageIdParamList, response);
    }
}
