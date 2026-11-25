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
package vip.xiaonuo.biz.modular.graphic.service.impl;

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
import jakarta.annotation.Resource;
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
import vip.xiaonuo.biz.modular.graphic.entity.BizGraphic;
import vip.xiaonuo.biz.modular.graphic.mapper.BizGraphicMapper;
import vip.xiaonuo.biz.modular.graphic.param.BizGraphicAddParam;
import vip.xiaonuo.biz.modular.graphic.param.BizGraphicEditParam;
import vip.xiaonuo.biz.modular.graphic.param.BizGraphicIdParam;
import vip.xiaonuo.biz.modular.graphic.param.BizGraphicPageParam;
import vip.xiaonuo.biz.modular.graphic.service.BizGraphicService;
import vip.xiaonuo.biz.modular.comment.service.BizCommentService;

import vip.xiaonuo.common.util.CommonDownloadUtil;
import vip.xiaonuo.common.util.CommonResponseUtil;

import java.io.File;
import java.io.Serializable;
import java.io.IOException;
import java.util.List;

/**
 * 图文Service接口实现类
 *
 * @author wuwenlong
 * @date  2026/11/19 02:05
 **/
@Service
public class BizGraphicServiceImpl extends ServiceImpl<BizGraphicMapper, BizGraphic> implements BizGraphicService {

    @Resource
    private BizCommentService bizCommentService;

    @Override
    public Page<BizGraphic> page(BizGraphicPageParam bizGraphicPageParam) {
        QueryWrapper<BizGraphic> queryWrapper = new QueryWrapper<BizGraphic>().checkSqlInjection();
        if(ObjectUtil.isAllNotEmpty(bizGraphicPageParam.getSortField(), bizGraphicPageParam.getSortOrder())) {
            CommonSortOrderEnum.validate(bizGraphicPageParam.getSortOrder());
            queryWrapper.orderBy(true, bizGraphicPageParam.getSortOrder().equals(CommonSortOrderEnum.ASC.getValue()),
                    StrUtil.toUnderlineCase(bizGraphicPageParam.getSortField()));
            queryWrapper.lambda().orderByDesc(BizGraphic::getId);
        } else {
            queryWrapper.lambda().orderByAsc(BizGraphic::getSortCode).orderByDesc(BizGraphic::getId);
        }
        // 服务端筛选
        String status = bizGraphicPageParam.getStatus();
        if (StrUtil.isNotBlank(status)) {
            if ("DRAFT".equals(status)) {
                queryWrapper.in("status", "DRAFT", "OFFLINE");
            } else {
                queryWrapper.eq("status", status);
            }
        }
        if (StrUtil.isNotBlank(bizGraphicPageParam.getCategory())) {
            queryWrapper.eq("category", bizGraphicPageParam.getCategory());
        }
        if (StrUtil.isNotBlank(bizGraphicPageParam.getSearchKey())) {
            String keyword = bizGraphicPageParam.getSearchKey().trim();
            queryWrapper.and(wrapper -> wrapper
                    .like("title", keyword)
                    .or().like("summary", keyword)
                    .or().like("content", keyword)
                    .or().like("category", keyword));
        }
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            return new Page<>();
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // CommonSqlUtil.scopeIn(queryWrapper.lambda(), BizGraphic::getOrgId, StpUtil.getLoginIdAsString(), CommonServletUtil.getRequest().getServletPath());
        }
        return this.page(CommonPageRequest.defaultPage(), queryWrapper);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void add(BizGraphicAddParam bizGraphicAddParam) {
        BizGraphic bizGraphic = BeanUtil.toBean(bizGraphicAddParam, BizGraphic.class);
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限增加图文");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // if(!loginUserDataScope.contains(bizGraphic.getOrgId())) {
            //     throw new CommonException("您没有权限在该机构下增加图文");
            // }
        }

        this.save(bizGraphic);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void edit(BizGraphicEditParam bizGraphicEditParam) {
        BizGraphic bizGraphic = this.queryEntity(bizGraphicEditParam.getId());
        BeanUtil.copyProperties(bizGraphicEditParam, bizGraphic);
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限编辑图文");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // if(!loginUserDataScope.contains(bizGraphic.getOrgId())) {
            //     throw new CommonException("您没有权限编辑该机构下的图文");
            // }
        }

