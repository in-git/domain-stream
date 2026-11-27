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
package vip.xiaonuo.biz.modular.site.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.ObjectUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.http.HttpUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.support.SFunction;
import com.baomidou.mybatisplus.extension.conditions.query.LambdaQueryChainWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vip.xiaonuo.biz.modular.category.entity.BizCategory;
import vip.xiaonuo.biz.modular.category.service.BizCategoryService;
import vip.xiaonuo.biz.modular.site.entity.BizSite;
import vip.xiaonuo.biz.modular.site.entity.BizSiteFetchResult;
import vip.xiaonuo.biz.modular.site.enums.BizSiteDeviceTypeEnum;
import vip.xiaonuo.biz.modular.site.param.BizSiteHomeAggregateParam;
import vip.xiaonuo.biz.modular.site.param.BizSitePublicPageParam;
import vip.xiaonuo.biz.modular.site.service.BizSitePublicService;
import vip.xiaonuo.biz.modular.site.service.BizSiteService;
import vip.xiaonuo.biz.modular.site.vo.BizSiteCategoryPublicVo;
import vip.xiaonuo.biz.modular.site.vo.BizSiteHomeAggregateVo;
import vip.xiaonuo.biz.modular.site.vo.BizSitePublicVo;
import vip.xiaonuo.biz.modular.siteCategory.entity.BizSiteCategory;
import vip.xiaonuo.biz.modular.siteCategory.service.BizSiteCategoryService;
import vip.xiaonuo.common.exception.CommonException;

import jakarta.annotation.Resource;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 网页数据公开访问Service实现类
 *
 * @author wuwenlong
 * @date 2026/08/08
 **/
@Service
public class BizSitePublicServiceImpl implements BizSitePublicService {

    /**
     * 数据库中表示"是"的标志位集合
     * <p>
     * 设计文档约定 VISIBLE / IS_RECOMMEND 为 Y|N, 但存量数据实际写入的是 1|0,
     * 为兼容两种约定, 判定为"是"时同时接受 'Y' 与 '1'。
     */
    private static final List<String> FLAG_YES_VALUES = List.of("Y", "1");

    /** 首页聚合接口"最新发布/最高访问"的默认条数 */
    private static final int DEFAULT_HOME_SIZE = 5;

    /** 首页聚合接口"最新发布/最高访问"的最大条数 */
    private static final int MAX_HOME_SIZE = 50;

    /** 身份表示"禁用"的状态值, 采用排除法可兼容 status 为 NULL 的存量数据 */
    private static final String IDENTITY_STATUS_DISABLE = "0";

    /**
     * 允许前端指定的排序字段白名单 -> 实体属性引用
     * <p>
     * 使用 SFunction 而非拼接列名字符串: 一方面彻底杜绝 SQL 注入,
     * 另一方面由 MyBatis-Plus 负责列名转义(COUNT 是 MySQL 保留字)。
     */
    private static final Map<String, SFunction<BizSite, ?>> SORT_FIELD_WHITELIST = Map.of(
            "orderNum", BizSite::getOrderNum,
            "count", BizSite::getCount,
            "createTime", BizSite::getCreateTime);

    @Resource
    private BizSiteService bizSiteService;

    @Resource
    private BizCategoryService bizCategoryService;

    @Resource
    private BizSiteCategoryService bizSiteCategoryService;

    @Override
    public List<BizSiteCategoryPublicVo> categoryTree(String module) {
        return buildTree(bizCategoryService.listByModule(module));
    }

