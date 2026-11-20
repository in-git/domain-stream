package vip.xiaonuo.biz.modular.config.service;

import vip.xiaonuo.biz.modular.config.param.BizConfigAddParam;
import vip.xiaonuo.biz.modular.config.param.BizConfigEditParam;
import vip.xiaonuo.biz.modular.config.param.BizConfigKeyParam;
import vip.xiaonuo.biz.modular.config.param.BizConfigSaveParam;
import vip.xiaonuo.biz.modular.config.result.BizConfigItemResult;
import vip.xiaonuo.biz.modular.config.result.PublicSystemInfoResult;

import java.util.List;

/**
 * 页面配置Service接口
 * <p>
 * 配置 VALUE 为 JSON 字符串，存于 dev_config 表的 CLIENT_CONFIG 配置键，
 * 这里对 JSON 内的属性提供独立的增删改查。
 *
 * @author domain-stream
 * @date 2026/11/20
 */
public interface BizConfigService {

    /** 获取全部属性（按 JSON 中的顺序） */
    List<BizConfigItemResult> list();

    /** 获取单个属性 */
    BizConfigItemResult detail(BizConfigKeyParam keyParam);

    /** 获取原始 JSON 字符串 */
    String rawJson();

    /** 新增属性，属性名重复时抛异常 */
    void add(BizConfigAddParam addParam);

    /** 编辑属性值，属性不存在时抛异常 */
    void edit(BizConfigEditParam editParam);

    /** 整体保存全部属性（覆盖写入，允许空值，不存在则新增、存在则更新） */
    void save(BizConfigSaveParam saveParam);

    /** 删除属性，属性不存在时抛异常 */
    void delete(BizConfigKeyParam keyParam);

    /** 公共接口：读取系统基础信息（站点名 + 客户端配置） */
    PublicSystemInfoResult publicSystemInfo();
}
