
package vip.xiaonuo.biz.modular.siteCategory.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.collection.CollectionUtil;
import cn.hutool.core.collection.CollStreamUtil;
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
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import cn.dev33.satoken.stp.StpUtil;
import vip.xiaonuo.auth.core.util.StpLoginUserUtil;
import vip.xiaonuo.common.util.CommonServletUtil;
import vip.xiaonuo.common.util.CommonSqlUtil;
import vip.xiaonuo.common.enums.CommonSortOrderEnum;
import vip.xiaonuo.common.exception.CommonException;
import vip.xiaonuo.common.page.CommonPageRequest;
import java.math.BigDecimal;
import java.util.Date;
import vip.xiaonuo.biz.modular.siteCategory.entity.BizSiteCategory;
import vip.xiaonuo.biz.modular.siteCategory.mapper.BizSiteCategoryMapper;
import vip.xiaonuo.biz.modular.siteCategory.param.BizSiteCategoryAddParam;
import vip.xiaonuo.biz.modular.siteCategory.param.BizSiteCategoryEditParam;
import vip.xiaonuo.biz.modular.siteCategory.param.BizSiteCategoryIdParam;
import vip.xiaonuo.biz.modular.siteCategory.param.BizSiteCategoryPageParam;
import vip.xiaonuo.biz.modular.siteCategory.service.BizSiteCategoryService;

import vip.xiaonuo.common.util.CommonDownloadUtil;
import vip.xiaonuo.common.util.CommonResponseUtil;

import java.io.File;
import java.io.Serializable;
import java.io.IOException;
import java.util.List;

/**
 * 网页分类中间表Service接口实现类
 *
 * @author wuwenlong
 * @date  2026/08/08 16:44
 **/
@Service
public class BizSiteCategoryServiceImpl extends ServiceImpl<BizSiteCategoryMapper, BizSiteCategory> implements BizSiteCategoryService {

    @Override
    public Page<BizSiteCategory> page(BizSiteCategoryPageParam bizSiteCategoryPageParam) {
        QueryWrapper<BizSiteCategory> queryWrapper = new QueryWrapper<BizSiteCategory>().checkSqlInjection();
        if(ObjectUtil.isNotEmpty(bizSiteCategoryPageParam.getCategoryId())) {
            queryWrapper.lambda().like(BizSiteCategory::getCategoryId, bizSiteCategoryPageParam.getCategoryId());
        }
        // 该表为 (SITE_ID, CATEGORY_ID) 复合主键, 无 ID 列, 不能引用 @TableField(exist = false) 的虚拟 id 字段
        if(ObjectUtil.isNotEmpty(bizSiteCategoryPageParam.getSiteId())) {
            queryWrapper.lambda().like(BizSiteCategory::getSiteId, bizSiteCategoryPageParam.getSiteId());
        }
        if(ObjectUtil.isNotEmpty(bizSiteCategoryPageParam.getCategoryId())) {
            queryWrapper.lambda().like(BizSiteCategory::getCategoryId, bizSiteCategoryPageParam.getCategoryId());
        }
        if(ObjectUtil.isAllNotEmpty(bizSiteCategoryPageParam.getSortField(), bizSiteCategoryPageParam.getSortOrder())) {
            CommonSortOrderEnum.validate(bizSiteCategoryPageParam.getSortOrder());
            queryWrapper.orderBy(true, bizSiteCategoryPageParam.getSortOrder().equals(CommonSortOrderEnum.ASC.getValue()),
                    StrUtil.toUnderlineCase(bizSiteCategoryPageParam.getSortField()));
        } else {
            queryWrapper.lambda().orderByAsc(BizSiteCategory::getSiteId);
        }
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            return new Page<>();
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // CommonSqlUtil.scopeIn(queryWrapper.lambda(), BizSiteCategory::getOrgId, StpUtil.getLoginIdAsString(), CommonServletUtil.getRequest().getServletPath());
        }
        return this.page(CommonPageRequest.defaultPage(), queryWrapper);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void add(BizSiteCategoryAddParam bizSiteCategoryAddParam) {
        BizSiteCategory bizSiteCategory = BeanUtil.toBean(bizSiteCategoryAddParam, BizSiteCategory.class);
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限增加网页分类中间表");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // if(!loginUserDataScope.contains(bizSiteCategory.getOrgId())) {
            //     throw new CommonException("您没有权限在该机构下增加网页分类中间表");
            // }
        }

        this.save(bizSiteCategory);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void edit(BizSiteCategoryEditParam bizSiteCategoryEditParam) {
        BizSiteCategory bizSiteCategory = this.queryEntity(bizSiteCategoryEditParam.getSiteId());
        BeanUtil.copyProperties(bizSiteCategoryEditParam, bizSiteCategory);
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限编辑网页分类中间表");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // if(!loginUserDataScope.contains(bizSiteCategory.getOrgId())) {
            //     throw new CommonException("您没有权限编辑该机构下的网页分类中间表");
            // }
        }

