package vip.xiaonuo.biz.modular.config.service.impl;

import cn.hutool.core.convert.Convert;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vip.xiaonuo.biz.modular.config.param.BizConfigAddParam;
import vip.xiaonuo.biz.modular.config.param.BizConfigEditParam;
import vip.xiaonuo.biz.modular.config.param.BizConfigKeyParam;
import vip.xiaonuo.biz.modular.config.param.BizConfigSaveParam;
import vip.xiaonuo.biz.modular.config.result.BizConfigItemResult;
import vip.xiaonuo.biz.modular.config.result.PublicSystemInfoResult;
import vip.xiaonuo.biz.modular.config.service.BizConfigService;
import vip.xiaonuo.biz.modular.video.entity.BizVideo;
import vip.xiaonuo.biz.modular.video.mapper.BizVideoMapper;
import vip.xiaonuo.common.exception.CommonException;
import vip.xiaonuo.dev.api.DevConfigApi;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 页面配置Service实现
 * <p>
 * 通过 DevConfigApi 读写 dev_config 中的 CLIENT_CONFIG 配置：
 * - getValueByKey 读缓存，setValueByKey 写库并自动清理缓存，改完即时生效
 * - JSON 属性增删改查在本服务内串行执行，避免并发读改写覆盖
 *
 * @author domain-stream
 * @date 2026/11/20
 */
@Slf4j
@Service
public class BizConfigServiceImpl implements BizConfigService {

    /** 系统配置中承载页面 JSON 的配置键 */
    private static final String CLIENT_CONFIG_KEY = "CLIENT_CONFIG";

    /** 开屏画布配置键：值是一段 JSON 字符串，内部可能有图片节点引用视频模块素材 */
    private static final String SPLASH_CANVAS_KEY = "splashCanvas";

    /** 从素材地址中提取 dev_file 文件 ID：...download?id=xxx&sign=... */
    private static final Pattern FILE_ID_PATTERN = Pattern.compile("[?&]id=(\\d+)");

    @Resource
    private DevConfigApi devConfigApi;

    @Resource
    private BizVideoMapper bizVideoMapper;

    /** 读取配置 JSON；配置不存在或内容损坏时按空对象处理 */
    private JSONObject readJson() {
        String raw = devConfigApi.getValueByKey(CLIENT_CONFIG_KEY);
        if (StrUtil.isBlank(raw)) {
            return new JSONObject();
        }
        try {
            return JSONUtil.parseObj(raw);
        } catch (Exception e) {
            log.warn("页面配置 {} 不是合法JSON，按空对象处理：{}", CLIENT_CONFIG_KEY, raw, e);
            return new JSONObject();
        }
    }

    /** 写回配置 JSON（setValueByKey 会同步清理 Redis 缓存） */
    private void writeJson(JSONObject json) {
        devConfigApi.setValueByKey(CLIENT_CONFIG_KEY, json.toString());
    }

    @Override
    public synchronized List<BizConfigItemResult> list() {
        JSONObject json = readJson();
        List<BizConfigItemResult> result = new ArrayList<>();
        json.forEach((key, value) -> {
            BizConfigItemResult item = new BizConfigItemResult();
            item.setKey(key);
            item.setValue(Convert.toStr(value));
            result.add(item);
        });
        return result;
    }

    @Override
    public BizConfigItemResult detail(BizConfigKeyParam keyParam) {
        JSONObject json = readJson();
        if (!json.containsKey(keyParam.getKey())) {
            throw new CommonException("页面配置属性不存在，属性名为：{}", keyParam.getKey());
        }
        BizConfigItemResult item = new BizConfigItemResult();
        item.setKey(keyParam.getKey());
        item.setValue(Convert.toStr(json.get(keyParam.getKey())));
        return item;
    }

    @Override
    public String rawJson() {
        return readJson().toString();
    }

    @Override
    public synchronized void add(BizConfigAddParam addParam) {
        JSONObject json = readJson();
        if (json.containsKey(addParam.getKey())) {
            throw new CommonException("页面配置属性已存在，属性名为：{}", addParam.getKey());
        }
        json.set(addParam.getKey(), addParam.getValue());
        writeJson(json);
    }

    @Override
    public synchronized void edit(BizConfigEditParam editParam) {
        JSONObject json = readJson();
        if (!json.containsKey(editParam.getKey())) {
            throw new CommonException("页面配置属性不存在，属性名为：{}", editParam.getKey());
        }
        json.set(editParam.getKey(), editParam.getValue());
        writeJson(json);
    }

    @Override
    public synchronized void save(BizConfigSaveParam saveParam) {
        // 整体覆盖写入：属性不存在则新增、存在则更新，值允许为空
        JSONObject json = new JSONObject();
        if (saveParam.getItems() != null) {
            for (BizConfigSaveParam.BizConfigSaveItem item : saveParam.getItems()) {
                if (StrUtil.isBlank(item.getKey())) {
                    continue;
                }
                json.set(item.getKey(), StrUtil.blankToDefault(item.getValue(), ""));
            }
        }
        writeJson(json);
    }

    @Override
    public synchronized void delete(BizConfigKeyParam keyParam) {
        JSONObject json = readJson();
        if (!json.containsKey(keyParam.getKey())) {
            throw new CommonException("页面配置属性不存在，属性名为：{}", keyParam.getKey());
        }
        json.remove(keyParam.getKey());
        writeJson(json);
    }

