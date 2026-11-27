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
package vip.xiaonuo.biz.modular.category.service;

import cn.hutool.core.util.StrUtil;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.multipart.MultipartFile;
import vip.xiaonuo.biz.modular.category.entity.BizCategory;
import vip.xiaonuo.biz.modular.category.param.BizCategoryAddParam;
import vip.xiaonuo.biz.modular.category.param.BizCategoryEditParam;
import vip.xiaonuo.biz.modular.category.param.BizCategoryIdParam;
import vip.xiaonuo.biz.modular.category.param.BizCategoryPageParam;
import java.io.Serializable;
import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Set;

/**
 * 通用分类（文章/视频/图文）Service接口
 *
 * @author wuwenlong
 * @date  2026/11/19 02:04
 **/
public interface BizCategoryService extends IService<BizCategory> {

    /**
     * 获取通用分类（文章/视频/图文）分页
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    Page<BizCategory> page(BizCategoryPageParam bizCategoryPageParam);

    /**
     * 添加通用分类（文章/视频/图文）
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    void add(BizCategoryAddParam bizCategoryAddParam);

    /**
     * 编辑通用分类（文章/视频/图文）
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    void edit(BizCategoryEditParam bizCategoryEditParam);

    /**
     * 删除通用分类（文章/视频/图文）
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    void delete(List<BizCategoryIdParam> bizCategoryIdParamList);

    /**
     * 获取通用分类（文章/视频/图文）详情
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    BizCategory detail(BizCategoryIdParam bizCategoryIdParam);

    /**
     * 获取通用分类（文章/视频/图文）详情
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     **/
    BizCategory queryEntity(Serializable id);

    /**
     * 下载通用分类（文章/视频/图文）导入模板
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    void downloadImportTemplate(HttpServletResponse response) throws IOException;

    /**
     * 导入通用分类（文章/视频/图文）
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     **/
    JSONObject importData(MultipartFile file);

    /**
     * 导出通用分类（文章/视频/图文）
     *
     * @author wuwenlong
     * @date  2026/11/19 02:04
     */
    void exportData(List<BizCategoryIdParam> bizCategoryIdParamList, HttpServletResponse response) throws IOException;

    /**
     * 按模块查询分类列表，按 sortCode 升序
     *
     * @author domain-stream
     * @date 2026/11/27
     */
    default List<BizCategory> listByModule(String module) {
        LambdaQueryWrapper<BizCategory> wrapper = new LambdaQueryWrapper<>();
        if (StrUtil.isNotBlank(module)) {
            wrapper.eq(BizCategory::getModule, module);
        }
        wrapper.orderByAsc(BizCategory::getSortCode);
        return this.list(wrapper);
    }

    /**
     * 按ID集合查询分类列表
     *
     * @author domain-stream
     * @date 2026/11/27
     */
    default List<BizCategory> listByIdSet(Set<String> ids) {
        if (ids == null || ids.isEmpty()) {
            return Collections.emptyList();
        }
        return this.listByIds(ids);
    }
}
