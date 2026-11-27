
package vip.xiaonuo.biz.modular.site.param;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.Date;
import java.util.List;

/**
 * 网页数据查询参数
 *
 * @author wuwenlong
 * @date  2026/08/08 16:42
 **/
@Getter
@Setter
public class BizSitePageParam {

    /** 当前页 */
    @Schema(description = "当前页码")
    private Integer current;

    /** 每页条数 */
    @Schema(description = "每页条数")
    private Integer size;

    /** 排序字段 */
    @Schema(description = "排序字段，字段驼峰名称，如：userName")
    private String sortField;

    /** 排序方式 */
    @Schema(description = "排序方式，升序：ASCEND；降序：DESCEND")
    private String sortOrder;

    /** 关键词 */
    @Schema(description = "关键词")
    private String searchKey;

    /** 网页名称 */
    @Schema(description = "网页名称")
    private String name;

    /** 描述 */
    @Schema(description = "描述")
    private String des;

    /** 链接 */
    @Schema(description = "链接")
    private String link;

    /** 是否可见(Y|N) */
    @Schema(description = "是否可见(Y|N)")
    private String visible;

    /** 是否推荐(Y|N) */
    @Schema(description = "是否推荐(Y|N)")
    private String isRecommend;

    /** 分类ID（按关联分类筛选） */
    @Schema(description = "分类ID列表，用于按关联分类筛选")
    private List<String> categoryIds;

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

    /** 信号值(1-5) */
    @Schema(description = "信号值(1-5)")
    private Integer signal;

}
