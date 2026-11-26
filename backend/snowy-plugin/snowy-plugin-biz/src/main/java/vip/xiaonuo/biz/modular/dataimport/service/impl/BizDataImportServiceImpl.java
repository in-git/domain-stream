package vip.xiaonuo.biz.modular.dataimport.service.impl;

import cn.hutool.core.convert.Convert;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import jakarta.annotation.PreDestroy;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import vip.xiaonuo.biz.modular.asset.util.ByteArrayMultipartFile;
import vip.xiaonuo.biz.modular.dataimport.pojo.ImportStatus;
import vip.xiaonuo.biz.modular.dataimport.service.BizDataImportService;
import vip.xiaonuo.biz.modular.dataimport.util.SqlScriptRunner;
import vip.xiaonuo.common.cache.CommonCacheOperator;
import vip.xiaonuo.common.exception.CommonException;
import vip.xiaonuo.common.prop.CommonProperties;
import vip.xiaonuo.dev.api.DevFileApi;

import javax.sql.DataSource;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Types;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * 数据导入服务实现：导入接口立即返回任务票据，实际导入在后台线程执行，
 * 前端通过状态接口轮询直到完成，避免大文件恢复导致 HTTP 请求超时。
 *
 * @author domain-stream
 * @date 2026/11/24
 */
@Slf4j
@Service
public class BizDataImportServiceImpl implements BizDataImportService {

    private static final String TICKET_KEY_PREFIX = "biz:import:ticket:";
    /** 票据保留 30 分钟 */
    private static final long TICKET_TTL_SECONDS = 30 * 60;
    /** 单个 ZIP 条目最大 200MB，避免异常包撑爆内存 */
    private static final int MAX_ENTRY_BYTES = 200 * 1024 * 1024;
    private static final Pattern HOST_PATTERN = Pattern.compile("^(https?://[^/]+)", Pattern.CASE_INSENSITIVE);

    @Resource
    private DataSource dataSource;

    @Resource
    private DevFileApi devFileApi;

    @Resource
    private CommonCacheOperator commonCacheOperator;

    @Resource
    private CommonProperties commonProperties;

    private final ExecutorService executor = Executors.newFixedThreadPool(2, r -> {
        Thread thread = new Thread(r, "biz-data-import");
        thread.setDaemon(true);
        return thread;
    });

    @PreDestroy
    public void shutdown() {
        executor.shutdownNow();
    }

    @Override
    public String importFiles(MultipartFile file, String mode) {
        String name = StrUtil.blankToDefault(file.getOriginalFilename(), "");
        if (!name.toLowerCase(Locale.ROOT).endsWith(".zip")) {
            throw new CommonException("请上传 .zip 格式的文件资源包");
        }
        Path temp = copyToTemp(file, "biz-import-files-", ".zip");
        return importFilesFromPath(temp, mode);
    }

    @Override
    public String restoreDatabase(MultipartFile file) {
        String name = StrUtil.blankToDefault(file.getOriginalFilename(), "");
        if (!name.toLowerCase(Locale.ROOT).endsWith(".sql")) {
            throw new CommonException("请上传 .sql 格式的数据库备份文件");
        }
        Path temp = copyToTemp(file, "biz-import-db-", ".sql");
        return restoreDatabaseFromPath(temp);
    }

