package vip.xiaonuo.biz.modular.dataimport.service;

import org.springframework.web.multipart.MultipartFile;
import vip.xiaonuo.biz.modular.dataimport.pojo.ImportStatus;

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

    /** 查询任务状态 */
    ImportStatus status(String ticket);
}
