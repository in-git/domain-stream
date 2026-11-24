package vip.xiaonuo.biz.modular.export.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletResponse;
import cn.hutool.core.util.StrUtil;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vip.xiaonuo.biz.modular.export.service.BizDataExportService;
import vip.xiaonuo.common.annotation.CommonLog;
import vip.xiaonuo.common.cache.CommonCacheOperator;
import vip.xiaonuo.common.pojo.CommonResult;

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

    private static final String TICKET_KEY_PREFIX = "biz:export:ticket:";
    private static final String TICKET_RUNNING = "RUNNING";
    private static final String TICKET_DONE = "DONE";
    /** 票据最长保留 30 分钟，避免浏览器一直轮询 */
    private static final long TICKET_TTL_SECONDS = 30 * 60;

    @Resource
    private BizDataExportService bizDataExportService;

    @Resource
    private CommonCacheOperator commonCacheOperator;

    @Operation(summary = "查询导出是否完成")
    @GetMapping(value = "/status")
    public CommonResult<Boolean> exportStatus(@RequestParam String ticket) {
        String key = TICKET_KEY_PREFIX + ticket;
        Object status = commonCacheOperator.get(key);
        if (status == null) {
            // 首次轮询时下载请求可能还未到达后端，先登记为进行中
            commonCacheOperator.put(key, TICKET_RUNNING, TICKET_TTL_SECONDS);
            return CommonResult.data(false);
        }
        return CommonResult.data(TICKET_DONE.equals(status));
    }

    @Operation(summary = "导出数据库")
    @CommonLog("导出数据库")
    @GetMapping(value = "/database", produces = "application/sql")
    public void exportDatabase(@RequestParam(required = false) String ticket, HttpServletResponse response) throws IOException {
        try {
            bizDataExportService.exportDatabase(response);
        } finally {
            finish(ticket);
        }
    }

    @Operation(summary = "导出完整目录")
    @CommonLog("导出完整目录")
    @GetMapping(value = "/files", produces = "application/zip")
    public void exportFiles(@RequestParam(required = false) String ticket, HttpServletResponse response) throws IOException {
        try {
            bizDataExportService.exportFiles(response);
        } finally {
            finish(ticket);
        }
    }

    @Operation(summary = "导出用户上传文件")
    @CommonLog("导出用户上传文件")
    @GetMapping(value = "/user-files", produces = "application/zip")
    public void exportUserFiles(@RequestParam(required = false) String ticket, HttpServletResponse response) throws IOException {
        try {
            bizDataExportService.exportUserFiles(response);
        } finally {
            finish(ticket);
        }
    }

    private void finish(String ticket) {
        if (StrUtil.isNotBlank(ticket)) {
            commonCacheOperator.put(TICKET_KEY_PREFIX + ticket, TICKET_DONE, TICKET_TTL_SECONDS);
        }
    }
}
