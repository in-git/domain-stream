package vip.xiaonuo.biz.modular.export.service.impl;

import cn.hutool.core.io.IoUtil;
import cn.hutool.core.util.HexUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vip.xiaonuo.biz.modular.export.service.BizDataExportService;
import vip.xiaonuo.dev.api.DevFileApi;

import javax.sql.DataSource;
import java.io.BufferedWriter;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Types;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/**
 * 数据导出服务实现。
 *
 * <p>数据库导出走 JDBC 元数据 + 逐表读取，生成带建表语句和 INSERT 的 SQL 脚本；
 * 文件导出走底座文件 API，按扩展名归类后流式写入 ZIP，避免整包占用内存。</p>
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Slf4j
@Service
public class BizDataExportServiceImpl implements BizDataExportService {

    private static final DateTimeFormatter FILE_TIME = DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");
    /** 文件映射清单固定放在 ZIP 第一个条目，导入端先读它再处理文件 */
    public static final String FILE_MAP_ENTRY = "迁移文件映射.json";
    /** 完整迁移包里的 SQL 条目名，导入端据此识别 */
    public static final String DATABASE_ENTRY = "database.sql";

    @Resource
    private DataSource dataSource;

    @Resource
    private DevFileApi devFileApi;

    @Override
    public void exportDatabase(HttpServletResponse response) throws IOException {
        Path sqlFile = Files.createTempFile("domain-stream-db-", ".sql");
        try {
            writeDatabaseDump(sqlFile);
            streamTempFile(response, sqlFile, "domain-stream-db-" + LocalDateTime.now().format(FILE_TIME) + ".sql", "application/sql; charset=UTF-8");
        } finally {
            Files.deleteIfExists(sqlFile);
        }
    }

    @Override
    public void exportFiles(HttpServletResponse response) throws IOException {
        JSONArray files = devFileApi.getAllFiles("USER");
        Path zipFile = Files.createTempFile("domain-stream-full-directory-", ".zip");
        try {
            Set<String> usedEntries = new HashSet<>();
            Set<String> writtenDirs = new HashSet<>();
            List<String> failures = new ArrayList<>();
            // 先算好每个文件的 ZIP 路径，才能把映射清单放在第一个条目
            List<String> entryNames = new ArrayList<>();
            JSONArray fileMap = new JSONArray();
            if (files != null) {
                for (int i = 0; i < files.size(); i++) {
                    JSONObject file = files.getJSONObject(i);
                    if (file == null) {
                        entryNames.add("");
                        continue;
                    }
                    String entryName = uniquePathName(file, directoryOf(file), usedEntries);
                    entryNames.add(entryName);
                    JSONObject row = new JSONObject();
                    row.set("id", file.getStr("id"));
                    row.set("downloadPath", file.getStr("downloadPath"));
                    row.set("entryName", entryName);
                    fileMap.add(row);
                }
            }
            try (ZipOutputStream zip = new ZipOutputStream(Files.newOutputStream(zipFile), StandardCharsets.UTF_8)) {
                zip.putNextEntry(new ZipEntry(FILE_MAP_ENTRY));
                zip.write(fileMap.toString().getBytes(StandardCharsets.UTF_8));
                zip.closeEntry();
                if (files != null) {
                    for (int i = 0; i < files.size(); i++) {
                        JSONObject file = files.getJSONObject(i);
                        if (file == null) continue;
                        String entryName = entryNames.get(i);
                        writeDirectoryEntries(zip, directoryOf(file), writtenDirs);
                        zip.putNextEntry(new ZipEntry(entryName));
                        try {
                            devFileApi.writeFileToStream(
                                    file.getStr("engine"),
                                    file.getStr("bucket"),
                                    file.getStr("fileKey"),
                                    zip
                            );
                        } catch (Exception e) {
                            log.warn("导出完整目录失败：{}，原因：{}", entryName, e.getMessage());
                            failures.add(entryName + "（" + StrUtil.blankToDefault(e.getMessage(), "读取失败") + "）");
                        } finally {
                            zip.closeEntry();
                        }
                    }
                }
                writeFailureManifest(zip, failures);
            }
            streamTempFile(response, zipFile,
                    "domain-stream-full-directory-" + LocalDateTime.now().format(FILE_TIME) + ".zip",
                    "application/zip");
        } finally {
            Files.deleteIfExists(zipFile);
        }
    }

    @Override
    public void exportMigration(HttpServletResponse response) throws IOException {
        Path sqlFile = Files.createTempFile("domain-stream-db-", ".sql");
        Path zipFile = Files.createTempFile("domain-stream-migration-", ".zip");
        try {
            writeDatabaseDump(sqlFile);
            JSONArray files = devFileApi.getAllFiles("USER");
            Set<String> usedEntries = new HashSet<>();
            Set<String> writtenDirs = new HashSet<>();
            List<String> failures = new ArrayList<>();
            List<String> entryNames = new ArrayList<>();
            JSONArray fileMap = new JSONArray();
            if (files != null) {
                for (int i = 0; i < files.size(); i++) {
                    JSONObject file = files.getJSONObject(i);
                    if (file == null) {
                        entryNames.add("");
                        continue;
                    }
                    String entryName = uniquePathName(file, directoryOf(file), usedEntries);
                    entryNames.add(entryName);
                    JSONObject row = new JSONObject();
                    row.set("id", file.getStr("id"));
                    row.set("downloadPath", file.getStr("downloadPath"));
                    row.set("entryName", entryName);
                    fileMap.add(row);
                }
            }
            try (ZipOutputStream zip = new ZipOutputStream(Files.newOutputStream(zipFile), StandardCharsets.UTF_8)) {
                // 固定第一个条目为 SQL，导入端据此识别完整迁移包
                zip.putNextEntry(new ZipEntry(DATABASE_ENTRY));
                Files.copy(sqlFile, zip);
                zip.closeEntry();
                zip.putNextEntry(new ZipEntry(FILE_MAP_ENTRY));
                zip.write(fileMap.toString().getBytes(StandardCharsets.UTF_8));
                zip.closeEntry();
                if (files != null) {
                    for (int i = 0; i < files.size(); i++) {
                        JSONObject file = files.getJSONObject(i);
                        if (file == null) continue;
                        String entryName = entryNames.get(i);
                        writeDirectoryEntries(zip, directoryOf(file), writtenDirs);
                        zip.putNextEntry(new ZipEntry(entryName));
                        try {
                            devFileApi.writeFileToStream(
                                    file.getStr("engine"),
                                    file.getStr("bucket"),
                                    file.getStr("fileKey"),
                                    zip
                            );
                        } catch (Exception e) {
                            log.warn("导出迁移包文件失败：{}，原因：{}", entryName, e.getMessage());
                            failures.add(entryName + "（" + StrUtil.blankToDefault(e.getMessage(), "读取失败") + "）");
                        } finally {
                            zip.closeEntry();
                        }
                    }
                }
                writeFailureManifest(zip, failures);
            }
            streamTempFile(response, zipFile,
                    "domain-stream-migration-" + LocalDateTime.now().format(FILE_TIME) + ".zip",
                    "application/zip");
        } finally {
            Files.deleteIfExists(sqlFile);
            Files.deleteIfExists(zipFile);
        }
    }

    @Override
    public void exportUserFiles(HttpServletResponse response) throws IOException {
        JSONArray files = devFileApi.getAllFiles("USER");
        Path zipFile = Files.createTempFile("domain-stream-user-files-", ".zip");
        try {
            Set<String> usedNames = new HashSet<>();
            try (ZipOutputStream zip = new ZipOutputStream(Files.newOutputStream(zipFile), StandardCharsets.UTF_8)) {
                if (files != null) {
                    for (int i = 0; i < files.size(); i++) {
                        JSONObject file = files.getJSONObject(i);
                        if (file == null) continue;
                        String entryName = uniqueName(file, usedNames);
                        zip.putNextEntry(new ZipEntry(entryName));
                        try {
                            devFileApi.writeFileToStream(
                                    file.getStr("engine"),
                                    file.getStr("bucket"),
                                    file.getStr("fileKey"),
                                    zip
                            );
                        } catch (Exception e) {
                            log.warn("导出用户文件失败：{}，原因：{}", entryName, e.getMessage());
                        } finally {
                            zip.closeEntry();
                        }
                    }
                }
            }
            streamTempFile(response, zipFile, "domain-stream-user-files-" + LocalDateTime.now().format(FILE_TIME) + ".zip", "application/zip");
        } finally {
            Files.deleteIfExists(zipFile);
        }
    }

    /** 流式输出已生成的文件，并带上 Content-Length，浏览器才能显示真实下载进度 */
    private void streamTempFile(HttpServletResponse response, Path file, String filename, String contentType) throws IOException {
        setDownloadHeaders(response, filename, contentType);
        response.setContentLengthLong(Files.size(file));
        try (InputStream in = Files.newInputStream(file); OutputStream out = response.getOutputStream()) {
            IoUtil.copy(in, out);
        }
        response.flushBuffer();
    }

    /** 生成数据库 SQL 脚本 */
    private void writeDatabaseDump(Path file) throws IOException {
        try (Connection connection = dataSource.getConnection();
             BufferedWriter writer = Files.newBufferedWriter(file, StandardCharsets.UTF_8)) {
            String catalog = connection.getCatalog();
            List<String> tables = listTables(connection, catalog);

            writer.write("-- Domain Stream database export\n");
            writer.write("-- Exported at: " + LocalDateTime.now() + "\n");
            writer.write("-- Database: " + StrUtil.blankToDefault(catalog, "unknown") + "\n\n");
            writer.write("SET NAMES utf8mb4;\n");
            writer.write("SET FOREIGN_KEY_CHECKS = 0;\n\n");

            writer.write("-- ----------------------------\n");
            writer.write("-- Table structure\n");
            writer.write("-- ----------------------------\n\n");
            for (String table : tables) {
                writer.write("-- Table: " + table + "\n");
                writer.write("DROP TABLE IF EXISTS " + quoteIdent(table) + ";\n");
                writer.write(createTableSql(connection, catalog, table) + ";\n\n");
            }

            writer.write("-- ----------------------------\n");
            writer.write("-- Table data\n");
            writer.write("-- ----------------------------\n\n");
            for (String table : tables) {
                writeTableData(connection, table, writer);
            }

            writer.write("SET FOREIGN_KEY_CHECKS = 1;\n");
        } catch (SQLException e) {
            throw new IOException("读取数据库失败：" + e.getMessage(), e);
        }
    }

    /** 读取当前库的全部业务表 */
    private List<String> listTables(Connection connection, String catalog) throws SQLException {
        List<String> tables = new ArrayList<>();
        DatabaseMetaData metaData = connection.getMetaData();
        try (ResultSet rs = metaData.getTables(catalog, null, "%", new String[]{"TABLE"})) {
            while (rs.next()) {
                String tableName = rs.getString("TABLE_NAME");
                if (StrUtil.isNotBlank(tableName)) {
                    tables.add(tableName);
                }
            }
        }
        Collections.sort(tables, String.CASE_INSENSITIVE_ORDER);
        return tables;
    }

    /** MySQL 优先用 SHOW CREATE TABLE，保留索引、注释和自增属性 */
    private String createTableSql(Connection connection, String catalog, String table) throws SQLException {
        DatabaseMetaData metaData = connection.getMetaData();
        String product = StrUtil.blankToDefault(metaData.getDatabaseProductName(), "").toLowerCase(Locale.ROOT);
        if (product.contains("mysql") || product.contains("mariadb")) {
            String sql = "SHOW CREATE TABLE " + quoteIdent(table);
            try (Statement statement = connection.createStatement(); ResultSet rs = statement.executeQuery(sql)) {
                if (rs.next()) {
                    return stripSemicolon(rs.getString(2));
                }
            } catch (SQLException ignored) {
                // 权限不足时回退到通用元数据生成
            }
        }
        return generateCreateTable(metaData, catalog, table);
    }

    /** 通用建表语句回退方案 */
    private String generateCreateTable(DatabaseMetaData metaData, String catalog, String table) throws SQLException {
        StringBuilder builder = new StringBuilder("CREATE TABLE ").append(quoteIdent(table)).append(" (\n");
        List<String> parts = new ArrayList<>();
        try (ResultSet rs = metaData.getColumns(catalog, null, table, null)) {
            while (rs.next()) {
                StringBuilder part = new StringBuilder("  ")
                        .append(quoteIdent(rs.getString("COLUMN_NAME")))
                        .append(' ')
                        .append(rs.getString("TYPE_NAME"));
                int size = rs.getInt("COLUMN_SIZE");
                int digits = rs.getInt("DECIMAL_DIGITS");
                String typeName = StrUtil.blankToDefault(rs.getString("TYPE_NAME"), "").toUpperCase(Locale.ROOT);
                boolean needSize = typeName.contains("CHAR") || typeName.contains("BINARY");
                if (needSize && size > 0 && !typeName.contains("TEXT") && !typeName.contains("BLOB")) {
                    part.append('(').append(size).append(')');
                } else if ((typeName.contains("DECIMAL") || typeName.contains("NUMERIC")) && size > 0) {
                    part.append('(').append(size).append(',').append(Math.max(digits, 0)).append(')');
                }
                if ("NO".equalsIgnoreCase(rs.getString("IS_NULLABLE"))) {
                    part.append(" NOT NULL");
                }
                if ("YES".equalsIgnoreCase(rs.getString("IS_AUTOINCREMENT"))) {
                    part.append(" AUTO_INCREMENT");
                }
                parts.add(part.toString());
            }
        }
        Set<String> primaryKeys = new HashSet<>();
        try (ResultSet rs = metaData.getPrimaryKeys(catalog, null, table)) {
            while (rs.next()) {
                primaryKeys.add(rs.getString("COLUMN_NAME"));
            }
        }
        if (!primaryKeys.isEmpty()) {
            parts.add("  PRIMARY KEY (" + String.join(", ", quoteIdentList(new ArrayList<>(primaryKeys))) + ")");
        }
        builder.append(String.join(",\n", parts)).append("\n)");
        return builder.toString();
    }

    /** 逐行写出表数据，分批 INSERT，避免单条 SQL 过长 */
    private void writeTableData(Connection connection, String table, BufferedWriter writer) throws SQLException, IOException {
        String selectSql = "SELECT * FROM " + quoteIdent(table);
        try (PreparedStatement statement = connection.prepareStatement(selectSql,
                ResultSet.TYPE_FORWARD_ONLY, ResultSet.CONCUR_READ_ONLY)) {
            statement.setFetchSize(1000);
            try (ResultSet rs = statement.executeQuery()) {
                ResultSetMetaData metaData = rs.getMetaData();
                int columnCount = metaData.getColumnCount();
                List<String> columns = new ArrayList<>();
                for (int i = 1; i <= columnCount; i++) {
                    columns.add(quoteIdent(metaData.getColumnLabel(i)));
                }
                if (columns.isEmpty()) return;

                String insertPrefix = "INSERT INTO " + quoteIdent(table) + " (" + String.join(", ", columns) + ") VALUES ";
                int batch = 0;
                while (rs.next()) {
                    if (batch == 0) writer.write(insertPrefix);
                    else writer.write(",\n");
                    writer.write("(");
                    for (int i = 1; i <= columnCount; i++) {
                        if (i > 1) writer.write(", ");
                        writeSqlValue(writer, rs, metaData, i);
                    }
                    writer.write(")");
                    batch++;
                    if (batch >= 200) {
                        writer.write(";\n");
                        batch = 0;
                    }
                }
                if (batch > 0) writer.write(";\n");
            }
        }
    }

    /** 按 JDBC 类型输出 SQL 字面量 */
    private void writeSqlValue(BufferedWriter writer, ResultSet rs, ResultSetMetaData metaData, int index)
            throws SQLException, IOException {
        Object value = rs.getObject(index);
        if (value == null) {
            writer.write("NULL");
            return;
        }
        int type = metaData.getColumnType(index);
        switch (type) {
            case Types.BIT:
            case Types.BOOLEAN:
                writer.write(rs.getBoolean(index) ? "1" : "0");
                break;
            case Types.TINYINT:
            case Types.SMALLINT:
            case Types.INTEGER:
            case Types.BIGINT:
            case Types.DECIMAL:
            case Types.NUMERIC:
            case Types.REAL:
            case Types.FLOAT:
            case Types.DOUBLE:
                writer.write(value.toString());
                break;
            case Types.BINARY:
            case Types.VARBINARY:
            case Types.LONGVARBINARY:
            case Types.BLOB:
                byte[] bytes = rs.getBytes(index);
                writer.write("0x" + HexUtil.encodeHexStr(bytes == null ? new byte[0] : bytes));
                break;
            default:
                writer.write("'" + escapeSql(rs.getString(index)) + "'");
        }
    }

    private String escapeSql(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\")
                .replace("'", "''")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
    }

    private String stripSemicolon(String sql) {
        String result = StrUtil.blankToDefault(sql, "").trim();
        while (result.endsWith(";")) {
            result = result.substring(0, result.length() - 1).trim();
        }
        return result;
    }

    private List<String> quoteIdentList(List<String> names) {
        List<String> quoted = new ArrayList<>();
        for (String name : names) quoted.add(quoteIdent(name));
        return quoted;
    }

    private String quoteIdent(String name) {
        return "`" + StrUtil.blankToDefault(name, "").replace("`", "``") + "`";
    }

    private String uniqueName(JSONObject file, Set<String> used) {
        String base = sanitizeSegment(file.getStr("name"));
        if (StrUtil.isBlank(base)) base = sanitizeSegment(file.getStr("objName"));
        if (StrUtil.isBlank(base)) {
            base = "file_" + file.getStr("id") + "." + StrUtil.blankToDefault(file.getStr("suffix"), "bin");
        }
        return uniqueWithSuffix(base, used);
    }

    /** 按文件存储键的父级路径还原目录，例如 2026/11/24/xxx.jpg -> 2026/11/24 */
    private String directoryOf(JSONObject file) {
        String fileKey = StrUtil.blankToDefault(file.getStr("fileKey"), "");
        List<String> segments = new ArrayList<>();
        for (String segment : fileKey.split("[\\\\/]+")) {
            String clean = sanitizeSegment(segment);
            if (StrUtil.isNotBlank(clean)) segments.add(clean);
        }
        // 最后一段是存储系统里的对象文件名，不是目录，必须排除
        if (segments.size() <= 1) return "";
        return String.join("/", segments.subList(0, segments.size() - 1));
    }

    /** 显式写出目录条目，让解压工具能直接看到完整文件夹 */
    private void writeDirectoryEntries(ZipOutputStream zip, String directory, Set<String> written) throws IOException {
        if (StrUtil.isBlank(directory)) return;
        StringBuilder current = new StringBuilder();
        for (String segment : directory.split("/")) {
            if (current.length() > 0) current.append('/');
            current.append(segment);
            String path = current + "/";
            if (written.add(path.toLowerCase(Locale.ROOT))) {
                zip.putNextEntry(new ZipEntry(path));
                zip.closeEntry();
            }
        }
    }

    private String uniquePathName(JSONObject file, String directory, Set<String> used) {
        String base = sanitizeSegment(file.getStr("name"));
        if (StrUtil.isBlank(base)) base = sanitizeSegment(file.getStr("objName"));
        if (StrUtil.isBlank(base)) {
            base = "file_" + file.getStr("id") + "." + StrUtil.blankToDefault(file.getStr("suffix"), "bin");
        }
        String unique = uniqueWithSuffix(base, used);
        return StrUtil.isBlank(directory) ? unique : directory + "/" + unique;
    }

    private String uniqueWithSuffix(String base, Set<String> used) {
        int dot = base.lastIndexOf('.');
        String stem = dot > 0 ? base.substring(0, dot) : base;
        String ext = dot > 0 ? base.substring(dot) : "";
        String candidate = base;
        int index = 2;
        while (!used.add(candidate.toLowerCase(Locale.ROOT))) {
            candidate = stem + "_" + index++ + ext;
        }
        return candidate;
    }

    private String sanitizeSegment(String value) {
        String clean = StrUtil.blankToDefault(value, "")
                .replaceAll("[\\\\/:*?\"<>|\\u0000-\\u001F]", "_")
                .trim();
        return ".".equals(clean) || "..".equals(clean) ? "" : clean;
    }

    /** 仅在部分文件读取失败时写入清单，不污染原样目录 */
    private void writeFailureManifest(ZipOutputStream zip, List<String> failures) throws IOException {
        if (failures.isEmpty()) return;
        StringBuilder builder = new StringBuilder("以下文件读取失败，未写入完整目录包：\n");
        for (String failure : failures) builder.append("- ").append(failure).append('\n');
        zip.putNextEntry(new ZipEntry("导出失败清单.txt"));
        zip.write(builder.toString().getBytes(StandardCharsets.UTF_8));
        zip.closeEntry();
    }

    private void setDownloadHeaders(HttpServletResponse response, String filename, String contentType) throws IOException {
        response.reset();
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(contentType);
        String encoded = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
        response.setHeader("Content-Disposition", "attachment; filename*=UTF-8''" + encoded);
    }
}
