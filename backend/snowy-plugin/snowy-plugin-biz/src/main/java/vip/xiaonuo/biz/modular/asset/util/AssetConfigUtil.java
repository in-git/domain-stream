package vip.xiaonuo.biz.modular.asset.util;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONObject;

/**
 * 采集配置读取：优先任务配置，其次环境变量，最后默认值
 *
 * @author domain-stream
 * @date 2026/11/23
 */
public class AssetConfigUtil {

    private AssetConfigUtil() {
    }

    public static String get(JSONObject config, String key, String defaultValue) {
        if (config != null && StrUtil.isNotBlank(config.getStr(key))) {
            return config.getStr(key);
        }
        String env = System.getenv(toEnvName(key));
        if (StrUtil.isNotBlank(env)) {
            return env;
        }
        String property = System.getProperty(key);
        if (StrUtil.isNotBlank(property)) {
            return property;
        }
        return defaultValue;
    }

    public static int getInt(JSONObject config, String key, int defaultValue) {
        String value = get(config, key, null);
        if (StrUtil.isBlank(value)) {
            return defaultValue;
        }
        try {
            return Integer.parseInt(value.trim());
        } catch (NumberFormatException e) {
            return defaultValue;
        }
    }

    public static String toEnvName(String key) {
        return "ASSET_" + key.replace('.', '_').replace('-', '_').toUpperCase();
    }
}
