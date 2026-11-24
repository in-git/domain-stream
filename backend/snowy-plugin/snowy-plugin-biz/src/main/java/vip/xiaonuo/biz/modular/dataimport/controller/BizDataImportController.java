package vip.xiaonuo.biz.modular.dataimport.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import vip.xiaonuo.biz.modular.dataimport.pojo.ImportStatus;
import vip.xiaonuo.biz.modular.dataimport.service.BizDataImportService;
import vip.xiaonuo.common.annotation.CommonLog;
import vip.xiaonuo.common.pojo.CommonResult;

/**
 * 数据导入控制器：文件资源包导入与 SQL 备份恢复。
 *
 * @author domain-stream
 * @date 2026/11/24
 */
@Tag(name = "数据导入控制器")
@RestController
@RequestMapping("/biz/import")
public class BizDataImportController {

    @Resource
    private BizDataImportService bizDataImportService;

    @Operation(summary = "查询数据导入进度")
    @GetMapping("/status")
    public CommonResult<ImportStatus> importStatus(@RequestParam String ticket) {
        return CommonResult.data(bizDataImportService.status(ticket));
    }

    @Operation(summary = "导入文件资源包")
    @CommonLog("导入文件资源包")
    @PostMapping("/files")
    public CommonResult<String> importFiles(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "mode", defaultValue = "APPEND") String mode) {
        return CommonResult.data(bizDataImportService.importFiles(file, mode));
    }

    @Operation(summary = "SQL 恢复数据库")
    @CommonLog("SQL 恢复数据库")
    @PostMapping("/database")
    public CommonResult<String> restoreDatabase(@RequestParam("file") MultipartFile file) {
        return CommonResult.data(bizDataImportService.restoreDatabase(file));
    }
}
