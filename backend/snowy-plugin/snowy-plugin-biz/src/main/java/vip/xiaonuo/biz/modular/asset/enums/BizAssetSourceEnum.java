package vip.xiaonuo.biz.modular.asset.enums;

import lombok.Getter;

/**
 * 远端素材来源
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Getter
public enum BizAssetSourceEnum {

    ICONIFY("ICONIFY", "ICON"),
    ICONS8("ICONS8", "ICON"),
    BING("BING", "WALLPAPER"),
    PICSUM("PICSUM", "WALLPAPER"),
    WALLHAVEN("WALLHAVEN", "WALLPAPER");

    private final String value;
    private final String type;

    BizAssetSourceEnum(String value, String type) {
        this.value = value;
        this.type = type;
    }
}