    @Override
    public Page<BizSitePublicVo> page(BizSitePublicPageParam param) {
        BizSitePublicPageParam safeParam = ObjectUtil.defaultIfNull(param, new BizSitePublicPageParam());

        // 1. 解析分类过滤条件, 得到最终需要命中的网页ID集合
        Set<String> siteIdFilter = resolveSiteIdFilter(safeParam);
        // siteIdFilter 为空集合(非 null)说明筛选条件下不可能有数据, 直接返回空分页
        if (siteIdFilter != null && siteIdFilter.isEmpty()) {
            Page<BizSitePublicVo> empty = new Page<>(resolveCurrent(safeParam), resolveSize(safeParam));
            empty.setRecords(Collections.emptyList());
            empty.setTotal(0);
            return empty;
        }

        // 2. 组装查询条件, 只查可见数据
        String searchKey = StrUtil.trimToNull(safeParam.getSearchKey());
        // 注意: SORT_FIELD_WHITELIST 由 Map.of 构建, 是不可变 MapN, 不允许 null 键,
        // 若前端未传 sortField, 直接 getOrDefault(null, ...) 会在 MapN.probe 中触发
        // NullPointerException(Cannot invoke "Object.hashCode()" because "pk" is null)。
        // 因此这里先把 null/空白规整为默认字段, 再查白名单。
        String sortField = ObjectUtil.defaultIfNull(StrUtil.trimToNull(safeParam.getSortField()), "orderNum");
        SFunction<BizSite, ?> sortColumn = SORT_FIELD_WHITELIST.getOrDefault(sortField, BizSite::getOrderNum);
        // sortOrder(排序方向) 优先级最高：只要传了就以它为准，主排序与二级排序都跟随该方向；
        // 未传时按业务默认升序(ORDER_NUM 越小越靠前)
        boolean asc = resolveAsc(safeParam.getSortOrder());
        // 主排序字段本身就是 CREATE_TIME 时无需再追加二级排序
        boolean needCreateTimeSort = !"createTime".equals(sortField);
        // device 表示"用户当前使用的设备", 需要返回该设备可展示的全部网页(如 PC -> PC + COMPATIBLE)
        List<String> visibleDevices = BizSiteDeviceTypeEnum.resolveVisibleDevices(safeParam.getDevice());
        // recommend 为三态: TRUE 只看推荐, FALSE 只看非推荐, null/不传 不过滤该字段
        Boolean recommend = safeParam.getRecommend();
        Page<BizSite> sitePage = bizSiteService.lambdaQuery()
                .in(BizSite::getVisible, FLAG_YES_VALUES)
                .in(Boolean.TRUE.equals(recommend), BizSite::getIsRecommend, FLAG_YES_VALUES)
                // 只看非推荐; 用 and(...) 额外兼容 IS_RECOMMEND 为 NULL 的历史数据,
                // 因为 NOT IN 对 NULL 求值为 UNKNOWN, 会直接把这些行过滤掉
                .and(Boolean.FALSE.equals(recommend), wrapper -> wrapper
                        .notIn(BizSite::getIsRecommend, FLAG_YES_VALUES).or()
                        .isNull(BizSite::getIsRecommend))
                .in(ObjectUtil.isNotEmpty(visibleDevices), BizSite::getDevice,
                        visibleDevices == null ? Collections.emptyList() : visibleDevices)
                .eq(ObjectUtil.isNotEmpty(safeParam.getSignal()), BizSite::getSignal, safeParam.getSignal())
                .in(siteIdFilter != null, BizSite::getId, siteIdFilter == null ? Collections.emptyList() : siteIdFilter)
                .and(searchKey != null, wrapper -> wrapper
                        .like(BizSite::getName, searchKey).or()
                        .like(BizSite::getDes, searchKey).or()
                        .like(BizSite::getLink, searchKey))
                .orderBy(true, asc, sortColumn)
                // 同排序值时按创建时间二次排序, 保证翻页结果稳定; 方向跟随 sortOrder
                .orderBy(needCreateTimeSort, asc, BizSite::getCreateTime)
                .page(new Page<>(resolveCurrent(safeParam), resolveSize(safeParam)));

        // 3. 转换为 VO 并批量填充分类, 避免 N+1 查询
        List<BizSitePublicVo> voList = convertWithCategory(sitePage.getRecords());
        Page<BizSitePublicVo> voPage = new Page<>(sitePage.getCurrent(), sitePage.getSize(), sitePage.getTotal());
        voPage.setRecords(voList);
        return voPage;
    }

