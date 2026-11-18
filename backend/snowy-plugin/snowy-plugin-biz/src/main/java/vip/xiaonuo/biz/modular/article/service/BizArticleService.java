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
package vip.xiaonuo.biz.modular.article.service;

import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.multipart.MultipartFile;
import vip.xiaonuo.biz.modular.article.entity.BizArticle;
import vip.xiaonuo.biz.modular.article.param.BizArticleAddParam;
import vip.xiaonuo.biz.modular.article.param.BizArticleEditParam;
import vip.xiaonuo.biz.modular.article.param.BizArticleIdParam;
import vip.xiaonuo.biz.modular.article.param.BizArticlePageParam;
import java.io.Serializable;
import java.io.IOException;
import java.util.List;

/**
 * 文章Service接口
 *
 * @author wuwenlong
 * @date  2026/11/19 02:04
 **/
public interface BizArticleService extends IService<BizArticle> {

    /**
     * 获取文章分页
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    Page<BizArticle> page(BizArticlePageParam bizArticlePageParam);

    /**
     * 添加文章
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    void add(BizArticleAddParam bizArticleAddParam);

    /**
     * 编辑文章
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    void edit(BizArticleEditParam bizArticleEditParam);

    /**
     * 删除文章
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    void delete(List<BizArticleIdParam> bizArticleIdParamList);

    /**
     * 获取文章详情
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    BizArticle detail(BizArticleIdParam bizArticleIdParam);

    /**
     * 获取文章详情
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     **/
    BizArticle queryEntity(Serializable id);

    /**
     * 下载文章导入模板
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    void downloadImportTemplate(HttpServletResponse response) throws IOException;

    /**
     * 导入文章
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     **/
    JSONObject importData(MultipartFile file);

    /**
     * 导出文章
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    void exportData(List<BizArticleIdParam> bizArticleIdParamList, HttpServletResponse response) throws IOException;
}
