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
package vip.xiaonuo.biz.modular.graphic.service;

import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.multipart.MultipartFile;
import vip.xiaonuo.biz.modular.graphic.entity.BizGraphic;
import vip.xiaonuo.biz.modular.graphic.param.BizGraphicAddParam;
import vip.xiaonuo.biz.modular.graphic.param.BizGraphicEditParam;
import vip.xiaonuo.biz.modular.graphic.param.BizGraphicIdParam;
import vip.xiaonuo.biz.modular.graphic.param.BizGraphicPageParam;
import java.io.Serializable;
import java.io.IOException;
import java.util.List;

/**
 * 图文Service接口
 *
 * @author wuwenlong
 * @date  2026/11/19 02:05
 **/
public interface BizGraphicService extends IService<BizGraphic> {

    /**
     * 获取图文分页
     *
     * @author wuwenlong
     * @date  2026/11/19 02:05
     */
    Page<BizGraphic> page(BizGraphicPageParam bizGraphicPageParam);

    /**
     * 添加图文
     *
     * @author wuwenlong
     * @date  2026/11/19 02:05
     */
    void add(BizGraphicAddParam bizGraphicAddParam);

    /**
     * 编辑图文
     *
     * @author wuwenlong
     * @date  2026/11/19 02:05
     */
    void edit(BizGraphicEditParam bizGraphicEditParam);

    /**
     * 删除图文
     *
     * @author wuwenlong
     * @date  2026/11/19 02:05
     */
    void delete(List<BizGraphicIdParam> bizGraphicIdParamList);

    /**
     * 获取图文详情
     *
     * @author wuwenlong
     * @date  2026/11/19 02:05
     */
    BizGraphic detail(BizGraphicIdParam bizGraphicIdParam);

    /**
     * 获取图文详情
     *
     * @author wuwenlong
     * @date  2026/11/19 02:05
     **/
    BizGraphic queryEntity(Serializable id);

    /**
     * 下载图文导入模板
     *
     * @author wuwenlong
     * @date  2026/11/19 02:05
     */
    void downloadImportTemplate(HttpServletResponse response) throws IOException;

    /**
     * 导入图文
     *
     * @author wuwenlong
     * @date  2026/11/19 02:05
     **/
    JSONObject importData(MultipartFile file);

    /**
     * 导出图文
     *
     * @author wuwenlong
     * @date  2026/11/19 02:05
     */
    void exportData(List<BizGraphicIdParam> bizGraphicIdParamList, HttpServletResponse response) throws IOException;
}
