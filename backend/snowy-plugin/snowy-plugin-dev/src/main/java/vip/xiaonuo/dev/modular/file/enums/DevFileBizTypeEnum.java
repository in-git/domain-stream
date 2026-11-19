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
package vip.xiaonuo.dev.modular.file.enums;

import lombok.Getter;

/**
 * 文件库类型枚举：用户文件与素材库完全隔离
 *
 * @author yubaoshan
 * @date 2026/11/19 18:00
 **/
@Getter
public enum DevFileBizTypeEnum {

    /** 用户文件：业务表单上传的视频、图片、封面等，一般只用一次 */
    USER("USER"),

    /** 素材库：可复用的素材 */
    MATERIAL("MATERIAL");

    private final String value;

    DevFileBizTypeEnum(String value) {
        this.value = value;
    }

    /**
     * 规范化库类型，空值或非法值按用户文件处理
     */
    public static String normalize(String bizType) {
        if (MATERIAL.getValue().equalsIgnoreCase(bizType)) {
            return MATERIAL.getValue();
        }
        return USER.getValue();
    }
}
