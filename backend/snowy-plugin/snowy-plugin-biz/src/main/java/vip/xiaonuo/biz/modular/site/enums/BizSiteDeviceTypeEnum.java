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
 * 6.若您的项目无法满足以上几点，需要更多功能代码，获取商业授权许可，请在官网购买授权，地址为 https://www.xiaonuo.vip
 */
package vip.xiaonuo.biz.modular.site.enums;

import lombok.Getter;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

/**
 * 网页终端类型枚举
 * <p>
 * 一份 TYPE 有两种含义, 使用时要区分清楚:
 * <ol>
 *     <li><b>网页属性</b>: BIZ_SITE.DEVICE 列存的值, 表示该网页适配哪种终端。
 *        PC=仅电脑打开, MOBILE=仅手机打开, COMPATIBLE=两端都能打开。</li>
 *     <li><b>用户设备</b>: 接口入参 device 的含义, 表示访问者此刻用的是什么设备。</li>
 * </ol>
 * 两者之间是"包含"关系而非"相等"关系:
 * 用户用 PC 访问时, 应返回 DEVICE 为 PC 与 COMPATIBLE 的网页;
 * 用户用手机访问时, 应返回 DEVICE 为 MOBILE 与 COMPATIBLE 的网页。
 * <p>
 * 因此列表/分页接口的 device 入参要做 in 查询而非 eq 查询, 否则
 * "仅列举某种适配类型的网页" 与 "该用户实际能看到的网页" 会对不上。
 *
 * @author xiaonuo
 * @date 2026/09/20
 **/
@Getter
public enum BizSiteDeviceTypeEnum {

    /** 仅PC端: 电脑用户可看"仅PC"与"兼容"的网页 */
    PC("PC", Arrays.asList("PC", "COMPATIBLE")),

    /** 仅移动端: 手机用户可看"仅移动端"与"兼容"的网页 */
    MOBILE("MOBILE", Arrays.asList("MOBILE", "COMPATIBLE")),

    /**
     * 兼容(两端都能展示)
     * <p>
     * 作为用户入参时表示不限设备, 因此返回全部三类网页
     */
    COMPATIBLE("COMPATIBLE", Arrays.asList("PC", "MOBILE", "COMPATIBLE"));

    /** 终端类型值, 与 BIZ_SITE.DEVICE 一致 */
    private final String value;

    /** 该设备的用户可展示的网页 DEVICE 取值集合 */
    private final List<String> visibleDevices;

    BizSiteDeviceTypeEnum(String value, List<String> visibleDevices) {
        this.value = value;
        this.visibleDevices = Collections.unmodifiableList(visibleDevices);
    }

    /**
     * 根据用户设备, 解析出需要查询的网页 DEVICE 取值集合
     *
     * @param device 用户设备, 允许任意大小写与首尾空格
     * @return 需要命中的 DEVICE 集合; 入参为空或无法识别时返回 {@code null}, 调用方据此跳过该筛选条件
     */
    public static List<String> resolveVisibleDevices(String device) {
        if (device == null || device.trim().isEmpty()) {
            return null;
        }
        for (BizSiteDeviceTypeEnum item : values()) {
            if (item.getValue().equals(device.trim().toUpperCase(Locale.ROOT))) {
                return item.getVisibleDevices();
            }
        }
        // 未知终端: 不做兜底过滤, 返回原值本身, 由调用方按精确值查询
        return Collections.singletonList(device.trim());
    }
}
