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
package vip.xiaonuo.biz.modular.userlike.service.impl;

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
import vip.xiaonuo.biz.modular.article.entity.BizArticle;
import vip.xiaonuo.biz.modular.article.mapper.BizArticleMapper;
import vip.xiaonuo.biz.modular.graphic.entity.BizGraphic;
import vip.xiaonuo.biz.modular.graphic.mapper.BizGraphicMapper;
import vip.xiaonuo.biz.modular.video.entity.BizVideo;
import vip.xiaonuo.biz.modular.video.mapper.BizVideoMapper;
import vip.xiaonuo.biz.modular.userlike.entity.BizUserLike;
import vip.xiaonuo.biz.modular.userlike.mapper.BizUserLikeMapper;
import vip.xiaonuo.biz.modular.userlike.param.BizUserLikeAddParam;
import vip.xiaonuo.biz.modular.userlike.param.BizUserLikeEditParam;
import vip.xiaonuo.biz.modular.userlike.param.BizUserLikeIdParam;
import vip.xiaonuo.biz.modular.userlike.param.BizUserLikePageParam;
import vip.xiaonuo.biz.modular.userlike.service.BizUserLikeService;

import vip.xiaonuo.common.util.CommonDownloadUtil;
import vip.xiaonuo.common.util.CommonResponseUtil;

import java.io.File;
import java.io.Serializable;
import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * 用户喜欢/点赞记录Service接口实现类
 *
 * @author wuwenlong
 * @date  2026/11/21 19:55
 **/
@Service
public class BizUserLikeServiceImpl extends ServiceImpl<BizUserLikeMapper, BizUserLike> implements BizUserLikeService {

    @Resource
    private BizVideoMapper bizVideoMapper;

    @Resource
    private BizArticleMapper bizArticleMapper;

    @Resource
    private BizGraphicMapper bizGraphicMapper;

    @Override
    public Page<BizUserLike> page(BizUserLikePageParam bizUserLikePageParam) {
        QueryWrapper<BizUserLike> queryWrapper = new QueryWrapper<BizUserLike>().checkSqlInjection();
        if(ObjectUtil.isAllNotEmpty(bizUserLikePageParam.getSortField(), bizUserLikePageParam.getSortOrder())) {
            CommonSortOrderEnum.validate(bizUserLikePageParam.getSortOrder());
            queryWrapper.orderBy(true, bizUserLikePageParam.getSortOrder().equals(CommonSortOrderEnum.ASC.getValue()),
                    StrUtil.toUnderlineCase(bizUserLikePageParam.getSortField()));
        } else {
            queryWrapper.lambda().orderByAsc(BizUserLike::getId);
        }
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            return new Page<>();
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // CommonSqlUtil.scopeIn(queryWrapper.lambda(), BizUserLike::getOrgId, StpUtil.getLoginIdAsString(), CommonServletUtil.getRequest().getServletPath());
        }
        return this.page(CommonPageRequest.defaultPage(), queryWrapper);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void add(BizUserLikeAddParam bizUserLikeAddParam) {
        BizUserLike bizUserLike = BeanUtil.toBean(bizUserLikeAddParam, BizUserLike.class);
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限增加用户喜欢/点赞记录");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // if(!loginUserDataScope.contains(bizUserLike.getOrgId())) {
            //     throw new CommonException("您没有权限在该机构下增加用户喜欢/点赞记录");
            // }
        }

        this.save(bizUserLike);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void edit(BizUserLikeEditParam bizUserLikeEditParam) {
        BizUserLike bizUserLike = this.queryEntity(bizUserLikeEditParam.getId());
        BeanUtil.copyProperties(bizUserLikeEditParam, bizUserLike);
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限编辑用户喜欢/点赞记录");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如：orgId
            // if(!loginUserDataScope.contains(bizUserLike.getOrgId())) {
            //     throw new CommonException("您没有权限编辑该机构下的用户喜欢/点赞记录");
            // }
        }

