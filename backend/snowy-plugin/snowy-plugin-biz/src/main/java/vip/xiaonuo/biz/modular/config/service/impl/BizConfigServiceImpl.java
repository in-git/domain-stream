package vip.xiaonuo.biz.modular.config.service.impl;

import cn.hutool.core.convert.Convert;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vip.xiaonuo.biz.modular.config.param.BizConfigAddParam;
import vip.xiaonuo.biz.modular.config.param.BizConfigEditParam;
import vip.xiaonuo.biz.modular.config.param.BizConfigKeyParam;
import vip.xiaonuo.biz.modular.config.result.BizConfigItemResult;
import vip.xiaonuo.biz.modular.config.result.PublicSystemInfoResult;
import vip.xiaonuo.biz.modular.config.service.BizConfigService;
import vip.xiaonuo.common.exception.CommonException;
import vip.xiaonuo.dev.api.DevConfigApi;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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

    @Resource
    private DevConfigApi devConfigApi;

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
        result.setConfig(config);
        return result;
    }
}
