package vip.xiaonuo.biz.modular.dataimport.service.impl;

import cn.hutool.core.convert.Convert;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import jakarta.annotation.PreDestroy;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import vip.xiaonuo.biz.modular.asset.util.ByteArrayMultipartFile;
import vip.xiaonuo.biz.modular.dataimport.pojo.ImportStatus;
import vip.xiaonuo.biz.modular.dataimport.service.BizDataImportService;
import vip.xiaonuo.biz.modular.dataimport.util.SqlScriptRunner;
import vip.xiaonuo.biz.modular.export.service.impl.BizDataExportServiceImpl;
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
        Set<String> oldFileIds = new HashSet<>();
        /** 已从新 ID 接管存储信息、需要保留不删的源系统文件 ID */
        Set<String> preservedIds = new HashSet<>();
        Map<String, String> entryToOldId = new HashMap<>();
        Map<String, String> oldIdToNewUrl = new HashMap<>();
        boolean hasManifest = false;
        if (overwrite) {
            JSONArray oldFiles = devFileApi.getAllFiles("USER");
            if (oldFiles != null) {
                for (int i = 0; i < oldFiles.size(); i++) {
                    String id = oldFiles.getJSONObject(i).getStr("id");
                    if (StrUtil.isNotBlank(id)) oldFileIds.add(id);
                }
            }
        }
        try (ZipInputStream zip = new ZipInputStream(Files.newInputStream(zipFile), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                String rawName = entry.getName();
                if (entry.isDirectory() || rawName.endsWith("/")) {
                    zip.closeEntry();
                    continue;
                }
                if (BizDataExportServiceImpl.FILE_MAP_ENTRY.equals(rawName)) {
                    entryToOldId.putAll(parseFileMap(readEntry(zip)));
                    hasManifest = true;
                    zip.closeEntry();
                    continue;
                }
                if (BizDataExportServiceImpl.DATABASE_ENTRY.equals(rawName)) {
                    zip.closeEntry();
                    continue;
                }
                if (rawName.endsWith("清单.txt")) {
                    zip.closeEntry();
                    continue;
                }
                String fileName = sanitizeFileName(rawName.substring(Math.max(0, rawName.lastIndexOf('/') + 1)));
                if (StrUtil.isBlank(fileName)) {
                    skipped++;
                    zip.closeEntry();
                    continue;
                }
                byte[] bytes = readEntry(zip);
                if (bytes == null) {
                    log.warn("导入跳过超大文件：{}", rawName);
                    skipped++;
                    zip.closeEntry();
                    continue;
                }
                String id = devFileApi.uploadAssetReturnId(null,
                        new ByteArrayMultipartFile(bytes, "file", fileName, "application/octet-stream"),
                        "USER", null);
                if (StrUtil.isNotBlank(id)) {
                    newIds.add(id);
                    imported++;
                    String oldId = entryToOldId.get(rawName);
                    if (StrUtil.isNotBlank(oldId)) {
                        if (adoptFileIdentity(oldId, id)) {
                            // 旧 ID 保留，下载地址里的 ID 和签名都不变，无需重写
                            preservedIds.add(oldId);
                            JSONObject oldInfo = devFileApi.getFileInfoById(oldId);
                            String oldUrl = oldInfo == null ? null : oldInfo.getStr("downloadPath");
                            if (StrUtil.isNotBlank(oldUrl)) oldIdToNewUrl.put(oldId, oldUrl);
                        } else {
                            // 旧记录不存在时退回换新 ID 的方案
                            JSONObject info = devFileApi.getFileInfoById(id);
                            String newUrl = info == null ? null : info.getStr("downloadPath");
                            if (StrUtil.isNotBlank(newUrl)) oldIdToNewUrl.put(oldId, newUrl);
                        }
                    }
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
        // 先把业务表里的旧文件地址换成新地址，再删旧文件记录，否则引用会全部失效
        int rewritten = rewriteFileReferences(oldIdToNewUrl);
        if (overwrite) {
            for (String id : oldFileIds) {
                if (newIds.contains(id) || preservedIds.contains(id)) continue;
                try {
                    devFileApi.deleteAbsoluteById(id);
                } catch (Exception e) {
                    log.warn("覆盖导入时删除旧文件失败：{}，原因：{}", id, e.getMessage());
                }
            }
        }

        String message = "成功导入 " + imported + " 个文件" + (skipped > 0 ? "，跳过 " + skipped + " 个" : "")
                + "，重建文件引用 " + rewritten + " 处，保留原文件 ID " + preservedIds.size() + " 个";
        if (!hasManifest) message += "（文件包无映射清单，旧引用未重建）";
        commonCacheOperator.put(TICKET_KEY_PREFIX + ticket, toMap(ImportStatus.success(message, imported)), TICKET_TTL_SECONDS);
    }

    /**
     * 把新上传文件的存储信息写回源系统文件 ID。
     * <p>下载签名只由文件 ID 生成，保留 ID 即保留原签名；STORAGE_PATH 按当前系统重新生成，
     * 因此 Linux 与 Windows 互相迁移后，原下载地址仍然有效。</p>
     *
     * @return 是否成功由旧 ID 接管新文件
     */
    private boolean adoptFileIdentity(String oldId, String newId) {
        JSONObject source = devFileApi.getFileInfoById(newId);
        JSONObject target = devFileApi.getFileInfoById(oldId);
        if (source == null || source.isEmpty() || target == null || target.isEmpty()) return false;
        String newStoragePath = source.getStr("storagePath");
        String newFileKey = source.getStr("fileKey");
        if (StrUtil.isBlank(newStoragePath) || StrUtil.isBlank(newFileKey)) return false;
        String sql = "UPDATE DEV_FILE SET ENGINE=?, BUCKET=?, FILE_KEY=?, NAME=?, SUFFIX=?, OBJ_NAME=?, "
                + "STORAGE_PATH=?, SIZE_KB=?, SIZE_INFO=?, THUMBNAIL=NULL WHERE ID=?";
        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, source.getStr("engine"));
            statement.setString(2, source.getStr("bucket"));
            statement.setString(3, newFileKey);
            statement.setString(4, source.getStr("name"));
            statement.setString(5, source.getStr("suffix"));
            statement.setString(6, source.getStr("objName"));
            statement.setString(7, newStoragePath);
            statement.setString(8, source.getStr("sizeKb"));
            statement.setString(9, source.getStr("sizeInfo"));
            statement.setString(10, oldId);
            if (statement.executeUpdate() == 0) return false;
        } catch (Exception e) {
            log.warn("保留源文件 ID 失败：{}，原因：{}", oldId, e.getMessage());
            return false;
        }
        // 源系统的缩略图地址在新环境无效，按当前存储重新生成（非图片会自动跳过）
        try {
            devFileApi.generateThumbnail(oldId);
        } catch (Exception e) {
            log.warn("重建缩略图失败：{}，原因：{}", oldId, e.getMessage());
        }
        // 只删除临时登记记录，物理文件已交给旧 ID 继续引用
        try (Connection connection = dataSource.getConnection();
             PreparedStatement statement = connection.prepareStatement("DELETE FROM DEV_FILE WHERE ID=?")) {
            statement.setString(1, newId);
            statement.executeUpdate();
        } catch (Exception e) {
            log.warn("清理临时文件记录失败：{}，原因：{}", newId, e.getMessage());
        }
        return true;
    }

    /** 解析导出包首个条目的文件映射：ZIP 路径 -> 源系统文件 ID */
    private Map<String, String> parseFileMap(byte[] bytes) {
        Map<String, String> result = new HashMap<>();
        if (bytes == null || bytes.length == 0) return result;
        try {
            JSONArray rows = JSONUtil.parseArray(new String(bytes, StandardCharsets.UTF_8));
            for (int i = 0; i < rows.size(); i++) {
                JSONObject row = rows.getJSONObject(i);
                String entryName = row.getStr("entryName");
                String id = row.getStr("id");
                if (StrUtil.isNotBlank(entryName) && StrUtil.isNotBlank(id)) result.put(entryName, id);
            }
        } catch (Exception e) {
            log.warn("解析文件映射清单失败：{}", e.getMessage());
        }
        return result;
    }

    /** 把业务表里指向旧文件 ID 的下载地址整体换成导入后新生成的文件地址 */
    private int rewriteFileReferences(Map<String, String> oldIdToNewUrl) {
        if (oldIdToNewUrl.isEmpty()) return 0;
        Map<String, String> upperMap = new HashMap<>();
        oldIdToNewUrl.forEach((oldId, newUrl) -> upperMap.put(oldId.toUpperCase(Locale.ROOT), newUrl));
        StringBuilder alternation = new StringBuilder();
        for (String id : upperMap.keySet()) {
            if (alternation.length() > 0) alternation.append('|');
            alternation.append(Pattern.quote(id));
        }
        Pattern pattern = Pattern.compile("(?i)(?:https?://[^\\s\"'<>\\\\]*)?/dev/file/download\\?id=("
                + alternation + ")(?:&[^\\s\"'<>\\\\]*)?");
        int rewritten = 0;
        try (Connection connection = dataSource.getConnection()) {
            for (String[] target : findUrlColumnsWithPk(connection)) {
                rewritten += rewriteColumn(connection, target[0], target[1], target[2], pattern, upperMap);
            }
        } catch (Exception e) {
            log.warn("重写文件引用失败：{}", e.getMessage());
        }
        return rewritten;
    }

    /** 找出带单列主键的文本列，只在这些列里扫描和回写 URL */
    private List<String[]> findUrlColumnsWithPk(Connection connection) throws Exception {
        List<String[]> columns = new ArrayList<>();
        Map<String, String> pkByTable = new HashMap<>();
        try (ResultSet resultSet = connection.getMetaData().getPrimaryKeys(connection.getCatalog(), null, "%")) {
            while (resultSet.next()) {
                String table = resultSet.getString("TABLE_NAME");
                String pk = resultSet.getString("COLUMN_NAME");
                if (StrUtil.isBlank(table) || StrUtil.isBlank(pk)) continue;
                // 复合主键无法用单列定位，跳过
                pkByTable.merge(table, pk, (old, next) -> old.equals(next) ? old : "");
            }
        }
        try (ResultSet resultSet = connection.getMetaData().getColumns(connection.getCatalog(), null, "%", null)) {
            while (resultSet.next()) {
                if (!isTextType(resultSet.getInt("DATA_TYPE"))) continue;
                String table = resultSet.getString("TABLE_NAME");
                String column = resultSet.getString("COLUMN_NAME");
                String pk = pkByTable.get(table);
                // DEV_FILE 的地址由文件记录自己维护，不能指到别的文件上
                if ("DEV_FILE".equalsIgnoreCase(table)) continue;
                if (StrUtil.isBlank(table) || StrUtil.isBlank(column) || StrUtil.isBlank(pk)
                        || !isUrlColumn(column)) continue;
                columns.add(new String[]{table, column, pk});
            }
        }
        return columns;
    }

    private int rewriteColumn(Connection connection, String table, String column, String pk,
                              Pattern pattern, Map<String, String> upperMap) {
        String qTable = quoteIdent(table);
        String qColumn = quoteIdent(column);
        String select = "SELECT " + quoteIdent(pk) + ", " + qColumn + " FROM " + qTable
                + " WHERE " + qColumn + " LIKE '%/dev/file/download%'";
        List<Object[]> updates = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(select);
             ResultSet resultSet = statement.executeQuery()) {
            while (resultSet.next()) {
                Object key = resultSet.getObject(1);
                String value = resultSet.getString(2);
                if (key == null || value == null) continue;
                Matcher matcher = pattern.matcher(value);
                StringBuffer buffer = new StringBuffer();
                boolean changed = false;
                while (matcher.find()) {
                    String newUrl = upperMap.get(matcher.group(1).toUpperCase(Locale.ROOT));
                    if (StrUtil.isBlank(newUrl)) continue;
                    matcher.appendReplacement(buffer, Matcher.quoteReplacement(newUrl));
                    changed = true;
                }
                if (!changed) continue;
                matcher.appendTail(buffer);
                updates.add(new Object[]{key, buffer.toString()});
            }
        } catch (Exception e) {
            log.warn("扫描文件引用失败：{}.{}，原因：{}", table, column, e.getMessage());
            return 0;
        }
        if (updates.isEmpty()) return 0;
        int count = 0;
        try (PreparedStatement statement = connection.prepareStatement(
                "UPDATE " + qTable + " SET " + qColumn + " = ? WHERE " + quoteIdent(pk) + " = ?")) {
            for (Object[] row : updates) {
                statement.setString(1, (String) row[1]);
                statement.setObject(2, row[0]);
                statement.addBatch();
            }
            for (int affected : statement.executeBatch()) {
                if (affected > 0) count += affected;
            }
        } catch (Exception e) {
            log.warn("回写文件引用失败：{}.{}，原因：{}", table, column, e.getMessage());
        }
        return count;
    }

    @Override
    public String importMigrationFromPath(Path file) {
        if (!file.getFileName().toString().toLowerCase(Locale.ROOT).endsWith(".zip")) {
            deleteQuietly(file);
            throw new CommonException("请上传 .zip 格式的迁移包");
        }
        try {
            return start(ticket -> importMigrationAsync(file, ticket), file);
        } catch (RuntimeException e) {
            deleteQuietly(file);
            throw e;
        }
    }

    /** 完整迁移包：先恢复包内 SQL，再导入文件并重建引用；无 SQL 时按普通文件包处理 */
    private void importMigrationAsync(Path zipFile, String ticket) throws IOException {
        Path sqlFile = Files.createTempFile("biz-import-db-", ".sql");
        boolean hasSql = false;
        try (ZipInputStream zip = new ZipInputStream(Files.newInputStream(zipFile), StandardCharsets.UTF_8)) {
            ZipEntry entry;
            while ((entry = zip.getNextEntry()) != null) {
                if (BizDataExportServiceImpl.DATABASE_ENTRY.equals(entry.getName())) {
                    Files.copy(zip, sqlFile, StandardCopyOption.REPLACE_EXISTING);
                    hasSql = true;
                    break;
                }
                zip.closeEntry();
            }
        } catch (IOException e) {
            deleteQuietly(sqlFile);
            throw new CommonException("读取迁移包失败：" + e.getMessage());
        }
        if (!hasSql) {
            deleteQuietly(sqlFile);
            importFilesAsync(zipFile, true, ticket);
            return;
        }
        // SQL 阶段不写完成状态，避免前端提前结束轮询
        int[] dbResult = restoreDatabaseInternal(sqlFile);
        log.info("完整迁移包数据库恢复完成，执行 {} 条语句，重写地址 {} 处", dbResult[0], dbResult[1]);
        importFilesAsync(zipFile, true, ticket);
    }

    private void restoreDatabaseAsync(Path sqlFile, String ticket) throws IOException {
        int[] result = restoreDatabaseInternal(sqlFile);
        String message = "数据库恢复完成，共执行 " + result[0] + " 条语句";
        if (result[1] > 0) {
            message += "，重写文件地址 " + result[1] + " 处";
        }
        commonCacheOperator.put(TICKET_KEY_PREFIX + ticket,
                toMap(ImportStatus.success(message, result[0])), TICKET_TTL_SECONDS);
    }

    /** 执行 SQL 恢复但不写任务状态，返回 [语句数, 重写地址数] */
    private int[] restoreDatabaseInternal(Path sqlFile) throws IOException {
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
        return new int[]{executed, rewritten};
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
