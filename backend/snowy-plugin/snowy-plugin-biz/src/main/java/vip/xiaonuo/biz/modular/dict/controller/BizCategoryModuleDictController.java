/*
 * Copyright [2022] [https://www.xiaonuo.vip]
 *
 * Snowy采用APACHE LICENSE 2.0开源协议，您在使用过程中，需要注意以下几点：
 *
 * 1.请不要删除和修改根目录下的LICENSE文件。
 * 2.请不要删除和修改Snowy源码头部的版权声明。
 * 3.本项目代码可免费商业使用，商业使用请保留源码和相关描述文件的项目出处，作者声明等。
 * 4.分发源码时候，请注明软件出处 https://www.xiaonuo.vip
 * 5.不可二次分发开源参与同类竞品，如有想法可联系团队xiaonuobase@qq.com商议合作。
 * 6.若您的项目无法满足以上几点，需要更多功能代码，获取Snowy商业授权许可，请在官网购买授权，地址为 https://www.xiaonuo.vip
 */
package vip.xiaonuo.biz.modular.dict.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.validation.constraints.NotEmpty;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import vip.xiaonuo.biz.modular.dict.entity.BizDict;
import vip.xiaonuo.biz.modular.dict.param.BizCategoryModuleDictAddParam;
import vip.xiaonuo.biz.modular.dict.param.BizCategoryModuleDictEditParam;
import vip.xiaonuo.biz.modular.dict.param.BizCategoryModuleDictIdParam;
import vip.xiaonuo.biz.modular.dict.service.BizCategoryModuleDictService;
import vip.xiaonuo.common.annotation.CommonLog;
import vip.xiaonuo.common.pojo.CommonResult;

import javax.validation.Valid;
import java.util.List;

/**
 * 通用分类适用模块字典控制器
 *
 * @author wuwenlong
 * @date 2026/11/27 12:00
 */
@Tag(name = "通用分类适用模块字典控制器")
@RestController
@Validated
public class BizCategoryModuleDictController {

    @Resource
    private BizCategoryModuleDictService bizCategoryModuleDictService;

    /** 获取适用模块字典项 */
    @Operation(summary = "获取通用分类适用模块字典项")
    @SaCheckPermission("/biz/category/page")
    @GetMapping("/biz/category/dict/options")
    public CommonResult<List<BizDict>> options() {
        return CommonResult.data(bizCategoryModuleDictService.options());
    }

    /** 获取适用模块字典详情 */
    @Operation(summary = "获取通用分类适用模块字典详情")
    @SaCheckPermission("/biz/category/detail")
    @GetMapping("/biz/category/dict/detail")
    public CommonResult<BizDict> detail(@Valid BizCategoryModuleDictIdParam idParam) {
        return CommonResult.data(bizCategoryModuleDictService.detail(idParam));
    }

    /** 新增适用模块字典项 */
    @Operation(summary = "新增通用分类适用模块字典项")
    @CommonLog("新增通用分类适用模块字典项")
    @SaCheckPermission("/biz/category/add")
    @PostMapping("/biz/category/dict/add")
    public CommonResult<String> add(@RequestBody @Valid BizCategoryModuleDictAddParam addParam) {
        bizCategoryModuleDictService.add(addParam);
        return CommonResult.ok();
    }

    /** 编辑适用模块字典项 */
    @Operation(summary = "编辑通用分类适用模块字典项")
    @CommonLog("编辑通用分类适用模块字典项")
    @SaCheckPermission("/biz/category/edit")
    @PostMapping("/biz/category/dict/edit")
    public CommonResult<String> edit(@RequestBody @Valid BizCategoryModuleDictEditParam editParam) {
        bizCategoryModuleDictService.edit(editParam);
        return CommonResult.ok();
    }

    /** 删除适用模块字典项 */
    @Operation(summary = "删除通用分类适用模块字典项")
    @CommonLog("删除通用分类适用模块字典项")
    @SaCheckPermission("/biz/category/delete")
    @PostMapping("/biz/category/dict/delete")
    public CommonResult<String> delete(@RequestBody @Valid @NotEmpty(message = "集合不能为空")
                                           List<BizCategoryModuleDictIdParam> idParamList) {
        bizCategoryModuleDictService.delete(idParamList);
        return CommonResult.ok();
    }
}
