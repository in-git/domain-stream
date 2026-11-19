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

import cn.hutool.core.util.StrUtil;
import lombok.Getter;

import java.util.Set;

/**
 * 素材分类枚举，按文件后缀推断
 *
 * @author yubaoshan
 * @date 2026/11/19 10:00
 **/
@Getter
public enum DevFileCategoryEnum {

    /** 图片 */
    IMAGE("IMAGE"),

    /** 视频 */
    VIDEO("VIDEO"),

    /** 音频 */
    AUDIO("AUDIO"),

    /** 文档 */
    DOC("DOC"),

    /** 其他 */
    OTHER("OTHER");

    private final String value;

    DevFileCategoryEnum(String value) {
        this.value = value;
    }

    /** 视频后缀 */
    private static final Set<String> VIDEO_SUFFIXES = Set.of(
            "mp4", "webm", "mov", "avi", "mkv", "flv", "ogv", "m4v", "wmv", "3gp", "mpg", "mpeg", "ts");

    /** 音频后缀 */
    private static final Set<String> AUDIO_SUFFIXES = Set.of(
            "mp3", "wav", "ogg", "m4a", "flac", "aac", "wma", "amr", "opus", "mid", "midi");

    /** 图片后缀 */
    private static final Set<String> IMAGE_SUFFIXES = Set.of(
            "jpg", "jpeg", "png", "gif", "bmp", "webp", "ico", "svg", "psd", "tif", "tiff");

    /** 文档后缀 */
    private static final Set<String> DOC_SUFFIXES = Set.of(
            "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md", "csv", "json", "xml",
            "yml", "yaml", "html", "htm", "wps", "ofd");

    /**
     * 按后缀推断素材分类，后缀为空或未命中时归为其他
     *
     * @author yubaoshan
     * @date 2026/11/19 10:00
     **/
    public static String inferBySuffix(String suffix) {
        if (StrUtil.isBlank(suffix)) {
            return OTHER.value;
        }
        String ext = suffix.toLowerCase().replace(".", "");
        if (VIDEO_SUFFIXES.contains(ext)) {
            return VIDEO.value;
        }
        if (AUDIO_SUFFIXES.contains(ext)) {
            return AUDIO.value;
        }
        if (IMAGE_SUFFIXES.contains(ext)) {
            return IMAGE.value;
        }
        if (DOC_SUFFIXES.contains(ext)) {
            return DOC.value;
        }
        return OTHER.value;
    }
}
