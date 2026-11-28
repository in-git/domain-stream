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
import vip.xiaonuo.biz.modular.dict.param.BizBusinessDictIdParam;
import vip.xiaonuo.biz.modular.dict.param.BizBusinessDictItemAddParam;
import vip.xiaonuo.biz.modular.dict.param.BizBusinessDictItemEditParam;
import vip.xiaonuo.biz.modular.dict.param.BizBusinessDictTypeAddParam;
import vip.xiaonuo.biz.modular.dict.param.BizBusinessDictTypeEditParam;
import vip.xiaonuo.biz.modular.dict.service.BizBusinessDictService;
import vip.xiaonuo.common.exception.CommonException;

import java.util.Collections;
import java.util.List;

/**
 * 业务字典管理服务实现
 *
 * @author wuwenlong
 * @date 2026/11/28 10:00
 */
@Service
public class BizBusinessDictServiceImpl extends ServiceImpl<BizDictMapper, BizDict>
        implements BizBusinessDictService {

    private static final String ROOT_PARENT_ID = "0";

    @Override
    public List<BizDict> typeList() {
        return this.list(new LambdaQueryWrapper<BizDict>()
                .eq(BizDict::getCategory, BizDictCategoryEnum.BIZ.getValue())
                .eq(BizDict::getParentId, ROOT_PARENT_ID)
                .orderByAsc(BizDict::getSortCode)
                .orderByAsc(BizDict::getId));
    }

    @Override
    public List<BizDict> itemList(String typeId) {
        BizDict type = queryType(typeId);
        return listItems(type.getId());
    }

    @Override
    public List<BizDict> options(String typeCode) {
        if (StrUtil.isBlank(typeCode)) {
            return Collections.emptyList();
        }
        BizDict type = this.getOne(new LambdaQueryWrapper<BizDict>()
                .eq(BizDict::getCategory, BizDictCategoryEnum.BIZ.getValue())
                .eq(BizDict::getParentId, ROOT_PARENT_ID)
                .eq(BizDict::getDictValue, StrUtil.trim(typeCode))
                .last("limit 1"));
        if (ObjectUtil.isEmpty(type)) {
            return Collections.emptyList();
        }
        return listItems(type.getId());
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void addType(BizBusinessDictTypeAddParam addParam) {
        String label = StrUtil.trim(addParam.getDictLabel());
        String value = StrUtil.trim(addParam.getDictValue());
        checkTypeDuplicate(label, value, null);

        BizDict type = new BizDict();
        type.setParentId(ROOT_PARENT_ID);
        type.setDictLabel(label);
        type.setDictValue(value);
        type.setDictColor(StrUtil.blankToDefault(addParam.getDictColor(), "default"));
        type.setCategory(BizDictCategoryEnum.BIZ.getValue());
        type.setSortCode(addParam.getSortCode());
        this.save(type);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void editType(BizBusinessDictTypeEditParam editParam) {
        BizDict type = queryType(editParam.getId());
        String label = StrUtil.trim(editParam.getDictLabel());
        String value = StrUtil.trim(editParam.getDictValue());
        checkTypeDuplicate(label, value, type.getId());

        type.setDictLabel(label);
        type.setDictValue(value);
        type.setDictColor(StrUtil.blankToDefault(editParam.getDictColor(), "default"));
        type.setSortCode(editParam.getSortCode());
        this.updateById(type);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void deleteTypes(List<BizBusinessDictIdParam> idParamList) {
        List<String> ids = CollStreamUtil.toList(idParamList, BizBusinessDictIdParam::getId);
        if (ObjectUtil.isEmpty(ids)) {
            return;
        }
        for (String id : ids) {
            BizDict type = queryType(id);
            long itemCount = this.count(new LambdaQueryWrapper<BizDict>()
                    .eq(BizDict::getCategory, BizDictCategoryEnum.BIZ.getValue())
                    .eq(BizDict::getParentId, type.getId()));
            if (itemCount > 0) {
                throw new CommonException("字典类型【{}】下还有字典项，无法删除", type.getDictLabel());
            }
        }
        this.removeByIds(ids);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void addItem(BizBusinessDictItemAddParam addParam) {
        BizDict type = queryType(addParam.getTypeId());
        String label = StrUtil.trim(addParam.getDictLabel());
        String value = StrUtil.trim(addParam.getDictValue());
        checkItemDuplicate(type.getId(), label, value, null);

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
    public void editItem(BizBusinessDictItemEditParam editParam) {
        BizDict item = queryItem(editParam.getId());
        String label = StrUtil.trim(editParam.getDictLabel());
        String value = StrUtil.trim(editParam.getDictValue());
        checkItemDuplicate(item.getParentId(), label, value, item.getId());

        item.setDictLabel(label);
        item.setDictValue(value);
        item.setDictColor(StrUtil.blankToDefault(editParam.getDictColor(), "default"));
        item.setSortCode(editParam.getSortCode());
        this.updateById(item);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void deleteItems(List<BizBusinessDictIdParam> idParamList) {
        List<String> ids = CollStreamUtil.toList(idParamList, BizBusinessDictIdParam::getId);
        if (ObjectUtil.isEmpty(ids)) {
            return;
        }
        ids.forEach(this::queryItem);
        this.removeByIds(ids);
    }

    /** 查询字典类型并校验是业务字典根节点 */
    private BizDict queryType(String id) {
        BizDict type = this.getById(id);
        if (ObjectUtil.isEmpty(type)
                || !BizDictCategoryEnum.BIZ.getValue().equals(type.getCategory())
                || !ROOT_PARENT_ID.equals(type.getParentId())) {
            throw new CommonException("字典类型不存在，id值为：{}", id);
        }
        return type;
    }

    /** 查询字典项并校验是业务字典子节点 */
    private BizDict queryItem(String id) {
        BizDict item = this.getById(id);
        if (ObjectUtil.isEmpty(item)
                || !BizDictCategoryEnum.BIZ.getValue().equals(item.getCategory())
                || ROOT_PARENT_ID.equals(item.getParentId())) {
            throw new CommonException("字典项不存在，id值为：{}", id);
        }
        return item;
    }

    /** 查询指定类型下的字典项 */
    private List<BizDict> listItems(String typeId) {
        return this.list(new LambdaQueryWrapper<BizDict>()
                .eq(BizDict::getCategory, BizDictCategoryEnum.BIZ.getValue())
                .eq(BizDict::getParentId, typeId)
                .orderByAsc(BizDict::getSortCode)
                .orderByAsc(BizDict::getId));
    }

    /** 校验字典类型名称与编码唯一 */
    private void checkTypeDuplicate(String label, String value, String excludeId) {
        boolean sameLabel = this.count(new LambdaQueryWrapper<BizDict>()
                .eq(BizDict::getCategory, BizDictCategoryEnum.BIZ.getValue())
                .eq(BizDict::getParentId, ROOT_PARENT_ID)
                .eq(BizDict::getDictLabel, label)
                .ne(ObjectUtil.isNotEmpty(excludeId), BizDict::getId, excludeId)) > 0;
        if (sameLabel) {
            throw new CommonException("存在重复的字典类型名称：{}", label);
        }
        boolean sameValue = this.count(new LambdaQueryWrapper<BizDict>()
                .eq(BizDict::getCategory, BizDictCategoryEnum.BIZ.getValue())
                .eq(BizDict::getParentId, ROOT_PARENT_ID)
                .eq(BizDict::getDictValue, value)
                .ne(ObjectUtil.isNotEmpty(excludeId), BizDict::getId, excludeId)) > 0;
        if (sameValue) {
            throw new CommonException("存在重复的字典类型编码：{}", value);
        }
    }

    /** 校验同一类型下字典文字与字典值唯一 */
    private void checkItemDuplicate(String typeId, String label, String value, String excludeId) {
        boolean sameLabel = this.count(new LambdaQueryWrapper<BizDict>()
                .eq(BizDict::getCategory, BizDictCategoryEnum.BIZ.getValue())
                .eq(BizDict::getParentId, typeId)
                .eq(BizDict::getDictLabel, label)
                .ne(ObjectUtil.isNotEmpty(excludeId), BizDict::getId, excludeId)) > 0;
        if (sameLabel) {
            throw new CommonException("存在重复的字典文字：{}", label);
        }
        boolean sameValue = this.count(new LambdaQueryWrapper<BizDict>()
                .eq(BizDict::getCategory, BizDictCategoryEnum.BIZ.getValue())
                .eq(BizDict::getParentId, typeId)
                .eq(BizDict::getDictValue, value)
                .ne(ObjectUtil.isNotEmpty(excludeId), BizDict::getId, excludeId)) > 0;
        if (sameValue) {
            throw new CommonException("存在重复的字典值：{}", value);
        }
    }
}
