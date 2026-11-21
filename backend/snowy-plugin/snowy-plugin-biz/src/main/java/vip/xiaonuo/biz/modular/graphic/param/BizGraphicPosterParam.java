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
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

/**
 * 文本转图文海报参数
 *
 * 访客只提交「文本 + 标题 + 昵称」，图片由服务端渲染，
 * 避免用户上传任意图片绕过内容审核。
 *
 * @author domain-stream
 * @date 2026/11/21
 **/
@Getter
@Setter
public class BizGraphicPosterParam {

    /** 正文，最多 1000 字 */
    @Schema(description = "正文")
    @NotBlank(message = "内容不能为空")
    @Size(max = 1000, message = "内容不能超过1000字")
    private String content;

    /** 标题，留空时自动取正文首行 */
    @Schema(description = "标题")
    @Size(max = 60, message = "标题不能超过60字")
    private String title;

    /** 作者昵称，留空时取登录用户昵称 */
    @Schema(description = "作者昵称")
    @Size(max = 20, message = "昵称不能超过20字")
    private String nickname;

    /** 卡片主题：warm / mint / sky / lilac / cream，留空使用 warm */
    @Schema(description = "卡片主题")
    @Size(max = 20, message = "主题标识过长")
    private String theme;
}
