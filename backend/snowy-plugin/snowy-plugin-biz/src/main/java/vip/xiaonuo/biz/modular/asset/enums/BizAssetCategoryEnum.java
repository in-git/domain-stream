package vip.xiaonuo.biz.modular.asset.enums;

import lombok.Getter;

/**
 * 素材类型编码
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Getter
public enum BizAssetCategoryEnum {

    ICON("ICON"),
    WALLPAPER("WALLPAPER");

    private final String value;

    BizAssetCategoryEnum(String value) {
        this.value = value;
    }
}
