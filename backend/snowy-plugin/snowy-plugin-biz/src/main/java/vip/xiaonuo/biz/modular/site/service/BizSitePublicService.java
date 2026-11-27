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
package vip.xiaonuo.biz.modular.site.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import vip.xiaonuo.biz.modular.site.entity.BizSiteFetchResult;
import vip.xiaonuo.biz.modular.site.param.BizSiteHomeAggregateParam;
import vip.xiaonuo.biz.modular.site.param.BizSitePublicPageParam;
import vip.xiaonuo.biz.modular.site.vo.BizSiteCategoryPublicVo;
import vip.xiaonuo.biz.modular.site.vo.BizSiteHomeAggregateVo;
import vip.xiaonuo.biz.modular.site.vo.BizSitePublicVo;

import java.util.List;

/**
 * 网页数据公开访问Service接口
 * <p>
 * 面向 B 端前台(免登录)提供只读能力: 分类树、身份、网页列表/详情, 以及点击计数。
 * 所有输出统一为驼峰 + 布尔值语义, 且只暴露"可见(VISIBLE = Y)"的数据。
 *
 * @author wuwenlong
 * @date 2026/08/08
 **/
public interface BizSitePublicService {

    /**
     * 获取分类树
     *
     * @param module 所属模块, 为空则返回全部
     */
    List<BizSiteCategoryPublicVo> categoryTree(String module);

    /**
     * 获取网页分页(仅返回可见数据)
     */
    Page<BizSitePublicVo> page(BizSitePublicPageParam param);

    /**
     * 首页聚合查询(仅返回可见数据)
     * <p>
     * 一次返回三组结果, 供首页首屏渲染, 减少请求数:
     * 最新发布的 N 条、访问量最高的 N 条、以及全部推荐网页。
     *
     * @param param 聚合查询参数
     */
    BizSiteHomeAggregateVo homeAggregate(BizSiteHomeAggregateParam param);

    /**
     * 获取网页详情(仅返回可见数据)
     *
     * @param id 网页ID
     */
    BizSitePublicVo detail(String id);

    /**
     * 网页点击量 +1
     *
     * @param id 网页ID
     */
    void incrementCount(String id);

    /**
     * 一键获取卡片信息
     * <p>
     * 根据传入的网页链接抓取并解析基础元信息(标题、描述、封面、LOGO、关键字)。
     *
     * @param link 目标网页链接
     * @return 解析得到的卡片信息
     */
    BizSiteFetchResult fetch(String link);
}
