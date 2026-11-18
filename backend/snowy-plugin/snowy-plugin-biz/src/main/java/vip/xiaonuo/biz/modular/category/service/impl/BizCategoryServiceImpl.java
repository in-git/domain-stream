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
package vip.xiaonuo.biz.modular.category.service.impl;

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
import vip.xiaonuo.biz.modular.category.entity.BizCategory;
import vip.xiaonuo.biz.modular.category.mapper.BizCategoryMapper;
import vip.xiaonuo.biz.modular.category.param.BizCategoryAddParam;
import vip.xiaonuo.biz.modular.category.param.BizCategoryEditParam;
import vip.xiaonuo.biz.modular.category.param.BizCategoryIdParam;
import vip.xiaonuo.biz.modular.category.param.BizCategoryPageParam;
import vip.xiaonuo.biz.modular.category.service.BizCategoryService;

import vip.xiaonuo.common.util.CommonDownloadUtil;
import vip.xiaonuo.common.util.CommonResponseUtil;

import java.io.File;
import java.io.Serializable;
import java.io.IOException;
import java.util.List;

/**
 * 通用分类（文章/视频/图文）Service接口实现类
 *
 * @author wuwenlong
 * @date  2026/11/19 02:04
 **/
@Service
public class BizCategoryServiceImpl extends ServiceImpl<BizCategoryMapper, BizCategory> implements BizCategoryService {

    @Override
    public Page<BizCategory> page(BizCategoryPageParam bizCategoryPageParam) {
        QueryWrapper<BizCategory> queryWrapper = new QueryWrapper<BizCategory>().checkSqlInjection();
        if(ObjectUtil.isAllNotEmpty(bizCategoryPageParam.getSortField(), bizCategoryPageParam.getSortOrder())) {
            CommonSortOrderEnum.validate(bizCategoryPageParam.getSortOrder());
            queryWrapper.orderBy(true, bizCategoryPageParam.getSortOrder().equals(CommonSortOrderEnum.ASC.getValue()),
                    StrUtil.toUnderlineCase(bizCategoryPageParam.getSortField()));
        } else {
            queryWrapper.lambda().orderByAsc(BizCategory::getSortCode);
        }
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            return new Page<>();
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // CommonSqlUtil.scopeIn(queryWrapper.lambda(), BizCategory::getOrgId, StpUtil.getLoginIdAsString(), CommonServletUtil.getRequest().getServletPath());
        }
        return this.page(CommonPageRequest.defaultPage(), queryWrapper);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void add(BizCategoryAddParam bizCategoryAddParam) {
        BizCategory bizCategory = BeanUtil.toBean(bizCategoryAddParam, BizCategory.class);
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限增加通用分类（文章/视频/图文）");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // if(!loginUserDataScope.contains(bizCategory.getOrgId())) {
            //     throw new CommonException("您没有权限在该机构下增加通用分类（文章/视频/图文）");
            // }
        }

        this.save(bizCategory);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void edit(BizCategoryEditParam bizCategoryEditParam) {
        BizCategory bizCategory = this.queryEntity(bizCategoryEditParam.getId());
        BeanUtil.copyProperties(bizCategoryEditParam, bizCategory);
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限编辑通用分类（文章/视频/图文）");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // if(!loginUserDataScope.contains(bizCategory.getOrgId())) {
            //     throw new CommonException("您没有权限编辑该机构下的通用分类（文章/视频/图文）");
            // }
        }

