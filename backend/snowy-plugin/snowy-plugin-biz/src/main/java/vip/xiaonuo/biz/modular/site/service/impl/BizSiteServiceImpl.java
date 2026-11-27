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
import cn.hutool.core.collection.CollStreamUtil;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.collection.CollectionUtil;
import cn.hutool.core.date.DatePattern;
import cn.hutool.core.date.DateTime;
import cn.hutool.core.date.DateUtil;
import cn.hutool.core.io.FileUtil;
import cn.hutool.core.util.ObjectUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.alibaba.excel.EasyExcel;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vip.xiaonuo.auth.core.util.StpLoginUserUtil;
import vip.xiaonuo.biz.modular.site.entity.BizSite;
import vip.xiaonuo.biz.modular.site.enums.BizSiteDeviceTypeEnum;
import vip.xiaonuo.biz.modular.site.mapper.BizSiteMapper;
import vip.xiaonuo.biz.modular.site.param.BizSiteAddParam;
import vip.xiaonuo.biz.modular.site.param.BizSiteEditParam;
import vip.xiaonuo.biz.modular.site.param.BizSiteIdParam;
import vip.xiaonuo.biz.modular.site.param.BizSitePageParam;
import vip.xiaonuo.biz.modular.site.param.BizSiteUpdateFieldParam;
import vip.xiaonuo.biz.modular.site.service.BizSiteService;
import vip.xiaonuo.biz.modular.siteCategory.entity.BizSiteCategory;
import vip.xiaonuo.biz.modular.siteCategory.service.BizSiteCategoryService;
import vip.xiaonuo.biz.modular.category.entity.BizCategory;
import vip.xiaonuo.biz.modular.category.service.BizCategoryService;
import vip.xiaonuo.common.enums.CommonSortOrderEnum;
import vip.xiaonuo.common.exception.CommonException;
import vip.xiaonuo.common.page.CommonPageRequest;
import vip.xiaonuo.common.prop.CommonProperties;
import vip.xiaonuo.common.util.CommonDownloadUtil;
import vip.xiaonuo.common.util.CommonResponseUtil;
import vip.xiaonuo.dev.modular.file.service.DevFileService;

import java.io.File;
import java.io.IOException;
import java.io.Serializable;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 网页数据Service接口实现类
 *
 * @author wuwenlong
 * @date  2026/08/08 16:42
 **/
@Service
public class BizSiteServiceImpl extends ServiceImpl<BizSiteMapper, BizSite> implements BizSiteService {

    /** 开关字段：是否可见 */
    private static final String FLAG_VISIBLE = "visible";
    /** 开关字段：是否推荐 */
    private static final String FLAG_RECOMMEND = "isRecommend";
    /** 开关值：是 */
    private static final String FLAG_YES = "Y";
    /** 开关值：否 */
    private static final String FLAG_NO = "N";

    private final CommonProperties commonProperties;
    private final BizSiteCategoryService bizSiteCategoryService;
    private final BizCategoryService bizCategoryService;
    private final DevFileService devFileService;

    public BizSiteServiceImpl(CommonProperties commonProperties, BizSiteCategoryService bizSiteCategoryService,
                              BizCategoryService bizCategoryService, DevFileService devFileService) {
        this.commonProperties = commonProperties;
        this.bizSiteCategoryService = bizSiteCategoryService;
        this.bizCategoryService = bizCategoryService;
        this.devFileService = devFileService;
    }

