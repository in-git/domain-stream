package vip.xiaonuo.biz.modular.dataimport.util;

import java.util.ArrayList;
import java.util.List;

/**
 * 把导出的 SQL 备份安全地切成单条语句并逐条执行。
 *
 * <p>备份中的字符串值包含 {@code \\n} 等转义序列，且分号不转义，
 * 因此简单按分号 split 会切断 SQL。这里按引号/注释状态逐字符扫描。</p>
 *
 * @author domain-stream
 * @date 2026/11/24
 */
public final class SqlScriptRunner {

    private SqlScriptRunner() {
    }

    public static List<String> split(String script) {
        List<String> statements = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        boolean inSingle = false;
        boolean inDouble = false;
        boolean inBacktick = false;
        boolean inLineComment = false;
        boolean inBlockComment = false;

        for (int i = 0; i < script.length(); i++) {
            char c = script.charAt(i);
            char next = i + 1 < script.length() ? script.charAt(i + 1) : '\0';

            if (inLineComment) {
                if (c == '\n' || c == '\r') {
                    inLineComment = false;
                    current.append(c);
                }
                continue;
            }
            if (inBlockComment) {
                if (c == '*' && next == '/') {
                    inBlockComment = false;
                    current.append(' ');
                    i++;
                }
                continue;
            }
            if (inSingle) {
                current.append(c);
                if (c == '\\' && next != '\0') {
                    current.append(next);
                    i++;
                } else if (c == '\'' && next == '\'') {
                    current.append(next);
                    i++;
                } else if (c == '\'') {
                    inSingle = false;
                }
                continue;
            }
            if (inDouble) {
                current.append(c);
                if (c == '\\' && next != '\0') {
                    current.append(next);
                    i++;
                } else if (c == '"' && next == '"') {
                    current.append(next);
                    i++;
                } else if (c == '"') {
                    inDouble = false;
                }
                continue;
            }
            if (inBacktick) {
                current.append(c);
                if (c == '`') {
                    if (next == '`') {
                        current.append(next);
                        i++;
                    } else {
                        inBacktick = false;
                    }
                }
                continue;
            }

            if (c == '-' && next == '-' && (i + 2 >= script.length() || Character.isWhitespace(script.charAt(i + 2)))) {
                inLineComment = true;
                i++;
                continue;
            }
            if (c == '#') {
                inLineComment = true;
                continue;
            }
            if (c == '/' && next == '*') {
                inBlockComment = true;
                current.append(' ');
                i++;
                continue;
            }
            if (c == '\'') {
                inSingle = true;
                current.append(c);
                continue;
            }
            if (c == '"') {
                inDouble = true;
                current.append(c);
                continue;
            }
            if (c == '`') {
                inBacktick = true;
                current.append(c);
                continue;
            }
            if (c == ';') {
                addStatement(statements, current);
                continue;
            }
            current.append(c);
        }
        addStatement(statements, current);
        return statements;
    }

    private static void addStatement(List<String> statements, StringBuilder current) {
        String statement = current.toString().trim();
        if (!statement.isEmpty()) {
            statements.add(statement);
        }
        current.setLength(0);
    }
}
