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
package vip.xiaonuo.biz.modular.graphic.param;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * 应用图文生成结果参数
 *
 * 前端预览后可能只保留部分图片，这里接收选中的图片地址，
 * 直接按顺序入库，避免服务端二次排版。
 *
 * @author domain-stream
 * @date 2026/11/21
 **/
@Getter
@Setter
public class BizGraphicPosterApplyParam {

    /** 正文 */
    @Schema(description = "正文")
    @Size(max = 1000, message = "内容不能超过1000字")
    private String content;

    /** 标题，留空时取正文首行 */
    @Schema(description = "标题")
    @Size(max = 60, message = "标题不能超过60字")
    private String title;

    /** 作者昵称 */
    @Schema(description = "作者昵称")
    @Size(max = 20, message = "昵称不能超过20字")
    private String nickname;

    /** 卡片主题 */
    @Schema(description = "卡片主题")
    @Size(max = 20, message = "主题标识过长")
    private String theme;

    /** 已应用的图片地址，顺序即展示顺序 */
    @Schema(description = "图片地址列表")
    @NotEmpty(message = "请至少选择一张图片")
    private List<String> images;
}
