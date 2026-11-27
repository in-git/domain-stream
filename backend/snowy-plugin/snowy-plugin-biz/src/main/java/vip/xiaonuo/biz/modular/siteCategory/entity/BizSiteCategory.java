
package vip.xiaonuo.biz.modular.siteCategory.entity;

import com.baomidou.mybatisplus.annotation.*;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.util.Date;

/**
 * 网页分类中间表实体
 *
 * @author wuwenlong
 * @date  2026/08/08 16:44
 **/
@Getter
@Setter
@TableName("BIZ_SITE_CATEGORY")
public class BizSiteCategory {

    /**
     * 网页ID
     * <p>
     * 该表为 (SITE_ID, CATEGORY_ID) 复合主键, MyBatis-Plus 不支持复合 @TableId,
     * 因此这里不声明 @TableId, 统一通过 QueryWrapper 条件进行增删改查,
     * 避免 selectById/updateById 等按单主键操作导致的数据错乱。
     */
    @Schema(description = "网页ID")
    private String siteId;

    /** 分类ID */
    @Schema(description = "分类ID")
    private String categoryId;

    /**
     * 虚拟ID字段
     * <p>
     * 数据库表 BIZ_SITE_CATEGORY 实际只有 (SITE_ID, CATEGORY_ID) 两列, 并不存在 ID 列。
     * 此处仅为兼容代码生成器产出的后台 CRUD 代码而保留, 使用 exist = false 告知 MyBatis-Plus
     * 不要把它拼进任何 SQL, 否则会报 Unknown column 'ID'。
     */
    @TableField(exist = false)
    @Schema(description = "虚拟ID字段, 数据库中不存在该列")
    private String id;
}
