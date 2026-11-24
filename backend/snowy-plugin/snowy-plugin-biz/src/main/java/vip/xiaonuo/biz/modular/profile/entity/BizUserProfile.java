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
package vip.xiaonuo.biz.modular.profile.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * C端用户资料实体
 *
 * <p>映射到平台 C 端用户表 CLIENT_USER，仅声明本模块需要的字段，
 * 避免在 biz 插件中直接依赖 client 插件的 modular 实体类。</p>
 *
 * @author domain-stream
 * @date 2026/11/24
 **/
@Getter
@Setter
@TableName("CLIENT_USER")
public class BizUserProfile {

    /** 用户id */
    @TableId
    @Schema(description = "用户id")
    private String id;

    /** 姓名 */
    @Schema(description = "姓名")
    private String name;

    /** 昵称（对外展示名） */
    @Schema(description = "昵称")
    private String nickname;

    /** 个人简介（对应平台 signature 字段，前端以 bio 展示） */
    @Schema(description = "个人简介")
    private String signature;
}
