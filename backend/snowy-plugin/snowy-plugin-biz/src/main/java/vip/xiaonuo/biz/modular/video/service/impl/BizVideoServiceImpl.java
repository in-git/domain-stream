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
package vip.xiaonuo.biz.modular.video.service.impl;

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
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
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
import vip.xiaonuo.biz.modular.video.entity.BizVideo;
import vip.xiaonuo.biz.modular.video.mapper.BizVideoMapper;
import vip.xiaonuo.biz.modular.video.param.BizVideoAddParam;
import vip.xiaonuo.biz.modular.video.param.BizVideoEditParam;
import vip.xiaonuo.biz.modular.video.param.BizVideoIdParam;
import vip.xiaonuo.biz.modular.video.param.BizVideoPageParam;
import vip.xiaonuo.biz.modular.video.service.BizVideoService;
import vip.xiaonuo.biz.modular.comment.service.BizCommentService;

import vip.xiaonuo.common.util.CommonDownloadUtil;
import vip.xiaonuo.common.util.CommonResponseUtil;

import java.io.File;
import java.io.Serializable;
import java.io.IOException;
import java.util.List;

/**
 * 视频Service接口实现类
 *
 * @author wuwenlong
 * @date  2026/11/19 02:03
 **/
@Service
public class BizVideoServiceImpl extends ServiceImpl<BizVideoMapper, BizVideo> implements BizVideoService {

    @Resource
    private BizCommentService bizCommentService;

    @Override
    public Page<BizVideo> page(BizVideoPageParam bizVideoPageParam) {
        QueryWrapper<BizVideo> queryWrapper = new QueryWrapper<BizVideo>().checkSqlInjection();
        if(ObjectUtil.isAllNotEmpty(bizVideoPageParam.getSortField(), bizVideoPageParam.getSortOrder())) {
            CommonSortOrderEnum.validate(bizVideoPageParam.getSortOrder());
            queryWrapper.orderBy(true, bizVideoPageParam.getSortOrder().equals(CommonSortOrderEnum.ASC.getValue()),
                    StrUtil.toUnderlineCase(bizVideoPageParam.getSortField()));
        } else {
            queryWrapper.lambda().orderByAsc(BizVideo::getSortCode);
        }
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            return new Page<>();
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // CommonSqlUtil.scopeIn(queryWrapper.lambda(), BizVideo::getOrgId, StpUtil.getLoginIdAsString(), CommonServletUtil.getRequest().getServletPath());
        }
        return this.page(CommonPageRequest.defaultPage(), queryWrapper);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void add(BizVideoAddParam bizVideoAddParam) {
        BizVideo bizVideo = BeanUtil.toBean(bizVideoAddParam, BizVideo.class);
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限增加视频");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // if(!loginUserDataScope.contains(bizVideo.getOrgId())) {
            //     throw new CommonException("您没有权限在该机构下增加视频");
            // }
        }

        this.save(bizVideo);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void edit(BizVideoEditParam bizVideoEditParam) {
        BizVideo bizVideo = this.queryEntity(bizVideoEditParam.getId());
        BeanUtil.copyProperties(bizVideoEditParam, bizVideo);
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限编辑视频");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // if(!loginUserDataScope.contains(bizVideo.getOrgId())) {
            //     throw new CommonException("您没有权限编辑该机构下的视频");
            // }
        }

