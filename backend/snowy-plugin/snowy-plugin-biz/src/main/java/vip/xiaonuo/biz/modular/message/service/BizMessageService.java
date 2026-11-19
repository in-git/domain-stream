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
package vip.xiaonuo.biz.modular.message.service;

import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.multipart.MultipartFile;
import vip.xiaonuo.biz.modular.message.entity.BizMessage;
import vip.xiaonuo.biz.modular.message.param.BizMessageAddParam;
import vip.xiaonuo.biz.modular.message.param.BizMessageEditParam;
import vip.xiaonuo.biz.modular.message.param.BizMessageIdParam;
import vip.xiaonuo.biz.modular.message.param.BizMessagePageParam;
import java.io.Serializable;
import java.io.IOException;
import java.util.List;

/**
 * 留言Service接口
 *
 * @author wuwenlong
 * @date  2026/11/19 11:32
 **/
public interface BizMessageService extends IService<BizMessage> {

    /**
     * 获取留言分页
     *
     * @author wuwenlong
     * @date  2026/11/19 11:32
     */
    Page<BizMessage> page(BizMessagePageParam bizMessagePageParam);

    /**
     * 添加留言
     *
     * @author wuwenlong
     * @date  2026/11/19 11:32
     */
    void add(BizMessageAddParam bizMessageAddParam);

    /**
     * 编辑留言
     *
     * @author wuwenlong
     * @date  2026/11/19 11:32
     */
    void edit(BizMessageEditParam bizMessageEditParam);

    /**
     * 删除留言
     *
     * @author wuwenlong
     * @date  2026/11/19 11:32
     */
    void delete(List<BizMessageIdParam> bizMessageIdParamList);

    /**
     * 获取留言详情
     *
     * @author wuwenlong
     * @date  2026/11/19 11:32
     */
    BizMessage detail(BizMessageIdParam bizMessageIdParam);

    /**
     * 获取留言详情
     *
     * @author wuwenlong
     * @date  2026/11/19 11:32
     **/
    BizMessage queryEntity(Serializable id);

    /**
     * 下载留言导入模板
     *
     * @author wuwenlong
     * @date  2026/11/19 11:32
     */
    void downloadImportTemplate(HttpServletResponse response) throws IOException;

    /**
     * 导入留言
     *
     * @author wuwenlong
     * @date  2026/11/19 11:32
     **/
    JSONObject importData(MultipartFile file);

    /**
     * 导出留言
     *
     * @author wuwenlong
     * @date  2026/11/19 11:32
     */
    void exportData(List<BizMessageIdParam> bizMessageIdParamList, HttpServletResponse response) throws IOException;
}