        this.updateById(bizCategory);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void delete(List<BizCategoryIdParam> bizCategoryIdParamList) {
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限删除通用分类（文章/视频/图文）");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如对删除的记录进行数据范围校验
            // Set<String> orgIdSet = this.listByIds(CollStreamUtil.toList(bizCategoryIdParamList, BizCategoryIdParam::getId))
            //         .stream().map(BizCategory::getOrgId).collect(Collectors.toSet());
            // if(!new HashSet<>(loginUserDataScope).containsAll(orgIdSet)) {
            //     throw new CommonException("您没有权限删除这些机构下的通用分类（文章/视频/图文）");
            // }
        }
        // 执行删除
        this.removeByIds(CollStreamUtil.toList(bizCategoryIdParamList, BizCategoryIdParam::getId));
    }

    @Override
    public BizCategory detail(BizCategoryIdParam bizCategoryIdParam) {
        return this.queryEntity(bizCategoryIdParam.getId());
    }

    @Override
    public BizCategory queryEntity(Serializable id) {
        BizCategory bizCategory = this.getById(id);
        if(ObjectUtil.isEmpty(bizCategory)) {
            throw new CommonException("通用分类（文章/视频/图文）不存在，id值为：{}", id);
        }
        return bizCategory;
    }

    @Override
    public void downloadImportTemplate(HttpServletResponse response) throws IOException {
       File tempFile = null;
       try {
         List<BizCategoryEditParam> dataList = CollectionUtil.newArrayList();
         String fileName = "通用分类（文章/视频/图文）导入模板_" + DateUtil.format(DateTime.now(), DatePattern.PURE_DATETIME_PATTERN) + ".xlsx";
         tempFile = FileUtil.file(FileUtil.getTmpDir() + FileUtil.FILE_SEPARATOR + fileName);
         EasyExcel.write(tempFile.getPath(), BizCategoryEditParam.class).sheet("通用分类（文章/视频/图文）").doWrite(dataList);
         CommonDownloadUtil.download(tempFile, response);
       } catch (Exception e) {
         log.error(">>> 通用分类（文章/视频/图文）导入模板下载失败：", e);
         CommonResponseUtil.renderError(response, "通用分类（文章/视频/图文）导入模板下载失败");
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
                    FileUtil.FILE_SEPARATOR + "bizCategoryImportTemplate.xlsx"));
            // 读取excel
            List<BizCategoryEditParam> bizCategoryEditParamList =  EasyExcel.read(tempFile).head(BizCategoryEditParam.class).sheet()
                    .headRowNumber(1).doReadSync();
            List<BizCategory> allDataList = this.list();
            for (int i = 0; i < bizCategoryEditParamList.size(); i++) {
                JSONObject jsonObject = this.doImport(allDataList, bizCategoryEditParamList.get(i), i);
                if(jsonObject.getBool("success")) {
                    successCount += 1;
                } else {
                    errorCount += 1;
                    errorDetail.add(jsonObject);
                }
            }
            return JSONUtil.createObj()
                    .set("totalCount", bizCategoryEditParamList.size())
                    .set("successCount", successCount)
                    .set("errorCount", errorCount)
                    .set("errorDetail", errorDetail);
        } catch (Exception e) {
            log.error(">>> 通用分类（文章/视频/图文）导入失败：", e);
            throw new CommonException("通用分类（文章/视频/图文）导入失败");
        }
    }

    public JSONObject doImport(List<BizCategory> allDataList, BizCategoryEditParam bizCategoryEditParam, int i) {
        String id = bizCategoryEditParam.getId();
        if(ObjectUtil.hasEmpty(id)) {
            return JSONUtil.createObj().set("index", i + 1).set("success", false).set("msg", "必填字段存在空值");
        } else {
            try {
                int index = CollStreamUtil.toList(allDataList, BizCategory::getId).indexOf(bizCategoryEditParam.getId());
                BizCategory bizCategory;
                boolean isAdd = false;
                if(index == -1) {
                    isAdd = true;
                    bizCategory = new BizCategory();
                } else {
                    bizCategory = allDataList.get(index);
                }
                BeanUtil.copyProperties(bizCategoryEditParam, bizCategory);
                if(isAdd) {
                    allDataList.add(bizCategory);
                } else {
                    allDataList.remove(index);
                    allDataList.add(index, bizCategory);
                }
                this.saveOrUpdate(bizCategory);
                return JSONUtil.createObj().set("success", true);
            } catch (Exception e) {
              log.error(">>> 数据导入异常：", e);
              return JSONUtil.createObj().set("success", false).set("index", i + 1).set("msg", "数据导入异常");
            }
        }
    }

    @Override
    public void exportData(List<BizCategoryIdParam> bizCategoryIdParamList, HttpServletResponse response) throws IOException {
       File tempFile = null;
       try {
         List<BizCategoryEditParam> dataList;
         if(ObjectUtil.isNotEmpty(bizCategoryIdParamList)) {
            List<Serializable> idList = CollStreamUtil.toList(bizCategoryIdParamList, BizCategoryIdParam::getId);
            dataList = BeanUtil.copyToList(this.listByIds(idList), BizCategoryEditParam.class);
         } else {
            dataList = BeanUtil.copyToList(this.list(), BizCategoryEditParam.class);
         }
         String fileName = "通用分类（文章/视频/图文）_" + DateUtil.format(DateTime.now(), DatePattern.PURE_DATETIME_PATTERN) + ".xlsx";
         tempFile = FileUtil.file(FileUtil.getTmpDir() + FileUtil.FILE_SEPARATOR + fileName);
         EasyExcel.write(tempFile.getPath(), BizCategoryEditParam.class).sheet("通用分类（文章/视频/图文）").doWrite(dataList);
         CommonDownloadUtil.download(tempFile, response);
       } catch (Exception e) {
         log.error(">>> 通用分类（文章/视频/图文）导出失败：", e);
         CommonResponseUtil.renderError(response, "通用分类（文章/视频/图文）导出失败");
       } finally {
         FileUtil.del(tempFile);
       }
    }
}