        this.updateById(bizVideo);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void delete(List<BizVideoIdParam> bizVideoIdParamList) {
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限删除视频");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如对删除的记录进行数据范围校验
            // Set<String> orgIdSet = this.listByIds(CollStreamUtil.toList(bizVideoIdParamList, BizVideoIdParam::getId))
            //         .stream().map(BizVideo::getOrgId).collect(Collectors.toSet());
            // if(!new HashSet<>(loginUserDataScope).containsAll(orgIdSet)) {
            //     throw new CommonException("您没有权限删除这些机构下的视频");
            // }
        }
        List<String> ids = CollStreamUtil.toList(bizVideoIdParamList, BizVideoIdParam::getId);
        bizCommentService.deleteByTarget("VIDEO", ids);
        // 执行删除
        this.removeByIds(ids);
    }

    @Override
    public BizVideo detail(BizVideoIdParam bizVideoIdParam) {
        return this.queryEntity(bizVideoIdParam.getId());
    }

    @Override
    public BizVideo queryEntity(Serializable id) {
        BizVideo bizVideo = this.getById(id);
        if(ObjectUtil.isEmpty(bizVideo)) {
            throw new CommonException("视频不存在，id值为：{}", id);
        }
        return bizVideo;
    }

    @Override
    public void recordView(String id) {
        if (StrUtil.isBlank(id)) {
            return;
        }
        LambdaUpdateWrapper<BizVideo> wrapper = new LambdaUpdateWrapper<>();
        wrapper.eq(BizVideo::getId, id)
                .eq(BizVideo::getStatus, "PUBLISHED")
                .setSql("VIEW_COUNT = IFNULL(VIEW_COUNT, 0) + 1");
        this.update(wrapper);
    }

    @Override
    public void downloadImportTemplate(HttpServletResponse response) throws IOException {
       File tempFile = null;
       try {
         List<BizVideoEditParam> dataList = CollectionUtil.newArrayList();
         String fileName = "视频导入模板_" + DateUtil.format(DateTime.now(), DatePattern.PURE_DATETIME_PATTERN) + ".xlsx";
         tempFile = FileUtil.file(FileUtil.getTmpDir() + FileUtil.FILE_SEPARATOR + fileName);
         EasyExcel.write(tempFile.getPath(), BizVideoEditParam.class).sheet("视频").doWrite(dataList);
         CommonDownloadUtil.download(tempFile, response);
       } catch (Exception e) {
         log.error(">>> 视频导入模板下载失败：", e);
         CommonResponseUtil.renderError(response, "视频导入模板下载失败");
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
                    FileUtil.FILE_SEPARATOR + "bizVideoImportTemplate.xlsx"));
            // 读取excel
            List<BizVideoEditParam> bizVideoEditParamList =  EasyExcel.read(tempFile).head(BizVideoEditParam.class).sheet()
                    .headRowNumber(1).doReadSync();
            List<BizVideo> allDataList = this.list();
            for (int i = 0; i < bizVideoEditParamList.size(); i++) {
                JSONObject jsonObject = this.doImport(allDataList, bizVideoEditParamList.get(i), i);
                if(jsonObject.getBool("success")) {
                    successCount += 1;
                } else {
                    errorCount += 1;
                    errorDetail.add(jsonObject);
                }
            }
            return JSONUtil.createObj()
                    .set("totalCount", bizVideoEditParamList.size())
                    .set("successCount", successCount)
                    .set("errorCount", errorCount)
                    .set("errorDetail", errorDetail);
        } catch (Exception e) {
            log.error(">>> 视频导入失败：", e);
            throw new CommonException("视频导入失败");
        }
    }

    public JSONObject doImport(List<BizVideo> allDataList, BizVideoEditParam bizVideoEditParam, int i) {
        String id = bizVideoEditParam.getId();
        if(ObjectUtil.hasEmpty(id)) {
            return JSONUtil.createObj().set("index", i + 1).set("success", false).set("msg", "必填字段存在空值");
        } else {
            try {
                int index = CollStreamUtil.toList(allDataList, BizVideo::getId).indexOf(bizVideoEditParam.getId());
                BizVideo bizVideo;
                boolean isAdd = false;
                if(index == -1) {
                    isAdd = true;
                    bizVideo = new BizVideo();
                } else {
                    bizVideo = allDataList.get(index);
                }
                BeanUtil.copyProperties(bizVideoEditParam, bizVideo);
                if(isAdd) {
                    allDataList.add(bizVideo);
                } else {
                    allDataList.remove(index);
                    allDataList.add(index, bizVideo);
                }
                this.saveOrUpdate(bizVideo);
                return JSONUtil.createObj().set("success", true);
            } catch (Exception e) {
              log.error(">>> 数据导入异常：", e);
              return JSONUtil.createObj().set("success", false).set("index", i + 1).set("msg", "数据导入异常");
            }
        }
    }

    @Override
    public void exportData(List<BizVideoIdParam> bizVideoIdParamList, HttpServletResponse response) throws IOException {
       File tempFile = null;
       try {
         List<BizVideoEditParam> dataList;
         if(ObjectUtil.isNotEmpty(bizVideoIdParamList)) {
            List<Serializable> idList = CollStreamUtil.toList(bizVideoIdParamList, BizVideoIdParam::getId);
            dataList = BeanUtil.copyToList(this.listByIds(idList), BizVideoEditParam.class);
         } else {
            dataList = BeanUtil.copyToList(this.list(), BizVideoEditParam.class);
         }
         String fileName = "视频_" + DateUtil.format(DateTime.now(), DatePattern.PURE_DATETIME_PATTERN) + ".xlsx";
         tempFile = FileUtil.file(FileUtil.getTmpDir() + FileUtil.FILE_SEPARATOR + fileName);
         EasyExcel.write(tempFile.getPath(), BizVideoEditParam.class).sheet("视频").doWrite(dataList);
         CommonDownloadUtil.download(tempFile, response);
       } catch (Exception e) {
         log.error(">>> 视频导出失败：", e);
         CommonResponseUtil.renderError(response, "视频导出失败");
       } finally {
         FileUtil.del(tempFile);
       }
    }
}