        this.updateById(bizGraphic);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void delete(List<BizGraphicIdParam> bizGraphicIdParamList) {
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限删除图文");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如对删除的记录进行数据范围校验
            // Set<String> orgIdSet = this.listByIds(CollStreamUtil.toList(bizGraphicIdParamList, BizGraphicIdParam::getId))
            //         .stream().map(BizGraphic::getOrgId).collect(Collectors.toSet());
            // if(!new HashSet<>(loginUserDataScope).containsAll(orgIdSet)) {
            //     throw new CommonException("您没有权限删除这些机构下的图文");
            // }
        }
        List<String> ids = CollStreamUtil.toList(bizGraphicIdParamList, BizGraphicIdParam::getId);
        bizCommentService.deleteByTarget("IMAGE_TEXT", ids);
        // 执行删除
        this.removeByIds(ids);
    }

    @Override
    public BizGraphic detail(BizGraphicIdParam bizGraphicIdParam) {
        return this.queryEntity(bizGraphicIdParam.getId());
    }

    @Override
    public BizGraphic queryEntity(Serializable id) {
        BizGraphic bizGraphic = this.getById(id);
        if(ObjectUtil.isEmpty(bizGraphic)) {
            throw new CommonException("图文不存在，id值为：{}", id);
        }
        return bizGraphic;
    }

    @Override
    public void downloadImportTemplate(HttpServletResponse response) throws IOException {
       File tempFile = null;
       try {
         List<BizGraphicEditParam> dataList = CollectionUtil.newArrayList();
         String fileName = "图文导入模板_" + DateUtil.format(DateTime.now(), DatePattern.PURE_DATETIME_PATTERN) + ".xlsx";
         tempFile = FileUtil.file(FileUtil.getTmpDir() + FileUtil.FILE_SEPARATOR + fileName);
         EasyExcel.write(tempFile.getPath(), BizGraphicEditParam.class).sheet("图文").doWrite(dataList);
         CommonDownloadUtil.download(tempFile, response);
       } catch (Exception e) {
         log.error(">>> 图文导入模板下载失败：", e);
         CommonResponseUtil.renderError(response, "图文导入模板下载失败");
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
                    FileUtil.FILE_SEPARATOR + "bizGraphicImportTemplate.xlsx"));
            // 读取excel
            List<BizGraphicEditParam> bizGraphicEditParamList =  EasyExcel.read(tempFile).head(BizGraphicEditParam.class).sheet()
                    .headRowNumber(1).doReadSync();
            List<BizGraphic> allDataList = this.list();
            for (int i = 0; i < bizGraphicEditParamList.size(); i++) {
                JSONObject jsonObject = this.doImport(allDataList, bizGraphicEditParamList.get(i), i);
                if(jsonObject.getBool("success")) {
                    successCount += 1;
                } else {
                    errorCount += 1;
                    errorDetail.add(jsonObject);
                }
            }
            return JSONUtil.createObj()
                    .set("totalCount", bizGraphicEditParamList.size())
                    .set("successCount", successCount)
                    .set("errorCount", errorCount)
                    .set("errorDetail", errorDetail);
        } catch (Exception e) {
            log.error(">>> 图文导入失败：", e);
            throw new CommonException("图文导入失败");
        }
    }

    public JSONObject doImport(List<BizGraphic> allDataList, BizGraphicEditParam bizGraphicEditParam, int i) {
        String id = bizGraphicEditParam.getId();
        if(ObjectUtil.hasEmpty(id)) {
            return JSONUtil.createObj().set("index", i + 1).set("success", false).set("msg", "必填字段存在空值");
        } else {
            try {
                int index = CollStreamUtil.toList(allDataList, BizGraphic::getId).indexOf(bizGraphicEditParam.getId());
                BizGraphic bizGraphic;
                boolean isAdd = false;
                if(index == -1) {
                    isAdd = true;
                    bizGraphic = new BizGraphic();
                } else {
                    bizGraphic = allDataList.get(index);
                }
                BeanUtil.copyProperties(bizGraphicEditParam, bizGraphic);
                if(isAdd) {
                    allDataList.add(bizGraphic);
                } else {
                    allDataList.remove(index);
                    allDataList.add(index, bizGraphic);
                }
                this.saveOrUpdate(bizGraphic);
                return JSONUtil.createObj().set("success", true);
            } catch (Exception e) {
              log.error(">>> 数据导入异常：", e);
              return JSONUtil.createObj().set("success", false).set("index", i + 1).set("msg", "数据导入异常");
            }
        }
    }

    @Override
    public void exportData(List<BizGraphicIdParam> bizGraphicIdParamList, HttpServletResponse response) throws IOException {
       File tempFile = null;
       try {
         List<BizGraphicEditParam> dataList;
         if(ObjectUtil.isNotEmpty(bizGraphicIdParamList)) {
            List<Serializable> idList = CollStreamUtil.toList(bizGraphicIdParamList, BizGraphicIdParam::getId);
            dataList = BeanUtil.copyToList(this.listByIds(idList), BizGraphicEditParam.class);
         } else {
            dataList = BeanUtil.copyToList(this.list(), BizGraphicEditParam.class);
         }
         String fileName = "图文_" + DateUtil.format(DateTime.now(), DatePattern.PURE_DATETIME_PATTERN) + ".xlsx";
         tempFile = FileUtil.file(FileUtil.getTmpDir() + FileUtil.FILE_SEPARATOR + fileName);
         EasyExcel.write(tempFile.getPath(), BizGraphicEditParam.class).sheet("图文").doWrite(dataList);
         CommonDownloadUtil.download(tempFile, response);
       } catch (Exception e) {
         log.error(">>> 图文导出失败：", e);
         CommonResponseUtil.renderError(response, "图文导出失败");
       } finally {
         FileUtil.del(tempFile);
       }
    }
}