        this.updateById(bizUserLike);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void delete(List<BizUserLikeIdParam> bizUserLikeIdParamList) {
        // 校验数据范围
        List<String> loginUserDataScope = StpLoginUserUtil.getLoginUserDataScope();
        if(loginUserDataScope != null && loginUserDataScope.isEmpty()) {
            throw new CommonException("您没有权限删除用户喜欢/点赞记录");
        }
        if(ObjectUtil.isNotEmpty(loginUserDataScope)) {
            // 根据业务需要，取消下面注释并修改为实际的数据范围字段，例如对删除的记录进行数据范围校验
            // Set<String> orgIdSet = this.listByIds(CollStreamUtil.toList(bizUserLikeIdParamList, BizUserLikeIdParam::getId))
            //         .stream().map(BizUserLike::getOrgId).collect(Collectors.toSet());
            // if(!new HashSet<>(loginUserDataScope).containsAll(orgIdSet)) {
            //     throw new CommonException("您没有权限删除这些机构下的用户喜欢/点赞记录");
            // }
        }
        // 执行删除
        this.removeByIds(CollStreamUtil.toList(bizUserLikeIdParamList, BizUserLikeIdParam::getId));
    }

    @Override
    public BizUserLike detail(BizUserLikeIdParam bizUserLikeIdParam) {
        return this.queryEntity(bizUserLikeIdParam.getId());
    }

