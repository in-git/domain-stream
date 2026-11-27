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
package vip.xiaonuo.biz.modular.site.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.validation.constraints.NotBlank;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import vip.xiaonuo.biz.modular.site.entity.BizSiteFetchResult;
import vip.xiaonuo.biz.modular.site.param.BizSiteHomeAggregateParam;
import vip.xiaonuo.biz.modular.site.param.BizSitePublicPageParam;
import vip.xiaonuo.biz.modular.site.service.BizSitePublicService;
import vip.xiaonuo.biz.modular.site.vo.BizSiteCategoryPublicVo;
import vip.xiaonuo.biz.modular.site.vo.BizSiteHomeAggregateVo;
import vip.xiaonuo.biz.modular.site.vo.BizSitePublicVo;
import vip.xiaonuo.common.pojo.CommonResult;

import java.util.List;

/**
 * 网页数据(免登录) 公开访问 Controller
 * <p>
 * 该路径已在 <code>GlobalConfigure.NO_LOGIN_PATH_ARR</code>(<code>/public/**</code>) 放行,
 * 不需要任何 token, B 端前台可直接访问。
 *
 * @author wuwenlong
 * @date 2026/08/08
 */
@Tag(name = "网页数据-公开访问控制器")
@RestController
@Validated
@RequestMapping("/public/site")
public class BizSitePublicController {

    @Resource
    private BizSitePublicService bizSitePublicService;

    /**
     * 获取分类树(公开)
     */
    @Operation(summary = "获取分类树(公开)")
    @GetMapping("/categoryTree")
    public CommonResult<List<BizSiteCategoryPublicVo>> categoryTree(
            @Parameter(description = "所属模块, 为空返回全部") @RequestParam(required = false) String module) {
        return CommonResult.data(bizSitePublicService.categoryTree(module));
    }

    /**
     * 获取网页分页(公开, 仅返回可见数据)
     */
    @Operation(summary = "获取网页分页(公开)")
    @GetMapping("/page")
    public CommonResult<Page<BizSitePublicVo>> page(BizSitePublicPageParam bizSitePublicPageParam) {
        return CommonResult.data(bizSitePublicService.page(bizSitePublicPageParam));
    }

    /**
     * 首页聚合查询(公开, 仅返回可见数据)
     * <p>
     * 一次返回: 最新发布的 N 条、访问量最高的 N 条、以及全部推荐网页, 供首页首屏渲染。
     */
    @Operation(summary = "首页聚合查询(公开)")
    @GetMapping("/homeAggregate")
    public CommonResult<BizSiteHomeAggregateVo> homeAggregate(BizSiteHomeAggregateParam param) {
        return CommonResult.data(bizSitePublicService.homeAggregate(param));
    }

    /**
     * 获取网页详情(公开)
     */
    @Operation(summary = "获取网页详情(公开)")
    @GetMapping("/detail")
    public CommonResult<BizSitePublicVo> detail(
            @Parameter(description = "网页ID") @RequestParam @NotBlank(message = "id不能为空") String id) {
        return CommonResult.data(bizSitePublicService.detail(id));
    }

    /**
     * 网页点击量+1(公开)
     * <p>
     * 前端点击跳转时调用, 使用 POST 语义避免被浏览器/爬虫预取而误计数。
     */
    @Operation(summary = "网页点击量+1(公开)")
    @PostMapping("/click")
    public CommonResult<String> click(
            @Parameter(description = "网页ID") @RequestParam @NotBlank(message = "id不能为空") String id) {
        bizSitePublicService.incrementCount(id);
        return CommonResult.data("点击量已更新");
    }

    /**
     * 一键获取卡片信息(公开)
     * <p>
     * 前端传入一个网页链接(link), 后端抓取该网页并解析基础元信息(标题、描述、封面、LOGO、关键字)回填表单。
     * 该接口处于 <code>/public/**</code> 免登录路径下, 供站点表单的前端裸 fetch 调用。
     */
    @Operation(summary = "一键获取卡片信息(公开)")
    @PostMapping("/fetch")
    public CommonResult<BizSiteFetchResult> fetch(
            @Parameter(description = "目标网页链接") @RequestParam @NotBlank(message = "link不能为空") String link) {
        return CommonResult.data(bizSitePublicService.fetch(link));
    }
}
