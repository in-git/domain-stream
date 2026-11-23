package vip.xiaonuo.biz.modular.asset.controller;

import cn.dev33.satoken.annotation.SaCheckPermission;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Getter;
import lombok.Setter;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vip.xiaonuo.biz.modular.asset.param.BizAssetResourcePageParam;
import vip.xiaonuo.biz.modular.asset.service.BizAssetResourceService;
import vip.xiaonuo.biz.modular.asset.vo.AssetTypeSiteVo;
import vip.xiaonuo.biz.modular.asset.vo.BizAssetResourceVo;
import vip.xiaonuo.common.annotation.CommonLog;
import vip.xiaonuo.common.pojo.CommonResult;

import java.io.IOException;
import java.util.List;

/**
 * 远端素材资源控制器
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Tag(name = "远端素材资源控制器")
@RestController
@Validated
public class BizAssetResourceController {

    @Resource
    private BizAssetResourceService bizAssetResourceService;

    @Operation(summary = "获取远端素材分页")
    @SaCheckPermission("/biz/asset-resource/page")
    @GetMapping("/biz/asset-resource/page")
    public CommonResult<Page<BizAssetResourceVo>> page(BizAssetResourcePageParam param) {
        return CommonResult.data(bizAssetResourceService.page(param));
    }

    @Operation(summary = "手动采集素材")
    @CommonLog("手动采集素材")
    @PostMapping("/biz/asset-resource/collect")
    public CommonResult<String> collect() {
        return CommonResult.data(bizAssetResourceService.collectWithConfig(null));
    }

    @Operation(summary = "获取素材站点树（类型-站点）")
    @GetMapping("/biz/asset-resource/sites")
    public CommonResult<List<AssetTypeSiteVo>> sites() {
        return CommonResult.data(bizAssetResourceService.siteTree());
    }

    @Operation(summary = "加入素材中心")
    @CommonLog("加入素材中心")
    @SaCheckPermission("/biz/asset-resource/add-to-material")
    @PostMapping("/biz/asset-resource/add-to-material")
    public CommonResult<String> addToMaterial(@RequestBody IdsParam param) {
        bizAssetResourceService.addToMaterial(param.getIds());
        return CommonResult.ok();
    }

    @Operation(summary = "远程素材预览代理")
    @GetMapping("/biz/asset-resource/media")
    public void media(@RequestParam String id,
                      @RequestParam(defaultValue = "false") boolean full,
                      HttpServletResponse response) throws IOException {
        byte[] bytes = bizAssetResourceService.proxy(id, full);
        response.setContentType(bizAssetResourceService.contentType(id));
        response.setContentLength(bytes.length);
        response.setHeader("Cache-Control", "public, max-age=86400");
        response.getOutputStream().write(bytes);
    }

    /** 批量ID请求体 */
    @Getter
    @Setter
    public static class IdsParam {
        private List<String> ids;
    }
}
