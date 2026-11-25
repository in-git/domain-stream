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
package vip.xiaonuo.biz.modular.article.service.impl;

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
import vip.xiaonuo.biz.modular.article.entity.BizArticle;
import vip.xiaonuo.biz.modular.article.mapper.BizArticleMapper;
import vip.xiaonuo.biz.modular.article.param.BizArticleAddParam;
import vip.xiaonuo.biz.modular.article.param.BizArticleEditParam;
import vip.xiaonuo.biz.modular.article.param.BizArticleIdParam;
import vip.xiaonuo.biz.modular.article.param.BizArticlePageParam;
import vip.xiaonuo.biz.modular.article.service.BizArticleService;
import vip.xiaonuo.biz.modular.comment.service.BizCommentService;

import vip.xiaonuo.common.util.CommonDownloadUtil;
import vip.xiaonuo.common.util.CommonResponseUtil;

import java.io.File;
import java.io.Serializable;
import java.io.IOException;
import java.util.List;

/**
 * 文章Service接口实现类
 *
 * @author wuwenlong
 * @date  2026/11/19 02:04
 **/
@Service
public class BizArticleServiceImpl extends ServiceImpl<BizArticleMapper, BizArticle> implements BizArticleService {

    @Resource
    private BizCommentService bizCommentService;

    @Override
    public Page<BizArticle> page(BizArticlePageParam bizArticlePageParam) {
        QueryWrapper<BizArticle> queryWrapper = new QueryWrapper<BizArticle>().checkSqlInjection();
        if(ObjectUtil.isAllNotEmpty(bizArticlePageParam.getSortField(), bizArticlePageParam.getSortOrder())) {
            CommonSortOrderEnum.validate(bizArticlePageParam.getSortOrder());
            queryWrapper.orderBy(true, bizArticlePageParam.getSortOrder().equals(CommonSortOrderEnum.ASC.getValue()),
                    StrUtil.toUnderlineCase(bizArticlePageParam.getSortField()));
            // 加唯一 tie-breaker，避免 create_time 重复/为空时分页跨页漏数据
            queryWrapper.lambda().orderByDesc(BizArticle::getId);
        } else {
            queryWrapper.lambda().orderByAsc(BizArticle::getSortCode).orderByDesc(BizArticle::getId);
        }
        // 服务端筛选，保证分页/总数与前端查询条件一致
        String status = bizArticlePageParam.getStatus();
        if (StrUtil.isNotBlank(status)) {
            // CMS 的“草稿”同时包含草稿和已下架，保持与前端原映射一致
            if ("DRAFT".equals(status)) {
                queryWrapper.in("status", "DRAFT", "OFFLINE");
            } else {
                queryWrapper.eq("status", status);
            }
        }
        if (StrUtil.isNotBlank(bizArticlePageParam.getCategory())) {
            queryWrapper.eq("category", bizArticlePageParam.getCategory());
        }
        if (StrUtil.isNotBlank(bizArticlePageParam.getCreateUser())) {
            queryWrapper.eq("create_user", bizArticlePageParam.getCreateUser());
        }
        if (StrUtil.isNotBlank(bizArticlePageParam.getSearchKey())) {
            String keyword = bizArticlePageParam.getSearchKey().trim();
            queryWrapper.and(wrapper -> wrapper
                    .like("title", keyword)
                    .or().like("summary", keyword)
                    .or().like("category", keyword)
                    .or().like("author", keyword));
        }
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            return new Page<>();
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // CommonSqlUtil.scopeIn(queryWrapper.lambda(), BizArticle::getOrgId, StpUtil.getLoginIdAsString(), CommonServletUtil.getRequest().getServletPath());
        }
        return this.page(CommonPageRequest.defaultPage(), queryWrapper);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void add(BizArticleAddParam bizArticleAddParam) {
        BizArticle bizArticle = BeanUtil.toBean(bizArticleAddParam, BizArticle.class);
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限增加文章");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // if(!loginUserDataScope.contains(bizArticle.getOrgId())) {
            //     throw new CommonException("您没有权限在该机构下增加文章");
            // }
        }

        this.save(bizArticle);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void edit(BizArticleEditParam bizArticleEditParam) {
        BizArticle bizArticle = this.queryEntity(bizArticleEditParam.getId());
        BeanUtil.copyProperties(bizArticleEditParam, bizArticle);
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限编辑文章");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // if(!loginUserDataScope.contains(bizArticle.getOrgId())) {
            //     throw new CommonException("您没有权限编辑该机构下的文章");
            // }
        }