    @Override
    public BizSiteHomeAggregateVo homeAggregate(BizSiteHomeAggregateParam param) {
        BizSiteHomeAggregateParam safeParam = ObjectUtil.defaultIfNull(param, new BizSiteHomeAggregateParam());
        // 条数兜底: 默认 5, 上限 50, 防止传入过大值拖垮首屏
        int size = resolveHomeSize(safeParam.getSize());
        List<String> visibleDevices = BizSiteDeviceTypeEnum.resolveVisibleDevices(safeParam.getDevice());

        BizSiteHomeAggregateVo vo = new BizSiteHomeAggregateVo();
        // 1. 最新发布: 按创建时间倒序
        List<BizSite> latestList = this.visibleSiteQuery(visibleDevices)
                .orderBy(true, false, BizSite::getCreateTime)
                .orderBy(true, true, BizSite::getOrderNum)
                .page(new Page<>(1, size)).getRecords();
        // 2. 最高访问: 按点击量倒序
        List<BizSite> hottestList = this.visibleSiteQuery(visibleDevices)
                .orderBy(true, false, BizSite::getCount)
                .orderBy(true, false, BizSite::getCreateTime)
                .page(new Page<>(1, size)).getRecords();
        // 3. 全部推荐
        List<BizSite> recommendList = this.visibleSiteQuery(visibleDevices)
                .in(BizSite::getIsRecommend, FLAG_YES_VALUES)
                .orderBy(true, true, BizSite::getOrderNum)
                .orderBy(true, false, BizSite::getCreateTime)
                .list();

        vo.setLatest(convertWithCategory(latestList));
        vo.setHottest(convertWithCategory(hottestList));
        vo.setRecommends(convertWithCategory(recommendList));
        return vo;
    }

    /**
     * 构造统一的"仅可见"查询条件
     *
     * @param visibleDevices 设备可见值集合, 为空表示不限制设备
     */
    private LambdaQueryChainWrapper<BizSite> visibleSiteQuery(List<String> visibleDevices) {
        return bizSiteService.lambdaQuery()
                .in(BizSite::getVisible, FLAG_YES_VALUES)
                .in(ObjectUtil.isNotEmpty(visibleDevices), BizSite::getDevice,
                        visibleDevices == null ? Collections.emptyList() : visibleDevices);
    }

    /**
     * 聚合接口的条数兜底, 默认 5, 允许范围 1-50
     */
    private int resolveHomeSize(Integer size) {
        if (size == null || size < 1) {
            return DEFAULT_HOME_SIZE;
        }
        return Math.min(size, MAX_HOME_SIZE);
    }

