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
package vip.xiaonuo.biz.modular.graphic.service;

import vip.xiaonuo.biz.modular.graphic.param.BizGraphicPosterParam;

import java.util.List;

/**
 * 图文海报渲染服务
 *
 * 把纯文本排成类小红书风格的方图（封面 + 内页），
 * 输出 data URI 形式的图片，不落盘。
 *
 * @author domain-stream
 * @date 2026/11/21
 **/
public interface BizGraphicPosterService {

    /**
     * 渲染海报，返回 data:image/jpeg;base64 形式的图片列表（第一张为封面）
     *
     * @param param 文本内容与样式参数
     * @param author 展示用作者昵称
     * @return 图片 data URI 列表，至少一张
     */
    List<String> render(BizGraphicPosterParam param, String author);
}