    @Override
    public Page<BizSite> page(BizSitePageParam bizSitePageParam) {
        QueryWrapper<BizSite> queryWrapper = new QueryWrapper<BizSite>().checkSqlInjection();
        if(ObjectUtil.isNotEmpty(bizSitePageParam.getName())) {
            queryWrapper.lambda().like(BizSite::getName, bizSitePageParam.getName());
        }
        if(ObjectUtil.isNotEmpty(bizSitePageParam.getDes())) {
            queryWrapper.lambda().like(BizSite::getDes, bizSitePageParam.getDes());
        }
        if(ObjectUtil.isNotEmpty(bizSitePageParam.getLink())) {
            queryWrapper.lambda().like(BizSite::getLink, bizSitePageParam.getLink());
        }
        if(ObjectUtil.isNotEmpty(bizSitePageParam.getVisible())) {
            queryWrapper.lambda().eq(BizSite::getVisible, bizSitePageParam.getVisible());
        }
        if(ObjectUtil.isNotEmpty(bizSitePageParam.getIsRecommend())) {
            queryWrapper.lambda().eq(BizSite::getIsRecommend, bizSitePageParam.getIsRecommend());
        }
        // 按关联分类筛选（多对多中间表 biz_site_category）
        if(ObjectUtil.isNotEmpty(bizSitePageParam.getCategoryIds())) {
            // 展开：若传入的是父级分类，则包含其所有子孙分类；若为叶子则仅自身
            List<String> expandedIds = expandCategoryIds(bizSitePageParam.getCategoryIds());
            // 先通过中间表查询命中分类的 siteId（使用框架 API，非手写 SQL）
            List<BizSiteCategory> matched = bizSiteCategoryService.list(
                    Wrappers.<BizSiteCategory>lambdaQuery().in(BizSiteCategory::getCategoryId, expandedIds));
            if (CollUtil.isNotEmpty(matched)) {
                List<String> siteIds = matched.stream()
                        .map(BizSiteCategory::getSiteId)
                        .distinct()
                        .collect(Collectors.toList());
                queryWrapper.lambda().in(BizSite::getId, siteIds);
            } else {
                // 无匹配站点，保证查询结果为空
                queryWrapper.lambda().in(BizSite::getId, "___no_match___");
            }
        }
        // 按终端类型筛选: device 表示"用户当前使用的设备", 需要返回该设备可展示的全部网页
        List<String> visibleDevices = BizSiteDeviceTypeEnum.resolveVisibleDevices(bizSitePageParam.getDevice());
        if (ObjectUtil.isNotEmpty(visibleDevices)) {
            queryWrapper.lambda().in(BizSite::getDevice, visibleDevices);
        }
        // 按信号值筛选
        if(ObjectUtil.isNotEmpty(bizSitePageParam.getSignal())) {
            queryWrapper.lambda().eq(BizSite::getSignal, bizSitePageParam.getSignal());
        }
        // 排序：sortOrder(排序方向) 优先级最高，只要传了就以它为准；
        // sortField 缺省时回退到业务默认排序字段 ORDER_NUM，保证只传 sortOrder 也能生效
        String sortField = StrUtil.trimToNull(bizSitePageParam.getSortField());
        String sortOrder = StrUtil.trimToNull(bizSitePageParam.getSortOrder());
        if (sortOrder != null) {
            CommonSortOrderEnum.validate(sortOrder);
            boolean asc = CommonSortOrderEnum.ASC.getValue().equalsIgnoreCase(sortOrder);
            if (sortField == null) {
                queryWrapper.lambda().orderBy(true, asc, BizSite::getOrderNum);
            } else {
                queryWrapper.orderBy(true, asc, StrUtil.toUnderlineCase(sortField));
            }
        } else if (sortField != null) {
            // 未指定方向时默认升序
            queryWrapper.orderBy(true, true, StrUtil.toUnderlineCase(sortField));
        } else {
            // 兜底: 业务默认按排序号升序, ORDER_NUM 数值越小越靠前(1高/10中/100低/200默认)
            // ORDER_NUM 可能为 NULL(存量数据或接口新增时未传), MySQL 升序会把 NULL 排在最前,
            // 这里前置 ORDER_NUM IS NULL 把有排序号的数据提上来, NULL 视为最低优先级排最后;
            // 同序号再按创建时间倒序, 保证翻页结果稳定(与公开接口保持一致)
            queryWrapper.last("ORDER BY ORDER_NUM IS NULL ASC, ORDER_NUM ASC, CREATE_TIME DESC");
        }
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            return new Page<>();
        }
        // if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
        //     // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
        //     // CommonSqlUtil.scopeIn(queryWrapper.lambda(), BizSite::getOrgId, StpUtil.getLoginIdAsString(), CommonServletUtil.getRequest().getServletPath());
        // }
        Page<BizSite> page = this.page(CommonPageRequest.defaultPage(), queryWrapper);
        // 将 logo、link、cover 等相对路径字段拼接后端地址(backend-url)
        String backendUrl = commonProperties.getBackendUrl();
        page.getRecords().forEach(record -> {
            fillBackendUrl(record, backendUrl);
            fillCategoryIds(record);
        });
        return page;
    }

    /**
     * 展开分类 id 列表：若传入的是父级分类，则递归包含其下所有子孙分类；
     * 若为叶子分类，则仅包含自身。最终返回去重后的全部相关分类 id。
     */
    private List<String> expandCategoryIds(List<String> categoryIds) {
        // 全量分类，构建 parentId -> 子节点 id 列表、id -> parentId 的映射
        List<BizCategory> allCategories = bizCategoryService.list();
        Map<String, List<String>> childrenMap = allCategories.stream()
                .filter(c -> StrUtil.isNotBlank(c.getParentId()))
                .collect(Collectors.groupingBy(BizCategory::getParentId,
                        Collectors.mapping(BizCategory::getId, Collectors.toList())));
        Map<String, String> parentMap = allCategories.stream()
                .filter(c -> StrUtil.isNotBlank(c.getParentId()))
                .collect(Collectors.toMap(BizCategory::getId, BizCategory::getParentId, (a, b) -> a));

        // 从传入集合中剔除"其祖先也在传入集合中"的节点（即被包含的祖先），
        // 只保留极小覆盖节点：传入[父, 子]时仅保留子，避免父的范围把其他兄弟也纳入；
        // 只传入父节点时 roots 仅含该父节点，从而返回父自身及其全部后代数据。
        Set<String> selected = new LinkedHashSet<>(categoryIds);
        Set<String> roots = new LinkedHashSet<>();
        for (String id : categoryIds) {
            String cursor = parentMap.get(id);
            boolean coveredByAncestor = false;
            while (StrUtil.isNotBlank(cursor)) {
                if (selected.contains(cursor)) {
                    coveredByAncestor = true;
                    break;
                }
                cursor = parentMap.get(cursor);
            }
            if (!coveredByAncestor) {
                roots.add(id);
            }
        }

        // 对每个极小覆盖节点，展开其自身及所有后代分类
        Set<String> result = new LinkedHashSet<>();
        for (String root : roots) {
            collectDescendantIds(root, childrenMap, result);
        }
        return new ArrayList<>(result);
    }

    /**
     * 递归收集某分类自身及其所有后代分类 id
     */
    private void collectDescendantIds(String categoryId, Map<String, List<String>> childrenMap, Set<String> result) {
        result.add(categoryId);
        List<String> children = childrenMap.get(categoryId);
        if (CollUtil.isNotEmpty(children)) {
            for (String childId : children) {
                collectDescendantIds(childId, childrenMap, result);
            }
        }
    }

    /**
     * 若字段为相对路径(以 "/" 开头且非外链),则拼接后端地址;已为绝对地址(http/https)或为空则原样返回
     */
    private void fillBackendUrl(BizSite record, String backendUrl) {
        record.setLogo(parseUrl(record.getLogo(), backendUrl));
        record.setLink(parseUrl(record.getLink(), backendUrl));
    }

    private String parseUrl(String value, String backendUrl) {
        if (StrUtil.isBlank(value) || StrUtil.startWithAny(value, "http://", "https://")) {
            return value;
        }
        if (StrUtil.startWith(value, "/")) {
            return StrUtil.removeSuffix(backendUrl, "/") + value;
        }
        return value;
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void add(BizSiteAddParam bizSiteAddParam) {
        BizSite bizSite = BeanUtil.toBean(bizSiteAddParam, BizSite.class);
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限增加网页数据");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // if(!loginUserDataScope.contains(bizSite.getOrgId())) {
            //     throw new CommonException("您没有权限在该机构下增加网页数据");
            // }
        }

        this.save(bizSite);
        // 写入网页与分类的关联关系
        this.saveCategoryRelations(bizSite.getId(), bizSiteAddParam.getCategoryIds());
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void edit(BizSiteEditParam bizSiteEditParam) {
        BizSite oldBizSite = this.queryEntity(bizSiteEditParam.getId());
        BizSite bizSite = new BizSite();
        BeanUtil.copyProperties(bizSiteEditParam, bizSite);
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限编辑网页数据");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // if(!loginUserDataScope.contains(bizSite.getOrgId())) {
            //     throw new CommonException("您没有权限编辑该机构下的网页数据");
            // }
        }

        // 清理被替换掉的旧图片：logo / cover 任一字段被修改时，
        // 原图片失去引用，需物理删除图床文件，避免产生垃圾文件
        List<String> orphanImageUrls = collectChangedImageUrls(oldBizSite, bizSite);
        deleteOrphanImages(orphanImageUrls, bizSiteEditParam.getId());

        this.updateById(bizSite);
        // 重建网页与分类的关联关系(先删后插)
        this.deleteCategoryRelations(bizSite.getId());
        this.saveCategoryRelations(bizSite.getId(), bizSiteEditParam.getCategoryIds());
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void updateField(BizSiteUpdateFieldParam bizSiteUpdateFieldParam) {
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限编辑网页数据");
        }
        // 白名单校验：仅允许更新受支持的字段，避免被当作任意字段写入的通用入口
        String field = bizSiteUpdateFieldParam.getField();
        if(!FLAG_VISIBLE.equals(field) && !FLAG_RECOMMEND.equals(field)) {
            throw new CommonException("不支持更新的字段：" + field);
        }
        String value = bizSiteUpdateFieldParam.getValue();
        if(!FLAG_YES.equals(value) && !FLAG_NO.equals(value)) {
            throw new CommonException("字段值只能为Y或N");
        }
        // 只更新单个字段，不触碰 logo / cover / 分类关联等其它数据
        BizSite bizSite = new BizSite();
        bizSite.setId(bizSiteUpdateFieldParam.getId());
        if(FLAG_VISIBLE.equals(field)) {
            bizSite.setVisible(value);
        } else {
            bizSite.setIsRecommend(value);
        }
        this.updateById(bizSite);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void delete(List<BizSiteIdParam> bizSiteIdParamList) {
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限删除网页数据");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如对删除的记录进行数据范围校验
            // Set<String> orgIdSet = this.listByIds(CollStreamUtil.toList(bizSiteIdParamList, BizSiteIdParam::getId))
            //         .stream().map(BizSite::getOrgId).collect(Collectors.toSet());
            // if(!new HashSet<>(loginUserDataScope).containsAll(orgIdSet)) {
            //     throw new CommonException("您没有权限删除这些机构下的网页数据");
            // }
        }
        // 执行删除
        List<String> siteIdList = CollStreamUtil.toList(bizSiteIdParamList, BizSiteIdParam::getId);
        // 删除网页时，同步删除其关联的图片文件（logo / cover），避免图床残留垃圾文件
        // 文件删除失败不应阻断网页记录本身的删除，仅记录告警
        List<BizSite> toDeleteList = this.listByIds(siteIdList);
        List<String> imageUrls = toDeleteList.stream()
                .flatMap(site -> collectImageUrls(site).stream())
                .distinct()
                .collect(Collectors.toList());
        try {
            devFileService.deleteByUrls(imageUrls);
        } catch (Exception e) {
            
        }
        siteIdList.forEach(this::deleteCategoryRelations);
        this.removeByIds(siteIdList);
    }

    @Override
    public BizSite detail(BizSiteIdParam bizSiteIdParam) {
        BizSite bizSite = this.queryEntity(bizSiteIdParam.getId());
        fillCategoryIds(bizSite);
        return bizSite;
    }

    @Override
    public BizSite queryEntity(Serializable id) {
        BizSite bizSite = this.getById(id);
        if(ObjectUtil.isEmpty(bizSite)) {
            throw new CommonException("网页数据不存在，id值为：{}", id);
        }
        return bizSite;
    }

    /**
     * 写入网页与分类的关联关系(中间表 BIZ_SITE_CATEGORY)
     * <p>
     * 中间表为复合主键且无 @TableId, 逐条 save 走 insert 自动 SQL, 不依赖主键取值, 比 saveBatch 更安全。
     */
    private void saveCategoryRelations(String siteId, List<String> categoryIds) {
        if(ObjectUtil.isEmpty(categoryIds)) {
            return;
        }
        for(String categoryId : categoryIds) {
            if(StrUtil.isBlank(categoryId)) {
                continue;
            }
            BizSiteCategory relation = new BizSiteCategory();
            relation.setSiteId(siteId);
            relation.setCategoryId(categoryId);
            bizSiteCategoryService.save(relation);
        }
    }

    /**
     * 删除某网页的全部分类关联关系(中间表无 @TableId, 用字符串列名 QueryWrapper 避免 lambda 解析主键 NPE)
     */
    private void deleteCategoryRelations(String siteId) {
        if(StrUtil.isBlank(siteId)) {
            return;
        }
        QueryWrapper<BizSiteCategory> qw = new QueryWrapper<>();
        qw.eq("site_id", siteId);
        bizSiteCategoryService.remove(qw);
    }

    /**
     * 查询并填充网页关联的分类ID列表
     */
    private void fillCategoryIds(BizSite bizSite) {
        if(ObjectUtil.isEmpty(bizSite) || StrUtil.isBlank(bizSite.getId())) {
            return;
        }
        QueryWrapper<BizSiteCategory> qw = new QueryWrapper<>();
        qw.eq("site_id", bizSite.getId());
        List<BizSiteCategory> relations = bizSiteCategoryService.list(qw);
        List<String> categoryIds = relations.stream()
                .map(BizSiteCategory::getCategoryId)
                .filter(ObjectUtil::isNotEmpty)
                .collect(Collectors.toList());
        bizSite.setCategoryIds(categoryIds);
    }

    /**
     * 收集网页记录中的图片地址（logo / cover）
     */
    private List<String> collectImageUrls(BizSite bizSite) {
        List<String> urls = CollectionUtil.newArrayList();
        if (StrUtil.isNotBlank(bizSite.getLogo())) {
            urls.add(bizSite.getLogo());
        }

        return urls;
    }

    /**
     * 对比编辑前后的网页记录，返回被替换掉的旧图片地址（logo / cover 任一字段发生变化时的旧值）
     */
    private List<String> collectChangedImageUrls(BizSite oldSite, BizSite newSite) {
        List<String> changed = CollectionUtil.newArrayList();
        addIfChanged(changed, oldSite.getLogo(), newSite.getLogo());
        return changed;
    }

    private void addIfChanged(List<String> container, String oldUrl, String newUrl) {
        if (StrUtil.isBlank(oldUrl)) {
            return;
        }
        // 字段未被修改，或新值与原值一致，则不视为替换
        if (ObjectUtil.equal(oldUrl, newUrl)) {
            return;
        }
        container.add(oldUrl);
    }

    /**
     * 删除失去引用的图片，若某张旧图片仍被其它网页引用则跳过，避免误删共享图片
     */
    private void deleteOrphanImages(List<String> orphanUrls, String currentSiteId) {
        if (CollUtil.isEmpty(orphanUrls)) {
            return;
        }
        // 排除仍被其它网页使用的图片地址
        List<String> stillUsed = this.list(Wrappers.<BizSite>lambdaQuery()
                        .ne(BizSite::getId, currentSiteId)
                        .and(w -> w.or().in(BizSite::getLogo, orphanUrls)
                                .or()))
                .stream()
                .flatMap(site -> collectImageUrls(site).stream())
                .collect(Collectors.toList());
        List<String> toDelete = orphanUrls.stream()
                .filter(url -> !stillUsed.contains(url))
                .distinct()
                .collect(Collectors.toList());
        devFileService.deleteByUrls(toDelete);
    }

    @Override
    public void downloadImportTemplate(HttpServletResponse response) throws IOException {
       File tempFile = null;
       try {
         List<BizSiteEditParam> dataList = CollectionUtil.newArrayList();
         String fileName = "网页数据导入模板_" + DateUtil.format(DateTime.now(), DatePattern.PURE_DATETIME_PATTERN) + ".xlsx";
         tempFile = FileUtil.file(FileUtil.getTmpDir() + FileUtil.FILE_SEPARATOR + fileName);
         EasyExcel.write(tempFile.getPath(), BizSiteEditParam.class).sheet("网页数据").doWrite(dataList);
         CommonDownloadUtil.download(tempFile, response);
       } catch (Exception e) {
         log.error(">>> 网页数据导入模板下载失败：", e);
         CommonResponseUtil.renderError(response, "网页数据导入模板下载失败");
       } finally {
         FileUtil.del(tempFile);
       }
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public JSONObject importData(MultipartFile file) {
        try {
            int successCount = 0;
            int errorCount = 0;
            JSONArray errorDetail = JSONUtil.createArray();
            // 创建临时文件
            File tempFile = FileUtil.writeBytes(file.getBytes(), FileUtil.file(FileUtil.getTmpDir() +
                    FileUtil.FILE_SEPARATOR + "bizSiteImportTemplate.xlsx"));
            // 读取excel
            List<BizSiteEditParam> bizSiteEditParamList =  EasyExcel.read(tempFile).head(BizSiteEditParam.class).sheet()
                    .headRowNumber(1).doReadSync();
            List<BizSite> allDataList = this.list();
            for (int i = 0; i < bizSiteEditParamList.size(); i++) {
                JSONObject jsonObject = this.doImport(allDataList, bizSiteEditParamList.get(i), i);
                if(jsonObject.getBool("success")) {
                    successCount += 1;
                } else {
                    errorCount += 1;
                    errorDetail.add(jsonObject);
                }
            }
            return JSONUtil.createObj()
                    .set("totalCount", bizSiteEditParamList.size())
                    .set("successCount", successCount)
                    .set("errorCount", errorCount)
                    .set("errorDetail", errorDetail);
        } catch (Exception e) {
            log.error(">>> 网页数据导入失败：", e);
            throw new CommonException("网页数据导入失败");
        }
    }

    public JSONObject doImport(List<BizSite> allDataList, BizSiteEditParam bizSiteEditParam, int i) {
        String id = bizSiteEditParam.getId();
        if(ObjectUtil.hasEmpty(id)) {
            return JSONUtil.createObj().set("index", i + 1).set("success", false).set("msg", "必填字段存在空值");
        } else {
            try {
                int index = CollStreamUtil.toList(allDataList, BizSite::getId).indexOf(bizSiteEditParam.getId());
                BizSite bizSite;
                boolean isAdd = false;
                if(index == -1) {
                    isAdd = true;
                    bizSite = new BizSite();
                } else {
                    bizSite = allDataList.get(index);
                }
                BeanUtil.copyProperties(bizSiteEditParam, bizSite);
                if(isAdd) {
                    allDataList.add(bizSite);
                } else {
                    allDataList.remove(index);
                    allDataList.add(index, bizSite);
                }
                this.saveOrUpdate(bizSite);
                return JSONUtil.createObj().set("success", true);
            } catch (Exception e) {
              log.error(">>> 数据导入异常：", e);
              return JSONUtil.createObj().set("success", false).set("index", i + 1).set("msg", "数据导入异常");
            }
        }
    }

    @Override
    public void exportData(List<BizSiteIdParam> bizSiteIdParamList, HttpServletResponse response) throws IOException {
       File tempFile = null;
       try {
         List<BizSiteEditParam> dataList;
         if(ObjectUtil.isNotEmpty(bizSiteIdParamList)) {
            List<Serializable> idList = CollStreamUtil.toList(bizSiteIdParamList, BizSiteIdParam::getId);
            dataList = BeanUtil.copyToList(this.listByIds(idList), BizSiteEditParam.class);
         } else {
            dataList = BeanUtil.copyToList(this.list(), BizSiteEditParam.class);
         }
         String fileName = "网页数据_" + DateUtil.format(DateTime.now(), DatePattern.PURE_DATETIME_PATTERN) + ".xlsx";
         tempFile = FileUtil.file(FileUtil.getTmpDir() + FileUtil.FILE_SEPARATOR + fileName);
         EasyExcel.write(tempFile.getPath(), BizSiteEditParam.class).sheet("网页数据").doWrite(dataList);
         CommonDownloadUtil.download(tempFile, response);
       } catch (Exception e) {
         log.error(">>> 网页数据导出失败：", e);
         CommonResponseUtil.renderError(response, "网页数据导出失败");
       } finally {
         FileUtil.del(tempFile);
       }
    }
}
