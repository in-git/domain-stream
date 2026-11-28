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

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.validation.constraints.NotEmpty;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vip.xiaonuo.biz.modular.dict.entity.BizDict;
import vip.xiaonuo.biz.modular.dict.param.BizBusinessDictIdParam;
import vip.xiaonuo.biz.modular.dict.param.BizBusinessDictItemAddParam;
import vip.xiaonuo.biz.modular.dict.param.BizBusinessDictItemEditParam;
import vip.xiaonuo.biz.modular.dict.param.BizBusinessDictTypeAddParam;
import vip.xiaonuo.biz.modular.dict.param.BizBusinessDictTypeEditParam;
import vip.xiaonuo.biz.modular.dict.service.BizBusinessDictService;
import vip.xiaonuo.common.annotation.CommonLog;
import vip.xiaonuo.common.pojo.CommonResult;

import javax.validation.Valid;
import java.util.List;

/**
 * 业务字典管理控制器
 *
 * @author wuwenlong
 * @date 2026/11/28 10:00
 */
@Tag(name = "业务字典管理控制器")
@RestController
@Validated
public class BizBusinessDictController {

    @Resource
    private BizBusinessDictService bizBusinessDictService;

    /** 字典类型列表 */
    @Operation(summary = "获取业务字典类型列表")
    @GetMapping("/biz/business-dict/type/list")
    public CommonResult<List<BizDict>> typeList() {
        return CommonResult.data(bizBusinessDictService.typeList());
    }

    /** 字典项列表 */
    @Operation(summary = "获取业务字典项列表")
    @GetMapping("/biz/business-dict/item/list")
    public CommonResult<List<BizDict>> itemList(@RequestParam("typeId") String typeId) {
        return CommonResult.data(bizBusinessDictService.itemList(typeId));
    }

    /** 按类型编码获取字典项，供业务页面使用 */
    @Operation(summary = "按类型编码获取业务字典项")
    @GetMapping("/biz/business-dict/options")
    public CommonResult<List<BizDict>> options(@RequestParam("typeCode") String typeCode) {
        return CommonResult.data(bizBusinessDictService.options(typeCode));
    }

    /** 新增字典类型 */
    @Operation(summary = "新增业务字典类型")
    @CommonLog("新增业务字典类型")
    @PostMapping("/biz/business-dict/type/add")
    public CommonResult<String> addType(@RequestBody @Valid BizBusinessDictTypeAddParam addParam) {
        bizBusinessDictService.addType(addParam);
        return CommonResult.ok();
    }

    /** 编辑字典类型 */
    @Operation(summary = "编辑业务字典类型")
    @CommonLog("编辑业务字典类型")
    @PostMapping("/biz/business-dict/type/edit")
    public CommonResult<String> editType(@RequestBody @Valid BizBusinessDictTypeEditParam editParam) {
        bizBusinessDictService.editType(editParam);
        return CommonResult.ok();
    }

    /** 删除字典类型 */
    @Operation(summary = "删除业务字典类型")
    @CommonLog("删除业务字典类型")
    @PostMapping("/biz/business-dict/type/delete")
    public CommonResult<String> deleteTypes(@RequestBody @Valid @NotEmpty(message = "集合不能为空")
                                            List<BizBusinessDictIdParam> idParamList) {
        bizBusinessDictService.deleteTypes(idParamList);
        return CommonResult.ok();
    }

    /** 新增字典项 */
    @Operation(summary = "新增业务字典项")
    @CommonLog("新增业务字典项")
    @PostMapping("/biz/business-dict/item/add")
    public CommonResult<String> addItem(@RequestBody @Valid BizBusinessDictItemAddParam addParam) {
        bizBusinessDictService.addItem(addParam);
        return CommonResult.ok();
    }

    /** 编辑字典项 */
    @Operation(summary = "编辑业务字典项")
    @CommonLog("编辑业务字典项")
    @PostMapping("/biz/business-dict/item/edit")
    public CommonResult<String> editItem(@RequestBody @Valid BizBusinessDictItemEditParam editParam) {
        bizBusinessDictService.editItem(editParam);
        return CommonResult.ok();
    }

    /** 删除字典项 */
    @Operation(summary = "删除业务字典项")
    @CommonLog("删除业务字典项")
    @PostMapping("/biz/business-dict/item/delete")
    public CommonResult<String> deleteItems(@RequestBody @Valid @NotEmpty(message = "集合不能为空")
                                            List<BizBusinessDictIdParam> idParamList) {
        bizBusinessDictService.deleteItems(idParamList);
        return CommonResult.ok();
    }
}
