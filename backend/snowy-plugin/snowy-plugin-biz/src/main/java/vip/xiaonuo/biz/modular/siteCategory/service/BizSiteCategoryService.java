
package vip.xiaonuo.biz.modular.siteCategory.service;

import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.multipart.MultipartFile;
import vip.xiaonuo.biz.modular.siteCategory.entity.BizSiteCategory;
import vip.xiaonuo.biz.modular.siteCategory.param.BizSiteCategoryAddParam;
import vip.xiaonuo.biz.modular.siteCategory.param.BizSiteCategoryEditParam;
import vip.xiaonuo.biz.modular.siteCategory.param.BizSiteCategoryIdParam;
import vip.xiaonuo.biz.modular.siteCategory.param.BizSiteCategoryPageParam;
import java.io.Serializable;
import java.io.IOException;
import java.util.List;

/**
 * 网页分类中间表Service接口
 *
 * @author wuwenlong
 * @date  2026/08/08 16:44
 **/
public interface BizSiteCategoryService extends IService<BizSiteCategory> {

    /**
     * 获取网页分类中间表分页
     *
     * @author wuwenlong
     * @date  2026/08/08 16:44
     */
    Page<BizSiteCategory> page(BizSiteCategoryPageParam bizSiteCategoryPageParam);

    /**
     * 添加网页分类中间表
     *
     * @author wuwenlong
     * @date  2026/08/08 16:44
     */
    void add(BizSiteCategoryAddParam bizSiteCategoryAddParam);

    /**
     * 编辑网页分类中间表
     *
     * @author wuwenlong
     * @date  2026/08/08 16:44
     */
    void edit(BizSiteCategoryEditParam bizSiteCategoryEditParam);

    /**
     * 删除网页分类中间表
     *
     * @author wuwenlong
     * @date  2026/08/08 16:44
     */
    void delete(List<BizSiteCategoryIdParam> bizSiteCategoryIdParamList);

    /**
     * 获取网页分类中间表详情
     *
     * @author wuwenlong
     * @date  2026/08/08 16:44
     */
    BizSiteCategory detail(BizSiteCategoryIdParam bizSiteCategoryIdParam);

    /**
     * 获取网页分类中间表详情
     *
     * @author wuwenlong
     * @date  2026/08/08 16:44
     **/
    BizSiteCategory queryEntity(Serializable siteId);

    /**
     * 下载网页分类中间表导入模板
     *
     * @author wuwenlong
     * @date  2026/08/08 16:44
     */
    void downloadImportTemplate(HttpServletResponse response) throws IOException;

    /**
     * 导入网页分类中间表
     *
     * @author wuwenlong
     * @date  2026/08/08 16:44
     **/
    JSONObject importData(MultipartFile file);

    /**
     * 导出网页分类中间表
     *
     * @author wuwenlong
     * @date  2026/08/08 16:44
     */
    void exportData(List<BizSiteCategoryIdParam> bizSiteCategoryIdParamList, HttpServletResponse response) throws IOException;
}
