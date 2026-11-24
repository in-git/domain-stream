package vip.xiaonuo.biz.modular.dataimport.controller;

import cn.hutool.core.io.FileUtil;
import cn.hutool.core.util.StrUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import vip.xiaonuo.biz.modular.dataimport.service.BizDataImportService;
import vip.xiaonuo.common.annotation.CommonLog;
import vip.xiaonuo.common.exception.CommonException;
import vip.xiaonuo.common.pojo.CommonResult;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 数据导入专用分片上传。
 *
 * <p>分片只写入系统临时目录，合并后直接交给导入任务；不经过小诺文件服务，
 * 因此不会在文件中心留下记录，也不会生成下载地址。</p>
 *
 * @author domain-stream
 * @date 2026/11/24
 */
@Tag(name = "数据导入分片上传控制器")
@RestController
@RequestMapping("/biz/import/upload")
public class BizImportUploadController {

    /** 单片 8MB，低于云上 60MB 单请求限制 */
    private static final long CHUNK_SIZE = 8L * 1024 * 1024;
    /** 单片上限 16MB，防止客户端传入超大分片绕过限制 */
    private static final long MAX_CHUNK_BYTES = 16L * 1024 * 1024;
    /** 导入文件上限 20GB，避免异常请求无限占用磁盘 */
    private static final long MAX_FILE_BYTES = 20L * 1024 * 1024 * 1024;
    /** 上传任务 2 小时未操作自动过期 */
    private static final long TASK_TTL_MS = 2L * 60 * 60 * 1000;
    private static final String TEMP_ROOT = System.getProperty("java.io.tmpdir") + File.separator + "domain-stream-import-uploads";

    @Resource
    private BizDataImportService bizDataImportService;

    private final Map<String, UploadTask> tasks = new ConcurrentHashMap<>();

    /** 服务重启后旧上传任务已失效，清理遗留分片目录 */
    @PostConstruct
    public void cleanupOrphanDirs() {
        File root = Path.of(TEMP_ROOT).toFile();
        File[] dirs = root.listFiles();
        if (dirs == null) return;
        long deadline = System.currentTimeMillis() - TASK_TTL_MS;
        for (File dir : dirs) {
            if (dir.isDirectory() && dir.lastModified() < deadline) FileUtil.del(dir);
        }
    }

    @Operation(summary = "初始化导入文件上传")
    @PostMapping("/init")
    public CommonResult<InitResult> init(
            @RequestParam String fileName,
            @RequestParam long fileSize,
            @RequestParam long lastModified,
            @RequestParam long chunkSize,
            @RequestParam(value = "mode", defaultValue = "APPEND") String mode) {
        expireTasks();
        String suffix = suffixOf(fileName);
        if (fileSize <= 0 || fileSize > MAX_FILE_BYTES) {
            throw new CommonException("导入文件大小必须在 1B 到 20GB 之间");
        }
        if (chunkSize <= 0 || chunkSize > MAX_CHUNK_BYTES) {
            throw new CommonException("分片大小必须在 1B 到 16MB 之间");
        }
        int totalChunks = (int) ((fileSize + chunkSize - 1) / chunkSize);
        if (totalChunks <= 0 || totalChunks > 10000) {
            throw new CommonException("分片数量异常，请检查文件大小");
        }
        String normalizedMode = normalizeMode(mode);
        String uploadId = UUID.nameUUIDFromBytes(
                (fileName + "|" + fileSize + "|" + lastModified + "|" + suffix + "|" + normalizedMode)
                        .getBytes(StandardCharsets.UTF_8)).toString();
        Path dir = taskDir(uploadId);
        if (!Files.exists(dir)) {
            try {
                Files.createDirectories(dir);
            } catch (IOException e) {
                throw new CommonException("创建导入临时目录失败：" + e.getMessage());
            }
        }
        UploadTask task = tasks.computeIfAbsent(uploadId,
                key -> new UploadTask(key, suffix, fileSize, chunkSize, totalChunks, normalizedMode));
        task.touch();
        return CommonResult.data(new InitResult(uploadId, listUploaded(task)));
    }

    @Operation(summary = "上传导入文件分片")
    @PostMapping("/chunk")
    public CommonResult<Boolean> upload(
            @RequestParam String uploadId,
            @RequestParam int index,
            @RequestParam("file") MultipartFile file) {
        UploadTask task = requireTask(uploadId);
        if (index < 0 || index >= task.totalChunks) {
            throw new CommonException("分片序号越界");
        }
        long expected = Math.min(task.chunkSize, task.fileSize - (long) index * task.chunkSize);
        Path dir = taskDir(uploadId);
        Path part = dir.resolve(index + ".part");
        Path tempPart = dir.resolve(index + ".part.tmp");
        try {
            if (!Files.exists(dir)) Files.createDirectories(dir);
            try (InputStream in = file.getInputStream();
                 OutputStream out = Files.newOutputStream(tempPart)) {
                byte[] buffer = new byte[8192];
                int len;
                while ((len = in.read(buffer)) > 0) {
                    out.write(buffer, 0, len);
                }
            }
            if (Files.size(tempPart) != expected) {
                throw new CommonException("分片大小不匹配，请重新上传第 " + (index + 1) + " 片");
            }
            synchronized (task) {
                Files.move(tempPart, part, StandardCopyOption.REPLACE_EXISTING);
            }
            task.touch();
        } catch (IOException e) {
            FileUtil.del(tempPart.toFile());
            throw new CommonException("分片写入失败：" + e.getMessage());
        }
        return CommonResult.data(true);
    }