    @Override
    public String importFilesFromPath(Path file, String mode) {
        String normalizedMode = normalizeMode(mode);
        if (!file.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".zip")) {
            deleteQuietly(file);
            throw new CommonException("请上传 .zip 格式的文件资源包");
        }
        try {
            return start(ticket -> importFilesAsync(file, "OVERWRITE".equals(normalizedMode), ticket), file);
        } catch (RuntimeException e) {
            deleteQuietly(file);
            throw e;
        }
    }

    @Override
    public String restoreDatabaseFromPath(Path file) {
        if (!file.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".sql")) {
            deleteQuietly(file);
            throw new CommonException("请上传 .sql 格式的数据库备份文件");
        }
        try {
            return start(ticket -> restoreDatabaseAsync(file, ticket), file);
        } catch (RuntimeException e) {
            deleteQuietly(file);
            throw e;
        }
    }

    private String normalizeMode(String mode) {
        String value = StrUtil.blankToDefault(mode, "APPEND").toUpperCase(Locale.ROOT);
        if (!"OVERWRITE".equals(value) && !"APPEND".equals(value)) {
            throw new CommonException("导入模式只能是 OVERWRITE 或 APPEND");
        }
        return value;
    }

    @Override
    public ImportStatus status(String ticket) {
        // 以 Map 形式存取：项目的 Redis 编解码器按 Object 解码，自定义类型（如 record）无法还原
        Object cached = commonCacheOperator.get(TICKET_KEY_PREFIX + ticket);
        if (cached instanceof Map<?, ?> map) {
            return new ImportStatus(
                    Boolean.TRUE.equals(map.get("done")),
                    Boolean.TRUE.equals(map.get("success")),
                    StrUtil.blankToDefault(StrUtil.toStringOrNull(map.get("message")), ""),
                    Convert.toInt(map.get("count"), 0));
        }
        return ImportStatus.running();
    }

    @FunctionalInterface
    private interface ImportTask {
        void run(String ticket) throws Exception;
    }

    /** 同一时刻只允许一个导入任务，避免两个覆盖导入互相删除对方刚导入的文件 */
    private final AtomicBoolean running = new AtomicBoolean(false);

    private String start(ImportTask task, Path tempFile) {
        if (!running.compareAndSet(false, true)) {
            deleteQuietly(tempFile);
            throw new CommonException("已有导入任务正在执行，请稍后再试");
        }
        String ticket = UUID.randomUUID().toString().replace("-", "");
        commonCacheOperator.put(TICKET_KEY_PREFIX + ticket, toMap(ImportStatus.running()), TICKET_TTL_SECONDS);
        try {
            executor.submit(() -> {
                try {
                    task.run(ticket);
                } catch (Exception e) {
                    log.error("数据导入失败，ticket={}", ticket, e);
                    fail(ticket, StrUtil.blankToDefault(e.getMessage(), "导入失败"));
                } finally {
                    running.set(false);
                }
            });
        } catch (RuntimeException e) {
            running.set(false);
            deleteQuietly(tempFile);
            throw e;
        }
        return ticket;
    }

    private Map<String, Object> toMap(ImportStatus status) {
        Map<String, Object> map = new HashMap<>();
        map.put("done", status.done());
        map.put("success", status.success());
        map.put("message", status.message());
        map.put("count", status.count());
        return map;
    }

    private void importFilesAsync(Path zipFile, boolean overwrite, String ticket) {
        int imported = 0;
        int skipped = 0;
        Set<String> newIds = new HashSet<>();
        try (ZipInputStream zip = new ZipInputStream(Files.newInputStream(zipFile), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                String rawName = entry.getName();
                if (entry.isDirectory() || rawName.endsWith("/") || rawName.endsWith("导出清单.txt")) {
                    continue;
                }
                String fileName = sanitizeFileName(rawName.substring(Math.max(0, rawName.lastIndexOf('/') + 1)));
                if (StrUtil.isBlank(fileName)) {
                    skipped++;
                    continue;
                }
                byte[] bytes = readEntry(zip);
                if (bytes == null) {
                    log.warn("导入跳过超大文件：{}", rawName);
                    skipped++;
                    continue;
                }
                String id = devFileApi.uploadAssetReturnId(null,
                        new ByteArrayMultipartFile(bytes, "file", fileName, "application/octet-stream"),
                        "USER", null);
                if (StrUtil.isNotBlank(id)) {
                    newIds.add(id);
                    imported++;
                } else {
                    skipped++;
                }
                zip.closeEntry();
            }
        } catch (IOException e) {
            throw new CommonException("读取 ZIP 文件包失败：" + e.getMessage());
        } finally {
            deleteQuietly(zipFile);
        }

        if (imported == 0) {
            throw new CommonException("文件包中没有可导入的文件，未做任何更改");
        }
        if (overwrite) {
            JSONArray oldFiles = devFileApi.getAllFiles("USER");
            if (oldFiles != null) {
                for (int i = 0; i < oldFiles.size(); i++) {
                    String id = oldFiles.getJSONObject(i).getStr("id");
                    if (StrUtil.isBlank(id) || newIds.contains(id)) continue;
                    try {
                        devFileApi.deleteAbsoluteById(id);
                    } catch (Exception e) {
                        log.warn("覆盖导入时删除旧文件失败：{}，原因：{}", id, e.getMessage());
                    }
                }
            }
        }

        String message = "成功导入 " + imported + " 个文件" + (skipped > 0 ? "，跳过 " + skipped + " 个" : "");
        commonCacheOperator.put(TICKET_KEY_PREFIX + ticket, toMap(ImportStatus.success(message, imported)), TICKET_TTL_SECONDS);
    }

    private void restoreDatabaseAsync(Path sqlFile, String ticket) throws IOException {
        List<String> statements;
        try {
            statements = SqlScriptRunner.split(Files.readString(sqlFile, StandardCharsets.UTF_8));
        } finally {
            deleteQuietly(sqlFile);
        }
        if (statements.isEmpty()) {
            throw new CommonException("SQL 备份文件中没有可执行的语句");
        }
        int executed = 0;
        int rewritten = 0;
        try (Connection connection = dataSource.getConnection();
             Statement statement = connection.createStatement()) {
            for (String sql : statements) {
                statement.execute(sql);
                executed++;
            }
            // 迁移到新系统时，把备份里旧的后端 IP/域名替换为当前配置的新地址
            rewritten = rewriteFileUrls(connection);
        } catch (CommonException e) {
            throw e;
        } catch (Exception e) {
            throw new CommonException("SQL 恢复在第 " + (executed + 1) + " 条语句失败：" + e.getMessage());
        }
        String message = "数据库恢复完成，共执行 " + executed + " 条语句";
        if (rewritten > 0) {
            message += "，重写文件地址 " + rewritten + " 处";
        }
        commonCacheOperator.put(TICKET_KEY_PREFIX + ticket,
                toMap(ImportStatus.success(message, executed)), TICKET_TTL_SECONDS);
    }

    /** 恢复数据库后，把备份中的旧后端 IP/域名替换为当前系统配置的地址 */
    private int rewriteFileUrls(Connection connection) throws Exception {
        String backendUrl = StrUtil.trim(commonProperties.getBackendUrl());
        if (StrUtil.isBlank(backendUrl)) {
            log.warn("跳过文件地址重写：snowy.config.common.backend-url 未配置");
            return 0;
        }
        String product = connection.getMetaData().getDatabaseProductName().toLowerCase(Locale.ROOT);
        if (!product.contains("mysql")) {
            log.warn("跳过文件地址重写：当前数据库不是 MySQL");
            return 0;
        }

        String oldBase = detectOldBackendBase(connection);
        String newBase = trimTrailingSlash(backendUrl);
        String oldHost = hostOf(oldBase);
        String newHost = hostOf(newBase);
        if (StrUtil.isBlank(oldHost) || StrUtil.isBlank(newHost)) {
            return 0;
        }

        List<String[]> targets = findTextColumns(connection);
        int rewritten = 0;
        if (StrUtil.isNotBlank(oldBase) && !oldBase.equals(newBase)) {
            for (String[] target : targets) {
                rewritten += replaceInColumn(connection, target[0], target[1], oldBase, newBase);
            }
        }
        if (!oldHost.equals(newHost)) {
            for (String[] target : targets) {
                rewritten += replaceInColumn(connection, target[0], target[1], oldHost, newHost);
            }
        }
        return rewritten;
    }

    /** 从文件下载地址推断备份系统使用的后端根地址 */
    private String detectOldBackendBase(Connection connection) {
        String sql = "SELECT DOWNLOAD_PATH FROM DEV_FILE WHERE DOWNLOAD_PATH LIKE '%/dev/file/%' LIMIT 1";
        try (Statement statement = connection.createStatement();
             ResultSet resultSet = statement.executeQuery(sql)) {
            if (resultSet.next()) {
                String url = StrUtil.trim(resultSet.getString(1));
                int index = url.indexOf("/dev/file/");
                if (index > 0) return url.substring(0, index);
            }
        } catch (Exception e) {
            log.warn("推断旧后端地址失败：{}", e.getMessage());
        }
        return "";
    }

    /** 只处理可能包含 URL/路径的文本列，避免误改数字或二进制字段 */
    private List<String[]> findTextColumns(Connection connection) throws Exception {
        List<String[]> columns = new ArrayList<>();
        try (ResultSet resultSet = connection.getMetaData().getColumns(connection.getCatalog(), null, "%", null)) {
            while (resultSet.next()) {
                int type = resultSet.getInt("DATA_TYPE");
                if (!isTextType(type)) continue;
                String table = resultSet.getString("TABLE_NAME");
                String column = resultSet.getString("COLUMN_NAME");
                if (StrUtil.isBlank(table) || StrUtil.isBlank(column) || !isUrlColumn(column)) continue;
                columns.add(new String[]{table, column});
            }
        }
        return columns;
    }

    private boolean isTextType(int type) {
        return type == Types.CHAR || type == Types.VARCHAR || type == Types.LONGVARCHAR
                || type == Types.NCHAR || type == Types.NVARCHAR || type == Types.LONGNVARCHAR
                || type == Types.CLOB || type == Types.LONGVARCHAR;
    }

    private boolean isUrlColumn(String column) {
        String name = column.toUpperCase(Locale.ROOT);
        return name.contains("URL") || name.contains("PATH") || name.contains("COVER")
                || name.contains("IMAGE") || name.contains("VIDEO") || name.contains("CONTENT")
                || name.contains("HTML") || name.contains("SRC") || name.contains("THUMB");
    }

    private int replaceInColumn(Connection connection, String table, String column,
                                String oldValue, String newValue) {
        if (StrUtil.isBlank(oldValue) || oldValue.equals(newValue)) return 0;
        String quotedTable = quoteIdent(table);
        String quotedColumn = quoteIdent(column);
        String sql = "UPDATE " + quotedTable + " SET " + quotedColumn +
                " = REPLACE(" + quotedColumn + ", ?, ?) WHERE " + quotedColumn + " LIKE ?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, oldValue);
            statement.setString(2, newValue);
            statement.setString(3, "%" + oldValue + "%");
            return statement.executeUpdate();
        } catch (Exception e) {
            log.warn("重写字段地址失败：{}.{}，原因：{}", table, column, e.getMessage());
            return 0;
        }
    }

    private String hostOf(String url) {
        Matcher matcher = HOST_PATTERN.matcher(StrUtil.trim(url));
        return matcher.find() ? matcher.group(1) : "";
    }

    private String trimTrailingSlash(String value) {
        String result = StrUtil.trim(value);
        while (result.endsWith("/")) {
            result = result.substring(0, result.length() - 1);
        }
        return result;
    }

    private String quoteIdent(String name) {
        return "`" + name.replace("`", "``") + "`";
    }

    private byte[] readEntry(ZipInputStream zip) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int read;
        while ((read = zip.read(buffer)) != -1) {
            if (out.size() + read > MAX_ENTRY_BYTES) return null;
            out.write(buffer, 0, read);
        }
        return out.toByteArray();
    }

    private String sanitizeFileName(String name) {
        String clean = name.replaceAll("[\\\\/:*?\"<>|\\u0000-\\u001F]", "_").trim();
        return StrUtil.isBlank(clean) || ".".equals(clean) || "..".equals(clean) ? "" : clean;
    }

    private Path copyToTemp(MultipartFile file, String prefix, String suffix) {
        try {
            Path temp = Files.createTempFile(prefix, suffix);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, temp, StandardCopyOption.REPLACE_EXISTING);
            }
            return temp;
        } catch (IOException e) {
            throw new CommonException("读取上传文件失败：" + e.getMessage());
        }
    }

    private void deleteQuietly(Path file) {
        try {
            Files.deleteIfExists(file);
        } catch (IOException e) {
            log.warn("删除导入临时文件失败：{}", file, e);
        }
    }

    private void fail(String ticket, String message) {
        commonCacheOperator.put(TICKET_KEY_PREFIX + ticket, toMap(ImportStatus.failure(message)), TICKET_TTL_SECONDS);
    }
}
