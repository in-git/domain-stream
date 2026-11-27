
package vip.xiaonuo.biz.modular.site.service;

import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.multipart.MultipartFile;
import vip.xiaonuo.biz.modular.site.entity.BizSite;
import vip.xiaonuo.biz.modular.site.param.BizSiteAddParam;
import vip.xiaonuo.biz.modular.site.param.BizSiteEditParam;
import vip.xiaonuo.biz.modular.site.param.BizSiteIdParam;
import vip.xiaonuo.biz.modular.site.param.BizSitePageParam;
import vip.xiaonuo.biz.modular.site.param.BizSiteUpdateFieldParam;
import java.io.Serializable;
import java.io.IOException;
import java.util.List;

/**
 * 网页数据Service接口
 *
 * @author wuwenlong
 * @date  2026/08/08 16:42
 **/
public interface BizSiteService extends IService<BizSite> {

    /**
     * 获取网页数据分页
     *
     * @author wuwenlong
     * @date  2026/08/08 16:42
     */
    Page<BizSite> page(BizSitePageParam bizSitePageParam);

    /**
     * 添加网页数据
     *
     * @author wuwenlong
     * @date  2026/08/08 16:42
     */
    void add(BizSiteAddParam bizSiteAddParam);

    /**
     * 编辑网页数据
     *
     * @author wuwenlong
     * @date  2026/08/08 16:42
     */
    void edit(BizSiteEditParam bizSiteEditParam);

    /**
     * 更新网页数据单个字段（当前支持：是否可见 visible / 是否推荐 isRecommend）
     *
     * @author wuwenlong
     * @date  2026/08/08 16:42
     */
    void updateField(BizSiteUpdateFieldParam bizSiteUpdateFieldParam);

    /**
     * 删除网页数据
     *
     * @author wuwenlong
     * @date  2026/08/08 16:42
     */
    void delete(List<BizSiteIdParam> bizSiteIdParamList);

    /**
     * 获取网页数据详情
     *
     * @author wuwenlong
     * @date  2026/08/08 16:42
     */
    BizSite detail(BizSiteIdParam bizSiteIdParam);

    /**
     * 获取网页数据详情
     *
     * @author wuwenlong
     * @date  2026/08/08 16:42
     **/
    BizSite queryEntity(Serializable id);

    /**
     * 下载网页数据导入模板
     *
     * @author wuwenlong
     * @date  2026/08/08 16:42
     */
    void downloadImportTemplate(HttpServletResponse response) throws IOException;

    /**
     * 导入网页数据
     *
     * @author wuwenlong
     * @date  2026/08/08 16:42
     **/
    JSONObject importData(MultipartFile file);

    /**
     * 导出网页数据
     *
     * @author wuwenlong
     * @date  2026/08/08 16:42
     */
    void exportData(List<BizSiteIdParam> bizSiteIdParamList, HttpServletResponse response) throws IOException;
}
