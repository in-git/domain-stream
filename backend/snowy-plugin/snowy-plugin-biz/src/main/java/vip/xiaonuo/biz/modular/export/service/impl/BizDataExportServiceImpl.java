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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
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

    /** ZIP 顶层目录，顺序即导出顺序 */
    private static final String[] CATEGORY_FOLDERS = {
            "图片", "视频", "音频", "文档", "压缩包", "字体", "其他"
    };

    /** 扩展名到分类的映射 */
    private static final Map<String, String> EXTENSION_CATEGORY = buildExtensionCategory();

    @Resource
    private DataSource dataSource;

    @Resource
    private DevFileApi devFileApi;

    @Override
    public void exportDatabase(HttpServletResponse response) throws IOException {
        Path sqlFile = Files.createTempFile("domain-stream-db-", ".sql");
        try {
            writeDatabaseDump(sqlFile);
            setDownloadHeaders(response, "domain-stream-db-" + LocalDateTime.now().format(FILE_TIME) + ".sql", "application/sql; charset=UTF-8");
            response.setContentLengthLong(Files.size(sqlFile));
            try (InputStream in = Files.newInputStream(sqlFile); OutputStream out = response.getOutputStream()) {
                IoUtil.copy(in, out);
            }
            response.flushBuffer();
        } finally {
            Files.deleteIfExists(sqlFile);
        }
    }

    @Override
    public void exportFiles(HttpServletResponse response) throws IOException {
        JSONArray files = devFileApi.getAllFiles("USER");
        Map<String, List<JSONObject>> grouped = new LinkedHashMap<>();
        for (String folder : CATEGORY_FOLDERS) {
            grouped.put(folder, new ArrayList<>());
        }
        if (files != null) {
            for (int i = 0; i < files.size(); i++) {
                JSONObject file = files.getJSONObject(i);
                if (file == null) continue;
                grouped.get(categoryOf(file)).add(file);
            }
        }

        List<String> failures = new ArrayList<>();
        setDownloadHeaders(response, "domain-stream-files-" + LocalDateTime.now().format(FILE_TIME) + ".zip", "application/zip");
        try (ZipOutputStream zip = new ZipOutputStream(response.getOutputStream(), StandardCharsets.UTF_8)) {
            for (String folder : CATEGORY_FOLDERS) {
                Set<String> usedNames = new HashSet<>();
                for (JSONObject file : grouped.get(folder)) {
                    String entryName = folder + "/" + uniqueName(file, usedNames);
                    zip.putNextEntry(new ZipEntry(entryName));
                    try {
                        devFileApi.writeFileToStream(
                                file.getStr("engine"),
                                file.getStr("bucket"),
                                file.getStr("fileKey"),
                                zip
                        );
                    } catch (Exception e) {
                        log.warn("导出文件失败：{}，原因：{}", entryName, e.getMessage());
                        failures.add(entryName + "（" + StrUtil.blankToDefault(e.getMessage(), "读取失败") + "）");
                    } finally {
                        zip.closeEntry();
                    }
                }
            }
            writeManifest(zip, grouped, failures);
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

    /** 根据后缀归类，未知后缀回退到 DevFile.category */
    private String categoryOf(JSONObject file) {
        String suffix = lower(file.getStr("suffix"));
        if (StrUtil.isBlank(suffix)) {
            String name = StrUtil.blankToDefault(file.getStr("objName"),
                    StrUtil.blankToDefault(file.getStr("name"), ""));
            int dot = name.lastIndexOf('.');
            if (dot >= 0 && dot < name.length() - 1) suffix = name.substring(dot + 1).toLowerCase(Locale.ROOT);
        }
        String category = EXTENSION_CATEGORY.get(suffix);
        if (StrUtil.isNotBlank(category)) return category;
        String dbCategory = StrUtil.blankToDefault(file.getStr("category"), "").toUpperCase(Locale.ROOT);
        switch (dbCategory) {
            case "IMAGE": return "图片";
            case "VIDEO": return "视频";
            case "AUDIO": return "音频";
            case "DOC": return "文档";
            default: return "其他";
        }
    }

    private String uniqueName(JSONObject file, Set<String> used) {
        String raw = StrUtil.blankToDefault(file.getStr("objName"),
                StrUtil.blankToDefault(file.getStr("name"), file.getStr("id") + "." + StrUtil.blankToDefault(file.getStr("suffix"), "bin")));
        String base = raw.replaceAll("[\\\\/:*?\"<>|\\u0000-\\u001F]", "_");
        if (StrUtil.isBlank(base) || ".".equals(base) || "..".equals(base)) {
            base = "file_" + file.getStr("id") + ".bin";
        }
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

    private void writeManifest(ZipOutputStream zip, Map<String, List<JSONObject>> grouped, List<String> failures)
            throws IOException {
        StringBuilder builder = new StringBuilder("域流文件资源导出清单\n");
        builder.append("导出时间：").append(LocalDateTime.now()).append('\n');
        builder.append("分类规则：按文件后缀归类，未知后缀回退到文件记录的 category 字段\n\n");
        int total = 0;
        for (String folder : CATEGORY_FOLDERS) {
            int count = grouped.get(folder).size();
            total += count;
            builder.append(folder).append("：").append(count).append(" 个\n");
        }
        builder.append("合计：").append(total).append(" 个\n");
        if (!failures.isEmpty()) {
            builder.append("\n读取失败 ").append(failures.size()).append(" 个：\n");
            for (String failure : failures) builder.append("- ").append(failure).append('\n');
        }
        zip.putNextEntry(new ZipEntry("导出清单.txt"));
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

    private String lower(String value) {
        return StrUtil.blankToDefault(value, "").toLowerCase(Locale.ROOT);
    }

    private static Map<String, String> buildExtensionCategory() {
        Map<String, String> map = new LinkedHashMap<>();
        putAll(map, "图片", "jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "ico", "avif", "heic", "tif", "tiff");
        putAll(map, "视频", "mp4", "webm", "mov", "avi", "mkv", "flv", "wmv", "m4v", "3gp", "mpg", "mpeg", "ts");
        putAll(map, "音频", "mp3", "wav", "ogg", "flac", "aac", "m4a", "wma", "aiff");
        putAll(map, "文档", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md", "csv", "rtf", "epub");
        putAll(map, "压缩包", "zip", "rar", "7z", "tar", "gz", "bz2", "xz");
        putAll(map, "字体", "ttf", "otf", "woff", "woff2", "eot");
        return map;
    }

    private static void putAll(Map<String, String> map, String category, String... extensions) {
        for (String extension : extensions) map.put(extension, category);
    }
}
