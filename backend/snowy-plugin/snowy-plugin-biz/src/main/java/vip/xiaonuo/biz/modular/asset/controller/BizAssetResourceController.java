package vip.xiaonuo.biz.modular.asset.controller;

import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Getter;
import lombok.Setter;
import org.springframework.http.MediaType;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vip.xiaonuo.biz.modular.asset.param.BizAssetAddToMaterialParam;
import vip.xiaonuo.biz.modular.asset.param.BizAssetCollectUrlParam;
import vip.xiaonuo.biz.modular.asset.param.BizAssetResourcePageParam;
import vip.xiaonuo.biz.modular.asset.service.BizAssetResourceService;
import vip.xiaonuo.biz.modular.asset.vo.AssetCollectEventVo;
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
    @GetMapping("/biz/asset-resource/page")
    public CommonResult<Page<BizAssetResourceVo>> page(BizAssetResourcePageParam param) {
        return CommonResult.data(bizAssetResourceService.page(param));
    }

    @Operation(summary = "按网址采集素材")
    @CommonLog("按网址采集素材")
    @PostMapping("/biz/asset-resource/collect-url")
    public CommonResult<String> collectUrl(@RequestBody BizAssetCollectUrlParam param) {
        return CommonResult.data(bizAssetResourceService.collectUrl(param));
    }

    @Operation(summary = "流式按网址采集素材")
    @PostMapping(value = "/biz/asset-resource/collect-url/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public void collectUrlStream(@RequestBody BizAssetCollectUrlParam param, HttpServletResponse response) throws IOException {
        response.setCharacterEncoding("UTF-8");
        response.setContentType(MediaType.TEXT_EVENT_STREAM_VALUE + ";charset=UTF-8");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("X-Accel-Buffering", "no");
        bizAssetResourceService.collectUrlStream(param, event -> writeSseEvent(response, event));
        response.getWriter().write("data: [DONE]\n\n");
        response.getWriter().flush();
    }

    @Operation(summary = "加入素材中心")
    @CommonLog("加入素材中心")
    @PostMapping("/biz/asset-resource/add-to-material")
    public CommonResult<String> addToMaterial(@RequestBody BizAssetAddToMaterialParam param) {
        bizAssetResourceService.addToMaterial(param.getIds(), param.getCategoryCode());
        return CommonResult.ok();
    }

    @Operation(summary = "删除素材资源")
    @CommonLog("删除素材资源")
    @PostMapping("/biz/asset-resource/delete")
    public CommonResult<String> delete(@RequestBody IdsParam param) {
        bizAssetResourceService.delete(param.getIds());
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

    private void writeSseEvent(HttpServletResponse response, AssetCollectEventVo event) {
        try {
            response.getWriter().write("data: " + JSONUtil.toJsonStr(event) + "\n\n");
            response.getWriter().flush();
        } catch (IOException ignored) {
            // 客户端断开时停止写入，采集流程本身继续执行
        }
    }

    /** 批量ID请求体 */
    @Getter
    @Setter
    public static class IdsParam {
        private List<String> ids;
    }
}
