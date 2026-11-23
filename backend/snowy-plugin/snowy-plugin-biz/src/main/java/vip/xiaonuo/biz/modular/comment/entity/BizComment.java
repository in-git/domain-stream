package vip.xiaonuo.biz.modular.comment.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.Date;

/**
 * 内容评论实体：支持文章/视频/图文共用，支持无限层级回复。
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Getter
@Setter
@TableName("biz_comment")
public class BizComment {

    @TableId
    @Schema(description = "主键")
    private String id;

    @Schema(description = "内容类型：ARTICLE/VIDEO/IMAGE_TEXT")
    private String targetType;

    @Schema(description = "内容ID")
    private String targetId;

    @Schema(description = "评论用户ID")
    private String userId;

    @Schema(description = "评论人昵称，按用户ID回填，不落库")
    @TableField(exist = false)
    private String nickname;

    @Schema(description = "所属内容标题，后台列表回填，不落库")
    @TableField(exist = false)
    private String targetTitle;

    @Schema(description = "评论内容")
    private String content;

    @Schema(description = "根评论ID，顶级评论为自身ID")
    private String rootId;

    @Schema(description = "父评论ID，顶级评论为空")
    private String parentId;

    @Schema(description = "物化路径，如 /id1/id2/，用于无限层级子树查询")
    private String path;

    @Schema(description = "被回复用户ID")
    private String replyToUserId;

    @Schema(description = "被回复用户昵称")
    private String replyToNickname;

    @Schema(description = "状态：APPROVED/PENDING/REJECTED")
    private String status;

    @Schema(description = "是否官方回复：YES/NO")
    private String isOfficial;

    @Schema(description = "点赞数")
    private Integer likeCount;

    @Schema(description = "评论IP")
    private String ip;

    @Schema(description = "浏览器UA")
    private String userAgent;

    @Schema(description = "排序")
    private Integer sortCode;

    @Schema(description = "备注")
    private String remark;

    @Schema(description = "扩展信息")
    private String extJson;

    @Schema(description = "删除标志")
    @TableLogic
    @TableField(fill = FieldFill.INSERT)
    private String deleteFlag;

    @TableField(fill = FieldFill.INSERT)
    private Date createTime;

    @TableField(fill = FieldFill.INSERT)
    private String createUser;

    @TableField(fill = FieldFill.UPDATE)
    private Date updateTime;

    @TableField(fill = FieldFill.UPDATE)
    private String updateUser;
}
