
package vip.xiaonuo.biz.modular.site.enums;

import lombok.Getter;

/**
 * 网页数据枚举
 *
 * @author wuwenlong
 * @date  2026/08/08 16:42
 **/
@Getter
public enum BizSiteEnum {

    /** 测试 */
    TEST("TEST");

    private final String value;

    BizSiteEnum(String value) {
        this.value = value;
    }
}
