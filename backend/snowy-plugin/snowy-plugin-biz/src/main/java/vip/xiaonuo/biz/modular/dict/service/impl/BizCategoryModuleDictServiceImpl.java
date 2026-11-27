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
package vip.xiaonuo.biz.modular.dict.service.impl;

import cn.hutool.core.collection.CollStreamUtil;
import cn.hutool.core.util.ObjectUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vip.xiaonuo.biz.modular.dict.entity.BizDict;
import vip.xiaonuo.biz.modular.dict.enums.BizDictCategoryEnum;
import vip.xiaonuo.biz.modular.dict.mapper.BizDictMapper;
import vip.xiaonuo.biz.modular.dict.param.BizCategoryModuleDictAddParam;
import vip.xiaonuo.biz.modular.dict.param.BizCategoryModuleDictEditParam;
import vip.xiaonuo.biz.modular.dict.param.BizCategoryModuleDictIdParam;
import vip.xiaonuo.biz.modular.dict.service.BizCategoryModuleDictService;
import vip.xiaonuo.common.exception.CommonException;

import java.util.List;

/**
 * 通用分类适用模块字典服务实现
 *
 * @author wuwenlong
 * @date 2026/11/27 12:00
 */
@Service
public class BizCategoryModuleDictServiceImpl extends ServiceImpl<BizDictMapper, BizDict>
        implements BizCategoryModuleDictService {

    /** 字典类型编码，与 sql/category_module_dict.sql 保持一致 */
    public static final String DICT_TYPE = "CATEGORY_MODULE";

    private static final String ROOT_PARENT_ID = "0";

    @Override
    public List<BizDict> options() {
        BizDict type = queryType();
        return this.list(new LambdaQueryWrapper<BizDict>()
                .eq(BizDict::getCategory, BizDictCategoryEnum.BIZ.getValue())
                .eq(BizDict::getParentId, type.getId())
                .orderByAsc(BizDict::getSortCode)
                .orderByAsc(BizDict::getId));
    }

    @Override
    public BizDict detail(BizCategoryModuleDictIdParam idParam) {
        return queryItem(idParam.getId());
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void add(BizCategoryModuleDictAddParam addParam) {
        BizDict type = queryType();
        String label = StrUtil.trim(addParam.getDictLabel());
        String value = StrUtil.trim(addParam.getDictValue());
        checkDuplicate(type.getId(), label, value, null);

        BizDict item = new BizDict();
        item.setParentId(type.getId());
        item.setDictLabel(label);
        item.setDictValue(value);
        item.setDictColor(StrUtil.blankToDefault(addParam.getDictColor(), "default"));
        item.setCategory(BizDictCategoryEnum.BIZ.getValue());
        item.setSortCode(addParam.getSortCode());
        this.save(item);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void edit(BizCategoryModuleDictEditParam editParam) {
        BizDict item = queryItem(editParam.getId());
        BizDict type = queryType();
        checkBelongToType(item, type.getId());

        String label = StrUtil.trim(editParam.getDictLabel());
        String value = StrUtil.trim(editParam.getDictValue());
        checkDuplicate(type.getId(), label, value, item.getId());

        item.setDictLabel(label);
        item.setDictValue(value);
        item.setDictColor(StrUtil.blankToDefault(editParam.getDictColor(), "default"));
        item.setSortCode(editParam.getSortCode());
        this.updateById(item);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void delete(List<BizCategoryModuleDictIdParam> idParamList) {
        List<String> ids = CollStreamUtil.toList(idParamList, BizCategoryModuleDictIdParam::getId);
        if (ObjectUtil.isEmpty(ids)) {
            return;
        }
        BizDict type = queryType();
        List<BizDict> items = this.listByIds(ids);
        if (items.size() != ids.size()) {
            throw new CommonException("部分字典项不存在，无法删除");
        }
        items.forEach(item -> checkBelongToType(item, type.getId()));
        this.removeByIds(ids);
    }

    /** 查询 CATEGORY_MODULE 字典类型根节点 */
    private BizDict queryType() {
        BizDict type = this.getOne(new LambdaQueryWrapper<BizDict>()
                .eq(BizDict::getCategory, BizDictCategoryEnum.BIZ.getValue())
                .eq(BizDict::getParentId, ROOT_PARENT_ID)
                .eq(BizDict::getDictValue, DICT_TYPE));
        if (ObjectUtil.isEmpty(type)) {
            throw new CommonException("业务字典类型不存在：CATEGORY_MODULE，请先执行 sql/category_module_dict.sql");
        }
        return type;
    }

    /** 查询字典项并校验存在性 */
    private BizDict queryItem(String id) {
        BizDict item = this.getById(id);
        if (ObjectUtil.isEmpty(item)) {
            throw new CommonException("字典项不存在，id值为：{}", id);
        }
        return item;
    }

    /** 校验字典项属于 CATEGORY_MODULE，根字典和其他类型不允许操作 */
    private void checkBelongToType(BizDict item, String typeId) {
        if (!BizDictCategoryEnum.BIZ.getValue().equals(item.getCategory()) || !typeId.equals(item.getParentId())) {
            throw new CommonException("该字典项不属于通用分类适用模块，无法操作");
        }
    }

    /** 校验同一类型下字典文字和字典值唯一 */
    private void checkDuplicate(String typeId, String label, String value, String excludeId) {
        boolean hasSameLabel = this.count(new LambdaQueryWrapper<BizDict>()
                .eq(BizDict::getCategory, BizDictCategoryEnum.BIZ.getValue())
                .eq(BizDict::getParentId, typeId)
                .eq(BizDict::getDictLabel, label)
                .ne(ObjectUtil.isNotEmpty(excludeId), BizDict::getId, excludeId)) > 0;
        if (hasSameLabel) {
            throw new CommonException("存在重复的字典文字：{}", label);
        }

        boolean hasSameValue = this.count(new LambdaQueryWrapper<BizDict>()
                .eq(BizDict::getCategory, BizDictCategoryEnum.BIZ.getValue())
                .eq(BizDict::getParentId, typeId)
                .eq(BizDict::getDictValue, value)
                .ne(ObjectUtil.isNotEmpty(excludeId), BizDict::getId, excludeId)) > 0;
        if (hasSameValue) {
            throw new CommonException("存在重复的字典值：{}", value);
        }
    }
}
