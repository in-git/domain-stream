
package vip.xiaonuo.biz.modular.siteCategory.enums;

import lombok.Getter;

/**
 * 网页分类中间表枚举
 *
 * @author wuwenlong
 * @date  2026/08/08 16:44
 **/
@Getter
public enum BizSiteCategoryEnum {

    /** 测试 */
    TEST("TEST");

    private final String value;

    BizSiteCategoryEnum(String value) {
        this.value = value;
    }
}