        this.updateById(bizSiteCategory);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void delete(List<BizSiteCategoryIdParam> bizSiteCategoryIdParamList) {
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限删除网页分类中间表");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如对删除的记录进行数据范围校验
            // Set<String> orgIdSet = this.listByIds(CollStreamUtil.toList(bizSiteCategoryIdParamList, BizSiteCategoryIdParam::getSiteId))
            //         .stream().map(BizSiteCategory::getOrgId).collect(Collectors.toSet());
            // if(!new HashSet<>(loginUserDataScope).containsAll(orgIdSet)) {
            //     throw new CommonException("您没有权限删除这些机构下的网页分类中间表");
            // }
        }
        // 执行删除
        this.removeByIds(CollStreamUtil.toList(bizSiteCategoryIdParamList, BizSiteCategoryIdParam::getSiteId));
    }

    @Override
    public BizSiteCategory detail(BizSiteCategoryIdParam bizSiteCategoryIdParam) {
        return this.queryEntity(bizSiteCategoryIdParam.getSiteId());
    }

    @Override
    public BizSiteCategory queryEntity(Serializable siteId) {
        BizSiteCategory bizSiteCategory = this.getById(siteId);
        if(ObjectUtil.isEmpty(bizSiteCategory)) {
            throw new CommonException("网页分类中间表不存在，siteId值为：{}", siteId);
        }
        return bizSiteCategory;
    }

    @Override
    public void downloadImportTemplate(HttpServletResponse response) throws IOException {
       File tempFile = null;
       try {
         List<BizSiteCategoryEditParam> dataList = CollectionUtil.newArrayList();
         String fileName = "网页分类中间表导入模板_" + DateUtil.format(DateTime.now(), DatePattern.PURE_DATETIME_PATTERN) + ".xlsx";
         tempFile = FileUtil.file(FileUtil.getTmpDir() + FileUtil.FILE_SEPARATOR + fileName);
         EasyExcel.write(tempFile.getPath(), BizSiteCategoryEditParam.class).sheet("网页分类中间表").doWrite(dataList);
         CommonDownloadUtil.download(tempFile, response);
       } catch (Exception e) {
         log.error(">>> 网页分类中间表导入模板下载失败：", e);
         CommonResponseUtil.renderError(response, "网页分类中间表导入模板下载失败");
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
                    FileUtil.FILE_SEPARATOR + "bizSiteCategoryImportTemplate.xlsx"));
            // 读取excel
            List<BizSiteCategoryEditParam> bizSiteCategoryEditParamList =  EasyExcel.read(tempFile).head(BizSiteCategoryEditParam.class).sheet()
                    .headRowNumber(1).doReadSync();
            List<BizSiteCategory> allDataList = this.list();
            for (int i = 0; i < bizSiteCategoryEditParamList.size(); i++) {
                JSONObject jsonObject = this.doImport(allDataList, bizSiteCategoryEditParamList.get(i), i);
                if(jsonObject.getBool("success")) {
                    successCount += 1;
                } else {
                    errorCount += 1;
                    errorDetail.add(jsonObject);
                }
            }
            return JSONUtil.createObj()
                    .set("totalCount", bizSiteCategoryEditParamList.size())
                    .set("successCount", successCount)
                    .set("errorCount", errorCount)
                    .set("errorDetail", errorDetail);
        } catch (Exception e) {
            log.error(">>> 网页分类中间表导入失败：", e);
            throw new CommonException("网页分类中间表导入失败");
        }
    }

    public JSONObject doImport(List<BizSiteCategory> allDataList, BizSiteCategoryEditParam bizSiteCategoryEditParam, int i) {
        String siteId = bizSiteCategoryEditParam.getSiteId();
        if(ObjectUtil.hasEmpty(siteId)) {
            return JSONUtil.createObj().set("index", i + 1).set("success", false).set("msg", "必填字段存在空值");
        } else {
            try {
                int index = CollStreamUtil.toList(allDataList, BizSiteCategory::getSiteId).indexOf(bizSiteCategoryEditParam.getSiteId());
                BizSiteCategory bizSiteCategory;
                boolean isAdd = false;
                if(index == -1) {
                    isAdd = true;
                    bizSiteCategory = new BizSiteCategory();
                } else {
                    bizSiteCategory = allDataList.get(index);
                }
                BeanUtil.copyProperties(bizSiteCategoryEditParam, bizSiteCategory);
                if(isAdd) {
                    allDataList.add(bizSiteCategory);
                } else {
                    allDataList.remove(index);
                    allDataList.add(index, bizSiteCategory);
                }
                this.saveOrUpdate(bizSiteCategory);
                return JSONUtil.createObj().set("success", true);
            } catch (Exception e) {
              log.error(">>> 数据导入异常：", e);
              return JSONUtil.createObj().set("success", false).set("index", i + 1).set("msg", "数据导入异常");
            }
        }
    }

    @Override
    public void exportData(List<BizSiteCategoryIdParam> bizSiteCategoryIdParamList, HttpServletResponse response) throws IOException {
       File tempFile = null;
       try {
         List<BizSiteCategoryEditParam> dataList;
         if(ObjectUtil.isNotEmpty(bizSiteCategoryIdParamList)) {
            List<Serializable> siteIdList = CollStreamUtil.toList(bizSiteCategoryIdParamList, BizSiteCategoryIdParam::getSiteId);
            dataList = BeanUtil.copyToList(this.listByIds(siteIdList), BizSiteCategoryEditParam.class);
         } else {
            dataList = BeanUtil.copyToList(this.list(), BizSiteCategoryEditParam.class);
         }
         String fileName = "网页分类中间表_" + DateUtil.format(DateTime.now(), DatePattern.PURE_DATETIME_PATTERN) + ".xlsx";
         tempFile = FileUtil.file(FileUtil.getTmpDir() + FileUtil.FILE_SEPARATOR + fileName);
         EasyExcel.write(tempFile.getPath(), BizSiteCategoryEditParam.class).sheet("网页分类中间表").doWrite(dataList);
         CommonDownloadUtil.download(tempFile, response);
       } catch (Exception e) {
         log.error(">>> 网页分类中间表导出失败：", e);
         CommonResponseUtil.renderError(response, "网页分类中间表导出失败");
       } finally {
         FileUtil.del(tempFile);
       }
    }
}
