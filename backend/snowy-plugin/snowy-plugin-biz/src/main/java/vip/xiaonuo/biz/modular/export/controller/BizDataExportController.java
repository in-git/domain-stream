package vip.xiaonuo.biz.modular.export.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vip.xiaonuo.biz.modular.export.service.BizDataExportService;
import vip.xiaonuo.common.annotation.CommonLog;

import java.io.IOException;

/**
 * 数据导出控制器：数据库备份与文件资源打包。
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Tag(name = "数据导出控制器")
@RestController
@RequestMapping("/biz/export")
public class BizDataExportController {

    @Resource
    private BizDataExportService bizDataExportService;

    @Operation(summary = "导出数据库")
    @CommonLog("导出数据库")
    @GetMapping(value = "/database", produces = "application/sql")
    public void exportDatabase(HttpServletResponse response) throws IOException {
        bizDataExportService.exportDatabase(response);
    }

    @Operation(summary = "导出文件资源")
    @CommonLog("导出文件资源")
    @GetMapping(value = "/files", produces = "application/zip")
    public void exportFiles(HttpServletResponse response) throws IOException {
        bizDataExportService.exportFiles(response);
    }
}