    @Override
    public BizSitePublicVo detail(String id) {
        if (ObjectUtil.isEmpty(id)) {
            throw new CommonException("网页ID不能为空");
        }
        BizSite site = bizSiteService.lambdaQuery()
                .eq(BizSite::getId, id)
                .in(BizSite::getVisible, FLAG_YES_VALUES)
                .one();
        if (site == null) {
            throw new CommonException("网页不存在或已下线, id值为：{}", id);
        }
        List<BizSitePublicVo> voList = convertWithCategory(Collections.singletonList(site));
        return voList.get(0);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void incrementCount(String id) {
        if (ObjectUtil.isEmpty(id)) {
            throw new CommonException("网页ID不能为空");
        }
        // 用数据库自增避免并发读改写丢失更新
        boolean updated = bizSiteService.lambdaUpdate()
                .eq(BizSite::getId, id)
                .in(BizSite::getVisible, FLAG_YES_VALUES)
                .setSql("`COUNT` = IFNULL(`COUNT`, 0) + 1")
                .update();
        if (!updated) {
            throw new CommonException("网页不存在或已下线, id值为：{}", id);
        }
    }

    /**
     * 一键获取卡片信息
     * <p>
     * 根据传入的网页链接抓取页面并解析基础元信息(标题、描述、封面、LOGO),
     * 用于站点表单"一键回填"的功能。相对路径的图片地址会补全为基于目标站点域名的绝对地址。
     *
     * @param link 目标网页链接
     * @return 解析得到的卡片信息
     */
    @Override
    public BizSiteFetchResult fetch(String link) {
        if (!isValidHttpUrl(link)) {
            throw new CommonException("link 不是合法的 http/https 链接：{}", link);
        }

        String html;
        try {
            // 伪装浏览器 UA 并限制超时, 避免个别站点拒绝抓取或长时间挂起
            html = HttpUtil.createGet(link)
                    .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                            + " (KHTML, like Gecko) Chrome/120.0 Safari/537.36")
                    .timeout(8000)
                    .execute()
                    .body();
        } catch (Exception e) {
            throw new CommonException("抓取网页失败：{}", e.getMessage());
        }
        if (StrUtil.isBlank(html)) {
            throw new CommonException("抓取网页内容为空：{}", link);
        }

        Document doc = Jsoup.parse(html, link);
        BizSiteFetchResult result = new BizSiteFetchResult();

        // 标题: 优先 og:title, 取不到回退到 <title>
        String title = metaContent(doc, "og:title", "twitter:title");
        if (StrUtil.isBlank(title)) {
            Element titleEl = doc.selectFirst("title");
            title = titleEl != null ? titleEl.text() : StrUtil.EMPTY;
        }
        result.setName(StrUtil.trimToEmpty(title));

        // 描述: 优先 og:description / twitter:description, 回退到 meta[name=description]
        String description = metaContent(doc, "og:description", "twitter:description", "description");
        result.setDes(StrUtil.trimToEmpty(description));

        // 封面图: 优先 og:image / twitter:image, 回退到页面内第一个有 src 的 <img>
        String image = metaContent(doc, "og:image", "twitter:image");
        if (StrUtil.isBlank(image)) {
            Element imgEl = doc.selectFirst("img[src]");
            image = imgEl != null ? imgEl.absUrl("src") : StrUtil.EMPTY;
        } else {
            image = toAbsoluteUrl(link, image);
        }
        result.setCover(StrUtil.trimToEmpty(image));

        // 站点LOGO: <link rel="icon/shortcut icon/apple-touch-icon">, 回退到 /favicon.ico
        result.setLogo(StrUtil.trimToEmpty(parseLogo(doc, link)));

        return result;
    }

    /**
     * 读取 meta 标签的 content, 依次尝试多个 name/property 取值
     */
    private String metaContent(Document doc, String... keys) {
        for (String key : keys) {
            // property 用于 og:* / twitter:*; name 用于 description
            Element el = doc.selectFirst("meta[property=" + key + "]");
            if (el == null) {
                el = doc.selectFirst("meta[name=" + key + "]");
            }
            if (el != null) {
                String content = el.attr("content");
                if (StrUtil.isNotBlank(content)) {
                    return content.trim();
                }
            }
        }
        return StrUtil.EMPTY;
    }

    /**
     * 解析站点 LOGO 地址
     */
    private String parseLogo(Document doc, String baseLink) {
        Elements icons = doc.select("link[rel~=(?i)icon]");
        for (Element icon : icons) {
            String href = icon.absUrl("href");
            if (StrUtil.isNotBlank(href)) {
                return href;
            }
        }
        // 兜底: 站点根目录的 favicon.ico
        try {
            URL url = new URL(baseLink);
            return url.getProtocol() + "://" + url.getHost() + (url.getPort() != -1 ? ":" + url.getPort() : "") + "/favicon.ico";
        } catch (MalformedURLException e) {
            return StrUtil.EMPTY;
        }
    }