        this.updateById(bizArticle);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void delete(List<BizArticleIdParam> bizArticleIdParamList) {
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限删除文章");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如对删除的记录进行数据范围校验
            // Set<String> orgIdSet = this.listByIds(CollStreamUtil.toList(bizArticleIdParamList, BizArticleIdParam::getId))
            //         .stream().map(BizArticle::getOrgId).collect(Collectors.toSet());
            // if(!new HashSet<>(loginUserDataScope).containsAll(orgIdSet)) {
            //     throw new CommonException("您没有权限删除这些机构下的文章");
            // }
        }
        List<String> ids = CollStreamUtil.toList(bizArticleIdParamList, BizArticleIdParam::getId);
        bizCommentService.deleteByTarget("ARTICLE", ids);
        // 执行删除
        this.removeByIds(ids);
    }

    @Override
    public BizArticle detail(BizArticleIdParam bizArticleIdParam) {
        return this.queryEntity(bizArticleIdParam.getId());
    }

    @Override
    public BizArticle queryEntity(Serializable id) {
        BizArticle bizArticle = this.getById(id);
        if(ObjectUtil.isEmpty(bizArticle)) {
            throw new CommonException("文章不存在，id值为：{}", id);
        }
        return bizArticle;
    }

    @Override
    public void downloadImportTemplate(HttpServletResponse response) throws IOException {
       File tempFile = null;
       try {
         List<BizArticleEditParam> dataList = CollectionUtil.newArrayList();
         String fileName = "文章导入模板_" + DateUtil.format(DateTime.now(), DatePattern.PURE_DATETIME_PATTERN) + ".xlsx";
         tempFile = FileUtil.file(FileUtil.getTmpDir() + FileUtil.FILE_SEPARATOR + fileName);
         EasyExcel.write(tempFile.getPath(), BizArticleEditParam.class).sheet("文章").doWrite(dataList);
         CommonDownloadUtil.download(tempFile, response);
       } catch (Exception e) {
         log.error(">>> 文章导入模板下载失败：", e);
         CommonResponseUtil.renderError(response, "文章导入模板下载失败");
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
                    FileUtil.FILE_SEPARATOR + "bizArticleImportTemplate.xlsx"));
            // 读取excel
            List<BizArticleEditParam> bizArticleEditParamList =  EasyExcel.read(tempFile).head(BizArticleEditParam.class).sheet()
                    .headRowNumber(1).doReadSync();
            List<BizArticle> allDataList = this.list();
            for (int i = 0; i < bizArticleEditParamList.size(); i++) {
                JSONObject jsonObject = this.doImport(allDataList, bizArticleEditParamList.get(i), i);
                if(jsonObject.getBool("success")) {
                    successCount += 1;
                } else {
                    errorCount += 1;
                    errorDetail.add(jsonObject);
                }
            }
            return JSONUtil.createObj()
                    .set("totalCount", bizArticleEditParamList.size())
                    .set("successCount", successCount)
                    .set("errorCount", errorCount)
                    .set("errorDetail", errorDetail);
        } catch (Exception e) {
            log.error(">>> 文章导入失败：", e);
            throw new CommonException("文章导入失败");
        }
    }

    public JSONObject doImport(List<BizArticle> allDataList, BizArticleEditParam bizArticleEditParam, int i) {
        String id = bizArticleEditParam.getId();
        if(ObjectUtil.hasEmpty(id)) {
            return JSONUtil.createObj().set("index", i + 1).set("success", false).set("msg", "必填字段存在空值");
        } else {
            try {
                int index = CollStreamUtil.toList(allDataList, BizArticle::getId).indexOf(bizArticleEditParam.getId());
                BizArticle bizArticle;
                boolean isAdd = false;
                if(index == -1) {
                    isAdd = true;
                    bizArticle = new BizArticle();
                } else {
                    bizArticle = allDataList.get(index);
                }
                BeanUtil.copyProperties(bizArticleEditParam, bizArticle);
                if(isAdd) {
                    allDataList.add(bizArticle);
                } else {
                    allDataList.remove(index);
                    allDataList.add(index, bizArticle);
                }
                this.saveOrUpdate(bizArticle);
                return JSONUtil.createObj().set("success", true);
            } catch (Exception e) {
              log.error(">>> 数据导入异常：", e);
              return JSONUtil.createObj().set("success", false).set("index", i + 1).set("msg", "数据导入异常");
            }
        }
    }

    @Override
    public void exportData(List<BizArticleIdParam> bizArticleIdParamList, HttpServletResponse response) throws IOException {
       File tempFile = null;
       try {
         List<BizArticleEditParam> dataList;
         if(ObjectUtil.isNotEmpty(bizArticleIdParamList)) {
            List<Serializable> idList = CollStreamUtil.toList(bizArticleIdParamList, BizArticleIdParam::getId);
            dataList = BeanUtil.copyToList(this.listByIds(idList), BizArticleEditParam.class);
         } else {
            dataList = BeanUtil.copyToList(this.list(), BizArticleEditParam.class);
         }
         String fileName = "文章_" + DateUtil.format(DateTime.now(), DatePattern.PURE_DATETIME_PATTERN) + ".xlsx";
         tempFile = FileUtil.file(FileUtil.getTmpDir() + FileUtil.FILE_SEPARATOR + fileName);
         EasyExcel.write(tempFile.getPath(), BizArticleEditParam.class).sheet("文章").doWrite(dataList);
         CommonDownloadUtil.download(tempFile, response);
       } catch (Exception e) {
         log.error(">>> 文章导出失败：", e);
         CommonResponseUtil.renderError(response, "文章导出失败");
       } finally {
         FileUtil.del(tempFile);
       }
    }
}