    @Override
    public BizUserLike queryEntity(Serializable id) {
        BizUserLike bizUserLike = this.getById(id);
        if(ObjectUtil.isEmpty(bizUserLike)) {
            throw new CommonException("用户喜欢/点赞记录不存在，id值为：{}", id);
        }
        return bizUserLike;
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public JSONObject toggle(String userId, String targetId, String targetType) {
        if (StrUtil.isBlank(userId) || StrUtil.isBlank(targetId)) {
            throw new CommonException("请先登录后再喜欢");
        }
        if (StrUtil.isBlank(targetType)) {
            targetType = resolveTargetType(targetId);
        }
        if (!TARGET_VIDEO.equals(targetType) && !TARGET_ARTICLE.equals(targetType)
                && !TARGET_IMAGE_TEXT.equals(targetType)) {
            throw new CommonException("不支持的喜欢目标类型");
        }

        BizUserLike like = this.getOne(new LambdaQueryWrapper<BizUserLike>()
                .eq(BizUserLike::getUserId, userId)
                .eq(BizUserLike::getTargetId, targetId)
                .eq(BizUserLike::getTargetType, targetType));

        boolean liked;
        if (like == null) {
            like = new BizUserLike();
            like.setUserId(userId);
            like.setTargetId(targetId);
            like.setTargetType(targetType);
            like.setStatus(STATUS_LIKED);
            like.setLikeTime(new Date());
            this.save(like);
            changeLikeCount(targetType, targetId, 1);
            liked = true;
        } else if (STATUS_LIKED.equals(like.getStatus())) {
            like.setStatus(STATUS_UNLIKED);
            this.updateById(like);
            changeLikeCount(targetType, targetId, -1);
            liked = false;
        } else {
            like.setStatus(STATUS_LIKED);
            if (like.getLikeTime() == null) {
                like.setLikeTime(new Date());
            }
            this.updateById(like);
            changeLikeCount(targetType, targetId, 1);
            liked = true;
        }
        return JSONUtil.createObj()
                .set("liked", liked)
                .set("likeCount", currentLikeCount(targetType, targetId));
    }

    @Override
    public List<String> likedTargetIds(String userId) {
        if (StrUtil.isBlank(userId)) {
            return Collections.emptyList();
        }
        return this.list(new LambdaQueryWrapper<BizUserLike>()
                        .select(BizUserLike::getTargetId)
                        .eq(BizUserLike::getUserId, userId)
                        .eq(BizUserLike::getStatus, STATUS_LIKED)
                        .orderByDesc(BizUserLike::getLikeTime)
                        .orderByDesc(BizUserLike::getCreateTime))
                .stream()
                .map(BizUserLike::getTargetId)
                .filter(StrUtil::isNotBlank)
                .distinct()
                .collect(Collectors.toList());
    }

    /** 未传类型时按ID自动识别内容归属（雪花ID全局唯一） */
    private String resolveTargetType(String targetId) {
        if (bizVideoMapper.selectById(targetId) != null) {
            return TARGET_VIDEO;
        }
        if (bizArticleMapper.selectById(targetId) != null) {
            return TARGET_ARTICLE;
        }
        if (bizGraphicMapper.selectById(targetId) != null) {
            return TARGET_IMAGE_TEXT;
        }
        throw new CommonException("目标内容不存在");
    }

    /** 同步更新内容表的点赞数（保留 CMS 历史初始值，按行原子加减） */
    private void changeLikeCount(String targetType, String targetId, int delta) {
        int rows;
        if (TARGET_VIDEO.equals(targetType)) {
            LambdaUpdateWrapper<BizVideo> wrapper = new LambdaUpdateWrapper<>();
            wrapper.eq(BizVideo::getId, targetId)
                    .setSql("LIKE_COUNT = GREATEST(IFNULL(LIKE_COUNT, 0) + " + delta + ", 0)");
            rows = bizVideoMapper.update(null, wrapper);
        } else if (TARGET_ARTICLE.equals(targetType)) {
            LambdaUpdateWrapper<BizArticle> wrapper = new LambdaUpdateWrapper<>();
            wrapper.eq(BizArticle::getId, targetId)
                    .setSql("LIKE_COUNT = GREATEST(IFNULL(LIKE_COUNT, 0) + " + delta + ", 0)");
            rows = bizArticleMapper.update(null, wrapper);
        } else {
            LambdaUpdateWrapper<BizGraphic> wrapper = new LambdaUpdateWrapper<>();
            wrapper.eq(BizGraphic::getId, targetId)
                    .setSql("LIKE_COUNT = GREATEST(IFNULL(LIKE_COUNT, 0) + " + delta + ", 0)");
            rows = bizGraphicMapper.update(null, wrapper);
        }
        if (rows == 0) {
            throw new CommonException("目标内容不存在");
        }
    }

    private int currentLikeCount(String targetType, String targetId) {
        Integer count = null;
        if (TARGET_VIDEO.equals(targetType)) {
            BizVideo video = bizVideoMapper.selectById(targetId);
            count = video == null ? null : video.getLikeCount();
        } else if (TARGET_ARTICLE.equals(targetType)) {
            BizArticle article = bizArticleMapper.selectById(targetId);
            count = article == null ? null : article.getLikeCount();
        } else {
            BizGraphic graphic = bizGraphicMapper.selectById(targetId);
            count = graphic == null ? null : graphic.getLikeCount();
        }
        return count == null ? 0 : Math.max(count, 0);
    }

    @Override
    public void downloadImportTemplate(HttpServletResponse response) throws IOException {
       File tempFile = null;
       try {
         List<BizUserLikeEditParam> dataList = CollectionUtil.newArrayList();
         String fileName = "用户喜欢/点赞记录导入模板_" + DateUtil.format(DateTime.now(), DatePattern.PURE_DATETIME_PATTERN) + ".xlsx";
         tempFile = FileUtil.file(FileUtil.getTmpDir() + FileUtil.FILE_SEPARATOR + fileName);
         EasyExcel.write(tempFile.getPath(), BizUserLikeEditParam.class).sheet("用户喜欢/点赞记录").doWrite(dataList);
         CommonDownloadUtil.download(tempFile, response);
       } catch (Exception e) {
         log.error(">>> 用户喜欢/点赞记录导入模板下载失败：", e);
         CommonResponseUtil.renderError(response, "用户喜欢/点赞记录导入模板下载失败");
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
                    FileUtil.FILE_SEPARATOR + "bizUserLikeImportTemplate.xlsx"));
            // 读取excel
            List<BizUserLikeEditParam> bizUserLikeEditParamList =  EasyExcel.read(tempFile).head(BizUserLikeEditParam.class).sheet()
                    .headRowNumber(1).doReadSync();
            List<BizUserLike> allDataList = this.list();
            for (int i = 0; i < bizUserLikeEditParamList.size(); i++) {
                JSONObject jsonObject = this.doImport(allDataList, bizUserLikeEditParamList.get(i), i);
                if(jsonObject.getBool("success")) {
                    successCount += 1;
                } else {
                    errorCount += 1;
                    errorDetail.add(jsonObject);
                }
            }
            return JSONUtil.createObj()
                    .set("totalCount", bizUserLikeEditParamList.size())
                    .set("successCount", successCount)
                    .set("errorCount", errorCount)
                    .set("errorDetail", errorDetail);
        } catch (Exception e) {
            log.error(">>> 用户喜欢/点赞记录导入失败：", e);
            throw new CommonException("用户喜欢/点赞记录导入失败");
        }
    }

    public JSONObject doImport(List<BizUserLike> allDataList, BizUserLikeEditParam bizUserLikeEditParam, int i) {
        String id = bizUserLikeEditParam.getId();
        if(ObjectUtil.hasEmpty(id)) {
            return JSONUtil.createObj().set("index", i + 1).set("success", false).set("msg", "必填字段存在空值");
        } else {
            try {
                int index = CollStreamUtil.toList(allDataList, BizUserLike::getId).indexOf(bizUserLikeEditParam.getId());
                BizUserLike bizUserLike;
                boolean isAdd = false;
                if(index == -1) {
                    isAdd = true;
                    bizUserLike = new BizUserLike();
                } else {
                    bizUserLike = allDataList.get(index);
                }
                BeanUtil.copyProperties(bizUserLikeEditParam, bizUserLike);
                if(isAdd) {
                    allDataList.add(bizUserLike);
                } else {
                    allDataList.remove(index);
                    allDataList.add(index, bizUserLike);
                }
                this.saveOrUpdate(bizUserLike);
                return JSONUtil.createObj().set("success", true);
            } catch (Exception e) {
              log.error(">>> 数据导入异常：", e);
              return JSONUtil.createObj().set("success", false).set("index", i + 1).set("msg", "数据导入异常");
            }
        }
    }

    @Override
    public void exportData(List<BizUserLikeIdParam> bizUserLikeIdParamList, HttpServletResponse response) throws IOException {
       File tempFile = null;
       try {
         List<BizUserLikeEditParam> dataList;
         if(ObjectUtil.isNotEmpty(bizUserLikeIdParamList)) {
            List<Serializable> idList = CollStreamUtil.toList(bizUserLikeIdParamList, BizUserLikeIdParam::getId);
            dataList = BeanUtil.copyToList(this.listByIds(idList), BizUserLikeEditParam.class);
         } else {
            dataList = BeanUtil.copyToList(this.list(), BizUserLikeEditParam.class);
         }
         String fileName = "用户喜欢/点赞记录_" + DateUtil.format(DateTime.now(), DatePattern.PURE_DATETIME_PATTERN) + ".xlsx";
         tempFile = FileUtil.file(FileUtil.getTmpDir() + FileUtil.FILE_SEPARATOR + fileName);
         EasyExcel.write(tempFile.getPath(), BizUserLikeEditParam.class).sheet("用户喜欢/点赞记录").doWrite(dataList);
         CommonDownloadUtil.download(tempFile, response);
       } catch (Exception e) {
         log.error(">>> 用户喜欢/点赞记录导出失败：", e);
         CommonResponseUtil.renderError(response, "用户喜欢/点赞记录导出失败");
       } finally {
         FileUtil.del(tempFile);
       }
    }
}