    /**
     * 把可能是相对路径的图片地址补全为绝对地址
     */
    private String toAbsoluteUrl(String baseLink, String maybeRelative) {
        if (StrUtil.isBlank(maybeRelative) || isValidHttpUrl(maybeRelative)) {
            return StrUtil.trimToEmpty(maybeRelative);
        }
        try {
            return new URL(new URL(baseLink), maybeRelative).toString();
        } catch (MalformedURLException e) {
            return StrUtil.trimToEmpty(maybeRelative);
        }
    }

    /**
     * 判断是否为合法的 http/https 链接(避免被传入内网地址做 SSRF)
     */
    private boolean isValidHttpUrl(String value) {
        if (StrUtil.isBlank(value)) {
            return false;
        }
        try {
            URL url = new URL(value);
            String protocol = url.getProtocol();
            return "http".equalsIgnoreCase(protocol) || "https".equalsIgnoreCase(protocol);
        } catch (MalformedURLException e) {
            return false;
        }
    }

    /**
     * 根据分类/身份条件计算网页ID过滤集合
     *
     * @return null 表示不需要按分类过滤; 空集合表示条件下必然无数据
     */
    private Set<String> resolveSiteIdFilter(BizSitePublicPageParam param) {
        Set<String> categoryIdSet = new LinkedHashSet<>();
        boolean needFilter = false;

        // 分类过滤: 需要级联包含所有子分类
        if (ObjectUtil.isNotEmpty(param.getCategoryId())) {
            needFilter = true;
            categoryIdSet.addAll(collectSelfAndDescendant(param.getCategoryId()));
        }

        if (!needFilter) {
            return null;
        }
        if (categoryIdSet.isEmpty()) {
            return Collections.emptySet();
        }
        // BIZ_SITE_CATEGORY 为 (SITE_ID, CATEGORY_ID) 复合主键, 实体无 @TableId,
        // 用字符串列名的 QueryWrapper 规避 lambdaQuery 解析主键(pk=null) 的 NPE
        QueryWrapper<BizSiteCategory> scQw = new QueryWrapper<>();
        scQw.in("category_id", categoryIdSet);
        return new LinkedHashSet<>(bizSiteCategoryService.list(scQw)
                .stream()
                .map(BizSiteCategory::getSiteId)
                .filter(ObjectUtil::isNotEmpty)
                .collect(Collectors.toList()));
    }

    /**
     * 获取指定分类自身及其全部后代分类ID
     */
    private Set<String> collectSelfAndDescendant(String categoryId) {
        List<BizCategory> all = bizCategoryService.listByModule(null);
        Map<String, List<BizCategory>> childrenMap = all.stream()
                .filter(category -> ObjectUtil.isNotEmpty(category.getParentId()))
                .collect(Collectors.groupingBy(BizCategory::getParentId));
        Set<String> result = new LinkedHashSet<>();
        List<String> stack = new ArrayList<>();
        stack.add(categoryId);
        while (!stack.isEmpty()) {
            String current = stack.remove(stack.size() - 1);
            // add 返回 false 说明已访问过, 可防御脏数据造成的环
            if (!result.add(current)) {
                continue;
            }
            childrenMap.getOrDefault(current, Collections.emptyList())
                    .forEach(child -> stack.add(child.getId()));
        }
        return result;
    }

