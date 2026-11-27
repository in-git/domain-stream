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
package vip.xiaonuo.biz.modular.site.param;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

/**
 * 网页数据公开分页查询参数
 *
 * @author wuwenlong
 * @date 2026/08/08
 **/
@Getter
@Setter
public class BizSitePublicPageParam {

    /** 当前页 */
    @Schema(description = "当前页")
    private Integer current;

    /** 每页条数 */
    @Schema(description = "每页条数")
    private Integer size;

    /** 关键字搜索, 对 名称/描述/链接 做模糊匹配 */
    @Schema(description = "搜索关键字(名称/描述/链接 模糊匹配)")
    private String searchKey;

    /** 分类ID, 传入后只返回该分类(含其所有子分类)下的网页 */
    @Schema(description = "分类ID, 会级联包含子分类")
    private String categoryId;

    /**
     * 推荐过滤, 三态:
     * <p>
     * TRUE -> 只看推荐; FALSE -> 只看非推荐; 不传或 null -> 不过滤该字段(推荐与非推荐都返回)
     */
    @Schema(description = "推荐过滤: true 只看推荐, false 只看非推荐, 不传则不过滤")
    private Boolean recommend;

    /**
     * 用户设备类型(PC|MOBILE|COMPATIBLE), 表示该用户此刻使用的设备
     * <p>
     * 按"该设备能看到哪些网页"筛选, 而非只查 DEVICE 列等于该值的网页:
     * PC -> DEVICE in (PC, COMPATIBLE);
     * MOBILE -> DEVICE in (MOBILE, COMPATIBLE);
     * COMPATIBLE(不限设备) -> 全部三类。
     */
    @Schema(description = "用户设备类型(PC|MOBILE|COMPATIBLE)：PC 返回 PC+兼容，MOBILE 返回 MOBILE+兼容，COMPATIBLE 返回全部")
    private String device;

    /** 信号值(1-5), 传入后只返回对应信号值的网页 */
    @Schema(description = "信号值(1-5)")
    private Integer signal;

    /** 排序字段, 支持 orderNum / count / createTime, 默认 orderNum */
    @Schema(description = "排序字段: orderNum|count|createTime")
    private String sortField;

    /** 排序方式, ASC / DESC, 默认 ASC */
    @Schema(description = "排序方式: ASC|DESC")
    private String sortOrder;
}
