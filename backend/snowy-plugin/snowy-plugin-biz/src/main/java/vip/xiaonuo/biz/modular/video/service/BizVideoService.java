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
package vip.xiaonuo.biz.modular.video.service;

import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.multipart.MultipartFile;
import vip.xiaonuo.biz.modular.video.entity.BizVideo;
import vip.xiaonuo.biz.modular.video.param.BizVideoAddParam;
import vip.xiaonuo.biz.modular.video.param.BizVideoEditParam;
import vip.xiaonuo.biz.modular.video.param.BizVideoIdParam;
import vip.xiaonuo.biz.modular.video.param.BizVideoPageParam;
import java.io.Serializable;
import java.io.IOException;
import java.util.List;

/**
 * 视频Service接口
 *
 * @author wuwenlong
 * @date  2026/11/19 02:03
 **/
public interface BizVideoService extends IService<BizVideo> {

    /**
     * 获取视频分页
     *
     * @author wuwenlong
     * @date  2026/11/19 02:03
     */
    Page<BizVideo> page(BizVideoPageParam bizVideoPageParam);

    /**
     * 添加视频
     *
     * @author wuwenlong
     * @date  2026/11/19 02:03
     */
    void add(BizVideoAddParam bizVideoAddParam);

    /**
     * 编辑视频
     *
     * @author wuwenlong
     * @date  2026/11/19 02:03
     */
    void edit(BizVideoEditParam bizVideoEditParam);

    /**
     * 删除视频
     *
     * @author wuwenlong
     * @date  2026/11/19 02:03
     */
    void delete(List<BizVideoIdParam> bizVideoIdParamList);

    /**
     * 获取视频详情
     *
     * @author wuwenlong
     * @date  2026/11/19 02:03
     */
    BizVideo detail(BizVideoIdParam bizVideoIdParam);

    /**
     * 获取视频详情
     *
     * @author wuwenlong
     * @date  2026/11/19 02:03
     **/
    BizVideo queryEntity(Serializable id);

    /**
     * 下载视频导入模板
     *
     * @author wuwenlong
     * @date  2026/11/19 02:03
     */
    void downloadImportTemplate(HttpServletResponse response) throws IOException;

    /**
     * 导入视频
     *
     * @author wuwenlong
     * @date  2026/11/19 02:03
     **/
    JSONObject importData(MultipartFile file);

    /**
     * 导出视频
     *
     * @author wuwenlong
     * @date  2026/11/19 02:03
     */
    void exportData(List<BizVideoIdParam> bizVideoIdParamList, HttpServletResponse response) throws IOException;
}
