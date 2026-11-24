package vip.xiaonuo.biz.modular.dataimport.service;

import org.springframework.web.multipart.MultipartFile;
import vip.xiaonuo.biz.modular.dataimport.pojo.ImportStatus;

import java.nio.file.Path;

/**
 * 数据导入服务：文件资源包导入与 SQL 备份恢复。
 *
 * @author domain-stream
 * @date 2026/11/24
 */
public interface BizDataImportService {

    /** 导入 ZIP 文件资源包，mode 为 OVERWRITE（覆盖）或 APPEND（追加），返回任务票据 */
    String importFiles(MultipartFile file, String mode);

    /** 恢复 SQL 备份（完全覆盖数据库），返回任务票据 */
    String restoreDatabase(MultipartFile file);

    /** 导入分片上传合并后的临时 ZIP，方法接管该临时文件的所有权，完成后删除 */
    String importFilesFromPath(Path file, String mode);

    /** 恢复分片上传合并后的临时 SQL，方法接管该临时文件的所有权，完成后删除 */
    String restoreDatabaseFromPath(Path file);

    /** 查询任务状态 */
    ImportStatus status(String ticket);
}
