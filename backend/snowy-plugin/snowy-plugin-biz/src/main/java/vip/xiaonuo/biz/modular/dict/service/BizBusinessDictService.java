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
package vip.xiaonuo.biz.modular.dict.service;

import com.baomidou.mybatisplus.extension.service.IService;
import vip.xiaonuo.biz.modular.dict.entity.BizDict;
import vip.xiaonuo.biz.modular.dict.param.BizBusinessDictIdParam;
import vip.xiaonuo.biz.modular.dict.param.BizBusinessDictItemAddParam;
import vip.xiaonuo.biz.modular.dict.param.BizBusinessDictItemEditParam;
import vip.xiaonuo.biz.modular.dict.param.BizBusinessDictTypeAddParam;
import vip.xiaonuo.biz.modular.dict.param.BizBusinessDictTypeEditParam;

import java.util.List;

/**
 * 业务字典管理服务接口
 *
 * @author wuwenlong
 * @date 2026/11/28 10:00
 */
public interface BizBusinessDictService extends IService<BizDict> {

    /**
     * 字典类型列表
     *
     * @author wuwenlong
     * @date 2026/11/28 10:00
     */
    List<BizDict> typeList();

    /**
     * 指定类型下的字典项列表
     *
     * @author wuwenlong
     * @date 2026/11/28 10:00
     */
    List<BizDict> itemList(String typeId);

    /**
     * 按类型编码取字典项，供业务页面下拉/筛选项使用
     *
     * @author wuwenlong
     * @date 2026/11/28 10:00
     */
    List<BizDict> options(String typeCode);

    /**
     * 新增字典类型
     *
     * @author wuwenlong
     * @date 2026/11/28 10:00
     */
    void addType(BizBusinessDictTypeAddParam addParam);

    /**
     * 编辑字典类型
     *
     * @author wuwenlong
     * @date 2026/11/28 10:00
     */
    void editType(BizBusinessDictTypeEditParam editParam);

    /**
     * 删除字典类型
     *
     * @author wuwenlong
     * @date 2026/11/28 10:00
     */
    void deleteTypes(List<BizBusinessDictIdParam> idParamList);

    /**
     * 新增字典项
     *
     * @author wuwenlong
     * @date 2026/11/28 10:00
     */
    void addItem(BizBusinessDictItemAddParam addParam);

    /**
     * 编辑字典项
     *
     * @author wuwenlong
     * @date 2026/11/28 10:00
     */
    void editItem(BizBusinessDictItemEditParam editParam);

    /**
     * 删除字典项
     *
     * @author wuwenlong
     * @date 2026/11/28 10:00
     */
    void deleteItems(List<BizBusinessDictIdParam> idParamList);
}
