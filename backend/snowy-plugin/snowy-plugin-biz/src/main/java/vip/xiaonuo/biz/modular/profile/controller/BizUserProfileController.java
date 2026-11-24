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
package vip.xiaonuo.biz.modular.profile.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import vip.xiaonuo.biz.modular.profile.entity.BizUserProfile;
import vip.xiaonuo.biz.modular.profile.param.BizUserProfileUpdateParam;
import vip.xiaonuo.biz.modular.profile.service.BizUserProfileService;
import vip.xiaonuo.common.pojo.CommonResult;

/**
 * C端用户个人资料控制器
 *
 * <p>模块代码位于 biz 插件，URL 使用 /client/c/ 前缀以复用框架的 C 端登录鉴权
 * （见 GlobalConfigure.CLIENT_USER_PERMISSION_PATH_ARR），当前用户由登录态决定，
 * 不接收外部传入的用户id，避免越权修改他人资料。</p>
 *
 * @author domain-stream
 * @date 2026/11/24
 **/
@Tag(name = "C端用户个人资料")
@RestController
@Validated
public class BizUserProfileController {

    @Resource
    private BizUserProfileService bizUserProfileService;

    /** 获取当前登录用户资料 */
    @Operation(summary = "获取当前登录用户资料")
    @GetMapping("/client/c/profile/get")
    public CommonResult<BizUserProfile> get() {
        return CommonResult.data(bizUserProfileService.getCurrent());
    }

    /** 更新当前登录用户资料（昵称、简介） */
    @Operation(summary = "更新当前登录用户资料")
    @PostMapping("/client/c/profile/update")
    public CommonResult<String> update(@RequestBody @Valid BizUserProfileUpdateParam param) {
        bizUserProfileService.update(param);
        return CommonResult.ok();
    }
}
