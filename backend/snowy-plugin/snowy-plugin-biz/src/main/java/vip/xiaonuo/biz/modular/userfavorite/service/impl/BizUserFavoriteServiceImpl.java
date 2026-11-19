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
package vip.xiaonuo.biz.modular.userfavorite.service.impl;

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
import vip.xiaonuo.biz.modular.userfavorite.entity.BizUserFavorite;
import vip.xiaonuo.biz.modular.userfavorite.mapper.BizUserFavoriteMapper;
import vip.xiaonuo.biz.modular.userfavorite.param.BizUserFavoriteAddParam;
import vip.xiaonuo.biz.modular.userfavorite.param.BizUserFavoriteEditParam;
import vip.xiaonuo.biz.modular.userfavorite.param.BizUserFavoriteIdParam;
import vip.xiaonuo.biz.modular.userfavorite.param.BizUserFavoritePageParam;
import vip.xiaonuo.biz.modular.userfavorite.service.BizUserFavoriteService;

import vip.xiaonuo.common.util.CommonDownloadUtil;
import vip.xiaonuo.common.util.CommonResponseUtil;

import java.io.File;
import java.io.Serializable;
import java.io.IOException;
import java.util.List;

/**
 * 用户收藏Service接口实现类
 *
 * @author wuwenlong
 * @date  2026/11/19 20:53
 **/
@Service
public class BizUserFavoriteServiceImpl extends ServiceImpl<BizUserFavoriteMapper, BizUserFavorite> implements BizUserFavoriteService {

    @Override
    public Page<BizUserFavorite> page(BizUserFavoritePageParam bizUserFavoritePageParam) {
        QueryWrapper<BizUserFavorite> queryWrapper = new QueryWrapper<BizUserFavorite>().checkSqlInjection();
        if(ObjectUtil.isAllNotEmpty(bizUserFavoritePageParam.getSortField(), bizUserFavoritePageParam.getSortOrder())) {
            CommonSortOrderEnum.validate(bizUserFavoritePageParam.getSortOrder());
            queryWrapper.orderBy(true, bizUserFavoritePageParam.getSortOrder().equals(CommonSortOrderEnum.ASC.getValue()),
                    StrUtil.toUnderlineCase(bizUserFavoritePageParam.getSortField()));
        } else {
            queryWrapper.lambda().orderByAsc(BizUserFavorite::getSortCode);
        }
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            return new Page<>();
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // CommonSqlUtil.scopeIn(queryWrapper.lambda(), BizUserFavorite::getOrgId, StpUtil.getLoginIdAsString(), CommonServletUtil.getRequest().getServletPath());
        }
        return this.page(CommonPageRequest.defaultPage(), queryWrapper);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void add(BizUserFavoriteAddParam bizUserFavoriteAddParam) {
        BizUserFavorite bizUserFavorite = BeanUtil.toBean(bizUserFavoriteAddParam, BizUserFavorite.class);
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限增加用户收藏");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // if(!loginUserDataScope.contains(bizUserFavorite.getOrgId())) {
            //     throw new CommonException("您没有权限在该机构下增加用户收藏");
            // }
        }

        this.save(bizUserFavorite);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void edit(BizUserFavoriteEditParam bizUserFavoriteEditParam) {
        BizUserFavorite bizUserFavorite = this.queryEntity(bizUserFavoriteEditParam.getId());
        BeanUtil.copyProperties(bizUserFavoriteEditParam, bizUserFavorite);
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限编辑用户收藏");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // if(!loginUserDataScope.contains(bizUserFavorite.getOrgId())) {
            //     throw new CommonException("您没有权限编辑该机构下的用户收藏");
            // }
        }