    @Operation(summary = "合并导入文件分片并开始导入")
    @CommonLog("合并导入文件分片")
    @PostMapping("/complete")
    public CommonResult<String> complete(@RequestParam String uploadId) {
        UploadTask task = requireTask(uploadId);
        Path dir = taskDir(uploadId);
        synchronized (task) {
            try {
                for (int i = 0; i < task.totalChunks; i++) {
                    Path part = dir.resolve(i + ".part");
                    long expected = Math.min(task.chunkSize, task.fileSize - (long) i * task.chunkSize);
                    if (!Files.exists(part) || Files.size(part) != expected) {
                        throw new CommonException("分片缺失或大小不符，第 " + (i + 1) + " 片需要重新上传");
                    }
                }
            } catch (IOException e) {
                throw new CommonException("检查分片失败：" + e.getMessage());
            }
        }

        Path merged = null;
        try {
            merged = Files.createTempFile("biz-import-ready-", "." + task.suffix);
            try (OutputStream out = Files.newOutputStream(merged)) {
                for (int i = 0; i < task.totalChunks; i++) {
                    Files.copy(dir.resolve(i + ".part"), out);
                }
            }
        } catch (IOException e) {
            if (merged != null) FileUtil.del(merged.toFile());
            throw new CommonException("分片合并失败：" + e.getMessage());
        }

        try {
            // 合并后的临时文件所有权交给导入服务：导入完成后由服务删除
            return CommonResult.data("sql".equals(task.suffix)
                    ? bizDataImportService.restoreDatabaseFromPath(merged)
                    : bizDataImportService.importFilesFromPath(merged, task.mode));
        } finally {
            FileUtil.del(dir.toFile());
            tasks.remove(uploadId);
        }
    }

    @Operation(summary = "取消导入文件上传")
    @PostMapping("/cancel")
    public CommonResult<Boolean> cancel(@RequestParam String uploadId) {
        FileUtil.del(taskDir(uploadId).toFile());
        tasks.remove(uploadId);
        return CommonResult.data(true);
    }

    private UploadTask requireTask(String uploadId) {
        UploadTask task = tasks.get(uploadId);
        if (task == null) {
            throw new CommonException("上传任务不存在或已过期，请重新上传");
        }
        task.touch();
        return task;
    }

    private void expireTasks() {
        long now = System.currentTimeMillis();
        tasks.forEach((id, task) -> {
            if (now - task.lastAccess > TASK_TTL_MS) {
                tasks.remove(id);
                FileUtil.del(taskDir(id).toFile());
            }
        });
    }

    private List<Integer> listUploaded(UploadTask task) {
        List<Integer> uploaded = new ArrayList<>();
        for (int i = 0; i < task.totalChunks; i++) {
            Path part = taskDir(task.id).resolve(i + ".part");
            if (Files.exists(part)) uploaded.add(i);
        }
        return uploaded;
    }

    private Path taskDir(String uploadId) {
        String safe = uploadId.replaceAll("[^A-Za-z0-9_-]", "");
        return Path.of(TEMP_ROOT, safe);
    }

    private String suffixOf(String fileName) {
        String name = StrUtil.blankToDefault(fileName, "").toLowerCase(Locale.ROOT);
        if (name.endsWith(".sql")) return "sql";
        if (name.endsWith(".zip")) return "zip";
        throw new CommonException("仅支持 .sql 数据库备份或 .zip 文件资源包");
    }

    private String normalizeMode(String mode) {
        String value = StrUtil.blankToDefault(mode, "APPEND").toUpperCase(Locale.ROOT);
        if (!"OVERWRITE".equals(value) && !"APPEND".equals(value)) {
            throw new CommonException("导入模式只能是 OVERWRITE 或 APPEND");
        }
        return value;
    }

    public record InitResult(String uploadId, List<Integer> uploaded) {
    }

    private static class UploadTask {
        final String id;
        final String suffix;
        final long fileSize;
        final long chunkSize;
        final int totalChunks;
        final String mode;
        volatile long lastAccess = System.currentTimeMillis();

        UploadTask(String id, String suffix, long fileSize, long chunkSize, int totalChunks, String mode) {
            this.id = id;
            this.suffix = suffix;
            this.fileSize = fileSize;
            this.chunkSize = chunkSize;
            this.totalChunks = totalChunks;
            this.mode = mode;
        }

        void touch() {
            lastAccess = System.currentTimeMillis();
        }
    }
}