    /**
     * 把网页实体批量转换为 VO, 并一次性填充分类信息
     */
    private List<BizSitePublicVo> convertWithCategory(List<BizSite> siteList) {
        if (ObjectUtil.isEmpty(siteList)) {
            return new ArrayList<>();
        }
        List<String> siteIdList = siteList.stream().map(BizSite::getId).collect(Collectors.toList());

        // 1. 一次性取出所有关联关系
        // 用字符串列名的 QueryWrapper, 规避无 @TableId 实体的 lambdaQuery 解析主键(pk=null) 的 NPE
        QueryWrapper<BizSiteCategory> relQw = new QueryWrapper<>();
        relQw.in("site_id", siteIdList);
        List<BizSiteCategory> relationList = bizSiteCategoryService.list(relQw);
        Set<String> categoryIdSet = relationList.stream()
                .map(BizSiteCategory::getCategoryId)
                .filter(ObjectUtil::isNotEmpty)
                .collect(Collectors.toSet());

        // 2. 一次性取出所有分类
        Map<String, BizSiteCategoryPublicVo> categoryVoMap = bizCategoryService.listByIdSet(categoryIdSet)
                .stream()
                .collect(Collectors.toMap(BizCategory::getId, this::convertCategory, (a, b) -> a, LinkedHashMap::new));

        // 3. 建立 siteId -> 分类列表 的映射
        Map<String, List<BizSiteCategoryPublicVo>> siteCategoryMap = new LinkedHashMap<>();
        for (BizSiteCategory relation : relationList) {
            BizSiteCategoryPublicVo categoryVo = categoryVoMap.get(relation.getCategoryId());
            if (categoryVo != null) {
                siteCategoryMap.computeIfAbsent(relation.getSiteId(), key -> new ArrayList<>()).add(categoryVo);
            }
        }

        return siteList.stream().map(site -> {
            BizSitePublicVo vo = BeanUtil.copyProperties(site, BizSitePublicVo.class, "categoryList");
            vo.setRecommend(isYes(site.getIsRecommend()));
            vo.setCategoryList(siteCategoryMap.getOrDefault(site.getId(), new ArrayList<>()));
            return vo;
        }).collect(Collectors.toList());
    }

    /**
     * 把扁平分类列表构建成树
     */
    private List<BizSiteCategoryPublicVo> buildTree(List<BizCategory> categoryList) {
        if (ObjectUtil.isEmpty(categoryList)) {
            return new ArrayList<>();
        }
        Map<String, BizSiteCategoryPublicVo> voMap = new LinkedHashMap<>();
        categoryList.forEach(category -> voMap.put(category.getId(), convertCategory(category)));

        List<BizSiteCategoryPublicVo> roots = new ArrayList<>();
        voMap.values().forEach(vo -> {
            BizSiteCategoryPublicVo parent = ObjectUtil.isEmpty(vo.getParentId()) ? null : voMap.get(vo.getParentId());
            // 父节点不在结果集中时, 当作根节点处理, 避免节点丢失
            if (parent == null) {
                roots.add(vo);
            } else {
                parent.getChildren().add(vo);
            }
        });
        return roots;
    }

    /**
     * 判断 Y|N (兼容 1|0) 标志位是否为"是"
     */
    private boolean isYes(String flag) {
        return flag != null && FLAG_YES_VALUES.contains(flag.trim().toUpperCase());
    }

    /**
     * 分类实体 -> VO
     */
    private BizSiteCategoryPublicVo convertCategory(BizCategory category) {
        BizSiteCategoryPublicVo vo = new BizSiteCategoryPublicVo();
        vo.setId(category.getId());
        vo.setParentId(category.getParentId());
        vo.setName(category.getName());
        vo.setIcon(category.getIcon());
        vo.setSort(category.getSortCode());
        vo.setModule(category.getModule());
        return vo;
    }

    /**
     * 解析排序方向（sortOrder 优先级最高）
     * <p>
     * 兼容 DEC / DESCEND(降序) 与 ASC / ASCEND(升序) 两种写法, 避免浏览器表格常用的 descend
     * 被静默当成升序; 未传或无法识别时按业务默认升序处理。
     *
     * @param sortOrder 前端传入的排序方式
     * @return true 升序, false 降序
     */
    private boolean resolveAsc(String sortOrder) {
        String value = StrUtil.trimToNull(sortOrder);
        return value == null || !("DESC".equalsIgnoreCase(value) || "DESCEND".equalsIgnoreCase(value));
    }

    private long resolveCurrent(BizSitePublicPageParam param) {
        return param.getCurrent() == null || param.getCurrent() < 1 ? 1L : param.getCurrent();
    }

    private long resolveSize(BizSitePublicPageParam param) {
        if (param.getSize() == null || param.getSize() < 1) {
            return 20L;
        }
        return Math.min(param.getSize(), 100);
    }
}
