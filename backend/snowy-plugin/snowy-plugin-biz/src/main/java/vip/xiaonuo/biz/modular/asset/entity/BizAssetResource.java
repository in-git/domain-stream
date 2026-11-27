package vip.xiaonuo.biz.modular.asset.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;
import vip.xiaonuo.common.pojo.CommonEntity;

/**
 * 远端素材资源：只保存元数据与远程 URL，不保存文件二进制
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Getter
@Setter
@TableName("BIZ_ASSET_RESOURCE")
public class BizAssetResource extends CommonEntity {

    @TableId
    @Schema(description = "主键")
    private String id;

    @Schema(description = "数据库兼容字段：仅用于隔离网址采集记录")
    private String source;

    @Schema(description = "数据库兼容字段：网址去重标识")
    private String sourceKey;

    @Schema(description = "资源类型：IMAGE/VIDEO/SVG/ICON")
    private String type;

    @Schema(description = "标题")
    private String title;

    @Schema(description = "描述")
    private String description;

    @Schema(description = "标签，逗号分隔")
    private String tags;

    @Schema(description = "分类（图标集或壁纸分类）")
    private String category;

    @Schema(description = "许可")
    private String license;

    @Schema(description = "作者")
    private String author;

    @Schema(description = "来源主页")
    private String homepage;

    @Schema(description = "预览地址")
    private String previewUrl;

    @Schema(description = "原图地址")
    private String imageUrl;

    @Schema(description = "后缀")
    private String suffix;

    @Schema(description = "是否已加入素材中心：YES/NO")
    private String inMaterial;

    @Schema(description = "素材中心文件ID")
    private String materialFileId;

    @Schema(description = "状态：ACTIVE/HIDDEN")
    private String status;

    @Schema(description = "下载次数")
    private Integer downloads;
}
