package vip.xiaonuo.biz.modular.config.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import vip.xiaonuo.biz.modular.config.param.BizConfigAddParam;
import vip.xiaonuo.biz.modular.config.param.BizConfigEditParam;
import vip.xiaonuo.biz.modular.config.param.BizConfigKeyParam;
import vip.xiaonuo.biz.modular.config.param.BizConfigSaveParam;
import vip.xiaonuo.biz.modular.config.result.BizConfigItemResult;
import vip.xiaonuo.biz.modular.config.result.PublicSystemInfoResult;
import vip.xiaonuo.biz.modular.config.service.BizConfigService;
import vip.xiaonuo.common.annotation.CommonLog;
import vip.xiaonuo.common.pojo.CommonResult;

import java.util.List;

/**
 * 页面配置控制器
 * <p>
 * 管理 dev_config 中 CLIENT_CONFIG 配置里的 JSON 属性（如「网页标题」），
 * 后续新增属性无需改表，直接通过 add 接口写入即可。
 *
 * @author domain-stream
 * @date 2026/11/20
 */
@Tag(name = "页面配置控制器")
@RestController
@Validated
public class BizConfigController {

    @Resource
    private BizConfigService bizConfigService;

    @Operation(summary = "公共接口：读取系统基础信息（无需登录）")
    @GetMapping("/public/system/info")
    public CommonResult<PublicSystemInfoResult> systemInfo() {
        return CommonResult.data(bizConfigService.publicSystemInfo());
    }

    @Operation(summary = "获取页面配置全部属性")
    @GetMapping("/biz/config/list")
    public CommonResult<List<BizConfigItemResult>> list() {
        return CommonResult.data(bizConfigService.list());
    }

    @Operation(summary = "获取页面配置单个属性")
    @GetMapping("/biz/config/detail")
    public CommonResult<BizConfigItemResult> detail(@Valid BizConfigKeyParam keyParam) {
        return CommonResult.data(bizConfigService.detail(keyParam));
    }

    @Operation(summary = "获取页面配置原始JSON")
    @GetMapping("/biz/config/json")
    public CommonResult<String> rawJson() {
        return CommonResult.data(bizConfigService.rawJson());
    }

    @Operation(summary = "整体保存页面配置（覆盖写入）")
    @CommonLog("保存页面配置")
    @PostMapping("/biz/config/save")
    public CommonResult<String> save(@RequestBody BizConfigSaveParam saveParam) {
        bizConfigService.save(saveParam);
        return CommonResult.ok();
    }

    @Operation(summary = "新增页面配置属性")
    @CommonLog("新增页面配置属性")
    @PostMapping("/biz/config/add")
    public CommonResult<String> add(@RequestBody @Valid BizConfigAddParam addParam) {
        bizConfigService.add(addParam);
        return CommonResult.ok();
    }

    @Operation(summary = "编辑页面配置属性")
    @CommonLog("编辑页面配置属性")
    @PostMapping("/biz/config/edit")
    public CommonResult<String> edit(@RequestBody @Valid BizConfigEditParam editParam) {
        bizConfigService.edit(editParam);
        return CommonResult.ok();
    }

    @Operation(summary = "删除页面配置属性")
    @CommonLog("删除页面配置属性")
    @PostMapping("/biz/config/delete")
    public CommonResult<String> delete(@RequestBody @Valid BizConfigKeyParam keyParam) {
        bizConfigService.delete(keyParam);
        return CommonResult.ok();
    }
}
