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
package vip.xiaonuo.biz.modular.userlike.service;

import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.multipart.MultipartFile;
import vip.xiaonuo.biz.modular.userlike.entity.BizUserLike;
import vip.xiaonuo.biz.modular.userlike.param.BizUserLikeAddParam;
import vip.xiaonuo.biz.modular.userlike.param.BizUserLikeEditParam;
import vip.xiaonuo.biz.modular.userlike.param.BizUserLikeIdParam;
import vip.xiaonuo.biz.modular.userlike.param.BizUserLikePageParam;
import java.io.Serializable;
import java.io.IOException;
import java.util.List;

/**
 * 用户喜欢/点赞记录Service接口
 *
 * @author wuwenlong
 * @date  2026/11/21 19:55
 **/
public interface BizUserLikeService extends IService<BizUserLike> {

    /** 目标类型：视频 */
    String TARGET_VIDEO = "VIDEO";
    /** 目标类型：文章 */
    String TARGET_ARTICLE = "ARTICLE";
    /** 目标类型：图文 */
    String TARGET_IMAGE_TEXT = "IMAGE_TEXT";
    /** 喜欢状态 */
    String STATUS_LIKED = "LIKED";
    /** 取消喜欢状态 */
    String STATUS_UNLIKED = "UNLIKED";

    /**
     * 获取用户喜欢/点赞记录分页
     *
     * @author wuwenlong
     * @date  2026/11/21 19:55
     */
    Page<BizUserLike> page(BizUserLikePageParam bizUserLikePageParam);

    /**
     * 添加用户喜欢/点赞记录
     *
     * @author wuwenlong
     * @date  2026/11/21 19:55
     */
    void add(BizUserLikeAddParam bizUserLikeAddParam);

    /**
     * 编辑用户喜欢/点赞记录
     *
     * @author wuwenlong
     * @date  2026/11/21 19:55
     */
    void edit(BizUserLikeEditParam bizUserLikeEditParam);

    /**
     * 删除用户喜欢/点赞记录
     *
     * @author wuwenlong
     * @date  2026/11/21 19:55
     */
    void delete(List<BizUserLikeIdParam> bizUserLikeIdParamList);

    /**
     * 获取用户喜欢/点赞记录详情
     *
     * @author wuwenlong
     * @date  2026/11/21 19:55
     */
    BizUserLike detail(BizUserLikeIdParam bizUserLikeIdParam);

    /**
     * 获取用户喜欢/点赞记录详情
     *
     * @author wuwenlong
     * @date  2026/11/21 19:55
     **/
    BizUserLike queryEntity(Serializable id);

    /**
     * 前台：切换指定内容的喜欢状态，并同步内容表点赞数
     *
     * @param userId     登录用户ID
     * @param targetId   目标内容ID
     * @param targetType 目标类型：VIDEO/ARTICLE/IMAGE_TEXT
     * @return 当前是否喜欢及最新点赞数
     */
    JSONObject toggle(String userId, String targetId, String targetType);

    /**
     * 前台：查询指定用户已喜欢的内容ID
     *
     * @param userId 登录用户ID
     * @return 已喜欢的内容ID列表
     */
    List<String> likedTargetIds(String userId);

    /**
     * 下载用户喜欢/点赞记录导入模板
     *
     * @author wuwenlong
     * @date  2026/11/21 19:55
     */
    void downloadImportTemplate(HttpServletResponse response) throws IOException;

    /**
     * 导入用户喜欢/点赞记录
     *
     * @author wuwenlong
     * @date  2026/11/21 19:55
     **/
    JSONObject importData(MultipartFile file);

    /**
     * 导出用户喜欢/点赞记录
     *
     * @author wuwenlong
     * @date  2026/11/21 19:55
     */
    void exportData(List<BizUserLikeIdParam> bizUserLikeIdParamList, HttpServletResponse response) throws IOException;
}