    @Override
    public PublicSystemInfoResult publicSystemInfo() {
        JSONObject json = readJson();
        PublicSystemInfoResult result = new PublicSystemInfoResult();
        result.setSiteName(devConfigApi.getValueByKey("SNOWY_SYS_NAME"));
        result.setTitle(json.getStr("title", result.getSiteName()));
        Map<String, String> config = new LinkedHashMap<>();
        json.forEach((key, value) -> config.put(key, Convert.toStr(value)));
        // 私密（非已发布）视频的媒体引用不下发到客户端：视频模块标了私密的素材，
        // 即便被写进了开屏等客户端配置，也要在公共出口剥离
        scrubPrivateVideoMedia(config);
        result.setConfig(config);
        return result;
    }

    /* ------------------------------------------------------------------ */
    /* 私密视频引用剥离                                                      */
    /* ------------------------------------------------------------------ */

    /**
     * 收集所有非已发布视频（私密 / 下架）引用的媒体文件 ID，
     * 并把客户端配置里指向这些文件的地址清空。
     * 视频列表等公开接口本就只查 PUBLISHED，这里堵住「配置引用」这条旁路。
     */
    private void scrubPrivateVideoMedia(Map<String, String> config) {
        Set<String> blockedFileIds = privateVideoFileIds();
        if (blockedFileIds.isEmpty()) {
            return;
        }
        for (Map.Entry<String, String> entry : config.entrySet()) {
            String value = entry.getValue();
            if (StrUtil.isBlank(value) || !value.contains("dev/file/download")) {
                continue;
            }
            // 开屏画布是 JSON 字符串：先按结构清空背景字段、移除引用私密素材的图片节点，
            // 再走通用正则兜底（覆盖 splashVideoLandscapeUrl 等任意直存地址的键）
            if (SPLASH_CANVAS_KEY.equals(entry.getKey())) {
                value = scrubSplashCanvas(value, blockedFileIds);
            }
            entry.setValue(stripBlockedMediaUrls(value, blockedFileIds));
        }
    }

    /** 非已发布视频引用的全部媒体文件 ID（视频本体 + 封面） */
    private Set<String> privateVideoFileIds() {
        List<BizVideo> hiddenVideos = bizVideoMapper.selectList(
                new LambdaQueryWrapper<BizVideo>().ne(BizVideo::getStatus, "PUBLISHED"));
        Set<String> fileIds = new HashSet<>();
        for (BizVideo video : hiddenVideos) {
            collectFileIds(video.getVideoUrl(), fileIds);
            collectFileIds(video.getCover(), fileIds);
        }
        return fileIds;
    }

    private void collectFileIds(String url, Set<String> target) {
        if (StrUtil.isBlank(url)) {
            return;
        }
        Matcher matcher = FILE_ID_PATTERN.matcher(url);
        while (matcher.find()) {
            target.add(matcher.group(1));
        }
    }

    /** 把值里指向被屏蔽文件的完整地址清空（兼容 /dev、/snowy/dev、/api/dev 等代理前缀） */
    private String stripBlockedMediaUrls(String value, Set<String> blockedFileIds) {
        String joined = String.join("|", blockedFileIds);
        Pattern pattern = Pattern.compile(
                "[\\w./-]*dev/file/download\\?id=(" + joined + ")&sign=[A-Za-z0-9+/=]+");
        return pattern.matcher(value).replaceAll("");
    }

    /**
     * 清理开屏画布：背景图 / 背景视频 / 封面引用私密素材时置空；
     * 图片节点引用私密素材时整个节点移除（置空会渲染出一张空白图）。
     * 结构异常时保持原值，不影响开屏其余内容的下发。
     */
    private String scrubSplashCanvas(String value, Set<String> blockedFileIds) {
        try {
            JSONObject root = JSONUtil.parseObj(value);
            for (String orientation : new String[]{"pc", "mobile"}) {
                JSONObject doc = root.getJSONObject(orientation);
                if (doc == null) {
                    continue;
                }
                for (String field : new String[]{"backgroundImage", "backgroundVideo", "backgroundVideoCover"}) {
                    if (referencesBlockedFile(doc.getStr(field), blockedFileIds)) {
                        doc.set(field, "");
                    }
                }
                JSONArray nodes = doc.getJSONArray("nodes");
                if (nodes != null) {
                    List<Object> kept = new ArrayList<>();
                    for (Object item : nodes) {
                        JSONObject node = item instanceof JSONObject ? (JSONObject) item : null;
                        if (node != null
                                && "image".equals(node.getStr("type"))
                                && referencesBlockedFile(node.getStr("url"), blockedFileIds)) {
                            continue;
                        }
                        kept.add(item);
                    }
                    doc.set("nodes", kept);
                }
            }
            return root.toString();
        } catch (Exception e) {
            log.warn("开屏画布配置剥离私密视频引用失败，原样下发：{}", e.getMessage());
            return value;
        }
    }

    private boolean referencesBlockedFile(String url, Set<String> blockedFileIds) {
        if (StrUtil.isBlank(url)) {
            return false;
        }
        Matcher matcher = FILE_ID_PATTERN.matcher(url);
        while (matcher.find()) {
            if (blockedFileIds.contains(matcher.group(1))) {
                return true;
            }
        }
        return false;
    }
}