        this.updateById(bizUserFavorite);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void delete(List<BizUserFavoriteIdParam> bizUserFavoriteIdParamList) {
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限删除用户收藏");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如对删除的记录进行数据范围校验
            // Set<String> orgIdSet = this.listByIds(CollStreamUtil.toList(bizUserFavoriteIdParamList, BizUserFavoriteIdParam::getId))
            //         .stream().map(BizUserFavorite::getOrgId).collect(Collectors.toSet());
            // if(!new HashSet<>(loginUserDataScope).containsAll(orgIdSet)) {
            //     throw new CommonException("您没有权限删除这些机构下的用户收藏");
            // }
        }
        // 执行删除
        this.removeByIds(CollStreamUtil.toList(bizUserFavoriteIdParamList, BizUserFavoriteIdParam::getId));
    }

    @Override
    public BizUserFavorite detail(BizUserFavoriteIdParam bizUserFavoriteIdParam) {
        return this.queryEntity(bizUserFavoriteIdParam.getId());
    }

    @Override
    public BizUserFavorite queryEntity(Serializable id) {
        BizUserFavorite bizUserFavorite = this.getById(id);
        if(ObjectUtil.isEmpty(bizUserFavorite)) {
            throw new CommonException("用户收藏不存在，id值为：{}", id);
        }
        return bizUserFavorite;
    }

    @Override
    public void downloadImportTemplate(HttpServletResponse response) throws IOException {
       File tempFile = null;
       try {
         List<BizUserFavoriteEditParam> dataList = CollectionUtil.newArrayList();
         String fileName = "用户收藏导入模板_" + DateUtil.format(DateTime.now(), DatePattern.PURE_DATETIME_PATTERN) + ".xlsx";
         tempFile = FileUtil.file(FileUtil.getTmpDir() + FileUtil.FILE_SEPARATOR + fileName);
         EasyExcel.write(tempFile.getPath(), BizUserFavoriteEditParam.class).sheet("用户收藏").doWrite(dataList);
         CommonDownloadUtil.download(tempFile, response);
       } catch (Exception e) {
         log.error(">>> 用户收藏导入模板下载失败：", e);
         CommonResponseUtil.renderError(response, "用户收藏导入模板下载失败");
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
                    FileUtil.FILE_SEPARATOR + "bizUserFavoriteImportTemplate.xlsx"));
            // 读取excel
            List<BizUserFavoriteEditParam> bizUserFavoriteEditParamList =  EasyExcel.read(tempFile).head(BizUserFavoriteEditParam.class).sheet()
                    .headRowNumber(1).doReadSync();
            List<BizUserFavorite> allDataList = this.list();
            for (int i = 0; i < bizUserFavoriteEditParamList.size(); i++) {
                JSONObject jsonObject = this.doImport(allDataList, bizUserFavoriteEditParamList.get(i), i);
                if(jsonObject.getBool("success")) {
                    successCount += 1;
                } else {
                    errorCount += 1;
                    errorDetail.add(jsonObject);
                }
            }
            return JSONUtil.createObj()
                    .set("totalCount", bizUserFavoriteEditParamList.size())
                    .set("successCount", successCount)
                    .set("errorCount", errorCount)
                    .set("errorDetail", errorDetail);
        } catch (Exception e) {
            log.error(">>> 用户收藏导入失败：", e);
            throw new CommonException("用户收藏导入失败");
        }
    }

    public JSONObject doImport(List<BizUserFavorite> allDataList, BizUserFavoriteEditParam bizUserFavoriteEditParam, int i) {
        String id = bizUserFavoriteEditParam.getId();
        if(ObjectUtil.hasEmpty(id)) {
            return JSONUtil.createObj().set("index", i + 1).set("success", false).set("msg", "必填字段存在空值");
        } else {
            try {
                int index = CollStreamUtil.toList(allDataList, BizUserFavorite::getId).indexOf(bizUserFavoriteEditParam.getId());
                BizUserFavorite bizUserFavorite;
                boolean isAdd = false;
                if(index == -1) {
                    isAdd = true;
                    bizUserFavorite = new BizUserFavorite();
                } else {
                    bizUserFavorite = allDataList.get(index);
                }
                BeanUtil.copyProperties(bizUserFavoriteEditParam, bizUserFavorite);
                if(isAdd) {
                    allDataList.add(bizUserFavorite);
                } else {
                    allDataList.remove(index);
                    allDataList.add(index, bizUserFavorite);
                }
                this.saveOrUpdate(bizUserFavorite);
                return JSONUtil.createObj().set("success", true);
            } catch (Exception e) {
              log.error(">>> 数据导入异常：", e);
              return JSONUtil.createObj().set("success", false).set("index", i + 1).set("msg", "数据导入异常");
            }
        }
    }

    @Override
    public void exportData(List<BizUserFavoriteIdParam> bizUserFavoriteIdParamList, HttpServletResponse response) throws IOException {
       File tempFile = null;
       try {
         List<BizUserFavoriteEditParam> dataList;
         if(ObjectUtil.isNotEmpty(bizUserFavoriteIdParamList)) {
            List<Serializable> idList = CollStreamUtil.toList(bizUserFavoriteIdParamList, BizUserFavoriteIdParam::getId);
            dataList = BeanUtil.copyToList(this.listByIds(idList), BizUserFavoriteEditParam.class);
         } else {
            dataList = BeanUtil.copyToList(this.list(), BizUserFavoriteEditParam.class);
         }
         String fileName = "用户收藏_" + DateUtil.format(DateTime.now(), DatePattern.PURE_DATETIME_PATTERN) + ".xlsx";
         tempFile = FileUtil.file(FileUtil.getTmpDir() + FileUtil.FILE_SEPARATOR + fileName);
         EasyExcel.write(tempFile.getPath(), BizUserFavoriteEditParam.class).sheet("用户收藏").doWrite(dataList);
         CommonDownloadUtil.download(tempFile, response);
       } catch (Exception e) {
         log.error(">>> 用户收藏导出失败：", e);
         CommonResponseUtil.renderError(response, "用户收藏导出失败");
       } finally {
         FileUtil.del(tempFile);
       }
    }
}
