package vip.xiaonuo.biz.modular.export.service;

import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;

/**
 * 数据导出服务：数据库备份与文件资源分类打包。
 *
 * @author domain-stream
 * @date 2026/11/23
 */
public interface BizDataExportService {

    /** 导出数据库为可执行的 SQL 脚本 */
    void exportDatabase(HttpServletResponse response) throws IOException;

    /** 导出全部底座文件，按图片/视频/音频/文档等分类打包为 ZIP */
    void exportFiles(HttpServletResponse response) throws IOException;

    /** 导出用户上传的全部文件，按原始文件名平铺打包为 ZIP，不分类、不生成清单 */
    void exportUserFiles(HttpServletResponse response) throws IOException;
}
