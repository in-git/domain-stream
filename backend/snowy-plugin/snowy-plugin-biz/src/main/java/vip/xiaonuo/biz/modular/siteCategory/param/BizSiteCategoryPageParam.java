
package vip.xiaonuo.biz.modular.siteCategory.param;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.Date;

/**
 * 网页分类中间表查询参数
 *
 * @author wuwenlong
 * @date  2026/08/08 16:44
 **/
@Getter
@Setter
public class BizSiteCategoryPageParam {

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

    /** 网页ID */
    @Schema(description = "网页ID")
    private String siteId;

    /** CATEGORY_ID */
    @Schema(description = "CATEGORY_ID")
    private String categoryId;

    /** ID */
    @Schema(description = "ID")
    private String id;

}
