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
package vip.xiaonuo.biz.modular.visitor.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import vip.xiaonuo.biz.modular.visitor.param.BizVisitorTrackParam;
import vip.xiaonuo.biz.modular.visitor.result.BizVisitorDashboardResult;
import vip.xiaonuo.biz.modular.visitor.service.BizVisitorService;
import vip.xiaonuo.common.pojo.CommonResult;
import vip.xiaonuo.common.util.CommonServletUtil;

import java.util.Map;

/**
 * 首页访客数据控制器
 *
 * @author domain-stream
 * @date  2026/11/19
 **/
@Tag(name = "首页访客数据控制器")
@RestController
@Validated
public class BizVisitorController {

    @Resource
    private BizVisitorService bizVisitorService;

    /**
     * 首页访客聚合数据（对齐 CMS 前端 DashboardPayload）
     */
    @Operation(summary = "首页访客聚合数据")
    @GetMapping("/biz/visitor/dashboard")
    public CommonResult<BizVisitorDashboardResult> dashboard() {
        return CommonResult.data(bizVisitorService.dashboard());
    }

    /**
     * 实时快照（供 SSE 推送）
     */
    @Operation(summary = "实时访客快照")
    @GetMapping("/biz/visitor/live")
    public CommonResult<Map<String, Object>> live() {
        return CommonResult.data(bizVisitorService.liveSnapshot());
    }

    /**
     * 上报一次访问事件（PV / 内容浏览）
     */
    @Operation(summary = "上报访问事件")
    @PostMapping("/biz/visitor/track")
    public CommonResult<String> track(@RequestBody @Valid BizVisitorTrackParam param) {
        HttpServletRequest request = CommonServletUtil.getRequest();
        bizVisitorService.track(param, request.getRemoteAddr(), request.getHeader("User-Agent"));
        return CommonResult.ok();
    }

    /**
     * 心跳上报（维持在线会话）
     */
    @Operation(summary = "心跳上报")
    @PostMapping("/biz/visitor/heartbeat")
    public CommonResult<String> heartbeat(@RequestBody @Valid BizVisitorTrackParam param) {
        HttpServletRequest request = CommonServletUtil.getRequest();
        bizVisitorService.heartbeat(param, request.getRemoteAddr(), request.getHeader("User-Agent"));
        return CommonResult.ok();
    }
}
