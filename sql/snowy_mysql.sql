/*
 Navicat Premium Data Transfer

 Source Server         : localhost
 Source Server Type    : MySQL
 Source Server Version : 80409
 Source Host           : localhost:3306
 Source Schema         : domain-stream

 Target Server Type    : MySQL
 Target Server Version : 80409
 File Encoding         : 65001

 Date: 20/11/2026 15:37:17
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for auth_third_user
-- ----------------------------
DROP TABLE IF EXISTS `auth_third_user`;
CREATE TABLE `auth_third_user`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `THIRD_ID` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '三方用户id',
  `USER_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '系统用户id',
  `AVATAR` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '头像',
  `NAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '姓名',
  `NICKNAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '昵称',
  `GENDER` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '性别',
  `CATEGORY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '三方用户' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of auth_third_user
-- ----------------------------

-- ----------------------------
-- Table structure for biz_article
-- ----------------------------
DROP TABLE IF EXISTS `biz_article`;
CREATE TABLE `biz_article`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `TITLE` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标题',
  `COVER` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '封面图',
  `SUMMARY` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '摘要',
  `CONTENT` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '正文内容',
  `CATEGORY` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类编码，关联 BIZ_CATEGORY.CODE',
  `TAGS` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标签，多个以逗号分隔',
  `AUTHOR` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '作者',
  `SOURCE` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '来源',
  `STATUS` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '状态：DRAFT草稿/PUBLISHED已发布/OFFLINE已下架',
  `PUBLISH_TIME` datetime NULL DEFAULT NULL COMMENT '发布时间',
  `VIEW_COUNT` int NULL DEFAULT 0 COMMENT '浏览量',
  `LIKE_COUNT` int NULL DEFAULT 0 COMMENT '点赞量',
  `COMMENT_COUNT` int NULL DEFAULT 0 COMMENT '评论量',
  `IS_TOP` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '是否置顶：Y是/N否',
  `IS_RECOMMEND` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '是否推荐：Y是/N否',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序',
  `REMARK` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志：NOT_DELETE正常/DELETED删除',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '更新时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '更新用户',
  PRIMARY KEY (`ID`) USING BTREE,
  INDEX `IDX_ARTICLE_CATEGORY`(`CATEGORY` ASC) USING BTREE,
  INDEX `IDX_ARTICLE_STATUS`(`STATUS` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '文章' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of biz_article
-- ----------------------------

-- ----------------------------
-- Table structure for biz_category
-- ----------------------------
DROP TABLE IF EXISTS `biz_category`;
CREATE TABLE `biz_category`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `PARENT_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '0' COMMENT '父级ID，顶级为0',
  `NAME` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类名称',
  `CODE` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类编码，业务表CATEGORY字段关联此编码',
  `IMAGE` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类图片',
  `ICON` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类图标',
  `MODULE` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '适用模块：ARTICLE文章/VIDEO视频/GRAPHIC图文/IMAGE图片/COMMON通用',
  `DESCRIPTION` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类描述',
  `STATUS` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '状态：ENABLE启用/DISABLE禁用',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序',
  `REMARK` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志：NOT_DELETE正常/DELETED删除',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '更新时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '更新用户',
  PRIMARY KEY (`ID`) USING BTREE,
  UNIQUE INDEX `UK_CATEGORY_CODE_MODULE`(`CODE` ASC, `MODULE` ASC) USING BTREE,
  INDEX `IDX_CATEGORY_PARENT`(`PARENT_ID` ASC) USING BTREE,
  INDEX `IDX_CATEGORY_MODULE`(`MODULE` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '通用分类（文章/视频/图文）' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of biz_category
-- ----------------------------

-- ----------------------------
-- Table structure for biz_graphic
-- ----------------------------
DROP TABLE IF EXISTS `biz_graphic`;
CREATE TABLE `biz_graphic`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `TITLE` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标题',
  `COVER` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '封面图',
  `IMAGES` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '图片列表，JSON数组',
  `SUMMARY` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '摘要',
  `CONTENT` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '图文内容',
  `CATEGORY` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类编码，关联 BIZ_CATEGORY.CODE',
  `TAGS` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标签，多个以逗号分隔',
  `STATUS` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '状态：DRAFT草稿/PUBLISHED已发布/OFFLINE已下架',
  `PUBLISH_TIME` datetime NULL DEFAULT NULL COMMENT '发布时间',
  `VIEW_COUNT` int NULL DEFAULT 0 COMMENT '浏览量',
  `LIKE_COUNT` int NULL DEFAULT 0 COMMENT '点赞量',
  `COMMENT_COUNT` int NULL DEFAULT 0 COMMENT '评论量',
  `IS_TOP` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '是否置顶：Y是/N否',
  `IS_RECOMMEND` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '是否推荐：Y是/N否',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序',
  `REMARK` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志：NOT_DELETE正常/DELETED删除',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '更新时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '更新用户',
  PRIMARY KEY (`ID`) USING BTREE,
  INDEX `IDX_GRAPHIC_CATEGORY`(`CATEGORY` ASC) USING BTREE,
  INDEX `IDX_GRAPHIC_STATUS`(`STATUS` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '图文' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of biz_graphic
-- ----------------------------

-- ----------------------------
-- Table structure for biz_message
-- ----------------------------
DROP TABLE IF EXISTS `biz_message`;
CREATE TABLE `biz_message`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `USER_ID` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '用户ID',
  `PARENT_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '父留言ID，顶级留言为空，访客回复指向被回复的留言或回复（单表递归）',
  `REPLY_TO_NICKNAME` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '被回复者昵称，用于前台展示「回复 @xxx」',
  `CONTENT` varchar(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '留言内容',
  `STATUS` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'PENDING' COMMENT '状态：PENDING待审核/APPROVED已通过/REJECTED已拒绝',
  `REPLY` varchar(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '管理员回复内容',
  `REPLY_TIME` datetime NULL DEFAULT NULL COMMENT '回复时间',
  `REPLY_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '回复人',
  `IP` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '留言IP',
  `USER_AGENT` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '浏览器UA',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序',
  `REMARK` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'NOT_DELETE' COMMENT '删除标志：NOT_DELETE正常/DELETED删除',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '更新时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '更新用户',
  PRIMARY KEY (`ID`) USING BTREE,
  INDEX `IDX_MESSAGE_STATUS`(`STATUS` ASC) USING BTREE,
  INDEX `IDX_MESSAGE_CREATE_TIME`(`CREATE_TIME` ASC) USING BTREE,
  INDEX `IDX_MESSAGE_PARENT_ID`(`PARENT_ID` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '留言' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of biz_message
-- ----------------------------
INSERT INTO `biz_message` VALUES ('2123326786747854849', 'test003', NULL, NULL, 'HI', 'APPROVED', '2222', '2026-11-19 16:07:55', '', '0:0:0:0:0:0:0:1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36 Edg/157.0.0.0', 0, '', '', 'NOT_DELETE', '2026-11-19 16:05:30', '2123283890803896322', '2026-11-19 16:07:55', '1543837863788879873');
INSERT INTO `biz_message` VALUES ('2123326846013370369', 'test003', NULL, NULL, '这个做的还不错啊', 'APPROVED', NULL, NULL, NULL, '0:0:0:0:0:0:0:1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36 Edg/157.0.0.0', NULL, NULL, NULL, 'NOT_DELETE', '2026-11-19 16:05:44', '1543837863788879873', NULL, NULL);

-- ----------------------------
-- Table structure for biz_notice
-- ----------------------------
DROP TABLE IF EXISTS `biz_notice`;
CREATE TABLE `biz_notice`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `TITLE` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标题',
  `IMAGE` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '封面图',
  `CONTENT` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '内容',
  `DIGEST` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '摘要',
  `TYPE` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '类型',
  `PLACE` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '发布位置',
  `STATUS` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '状态',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序',
  `REMARK` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '更新时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '更新用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '通知公告' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of biz_notice
-- ----------------------------

-- ----------------------------
-- Table structure for biz_user_favorite
-- ----------------------------
DROP TABLE IF EXISTS `biz_user_favorite`;
CREATE TABLE `biz_user_favorite`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `USER_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '收藏人ID',
  `TARGET_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '收藏目标ID',
  `TARGET_TYPE` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '收藏类型（IMAGE_TEXT-图文，ARTICLE-文章，VIDEO-视频）',
  `TITLE` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标题',
  `COVER` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '封面图',
  `DIGEST` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '摘要',
  `AUTHOR` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '作者/来源',
  `SOURCE_URL` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '原始链接',
  `FAVORITE_TIME` datetime NULL DEFAULT NULL COMMENT '收藏时间',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序码',
  `STATUS` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '状态（ENABLE-正常，DISABLED-停用）',
  `REMARK` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE,
  UNIQUE INDEX `UK_USER_FAVORITE`(`USER_ID` ASC, `TARGET_TYPE` ASC, `TARGET_ID` ASC) USING BTREE,
  INDEX `IDX_FAVORITE_USER_TIME`(`USER_ID` ASC, `FAVORITE_TIME` ASC) USING BTREE,
  INDEX `IDX_FAVORITE_TARGET`(`TARGET_TYPE` ASC, `TARGET_ID` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '用户收藏' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of biz_user_favorite
-- ----------------------------

-- ----------------------------
-- Table structure for biz_video
-- ----------------------------
DROP TABLE IF EXISTS `biz_video`;
CREATE TABLE `biz_video`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `TITLE` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标题',
  `COVER` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '封面图',
  `VIDEO_URL` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '视频地址',
  `DURATION` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '时长',
  `SUMMARY` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '简介',
  `CATEGORY` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类编码，关联 BIZ_CATEGORY.CODE',
  `TAGS` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标签，多个以逗号分隔',
  `STATUS` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '状态：DRAFT草稿/PUBLISHED已发布/OFFLINE已下架',
  `PUBLISH_TIME` datetime NULL DEFAULT NULL COMMENT '发布时间',
  `VIEW_COUNT` int NULL DEFAULT 0 COMMENT '播放量',
  `LIKE_COUNT` int NULL DEFAULT 0 COMMENT '点赞量',
  `COMMENT_COUNT` int NULL DEFAULT 0 COMMENT '评论量',
  `IS_TOP` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '是否置顶：Y是/N否',
  `IS_RECOMMEND` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '是否推荐：Y是/N否',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序',
  `REMARK` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志：NOT_DELETE正常/DELETED删除',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '更新时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '更新用户',
  PRIMARY KEY (`ID`) USING BTREE,
  INDEX `IDX_VIDEO_CATEGORY`(`CATEGORY` ASC) USING BTREE,
  INDEX `IDX_VIDEO_STATUS`(`STATUS` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '视频' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of biz_video
-- ----------------------------

-- ----------------------------
-- Table structure for biz_visitor_event
-- ----------------------------
DROP TABLE IF EXISTS `biz_visitor_event`;
CREATE TABLE `biz_visitor_event`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `VISITOR_ID` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '访客唯一标识（前端 localStorage 生成，用于UV去重）',
  `SESSION_ID` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '会话标识（用于在线人数去重）',
  `EVENT_TYPE` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'PV' COMMENT '事件类型：PV页面浏览/HEARTBEAT心跳/CONTENT_VIEW内容浏览',
  `PAGE_TYPE` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'HOME' COMMENT '页面类型：HOME首页/VIDEO视频/ARTICLE文章/GRAPHIC图文',
  `CONTENT_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '内容ID（热门内容统计）',
  `CONTENT_TITLE` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '内容标题快照',
  `SOURCE` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'DIRECT' COMMENT '来源：DIRECT直接访问/SEARCH搜索/SOCIAL社交/RSS订阅',
  `DEVICE` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'DESKTOP' COMMENT '终端：MOBILE移动/DESKTOP桌面/TABLET平板',
  `IP` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '访客IP',
  `USER_AGENT` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '浏览器UA',
  `DURATION_SEC` int NULL DEFAULT 0 COMMENT '停留时长（秒）',
  `REMARK` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'NOT_DELETE' COMMENT '删除标志：NOT_DELETE正常/DELETED删除',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '访问发生时间（同时作为审计创建时间）',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '更新时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '更新用户',
  PRIMARY KEY (`ID`) USING BTREE,
  INDEX `IDX_VISITOR_CREATE_TIME`(`CREATE_TIME` ASC) USING BTREE,
  INDEX `IDX_VISITOR_VISITOR_ID`(`VISITOR_ID` ASC) USING BTREE,
  INDEX `IDX_VISITOR_EVENT_TYPE`(`EVENT_TYPE` ASC) USING BTREE,
  INDEX `IDX_VISITOR_CONTENT_ID`(`CONTENT_ID` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '访客访问事件明细' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of biz_visitor_event
-- ----------------------------
INSERT INTO `biz_visitor_event` VALUES ('2123650127434203137', 'v-mwmyske4-8me4te0o', 's-mwojiqys-mbc7joz3', 'HEARTBEAT', 'HOME', NULL, NULL, 'DIRECT', 'DESKTOP', '0:0:0:0:0:0:0:1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36 Edg/157.0.0.0', 0, NULL, NULL, 'NOT_DELETE', '2026-11-20 13:30:21', '1543837863788879873', NULL, NULL);
INSERT INTO `biz_visitor_event` VALUES ('2123650413355712513', 'v-mwmyske4-8me4te0o', 's-mwojiqys-mbc7joz3', 'HEARTBEAT', 'HOME', NULL, NULL, 'DIRECT', 'DESKTOP', '0:0:0:0:0:0:0:1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36 Edg/157.0.0.0', 0, NULL, NULL, 'NOT_DELETE', '2026-11-20 13:31:29', '1543837863788879873', NULL, NULL);

-- ----------------------------
-- Table structure for client_relation
-- ----------------------------
DROP TABLE IF EXISTS `client_relation`;
CREATE TABLE `client_relation`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `OBJECT_ID` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '对象ID',
  `TARGET_ID` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '目标ID',
  `CATEGORY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '关系' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of client_relation
-- ----------------------------

-- ----------------------------
-- Table structure for client_user
-- ----------------------------
DROP TABLE IF EXISTS `client_user`;
CREATE TABLE `client_user`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `AVATAR` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '头像',
  `SIGNATURE` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '签名',
  `ACCOUNT` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '账号',
  `PASSWORD` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '密码',
  `NAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '姓名',
  `NICKNAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '昵称',
  `GENDER` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '性别',
  `AGE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '年龄',
  `BIRTHDAY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '出生日期',
  `NATION` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '民族',
  `NATIVE_PLACE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '籍贯',
  `HOME_ADDRESS` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '家庭住址',
  `MAILING_ADDRESS` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '通信地址',
  `ID_CARD_TYPE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '证件类型',
  `ID_CARD_NUMBER` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '证件号码',
  `CULTURE_LEVEL` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '文化程度',
  `POLITICAL_OUTLOOK` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '政治面貌',
  `COLLEGE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '毕业院校',
  `EDUCATION` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '学历',
  `EDU_LENGTH` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '学制',
  `DEGREE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '学位',
  `PHONE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '手机',
  `EMAIL` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '邮箱',
  `HOME_TEL` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '家庭电话',
  `OFFICE_TEL` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '办公电话',
  `EMERGENCY_CONTACT` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '紧急联系人',
  `EMERGENCY_PHONE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '紧急联系人电话',
  `EMERGENCY_ADDRESS` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '紧急联系人地址',
  `LAST_LOGIN_IP` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '上次登录ip',
  `LAST_LOGIN_ADDRESS` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '上次登录地点',
  `LAST_LOGIN_TIME` datetime NULL DEFAULT NULL COMMENT '上次登录时间',
  `LAST_LOGIN_DEVICE` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '上次登录设备',
  `LATEST_LOGIN_IP` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '最新登录ip',
  `LATEST_LOGIN_ADDRESS` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '最新登录地点',
  `LATEST_LOGIN_TIME` datetime NULL DEFAULT NULL COMMENT '最新登录时间',
  `LATEST_LOGIN_DEVICE` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '最新登录设备',
  `USER_STATUS` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '用户状态',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序码',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'C端用户' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of client_user
-- ----------------------------
INSERT INTO `client_user` VALUES ('2123283890803896322', 'data:image/jpg;base64,/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCABkAGQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCCiiiv0Q+CCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKK7zw7q/hO10G2h1O3tnvF3eYz2m8n5iRzjnjFbun3/g3VL6OztLGzeeTO1TZAZwCTyV9Aa8yrmE6blelKyvr006no0sBColarG76dfQ8mor17VZ/COi3S219YWUcrIJABZBuCSOy+xrH1PWvBkulXkdra2ouHgdYitltIcqcYO3jnHNTTzKdSzjSlZ9R1MvjC6dWN10POaKKK9U80KKKKACiiigAooooAKKKKACui8Df8jlYf9tP/RbVztdF4G/5HKw/7af+i2rmxn+71P8AC/yN8J/vEPVfmaHxL/5GO3/69F/9DeuNrsviX/yMdv8A9ei/+hvXG1nl3+6w9DTH/wC8z9QooortOQKKKKACiiigAooooAKKKKACui8Df8jlYf8AbT/0W1c7XReBv+RysP8Atp/6LaubGf7vU/wv8jfCf7xD1X5mh8S/+Rjt/wDr0X/0N642uy+Jf/Ix2/8A16L/AOhvXG1nl3+6w9DTH/7zP1Ciiiu05AooooAKKKKACiiigAooooAKu6Vqc2j6nDf26xtLFu2iQEryCOcEetUqKmUVKLjLZjjJxakt0aeua5c6/epdXUcKSJGIwIgQMAk9yfU1mUUUoQjCKjFWSHOcpycpO7YUUUVZIUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAf/2Q==', NULL, 'test003', '207cf410532f92a47dee245ce9b11ff71f578ebd763eb3bbea44ebd043d018fb', 'test003', NULL, '未知', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '127.0.0.1', '内网IP|内网IP', '2026-11-19 20:57:36', 'PC', '127.0.0.1', '内网IP|内网IP', '2026-11-19 21:12:41', 'PC', 'ENABLE', NULL, NULL, 'NOT_DELETE', '2026-11-19 13:15:03', '1543837863788879873', '2026-11-19 21:12:41', '1543837863788879873');

-- ----------------------------
-- Table structure for client_user_ext
-- ----------------------------
DROP TABLE IF EXISTS `client_user_ext`;
CREATE TABLE `client_user_ext`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `USER_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '用户id',
  `SOURCE_FROM_TYPE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '来源类别',
  `PASSWORD_UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '密码修改日期',
  `OTP_SECRET_KEY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'OTP密钥',
  `HAS_BIND_OTP` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'OTP绑定状态',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'C端用户扩展' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of client_user_ext
-- ----------------------------
INSERT INTO `client_user_ext` VALUES ('2123283891261075458', '2123283890803896322', 'SYSTEM_REGISTER', '2026-11-19 13:15:03', '5950d42c2ceac7cf0f6826f0e37a4027d5f394835b918ed6a3b341527c2b1f14002a8a4efa863ccad024ac0300bb40d2', 'NO', 'NOT_DELETE', '2026-11-19 13:15:03', '1543837863788879873', NULL, NULL);

-- ----------------------------
-- Table structure for client_user_password
-- ----------------------------
DROP TABLE IF EXISTS `client_user_password`;
CREATE TABLE `client_user_password`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `USER_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '用户id',
  `PASSWORD` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '密码',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = 'C端用户密码' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of client_user_password
-- ----------------------------

-- ----------------------------
-- Table structure for dev_config
-- ----------------------------
DROP TABLE IF EXISTS `dev_config`;
CREATE TABLE `dev_config`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `CONFIG_KEY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '配置键',
  `CONFIG_VALUE` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '配置值',
  `CATEGORY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类',
  `REMARK` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序码',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '配置' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of dev_config
-- ----------------------------
INSERT INTO `dev_config` VALUES ('1554740179362967455', 'SNOWY_SYS_LOGO', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAVCAYAAABG1c6oAAAACXBIWXMAAC4jAAAuIwF4pT92AAAE5UlEQVR42nVVfWxTVRS/b93QbcA6GF8SYGAChDjFGI1B/jBRpjLEoHEamSSIEkSY8rFu3fruve+rr+1rWTvW176yxWBgGoxGR8AEJNEgxiAxxoiiQREYCOI+GGMIrO95zisFlfjHTU/vved3fufcc36PcM5JfjFcjMGv5AnxZkJzNuHub+6cMu7RmZ8wSfLg3X/647ptg1FKqKyVPtt2ICAzkXAqQpBcIAggBGkTeS6xv6lRjU2VaIsb5F+A+cics5sMFYkSrzX058LEYdOgm4nIeIHIJI8hbiKLY/t8JR22Iyqhci4GCP0fQIG7DJChCyxUtJ//nmxznGWxPetU2kxw1Rm7XiQZxynPDPdRNVTOxBz7GyUREItgWhIsyiXBrR+jaBdUtP/xA0lnR4SMbb+hJas2aonZRZmRqyRlZysyQxcAcFyuHMy9jxgITDYo8coGNTZNFf1EBFCOgJAiMDxK0raNjF4Nvf3oqui7zyBjALQnWv2/MUUrRUD0Uamf+ACjhat3kNWyWTUtefbbzcG2uZrYBPViRFLUYi+wQGcCDNeGOxfWhQEQbAwyLjVwWpIkqCsXgqKP1IesByuTp7+SRH8B2ShFpxSYV4cmWH0nRDk4URJbiMxZ4WNtXyaQHa63jM5HarUdi/P/H098YciMCvjKLUpoijd96dzY1KVzUclPyHo5PmtscuAUsRyn0uw5zGW1nFFR0KE9no91rxE6HedNo3NhbeTDFYUd9shy4/06HVLEO0xWvTPMM0fQd7LV+0tIgRrWy62VJeal3yGVLB5Utf+0W2GBghYmFxmBjZjOw7PMnq+rzOOf+rTWOXqggQSYVAiPWThv68970Qd9x6UHTmkyE0i9Ep9Zkhw8e/Mgc7mXqnqZEmjC1Ec92XqACnBWnB7ur4u8V4vMFWghnxTyFplXBlwiaccZDzUPamoJWQ+vXOoyREDHmbRt6LyiKMUN6pY5d5unDpEOx3kh1r363uSx3fjKC9qOdFBJGe/nWin4ncsRcZyy9NAFKFcxpjxjdPJiD7HgBVNQi8zFnkYd6poaPIOXBSt7fa2eeag6cShGrOwI7s02Tx6kSrBsNAK6RGy7zBruV0PGJNIY61xwp3XtCjYsHky2+k9uCKXv96SuDQspAABWr2/Z+fQT8c9VbBvcm5QZOE316NSy1MUzOSLZkVEZ22GRxCyi6JHp88wTn+WpT073nWiMpO4rSf816EaHlNfEupY8Fd3nc9sG9ipSvccDmjGlIg2Z4R3wnW6e/YbLipfggCtc9CyNfbJpFIzWGCh+wEjeMzYDgFACZPhadGdNdXjPOndS8AFSMCl69C4vzDQGWRQ/GJYkXgyTI7gzjLoXFhtIvZ56YEHyu64GfevcMamhC5DedbLNtlcZXUuWte6tRxv3yq3Lvf5gfOb85I8fvxLaXh0B3xsaQG6KJ8xkAbaDxpoJTEz5BAsfCifDzq6M7KhZHvtoJdpuE6f7fg3AHYVTokEboa8rgSgOOfm5JUEgDDBSImmAJq5qP9aNNXw53LX0pciuWrTnbz36QbNqzJBoIK/uAmppXvFvSf8NkeU5mXebN0wbSc2W/Y2rwtsXrdDfqa6JHxDD1Edk2pzTTp4nwnLE/vsJyEl97hLUwxPgclFE3ExUSE0FFUc7ACOJ+ucCMX7bJ+Rv+yglcdlNWbUAAAAASUVORK5CYII=', 'SYS_BASE', '系统LOGO', 1, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967456', 'SNOWY_SYS_NAME', 'Snowy', 'SYS_BASE', '系统名称', 2, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1784600000000000001', 'CLIENT_CONFIG', '{\"网页标题\":\"吴文龙的私域\"}', 'BIZ_DEFINE', '页面配置JSON（由CMS页面配置模块维护）', 100, NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967457', 'SNOWY_SYS_VERSION', 'V3.0.0', 'SYS_BASE', '系统版本', 3, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967458', 'SNOWY_SYS_COPYRIGHT', 'Snowy ©2022 Created by 小诺开源技术', 'SYS_BASE', '系统版权', 4, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967459', 'SNOWY_SYS_COPYRIGHT_URL', 'https://www.xiaonuo.vip', 'SYS_BASE', '系统版权链接地址', 5, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967462', 'SNOWY_SYS_DEFAULT_CAPTCHA_OPEN_FLAG_FOR_B', 'false', 'SYS_BASE', 'B端全局验证码开关', 8, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967463', 'SNOWY_SYS_DEFAULT_FILE_ENGINE', 'LOCAL', 'SYS_BASE', '默认文件存储引擎', 9, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967464', 'SNOWY_SYS_DEFAULT_PASSWORD_FOR_B', 'Snowy@2026!', 'PASSWORD_STRATEGY_FOR_B', 'B端默认用户密码', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967465', 'SNOWY_SYS_DEFAULT_DESCRRIPTION', 'Snowy是一款国内首例国产密码算法加密框架，采用Vue3.x+AntDesignVue4.x+SpringBoot3.x前后分离技术打造，技术框架与密码的结合，让前后分离‘密’不可分！', 'SYS_BASE', '系统描述', 11, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967466', 'SNOWY_SYS_DEFAULT_WORKBENCH_DATA', '{\"shortcut\":[{\"id\":\"1548901111999770526\",\"title\":\"系统首页\",\"icon\":\"home-outlined\",\"path\":\"/index\"}]}', 'SYS_BASE', '系统默认工作台数据', 12, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967560', 'SNOWY_THIRD_WECHAT_ALLOW_LOGIN_FLAG', 'true', 'THIRD_WECHAT', '是否允许微信登录', 13, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967561', 'SNOWY_THIRD_WECHAT_CLIENT_ID', 'WechatClientId', 'THIRD_WECHAT', 'WechatClientId', 16, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967562', 'SNOWY_THIRD_WECHAT_CLIENT_SECRET', 'WechatClientSecret', 'THIRD_WECHAT', 'WechatClientSecret', 17, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967563', 'SNOWY_THIRD_WECHAT_REDIRECT_URL', 'Wechat重定向地址', 'THIRD_WECHAT', 'Wechat重定向地址', 18, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967564', 'SNOWY_FILE_LOCAL_FOLDER_FOR_WINDOWS', 'D:/defaultUploadFolder', 'FILE_LOCAL', '本地文件Windows存储位置', 19, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967565', 'SNOWY_FILE_LOCAL_FOLDER_FOR_UNIX', '/defaultUploadFolder', 'FILE_LOCAL', '本地文件Linux存储位置', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967566', 'SNOWY_FILE_TENCENT_SECRET_ID', '腾讯云文件SecretId', 'FILE_TENCENT', '腾讯云文件SecretId', 21, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967567', 'SNOWY_FILE_TENCENT_SECRET_KEY', '腾讯云文件SecretKey', 'FILE_TENCENT', '腾讯云文件SecretKey', 22, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967568', 'SNOWY_FILE_TENCENT_REGION_ID', '腾讯云文件RegionId', 'FILE_TENCENT', '腾讯云文件RegionId', 23, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967569', 'SNOWY_FILE_TENCENT_DEFAULT_BUCKET_NAME', 'defaultbucket', 'FILE_TENCENT', '腾讯云文件默认存储桶', 24, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967570', 'SNOWY_FILE_ALIYUN_ACCESS_KEY_ID', '阿里云文件AccessKeyId', 'FILE_ALIYUN', '阿里云文件AccessKeyId', 25, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967571', 'SNOWY_FILE_ALIYUN_ACCESS_KEY_SECRET', '阿里云文件AccessKeySecret', 'FILE_ALIYUN', '阿里云文件AccessKeySecret', 26, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967572', 'SNOWY_FILE_ALIYUN_END_POINT', '阿里云文件EndPoint', 'FILE_ALIYUN', '阿里云文件EndPoint', 27, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967573', 'SNOWY_FILE_ALIYUN_DEFAULT_BUCKET_NAME', 'defaultbucket', 'FILE_ALIYUN', '阿里云文件默认存储桶', 28, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967574', 'SNOWY_FILE_MINIO_ACCESS_KEY', 'MINIO文件AccessKey', 'FILE_MINIO', 'MINIO文件AccessKey', 29, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967575', 'SNOWY_FILE_MINIO_SECRET_KEY', 'MINIO文件SecetKey', 'FILE_MINIO', 'MINIO文件SecetKey', 30, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967576', 'SNOWY_FILE_MINIO_END_POINT', 'MINIO文件EndPoint', 'FILE_MINIO', 'MINIO文件EndPoint', 31, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967577', 'SNOWY_FILE_MINIO_DEFAULT_BUCKET_NAME', 'defaultbucket', 'FILE_MINIO', 'MINIO文件默认存储桶', 32, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967578', 'SNOWY_EMAIL_LOCAL_FROM', '本地邮件发件账号', 'EMAIL_LOCAL', '本地邮件发件账号', 33, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967579', 'SNOWY_EMAIL_LOCAL_PASSWORD', '本地邮件发件密码', 'EMAIL_LOCAL', '本地邮件发件密码', 34, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967580', 'SNOWY_EMAIL_TENCENT_SECRET_ID', '腾讯云邮件SecretId', 'EMAIL_TENCENT', '腾讯云邮件SecretId', 35, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967581', 'SNOWY_EMAIL_TENCENT_SECRET_KEY', '腾讯云邮件SecretKey', 'EMAIL_TENCENT', '腾讯云邮件SecretKey', 36, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967582', 'SNOWY_EMAIL_TENCENT_FROM', '默认发送账号', 'EMAIL_TENCENT', '默认发送账号', 37, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967583', 'SNOWY_EMAIL_ALIYUN_ACCESS_KEY_ID', '阿里云邮件AccessKeyId', 'EMAIL_ALIYUN', '阿里云邮件AccessKeyId', 38, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967584', 'SNOWY_EMAIL_ALIYUN_ACCESS_KEY_SECRET', '阿里云邮件AccessKeySecret', 'EMAIL_ALIYUN', '阿里云邮件AccessKeySecret', 39, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967585', 'SNOWY_EMAIL_ALIYUN_FROM', '默认发送账号', 'EMAIL_ALIYUN', '默认发送账号', 40, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967586', 'SNOWY_SMS_TENCENT_SECRET_ID', '腾讯云短信SecretId', 'SMS_TENCENT', '腾讯云短信SecretId', 41, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967587', 'SNOWY_SMS_TENCENT_SECRET_KEY', '腾讯云短信SecretKey', 'SMS_TENCENT', '腾讯云短信SecretKey', 42, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967589', 'SNOWY_SMS_TENCENT_DEFAULT_SDK_APP_ID', '腾讯云短信默认SdkAppId', 'SMS_TENCENT', '腾讯云短信默认SdkAppId', 44, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967590', 'SNOWY_SMS_TENCENT_DEFAULT_SIGN_NAME', '腾讯云短信默认签名', 'SMS_TENCENT', '腾讯云短信默认签名', 45, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967591', 'SNOWY_SMS_ALIYUN_ACCESS_KEY_ID', '阿里云短信AccessKeyId', 'SMS_ALIYUN', '阿里云短信AccessKeyId', 46, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967592', 'SNOWY_SMS_ALIYUN_ACCESS_KEY_SECRET', '阿里云短信AccessKeySecret', 'SMS_ALIYUN', '阿里云短信AccessKeySecret', 47, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362967594', 'SNOWY_SMS_ALIYUN_DEFAULT_SIGN_NAME', '阿里云短信默认签名', 'SMS_ALIYUN', '阿里云短信默认签名', 49, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362968000', 'SNOWY_EMAIL_LOCAL_SMTP_HOST', 'smtp.qq.com', 'EMAIL_LOCAL', '本地邮件SMTP服务器域名', 80, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362968001', 'SNOWY_EMAIL_LOCAL_SMTP_PORT', '465', 'EMAIL_LOCAL', '本地邮件SMTP服务端口', 81, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362968002', 'SNOWY_EMAIL_LOCAL_AUTH', 'true', 'EMAIL_LOCAL', '本地邮件是否需要用户名密码验证', 82, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362968003', 'SNOWY_EMAIL_LOCAL_SSL_ENABLE', 'true', 'EMAIL_LOCAL', '本地邮件是否使用SSL安全连接', 83, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1554740179362968004', 'SNOWY_EMAIL_LOCAL_STARTTLS_ENABLE', 'true', 'EMAIL_LOCAL', '本地邮件是否使用STARTTLS安全连接', 84, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755202', 'SNOWY_SYS_DEFAULT_PUSH_ENGINE', 'DINGTALK', 'SYS_BASE', '默认消息推送引擎', 85, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755203', 'SNOWY_SYS_DEFAULT_SMS_ENGINE', 'ALIYUN', 'SYS_BASE', '默认短信发送引擎', 86, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755204', 'SNOWY_SYS_DEFAULT_EMAIL_ENGINE', 'LOCAL', 'SYS_BASE', '默认邮件发送引擎', 87, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755205', 'SNOWY_SYS_DEFAULT_CAPTCHA_OPEN_FLAG_FOR_C', 'true', 'SYS_BASE', 'C端全局验证码开关', 88, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755206', 'SNOWY_SYS_DEFAULT_CAPTCHA_EXPIRED_DURATION_FOR_B', '5', 'SYS_BASE', 'B端验证码失效时间', 89, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755207', 'SNOWY_SYS_DEFAULT_CAPTCHA_EXPIRED_DURATION_FOR_C', '5', 'SYS_BASE', 'C端验证码失效时间', 90, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755208', 'SNOWY_PUSH_DINGTALK_SIGN', '钉钉消息推送签名', 'PUSH_DINGTALK', '钉钉消息推送签名', 91, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755209', 'SNOWY_PUSH_DINGTALK_TOKEN_ID', '钉钉消息推送TOKENID', 'PUSH_DINGTALK', '钉钉消息推送TOKENID', 92, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755210', 'SNOWY_PUSH_FEISHU_TOKEN_ID', '飞书消息推送TOKENID', 'PUSH_FEISHU', '飞书消息推送TOKENID', 93, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755211', 'SNOWY_PUSH_WORKWECHAT_TOKEN_ID', '企业微信消息推送TOKENID', 'PUSH_WORKWECHAT', '企业微信消息推送TOKENID', 94, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755212', 'SNOWY_EMAIL_TEMPLATE_NOTICE_REGISTER_SUCCESS_FOR_B', '{\"subject\":\"注册账号成功提醒\",\"content\":\"<div style=\\\"padding: 35px;\\\">\\n    <table cellpadding=\\\"0\\\" align=\\\"center\\\"\\n           style=\\\"width: 600px; margin: 0 auto; text-align: left; position: relative; border-radius: 5px;font-size: 18px; font-family:-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans\', sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Noto Color Emoji\'; line-height: 1.5; box-shadow: rgb(153, 153, 153) 0 0 5px; border-collapse: collapse; background: #fff initial initial initial initial;\\\">\\n        <tbody>\\n        <tr>\\n            <th valign=\\\"middle\\\"\\n                style=\\\"height: 25px; line-height: 25px; padding: 15px 35px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: rgba(18, 24, 37, 0.87); background-color: #1677FF; border-radius: 5px 5px 0 0;\\\">\\n                <font size=\\\"5\\\" style=\\\"color: rgb(255, 255, 255); \\\">{sysName}</font>\\n            </th>\\n        </tr>\\n        <tr>\\n            <td>\\n                <div style=\\\"padding:25px 35px 40px; background-color:#fff;\\\">\\n                    <h2 style=\\\"margin: 5px 0; \\\">\\n                        <font color=\\\"#333333\\\" style=\\\"line-height: 20px; \\\">\\n                            <font style=\\\"line-height: 22px; \\\" size=\\\"4\\\">亲爱的用户：{userEmail}</font>\\n                        </font>\\n                    </h2>\\n                    <p>您的账号注册成功，感谢您加入{sysName}。</p>\\n                    <p align=\\\"right\\\">{sysName}</p>\\n                    <p align=\\\"right\\\">{sysNowTime}</p>\\n                </div>\\n            </td>\\n        </tr>\\n        </tbody>\\n    </table>\\n</div>\"}', 'EMAIL_TEMPLATE_FOR_B', 'B端注册账号成功邮件消息模板内容', 95, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755213', 'SNOWY_EMAIL_TEMPLATE_VALID_CODE_LOGIN_FOR_B', '{\"subject\":\"登录系统验证码\",\"content\":\"<div style=\\\"padding: 35px;\\\">\\n    <table cellpadding=\\\"0\\\" align=\\\"center\\\"\\n           style=\\\"width: 600px; margin: 0 auto; text-align: left; position: relative; border-radius: 5px;font-size: 18px; font-family:-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans\', sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Noto Color Emoji\'; line-height: 1.5; box-shadow: rgb(153, 153, 153) 0 0 5px; border-collapse: collapse; background: #fff initial initial initial initial;\\\">\\n        <tbody>\\n        <tr>\\n            <th valign=\\\"middle\\\"\\n                style=\\\"height: 25px; line-height: 25px; padding: 15px 35px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: rgba(18, 24, 37, 0.87); background-color: #1677FF; border-radius: 5px 5px 0 0;\\\">\\n                <font size=\\\"5\\\" style=\\\"color: rgb(255, 255, 255); \\\">{sysName}</font>\\n            </th>\\n        </tr>\\n        <tr>\\n            <td>\\n                <div style=\\\"padding:25px 35px 40px; background-color:#fff;\\\">\\n                    <h2 style=\\\"margin: 5px 0; \\\">\\n                        <font color=\\\"#333333\\\" style=\\\"line-height: 20px; \\\">\\n                            <font style=\\\"line-height: 22px; \\\" size=\\\"4\\\">亲爱的用户：{userEmail}</font>\\n                        </font>\\n                    </h2>\\n                    <p>您正在登录系统, 您的验证码为：<font style=\\\"color: #1677FF\\\">{validCode}</font>，该验证码{validTime}分钟内有效，请尽快验证并保管好验证码。</p>\\n                    <p align=\\\"right\\\">{sysName}</p>\\n                    <p align=\\\"right\\\">{sysNowTime}</p>\\n                </div>\\n            </td>\\n        </tr>\\n        </tbody>\\n    </table>\\n</div>\"}', 'EMAIL_TEMPLATE_FOR_B', 'B端登录系统验证码邮件消息模板内容', 96, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755214', 'SNOWY_EMAIL_TEMPLATE_VALID_CODE_UPDATE_PASSWORD_FOR_B', '{\"subject\":\"修改密码验证码\",\"content\":\"<div style=\\\"padding: 35px;\\\">\\n    <table cellpadding=\\\"0\\\" align=\\\"center\\\"\\n           style=\\\"width: 600px; margin: 0 auto; text-align: left; position: relative; border-radius: 5px;font-size: 18px; font-family:-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans\', sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Noto Color Emoji\'; line-height: 1.5; box-shadow: rgb(153, 153, 153) 0 0 5px; border-collapse: collapse; background: #fff initial initial initial initial;\\\">\\n        <tbody>\\n        <tr>\\n            <th valign=\\\"middle\\\"\\n                style=\\\"height: 25px; line-height: 25px; padding: 15px 35px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: rgba(18, 24, 37, 0.87); background-color: #1677FF; border-radius: 5px 5px 0 0;\\\">\\n                <font size=\\\"5\\\" style=\\\"color: rgb(255, 255, 255); \\\">{sysName}</font>\\n            </th>\\n        </tr>\\n        <tr>\\n            <td>\\n                <div style=\\\"padding:25px 35px 40px; background-color:#fff;\\\">\\n                    <h2 style=\\\"margin: 5px 0; \\\">\\n                        <font color=\\\"#333333\\\" style=\\\"line-height: 20px; \\\">\\n                            <font style=\\\"line-height: 22px; \\\" size=\\\"4\\\">亲爱的用户：{userEmail}</font>\\n                        </font>\\n                    </h2>\\n                    <p>您正在修改密码, 您的验证码为：<font style=\\\"color: #1677FF\\\">{validCode}</font>，该验证码{validTime}分钟内有效，请尽快验证并保管好验证码。</p>\\n                    <p align=\\\"right\\\">{sysName}</p>\\n                    <p align=\\\"right\\\">{sysNowTime}</p>\\n                </div>\\n            </td>\\n        </tr>\\n        </tbody>\\n    </table>\\n</div>\"}', 'EMAIL_TEMPLATE_FOR_B', 'B端修改密码验证码邮件消息模板内容', 97, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755215', 'SNOWY_EMAIL_TEMPLATE_VALID_CODE_RESET_PASSWORD_FOR_B', '{\"subject\":\"重置密码验证码\",\"content\":\"<div style=\\\"padding: 35px;\\\">\\n    <table cellpadding=\\\"0\\\" align=\\\"center\\\"\\n           style=\\\"width: 600px; margin: 0 auto; text-align: left; position: relative; border-radius: 5px;font-size: 18px; font-family:-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans\', sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Noto Color Emoji\'; line-height: 1.5; box-shadow: rgb(153, 153, 153) 0 0 5px; border-collapse: collapse; background: #fff initial initial initial initial;\\\">\\n        <tbody>\\n        <tr>\\n            <th valign=\\\"middle\\\"\\n                style=\\\"height: 25px; line-height: 25px; padding: 15px 35px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: rgba(18, 24, 37, 0.87); background-color: #1677FF; border-radius: 5px 5px 0 0;\\\">\\n                <font size=\\\"5\\\" style=\\\"color: rgb(255, 255, 255); \\\">{sysName}</font>\\n            </th>\\n        </tr>\\n        <tr>\\n            <td>\\n                <div style=\\\"padding:25px 35px 40px; background-color:#fff;\\\">\\n                    <h2 style=\\\"margin: 5px 0; \\\">\\n                        <font color=\\\"#333333\\\" style=\\\"line-height: 20px; \\\">\\n                            <font style=\\\"line-height: 22px; \\\" size=\\\"4\\\">亲爱的用户：{userEmail}</font>\\n                        </font>\\n                    </h2>\\n                    <p>您正在重置密码, 您的验证码为：<font style=\\\"color: #1677FF\\\">{validCode}</font>，该验证码{validTime}分钟内有效，请尽快验证并保管好验证码。</p>\\n                    <p align=\\\"right\\\">{sysName}</p>\\n                    <p align=\\\"right\\\">{sysNowTime}</p>\\n                </div>\\n            </td>\\n        </tr>\\n        </tbody>\\n    </table>\\n</div>\"}', 'EMAIL_TEMPLATE_FOR_B', 'B端重置密码验证码邮件消息模板内容', 98, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755216', 'SNOWY_EMAIL_TEMPLATE_NOTICE_PASSWORD_RESET_SUCCESS_FOR_B', '{\"subject\":\"重置密码成功提醒\",\"content\":\"<div style=\\\"padding: 35px;\\\">\\n    <table cellpadding=\\\"0\\\" align=\\\"center\\\"\\n           style=\\\"width: 600px; margin: 0 auto; text-align: left; position: relative; border-radius: 5px;font-size: 18px; font-family:-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans\', sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Noto Color Emoji\'; line-height: 1.5; box-shadow: rgb(153, 153, 153) 0 0 5px; border-collapse: collapse; background: #fff initial initial initial initial;\\\">\\n        <tbody>\\n        <tr>\\n            <th valign=\\\"middle\\\"\\n                style=\\\"height: 25px; line-height: 25px; padding: 15px 35px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: rgba(18, 24, 37, 0.87); background-color: #1677FF; border-radius: 5px 5px 0 0;\\\">\\n                <font size=\\\"5\\\" style=\\\"color: rgb(255, 255, 255); \\\">{sysName}</font>\\n            </th>\\n        </tr>\\n        <tr>\\n            <td>\\n                <div style=\\\"padding:25px 35px 40px; background-color:#fff;\\\">\\n                    <h2 style=\\\"margin: 5px 0; \\\">\\n                        <font color=\\\"#333333\\\" style=\\\"line-height: 20px; \\\">\\n                            <font style=\\\"line-height: 22px; \\\" size=\\\"4\\\">亲爱的用户：{userEmail}</font>\\n                        </font>\\n                    </h2>\\n                    <p>您的密码已经重置，重置后的密码为：<font style=\\\"color: #1677FF\\\">{userNewPassword}</font>，如非本人操作请立即修账户密码。</p>\\n                    <p align=\\\"right\\\">{sysName}</p>\\n                    <p align=\\\"right\\\">{sysNowTime}</p>\\n                </div>\\n            </td>\\n        </tr>\\n        </tbody>\\n    </table>\\n</div>\"}', 'EMAIL_TEMPLATE_FOR_B', 'B端重置密码成功邮件消息模板内容', 99, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755217', 'SNOWY_EMAIL_TEMPLATE_NOTICE_PASSWORD_EXPIRED_FOR_B', '{\"subject\":\"密码即将到期提醒\",\"content\":\"<div style=\\\"padding: 35px;\\\">\\n    <table cellpadding=\\\"0\\\" align=\\\"center\\\"\\n           style=\\\"width: 600px; margin: 0 auto; text-align: left; position: relative; border-radius: 5px;font-size: 18px; font-family:-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans\', sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Noto Color Emoji\'; line-height: 1.5; box-shadow: rgb(153, 153, 153) 0 0 5px; border-collapse: collapse; background: #fff initial initial initial initial;\\\">\\n        <tbody>\\n        <tr>\\n            <th valign=\\\"middle\\\"\\n                style=\\\"height: 25px; line-height: 25px; padding: 15px 35px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: rgba(18, 24, 37, 0.87); background-color: #1677FF; border-radius: 5px 5px 0 0;\\\">\\n                <font size=\\\"5\\\" style=\\\"color: rgb(255, 255, 255); \\\">{sysName}</font>\\n            </th>\\n        </tr>\\n        <tr>\\n            <td>\\n                <div style=\\\"padding:25px 35px 40px; background-color:#fff;\\\">\\n                    <h2 style=\\\"margin: 5px 0; \\\">\\n                        <font color=\\\"#333333\\\" style=\\\"line-height: 20px; \\\">\\n                            <font style=\\\"line-height: 22px; \\\" size=\\\"4\\\">亲爱的用户：{userEmail}</font>\\n                        </font>\\n                    </h2>\\n                    <p>您的密码即将过期，请尽快修改密码。</p>\\n                    <p align=\\\"right\\\">{sysName}</p>\\n                    <p align=\\\"right\\\">{sysNowTime}</p>\\n                </div>\\n            </td>\\n        </tr>\\n        </tbody>\\n    </table>\\n</div>\"}', 'EMAIL_TEMPLATE_FOR_B', 'B端密码即将到期邮件消息模板内容', 100, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755218', 'SNOWY_EMAIL_TEMPLATE_VALID_CODE_BINDING_EMAIL_FOR_B', '{\"subject\":\"绑定邮箱验证码\",\"content\":\"<div style=\\\"padding: 35px;\\\">\\n    <table cellpadding=\\\"0\\\" align=\\\"center\\\"\\n           style=\\\"width: 600px; margin: 0 auto; text-align: left; position: relative; border-radius: 5px;font-size: 18px; font-family:-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans\', sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Noto Color Emoji\'; line-height: 1.5; box-shadow: rgb(153, 153, 153) 0 0 5px; border-collapse: collapse; background: #fff initial initial initial initial;\\\">\\n        <tbody>\\n        <tr>\\n            <th valign=\\\"middle\\\"\\n                style=\\\"height: 25px; line-height: 25px; padding: 15px 35px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: rgba(18, 24, 37, 0.87); background-color: #1677FF; border-radius: 5px 5px 0 0;\\\">\\n                <font size=\\\"5\\\" style=\\\"color: rgb(255, 255, 255); \\\">{sysName}</font>\\n            </th>\\n        </tr>\\n        <tr>\\n            <td>\\n                <div style=\\\"padding:25px 35px 40px; background-color:#fff;\\\">\\n                    <h2 style=\\\"margin: 5px 0; \\\">\\n                        <font color=\\\"#333333\\\" style=\\\"line-height: 20px; \\\">\\n                            <font style=\\\"line-height: 22px; \\\" size=\\\"4\\\">亲爱的用户：{userEmail}</font>\\n                        </font>\\n                    </h2>\\n                    <p>您正在绑定邮箱, 您的验证码为：<font style=\\\"color: #1677FF\\\">{validCode}</font>，该验证码{validTime}分钟内有效，请尽快验证并保管好验证码。</p>\\n                    <p align=\\\"right\\\">{sysName}</p>\\n                    <p align=\\\"right\\\">{sysNowTime}</p>\\n                </div>\\n            </td>\\n        </tr>\\n        </tbody>\\n    </table>\\n</div>\"}', 'EMAIL_TEMPLATE_FOR_B', 'B端绑定邮箱验证码邮件消息模板内容', 101, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755219', 'SNOWY_EMAIL_TEMPLATE_VALID_CODE_UPDATE_BINDING_EMAIL_FOR_B', '{\"subject\":\"修改绑定邮箱验证码\",\"content\":\"<div style=\\\"padding: 35px;\\\">\\n    <table cellpadding=\\\"0\\\" align=\\\"center\\\"\\n           style=\\\"width: 600px; margin: 0 auto; text-align: left; position: relative; border-radius: 5px;font-size: 18px; font-family:-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans\', sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Noto Color Emoji\'; line-height: 1.5; box-shadow: rgb(153, 153, 153) 0 0 5px; border-collapse: collapse; background: #fff initial initial initial initial;\\\">\\n        <tbody>\\n        <tr>\\n            <th valign=\\\"middle\\\"\\n                style=\\\"height: 25px; line-height: 25px; padding: 15px 35px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: rgba(18, 24, 37, 0.87); background-color: #1677FF; border-radius: 5px 5px 0 0;\\\">\\n                <font size=\\\"5\\\" style=\\\"color: rgb(255, 255, 255); \\\">{sysName}</font>\\n            </th>\\n        </tr>\\n        <tr>\\n            <td>\\n                <div style=\\\"padding:25px 35px 40px; background-color:#fff;\\\">\\n                    <h2 style=\\\"margin: 5px 0; \\\">\\n                        <font color=\\\"#333333\\\" style=\\\"line-height: 20px; \\\">\\n                            <font style=\\\"line-height: 22px; \\\" size=\\\"4\\\">亲爱的用户：{userEmail}</font>\\n                        </font>\\n                    </h2>\\n                    <p>您正在修改绑定邮箱, 您的验证码为：<font style=\\\"color: #1677FF\\\">{validCode}</font>，该验证码{validTime}分钟内有效，请尽快验证并保管好验证码。</p>\\n                    <p align=\\\"right\\\">{sysName}</p>\\n                    <p align=\\\"right\\\">{sysNowTime}</p>\\n                </div>\\n            </td>\\n        </tr>\\n        </tbody>\\n    </table>\\n</div>\"}', 'EMAIL_TEMPLATE_FOR_B', 'B端修改绑定邮箱验证码邮件消息模板内容', 102, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755220', 'SNOWY_EMAIL_TEMPLATE_NOTICE_REGISTER_SUCCESS_FOR_C', '{\"subject\":\"注册账号成功提醒\",\"content\":\"<div style=\\\"padding: 35px;\\\">\\n    <table cellpadding=\\\"0\\\" align=\\\"center\\\"\\n           style=\\\"width: 600px; margin: 0 auto; text-align: left; position: relative; border-radius: 5px;font-size: 18px; font-family:-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans\', sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Noto Color Emoji\'; line-height: 1.5; box-shadow: rgb(153, 153, 153) 0 0 5px; border-collapse: collapse; background: #fff initial initial initial initial;\\\">\\n        <tbody>\\n        <tr>\\n            <th valign=\\\"middle\\\"\\n                style=\\\"height: 25px; line-height: 25px; padding: 15px 35px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: rgba(18, 24, 37, 0.87); background-color: #1677FF; border-radius: 5px 5px 0 0;\\\">\\n                <font size=\\\"5\\\" style=\\\"color: rgb(255, 255, 255); \\\">{sysName}</font>\\n            </th>\\n        </tr>\\n        <tr>\\n            <td>\\n                <div style=\\\"padding:25px 35px 40px; background-color:#fff;\\\">\\n                    <h2 style=\\\"margin: 5px 0; \\\">\\n                        <font color=\\\"#333333\\\" style=\\\"line-height: 20px; \\\">\\n                            <font style=\\\"line-height: 22px; \\\" size=\\\"4\\\">亲爱的用户：{userEmail}</font>\\n                        </font>\\n                    </h2>\\n                    <p>您的账号注册成功，感谢您加入{sysName}。</p>\\n                    <p align=\\\"right\\\">{sysName}</p>\\n                    <p align=\\\"right\\\">{sysNowTime}</p>\\n                </div>\\n            </td>\\n        </tr>\\n        </tbody>\\n    </table>\\n</div>\"}', 'EMAIL_TEMPLATE_FOR_C', 'C端注册账号成功邮件消息模板内容', 103, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755221', 'SNOWY_EMAIL_TEMPLATE_VALID_CODE_LOGIN_FOR_C', '{\"subject\":\"登录系统验证码\",\"content\":\"<div style=\\\"padding: 35px;\\\">\\n    <table cellpadding=\\\"0\\\" align=\\\"center\\\"\\n           style=\\\"width: 600px; margin: 0 auto; text-align: left; position: relative; border-radius: 5px;font-size: 18px; font-family:-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans\', sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Noto Color Emoji\'; line-height: 1.5; box-shadow: rgb(153, 153, 153) 0 0 5px; border-collapse: collapse; background: #fff initial initial initial initial;\\\">\\n        <tbody>\\n        <tr>\\n            <th valign=\\\"middle\\\"\\n                style=\\\"height: 25px; line-height: 25px; padding: 15px 35px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: rgba(18, 24, 37, 0.87); background-color: #1677FF; border-radius: 5px 5px 0 0;\\\">\\n                <font size=\\\"5\\\" style=\\\"color: rgb(255, 255, 255); \\\">{sysName}</font>\\n            </th>\\n        </tr>\\n        <tr>\\n            <td>\\n                <div style=\\\"padding:25px 35px 40px; background-color:#fff;\\\">\\n                    <h2 style=\\\"margin: 5px 0; \\\">\\n                        <font color=\\\"#333333\\\" style=\\\"line-height: 20px; \\\">\\n                            <font style=\\\"line-height: 22px; \\\" size=\\\"4\\\">亲爱的用户：{userEmail}</font>\\n                        </font>\\n                    </h2>\\n                    <p>您正在登录系统, 您的验证码为：<font style=\\\"color: #1677FF\\\">{validCode}</font>，该验证码{validTime}分钟内有效，请尽快验证并保管好验证码。</p>\\n                    <p align=\\\"right\\\">{sysName}</p>\\n                    <p align=\\\"right\\\">{sysNowTime}</p>\\n                </div>\\n            </td>\\n        </tr>\\n        </tbody>\\n    </table>\\n</div>\"}', 'EMAIL_TEMPLATE_FOR_C', 'C端登录系统验证码邮件消息模板内容', 104, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755222', 'SNOWY_EMAIL_TEMPLATE_VALID_CODE_UPDATE_PASSWORD_FOR_C', '{\"subject\":\"修改密码验证码\",\"content\":\"<div style=\\\"padding: 35px;\\\">\\n    <table cellpadding=\\\"0\\\" align=\\\"center\\\"\\n           style=\\\"width: 600px; margin: 0 auto; text-align: left; position: relative; border-radius: 5px;font-size: 18px; font-family:-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans\', sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Noto Color Emoji\'; line-height: 1.5; box-shadow: rgb(153, 153, 153) 0 0 5px; border-collapse: collapse; background: #fff initial initial initial initial;\\\">\\n        <tbody>\\n        <tr>\\n            <th valign=\\\"middle\\\"\\n                style=\\\"height: 25px; line-height: 25px; padding: 15px 35px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: rgba(18, 24, 37, 0.87); background-color: #1677FF; border-radius: 5px 5px 0 0;\\\">\\n                <font size=\\\"5\\\" style=\\\"color: rgb(255, 255, 255); \\\">{sysName}</font>\\n            </th>\\n        </tr>\\n        <tr>\\n            <td>\\n                <div style=\\\"padding:25px 35px 40px; background-color:#fff;\\\">\\n                    <h2 style=\\\"margin: 5px 0; \\\">\\n                        <font color=\\\"#333333\\\" style=\\\"line-height: 20px; \\\">\\n                            <font style=\\\"line-height: 22px; \\\" size=\\\"4\\\">亲爱的用户：{userEmail}</font>\\n                        </font>\\n                    </h2>\\n                    <p>您正在修改密码, 您的验证码为：<font style=\\\"color: #1677FF\\\">{validCode}</font>，该验证码{validTime}分钟内有效，请尽快验证并保管好验证码。</p>\\n                    <p align=\\\"right\\\">{sysName}</p>\\n                    <p align=\\\"right\\\">{sysNowTime}</p>\\n                </div>\\n            </td>\\n        </tr>\\n        </tbody>\\n    </table>\\n</div>\"}', 'EMAIL_TEMPLATE_FOR_C', 'C端修改密码验证码邮件消息模板内容', 105, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755223', 'SNOWY_EMAIL_TEMPLATE_VALID_CODE_RESET_PASSWORD_FOR_C', '{\"subject\":\"重置密码验证码\",\"content\":\"<div style=\\\"padding: 35px;\\\">\\n    <table cellpadding=\\\"0\\\" align=\\\"center\\\"\\n           style=\\\"width: 600px; margin: 0 auto; text-align: left; position: relative; border-radius: 5px;font-size: 18px; font-family:-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans\', sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Noto Color Emoji\'; line-height: 1.5; box-shadow: rgb(153, 153, 153) 0 0 5px; border-collapse: collapse; background: #fff initial initial initial initial;\\\">\\n        <tbody>\\n        <tr>\\n            <th valign=\\\"middle\\\"\\n                style=\\\"height: 25px; line-height: 25px; padding: 15px 35px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: rgba(18, 24, 37, 0.87); background-color: #1677FF; border-radius: 5px 5px 0 0;\\\">\\n                <font size=\\\"5\\\" style=\\\"color: rgb(255, 255, 255); \\\">{sysName}</font>\\n            </th>\\n        </tr>\\n        <tr>\\n            <td>\\n                <div style=\\\"padding:25px 35px 40px; background-color:#fff;\\\">\\n                    <h2 style=\\\"margin: 5px 0; \\\">\\n                        <font color=\\\"#333333\\\" style=\\\"line-height: 20px; \\\">\\n                            <font style=\\\"line-height: 22px; \\\" size=\\\"4\\\">亲爱的用户：{userEmail}</font>\\n                        </font>\\n                    </h2>\\n                    <p>您正在重置密码, 您的验证码为：<font style=\\\"color: #1677FF\\\">{validCode}</font>，该验证码{validTime}分钟内有效，请尽快验证并保管好验证码。</p>\\n                    <p align=\\\"right\\\">{sysName}</p>\\n                    <p align=\\\"right\\\">{sysNowTime}</p>\\n                </div>\\n            </td>\\n        </tr>\\n        </tbody>\\n    </table>\\n</div>\"}', 'EMAIL_TEMPLATE_FOR_C', 'C端重置密码验证码邮件消息模板内容', 106, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755224', 'SNOWY_EMAIL_TEMPLATE_NOTICE_PASSWORD_RESET_SUCCESS_FOR_C', '{\"subject\":\"重置密码成功提醒\",\"content\":\"<div style=\\\"padding: 35px;\\\">\\n    <table cellpadding=\\\"0\\\" align=\\\"center\\\"\\n           style=\\\"width: 600px; margin: 0 auto; text-align: left; position: relative; border-radius: 5px;font-size: 18px; font-family:-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans\', sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Noto Color Emoji\'; line-height: 1.5; box-shadow: rgb(153, 153, 153) 0 0 5px; border-collapse: collapse; background: #fff initial initial initial initial;\\\">\\n        <tbody>\\n        <tr>\\n            <th valign=\\\"middle\\\"\\n                style=\\\"height: 25px; line-height: 25px; padding: 15px 35px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: rgba(18, 24, 37, 0.87); background-color: #1677FF; border-radius: 5px 5px 0 0;\\\">\\n                <font size=\\\"5\\\" style=\\\"color: rgb(255, 255, 255); \\\">{sysName}</font>\\n            </th>\\n        </tr>\\n        <tr>\\n            <td>\\n                <div style=\\\"padding:25px 35px 40px; background-color:#fff;\\\">\\n                    <h2 style=\\\"margin: 5px 0; \\\">\\n                        <font color=\\\"#333333\\\" style=\\\"line-height: 20px; \\\">\\n                            <font style=\\\"line-height: 22px; \\\" size=\\\"4\\\">亲爱的用户：{userEmail}</font>\\n                        </font>\\n                    </h2>\\n                    <p>您的密码已经重置，重置后的密码为：<font style=\\\"color: #1677FF\\\">{userNewPassword}</font>，如非本人操作请立即修账户密码。</p>\\n                    <p align=\\\"right\\\">{sysName}</p>\\n                    <p align=\\\"right\\\">{sysNowTime}</p>\\n                </div>\\n            </td>\\n        </tr>\\n        </tbody>\\n    </table>\\n</div>\"}', 'EMAIL_TEMPLATE_FOR_C', 'C端重置密码成功邮件消息模板内容', 107, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755225', 'SNOWY_EMAIL_TEMPLATE_NOTICE_PASSWORD_EXPIRED_FOR_C', '{\"subject\":\"密码即将到期提醒\",\"content\":\"<div style=\\\"padding: 35px;\\\">\\n    <table cellpadding=\\\"0\\\" align=\\\"center\\\"\\n           style=\\\"width: 600px; margin: 0 auto; text-align: left; position: relative; border-radius: 5px;font-size: 18px; font-family:-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans\', sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Noto Color Emoji\'; line-height: 1.5; box-shadow: rgb(153, 153, 153) 0 0 5px; border-collapse: collapse; background: #fff initial initial initial initial;\\\">\\n        <tbody>\\n        <tr>\\n            <th valign=\\\"middle\\\"\\n                style=\\\"height: 25px; line-height: 25px; padding: 15px 35px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: rgba(18, 24, 37, 0.87); background-color: #1677FF; border-radius: 5px 5px 0 0;\\\">\\n                <font size=\\\"5\\\" style=\\\"color: rgb(255, 255, 255); \\\">{sysName}</font>\\n            </th>\\n        </tr>\\n        <tr>\\n            <td>\\n                <div style=\\\"padding:25px 35px 40px; background-color:#fff;\\\">\\n                    <h2 style=\\\"margin: 5px 0; \\\">\\n                        <font color=\\\"#333333\\\" style=\\\"line-height: 20px; \\\">\\n                            <font style=\\\"line-height: 22px; \\\" size=\\\"4\\\">亲爱的用户：{userEmail}</font>\\n                        </font>\\n                    </h2>\\n                    <p>您的密码即将过期，请尽快修改密码。</p>\\n                    <p align=\\\"right\\\">{sysName}</p>\\n                    <p align=\\\"right\\\">{sysNowTime}</p>\\n                </div>\\n            </td>\\n        </tr>\\n        </tbody>\\n    </table>\\n</div>\"}', 'EMAIL_TEMPLATE_FOR_C', 'C端密码即将到期邮件消息模板内容', 108, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755226', 'SNOWY_EMAIL_TEMPLATE_VALID_CODE_BINDING_EMAIL_FOR_C', '{\"subject\":\"绑定邮箱验证码\",\"content\":\"<div style=\\\"padding: 35px;\\\">\\n    <table cellpadding=\\\"0\\\" align=\\\"center\\\"\\n           style=\\\"width: 600px; margin: 0 auto; text-align: left; position: relative; border-radius: 5px;font-size: 18px; font-family:-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans\', sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Noto Color Emoji\'; line-height: 1.5; box-shadow: rgb(153, 153, 153) 0 0 5px; border-collapse: collapse; background: #fff initial initial initial initial;\\\">\\n        <tbody>\\n        <tr>\\n            <th valign=\\\"middle\\\"\\n                style=\\\"height: 25px; line-height: 25px; padding: 15px 35px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: rgba(18, 24, 37, 0.87); background-color: #1677FF; border-radius: 5px 5px 0 0;\\\">\\n                <font size=\\\"5\\\" style=\\\"color: rgb(255, 255, 255); \\\">{sysName}</font>\\n            </th>\\n        </tr>\\n        <tr>\\n            <td>\\n                <div style=\\\"padding:25px 35px 40px; background-color:#fff;\\\">\\n                    <h2 style=\\\"margin: 5px 0; \\\">\\n                        <font color=\\\"#333333\\\" style=\\\"line-height: 20px; \\\">\\n                            <font style=\\\"line-height: 22px; \\\" size=\\\"4\\\">亲爱的用户：{userEmail}</font>\\n                        </font>\\n                    </h2>\\n                    <p>您正在绑定邮箱, 您的验证码为：<font style=\\\"color: #1677FF\\\">{validCode}</font>，该验证码{validTime}分钟内有效，请尽快验证并保管好验证码。</p>\\n                    <p align=\\\"right\\\">{sysName}</p>\\n                    <p align=\\\"right\\\">{sysNowTime}</p>\\n                </div>\\n            </td>\\n        </tr>\\n        </tbody>\\n    </table>\\n</div>\"}', 'EMAIL_TEMPLATE_FOR_C', 'C端绑定邮箱验证码邮件消息模板内容', 109, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755227', 'SNOWY_EMAIL_TEMPLATE_VALID_CODE_UPDATE_BINDING_EMAIL_FOR_C', '{\"subject\":\"修改绑定邮箱验证码\",\"content\":\"<div style=\\\"padding: 35px;\\\">\\n    <table cellpadding=\\\"0\\\" align=\\\"center\\\"\\n           style=\\\"width: 600px; margin: 0 auto; text-align: left; position: relative; border-radius: 5px;font-size: 18px; font-family:-apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, \'Noto Sans\', sans-serif, \'Apple Color Emoji\', \'Segoe UI Emoji\', \'Segoe UI Symbol\', \'Noto Color Emoji\'; line-height: 1.5; box-shadow: rgb(153, 153, 153) 0 0 5px; border-collapse: collapse; background: #fff initial initial initial initial;\\\">\\n        <tbody>\\n        <tr>\\n            <th valign=\\\"middle\\\"\\n                style=\\\"height: 25px; line-height: 25px; padding: 15px 35px; border-bottom-width: 1px; border-bottom-style: solid; border-bottom-color: rgba(18, 24, 37, 0.87); background-color: #1677FF; border-radius: 5px 5px 0 0;\\\">\\n                <font size=\\\"5\\\" style=\\\"color: rgb(255, 255, 255); \\\">{sysName}</font>\\n            </th>\\n        </tr>\\n        <tr>\\n            <td>\\n                <div style=\\\"padding:25px 35px 40px; background-color:#fff;\\\">\\n                    <h2 style=\\\"margin: 5px 0; \\\">\\n                        <font color=\\\"#333333\\\" style=\\\"line-height: 20px; \\\">\\n                            <font style=\\\"line-height: 22px; \\\" size=\\\"4\\\">亲爱的用户：{userEmail}</font>\\n                        </font>\\n                    </h2>\\n                    <p>您正在修改绑定邮箱, 您的验证码为：<font style=\\\"color: #1677FF\\\">{validCode}</font>，该验证码{validTime}分钟内有效，请尽快验证并保管好验证码。</p>\\n                    <p align=\\\"right\\\">{sysName}</p>\\n                    <p align=\\\"right\\\">{sysNowTime}</p>\\n                </div>\\n            </td>\\n        </tr>\\n        </tbody>\\n    </table>\\n</div>\"}', 'EMAIL_TEMPLATE_FOR_C', 'C端修改绑定邮箱验证码邮件消息模板内容', 110, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755228', 'SNOWY_SMS_TEMPLATE_NOTICE_REGISTER_SUCCESS_FOR_B', '{\"code\":\"\",\"content\":\"您的账号注册成功，感谢您加入${sysName}。\"}', 'SMS_TEMPLATE_FOR_B', 'B端注册账号成功短信消息模板编码', 111, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755229', 'SNOWY_SMS_TEMPLATE_VALID_CODE_LOGIN_FOR_B', '{\"code\":\"\",\"content\":\"您正在登录系统, 您的验证码为：${validCode}，该验证码${validTime}分钟内有效，请尽快验证并保管好验证码。\"}', 'SMS_TEMPLATE_FOR_B', 'B端登录系统验证码短信消息模板编码', 112, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755230', 'SNOWY_SMS_TEMPLATE_VALID_CODE_UPDATE_PASSWORD_FOR_B', '{\"code\":\"\",\"content\":\"您正在修改密码, 您的验证码为：${validCode}，该验证码${validTime}分钟内有效，请尽快验证并保管好验证码。\"}', 'SMS_TEMPLATE_FOR_B', 'B端修改密码验证码短信消息模板编码', 113, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755231', 'SNOWY_SMS_TEMPLATE_VALID_CODE_RESET_PASSWORD_FOR_B', '{\"code\":\"\",\"content\":\"您正在重置密码, 您的验证码为：${validCode}，该验证码${validTime}分钟内有效，请尽快验证并保管好验证码。\"}', 'SMS_TEMPLATE_FOR_B', 'B端重置密码验证码短信消息模板编码', 114, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755232', 'SNOWY_SMS_TEMPLATE_NOTICE_PASSWORD_RESET_SUCCESS_FOR_B', '{\"code\":\"\",\"content\":\"您的密码已经重置，重置后的密码为：${userNewPassword}，如非本人操作请立即修账户密码。\"}', 'SMS_TEMPLATE_FOR_B', 'B端重置密码成功短信消息模板编码', 115, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755233', 'SNOWY_SMS_TEMPLATE_NOTICE_PASSWORD_EXPIRED_FOR_B', '{\"code\":\"\",\"content\":\"您的密码即将过期，请尽快修改密码。\"}', 'SMS_TEMPLATE_FOR_B', 'B端密码即将到期短信消息模板编码', 116, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755234', 'SNOWY_SMS_TEMPLATE_VALID_CODE_BINDING_PHONE_FOR_B', '{\"code\":\"\",\"content\":\"您正在绑定手机, 您的验证码为：${validCode}，该验证码${validTime}分钟内有效，请尽快验证并保管好验证码。\"}', 'SMS_TEMPLATE_FOR_B', 'B端绑定手机验证码短信消息模板编码', 117, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755235', 'SNOWY_SMS_TEMPLATE_VALID_CODE_UPDATE_BINDING_PHONE_FOR_B', '{\"code\":\"\",\"content\":\"您正在修改绑定手机, 您的验证码为：${validCode}，该验证码${validTime}分钟内有效，请尽快验证并保管好验证码。\"}', 'SMS_TEMPLATE_FOR_B', 'B端修改绑定手机验证码短信消息模板编码', 118, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755236', 'SNOWY_SMS_TEMPLATE_NOTICE_REGISTER_SUCCESS_FOR_C', '{\"code\":\"\",\"content\":\"您的账号注册成功，感谢您加入${sysName}。\"}', 'SMS_TEMPLATE_FOR_C', 'C端注册账号成功短信消息模板编码', 119, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755237', 'SNOWY_SMS_TEMPLATE_VALID_CODE_LOGIN_FOR_C', '{\"code\":\"\",\"content\":\"您正在登录系统, 您的验证码为：${validCode}，该验证码${validTime}分钟内有效，请尽快验证并保管好验证码。\"}', 'SMS_TEMPLATE_FOR_C', 'C端登录系统验证码短信消息模板编码', 120, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755238', 'SNOWY_SMS_TEMPLATE_VALID_CODE_UPDATE_PASSWORD_FOR_C', '{\"code\":\"\",\"content\":\"您正在修改密码, 您的验证码为：${validCode}，该验证码${validTime}分钟内有效，请尽快验证并保管好验证码。\"}', 'SMS_TEMPLATE_FOR_C', 'C端修改密码验证码短信消息模板编码', 121, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755239', 'SNOWY_SMS_TEMPLATE_VALID_CODE_RESET_PASSWORD_FOR_C', '{\"code\":\"\",\"content\":\"您正在重置密码, 您的验证码为：${validCode}，该验证码${validTime}分钟内有效，请尽快验证并保管好验证码。\"}', 'SMS_TEMPLATE_FOR_C', 'C端重置密码验证码短信消息模板编码', 122, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755240', 'SNOWY_SMS_TEMPLATE_NOTICE_PASSWORD_RESET_SUCCESS_FOR_C', '{\"code\":\"\",\"content\":\"您的密码已经重置，重置后的密码为：${userNewPassword}，如非本人操作请立即修账户密码。\"}', 'SMS_TEMPLATE_FOR_C', 'C端重置密码成功短信消息模板编码', 123, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755241', 'SNOWY_SMS_TEMPLATE_NOTICE_PASSWORD_EXPIRED_FOR_C', '{\"code\":\"\",\"content\":\"您的密码即将过期，请尽快修改密码。\"}', 'SMS_TEMPLATE_FOR_C', 'C端密码即将到期短信消息模板编码', 124, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755242', 'SNOWY_SMS_TEMPLATE_VALID_CODE_BINDING_PHONE_FOR_C', '{\"code\":\"\",\"content\":\"您正在绑定手机, 您的验证码为：${validCode}，该验证码${validTime}分钟内有效，请尽快验证并保管好验证码。\"}', 'SMS_TEMPLATE_FOR_C', 'C端绑定手机验证码短信消息模板编码', 125, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755243', 'SNOWY_SMS_TEMPLATE_VALID_CODE_UPDATE_BINDING_PHONE_FOR_C', '{\"code\":\"\",\"content\":\"您正在修改绑定手机, 您的验证码为：${validCode}，该验证码${validTime}分钟内有效，请尽快验证并保管好验证码。\"}', 'SMS_TEMPLATE_FOR_C', 'C端修改绑定手机验证码短信消息模板编码', 126, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755244', 'SNOWY_SYS_DEFAULT_CONTINUOUS_LOGIN_FAIL_DURATION_FOR_B', '5', 'LOGIN_STRATEGY_FOR_B', 'B端连续登录失败持续时间', 127, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755245', 'SNOWY_SYS_DEFAULT_CONTINUOUS_LOGIN_FAIL_TIMES_FOR_B', '5', 'LOGIN_STRATEGY_FOR_B', 'B端连续登录失败次数', 128, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755246', 'SNOWY_SYS_DEFAULT_CONTINUOUS_LOGIN_FAIL_LOCK_DURATION_FOR_B', '5', 'LOGIN_STRATEGY_FOR_B', 'B端连续登录失败锁定时间', 129, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755247', 'SNOWY_SYS_DEFAULT_ALLOW_PHONE_LOGIN_FLAG_FOR_B', 'true', 'LOGIN_STRATEGY_FOR_B', 'B端是否允许手机号登录', 130, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755248', 'SNOWY_SYS_DEFAULT_STRATEGY_WHEN_NO_USER_WITH_PHONE_FOR_B', 'NOT_ALLOW_LOGIN', 'LOGIN_STRATEGY_FOR_B', 'B端手机号无对应用户时策略', 131, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755249', 'SNOWY_SYS_DEFAULT_ALLOW_EMAIL_LOGIN_FLAG_FOR_B', 'true', 'LOGIN_STRATEGY_FOR_B', 'B端是否允许邮箱登录', 132, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755250', 'SNOWY_SYS_DEFAULT_STRATEGY_WHEN_NO_USER_WITH_EMAIL_FOR_B', 'NOT_ALLOW_LOGIN', 'LOGIN_STRATEGY_FOR_B', 'B端邮箱无对应用户时策略', 133, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755251', 'SNOWY_SYS_DEFAULT_NEW_USER_ORG_FOR_B', '1543842934270394368', 'REGISTER_STRATEGY_FOR_B', 'B端新用户默认机构', 144, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755252', 'SNOWY_SYS_DEFAULT_NEW_USER_POSITION_FOR_B', '1543899639134019583', 'REGISTER_STRATEGY_FOR_B', 'B端新用户默认职位', 145, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755253', 'SNOWY_SYS_DEFAULT_NEW_USER_ROLE_FOR_B', '1570687866138206208', 'REGISTER_STRATEGY_FOR_B', 'B端新用户默认角色', 146, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755254', 'SNOWY_SYS_DEFAULT_CONTINUOUS_LOGIN_FAIL_DURATION_FOR_C', '5', 'LOGIN_STRATEGY_FOR_C', 'C端连续登录失败持续时间', 134, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755255', 'SNOWY_SYS_DEFAULT_CONTINUOUS_LOGIN_FAIL_TIMES_FOR_C', '5', 'LOGIN_STRATEGY_FOR_C', 'C端连续登录失败次数', 135, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755256', 'SNOWY_SYS_DEFAULT_CONTINUOUS_LOGIN_FAIL_LOCK_DURATION_FOR_C', '5', 'LOGIN_STRATEGY_FOR_C', 'C端连续登录失败锁定时间', 136, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755257', 'SNOWY_SYS_DEFAULT_ALLOW_PHONE_LOGIN_FLAG_FOR_C', 'true', 'LOGIN_STRATEGY_FOR_C', 'C端是否允许手机号登录', 137, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755258', 'SNOWY_SYS_DEFAULT_STRATEGY_WHEN_NO_USER_WITH_PHONE_FOR_C', 'NOT_ALLOW_LOGIN', 'LOGIN_STRATEGY_FOR_C', 'C端手机号无对应用户时策略', 138, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755259', 'SNOWY_SYS_DEFAULT_ALLOW_EMAIL_LOGIN_FLAG_FOR_C', 'true', 'LOGIN_STRATEGY_FOR_C', 'C端是否允许邮箱登录', 139, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755260', 'SNOWY_SYS_DEFAULT_STRATEGY_WHEN_NO_USER_WITH_EMAIL_FOR_C', 'NOT_ALLOW_LOGIN', 'LOGIN_STRATEGY_FOR_C', 'C端邮箱无对应用户时策略', 140, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755261', 'SNOWY_SYS_DEFAULT_ALLOW_REGISTER_FLAG_FOR_B', 'true', 'REGISTER_STRATEGY_FOR_B', 'B端是否允许注册', 141, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755262', 'SNOWY_SYS_DEFAULT_REGISTER_NEED_BIND_PHONE_FOR_B', 'false', 'REGISTER_STRATEGY_FOR_B', 'B端注册后是否需要绑定手机号', 142, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755263', 'SNOWY_SYS_DEFAULT_REGISTER_NEED_BIND_EMAIL_FOR_B', 'false', 'REGISTER_STRATEGY_FOR_B', 'B端注册后是否需要绑定邮箱', 143, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755264', 'SNOWY_SYS_DEFAULT_ALLOW_REGISTER_FLAG_FOR_C', 'true', 'REGISTER_STRATEGY_FOR_C', 'C端是否允许注册', 147, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755265', 'SNOWY_SYS_DEFAULT_REGISTER_NEED_BIND_PHONE_FOR_C', 'false', 'REGISTER_STRATEGY_FOR_C', 'C端注册后是否需要绑定手机号', 148, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755266', 'SNOWY_SYS_DEFAULT_REGISTER_NEED_BIND_EMAIL_FOR_C', 'false', 'REGISTER_STRATEGY_FOR_C', 'C端注册后是否需要绑定邮箱', 149, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755267', 'SNOWY_SYS_DEFAULT_PASSWORD_UPDATE_VALID_TYPE_FOR_B', 'OLD', 'PASSWORD_STRATEGY_FOR_B', 'B端密码修改验证方式', 150, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755268', 'SNOWY_SYS_DEFAULT_PASSWORD_MIN_LENGTH_FOR_B', '6', 'PASSWORD_STRATEGY_FOR_B', 'B端密码最小长度', 151, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755269', 'SNOWY_SYS_DEFAULT_PASSWORD_MAX_LENGTH_FOR_B', '20', 'PASSWORD_STRATEGY_FOR_B', 'B端密码最大长度', 152, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755270', 'SNOWY_SYS_DEFAULT_PASSWORD_COMPLEXITY_FOR_B', 'REG0', 'PASSWORD_STRATEGY_FOR_B', 'B端密码复杂度', 153, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755271', 'SNOWY_SYS_DEFAULT_PASSWORD_NOT_ALLOW_CONTINUOUS_SAME_CHARACTER_LENGTH_FOR_B', '3', 'PASSWORD_STRATEGY_FOR_B', 'B端密码不能连续存在相同字符个数', 154, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755272', 'SNOWY_SYS_DEFAULT_PASSWORD_NOT_ALLOW_CONTAINS_USER_INFO_FLAG_FOR_B', 'true', 'PASSWORD_STRATEGY_FOR_B', 'B端密码不能包含用户信息开关', 155, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755273', 'SNOWY_SYS_DEFAULT_PASSWORD_NOT_ALLOW_USE_HISTORY_FLAG_FOR_B', 'true', 'PASSWORD_STRATEGY_FOR_B', 'B端密码不能使用历史密码开关', 156, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755274', 'SNOWY_SYS_DEFAULT_PASSWORD_NOT_ALLOW_USE_HISTORY_COUNT_FOR_B', '3', 'PASSWORD_STRATEGY_FOR_B', 'B端密码不能使用历史密码范围个数', 157, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755275', 'SNOWY_SYS_DEFAULT_PASSWORD_NOT_ALLOW_USE_WEAK_FLAG_FOR_B', 'true', 'PASSWORD_STRATEGY_FOR_B', 'B端密码不能使用弱密码库中密码开关', 158, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755276', 'SNOWY_SYS_DEFAULT_PASSWORD_DEFINE_WEAK_DATABASE_FOR_B', 'xiaonuo,xiaonuoark', 'PASSWORD_STRATEGY_FOR_B', 'B端密码自定义额外弱密码库', 159, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755277', 'SNOWY_SYS_DEFAULT_PASSWORD_EXPIRED_DAYS_FOR_B', '30', 'PASSWORD_STRATEGY_FOR_B', 'B端密码有效期天数', 160, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755278', 'SNOWY_SYS_DEFAULT_PASSWORD_EXPIRED_NOTICE_DAYS_FOR_B', '3', 'PASSWORD_STRATEGY_FOR_B', 'B端密码过期前提醒天数', 161, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755279', 'SNOWY_SYS_DEFAULT_PASSWORD_FOR_C', 'Snowy@2026!', 'PASSWORD_STRATEGY_FOR_C', 'C端密码默认密码', 162, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755280', 'SNOWY_SYS_DEFAULT_PASSWORD_UPDATE_VALID_TYPE_FOR_C', 'OLD', 'PASSWORD_STRATEGY_FOR_C', 'C端密码修改验证方式', 163, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755281', 'SNOWY_SYS_DEFAULT_PASSWORD_MIN_LENGTH_FOR_C', '6', 'PASSWORD_STRATEGY_FOR_C', 'C端密码最小长度', 164, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755282', 'SNOWY_SYS_DEFAULT_PASSWORD_MAX_LENGTH_FOR_C', '20', 'PASSWORD_STRATEGY_FOR_C', 'C端密码最大长度', 165, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755283', 'SNOWY_SYS_DEFAULT_PASSWORD_COMPLEXITY_FOR_C', 'REG0', 'PASSWORD_STRATEGY_FOR_C', 'C端密码复杂度', 166, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755284', 'SNOWY_SYS_DEFAULT_PASSWORD_NOT_ALLOW_CONTINUOUS_SAME_CHARACTER_LENGTH_FOR_C', '3', 'PASSWORD_STRATEGY_FOR_C', 'C端密码不能连续存在相同字符个数', 167, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755285', 'SNOWY_SYS_DEFAULT_PASSWORD_NOT_ALLOW_CONTAINS_USER_INFO_FLAG_FOR_C', 'true', 'PASSWORD_STRATEGY_FOR_C', 'C端密码不能包含用户信息开关', 168, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755286', 'SNOWY_SYS_DEFAULT_PASSWORD_NOT_ALLOW_USE_HISTORY_FLAG_FOR_C', 'true', 'PASSWORD_STRATEGY_FOR_C', 'C端密码不能使用历史密码开关', 169, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755287', 'SNOWY_SYS_DEFAULT_PASSWORD_NOT_ALLOW_USE_HISTORY_COUNT_FOR_C', '3', 'PASSWORD_STRATEGY_FOR_C', 'C端密码不能使用历史密码范围个数', 170, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755288', 'SNOWY_SYS_DEFAULT_PASSWORD_NOT_ALLOW_USE_WEAK_FLAG_FOR_C', 'true', 'PASSWORD_STRATEGY_FOR_C', 'C端密码不能使用弱密码库中密码开关', 171, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755289', 'SNOWY_SYS_DEFAULT_PASSWORD_DEFINE_WEAK_DATABASE_FOR_C', 'xiaonuo,xiaonuoark', 'PASSWORD_STRATEGY_FOR_C', 'C端密码自定义额外弱密码库', 172, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755290', 'SNOWY_SYS_DEFAULT_PASSWORD_EXPIRED_DAYS_FOR_C', '30', 'PASSWORD_STRATEGY_FOR_C', 'C端密码有效期天数', 173, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755291', 'SNOWY_SYS_DEFAULT_PASSWORD_EXPIRED_NOTICE_DAYS_FOR_C', '3', 'PASSWORD_STRATEGY_FOR_C', 'C端密码过期前提醒天数', 174, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755292', 'SNOWY_SYS_DEFAULT_ALLOW_OTP_LOGIN_FLAG_FOR_B', 'true', 'LOGIN_STRATEGY_FOR_B', 'B端是否允许动态口令登录', 175, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755293', 'SNOWY_SYS_DEFAULT_ALLOW_OTP_LOGIN_FLAG_FOR_C', 'true', 'LOGIN_STRATEGY_FOR_C', 'C端是否允许动态口令登录', 176, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755294', 'SNOWY_THIRD_IAM_AUTHORIZE_URL', 'IAM认证地址', 'THIRD_IAM', 'IAM认证地址', 177, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755295', 'SNOWY_THIRD_IAM_ACCESS_TOKEN_URL', 'IAM获取token地址', 'THIRD_IAM', 'IAM获取token地址', 178, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755296', 'SNOWY_THIRD_IAM_USER_INFO_URL', 'IAM获取用户信息地址', 'THIRD_IAM', 'IAM获取用户信息地址', 179, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755297', 'SNOWY_THIRD_IAM_CLIENT_ID', 'IAM客户端ID', 'THIRD_IAM', 'IAM客户端ID', 180, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755298', 'SNOWY_THIRD_IAM_CLIENT_SECRET', 'IAM客户端SECRET', 'THIRD_IAM', 'IAM客户端SECRET', 181, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755299', 'SNOWY_THIRD_IAM_REDIRECT_URL', '重定向URL', 'THIRD_IAM', '重定向URL', 182, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755300', 'SNOWY_THIRD_IAM_ALLOW_LOGIN_FLAG', 'false', 'THIRD_IAM', '是否允许IAM登录', 183, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755311', 'SNOWY_FILE_RUSTFS_ACCESS_KEY', 'RUSTFS文件AccesKey', 'FILE_RUSTFS', 'RUSTFS文件AccesKey', 184, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755312', 'SNOWY_FILE_RUSTFS_SECRET_KEY', 'RUSTFS文件SecetKey', 'FILE_RUSTFS', 'RUSTFS文件SecetKey', 185, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755313', 'SNOWY_FILE_RUSTFS_END_POINT', 'RUSTFS文件EndPoint', 'FILE_RUSTFS', 'RUSTFS文件EndPoint', 186, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755314', 'SNOWY_FILE_RUSTFS_DEFAULT_BUCKET_NAME', 'defaultbucket', 'FILE_RUSTFS', 'RUSTFS文件默认存储桶', 187, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755315', 'SNOWY_FILE_RUSTFS_REGION', 'us-east-1', 'FILE_RUSTFS', 'RUSTFS文件区域', 188, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755316', 'SNOWY_THIRD_OAUTH_ALLOW_LOGIN_FLAG', 'false', 'THIRD_OAUTH', '是否允许OAUTH登录', 189, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755317', 'SNOWY_THIRD_OAUTH_AUTHORIZE_URL', 'OAUTH认证地址', 'THIRD_OAUTH', 'OAUTH认证地址', 190, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755318', 'SNOWY_THIRD_OAUTH_ACCESS_TOKEN_URL', 'OAUTH获取token地址', 'THIRD_OAUTH', 'OAUTH获取token地址', 191, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755319', 'SNOWY_THIRD_OAUTH_USER_INFO_URL', 'OAUTH获取用户信息地址', 'THIRD_OAUTH', 'OAUTH获取用户信息地址', 192, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755320', 'SNOWY_THIRD_OAUTH_SCOPE', 'OAUTH范围', 'THIRD_OAUTH', 'OAUTH范围', 193, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755321', 'SNOWY_THIRD_OAUTH_CLIENT_ID', 'OAUTH客户端ID', 'THIRD_OAUTH', 'OAUTH客户端ID', 194, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755322', 'SNOWY_THIRD_OAUTH_CLIENT_SECRET', 'OAUTH客户端SECRET', 'THIRD_OAUTH', 'OAUTH客户端SECRET', 195, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755323', 'SNOWY_THIRD_OAUTH_REDIRECT_URL', '重定向URL', 'THIRD_OAUTH', '重定向URL', 196, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755324', 'SNOWY_THIRD_OAUTH_SOURCE_PROPERTY', 'OAUTH源属性', 'THIRD_OAUTH', 'OAUTH源属性', 197, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755325', 'SNOWY_THIRD_OAUTH_TARGET_PROPERTY', 'OAUTH目标属性', 'THIRD_OAUTH', 'OAUTH目标属性', 198, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755326', 'SNOWY_THIRD_OIDC_ALLOW_LOGIN_FLAG', 'false', 'THIRD_OIDC', '是否允许OIDC登录', 199, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755327', 'SNOWY_THIRD_OIDC_AUTHORIZE_URL', 'OIDC认证地址', 'THIRD_OIDC', 'OIDC认证地址', 200, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755328', 'SNOWY_THIRD_OIDC_ACCESS_TOKEN_URL', 'OIDC获取token地址', 'THIRD_OIDC', 'OIDC获取token地址', 201, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755329', 'SNOWY_THIRD_OIDC_USER_INFO_URL', 'OIDC获取用户信息地址', 'THIRD_OIDC', 'OIDC获取用户信息地址', 202, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755330', 'SNOWY_THIRD_OIDC_SCOPE', 'OIDC范围', 'THIRD_OIDC', 'OIDC范围', 203, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755331', 'SNOWY_THIRD_OIDC_PUBLIC_KEY', 'OIDC公钥', 'THIRD_OIDC', 'OIDC公钥', 204, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755332', 'SNOWY_THIRD_OIDC_ALGORITHM', 'OIDC算法', 'THIRD_OIDC', 'OIDC算法', 205, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755333', 'SNOWY_THIRD_OIDC_CLIENT_ID', 'OIDC客户端ID', 'THIRD_OIDC', 'OIDC客户端ID', 206, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755334', 'SNOWY_THIRD_OIDC_CLIENT_SECRET', 'OIDC客户端SECRET', 'THIRD_OIDC', 'OIDC客户端SECRET', 207, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755335', 'SNOWY_THIRD_OIDC_REDIRECT_URL', '重定向URL', 'THIRD_OIDC', '重定向URL', 208, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755336', 'SNOWY_THIRD_OIDC_SOURCE_PROPERTY', 'OIDC源属性', 'THIRD_OIDC', 'OIDC源属性', 209, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755337', 'SNOWY_THIRD_OIDC_TARGET_PROPERTY', 'OIDC目标属性', 'THIRD_OIDC', 'OIDC目标属性', 210, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755338', 'SNOWY_THIRD_JWT_ALLOW_LOGIN_FLAG', 'false', 'THIRD_JWT', '是否允许JWT登录', 211, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755339', 'SNOWY_THIRD_JWT_AUTHORIZE_URL', 'JWT认证地址', 'THIRD_JWT', 'JWT认证地址', 212, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755340', 'SNOWY_THIRD_JWT_PUBLIC_KEY', 'JWT公钥', 'THIRD_JWT', 'JWT公钥', 213, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755341', 'SNOWY_THIRD_JWT_ALGORITHM', 'JWT算法', 'THIRD_JWT', 'JWT算法', 214, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755342', 'SNOWY_THIRD_JWT_CLIENT_ID', 'JWT客户端ID', 'THIRD_JWT', 'JWT客户端ID', 215, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755343', 'SNOWY_THIRD_JWT_CLIENT_SECRET', 'JWT客户端SECRET', 'THIRD_JWT', 'JWT客户端SECRET', 216, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755344', 'SNOWY_THIRD_JWT_REDIRECT_URL', '重定向URL', 'THIRD_JWT', '重定向URL', 217, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755345', 'SNOWY_THIRD_JWT_SOURCE_PROPERTY', 'JWT源属性', 'THIRD_JWT', 'JWT源属性', 218, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755346', 'SNOWY_THIRD_JWT_TARGET_PROPERTY', 'JWT目标属性', 'THIRD_JWT', 'JWT目标属性', 219, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755347', 'SNOWY_THIRD_CAS_ALLOW_LOGIN_FLAG', 'false', 'THIRD_CAS', '是否允许CAS登录', 220, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755348', 'SNOWY_THIRD_CAS_SERVER_LOGIN_URL', 'CAS服务端登录地址', 'THIRD_CAS', 'CAS服务端登录地址', 221, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755349', 'SNOWY_THIRD_CAS_SERVER_VALIDATE_URL', 'CAS服务端验证地址', 'THIRD_CAS', 'CAS服务端验证地址', 222, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755350', 'SNOWY_THIRD_CAS_SERVER_PROTOCOL_VERSION', 'CAS服务端协议版本', 'THIRD_CAS', 'CAS服务端协议版本', 223, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755351', 'SNOWY_THIRD_CAS_SERVICE_URL', 'CAS服务地址', 'THIRD_CAS', 'CAS服务地址', 224, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755352', 'SNOWY_THIRD_CAS_SOURCE_PROPERTY', 'CAS源属性', 'THIRD_CAS', 'CAS源属性', 225, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755353', 'SNOWY_THIRD_CAS_TARGET_PROPERTY', 'CAS目标属性', 'THIRD_CAS', 'CAS目标属性', 226, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755354', 'SNOWY_THIRD_SAML_ALLOW_LOGIN_FLAG', 'false', 'THIRD_SAML', '是否允许SAML登录', 227, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755355', 'SNOWY_THIRD_SAML_SP_META_DATA', 'SAMLSP元数据', 'THIRD_SAML', 'SAMLSP元数据', 228, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755356', 'SNOWY_THIRD_SAML_CERTIFICATE', 'SAML证书', 'THIRD_SAML', 'SAML证书', 229, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755357', 'SNOWY_THIRD_SAML_PRIVATE_KEY', 'SAML私钥', 'THIRD_SAML', 'SAML私钥', 230, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755358', 'SNOWY_THIRD_SAML_PUBLIC_KEY', 'SAML公钥', 'THIRD_SAML', 'SAML公钥', 231, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755359', 'SNOWY_THIRD_SAML_SP_ENTITY_ID', 'SAMLSP实体ID', 'THIRD_SAML', 'SAMLSP实体ID', 232, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755360', 'SNOWY_THIRD_SAML_SP_ACL_URL', 'SAMLSP ACL地址', 'THIRD_SAML', 'SAMLSP ACL地址', 233, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755361', 'SNOWY_THIRD_SAML_IDP_META_DATA', 'SAMLIDP元数据', 'THIRD_SAML', 'SAMLIDP元数据', 234, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755362', 'SNOWY_THIRD_SAML_BINDING_TYPE', 'SAML绑定类型', 'THIRD_SAML', 'SAML绑定类型', 235, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755363', 'SNOWY_THIRD_SAML_SOURCE_PROPERTY', 'SAML源属性', 'THIRD_SAML', 'SAML源属性', 236, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755364', 'SNOWY_THIRD_SAML_TARGET_PROPERTY', 'SAML目标属性', 'THIRD_SAML', 'SAML目标属性', 237, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755365', 'SNOWY_THIRD_DINGTALK_ALLOW_LOGIN_FLAG', 'false', 'THIRD_DINGTALK', '是否允许DINGTALK登录', 238, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755366', 'SNOWY_THIRD_DINGTALK_CLIENT_ID', 'DINGTALK客户端ID', 'THIRD_DINGTALK', 'DINGTALK客户端ID', 239, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755367', 'SNOWY_THIRD_DINGTALK_CLIENT_SECRET', 'DINGTALK客户端SECRET', 'THIRD_DINGTALK', 'DINGTALK客户端SECRET', 240, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755368', 'SNOWY_THIRD_DINGTALK_REDIRECT_URL', '重定向URL', 'THIRD_DINGTALK', '重定向URL', 241, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755369', 'SNOWY_THIRD_WORKWECHAT_ALLOW_LOGIN_FLAG', 'false', 'THIRD_WORKWECHAT', '是否允许WORKWECHAT登录', 242, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755370', 'SNOWY_THIRD_WORKWECHAT_AGENT_ID', 'WORKWECHAT代理ID', 'THIRD_WORKWECHAT', 'WORKWECHAT代理ID', 243, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755371', 'SNOWY_THIRD_WORKWECHAT_CLIENT_ID', 'WORKWECHAT客户端ID', 'THIRD_WORKWECHAT', 'WORKWECHAT客户端ID', 244, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755372', 'SNOWY_THIRD_WORKWECHAT_CLIENT_SECRET', 'WORKWECHAT客户端SECRET', 'THIRD_WORKWECHAT', 'WORKWECHAT客户端SECRET', 245, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755373', 'SNOWY_THIRD_WORKWECHAT_REDIRECT_URL', '重定向URL', 'THIRD_WORKWECHAT', '重定向URL', 246, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755374', 'SNOWY_THIRD_FEISHU_ALLOW_LOGIN_FLAG', 'false', 'THIRD_FEISHU', '是否允许FEISHU登录', 247, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755375', 'SNOWY_THIRD_FEISHU_CLIENT_ID', 'FEISHU客户端ID', 'THIRD_FEISHU', 'FEISHU客户端ID', 248, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755376', 'SNOWY_THIRD_FEISHU_CLIENT_SECRET', 'FEISHU客户端SECRET', 'THIRD_FEISHU', 'FEISHU客户端SECRET', 249, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755377', 'SNOWY_THIRD_FEISHU_REDIRECT_URL', '重定向URL', 'THIRD_FEISHU', '重定向URL', 250, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755378', 'SNOWY_THIRD_WELINK_ALLOW_LOGIN_FLAG', 'false', 'THIRD_WELINK', '是否允许WELINK登录', 251, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755379', 'SNOWY_THIRD_WELINK_CLIENT_ID', 'WELINK客户端ID', 'THIRD_WELINK', 'WELINK客户端ID', 252, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755380', 'SNOWY_THIRD_WELINK_CLIENT_SECRET', 'WELINK客户端SECRET', 'THIRD_WELINK', 'WELINK客户端SECRET', 253, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755381', 'SNOWY_THIRD_WELINK_REDIRECT_URL', '重定向URL', 'THIRD_WELINK', '重定向URL', 254, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755382', 'SNOWY_THIRD_YUNZHIJIA_ALLOW_LOGIN_FLAG', 'false', 'THIRD_YUNZHIJIA', '是否允许YUNZHIJIA登录', 255, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755383', 'SNOWY_THIRD_YUNZHIJIA_CLIENT_ID', 'YUNZHIJIA客户端ID', 'THIRD_YUNZHIJIA', 'YUNZHIJIA客户端ID', 256, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755384', 'SNOWY_THIRD_YUNZHIJIA_CLIENT_SECRET', 'YUNZHIJIA客户端SECRET', 'THIRD_YUNZHIJIA', 'YUNZHIJIA客户端SECRET', 257, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755385', 'SNOWY_THIRD_YUNZHIJIA_REDIRECT_URL', '重定向URL', 'THIRD_YUNZHIJIA', '重定向URL', 258, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755386', 'SNOWY_THIRD_QQ_ALLOW_LOGIN_FLAG', 'true', 'THIRD_QQ', '是否允许QQ登录', 259, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755387', 'SNOWY_THIRD_QQ_CLIENT_ID', 'QQ客户端ID', 'THIRD_QQ', 'QQ客户端ID', 260, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755388', 'SNOWY_THIRD_QQ_CLIENT_SECRET', 'QQ客户端SECRET', 'THIRD_QQ', 'QQ客户端SECRET', 261, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755389', 'SNOWY_THIRD_QQ_REDIRECT_URL', '重定向URL', 'THIRD_QQ', '重定向URL', 262, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755390', 'SNOWY_THIRD_WEIBO_ALLOW_LOGIN_FLAG', 'false', 'THIRD_WEIBO', '是否允许WEIBO登录', 263, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755391', 'SNOWY_THIRD_WEIBO_CLIENT_ID', 'WEIBO客户端ID', 'THIRD_WEIBO', 'WEIBO客户端ID', 264, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755392', 'SNOWY_THIRD_WEIBO_CLIENT_SECRET', 'WEIBO客户端SECRET', 'THIRD_WEIBO', 'WEIBO客户端SECRET', 265, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755393', 'SNOWY_THIRD_WEIBO_REDIRECT_URL', '重定向URL', 'THIRD_WEIBO', '重定向URL', 266, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755394', 'SNOWY_THIRD_DOUYIN_ALLOW_LOGIN_FLAG', 'false', 'THIRD_DOUYIN', '是否允许DOUYIN登录', 267, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755395', 'SNOWY_THIRD_DOUYIN_CLIENT_ID', 'DOUYIN客户端ID', 'THIRD_DOUYIN', 'DOUYIN客户端ID', 268, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755396', 'SNOWY_THIRD_DOUYIN_CLIENT_SECRET', 'DOUYIN客户端SECRET', 'THIRD_DOUYIN', 'DOUYIN客户端SECRET', 269, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755397', 'SNOWY_THIRD_DOUYIN_REDIRECT_URL', '重定向URL', 'THIRD_DOUYIN', '重定向URL', 270, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755398', 'SNOWY_THIRD_ALIPAY_ALLOW_LOGIN_FLAG', 'false', 'THIRD_ALIPAY', '是否允许ALIPAY登录', 271, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755399', 'SNOWY_THIRD_ALIPAY_CLIENT_ID', 'ALIPAY客户端ID', 'THIRD_ALIPAY', 'ALIPAY客户端ID', 272, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755400', 'SNOWY_THIRD_ALIPAY_CLIENT_SECRET', 'ALIPAY客户端SECRET', 'THIRD_ALIPAY', 'ALIPAY客户端SECRET', 273, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755401', 'SNOWY_THIRD_ALIPAY_PUBLIC_KEY', 'ALIPAY公钥', 'THIRD_ALIPAY', 'ALIPAY公钥', 274, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755402', 'SNOWY_THIRD_ALIPAY_REDIRECT_URL', '重定向URL', 'THIRD_ALIPAY', '重定向URL', 275, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755403', 'SNOWY_THIRD_WECHAT_MINI_ALLOW_LOGIN_FLAG', 'false', 'THIRD_WECHAT_MINI', '是否允许WECHAT_MINI登录', 276, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755404', 'SNOWY_THIRD_WECHAT_MINI_CLIENT_ID', 'WECHAT_MINI客户端ID', 'THIRD_WECHAT_MINI', 'WECHAT_MINI客户端ID', 277, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755405', 'SNOWY_THIRD_WECHAT_MINI_CLIENT_SECRET', 'WECHAT_MINI客户端SECRET', 'THIRD_WECHAT_MINI', 'WECHAT_MINI客户端SECRET', 278, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755406', 'SNOWY_FILE_FTP_HOST', 'FTP文件主机', 'FILE_FTP', 'FTP文件主机', 279, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755407', 'SNOWY_FILE_FTP_PORT', 'FTP文件端口', 'FILE_FTP', 'FTP文件端口', 280, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755408', 'SNOWY_FILE_FTP_USERNAME', 'FTP文件用户名', 'FILE_FTP', 'FTP文件用户名', 281, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755409', 'SNOWY_FILE_FTP_PASSWORD', 'FTP文件密码', 'FILE_FTP', 'FTP文件密码', 282, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755410', 'SNOWY_FILE_FTP_BASE_PATH', 'FTP文件基础目录', 'FILE_FTP', 'FTP文件基础目录', 283, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_config` VALUES ('1908870094824755411', 'SNOWY_FILE_FTP_DEFAULT_BUCKET_NAME', 'defaultbucket', 'FILE_FTP', 'FTP文件默认存储桶', 284, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);

-- ----------------------------
-- Table structure for dev_dict
-- ----------------------------
DROP TABLE IF EXISTS `dev_dict`;
CREATE TABLE `dev_dict`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `PARENT_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '父id',
  `DICT_LABEL` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '字典文字',
  `DICT_VALUE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '字典值',
  `DICT_COLOR` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '字典颜色',
  `CODE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '编码',
  `CATEGORY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序码',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '字典' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of dev_dict
-- ----------------------------
INSERT INTO `dev_dict` VALUES ('1543839774776291330', '0', '用户性别类型', 'GENDER', 'default', 'nx2UbxB6z6', 'FRM', 1, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1543839901037424642', '1543839774776291330', '男', '男', 'pink', 'WRrdMORE3c', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1543840033980084226', '1543839774776291330', '女', '女', 'red', '4MbEORlvBJ', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1543860103661809666', '0', '系统菜单类型', 'MENU_TYPE', 'default', 'pEnxBN7E2o', 'FRM', 2, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1543860239020388354', '1543860103661809666', '目录', 'CATALOG', 'pink', 'kMKSJSFZgt', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1543860305508495361', '1543860103661809666', '菜单', 'MENU', 'red', 'FOHDkzOjxa', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1543860423485878274', '1543860103661809666', '内链', 'IFRAME', 'orange', 'u6rH9LmTvz', 'FRM', 30, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1543860477512708098', '1543860103661809666', '外链', 'LINK', 'green', 'vOmYaKkhrK', 'FRM', 40, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1544329873407946753', '0', '系统通用状态', 'COMMON_STATUS', 'default', 'SpdguT1MTy', 'FRM', 3, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1545397556652027906', '1544329873407946753', '启用', 'ENABLE', 'pink', '4fPYJApbLH', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1545397556652027907', '1544329873407946753', '停用', 'DISABLED', 'red', 'DreeA3e26Y', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547207669861064706', '0', '系统角色分类', 'ROLE_CATEGORY', 'default', 'rMCKoVuOoF', 'FRM', 4, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547207891009937409', '1547207669861064706', '全局', 'GLOBAL', 'pink', 'gaLjy7wwCw', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547207990075203585', '1547207669861064706', '机构', 'ORG', 'red', 'f1B0Zt9PPM', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547227094995705858', '0', '系统机构分类', 'ORG_CATEGORY', 'default', '2ATB1ySwLN', 'FRM', 5, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547227670693289985', '1547227094995705858', '部门', 'DEPT', 'pink', 'XUUCvprRXw', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547228161267474434', '1547227094995705858', '公司', 'COMPANY', 'red', '6ntdgLkMOi', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547409689434742786', '0', '系统职位分类', 'POSITION_CATEGORY', 'default', 'hPvAP5dxiW', 'FRM', 6, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547409794837602305', '1547409689434742786', '高层', 'HIGH', 'pink', '7QQxWyMMB0', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547409844779180033', '1547409689434742786', '中层', 'MIDDLE', 'red', 'WneMc7T6IT', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547409906406088706', '1547409689434742786', '基层', 'LOW', 'orange', 'aQhuK5cZ1B', 'FRM', 30, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658113', '0', '用户民族类型', 'NATION', 'default', 'OfM9Yo627Z', 'FRM', 7, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658114', '1547641470701658113', '汉族', '汉族', 'pink', 'IldDHFWUJu', 'FRM', 1, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658115', '1547641470701658113', '壮族', '壮族', 'red', 'BcWVpbu1xR', 'FRM', 2, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658116', '1547641470701658113', '回族', '回族', 'orange', 'yjVUonNG7d', 'FRM', 3, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658117', '1547641470701658113', '满族', '满族', 'green', 'eJi56S3voF', 'FRM', 4, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658118', '1547641470701658113', '维吾尔族', '维吾尔族', 'cyan', 'EQaAIa8CM3', 'FRM', 5, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658119', '1547641470701658113', '苗族', '苗族', 'blue', 'jey27sIjJh', 'FRM', 6, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658120', '1547641470701658113', '彝族', '彝族', 'purple', 'NLeKPrUqmD', 'FRM', 7, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658121', '1547641470701658113', '土家族', '土家族', 'gold', 'jT8d1Ik5pg', 'FRM', 8, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658122', '1547641470701658113', '藏族', '藏族', 'geekblue', 'Hn7hhRzZkK', 'FRM', 9, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658123', '1547641470701658113', '蒙古族', '蒙古族', 'volcano', 'nXOl2haSmn', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658124', '1547641470701658113', '侗族', '侗族', 'magenta', 'sjtNWihEAP', 'FRM', 11, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658125', '1547641470701658113', '布依族', '布依族', 'processing', 'BUJNxSLxaG', 'FRM', 12, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658126', '1547641470701658113', '瑶族', '瑶族', 'success', 'XO7sLv3shh', 'FRM', 13, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658127', '1547641470701658113', '白族', '白族', 'error', 'kLKZ70OwP1', 'FRM', 14, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658128', '1547641470701658113', '朝鲜族', '朝鲜族', 'warning', 'nMRLtjAPfu', 'FRM', 15, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658129', '1547641470701658113', '哈尼族', '哈尼族', 'pink', 'rAD1IjUe8L', 'FRM', 16, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658130', '1547641470701658113', '黎族', '黎族', 'red', 'pgrMlPbuhg', 'FRM', 17, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658131', '1547641470701658113', '哈萨克族', '哈萨克族', 'orange', 'ZCMR77KXLM', 'FRM', 18, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658132', '1547641470701658113', '傣族', '傣族', 'green', 'w7FEqD6b9b', 'FRM', 19, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658133', '1547641470701658113', '畲族', '畲族', 'cyan', 'II3pYCP3gy', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658134', '1547641470701658113', '傈僳族', '傈僳族', 'blue', 'P4cZRdzfkD', 'FRM', 21, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658135', '1547641470701658113', '东乡族', '东乡族', 'purple', 'LsDVhLz5aK', 'FRM', 22, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658136', '1547641470701658113', '仡佬族', '仡佬族', 'gold', 'cRW15z07Wf', 'FRM', 23, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658137', '1547641470701658113', '拉祜族', '拉祜族', 'geekblue', 'Rxxpkdtuyi', 'FRM', 24, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658138', '1547641470701658113', '佤族', '佤族', 'volcano', 'BTFWGDBADw', 'FRM', 25, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658139', '1547641470701658113', '水族', '水族', 'magenta', 'rrXze6vNX9', 'FRM', 26, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658140', '1547641470701658113', '纳西族', '纳西族', 'processing', 'E78hSFKAko', 'FRM', 27, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658141', '1547641470701658113', '羌族', '羌族', 'success', 'VoNs4A5D5o', 'FRM', 28, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658142', '1547641470701658113', '土族', '土族', 'error', 'UxDL9BKnUm', 'FRM', 29, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658143', '1547641470701658113', '仫佬族', '仫佬族', 'warning', 'Qn03GasUeA', 'FRM', 30, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658144', '1547641470701658113', '锡伯族', '锡伯族', 'pink', 'yf4RZRyGzK', 'FRM', 31, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658145', '1547641470701658113', '柯尔克孜族', '柯尔克孜族', 'red', 'mCACEtEHGz', 'FRM', 32, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658146', '1547641470701658113', '景颇族', '景颇族', 'orange', 'XVGhmOIr1v', 'FRM', 33, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658147', '1547641470701658113', '达斡尔族', '达斡尔族', 'green', 'pB7plgu56s', 'FRM', 34, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658148', '1547641470701658113', '撒拉族', '撒拉族', 'cyan', '6z5gsbJYwa', 'FRM', 35, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658149', '1547641470701658113', '布朗族', '布朗族', 'blue', 'qFV4FirD9p', 'FRM', 36, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658150', '1547641470701658113', '毛南族', '毛南族', 'purple', 'rsNRdCZSMn', 'FRM', 37, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658151', '1547641470701658113', '塔吉克族', '塔吉克族', 'gold', 'Snn1gGO0Mo', 'FRM', 38, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658152', '1547641470701658113', '普米族', '普米族', 'geekblue', 'OfJpLT9wnU', 'FRM', 39, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658153', '1547641470701658113', '阿昌族', '阿昌族', 'volcano', 'GB03mwF8Ou', 'FRM', 40, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658154', '1547641470701658113', '怒族', '怒族', 'magenta', 'kIUgNs9ESr', 'FRM', 41, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658155', '1547641470701658113', '鄂温克族', '鄂温克族', 'processing', 'TMlFI08Nyp', 'FRM', 42, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658156', '1547641470701658113', '京族', '京族', 'success', 'QNeQWqhYjB', 'FRM', 43, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658157', '1547641470701658113', '基诺族', '基诺族', 'error', 'LW4sPUhztO', 'FRM', 44, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658158', '1547641470701658113', '德昂族', '德昂族', 'warning', 'au5pfugMm1', 'FRM', 45, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658159', '1547641470701658113', '保安族', '保安族', 'pink', 'xAkxr6cORb', 'FRM', 46, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658160', '1547641470701658113', '俄罗斯族', '俄罗斯族', 'red', 'XVDaOjSCRC', 'FRM', 47, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658161', '1547641470701658113', '裕固族', '裕固族', 'orange', 'aDgjM4JVJ4', 'FRM', 48, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658162', '1547641470701658113', '乌孜别克族', '乌孜别克族', 'green', 'IPtwpYl2GX', 'FRM', 49, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658163', '1547641470701658113', '门巴族', '门巴族', 'cyan', 'lP5Vim88tt', 'FRM', 50, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658164', '1547641470701658113', '鄂伦春族', '鄂伦春族', 'blue', 'NQYDgg0vzB', 'FRM', 51, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658165', '1547641470701658113', '独龙族', '独龙族', 'purple', 'a37PtONVYo', 'FRM', 52, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658166', '1547641470701658113', '赫哲族', '赫哲族', 'gold', 'JJ97lOiA4D', 'FRM', 53, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658167', '1547641470701658113', '高山族', '高山族', 'geekblue', 'zc52WRi5ro', 'FRM', 54, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658168', '1547641470701658113', '珞巴族', '珞巴族', 'volcano', 'v4ZkItC09c', 'FRM', 55, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1547641470701658169', '1547641470701658113', '塔塔尔族 ', '塔塔尔族', 'magenta', 'c4AMDTdh2c', 'FRM', 56, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1549019269252104194', '0', '登录设备类型', 'AUTH_DEVICE_TYPE', 'default', '29o4YioH2v', 'FRM', 8, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1549019748883349506', '1549019269252104194', 'PC端', 'PC', 'pink', 'kf2lvOCEcJ', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1549019813924421634', '1549019269252104194', '移动端', 'APP', 'red', 'QGygBhRmjE', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1549019864537088002', '1549019269252104194', '小程序', 'MINI', 'orange', 'uTYA8duLr3', 'FRM', 30, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1554678566166323202', '0', '系统字典分类', 'DICT_CATEGORY', 'default', 'f4vCzVKlh5', 'FRM', 9, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1554678761742524417', '1554678566166323202', '框架', 'FRM', 'pink', 'ydzbkvUTj4', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1554678863617974273', '1554678566166323202', '业务', 'BIZ', 'red', 'xI3z1fXU5z', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1554679788378120194', '0', '短信发送引擎', 'SMS_ENGINE', 'default', 'kPEEms6spU', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1554679872054484993', '1554679788378120194', '阿里云', 'ALIYUN', 'pink', 'GGSVo47jJ0', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1554679958398427138', '1554679788378120194', '腾讯云', 'TENCENT', 'red', 'jQ4boYgQCK', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1554726376265744386', '0', '文件上传引擎', 'FILE_ENGINE', 'default', 'Vo3kYSoWu4', 'FRM', 11, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1554726639571566593', '1554726376265744386', '本地', 'LOCAL', 'pink', 'qw9Tr2Dzox', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1554726696068841474', '1554726376265744386', '阿里云', 'ALIYUN', 'red', 'DdvFFdIFJA', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1554726762338844674', '1554726376265744386', '腾讯云', 'TENCENT', 'orange', 'Ikys8NAfP4', 'FRM', 30, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1554726830844411905', '1554726376265744386', 'MINIO', 'MINIO', 'green', 'KXhgDXlijP', 'FRM', 40, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1554726830844411906', '1554726376265744386', 'RUSTFS', 'RUSTFS', 'cyan', 'Fxc19cpKca', 'FRM', 50, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1554726830844411907', '1554726376265744386', 'FTP', 'FTP', 'blue', 'kWZ86DPP4n', 'FRM', 60, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556317797993218049', '0', '邮件发送引擎', 'EMAIL_ENGINE', 'default', 'NfnLwwpxlj', 'FRM', 12, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319651447767041', '1556317797993218049', '本地', 'LOCAL', 'pink', '61rvXPdT9X', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319726962016258', '1556317797993218049', '阿里云', 'ALIYUN', 'red', 'DfXhM5Gwau', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319786349166593', '1556317797993218049', '腾讯云', 'TENCENT', 'orange', 'NRjywm25dm', 'FRM', 30, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319786349166594', '0', '消息推送引擎', 'PUSH_ENGINE', 'default', 'qRPg7zAJdP', 'FRM', 13, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319786349166595', '1556319786349166594', '钉钉', 'DINGTALK', 'pink', 'KDLmGWwMkJ', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319786349166596', '1556319786349166594', '飞书', 'FEISHU', 'red', 'Vewyfq4W15', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319786349166597', '1556319786349166594', '企业微信', 'WORKWECHAT', 'orange', 'JMkb4b45Xd', 'FRM', 30, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319786349166598', '0', '改密验证方式', 'UPDATE_PASSWORD_VALID_TYPE', 'default', '9Mqw6ShkbD', 'FRM', 13, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319786349166599', '1556319786349166598', '旧密码', 'OLD', 'pink', 'pObj0Dl4Xe', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319786349166600', '1556319786349166598', '手机号', 'PHONE', 'red', 'WfOLuw9YmO', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319786349166601', '1556319786349166598', '邮箱', 'EMAIL', 'orange', 'nsGz3lTCqX', 'FRM', 30, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319786349166602', '0', '密码复杂策略', 'PASSWORD_COMPLEXITY_TYPE', 'default', 'dCk4dqC6IY', 'FRM', 13, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319786349166603', '1556319786349166602', '无限制', 'REG0', 'pink', '7SWkXJllso', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319786349166604', '1556319786349166602', '必须包含数字和字母', 'REG1', 'red', 'MZm9NDOMlf', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319786349166605', '1556319786349166602', '必须包含数字和大写字母', 'REG2', 'orange', 'RnOoCgVDv6', 'FRM', 30, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319786349166606', '1556319786349166602', '必须包含数字、大写字母、小写字母和特殊字符', 'REG3', 'green', 'q8abKxE74G', 'FRM', 40, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319786349166607', '1556319786349166602', '至少包含数字、字母和特殊字符中的两种', 'REG4', 'cyan', 'SW7iBXX4oY', 'FRM', 50, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319786349166608', '1556319786349166602', '至少包含数字、大写字母、小写字母和特殊字符的三种', 'default', 'blue', 'Fztg672Cva', 'FRM', 60, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319786349166609', '0', '无用户时策略', 'NO_USER_STRATEGY', 'default', '49p2f52gYw', 'FRM', 13, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319786349166610', '1556319786349166609', '不允许登录', 'NOT_ALLOW_LOGIN', 'pink', '5G50YsKslb', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1556319786349166611', '1556319786349166609', '自动创建用户', 'AUTO_CREATE_USER', 'red', '7uCMN8LbRL', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1559942543251079169', '0', '系统通用开关', 'COMMON_SWITCH', 'default', 'MFJCVVdJgk', 'FRM', 13, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1559942706694717442', '1559942543251079169', '开', 'true', 'pink', 'kNPE0kSKBO', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1559942777674924034', '1559942543251079169', '关', 'false', 'red', 'NNzkxA5SNS', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1560306347516461058', '0', '用户证件类型', 'IDCARD_TYPE', 'default', '2J7klwyzPJ', 'FRM', 14, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1560306502135283714', '1560306347516461058', '身份证', '身份证', 'pink', 'REJIJwygYr', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1560306768913989633', '1560306347516461058', '出生证', '出生证', 'red', 'eXyBSq6xwR', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1560307009365049346', '1560306347516461058', '军官证', '军官证', 'orange', 'L4pbqvDHsG', 'FRM', 30, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1560307180937248769', '1560306347516461058', '护照', '护照', 'green', 's8RAk6LIO3', 'FRM', 40, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1560309358598914050', '0', '通用文化程度', 'CULTURE_LEVEL', 'default', 'pwP5ee8waN', 'FRM', 15, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1560309494892822530', '1560309358598914050', '小学', '小学', 'pink', 'oE5AicWtWP', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1560309602136981505', '1560309358598914050', '中学', '中学', 'red', 'DPuwboHfx2', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1560309700136894465', '1560309358598914050', '高中', '高中', 'orange', 'u8M3iyacaz', 'FRM', 30, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1560309744118366209', '1560309358598914050', '中专', '中专', 'green', 'CswfpaCuEy', 'FRM', 40, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1560309783037313026', '1560309358598914050', '大专', '大专', 'cyan', 'hrJGWys2Wj', 'FRM', 50, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1560309816423972866', '1560309358598914050', '本科', '本科', 'blue', 'LkR8xvh9tY', 'FRM', 60, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1560309855661686785', '1560309358598914050', '硕士研究生', '硕士研究生', 'purple', '75Vt847ADj', 'FRM', 70, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1560310085471797250', '1560309358598914050', '博士研究生', '博士研究生', 'gold', 'dgOJaPhHzh', 'FRM', 80, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1560338934867791874', '0', '定时任务分类', 'JOB_CATEGORY', 'default', 'Hodol7eYnE', 'FRM', 16, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1560339092900777985', '1560338934867791874', '框架', 'FRM', 'pink', 'AIBvupunuc', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1560339156134105089', '1560338934867791874', '业务', 'BIZ', 'red', 'L0kgu7bNYN', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1560342111344234497', '0', '定时任务状态', 'JOB_STATUS', 'default', 'jlfpcMEVVK', 'FRM', 17, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1560342186812346370', '1560342111344234497', '运行', 'RUNNING', 'pink', 'DHhBaibuBk', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1560342250096005121', '1560342111344234497', '停止', 'STOPPED', 'red', 'O6KfK7Cobx', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1561595062998102017', '0', '三方用户分类', 'THIRD_CATEGORY', 'default', 'OqMe62ViBY', 'FRM', 18, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1561595252714860545', '1561595062998102017', 'OAUTH', 'OAUTH', 'pink', 'lZq8s2ehA5', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1561595252714860546', '1561595062998102017', 'OIDC', 'OIDC', 'red', 'pGhKCHQ7hF', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1561595252714860547', '1561595062998102017', 'JWT', 'JWT', 'orange', 'KDLmGWwMkJ', 'FRM', 30, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1561595252714860548', '1561595062998102017', 'CAS', 'CAS', 'green', 'JMkb4b45Xd', 'FRM', 40, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1561595252714860549', '1561595062998102017', 'SAML', 'SAML', 'cyan', 'Vewyfq4W15', 'FRM', 50, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1561595252714860550', '1561595062998102017', 'IAM', 'IAM', 'blue', 'NqMe62ViBY', 'FRM', 60, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1561595252714860551', '1561595062998102017', '钉钉', 'DINGTALK', 'purple', 'PqMe62ViBY', 'FRM', 70, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1561595252714860552', '1561595062998102017', '企业微信', 'WORKWECHAT', 'gold', 'QqMe62ViBY', 'FRM', 80, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1561595252714860553', '1561595062998102017', '飞书', 'FEISHU', 'pink', 'RqMe62ViBY', 'FRM', 90, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1561595252714860554', '1561595062998102017', 'WeLink', 'WELINK', 'red', 'SqMe62ViBY', 'FRM', 100, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1561595252714860555', '1561595062998102017', '云之家', 'YUNZHIJIA', 'orange', 'TqMe62ViBY', 'FRM', 110, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1561595252714860556', '1561595062998102017', 'QQ', 'QQ', 'green', 'UqMe62ViBY', 'FRM', 120, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1561595252714860557', '1561595062998102017', '微信', 'WECHAT', 'cyan', 'VqMe62ViBY', 'FRM', 130, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1561595252714860558', '1561595062998102017', '微信小程序', 'WECHAT_MINI', 'blue', 'WqMe62ViBY', 'FRM', 140, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1561595252714860559', '1561595062998102017', '微博', 'WEIBO', 'purple', 'XqMe62ViBY', 'FRM', 150, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1561595252714860560', '1561595062998102017', '抖音', 'DOUYIN', 'gold', 'YqMe62ViBY', 'FRM', 160, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1561595252714860561', '1561595062998102017', '支付宝', 'ALIPAY', 'pink', 'ZqMe62ViBY', 'FRM', 170, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1567580351742619650', '0', '系统消息类型', 'MESSAGE_CATEGORY', 'default', 'UPIN4KJqvT', 'FRM', 19, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1567580424270524418', '1567580351742619650', '系统', 'SYS', 'pink', 'l7Mc5zE5ib', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1567580487684206594', '1567580351742619650', '业务', 'BIZ', 'red', 'nYhpV3ep7j', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1619343323218432002', '0', '移动菜单状态', 'MOBILE_STATUS', 'default', 'zhK8QL6NOu', 'FRM', 93, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1619343680636047362', '1619343323218432002', '可用', 'ENABLE', 'pink', 'pCdVlpHewf', 'FRM', 94, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1619343846382358529', '1619343323218432002', '不可用', 'DISABLED', 'red', 'K3FADjJN7G', 'FRM', 96, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1619344256295882753', '0', '移动菜单规则', 'MOBILE_REG_TYPE', 'default', '4Lz21CUUTV', 'FRM', 97, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1619344428111351809', '1619344256295882753', '正规则', 'YES', 'pink', 'Tb4OsxMVgN', 'FRM', 98, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1619344504456073218', '1619344256295882753', '反规则', 'NO', 'red', '0ibifiB9mB', 'FRM', 99, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811257769085767682', '0', '通知公告类型', 'BIZ_NOTICE_TYPE', 'default', 'iXHgzfK7W5', 'FRM', 128, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811258110468558849', '1811257769085767682', '通知', 'NOTICE', 'pink', 'rNtBUWLnag', 'FRM', 129, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811258351498432514', '1811257769085767682', '公告', 'ANNOUNCEMENT', 'red', '578Xq2zTkK', 'FRM', 130, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811258502975721474', '1811257769085767682', '警告', 'WARNING', 'orange', 'cVjlhwLiE0', 'FRM', 131, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811258687793532929', '0', '通知公告状态', 'BIZ_NOTICE_STATUS', 'default', '1OcT1FGyRU', 'FRM', 132, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811259114710765570', '1811258687793532929', '已关闭', 'DISABLE', 'pink', 'SB07WaNLrC', 'FRM', 133, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811259393917194242', '1811258687793532929', '正常', 'ENABLE', 'red', 'O27ZBLXOF5', 'FRM', 134, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811259821748785154', '0', '通知公告位置', 'BIZ_NOTICE_PLACE', 'default', '0gnQn6GnJs', 'FRM', 135, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811260041488371714', '1811259821748785154', '后台移动端首页', 'BACK_MOBILE', 'pink', 'g7E1fXh3l8', 'FRM', 136, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811260212410454018', '1811259821748785154', '后台业务首页', 'BACK_INDEX', 'red', 'GP4eqroglk', 'FRM', 137, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811260660487950338', '1811259821748785154', '用户移动端首页', 'CLIENT_MOBILE', 'orange', 'gnDATqoDpO', 'FRM', 138, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811285429576929282', '0', '轮播图位置', 'DEV_SLIDESHOW_PLACE', 'default', '1HQeP9ZwrY', 'FRM', 114, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811285517497929730', '1811285429576929282', '后台移动端首页', 'BACK_MOBILE', 'pink', 'Lcd7Oc3SMD', 'FRM', 115, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811285597999206402', '1811285429576929282', '后台业务首页', 'BACK_INDEX', 'red', 'J1utDwWvGZ', 'FRM', 116, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811285669692444674', '1811285429576929282', '用户移动端首页', 'CLIENT_MOBILE', 'orange', 'QOA6Gh75nr', 'FRM', 117, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811285778270392321', '1811285429576929282', '后台系统首页', 'BACK_SYS_INDEX', 'green', 'vdeOwzBXBr', 'FRM', 118, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811286076128890881', '0', '轮播图状态', 'DEV_SLIDESHOW_STATUS', 'default', 'T5lIZkVfTj', 'FRM', 119, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811286168449716226', '1811286076128890881', '启用', 'ENABLE', 'pink', 'MuZagpmxPv', 'FRM', 120, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811286273949044737', '1811286076128890881', '禁用', 'DISABLE', 'red', '5gpxaee739', 'FRM', 121, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811286542808125441', '0', '轮播图跳转', 'WHETHER_TO_CLICK', 'default', 'yBB2WcLn2V', 'FRM', 122, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811286611254972418', '1811286542808125441', '启用', 'ENABLE', 'pink', 'ac87rrN9WF', 'FRM', 123, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811286765760548866', '1811286542808125441', '禁用', 'DISABLE', 'red', 'la3FazhpXJ', 'FRM', 124, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811287001631428610', '0', '轮播图跳转方式', 'SKIP_MODE', 'default', 'PGtlHTRTEA', 'FRM', 125, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811287257836294146', '1811287001631428610', '跳转至URL', 'URL', 'pink', 'xmKzrPyyrM', 'FRM', 126, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1811287406557925378', '1811287001631428610', '跳转至路由', 'ROUTER', 'red', 'lrtd0Zt0Di', 'FRM', 127, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1820107582090997762', '0', '通用是否', 'COMMON_WHETHER', 'default', 'aC6dE9bEVu', 'FRM', 48, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1820107884676476930', '1820107582090997762', '是', 'YES', 'pink', 'ECNT9heOva', 'FRM', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('1820107960018759682', '1820107582090997762', '否', 'NO', 'red', 'FK92HBaphg', 'FRM', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('2043696227996917761', '0', '代码生成类型', 'GEN_TYPE', 'default', 'CX06aDhJTS', 'FRM', 140, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('2043696532872486913', '2043696227996917761', '单表格', 'TABLE', 'pink', 'zplaHX5DJm', 'FRM', 141, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('2043696597225693185', '2043696227996917761', '单树表', 'TREE', 'red', 'eMYPu4qadq', 'FRM', 142, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('2043696666209411073', '2043696227996917761', '左树右表', 'LEFT_TREE_TABLE', 'orange', 'BQx4S6kiAt', 'FRM', 142, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `dev_dict` VALUES ('2043696806701817858', '2043696227996917761', '主子表', 'MASTER_DETAIL', 'green', 'g4KTQkTiSh', 'FRM', 144, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);

-- ----------------------------
-- Table structure for dev_email
-- ----------------------------
DROP TABLE IF EXISTS `dev_email`;
CREATE TABLE `dev_email`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `ENGINE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '邮件引擎',
  `SEND_ACCOUNT` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '发件人邮箱',
  `SEND_USER` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '发件人昵称',
  `RECEIVE_ACCOUNTS` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '接收人',
  `SUBJECT` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '邮件主题',
  `CONTENT` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '邮件正文',
  `TAG_NAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标签名',
  `TEMPLATE_NAME` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '模板名',
  `TEMPLATE_PARAM` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '发送参数',
  `RECEIPT_INFO` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '回执信息',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '邮件' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of dev_email
-- ----------------------------

-- ----------------------------
-- Table structure for dev_file
-- ----------------------------
DROP TABLE IF EXISTS `dev_file`;
CREATE TABLE `dev_file`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `ENGINE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '存储引擎',
  `BUCKET` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '存储桶',
  `FILE_KEY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '文件KEY',
  `NAME` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '文件名称',
  `SUFFIX` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '文件后缀',
  `CATEGORY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '素材分类（IMAGE/VIDEO/AUDIO/DOC/OTHER）',
  `BIZ_TYPE` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'USER' COMMENT '库类型（USER 用户文件 / MATERIAL 素材库）',
  `SIZE_KB` bigint NULL DEFAULT NULL COMMENT '文件大小kb',
  `SIZE_INFO` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '文件大小（格式化后）',
  `OBJ_NAME` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '文件的对象名（唯一名称）',
  `STORAGE_PATH` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '文件存储路径',
  `DOWNLOAD_PATH` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '文件下载路径',
  `IS_DOWNLOAD_AUTH` tinyint(1) NULL DEFAULT NULL COMMENT '文件下载是否需要授权',
  `THUMBNAIL` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '图片缩略图',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '文件' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of dev_file
-- ----------------------------
INSERT INTO `dev_file` VALUES ('2123327540049047553', 'LOCAL', 'defaultBucketName', '2026/11/19/2123327540049047553.webp', '通用.webp', 'webp', 'IMAGE', 'USER', 82, '82.31 KB', '2123327540049047553.webp', 'D:\\defaultUploadFolder\\defaultBucketName\\2026\\11\\19\\2123327540049047553.webp', 'http://localhost:81/api/dev/file/download?id=2123327540049047553&sign=ZGZjMTA4NGYwNDFmYjEzNTM1MzgyZmU1MjlhOWRkNjI2MGY2YzcyNTMzNWRlYjNkOTM2YzNkOThiYTExNjI1Nw==', 0, NULL, NULL, 'NOT_DELETE', '2026-11-19 16:08:30', '1543837863788879873', NULL, NULL);
INSERT INTO `dev_file` VALUES ('2123332295605448706', 'LOCAL', 'defaultBucketName', '2026/11/19/2123332295605448706.mp4', '网页版千千静听，战损版.mp4', 'mp4', 'VIDEO', 'USER', 126386, '123.42 MB', '2123332295605448706.mp4', 'D:\\defaultUploadFolder\\defaultBucketName\\2026\\11\\19\\2123332295605448706.mp4', 'http://localhost:81/api/dev/file/download?id=2123332295605448706&sign=OGY2OTE0ZWFlNGI2NDliNTNlZTQ2MWYwZDA3YTQ4Y2VkODUxYzk1Y2M5NDc5NWMzZDhjMDNiZWY1MjMxYTgwZA==', 0, NULL, NULL, 'NOT_DELETE', '2026-11-19 16:27:24', '1543837863788879873', NULL, NULL);
INSERT INTO `dev_file` VALUES ('2123332298524684289', 'LOCAL', 'defaultBucketName', '2026/11/19/2123332298524684289.webp', 'auto-cover.webp', 'webp', 'IMAGE', 'USER', 30, '30.18 KB', '2123332298524684289.webp', 'D:\\defaultUploadFolder\\defaultBucketName\\2026\\11\\19\\2123332298524684289.webp', 'http://localhost:81/api/dev/file/download?id=2123332298524684289&sign=ZTQ5MzhjNzFjODk5MDVlZGRiMGJmYTUwZTIxOWNlNjg3ZjM2OGNlZjQyMTMwY2M2OTBiNzY3YWRiZTI2YzNhNw==', 0, NULL, NULL, 'NOT_DELETE', '2026-11-19 16:27:24', '1543837863788879873', NULL, NULL);
INSERT INTO `dev_file` VALUES ('2123332314475622402', 'LOCAL', 'defaultBucketName', '2026/11/19/2123332314475622402.webp', '通用.webp', 'webp', 'IMAGE', 'USER', 82, '82.31 KB', '2123332314475622402.webp', 'D:\\defaultUploadFolder\\defaultBucketName\\2026\\11\\19\\2123332314475622402.webp', 'http://localhost:81/api/dev/file/download?id=2123332314475622402&sign=ZTY5NjY1OTE1OTIxMDA1ZjkxYmE0MTBmZTY0MWIyM2Q0NmVhOTBhYzY4ZTkzN2MwMmEzNTZmOWQxZTk4NDRjNw==', 0, NULL, NULL, 'NOT_DELETE', '2026-11-19 16:27:28', '1543837863788879873', NULL, NULL);
INSERT INTO `dev_file` VALUES ('2123361105474318337', 'LOCAL', 'defaultBucketName', '2026/11/19/2123361105474318337.mp4', '网页版千千静听，战损版.mp4', 'mp4', 'VIDEO', 'USER', 126386, '123.42 MB', '2123361105474318337.mp4', 'D:\\defaultUploadFolder\\defaultBucketName\\2026\\11\\19\\2123361105474318337.mp4', 'http://localhost:81/api/dev/file/download?id=2123361105474318337&sign=NjFkZjNkYmIwZTk4MGJiMjQ2YjQ5NzBkOGNlZWUwODAyY2FkYTFhZDM1M2M0ZGE2NjY1ZmFjOTNiZDE2OTQ1MA==', 0, NULL, NULL, 'NOT_DELETE', '2026-11-19 18:21:53', '1543837863788879873', NULL, NULL);
INSERT INTO `dev_file` VALUES ('2123378825192353794', 'LOCAL', 'defaultBucketName', '2026/11/19/2123378825192353794.webp', '通用.webp', 'webp', 'IMAGE', 'USER', 82, '82.31 KB', '2123378825192353794.webp', 'D:\\defaultUploadFolder\\defaultBucketName\\2026\\11\\19\\2123378825192353794.webp', 'http://localhost:81/api/dev/file/download?id=2123378825192353794&sign=MzgwZmE0ZmI5YmU5YzUzNjM0NWRjMmVlMmQ4MjYyMjVhNjA0NTQ4MmRjNzg1NmIyNTRiZmFhYzA1Y2RjODcwYg==', 0, NULL, NULL, 'NOT_DELETE', '2026-11-19 19:32:17', '1543837863788879873', NULL, NULL);
INSERT INTO `dev_file` VALUES ('2123387347795783681', 'LOCAL', 'defaultBucketName', '2026/11/19/2123387347795783681.webp', '通用-1440x810.webp', 'webp', 'IMAGE', 'USER', 82, '81.67 KB', '2123387347795783681.webp', 'D:\\defaultUploadFolder\\defaultBucketName\\2026\\11\\19\\2123387347795783681.webp', 'http://localhost:81/api/dev/file/download?id=2123387347795783681&sign=NTQ0MjFhODllOTY3MjdmNWRkNmY4ZDE1YWZkNjQ4NmI4OTQxZTE3MDljM2QwODFhMzhmZjUyZTcyNjA3NTMwMQ==', 0, NULL, NULL, 'NOT_DELETE', '2026-11-19 20:06:09', '1543837863788879873', NULL, NULL);
INSERT INTO `dev_file` VALUES ('2123389800549265410', 'LOCAL', 'defaultBucketName', '2026/11/19/2123389800549265410.webp', 'bg.webp', 'webp', 'IMAGE', 'USER', 85, '84.55 KB', '2123389800549265410.webp', 'D:\\defaultUploadFolder\\defaultBucketName\\2026\\11\\19\\2123389800549265410.webp', 'http://localhost:81/api/dev/file/download?id=2123389800549265410&sign=MWZhYmU1MzFhNzU0ZWViM2U5YWVhM2Y0NmYyYThkMjI1MTFkODdjZjcwNGYyMjg0MDY3NGY3NTU5YWFjNDJiNw==', 0, NULL, NULL, 'NOT_DELETE', '2026-11-19 20:15:54', '1543837863788879873', NULL, NULL);
INSERT INTO `dev_file` VALUES ('2123389800746397697', 'LOCAL', 'defaultBucketName', '2026/11/19/2123389800746397697.webp', 'ppt背景.webp', 'webp', 'IMAGE', 'USER', 351, '351.03 KB', '2123389800746397697.webp', 'D:\\defaultUploadFolder\\defaultBucketName\\2026\\11\\19\\2123389800746397697.webp', 'http://localhost:81/api/dev/file/download?id=2123389800746397697&sign=YTFhMThjZDE0ZWU1YjZmYWJkZTZiYTEwNzFmMTg3YWViMjdmMjEzMWNhMTBhMDkwZjc1NmVjMzJlMWRlZWFhOA==', 0, NULL, NULL, 'NOT_DELETE', '2026-11-19 20:15:54', '1543837863788879873', NULL, NULL);
INSERT INTO `dev_file` VALUES ('2123389800880615425', 'LOCAL', 'defaultBucketName', '2026/11/19/2123389800880615425.webp', 'ppt背景2.webp', 'webp', 'IMAGE', 'USER', 198, '197.65 KB', '2123389800880615425.webp', 'D:\\defaultUploadFolder\\defaultBucketName\\2026\\11\\19\\2123389800880615425.webp', 'http://localhost:81/api/dev/file/download?id=2123389800880615425&sign=MThiMTUxMTE0ODI2N2M4MTY2MWEzOTdlNDUyODgyODg5ZTJmNWM0YzlhMGJjNTAxMjdmZTExY2VmODU1NGNjZQ==', 0, NULL, NULL, 'NOT_DELETE', '2026-11-19 20:15:54', '1543837863788879873', NULL, NULL);
INSERT INTO `dev_file` VALUES ('2123389802990350338', 'LOCAL', 'defaultBucketName', '2026/11/19/2123389802990350338.webp', '背景.webp', 'webp', 'IMAGE', 'USER', 32, '31.54 KB', '2123389802990350338.webp', 'D:\\defaultUploadFolder\\defaultBucketName\\2026\\11\\19\\2123389802990350338.webp', 'http://localhost:81/api/dev/file/download?id=2123389802990350338&sign=YjI0OGVjOGNhMjQzZDg0ZTk1OGYwNjIwYmJiZjdjZTFlMjRmNDNmNzdlMWM0NTE4OWNlMzAzZDg3NDNjZDI0ZA==', 0, NULL, NULL, 'NOT_DELETE', '2026-11-19 20:15:54', '1543837863788879873', NULL, NULL);
INSERT INTO `dev_file` VALUES ('2123390020695699457', 'LOCAL', 'defaultBucketName', '2026/11/19/2123390020695699457.webp', 'bg.webp', 'webp', 'IMAGE', 'USER', 85, '84.55 KB', '2123390020695699457.webp', 'D:\\defaultUploadFolder\\defaultBucketName\\2026\\11\\19\\2123390020695699457.webp', 'http://localhost:81/api/dev/file/download?id=2123390020695699457&sign=YjVmMTc4NjMyZjhiODBjYTRlMzg0NTYzM2U4N2MwYjcxZjA3MDVmMjBiOWFkYThlZmEzYzQ5ZTZiY2FkN2RiNA==', 0, NULL, NULL, 'NOT_DELETE', '2026-11-19 20:16:46', '1543837863788879873', NULL, NULL);
INSERT INTO `dev_file` VALUES ('2123390020905414658', 'LOCAL', 'defaultBucketName', '2026/11/19/2123390020905414658.webp', 'ppt背景.webp', 'webp', 'IMAGE', 'USER', 351, '351.03 KB', '2123390020905414658.webp', 'D:\\defaultUploadFolder\\defaultBucketName\\2026\\11\\19\\2123390020905414658.webp', 'http://localhost:81/api/dev/file/download?id=2123390020905414658&sign=OWQzMDIwNGY0ZTY2NGRhNDM4NzFjOTFjN2NlMjAyMzhlMmNlNjRkNmIzYjg2NzlmMjhkZGJiNGI2Mzg5MzJlYg==', 0, NULL, NULL, 'NOT_DELETE', '2026-11-19 20:16:46', '1543837863788879873', NULL, NULL);
INSERT INTO `dev_file` VALUES ('2123390021144489985', 'LOCAL', 'defaultBucketName', '2026/11/19/2123390021144489985.webp', 'ppt背景2.webp', 'webp', 'IMAGE', 'USER', 198, '197.65 KB', '2123390021144489985.webp', 'D:\\defaultUploadFolder\\defaultBucketName\\2026\\11\\19\\2123390021144489985.webp', 'http://localhost:81/api/dev/file/download?id=2123390021144489985&sign=ODVhODBlZDVhZDQxNDNkMzMxNjVjZmM3MDQ1MjI4Mjg3ZDkxM2NkM2NlODhiNTJhYzM0ZTlhNjM3NjMwOGMyZg==', 0, NULL, NULL, 'NOT_DELETE', '2026-11-19 20:16:46', '1543837863788879873', NULL, NULL);
INSERT INTO `dev_file` VALUES ('2123390023157755906', 'LOCAL', 'defaultBucketName', '2026/11/19/2123390023157755906.webp', '背景.webp', 'webp', 'IMAGE', 'USER', 32, '31.54 KB', '2123390023157755906.webp', 'D:\\defaultUploadFolder\\defaultBucketName\\2026\\11\\19\\2123390023157755906.webp', 'http://localhost:81/api/dev/file/download?id=2123390023157755906&sign=N2M4NGJmMzRhMjI4NGMwMDRiODE1ZGJjY2NhOGJkNGM2ODk2MGFhMDZhNDkxYzhmODY4YjVlMWRmMjk1YTIxYw==', 0, NULL, NULL, 'NOT_DELETE', '2026-11-19 20:16:47', '1543837863788879873', NULL, NULL);
INSERT INTO `dev_file` VALUES ('2123393134836396033', 'LOCAL', 'defaultBucketName', '2026/11/19/2123393134836396033.webp', 'ppt背景.webp', 'webp', 'IMAGE', 'USER', 351, '351.03 KB', '2123393134836396033.webp', 'D:\\defaultUploadFolder\\defaultBucketName\\2026\\11\\19\\2123393134836396033.webp', 'http://localhost:81/api/dev/file/download?id=2123393134836396033&sign=ZTUyYzc4ZTczOGE5NDg4NTdlODdmMzU1YjA5ZDUwM2Q2ZjUzYzBjODNjNzRhZWQzYmM4MDUyNWZjOTdjZjZiYQ==', 0, NULL, NULL, 'NOT_DELETE', '2026-11-19 20:29:09', '1543837863788879873', NULL, NULL);
INSERT INTO `dev_file` VALUES ('2123393135205494786', 'LOCAL', 'defaultBucketName', '2026/11/19/2123393135205494786.webp', 'ppt背景2.webp', 'webp', 'IMAGE', 'USER', 198, '197.65 KB', '2123393135205494786.webp', 'D:\\defaultUploadFolder\\defaultBucketName\\2026\\11\\19\\2123393135205494786.webp', 'http://localhost:81/api/dev/file/download?id=2123393135205494786&sign=MDQ5ZDdlMWVhNGM1ZWZmOTA0MmQ1MzFmMjE3OGJhNGY2YzRlODNkMjZmNGU4OTA5NWYwMjYwYzFmNjYxZjE5ZQ==', 0, NULL, NULL, 'NOT_DELETE', '2026-11-19 20:29:09', '1543837863788879873', NULL, NULL);
INSERT INTO `dev_file` VALUES ('2123393135469735937', 'LOCAL', 'defaultBucketName', '2026/11/19/2123393135469735937.webp', '背景.webp', 'webp', 'IMAGE', 'USER', 32, '31.54 KB', '2123393135469735937.webp', 'D:\\defaultUploadFolder\\defaultBucketName\\2026\\11\\19\\2123393135469735937.webp', 'http://localhost:81/api/dev/file/download?id=2123393135469735937&sign=NGRhYjAxZTc3MmNjN2M3MTlkZjEyNTAxNjU1NDQ1NDk0YjcyZmQ2ZjYwYmQyODk5MDU0NTc3NTI1NmRlNWIyNA==', 0, NULL, NULL, 'NOT_DELETE', '2026-11-19 20:29:09', '1543837863788879873', NULL, NULL);

-- ----------------------------
-- Table structure for dev_job
-- ----------------------------
DROP TABLE IF EXISTS `dev_job`;
CREATE TABLE `dev_job`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `NAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `CODE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '编码',
  `CATEGORY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类',
  `ACTION_CLASS` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '任务类名',
  `CRON_EXPRESSION` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'cron表达式',
  `JOB_STATUS` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '任务状态',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序码',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '定时任务' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of dev_job
-- ----------------------------
INSERT INTO `dev_job` VALUES ('1555471535453827073', '定时任务', 'qi06nah38m', 'FRM', 'vip.xiaonuo.dev.modular.job.task.DevJobTimerTaskRunner', '0 0 0 1 * ?', 'STOPPED', 1, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);

-- ----------------------------
-- Table structure for dev_log
-- ----------------------------
DROP TABLE IF EXISTS `dev_log`;
CREATE TABLE `dev_log`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `CATEGORY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '日志分类',
  `NAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '日志名称',
  `EXE_STATUS` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '执行状态',
  `EXE_MESSAGE` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '具体消息',
  `OP_IP` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '操作ip',
  `OP_ADDRESS` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '操作地址',
  `OP_BROWSER` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '操作浏览器',
  `OP_OS` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '操作系统',
  `CLASS_NAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '类名称',
  `METHOD_NAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '方法名称',
  `REQ_METHOD` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '请求方式',
  `REQ_URL` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '请求地址',
  `PARAM_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '请求参数',
  `RESULT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '返回结果',
  `OP_TIME` datetime NULL DEFAULT NULL COMMENT '操作时间',
  `OP_USER` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '操作人姓名',
  `SIGN_DATA` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '签名数据',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '日志' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of dev_log
-- ----------------------------
INSERT INTO `dev_log` VALUES ('2123649113054363649', 'OPERATE', '下载文件', 'SUCCESS', NULL, '127.0.0.1', '内网IP|内网IP', 'MSEdge', 'Windows 10 or Windows Server 2016', 'vip.xiaonuo.dev.modular.file.controller.DevFileController', 'download', '/dev/file/download', '/dev/file/download', '{\"devFileDownloadParam\":\"{\\\"id\\\":\\\"2123393135205494786\\\",\\\"sign\\\":\\\"MDQ5ZDdlMWVhNGM1ZWZmOTA0MmQ1MzFmMjE3OGJhNGY2YzRlODNkMjZmNGU4OTA5NWYwMjYwYzFmNjYxZjE5ZQ==\\\"}\"}', NULL, '2026-11-20 13:26:19', '业管', '304402207abe4b85be2e151cb6e29009bddc127dc69feca9e56c323f5b7252773dcb6a1502200cfc81a40f9113d27c86b57e27d3f9a71da72076f93913d5f84985f0ae78bfb5', '2026-11-20 13:26:19', '-1', NULL, NULL);
INSERT INTO `dev_log` VALUES ('2123670686863835138', 'LOGIN', '用户登录', 'SUCCESS', NULL, '127.0.0.1', '内网IP|内网IP', 'MSEdge', 'Windows 10 or Windows Server 2016', NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-20 14:52:02', '超管', '3045022100df38304f4779779d91eb61d7fb9b6fedadbc946bf500292dce8581cba1b37f3a0220063f9327d10cf84c4c0930d03d7d4e1e54c88c152303922fd9085d29bd7bfb6a', '2026-11-20 14:52:02', '-1', NULL, NULL);
INSERT INTO `dev_log` VALUES ('2123672853356044289', 'LOGIN', '用户登录', 'SUCCESS', NULL, '127.0.0.1', '内网IP|内网IP', 'MSEdge', 'Windows 10 or Windows Server 2016', NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-20 15:00:39', '超管', '3044022021777a4877bcc1c8281486865ecb6f616f6bf3a6ebb1f3c76db6f86a74d02914022073ded955afb21e5b8e9c3cb03fa2002ff942e97b24724a3c919ee9be8bc4db10', '2026-11-20 15:00:39', '-1', NULL, NULL);
INSERT INTO `dev_log` VALUES ('2123673085179420673', 'LOGIN', '用户登录', 'SUCCESS', NULL, '127.0.0.1', '内网IP|内网IP', 'MSEdge', 'Windows 10 or Windows Server 2016', NULL, NULL, NULL, NULL, NULL, NULL, '2026-11-20 15:01:34', '超管', '304402203d0235344ff44b000a8b44ad55a905c7769e9336a765eaed42e933b27e1bf5f00220367041fbeee07650c3148388cda646767125face4032af977864621c4dcb04ed', '2026-11-20 15:01:34', '-1', NULL, NULL);

-- ----------------------------
-- Table structure for dev_message
-- ----------------------------
DROP TABLE IF EXISTS `dev_message`;
CREATE TABLE `dev_message`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `CATEGORY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类',
  `SUBJECT` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '主题',
  `CONTENT` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '正文',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '站内信' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of dev_message
-- ----------------------------

-- ----------------------------
-- Table structure for dev_push
-- ----------------------------
DROP TABLE IF EXISTS `dev_push`;
CREATE TABLE `dev_push`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `ENGINE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '消息引擎',
  `TYPE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '消息类别',
  `TITLE` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '消息标题',
  `CONTENT` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '消息内容',
  `RECEIPT_INFO` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '回执信息',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '消息推送' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of dev_push
-- ----------------------------

-- ----------------------------
-- Table structure for dev_relation
-- ----------------------------
DROP TABLE IF EXISTS `dev_relation`;
CREATE TABLE `dev_relation`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `OBJECT_ID` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '对象ID',
  `TARGET_ID` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '目标ID',
  `CATEGORY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '关系' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of dev_relation
-- ----------------------------

-- ----------------------------
-- Table structure for dev_slideshow
-- ----------------------------
DROP TABLE IF EXISTS `dev_slideshow`;
CREATE TABLE `dev_slideshow`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `TITLE` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标题',
  `PLACE` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '展示位置',
  `IMAGE` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '图片',
  `PATH_DETAILS` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '路径详情',
  `STATUS` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '状态',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '更新时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '更新用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '轮播图' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of dev_slideshow
-- ----------------------------

-- ----------------------------
-- Table structure for dev_sms
-- ----------------------------
DROP TABLE IF EXISTS `dev_sms`;
CREATE TABLE `dev_sms`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `ENGINE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '短信引擎',
  `PHONE_NUMBERS` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '手机号',
  `SIGN_NAME` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '短信签名',
  `TEMPLATE_CODE` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '模板编码',
  `TEMPLATE_PARAM` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '发送参数',
  `RECEIPT_INFO` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '回执信息',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '短信' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of dev_sms
-- ----------------------------

-- ----------------------------
-- Table structure for dev_weak_password
-- ----------------------------
DROP TABLE IF EXISTS `dev_weak_password`;
CREATE TABLE `dev_weak_password`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `PASSWORD` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '弱密码',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '弱密码库' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of dev_weak_password
-- ----------------------------

-- ----------------------------
-- Table structure for gen_basic
-- ----------------------------
DROP TABLE IF EXISTS `gen_basic`;
CREATE TABLE `gen_basic`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `DB_TABLE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '主表',
  `DB_TABLE_KEY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '主表主键',
  `PLUGIN_NAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '插件名',
  `MODULE_NAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '模块名',
  `TABLE_PREFIX` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '移除表前缀',
  `GENERATE_TYPE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '生成方式',
  `MODULE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '所属模块',
  `MENU_PID` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '上级目录',
  `MOBILE_MODULE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '移动端所属模块',
  `FUNCTION_NAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '功能名',
  `BUS_NAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '业务名',
  `CLASS_NAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '类名',
  `FORM_LAYOUT` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '表单布局',
  `GRID_WHETHER` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '使用栅格',
  `PACKAGE_NAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '包名',
  `AUTHOR_NAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '作者',
  `GEN_TYPE` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'TABLE' COMMENT '生成类型：TABLE单表格/TREE单树表/LEFT_TREE_TABLE左树右表/MASTER_DETAIL主子表',
  `TREE_PARENT_FIELD` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '树父级字段名（单树表专用，如PARENT_ID）',
  `TREE_NAME_FIELD` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '树显示名称字段名（单树表专用，如NAME）',
  `SUB_DB_TABLE` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '子表表名（双表专用）',
  `SUB_DB_TABLE_KEY` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '子表主键（双表专用）',
  `SUB_FOREIGN_KEY` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '子表关联主表的外键字段名（双表专用）',
  `SUB_CLASS_NAME` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '子表类名（双表专用）',
  `SUB_FUNCTION_NAME` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '子表功能名（双表专用）',
  `SUB_BUS_NAME` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '子表业务名（双表专用）',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '生成基础' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of gen_basic
-- ----------------------------
INSERT INTO `gen_basic` VALUES ('2123114532890853377', 'biz_video', 'ID', 'snowy-plugin-biz', 'biz', 'Y', 'PRO', '1548901111999773976', '0', NULL, '视频', 'video', 'BizVideo', 'vertical', 'N', 'vip.xiaonuo', 'wuwenlong', 'TABLE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 99, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', NULL, NULL);
INSERT INTO `gen_basic` VALUES ('2123115018071162881', 'biz_article', 'ID', 'snowy-plugin-biz', 'biz', 'Y', 'PRO', '1548901111999773976', '0', NULL, '文章', 'article', 'BizArticle', 'vertical', 'N', 'vip.xiaonuo', 'wuwenlong', 'TABLE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 99, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:47', '1543837863788879871');
INSERT INTO `gen_basic` VALUES ('2123115181313474562', 'biz_category', 'ID', 'snowy-plugin-biz', 'biz', 'Y', 'PRO', '1548901111999773976', '0', NULL, '通用分类（文章/视频/图文）', 'category', 'BizCategory', 'vertical', 'N', 'vip.xiaonuo', 'wuwenlong', 'TABLE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 99, 'NOT_DELETE', '2026-11-19 02:04:39', '1543837863788879871', NULL, NULL);
INSERT INTO `gen_basic` VALUES ('2123115309294272514', 'biz_graphic', 'ID', 'snowy-plugin-biz', 'biz', 'Y', 'PRO', '1548901111999773976', '0', NULL, '图文', 'graphic', 'BizGraphic', 'vertical', 'N', 'vip.xiaonuo', 'wuwenlong', 'TABLE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 99, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', NULL, NULL);
INSERT INTO `gen_basic` VALUES ('2123257997033279489', 'biz_message', 'ID', 'snowy-plugin-biz', 'biz', 'Y', 'PRO', '1548901111999773976', '0', NULL, '留言', 'message', 'BizMessage', 'vertical', 'N', 'vip.xiaonuo', 'wuwenlong', 'TABLE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 99, 'NOT_DELETE', '2026-11-19 11:32:09', '1543837863788879871', '2026-11-19 11:32:24', '1543837863788879871');
INSERT INTO `gen_basic` VALUES ('2123399244574175233', 'biz_user_favorite', 'ID', 'snowy-plugin-biz', 'biz', 'Y', 'PRO', '1548901111999773976', '0', NULL, '用户收藏', 'userfavorite', 'BizUserFavorite', 'vertical', 'N', 'vip.xiaonuo', 'wuwenlong', 'TABLE', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 20, 'NOT_DELETE', '2026-11-19 20:53:25', '1543837863788879871', NULL, NULL);

-- ----------------------------
-- Table structure for gen_config
-- ----------------------------
DROP TABLE IF EXISTS `gen_config`;
CREATE TABLE `gen_config`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `BASIC_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '基础ID',
  `IS_TABLE_KEY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '是否主键',
  `FIELD_NAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '字段',
  `FIELD_REMARK` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `FIELD_TYPE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '类型',
  `FIELD_JAVA_TYPE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '实体类型',
  `EFFECT_TYPE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '作用类型',
  `DICT_TYPE_CODE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '字典',
  `WHETHER_TABLE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '列表显示',
  `WHETHER_RETRACT` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '列省略',
  `WHETHER_ADD_UPDATE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '是否增改',
  `WHETHER_REQUIRED` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '必填',
  `WHETHER_UNIQUE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '唯一',
  `QUERY_WHETHER` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '查询',
  `QUERY_TYPE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '查询方式',
  `WHETHER_DETAIL` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '详情显示',
  `TABLE_TYPE` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'MAIN' COMMENT '所属表类型：MAIN主表/SUB子表',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序',
  `DELETE_FLAG` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '生成配置' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of gen_config
-- ----------------------------
INSERT INTO `gen_config` VALUES ('2123114533008293889', '2123114532890853377', 'Y', 'ID', '主键', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 0, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', NULL, NULL);
INSERT INTO `gen_config` VALUES ('2123114533008293890', '2123114532890853377', 'N', 'TITLE', '标题', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 1, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123114533092179970', '2123114532890853377', 'N', 'COVER', '封面图', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 2, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123114533092179971', '2123114532890853377', 'N', 'VIDEO_URL', '视频地址', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 3, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123114533092179972', '2123114532890853377', 'N', 'DURATION', '时长', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 4, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123114533184454657', '2123114532890853377', 'N', 'SUMMARY', '简介', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 5, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123114533184454658', '2123114532890853377', 'N', 'CATEGORY', '分类编码，关联 BIZ_CATEGORY.CODE', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 6, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123114533247369217', '2123114532890853377', 'N', 'TAGS', '标签，多个以逗号分隔', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 7, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123114533247369218', '2123114532890853377', 'N', 'STATUS', '状态：DRAFT草稿/PUBLISHED已发布/OFFLINE已下架', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 8, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123114533289312257', '2123114532890853377', 'N', 'PUBLISH_TIME', '发布时间', 'DATETIME', 'Date', 'datepicker', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 9, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123114533289312258', '2123114532890853377', 'N', 'VIEW_COUNT', '播放量', 'INT', 'Integer', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 10, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123114533289312259', '2123114532890853377', 'N', 'LIKE_COUNT', '点赞量', 'INT', 'Integer', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 11, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123114533289312260', '2123114532890853377', 'N', 'COMMENT_COUNT', '评论量', 'INT', 'Integer', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 12, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123114533360615425', '2123114532890853377', 'N', 'IS_TOP', '是否置顶：Y是/N否', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 13, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123114533360615426', '2123114532890853377', 'N', 'IS_RECOMMEND', '是否推荐：Y是/N否', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 14, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123114533360615427', '2123114532890853377', 'N', 'SORT_CODE', '排序', 'INT', 'Integer', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 15, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123114533402558465', '2123114532890853377', 'N', 'REMARK', '备注', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 16, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123114533402558466', '2123114532890853377', 'N', 'EXT_JSON', '扩展信息', 'LONGTEXT', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 17, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123114533402558467', '2123114532890853377', 'N', 'DELETE_FLAG', '删除标志：NOT_DELETE正常/DELETED删除', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 18, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', NULL, NULL);
INSERT INTO `gen_config` VALUES ('2123114533402558468', '2123114532890853377', 'N', 'CREATE_TIME', '创建时间', 'DATETIME', 'Date', 'datepicker', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'N', 'MAIN', 19, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123114533490638850', '2123114532890853377', 'N', 'CREATE_USER', '创建用户', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'N', 'MAIN', 20, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123114533490638851', '2123114532890853377', 'N', 'UPDATE_TIME', '更新时间', 'DATETIME', 'Date', 'datepicker', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'N', 'MAIN', 21, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123114533490638852', '2123114532890853377', 'N', 'UPDATE_USER', '更新用户', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'N', 'MAIN', 22, 'NOT_DELETE', '2026-11-19 02:02:05', '1543837863788879871', '2026-11-19 02:03:35', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018129883138', '2123115018071162881', 'Y', 'ID', '主键', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 0, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', NULL, NULL);
INSERT INTO `gen_config` VALUES ('2123115018129883139', '2123115018071162881', 'N', 'TITLE', '标题', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 1, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018129883140', '2123115018071162881', 'N', 'COVER', '封面图', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 2, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018129883141', '2123115018071162881', 'N', 'SUMMARY', '摘要', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 3, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018201186305', '2123115018071162881', 'N', 'CONTENT', '正文内容', 'LONGTEXT', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 4, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018201186306', '2123115018071162881', 'N', 'CATEGORY', '分类编码，关联 BIZ_CATEGORY.CODE', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 5, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018201186307', '2123115018071162881', 'N', 'TAGS', '标签，多个以逗号分隔', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 6, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018201186308', '2123115018071162881', 'N', 'AUTHOR', '作者', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 7, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018201186309', '2123115018071162881', 'N', 'SOURCE', '来源', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 8, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018201186310', '2123115018071162881', 'N', 'STATUS', '状态：DRAFT草稿/PUBLISHED已发布/OFFLINE已下架', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 9, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018276683778', '2123115018071162881', 'N', 'PUBLISH_TIME', '发布时间', 'DATETIME', 'Date', 'datepicker', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 10, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018276683779', '2123115018071162881', 'N', 'VIEW_COUNT', '浏览量', 'INT', 'Integer', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 11, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018276683780', '2123115018071162881', 'N', 'LIKE_COUNT', '点赞量', 'INT', 'Integer', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 12, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018276683781', '2123115018071162881', 'N', 'COMMENT_COUNT', '评论量', 'INT', 'Integer', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 13, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018276683782', '2123115018071162881', 'N', 'IS_TOP', '是否置顶：Y是/N否', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 14, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018327015426', '2123115018071162881', 'N', 'IS_RECOMMEND', '是否推荐：Y是/N否', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 15, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018327015427', '2123115018071162881', 'N', 'SORT_CODE', '排序', 'INT', 'Integer', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 16, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018327015428', '2123115018071162881', 'N', 'REMARK', '备注', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 17, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018327015429', '2123115018071162881', 'N', 'EXT_JSON', '扩展信息', 'LONGTEXT', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 18, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018327015430', '2123115018071162881', 'N', 'DELETE_FLAG', '删除标志：NOT_DELETE正常/DELETED删除', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 19, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', NULL, NULL);
INSERT INTO `gen_config` VALUES ('2123115018327015431', '2123115018071162881', 'N', 'CREATE_TIME', '创建时间', 'DATETIME', 'Date', 'datepicker', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'N', 'MAIN', 20, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018327015432', '2123115018071162881', 'N', 'CREATE_USER', '创建用户', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'N', 'MAIN', 21, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018415095809', '2123115018071162881', 'N', 'UPDATE_TIME', '更新时间', 'DATETIME', 'Date', 'datepicker', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'N', 'MAIN', 22, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115018415095810', '2123115018071162881', 'N', 'UPDATE_USER', '更新用户', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'N', 'MAIN', 23, 'NOT_DELETE', '2026-11-19 02:04:01', '1543837863788879871', '2026-11-19 02:04:48', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115181422526466', '2123115181313474562', 'Y', 'ID', '主键', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 0, 'NOT_DELETE', '2026-11-19 02:04:39', '1543837863788879871', NULL, NULL);
INSERT INTO `gen_config` VALUES ('2123115181422526467', '2123115181313474562', 'N', 'PARENT_ID', '父级ID，顶级为0', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 1, 'NOT_DELETE', '2026-11-19 02:04:39', '1543837863788879871', '2026-11-19 02:04:41', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115181422526468', '2123115181313474562', 'N', 'NAME', '分类名称', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 2, 'NOT_DELETE', '2026-11-19 02:04:39', '1543837863788879871', '2026-11-19 02:04:41', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115181498023937', '2123115181313474562', 'N', 'CODE', '分类编码，业务表CATEGORY字段关联此编码', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 3, 'NOT_DELETE', '2026-11-19 02:04:39', '1543837863788879871', '2026-11-19 02:04:41', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115181498023938', '2123115181313474562', 'N', 'IMAGE', '分类图片', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 4, 'NOT_DELETE', '2026-11-19 02:04:40', '1543837863788879871', '2026-11-19 02:04:41', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115181498023939', '2123115181313474562', 'N', 'ICON', '分类图标', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 5, 'NOT_DELETE', '2026-11-19 02:04:40', '1543837863788879871', '2026-11-19 02:04:41', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115181498023940', '2123115181313474562', 'N', 'MODULE', '适用模块：ARTICLE文章/VIDEO视频/GRAPHIC图文/IMAGE图片/COMMON通用', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 6, 'NOT_DELETE', '2026-11-19 02:04:40', '1543837863788879871', '2026-11-19 02:04:41', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115181498023941', '2123115181313474562', 'N', 'DESCRIPTION', '分类描述', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 7, 'NOT_DELETE', '2026-11-19 02:04:40', '1543837863788879871', '2026-11-19 02:04:41', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115181498023942', '2123115181313474562', 'N', 'STATUS', '状态：ENABLE启用/DISABLE禁用', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 8, 'NOT_DELETE', '2026-11-19 02:04:40', '1543837863788879871', '2026-11-19 02:04:41', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115181498023943', '2123115181313474562', 'N', 'SORT_CODE', '排序', 'INT', 'Integer', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 9, 'NOT_DELETE', '2026-11-19 02:04:40', '1543837863788879871', '2026-11-19 02:04:41', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115181560938498', '2123115181313474562', 'N', 'REMARK', '备注', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 10, 'NOT_DELETE', '2026-11-19 02:04:40', '1543837863788879871', '2026-11-19 02:04:41', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115181560938499', '2123115181313474562', 'N', 'EXT_JSON', '扩展信息', 'LONGTEXT', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 11, 'NOT_DELETE', '2026-11-19 02:04:40', '1543837863788879871', '2026-11-19 02:04:41', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115181560938500', '2123115181313474562', 'N', 'DELETE_FLAG', '删除标志：NOT_DELETE正常/DELETED删除', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 12, 'NOT_DELETE', '2026-11-19 02:04:40', '1543837863788879871', NULL, NULL);
INSERT INTO `gen_config` VALUES ('2123115181560938501', '2123115181313474562', 'N', 'CREATE_TIME', '创建时间', 'DATETIME', 'Date', 'datepicker', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 13, 'NOT_DELETE', '2026-11-19 02:04:40', '1543837863788879871', '2026-11-19 02:04:41', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115181560938502', '2123115181313474562', 'N', 'CREATE_USER', '创建用户', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 14, 'NOT_DELETE', '2026-11-19 02:04:40', '1543837863788879871', '2026-11-19 02:04:41', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115181560938503', '2123115181313474562', 'N', 'UPDATE_TIME', '更新时间', 'DATETIME', 'Date', 'datepicker', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 15, 'NOT_DELETE', '2026-11-19 02:04:40', '1543837863788879871', '2026-11-19 02:04:41', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115181560938504', '2123115181313474562', 'N', 'UPDATE_USER', '更新用户', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 16, 'NOT_DELETE', '2026-11-19 02:04:40', '1543837863788879871', '2026-11-19 02:04:41', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309357187074', '2123115309294272514', 'Y', 'ID', '主键', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 0, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', NULL, NULL);
INSERT INTO `gen_config` VALUES ('2123115309357187075', '2123115309294272514', 'N', 'TITLE', '标题', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 1, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309357187076', '2123115309294272514', 'N', 'COVER', '封面图', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 2, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309357187077', '2123115309294272514', 'N', 'IMAGES', '图片列表，JSON数组', 'LONGTEXT', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 3, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309357187078', '2123115309294272514', 'N', 'SUMMARY', '摘要', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 4, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309436878849', '2123115309294272514', 'N', 'CONTENT', '图文内容', 'LONGTEXT', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 5, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309436878850', '2123115309294272514', 'N', 'CATEGORY', '分类编码，关联 BIZ_CATEGORY.CODE', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 6, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309436878851', '2123115309294272514', 'N', 'TAGS', '标签，多个以逗号分隔', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 7, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309436878852', '2123115309294272514', 'N', 'STATUS', '状态：DRAFT草稿/PUBLISHED已发布/OFFLINE已下架', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 8, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309436878853', '2123115309294272514', 'N', 'PUBLISH_TIME', '发布时间', 'DATETIME', 'Date', 'datepicker', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 9, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309436878854', '2123115309294272514', 'N', 'VIEW_COUNT', '浏览量', 'INT', 'Integer', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 10, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309436878855', '2123115309294272514', 'N', 'LIKE_COUNT', '点赞量', 'INT', 'Integer', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 11, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309436878856', '2123115309294272514', 'N', 'COMMENT_COUNT', '评论量', 'INT', 'Integer', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 12, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309508182017', '2123115309294272514', 'N', 'IS_TOP', '是否置顶：Y是/N否', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 13, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309508182018', '2123115309294272514', 'N', 'IS_RECOMMEND', '是否推荐：Y是/N否', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 14, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309508182019', '2123115309294272514', 'N', 'SORT_CODE', '排序', 'INT', 'Integer', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 15, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309508182020', '2123115309294272514', 'N', 'REMARK', '备注', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 16, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309508182021', '2123115309294272514', 'N', 'EXT_JSON', '扩展信息', 'LONGTEXT', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 17, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309508182022', '2123115309294272514', 'N', 'DELETE_FLAG', '删除标志：NOT_DELETE正常/DELETED删除', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 18, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', NULL, NULL);
INSERT INTO `gen_config` VALUES ('2123115309575290881', '2123115309294272514', 'N', 'CREATE_TIME', '创建时间', 'DATETIME', 'Date', 'datepicker', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 19, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309575290882', '2123115309294272514', 'N', 'CREATE_USER', '创建用户', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 20, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309575290883', '2123115309294272514', 'N', 'UPDATE_TIME', '更新时间', 'DATETIME', 'Date', 'datepicker', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 21, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123115309575290884', '2123115309294272514', 'N', 'UPDATE_USER', '更新用户', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 22, 'NOT_DELETE', '2026-11-19 02:05:10', '1543837863788879871', '2026-11-19 02:05:12', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123257997473681409', '2123257997033279489', 'Y', 'ID', '主键', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 0, 'NOT_DELETE', '2026-11-19 11:32:09', '1543837863788879871', NULL, NULL);
INSERT INTO `gen_config` VALUES ('2123257997473681410', '2123257997033279489', 'N', 'NICKNAME', '留言人昵称', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 1, 'NOT_DELETE', '2026-11-19 11:32:09', '1543837863788879871', '2026-11-19 11:32:25', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123257997524013057', '2123257997033279489', 'N', 'AVATAR', '留言人头像', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 2, 'NOT_DELETE', '2026-11-19 11:32:09', '1543837863788879871', '2026-11-19 11:32:25', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123257997524013058', '2123257997033279489', 'N', 'EMAIL', '邮箱', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 3, 'NOT_DELETE', '2026-11-19 11:32:09', '1543837863788879871', '2026-11-19 11:32:25', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123257997524013059', '2123257997033279489', 'N', 'PHONE', '联系电话', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 4, 'NOT_DELETE', '2026-11-19 11:32:09', '1543837863788879871', '2026-11-19 11:32:25', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123257997524013060', '2123257997033279489', 'N', 'CONTENT', '留言内容', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 5, 'NOT_DELETE', '2026-11-19 11:32:10', '1543837863788879871', '2026-11-19 11:32:25', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123257997524013061', '2123257997033279489', 'N', 'STATUS', '状态：PENDING待审核/APPROVED已通过/REJECTED已拒绝', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 6, 'NOT_DELETE', '2026-11-19 11:32:10', '1543837863788879871', '2026-11-19 11:32:25', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123257997524013062', '2123257997033279489', 'N', 'REPLY', '管理员回复内容', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 7, 'NOT_DELETE', '2026-11-19 11:32:10', '1543837863788879871', '2026-11-19 11:32:25', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123257997524013063', '2123257997033279489', 'N', 'REPLY_TIME', '回复时间', 'DATETIME', 'Date', 'datepicker', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 8, 'NOT_DELETE', '2026-11-19 11:32:10', '1543837863788879871', '2026-11-19 11:32:25', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123257997524013064', '2123257997033279489', 'N', 'REPLY_USER', '回复人', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 9, 'NOT_DELETE', '2026-11-19 11:32:10', '1543837863788879871', '2026-11-19 11:32:25', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123257997524013065', '2123257997033279489', 'N', 'IP', '留言IP', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 10, 'NOT_DELETE', '2026-11-19 11:32:10', '1543837863788879871', '2026-11-19 11:32:25', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123257997524013066', '2123257997033279489', 'N', 'USER_AGENT', '浏览器UA', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 11, 'NOT_DELETE', '2026-11-19 11:32:10', '1543837863788879871', '2026-11-19 11:32:25', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123257997586927618', '2123257997033279489', 'N', 'SORT_CODE', '排序', 'INT', 'Integer', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 12, 'NOT_DELETE', '2026-11-19 11:32:10', '1543837863788879871', '2026-11-19 11:32:25', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123257997586927619', '2123257997033279489', 'N', 'REMARK', '备注', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 13, 'NOT_DELETE', '2026-11-19 11:32:10', '1543837863788879871', '2026-11-19 11:32:25', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123257997586927620', '2123257997033279489', 'N', 'EXT_JSON', '扩展信息', 'LONGTEXT', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 14, 'NOT_DELETE', '2026-11-19 11:32:10', '1543837863788879871', '2026-11-19 11:32:25', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123257997586927621', '2123257997033279489', 'N', 'DELETE_FLAG', '删除标志：NOT_DELETE正常/DELETED删除', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 15, 'NOT_DELETE', '2026-11-19 11:32:10', '1543837863788879871', NULL, NULL);
INSERT INTO `gen_config` VALUES ('2123257997586927622', '2123257997033279489', 'N', 'CREATE_TIME', '创建时间', 'DATETIME', 'Date', 'datepicker', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 16, 'NOT_DELETE', '2026-11-19 11:32:10', '1543837863788879871', '2026-11-19 11:32:25', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123257997586927623', '2123257997033279489', 'N', 'CREATE_USER', '创建用户', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 17, 'NOT_DELETE', '2026-11-19 11:32:10', '1543837863788879871', '2026-11-19 11:32:25', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123257997586927624', '2123257997033279489', 'N', 'UPDATE_TIME', '更新时间', 'DATETIME', 'Date', 'datepicker', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 18, 'NOT_DELETE', '2026-11-19 11:32:10', '1543837863788879871', '2026-11-19 11:32:25', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123257997586927625', '2123257997033279489', 'N', 'UPDATE_USER', '更新用户', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 19, 'NOT_DELETE', '2026-11-19 11:32:10', '1543837863788879871', '2026-11-19 11:32:25', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123399244821639170', '2123399244574175233', 'Y', 'ID', '主键', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 0, 'NOT_DELETE', '2026-11-19 20:53:25', '1543837863788879871', NULL, NULL);
INSERT INTO `gen_config` VALUES ('2123399244821639171', '2123399244574175233', 'N', 'USER_ID', '收藏人ID', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 1, 'NOT_DELETE', '2026-11-19 20:53:25', '1543837863788879871', '2026-11-19 20:53:28', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123399244821639172', '2123399244574175233', 'N', 'TARGET_ID', '收藏目标ID', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 2, 'NOT_DELETE', '2026-11-19 20:53:25', '1543837863788879871', '2026-11-19 20:53:28', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123399244821639173', '2123399244574175233', 'N', 'TARGET_TYPE', '收藏类型（IMAGE_TEXT-图文，ARTICLE-文章，VIDEO-视频）', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 3, 'NOT_DELETE', '2026-11-19 20:53:25', '1543837863788879871', '2026-11-19 20:53:28', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123399244880359426', '2123399244574175233', 'N', 'TITLE', '标题', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 4, 'NOT_DELETE', '2026-11-19 20:53:25', '1543837863788879871', '2026-11-19 20:53:28', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123399244880359427', '2123399244574175233', 'N', 'COVER', '封面图', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 5, 'NOT_DELETE', '2026-11-19 20:53:25', '1543837863788879871', '2026-11-19 20:53:28', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123399244880359428', '2123399244574175233', 'N', 'DIGEST', '摘要', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 6, 'NOT_DELETE', '2026-11-19 20:53:25', '1543837863788879871', '2026-11-19 20:53:28', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123399244880359429', '2123399244574175233', 'N', 'AUTHOR', '作者/来源', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 7, 'NOT_DELETE', '2026-11-19 20:53:25', '1543837863788879871', '2026-11-19 20:53:28', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123399244880359430', '2123399244574175233', 'N', 'SOURCE_URL', '原始链接', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 8, 'NOT_DELETE', '2026-11-19 20:53:25', '1543837863788879871', '2026-11-19 20:53:28', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123399244880359431', '2123399244574175233', 'N', 'FAVORITE_TIME', '收藏时间', 'DATETIME', 'Date', 'datepicker', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 9, 'NOT_DELETE', '2026-11-19 20:53:25', '1543837863788879871', '2026-11-19 20:53:28', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123399244880359432', '2123399244574175233', 'N', 'SORT_CODE', '排序码', 'INT', 'Integer', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 10, 'NOT_DELETE', '2026-11-19 20:53:25', '1543837863788879871', '2026-11-19 20:53:28', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123399244880359433', '2123399244574175233', 'N', 'STATUS', '状态（ENABLE-正常，DISABLED-停用）', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 11, 'NOT_DELETE', '2026-11-19 20:53:26', '1543837863788879871', '2026-11-19 20:53:28', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123399244880359434', '2123399244574175233', 'N', 'REMARK', '备注', 'VARCHAR', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 12, 'NOT_DELETE', '2026-11-19 20:53:26', '1543837863788879871', '2026-11-19 20:53:28', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123399244880359435', '2123399244574175233', 'N', 'EXT_JSON', '扩展信息', 'LONGTEXT', 'String', 'input', NULL, 'Y', 'N', 'Y', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 13, 'NOT_DELETE', '2026-11-19 20:53:26', '1543837863788879871', '2026-11-19 20:53:28', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123399244947468289', '2123399244574175233', 'N', 'DELETE_FLAG', '删除标志', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 14, 'NOT_DELETE', '2026-11-19 20:53:26', '1543837863788879871', NULL, NULL);
INSERT INTO `gen_config` VALUES ('2123399244947468290', '2123399244574175233', 'N', 'CREATE_TIME', '创建时间', 'DATETIME', 'Date', 'datepicker', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 15, 'NOT_DELETE', '2026-11-19 20:53:26', '1543837863788879871', '2026-11-19 20:53:28', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123399244947468291', '2123399244574175233', 'N', 'CREATE_USER', '创建用户', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 16, 'NOT_DELETE', '2026-11-19 20:53:26', '1543837863788879871', '2026-11-19 20:53:28', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123399244947468292', '2123399244574175233', 'N', 'UPDATE_TIME', '修改时间', 'DATETIME', 'Date', 'datepicker', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 17, 'NOT_DELETE', '2026-11-19 20:53:26', '1543837863788879871', '2026-11-19 20:53:28', '1543837863788879871');
INSERT INTO `gen_config` VALUES ('2123399244947468293', '2123399244574175233', 'N', 'UPDATE_USER', '修改用户', 'VARCHAR', 'String', 'input', NULL, 'N', 'N', 'N', 'N', 'N', 'N', NULL, 'Y', 'MAIN', 18, 'NOT_DELETE', '2026-11-19 20:53:26', '1543837863788879871', '2026-11-19 20:53:28', '1543837863788879871');

-- ----------------------------
-- Table structure for mobile_resource
-- ----------------------------
DROP TABLE IF EXISTS `mobile_resource`;
CREATE TABLE `mobile_resource`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `PARENT_ID` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '父ID',
  `TITLE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `CODE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '编码',
  `CATEGORY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类',
  `MODULE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '模块',
  `MENU_TYPE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '菜单类型',
  `PATH` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '路径',
  `ICON` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '图标',
  `COLOR` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '颜色',
  `REG_TYPE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '规则类型',
  `STATUS` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '可用状态',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序码',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '移动资源' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of mobile_resource
-- ----------------------------

-- ----------------------------
-- Table structure for sys_group
-- ----------------------------
DROP TABLE IF EXISTS `sys_group`;
CREATE TABLE `sys_group`  (
  `ID` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `NAME` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '名称',
  `REMARK` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序码',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '用户组' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of sys_group
-- ----------------------------

-- ----------------------------
-- Table structure for sys_org
-- ----------------------------
DROP TABLE IF EXISTS `sys_org`;
CREATE TABLE `sys_org`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `PARENT_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '父id',
  `DIRECTOR_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '主管ID',
  `NAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `CODE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '编码',
  `CATEGORY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序码',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '组织' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of sys_org
-- ----------------------------
INSERT INTO `sys_org` VALUES ('1543842934270394368', '0', NULL, '小诺科技有限公司', 'yfqtrbd5qz', 'COMPANY', 1, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_org` VALUES ('1543842934270394370', '1543842934270394368', '1543837863788879880', '工会办公室', '5ruzr6n7g7', 'DEPT', 3, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_org` VALUES ('1543842934270394371', '1543842934270394368', '1543837863788879883', '综合管理部', 'l4sdfnw27p', 'DEPT', 4, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_org` VALUES ('1543842934270394372', '1543842934270394368', '1543837863788879887', '财务资产部', 'h7yq9t1q0t', 'DEPT', 5, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_org` VALUES ('1543842934270394373', '1543842934270394368', '1543837863788879892', '人力资源部', '245ryxcbqh', 'DEPT', 6, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_org` VALUES ('1543842934270394374', '1543842934270394368', '1543837863788879898', '党群工作部', 'sc6jkffc4d', 'DEPT', 7, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_org` VALUES ('1543842934270394375', '1543842934270394368', '1543837863788879903', '纪检监督部', '39t022fx1m', 'DEPT', 8, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_org` VALUES ('1543842934270394376', '1543842934270394368', '1543837863788879907', '生产技术部', '34m3lam984', 'DEPT', 9, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_org` VALUES ('1543842934270394377', '1543842934270394368', '1543837863788879912', '计划营销部', 'w742mipwer', 'DEPT', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_org` VALUES ('1543842934270394378', '1543842934270394368', '1543837863788879917', '后勤保卫部', 'b71pvf46do', 'DEPT', 11, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);

-- ----------------------------
-- Table structure for sys_org_ext
-- ----------------------------
DROP TABLE IF EXISTS `sys_org_ext`;
CREATE TABLE `sys_org_ext`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `ORG_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '组织id',
  `SOURCE_FROM_TYPE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '来源类别',
  `ID_SOURCE_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '身份源ID',
  `ID_SOURCE_ORG_ID` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '身份源机构ID',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '组织扩展' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of sys_org_ext
-- ----------------------------

-- ----------------------------
-- Table structure for sys_position
-- ----------------------------
DROP TABLE IF EXISTS `sys_position`;
CREATE TABLE `sys_position`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `ORG_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '组织id',
  `NAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `CODE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '编码',
  `CATEGORY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序码',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '职位' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of sys_position
-- ----------------------------
INSERT INTO `sys_position` VALUES ('1543899639134019583', '1543842934270394368', '董事长', 'rsz5dmh762', 'HIGH', 1, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_position` VALUES ('1543899639134019584', '1543842934270394368', '总经理', 'wo1araqs2z', 'HIGH', 2, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_position` VALUES ('1543899639134019585', '1543842934270394368', '副总经理', 'asqvwbsc16', 'HIGH', 3, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_position` VALUES ('1543899639134019587', '1543842934270394368', '总经理助理', 'aln9y4tno6', 'HIGH', 4, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_position` VALUES ('1543899639134019591', '1543842934270394368', '部门经理', 'krq0kj7oio', 'MIDDLE', 5, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);

-- ----------------------------
-- Table structure for sys_relation
-- ----------------------------
DROP TABLE IF EXISTS `sys_relation`;
CREATE TABLE `sys_relation`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `OBJECT_ID` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '对象ID',
  `TARGET_ID` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '目标ID',
  `CATEGORY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '关系' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of sys_relation
-- ----------------------------
INSERT INTO `sys_relation` VALUES ('1569556138947522560', '1543837863788879873', '1570687866138206209', 'SYS_USER_HAS_ROLE', NULL);
INSERT INTO `sys_relation` VALUES ('1569556138947522561', '1543837863788879871', '1570687866138206208', 'SYS_USER_HAS_ROLE', NULL);
INSERT INTO `sys_relation` VALUES ('1571134629653872641', '1543837863788879872', NULL, 'SYS_USER_WORKBENCH_DATA', '{\"shortcut\":[{\"id\":\"1548901111999772426\",\"title\":\"系统配置\",\"icon\":\"appstore-outlined\",\"path\":\"/sys/config\"}]}');
INSERT INTO `sys_relation` VALUES ('1571134629653872642', '1543837863788879873', NULL, 'SYS_USER_WORKBENCH_DATA', '{\"shortcut\":[{\"id\":\"1548901111999773978\",\"title\":\"机构管理\",\"icon\":\"appstore-outlined\",\"path\":\"/biz/org\"},{\"id\":\"1548901111999773979\",\"title\":\"人员管理\",\"icon\":\"appstore-outlined\",\"path\":\"/biz/user\"},{\"id\":\"1548901111999773980\",\"title\":\"岗位管理\",\"icon\":\"appstore-outlined\",\"path\":\"/biz/position\"}]}');
INSERT INTO `sys_relation` VALUES ('1728455598256001026', '1570687866138206208', '1548901111999770526', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999770526\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598256001028', '1570687866138206208', '1548901111999770826', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999770826\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598256001029', '1570687866138206208', '1548901111999770926', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999770926\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598256001030', '1570687866138206208', '1548901111999771026', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999771026\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598264389633', '1570687866138206208', '1548901111999771226', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999771226\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598264389634', '1570687866138206208', '1548901111999771326', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999771326\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598264389635', '1570687866138206208', '1548901111999771426', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999771426\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598264389636', '1570687866138206208', '1548901111999771726', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999771726\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598264389637', '1570687866138206208', '1548901111999771826', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999771826\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598264389638', '1570687866138206208', '1548901111999771926', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999771926\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598264389639', '1570687866138206208', '1548901111999772026', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999772026\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598264389640', '1570687866138206208', '1548901111999772130', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999772130\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598272778242', '1570687866138206208', '1548901111999772226', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999772226\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598272778243', '1570687866138206208', '1548901111999772326', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999772326\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598272778244', '1570687866138206208', '1548901111999772426', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999772426\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598272778245', '1570687866138206208', '1548901111999772526', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999772526\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598272778246', '1570687866138206208', '1548901111999772626', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999772626\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598281166849', '1570687866138206208', '1548901111999772726', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999772726\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598281166850', '1570687866138206208', '1548901111999772826', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999772826\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598281166851', '1570687866138206208', '1548901111999772926', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999772926\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598281166852', '1570687866138206208', '1548901111999773226', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999773226\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598281166853', '1570687866138206208', '1548901111999773326', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999773326\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598281166854', '1570687866138206208', '1548901111999773254', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999773254\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598281166855', '1570687866138206208', '1548901111999773427', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999773427\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598289555471', '1570687866138206208', '1689894316554067969', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1689894316554067969\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598289555472', '1570687866138206208', '1689894577238450177', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1689894577238450177\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598289555473', '1570687866138206208', '1623378675591671810', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1623378675591671810\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598289555474', '1570687866138206208', '1623378996099411969', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1623378996099411969\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1728455598297944066', '1570687866138206208', '1689891405367353346', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1689891405367353346\",\"buttonInfo\":[\"1689892202679377921\"]}');
INSERT INTO `sys_relation` VALUES ('1728455598297944067', '1570687866138206208', '1548901111999773978', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999773978\",\"buttonInfo\":[\"1571129529564758017\",\"1571129929961406466\",\"1571130756155408386\",\"1571130811058847745\",\"2003522569956777985\"]}');
INSERT INTO `sys_relation` VALUES ('1728455598297944068', '1570687866138206208', '1548901111999773979', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999773979\",\"buttonInfo\":[\"1571130973294526465\",\"1571131043532341249\",\"1571131137006600193\",\"1571131427361488898\",\"1571131544973967361\",\"1571131727656878081\",\"1571132076853657601\",\"1635110416263262209\",\"1635110536451043329\"]}');
INSERT INTO `sys_relation` VALUES ('1728455598297944069', '1570687866138206208', '1548901111999773980', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999773980\",\"buttonInfo\":[\"1571132393993371649\",\"1571132468178026497\",\"1571132576143605761\",\"1571132658851086338\"]}');
INSERT INTO `sys_relation` VALUES ('1728521685882490892', '1570687866138206208', '1811800584425500674', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1811800584425500674\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1812126273234231297', '1570687866138206208', '1811290937444667393', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1811290937444667393\",\"buttonInfo\":[\"1811290937469833217\",\"1811290937486610434\",\"1811290937494999042\",\"1811290937503387650\",\"1811328402989662210\",\"1811330359695400961\"]}');
INSERT INTO `sys_relation` VALUES ('1813959903803842580', '1570687866138206208', '1813959658013433858', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1813959658013433858\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('1871280434097565701', '1570687866138206208', '1870158678418993154', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1870158678418993154\",\"buttonInfo\":[\"1870158678481907713\",\"1870158678481907714\",\"1870158678481907715\",\"1870158678481907716\"]}');
INSERT INTO `sys_relation` VALUES ('1871280434097565751', '1570687866138206208', '1871278073018986498', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1871278073018986498\",\"buttonInfo\":[\"1871278073086095361\",\"1871278073086095362\",\"1871278073086095363\",\"1871278073086095364\",\"1871280381043814402\"]}');
INSERT INTO `sys_relation` VALUES ('1909233948956041233', '1570687866138206208', '1548901111999771927', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1548901111999771927\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123114922688495618', '1570687866138206208', '2123114922357145601', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"2123114922357145601\",\"buttonInfo\":[\"2123114922357145602\",\"2123114922424254466\",\"2123114922424254467\",\"2123114922503946242\",\"2123114922503946243\",\"2123114922503946244\",\"2123114922558472194\"]}');
INSERT INTO `sys_relation` VALUES ('2123115194001244162', '1570687866138206208', '2123115193791528962', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"2123115193791528962\",\"buttonInfo\":[\"2123115193858637825\",\"2123115193858637826\",\"2123115193858637827\",\"2123115193858637828\",\"2123115193858637829\",\"2123115193950912514\",\"2123115193950912515\"]}');
INSERT INTO `sys_relation` VALUES ('2123115223256514562', '1570687866138206208', '2123115223063576578', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"2123115223063576578\",\"buttonInfo\":[\"2123115223063576579\",\"2123115223063576580\",\"2123115223130685441\",\"2123115223130685442\",\"2123115223130685443\",\"2123115223130685444\",\"2123115223193600001\"]}');
INSERT INTO `sys_relation` VALUES ('2123115322728628226', '1570687866138206208', '2123115322523107330', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"2123115322523107330\",\"buttonInfo\":[\"2123115322523107331\",\"2123115322611187713\",\"2123115322611187714\",\"2123115322611187715\",\"2123115322653130753\",\"2123115322653130754\",\"2123115322653130755\"]}');
INSERT INTO `sys_relation` VALUES ('2123235016894648322', '1570687866138206208', '/biz/dict/edit', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/dict/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562882', '1570687866138206208', '/biz/dict/page', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/dict/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562883', '1570687866138206208', '/biz/dict/tree', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/dict/tree\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562884', '1570687866138206208', '/biz/group/add', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/group/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562885', '1570687866138206208', '/biz/group/delete', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/group/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562886', '1570687866138206208', '/biz/group/detail', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/group/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562887', '1570687866138206208', '/biz/group/edit', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/group/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562888', '1570687866138206208', '/biz/group/grantUser', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/group/grantUser\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562889', '1570687866138206208', '/biz/group/orgTreeSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/group/orgTreeSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562890', '1570687866138206208', '/biz/group/ownUser', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/group/ownUser\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562891', '1570687866138206208', '/biz/group/page', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/group/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562892', '1570687866138206208', '/biz/group/userSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/group/userSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562893', '1570687866138206208', '/biz/notice/add', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562894', '1570687866138206208', '/biz/notice/delete', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562895', '1570687866138206208', '/biz/notice/detail', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562896', '1570687866138206208', '/biz/notice/disableStatus', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/disableStatus\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562897', '1570687866138206208', '/biz/notice/edit', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562898', '1570687866138206208', '/biz/notice/enableStatus', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/enableStatus\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562899', '1570687866138206208', '/biz/notice/page', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562900', '1570687866138206208', '/biz/org/add', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562901', '1570687866138206208', '/biz/org/copy', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/copy\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562902', '1570687866138206208', '/biz/org/delete', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562903', '1570687866138206208', '/biz/org/detail', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562904', '1570687866138206208', '/biz/org/edit', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562905', '1570687866138206208', '/biz/org/orgTreeSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/orgTreeSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562906', '1570687866138206208', '/biz/org/page', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562907', '1570687866138206208', '/biz/org/tree', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/tree\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562908', '1570687866138206208', '/biz/org/userSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/userSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562909', '1570687866138206208', '/biz/position/add', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/position/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562910', '1570687866138206208', '/biz/position/delete', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/position/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562911', '1570687866138206208', '/biz/position/detail', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/position/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562912', '1570687866138206208', '/biz/position/edit', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/position/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562913', '1570687866138206208', '/biz/position/orgTreeSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/position/orgTreeSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562914', '1570687866138206208', '/biz/position/page', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/position/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562915', '1570687866138206208', '/biz/position/positionSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/position/positionSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562916', '1570687866138206208', '/biz/user/add', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562917', '1570687866138206208', '/biz/user/delete', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562918', '1570687866138206208', '/biz/user/detail', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562919', '1570687866138206208', '/biz/user/disableUser', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/disableUser\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562920', '1570687866138206208', '/biz/user/edit', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562921', '1570687866138206208', '/biz/user/enableUser', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/enableUser\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562922', '1570687866138206208', '/biz/user/export', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/export\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562923', '1570687866138206208', '/biz/user/exportUserInfo', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/exportUserInfo\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562924', '1570687866138206208', '/biz/user/grantRole', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/grantRole\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562925', '1570687866138206208', '/biz/user/orgListSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/orgListSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562926', '1570687866138206208', '/biz/user/orgTreeSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/orgTreeSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562927', '1570687866138206208', '/biz/user/ownRole', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/ownRole\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562928', '1570687866138206208', '/biz/user/page', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562929', '1570687866138206208', '/biz/user/positionSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/positionSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562930', '1570687866138206208', '/biz/user/resetPassword', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/resetPassword\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562931', '1570687866138206208', '/biz/user/roleSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/roleSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562932', '1570687866138206208', '/biz/user/transfer/execute', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/transfer/execute\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562933', '1570687866138206208', '/biz/user/transfer/orgTreeSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/transfer/orgTreeSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562934', '1570687866138206208', '/biz/user/transfer/resourceDetail', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/transfer/resourceDetail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562935', '1570687866138206208', '/biz/user/transfer/resourceList', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/transfer/resourceList\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562936', '1570687866138206208', '/biz/user/transfer/userSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/transfer/userSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123235016957562937', '1570687866138206208', '/biz/user/userSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/userSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123258071595421697', '1570687866138206208', '2123258071297626113', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"2123258071297626113\",\"buttonInfo\":[\"2123258071373123586\",\"2123258071373123587\",\"2123258071373123588\",\"2123258071448621057\",\"2123258071448621058\",\"2123258071448621059\",\"2123258071494758402\"]}');
INSERT INTO `sys_relation` VALUES ('2123258071868051458', '1570687866138206208', '/biz/message/page', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/page\",\"scopeCategory\":\"ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123258071868051459', '1570687866138206208', '/biz/message/add', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/add\",\"scopeCategory\":\"ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123258071868051460', '1570687866138206208', '/biz/message/edit', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/edit\",\"scopeCategory\":\"ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123258071868051461', '1570687866138206208', '/biz/message/delete', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/delete\",\"scopeCategory\":\"ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123258071868051462', '1570687866138206208', '/biz/message/detail', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/detail\",\"scopeCategory\":\"ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123258071868051463', '1570687866138206208', '/biz/message/downloadImportTemplate', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/downloadImportTemplate\",\"scopeCategory\":\"ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123258071868051464', '1570687866138206208', '/biz/message/importData', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/importData\",\"scopeCategory\":\"ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123258071868051465', '1570687866138206208', '/biz/message/exportData', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/exportData\",\"scopeCategory\":\"ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260426294464513', '1543837863788879873', '1813959658013433858', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1813959658013433858\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260426294464514', '1543837863788879873', '2123115223063576578', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"2123115223063576578\",\"buttonInfo\":[\"2123115223063576579\",\"2123115223063576580\",\"2123115223130685441\",\"2123115223130685442\",\"2123115223130685443\",\"2123115223130685444\",\"2123115223193600001\"]}');
INSERT INTO `sys_relation` VALUES ('2123260426294464515', '1543837863788879873', '2123115322523107330', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"2123115322523107330\",\"buttonInfo\":[\"2123115322523107331\",\"2123115322611187713\",\"2123115322611187714\",\"2123115322611187715\",\"2123115322653130753\",\"2123115322653130754\",\"2123115322653130755\"]}');
INSERT INTO `sys_relation` VALUES ('2123260426294464516', '1543837863788879873', '1811290937444667393', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1811290937444667393\",\"buttonInfo\":[\"1811290937469833217\",\"1811290937486610434\",\"1811290937494999042\",\"1811290937503387650\",\"1811328402989662210\",\"1811330359695400961\"]}');
INSERT INTO `sys_relation` VALUES ('2123260426294464517', '1543837863788879873', '2123115193791528962', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"2123115193791528962\",\"buttonInfo\":[\"2123115193858637825\",\"2123115193858637826\",\"2123115193858637827\",\"2123115193858637828\",\"2123115193858637829\",\"2123115193950912514\",\"2123115193950912515\"]}');
INSERT INTO `sys_relation` VALUES ('2123260426294464518', '1543837863788879873', '2123114922357145601', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"2123114922357145601\",\"buttonInfo\":[\"2123114922357145602\",\"2123114922424254466\",\"2123114922424254467\",\"2123114922503946242\",\"2123114922503946243\",\"2123114922503946244\",\"2123114922558472194\"]}');
INSERT INTO `sys_relation` VALUES ('2123260426294464519', '1543837863788879873', '2123258071297626113', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"2123258071297626113\",\"buttonInfo\":[\"2123258071373123586\",\"2123258071373123587\",\"2123258071373123588\",\"2123258071448621057\",\"2123258071448621058\",\"2123258071448621059\",\"2123258071494758402\"]}');
INSERT INTO `sys_relation` VALUES ('2123260867707219970', '1543837863788879873', '/biz/article/add', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867732385793', '1543837863788879873', '/biz/article/delete', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867732385794', '1543837863788879873', '/biz/article/detail', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867732385795', '1543837863788879873', '/biz/article/downloadImportTemplate', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/downloadImportTemplate\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867732385796', '1543837863788879873', '/biz/article/edit', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867732385797', '1543837863788879873', '/biz/article/exportData', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/exportData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867732385798', '1543837863788879873', '/biz/article/importData', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/importData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867732385799', '1543837863788879873', '/biz/article/page', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867732385800', '1543837863788879873', '/biz/category/add', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867799494658', '1543837863788879873', '/biz/category/delete', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867799494659', '1543837863788879873', '/biz/category/detail', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867799494660', '1543837863788879873', '/biz/category/downloadImportTemplate', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/downloadImportTemplate\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867799494661', '1543837863788879873', '/biz/category/edit', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867799494662', '1543837863788879873', '/biz/category/exportData', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/exportData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867799494663', '1543837863788879873', '/biz/category/importData', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/importData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867799494664', '1543837863788879873', '/biz/category/page', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867799494665', '1543837863788879873', '/biz/graphic/add', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867799494666', '1543837863788879873', '/biz/graphic/delete', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867799494667', '1543837863788879873', '/biz/graphic/detail', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867799494668', '1543837863788879873', '/biz/graphic/downloadImportTemplate', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/downloadImportTemplate\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867799494669', '1543837863788879873', '/biz/graphic/edit', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867799494670', '1543837863788879873', '/biz/graphic/exportData', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/exportData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867799494671', '1543837863788879873', '/biz/graphic/importData', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/importData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867799494672', '1543837863788879873', '/biz/graphic/page', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867799494673', '1543837863788879873', '/biz/message/add', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867799494674', '1543837863788879873', '/biz/message/delete', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867799494675', '1543837863788879873', '/biz/message/detail', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867862409218', '1543837863788879873', '/biz/message/downloadImportTemplate', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/downloadImportTemplate\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867862409219', '1543837863788879873', '/biz/message/edit', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867862409220', '1543837863788879873', '/biz/message/exportData', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/exportData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867862409221', '1543837863788879873', '/biz/message/importData', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/importData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867862409222', '1543837863788879873', '/biz/message/page', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867862409223', '1543837863788879873', '/biz/notice/add', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867862409224', '1543837863788879873', '/biz/notice/delete', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867862409225', '1543837863788879873', '/biz/notice/detail', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867862409226', '1543837863788879873', '/biz/notice/disableStatus', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/disableStatus\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867862409227', '1543837863788879873', '/biz/notice/edit', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867862409228', '1543837863788879873', '/biz/notice/enableStatus', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/enableStatus\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867862409229', '1543837863788879873', '/biz/notice/page', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867862409230', '1543837863788879873', '/biz/video/add', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867862409231', '1543837863788879873', '/biz/video/delete', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867862409232', '1543837863788879873', '/biz/video/detail', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867862409233', '1543837863788879873', '/biz/video/downloadImportTemplate', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/downloadImportTemplate\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867862409234', '1543837863788879873', '/biz/video/edit', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867862409235', '1543837863788879873', '/biz/video/exportData', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/exportData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867862409236', '1543837863788879873', '/biz/video/importData', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/importData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867862409237', '1543837863788879873', '/biz/video/page', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867950489602', '1543837863788879873', '/client/user/add', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867950489603', '1543837863788879873', '/client/user/delete', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867950489604', '1543837863788879873', '/client/user/detail', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867950489605', '1543837863788879873', '/client/user/disableUser', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/disableUser\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867950489606', '1543837863788879873', '/client/user/edit', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867950489607', '1543837863788879873', '/client/user/enableUser', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/enableUser\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867950489608', '1543837863788879873', '/client/user/page', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123260867950489609', '1543837863788879873', '/client/user/resetPassword', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/resetPassword\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285731948113921', '1543837863788879871', '1548901111999770826', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999770826\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028481', '1543837863788879871', '1548901111999770926', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999770926\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028482', '1543837863788879871', '1548901111999771026', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999771026\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028483', '1543837863788879871', '1870158678418993154', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1870158678418993154\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028484', '1543837863788879871', '1548901111999773254', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999773254\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028485', '1543837863788879871', '1623378675591671810', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1623378675591671810\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028486', '1543837863788879871', '1623378996099411969', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1623378996099411969\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028487', '1543837863788879871', '1548901111999772130', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999772130\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028488', '1543837863788879871', '1548901111999772226', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999772226\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028489', '1543837863788879871', '1548901111999772326', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999772326\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028490', '1543837863788879871', '1548901111999772426', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999772426\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028491', '1543837863788879871', '1548901111999772526', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999772526\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028492', '1543837863788879871', '1548901111999772626', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999772626\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028493', '1543837863788879871', '1548901111999772726', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999772726\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028494', '1543837863788879871', '1548901111999772826', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999772826\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028495', '1543837863788879871', '1548901111999772926', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999772926\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028496', '1543837863788879871', '1548901111999773226', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999773226\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028497', '1543837863788879871', '1548901111999773326', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999773326\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028498', '1543837863788879871', '1811800584425500674', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1811800584425500674\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028499', '1543837863788879871', '1548901111999770526', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999770526\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028500', '1543837863788879871', '1548901111999771226', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999771226\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028501', '1543837863788879871', '1548901111999771326', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999771326\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028502', '1543837863788879871', '1548901111999771426', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999771426\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028503', '1543837863788879871', '1548901111999773427', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999773427\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028504', '1543837863788879871', '1689894316554067969', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1689894316554067969\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028505', '1543837863788879871', '1689894577238450177', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1689894577238450177\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028506', '1543837863788879871', '1548901111999771726', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999771726\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028507', '1543837863788879871', '1548901111999771826', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999771826\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028508', '1543837863788879871', '1548901111999771926', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999771926\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028509', '1543837863788879871', '1548901111999771927', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999771927\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285732011028510', '1543837863788879871', '1548901111999772026', 'SYS_USER_HAS_RESOURCE', '{\"menuId\":\"1548901111999772026\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789464604674', '1543837863788879871', '/biz/article/add', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789464604675', '1543837863788879871', '/biz/article/delete', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789464604676', '1543837863788879871', '/biz/article/detail', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789464604677', '1543837863788879871', '/biz/article/downloadImportTemplate', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/downloadImportTemplate\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789464604678', '1543837863788879871', '/biz/article/edit', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789464604679', '1543837863788879871', '/biz/article/exportData', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/exportData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789464604680', '1543837863788879871', '/biz/article/importData', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/importData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789464604681', '1543837863788879871', '/biz/article/page', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789464604682', '1543837863788879871', '/biz/category/add', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789464604683', '1543837863788879871', '/biz/category/delete', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789464604684', '1543837863788879871', '/biz/category/detail', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789548490753', '1543837863788879871', '/biz/category/downloadImportTemplate', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/downloadImportTemplate\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789548490754', '1543837863788879871', '/biz/category/edit', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789548490755', '1543837863788879871', '/biz/category/exportData', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/exportData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789548490756', '1543837863788879871', '/biz/category/importData', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/importData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789548490757', '1543837863788879871', '/biz/category/page', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789548490758', '1543837863788879871', '/biz/dict/edit', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/dict/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789548490759', '1543837863788879871', '/biz/dict/page', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/dict/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789548490760', '1543837863788879871', '/biz/dict/tree', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/dict/tree\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789548490761', '1543837863788879871', '/biz/graphic/add', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789548490762', '1543837863788879871', '/biz/graphic/delete', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789548490763', '1543837863788879871', '/biz/graphic/detail', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789548490764', '1543837863788879871', '/biz/graphic/downloadImportTemplate', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/downloadImportTemplate\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789548490765', '1543837863788879871', '/biz/graphic/edit', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789548490766', '1543837863788879871', '/biz/graphic/exportData', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/exportData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789548490767', '1543837863788879871', '/biz/graphic/importData', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/importData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789548490768', '1543837863788879871', '/biz/graphic/page', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789548490769', '1543837863788879871', '/biz/group/add', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/group/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789548490770', '1543837863788879871', '/biz/group/delete', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/group/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736962', '1543837863788879871', '/biz/group/detail', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/group/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736963', '1543837863788879871', '/biz/group/edit', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/group/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736964', '1543837863788879871', '/biz/group/grantUser', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/group/grantUser\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736965', '1543837863788879871', '/biz/group/orgTreeSelector', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/group/orgTreeSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736966', '1543837863788879871', '/biz/group/ownUser', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/group/ownUser\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736967', '1543837863788879871', '/biz/group/page', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/group/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736968', '1543837863788879871', '/biz/group/userSelector', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/group/userSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736969', '1543837863788879871', '/biz/message/add', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736970', '1543837863788879871', '/biz/message/delete', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736971', '1543837863788879871', '/biz/message/detail', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736972', '1543837863788879871', '/biz/message/downloadImportTemplate', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/downloadImportTemplate\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736973', '1543837863788879871', '/biz/message/edit', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736974', '1543837863788879871', '/biz/message/exportData', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/exportData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736975', '1543837863788879871', '/biz/message/importData', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/importData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736976', '1543837863788879871', '/biz/message/page', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736977', '1543837863788879871', '/biz/notice/add', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736978', '1543837863788879871', '/biz/notice/delete', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736979', '1543837863788879871', '/biz/notice/detail', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736980', '1543837863788879871', '/biz/notice/disableStatus', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/disableStatus\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736981', '1543837863788879871', '/biz/notice/edit', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736982', '1543837863788879871', '/biz/notice/enableStatus', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/enableStatus\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736983', '1543837863788879871', '/biz/notice/page', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736984', '1543837863788879871', '/biz/org/add', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736985', '1543837863788879871', '/biz/org/copy', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/copy\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736986', '1543837863788879871', '/biz/org/delete', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736987', '1543837863788879871', '/biz/org/detail', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736988', '1543837863788879871', '/biz/org/edit', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736989', '1543837863788879871', '/biz/org/orgTreeSelector', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/orgTreeSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736990', '1543837863788879871', '/biz/org/page', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736991', '1543837863788879871', '/biz/org/tree', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/tree\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736992', '1543837863788879871', '/biz/org/userSelector', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/userSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736993', '1543837863788879871', '/biz/position/add', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/position/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789661736994', '1543837863788879871', '/biz/position/delete', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/position/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789758205954', '1543837863788879871', '/biz/position/detail', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/position/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789758205955', '1543837863788879871', '/biz/position/edit', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/position/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789758205956', '1543837863788879871', '/biz/position/orgTreeSelector', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/position/orgTreeSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789758205957', '1543837863788879871', '/biz/position/page', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/position/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789758205958', '1543837863788879871', '/biz/position/positionSelector', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/position/positionSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789758205959', '1543837863788879871', '/biz/user/add', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789758205960', '1543837863788879871', '/biz/user/delete', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789758205961', '1543837863788879871', '/biz/user/detail', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789758205962', '1543837863788879871', '/biz/user/disableUser', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/disableUser\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789758205963', '1543837863788879871', '/biz/user/edit', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789758205964', '1543837863788879871', '/biz/user/enableUser', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/enableUser\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789758205965', '1543837863788879871', '/biz/user/export', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/export\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789758205966', '1543837863788879871', '/biz/user/exportUserInfo', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/exportUserInfo\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789758205967', '1543837863788879871', '/biz/user/grantRole', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/grantRole\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789758205968', '1543837863788879871', '/biz/user/orgListSelector', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/orgListSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789758205969', '1543837863788879871', '/biz/user/orgTreeSelector', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/orgTreeSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926209', '1543837863788879871', '/biz/user/ownRole', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/ownRole\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926210', '1543837863788879871', '/biz/user/page', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926211', '1543837863788879871', '/biz/user/positionSelector', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/positionSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926212', '1543837863788879871', '/biz/user/resetPassword', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/resetPassword\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926213', '1543837863788879871', '/biz/user/roleSelector', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/roleSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926214', '1543837863788879871', '/biz/user/transfer/execute', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/transfer/execute\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926215', '1543837863788879871', '/biz/user/transfer/orgTreeSelector', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/transfer/orgTreeSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926216', '1543837863788879871', '/biz/user/transfer/resourceDetail', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/transfer/resourceDetail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926217', '1543837863788879871', '/biz/user/transfer/resourceList', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/transfer/resourceList\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926218', '1543837863788879871', '/biz/user/transfer/userSelector', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/transfer/userSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926219', '1543837863788879871', '/biz/user/userSelector', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/userSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926220', '1543837863788879871', '/biz/video/add', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926221', '1543837863788879871', '/biz/video/delete', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926222', '1543837863788879871', '/biz/video/detail', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926223', '1543837863788879871', '/biz/video/downloadImportTemplate', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/downloadImportTemplate\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926224', '1543837863788879871', '/biz/video/edit', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926225', '1543837863788879871', '/biz/video/exportData', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/exportData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926226', '1543837863788879871', '/biz/video/importData', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/importData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926227', '1543837863788879871', '/biz/video/page', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926228', '1543837863788879871', '/client/user/add', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926229', '1543837863788879871', '/client/user/delete', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926230', '1543837863788879871', '/client/user/detail', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926231', '1543837863788879871', '/client/user/disableUser', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/disableUser\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926232', '1543837863788879871', '/client/user/edit', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926233', '1543837863788879871', '/client/user/enableUser', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/enableUser\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926234', '1543837863788879871', '/client/user/page', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123285789816926235', '1543837863788879871', '/client/user/resetPassword', 'SYS_USER_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/resetPassword\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604744421377', '1570687866138206209', '/biz/article/add', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604744421378', '1570687866138206209', '/biz/article/delete', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604744421379', '1570687866138206209', '/biz/article/detail', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604744421380', '1570687866138206209', '/biz/article/downloadImportTemplate', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/downloadImportTemplate\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604744421381', '1570687866138206209', '/biz/article/edit', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604744421382', '1570687866138206209', '/biz/article/exportData', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/exportData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918850', '1570687866138206209', '/biz/article/importData', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/importData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918851', '1570687866138206209', '/biz/article/page', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/article/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918852', '1570687866138206209', '/biz/category/add', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918853', '1570687866138206209', '/biz/category/delete', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918854', '1570687866138206209', '/biz/category/detail', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918855', '1570687866138206209', '/biz/category/downloadImportTemplate', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/downloadImportTemplate\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918856', '1570687866138206209', '/biz/category/edit', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918857', '1570687866138206209', '/biz/category/exportData', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/exportData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918858', '1570687866138206209', '/biz/category/importData', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/importData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918859', '1570687866138206209', '/biz/category/page', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/category/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918860', '1570687866138206209', '/biz/dict/edit', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/dict/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918861', '1570687866138206209', '/biz/dict/page', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/dict/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918862', '1570687866138206209', '/biz/dict/tree', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/dict/tree\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918863', '1570687866138206209', '/biz/graphic/add', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918864', '1570687866138206209', '/biz/graphic/delete', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918865', '1570687866138206209', '/biz/graphic/detail', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918866', '1570687866138206209', '/biz/graphic/downloadImportTemplate', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/downloadImportTemplate\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918867', '1570687866138206209', '/biz/graphic/edit', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918868', '1570687866138206209', '/biz/graphic/exportData', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/exportData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918869', '1570687866138206209', '/biz/graphic/importData', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/importData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918870', '1570687866138206209', '/biz/graphic/page', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/graphic/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918871', '1570687866138206209', '/biz/message/add', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918872', '1570687866138206209', '/biz/message/delete', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918873', '1570687866138206209', '/biz/message/detail', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918874', '1570687866138206209', '/biz/message/downloadImportTemplate', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/downloadImportTemplate\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918875', '1570687866138206209', '/biz/message/edit', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918876', '1570687866138206209', '/biz/message/exportData', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/exportData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918877', '1570687866138206209', '/biz/message/importData', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/importData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918878', '1570687866138206209', '/biz/message/page', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/message/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918879', '1570687866138206209', '/biz/notice/add', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918880', '1570687866138206209', '/biz/notice/delete', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918881', '1570687866138206209', '/biz/notice/detail', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918882', '1570687866138206209', '/biz/notice/disableStatus', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/disableStatus\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918883', '1570687866138206209', '/biz/notice/edit', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604819918884', '1570687866138206209', '/biz/notice/enableStatus', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/enableStatus\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027713', '1570687866138206209', '/biz/notice/page', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/notice/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027714', '1570687866138206209', '/biz/org/add', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027715', '1570687866138206209', '/biz/org/delete', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027716', '1570687866138206209', '/biz/org/detail', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027717', '1570687866138206209', '/biz/org/edit', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027718', '1570687866138206209', '/biz/org/orgTreeSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/orgTreeSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027719', '1570687866138206209', '/biz/org/page', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027720', '1570687866138206209', '/biz/org/tree', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/tree\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027721', '1570687866138206209', '/biz/org/userSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/org/userSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027722', '1570687866138206209', '/biz/user/add', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027723', '1570687866138206209', '/biz/user/delete', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027724', '1570687866138206209', '/biz/user/detail', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027725', '1570687866138206209', '/biz/user/disableUser', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/disableUser\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027726', '1570687866138206209', '/biz/user/edit', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027727', '1570687866138206209', '/biz/user/enableUser', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/enableUser\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027728', '1570687866138206209', '/biz/user/export', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/export\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027729', '1570687866138206209', '/biz/user/exportUserInfo', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/exportUserInfo\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027730', '1570687866138206209', '/biz/user/grantRole', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/grantRole\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027731', '1570687866138206209', '/biz/user/orgListSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/orgListSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027732', '1570687866138206209', '/biz/user/orgTreeSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/orgTreeSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027733', '1570687866138206209', '/biz/user/ownRole', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/ownRole\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027734', '1570687866138206209', '/biz/user/page', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027735', '1570687866138206209', '/biz/user/positionSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/positionSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027736', '1570687866138206209', '/biz/user/resetPassword', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/resetPassword\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027737', '1570687866138206209', '/biz/user/roleSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/roleSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027738', '1570687866138206209', '/biz/user/transfer/execute', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/transfer/execute\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027739', '1570687866138206209', '/biz/user/transfer/orgTreeSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/transfer/orgTreeSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027740', '1570687866138206209', '/biz/user/transfer/resourceDetail', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/transfer/resourceDetail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027741', '1570687866138206209', '/biz/user/transfer/resourceList', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/transfer/resourceList\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027742', '1570687866138206209', '/biz/user/transfer/userSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/transfer/userSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027743', '1570687866138206209', '/biz/user/userSelector', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/user/userSelector\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027744', '1570687866138206209', '/biz/video/add', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027745', '1570687866138206209', '/biz/video/delete', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027746', '1570687866138206209', '/biz/video/detail', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027747', '1570687866138206209', '/biz/video/downloadImportTemplate', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/downloadImportTemplate\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027748', '1570687866138206209', '/biz/video/edit', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027749', '1570687866138206209', '/biz/video/exportData', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/exportData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027750', '1570687866138206209', '/biz/video/importData', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/importData\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027751', '1570687866138206209', '/biz/video/page', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/video/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027752', '1570687866138206209', '/client/user/add', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/add\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604887027753', '1570687866138206209', '/client/user/delete', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/delete\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604928970753', '1570687866138206209', '/client/user/detail', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/detail\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604928970754', '1570687866138206209', '/client/user/disableUser', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/disableUser\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604937359361', '1570687866138206209', '/client/user/edit', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/edit\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604937359362', '1570687866138206209', '/client/user/enableUser', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/enableUser\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604937359363', '1570687866138206209', '/client/user/page', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/page\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123326604937359364', '1570687866138206209', '/client/user/resetPassword', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/client/user/resetPassword\",\"scopeCategory\":\"SCOPE_ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123373589610471425', '1570687866138206209', '1813959658013433858', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"1813959658013433858\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123373589610471426', '1570687866138206209', '2123115223063576578', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"2123115223063576578\",\"buttonInfo\":[\"2123115223063576579\",\"2123115223063576580\",\"2123115223130685441\",\"2123115223130685442\",\"2123115223130685443\",\"2123115223130685444\",\"2123115223193600001\"]}');
INSERT INTO `sys_relation` VALUES ('2123373589610471427', '1570687866138206209', '2123310360926441473', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"2123310360926441473\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123373589610471428', '1570687866138206209', '2123115322523107330', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"2123115322523107330\",\"buttonInfo\":[\"2123115322523107331\",\"2123115322611187713\",\"2123115322611187714\",\"2123115322611187715\",\"2123115322653130753\",\"2123115322653130754\",\"2123115322653130755\"]}');
INSERT INTO `sys_relation` VALUES ('2123373589610471429', '1570687866138206209', '2123115193791528962', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"2123115193791528962\",\"buttonInfo\":[\"2123115193858637825\",\"2123115193858637826\",\"2123115193858637827\",\"2123115193858637828\",\"2123115193858637829\",\"2123115193950912514\",\"2123115193950912515\"]}');
INSERT INTO `sys_relation` VALUES ('2123373589610471430', '1570687866138206209', '2123373538058280961', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"2123373538058280961\",\"buttonInfo\":[]}');
INSERT INTO `sys_relation` VALUES ('2123373589610471431', '1570687866138206209', '2123114922357145601', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"2123114922357145601\",\"buttonInfo\":[\"2123114922357145602\",\"2123114922424254466\",\"2123114922424254467\",\"2123114922503946242\",\"2123114922503946243\",\"2123114922503946244\",\"2123114922558472194\"]}');
INSERT INTO `sys_relation` VALUES ('2123373589610471432', '1570687866138206209', '2123258071297626113', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"2123258071297626113\",\"buttonInfo\":[\"2123258071373123586\",\"2123258071373123587\",\"2123258071373123588\",\"2123258071448621057\",\"2123258071448621058\",\"2123258071448621059\",\"2123258071494758402\"]}');
INSERT INTO `sys_relation` VALUES ('2123399271036039169', '1570687866138206208', '2123399270285258754', 'SYS_ROLE_HAS_RESOURCE', '{\"menuId\":\"2123399270285258754\",\"buttonInfo\":[\"2123399270612414466\",\"2123399270612414467\",\"2123399270612414468\",\"2123399270675329026\",\"2123399270675329027\",\"2123399270675329028\",\"2123399270742437889\"]}');
INSERT INTO `sys_relation` VALUES ('2123399271950397441', '1570687866138206208', '/biz/userfavorite/page', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/userfavorite/page\",\"scopeCategory\":\"ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123399271950397442', '1570687866138206208', '/biz/userfavorite/add', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/userfavorite/add\",\"scopeCategory\":\"ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123399271950397443', '1570687866138206208', '/biz/userfavorite/edit', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/userfavorite/edit\",\"scopeCategory\":\"ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123399271950397444', '1570687866138206208', '/biz/userfavorite/delete', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/userfavorite/delete\",\"scopeCategory\":\"ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123399271950397445', '1570687866138206208', '/biz/userfavorite/detail', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/userfavorite/detail\",\"scopeCategory\":\"ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123399271950397446', '1570687866138206208', '/biz/userfavorite/downloadImportTemplate', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/userfavorite/downloadImportTemplate\",\"scopeCategory\":\"ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123399271950397447', '1570687866138206208', '/biz/userfavorite/importData', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/userfavorite/importData\",\"scopeCategory\":\"ALL\",\"scopeDefineOrgIdList\":[]}');
INSERT INTO `sys_relation` VALUES ('2123399271950397448', '1570687866138206208', '/biz/userfavorite/exportData', 'SYS_ROLE_HAS_PERMISSION', '{\"apiUrl\":\"/biz/userfavorite/exportData\",\"scopeCategory\":\"ALL\",\"scopeDefineOrgIdList\":[]}');

-- ----------------------------
-- Table structure for sys_resource
-- ----------------------------
DROP TABLE IF EXISTS `sys_resource`;
CREATE TABLE `sys_resource`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `PARENT_ID` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '父id',
  `TITLE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '标题',
  `NAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '别名',
  `CODE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '编码',
  `CATEGORY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类',
  `MODULE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '模块',
  `MENU_TYPE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '菜单类型',
  `PATH` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '路径',
  `COMPONENT` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '组件',
  `ICON` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '图标',
  `COLOR` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '颜色',
  `VISIBLE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '是否可见',
  `DISPLAY_LAYOUT` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '显示布局',
  `KEEP_LIVE` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '页签缓存',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序码',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '资源' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of sys_resource
-- ----------------------------
INSERT INTO `sys_resource` VALUES ('1548901111999770525', NULL, '系统', NULL, 'system', 'MODULE', NULL, NULL, NULL, NULL, 'appstore-add-outlined', '#05a045', NULL, NULL, NULL, 1, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999770526', '0', '系统首页', 'index', 'system', 'MENU', '1548901111999770525', 'MENU', '/index', 'index/index', 'home-outlined', NULL, 'YES', 'YES', 'YES', 2, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999770726', '0', '组织架构', NULL, 'wxq116zcyp', 'MENU', '1548901111999770525', 'CATALOG', '/e4y8y7ib2p', NULL, 'apartment-outlined', NULL, 'YES', 'YES', 'YES', 100, NULL, 'NOT_DELETE', NULL, NULL, '2026-11-19 14:45:45', '1543837863788879871');
INSERT INTO `sys_resource` VALUES ('1548901111999770826', '1548901111999770726', '组织管理', 'sysOrg', '7scuix7595', 'MENU', '1548901111999770525', 'MENU', '/sys/org', 'sys/org/index', 'cluster-outlined', NULL, 'YES', 'YES', 'YES', 5, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999770926', '1548901111999770726', '用户管理', 'sysUser', 'ue0wd497yb', 'MENU', '1548901111999770525', 'MENU', '/sys/user', 'sys/user/index', 'user-outlined', NULL, 'YES', 'YES', 'YES', 6, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999771026', '1548901111999770726', '职位管理', 'sysPosition', 'fkbckffqxi', 'MENU', '1548901111999770525', 'MENU', '/sys/position', 'sys/position/index', 'apartment-outlined', NULL, 'YES', 'YES', 'YES', 7, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999771126', '0', '权限管控', NULL, 'k7av3f3rg6', 'MENU', '1548901111999770525', 'CATALOG', '/5k9uuuzafi', NULL, 'user-switch-outlined', NULL, 'YES', NULL, NULL, 8, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999771226', '1548901111999771126', '角色管理', 'sysRole', 'hwjxhcg122', 'MENU', '1548901111999770525', 'MENU', '/sys/role', 'sys/role/index', 'deployment-unit-outlined', NULL, 'YES', 'YES', 'YES', 9, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999771326', '1548901111999771126', '模块管理', 'sysModule', 'opli26z18q', 'MENU', '1548901111999770525', 'MENU', '/sys/module', 'sys/resource/module/index', 'appstore-add-outlined', NULL, 'YES', 'YES', 'YES', 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999771426', '1548901111999771126', '菜单管理', 'sysMenu', 'q38j3bb839', 'MENU', '1548901111999770525', 'MENU', '/sys/menu', 'sys/resource/menu/index', 'pic-left-outlined', NULL, 'YES', 'YES', 'YES', 11, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999771626', '0', '基础工具', NULL, 'nplvu771br', 'MENU', '1548901111999770525', 'CATALOG', '/ozmlc6eyw5', NULL, 'tool-outlined', NULL, 'YES', NULL, NULL, 13, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999771726', '1548901111999771626', '文件管理', 'devFile', 'n25k83x4sy', 'MENU', '1548901111999770525', 'MENU', '/dev/file/index', 'dev/file/index', 'copy-outlined', NULL, 'YES', 'YES', 'YES', 14, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999771826', '1548901111999771626', '邮件推送', 'devEmail', 'x4fx2a91tq', 'MENU', '1548901111999770525', 'MENU', '/dev/email/index', 'dev/email/index', 'send-outlined', NULL, 'YES', 'YES', 'YES', 15, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999771926', '1548901111999771626', '短信发送', 'devSms', 'nnjsr7tkrs', 'MENU', '1548901111999770525', 'MENU', '/dev/sms/index', 'dev/sms/index', 'mail-outlined', NULL, 'YES', 'YES', 'YES', 16, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999771927', '1548901111999771626', '消息推送', 'devPush', 'ECKjtnzE9A', 'MENU', '1548901111999770525', 'MENU', '/dev/push/index', 'dev/push/index', 'appstore-outlined', NULL, 'YES', 'YES', 'YES', 16, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999772026', '1548901111999771626', '站内信息', 'devMessage', '0yitzu8786', 'MENU', '1548901111999770525', 'MENU', '/dev/message/index', 'dev/message/index', 'message-outlined', NULL, 'YES', 'YES', 'YES', 17, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999772126', '0', '系统运维', NULL, '3poiqgf7zx', 'MENU', '1548901111999770525', 'CATALOG', '/a0l7fxfq3m', NULL, 'hdd-outlined', NULL, 'YES', NULL, NULL, 18, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999772130', '1548901111999772126', 'C端用户', 'clientUser', 'TpkIKbpaN3', 'MENU', '1548901111999770525', 'MENU', '/client/user', 'client/user/index', 'user-outlined', NULL, 'YES', 'YES', 'YES', 19, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999772226', '1548901111999772126', '三方用户', 'authThird', 'xf89fmzrtz', 'MENU', '1548901111999770525', 'MENU', '/auth/third', 'auth/third/index', 'team-outlined', NULL, 'YES', 'YES', 'YES', 19, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999772326', '1548901111999772126', '数据字典', 'devDict', 'pzr1auhqf3', 'MENU', '1548901111999770525', 'MENU', '/sys/dict', 'dev/dict/index', 'file-search-outlined', NULL, 'YES', 'YES', 'YES', 20, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999772426', '1548901111999772126', '系统配置', 'devConfig', '38zmn86vxg', 'MENU', '1548901111999770525', 'MENU', '/sys/config', 'dev/config/index', 'setting-outlined', NULL, 'YES', 'YES', 'YES', 21, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999772526', '1548901111999772126', '任务调度', 'devJob', 'mj2p3y3hzq', 'MENU', '1548901111999770525', 'MENU', '/dev/job', 'dev/job/index', 'field-time-outlined', NULL, 'YES', 'YES', 'YES', 22, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999772626', '1548901111999772126', '会话管理', 'authMonitor', '4x1fpyaxys', 'MENU', '1548901111999770525', 'MENU', '/auth/monitor', 'auth/monitor/index', 'usergroup-delete-outlined', NULL, 'YES', 'YES', 'YES', 23, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999772726', '1548901111999772126', '系统监控', 'devMonitor', 'sugg84qph2', 'MENU', '1548901111999770525', 'MENU', '/dev/monitor', 'dev/monitor/index', 'database-outlined', NULL, 'YES', 'YES', 'YES', 24, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999772826', '1548901111999772126', '连接监控', '连接监控', '1xw98nknao', 'MENU', '1548901111999770525', 'IFRAME', 'http://localhost:82/druid/index.html', NULL, 'console-sql-outlined', NULL, 'YES', 'YES', 'YES', 25, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999772926', '1548901111999772126', '接口文档', 'jieKouWenDang', 'ookzmx37dt', 'MENU', '1548901111999770525', 'IFRAME', 'http://localhost:82/doc.html', NULL, 'file-word-outlined', NULL, 'YES', 'YES', 'YES', 26, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999773126', '1548901111999772126', '日志审计', NULL, 'i7wpmggo6a', 'MENU', '1548901111999770525', 'CATALOG', '/x1vjuegii4', NULL, 'robot-outlined', NULL, 'YES', NULL, NULL, 27, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999773226', '1548901111999773126', '访问日志', 'devVislog', 'gr29jwaigx', 'MENU', '1548901111999770525', 'MENU', '/dev/vislog', 'dev/log/vislog/index', 'bars-outlined', NULL, 'YES', 'YES', 'YES', 28, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999773250', '0', '在线开发', NULL, 'fk5m5c6b3u', 'MENU', '1548901111999770525', 'CATALOG', '/94mcv3octp', NULL, 'project-outlined', NULL, 'YES', NULL, NULL, 41, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999773254', '1548901111999773250', '代码生成', 'genIndex', 'ymyd8xlp5i', 'MENU', '1548901111999770525', 'MENU', '/gen', 'gen/index', 'rocket-outlined', NULL, 'YES', 'YES', 'YES', 45, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999773326', '1548901111999773126', '操作日志', 'devOplog', '4jbjjrz8h7', 'MENU', '1548901111999770525', 'MENU', '/dev/oplog', 'dev/log/oplog/index', 'bars-outlined', NULL, 'YES', 'YES', 'YES', 29, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999773426', '0', '开发示例', NULL, 'kyd5idwiwr', 'MENU', '1548901111999770525', 'CATALOG', '/e2re4evf5y', NULL, 'project-outlined', NULL, 'YES', NULL, NULL, 30, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999773427', '1548901111999773426', '图标选择', 'tuBiaoXuanZe', '97ygt0hy8t', 'MENU', '1548901111999770525', 'MENU', '/exm/iconSelect', 'exm/iconSelect/index', 'appstore-outlined', NULL, 'YES', 'YES', 'YES', 31, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999773976', NULL, '业务', NULL, 'biz', 'MODULE', NULL, NULL, NULL, NULL, 'profile-outlined', '#d81b43', NULL, NULL, NULL, 50, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999773977', '0', '公司架构', NULL, '3xavzjxt5z', 'MENU', '1548901111999773976', 'CATALOG', '/1nlpdpnief', NULL, 'cluster-outlined', NULL, 'YES', 'YES', 'YES', 19, NULL, 'NOT_DELETE', NULL, NULL, '2026-11-19 19:12:52', '1543837863788879871');
INSERT INTO `sys_resource` VALUES ('1548901111999773978', '1548901111999773977', '机构管理', 'bizOrg', 'mnt1f21q40', 'MENU', '1548901111999773976', 'MENU', '/biz/org', 'biz/org/index', 'cluster-outlined', NULL, 'YES', 'YES', 'YES', 52, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999773979', '1548901111999773977', '人员管理', 'bizUser', '38dptg40lo', 'MENU', '1548901111999773976', 'MENU', '/biz/user', 'biz/user/index', 'user-outlined', NULL, 'YES', 'YES', 'YES', 53, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1548901111999773980', '1548901111999773977', '岗位管理', 'bizPosition', 'l6b7kcqaji', 'MENU', '1548901111999773976', 'MENU', '/biz/position', 'biz/position/index', 'apartment-outlined', NULL, 'YES', 'YES', 'YES', 54, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1571129529564758017', '1548901111999773978', '新增机构', NULL, 'bizOrgAdd', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1571129929961406466', '1548901111999773978', '批量删除', NULL, 'bizOrgBatchDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1571130756155408386', '1548901111999773978', '编辑机构', NULL, 'bizOrgEdit', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1571130811058847745', '1548901111999773978', '删除机构', NULL, 'bizOrgDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1571130973294526465', '1548901111999773979', '新增人员', NULL, 'bizUserAdd', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1571131043532341249', '1548901111999773979', '批量删除', NULL, 'bizUserBatchDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1571131137006600193', '1548901111999773979', '编辑人员', NULL, 'bizUserEdit', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1571131427361488898', '1548901111999773979', '授权角色', NULL, 'bizUserGrantRole', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1571131544973967361', '1548901111999773979', '重置密码', NULL, 'bizUserPwdReset', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 5, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1571131727656878081', '1548901111999773979', '删除人员', NULL, 'bizUserDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 6, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1571132076853657601', '1548901111999773979', '启用禁用', NULL, 'bizUserUpdataStatus', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 7, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1571132393993371649', '1548901111999773980', '新增岗位', NULL, 'bizPositionAdd', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1571132468178026497', '1548901111999773980', '批量删除', NULL, 'bizPositionBatchDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1571132576143605761', '1548901111999773980', '编辑岗位', NULL, 'bizPositionEdit', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1571132658851086338', '1548901111999773980', '删除岗位', NULL, 'bizPositionDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1623378345382506498', '0', '移动端管理', NULL, NULL, 'MENU', '1548901111999770525', 'CATALOG', '/7029144034425704448', NULL, 'mobile-outlined', NULL, 'YES', NULL, NULL, 50, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1623378675591671810', '1623378345382506498', '模块管理', 'mobileModuleIndex', NULL, 'MENU', '1548901111999770525', 'MENU', '/mobile/module/index', 'mobile/resource/module/index', 'build-outlined', NULL, 'YES', 'YES', 'YES', 51, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1623378996099411969', '1623378345382506498', '菜单管理', 'mobileMenuIndex', NULL, 'MENU', '1548901111999770525', 'MENU', '/mobile/menu/index', 'mobile/resource/menu/index', 'appstore-add-outlined', NULL, 'YES', 'YES', 'YES', 52, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1635110416263262209', '1548901111999773979', '导出个人', NULL, 'bizUserExportUserInfo', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 8, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1635110536451043329', '1548901111999773979', '批量导出', NULL, 'bizUserBatchExport', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 9, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1689891405367353346', '0', '业务字典', 'bizDict', NULL, 'MENU', '1548901111999773976', 'MENU', '/biz/dict/index', 'biz/dict/index', 'read-outlined', NULL, 'YES', 'YES', 'YES', 20, NULL, 'NOT_DELETE', NULL, NULL, '2026-11-19 19:12:57', '1543837863788879871');
INSERT INTO `sys_resource` VALUES ('1689892202679377921', '1689891405367353346', '编辑字典', NULL, 'bizDictEdit', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1689894316554067969', '1548901111999773426', '高德地图', 'gaodeMap', 'noten', 'MENU', '1548901111999770525', 'MENU', '/exm/map/gaodeMap', 'exm/map/gaodeMap', 'environment-outlined', NULL, 'YES', 'YES', 'YES', 99, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1689894577238450177', '1548901111999773426', '百度地图', 'baiduMap', 'noten', 'MENU', '1548901111999770525', 'MENU', '/exm/map/baiduMap', 'exm/map/baiduMap', 'compass-outlined', NULL, 'YES', 'YES', 'YES', 99, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1811290937444667393', '0', '通知公告', 'notice', 'oFordpxYEi', 'MENU', '1548901111999773976', 'MENU', '/biz/notice', 'biz/notice/index', 'appstore-outlined', NULL, 'YES', 'YES', 'YES', 1, NULL, 'NOT_DELETE', NULL, NULL, '2026-11-19 19:12:18', '1543837863788879871');
INSERT INTO `sys_resource` VALUES ('1811290937469833217', '1811290937444667393', '新增通知公告', NULL, 'bizNoticeAdd', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1811290937486610434', '1811290937444667393', '编辑通知公告', NULL, 'bizNoticeEdit', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1811290937494999042', '1811290937444667393', '删除通知公告', NULL, 'bizNoticeDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1811290937503387650', '1811290937444667393', '批量删除', NULL, 'bizNoticeBatchDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1811328402989662210', '1811290937444667393', '更新状态', NULL, 'bizNoticerUpdateStatus', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 5, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1811330359695400961', '1811290937444667393', '通知公告详情', NULL, 'bizNoticeDetail', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 6, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1811800584425500674', '1548901111999772126', '轮播图', 'slideshow', 'XPLrleqZof', 'MENU', '1548901111999770525', 'MENU', '/dev/slideshow', 'dev/slideshow/index', 'file-image-outlined', NULL, 'YES', 'YES', 'YES', 99, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1813959658013433858', '0', '主页', 'bizIndex', 'vY0Qc3fkcR', 'MENU', '1548901111999773976', 'MENU', '/biz/index', 'biz/index/index', 'home-outlined', NULL, 'YES', 'YES', 'YES', 0, NULL, 'NOT_DELETE', NULL, NULL, '2026-11-19 19:14:27', '1543837863788879871');
INSERT INTO `sys_resource` VALUES ('1870158678418993154', '1548901111999770726', '用户组管理', 'groupIndex', 'd4KUq2ZnK7', 'MENU', '1548901111999770525', 'MENU', '/sys/group', 'sys/group/index', 'team-outlined', NULL, 'YES', 'YES', 'YES', 99, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1871278073018986498', '1548901111999773977', '用户组', 'bizGroupIndex', 'HQVofyRf7Z', 'MENU', '1548901111999773976', 'MENU', '/biz/group', 'biz/group/index', 'team-outlined', NULL, 'YES', 'YES', 'YES', 55, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1871278073086095361', '1871278073018986498', '新增用户组', NULL, 'bizGroupAdd', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1871278073086095362', '1871278073018986498', '编辑用户组', NULL, 'bizGroupEdit', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1871278073086095363', '1871278073018986498', '删除用户组', NULL, 'bizGroupDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1871278073086095364', '1871278073018986498', '批量删除', NULL, 'bizGroupBatchDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('1871280381043814402', '1871278073018986498', '授权用户', NULL, 'bizGroupGrantUser', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 5, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2003522569956777985', '1548901111999773978', '复制机构', NULL, 'bizOrgCopy', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 5, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2003522569956777986', '1548901111999773979', '权限调整', NULL, 'bizUserTransfer', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 10, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123114922357145601', '0', '视频', 'video', 'iyqxy6xL1q', 'MENU', '1548901111999773976', 'MENU', '/biz/video', 'biz/video/index', 'appstore-outlined', NULL, 'YES', 'YES', 'YES', 2, NULL, 'NOT_DELETE', '2026-11-19 02:03:38', '1543837863788879871', '2026-11-19 19:12:21', '1543837863788879871');
INSERT INTO `sys_resource` VALUES ('2123114922357145602', '2123114922357145601', '新增视频', NULL, 'bizVideoAdd', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'NOT_DELETE', '2026-11-19 02:03:38', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123114922424254466', '2123114922357145601', '编辑视频', NULL, 'bizVideoEdit', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, NULL, 'NOT_DELETE', '2026-11-19 02:03:38', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123114922424254467', '2123114922357145601', '删除视频', NULL, 'bizVideoDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, NULL, 'NOT_DELETE', '2026-11-19 02:03:38', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123114922503946242', '2123114922357145601', '详情视频', NULL, 'bizVideoDetail', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, 'NOT_DELETE', '2026-11-19 02:03:38', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123114922503946243', '2123114922357145601', '批量删除', NULL, 'bizVideoBatchDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 5, NULL, 'NOT_DELETE', '2026-11-19 02:03:38', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123114922503946244', '2123114922357145601', '导入视频', NULL, 'bizVideoImport', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 6, NULL, 'NOT_DELETE', '2026-11-19 02:03:38', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123114922558472194', '2123114922357145601', '导出视频', NULL, 'bizVideoExport', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 7, NULL, 'NOT_DELETE', '2026-11-19 02:03:38', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115193791528962', '0', '通用分类', 'category', 'mj58mrExiy', 'MENU', '1548901111999773976', 'MENU', '/biz/category', 'biz/category/index', 'appstore-outlined', NULL, 'YES', 'YES', 'YES', 14, NULL, 'NOT_DELETE', '2026-11-19 02:04:42', '1543837863788879871', '2026-11-19 19:13:04', '1543837863788879871');
INSERT INTO `sys_resource` VALUES ('2123115193858637825', '2123115193791528962', '新增通用分类（文章/视频/图文）', NULL, 'bizCategoryAdd', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'NOT_DELETE', '2026-11-19 02:04:42', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115193858637826', '2123115193791528962', '编辑通用分类（文章/视频/图文）', NULL, 'bizCategoryEdit', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, NULL, 'NOT_DELETE', '2026-11-19 02:04:42', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115193858637827', '2123115193791528962', '删除通用分类（文章/视频/图文）', NULL, 'bizCategoryDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, NULL, 'NOT_DELETE', '2026-11-19 02:04:42', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115193858637828', '2123115193791528962', '详情通用分类（文章/视频/图文）', NULL, 'bizCategoryDetail', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, 'NOT_DELETE', '2026-11-19 02:04:42', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115193858637829', '2123115193791528962', '批量删除', NULL, 'bizCategoryBatchDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 5, NULL, 'NOT_DELETE', '2026-11-19 02:04:42', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115193950912514', '2123115193791528962', '导入通用分类（文章/视频/图文）', NULL, 'bizCategoryImport', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 6, NULL, 'NOT_DELETE', '2026-11-19 02:04:42', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115193950912515', '2123115193791528962', '导出通用分类（文章/视频/图文）', NULL, 'bizCategoryExport', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 7, NULL, 'NOT_DELETE', '2026-11-19 02:04:42', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115223063576578', '0', '文章', 'article', 'RYzvgI4x5i', 'MENU', '1548901111999773976', 'MENU', '/biz/article', 'biz/article/index', 'appstore-outlined', NULL, 'YES', 'YES', 'YES', 3, NULL, 'NOT_DELETE', '2026-11-19 02:04:49', '1543837863788879871', '2026-11-19 19:12:24', '1543837863788879871');
INSERT INTO `sys_resource` VALUES ('2123115223063576579', '2123115223063576578', '新增文章', NULL, 'bizArticleAdd', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'NOT_DELETE', '2026-11-19 02:04:49', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115223063576580', '2123115223063576578', '编辑文章', NULL, 'bizArticleEdit', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, NULL, 'NOT_DELETE', '2026-11-19 02:04:49', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115223130685441', '2123115223063576578', '删除文章', NULL, 'bizArticleDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, NULL, 'NOT_DELETE', '2026-11-19 02:04:49', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115223130685442', '2123115223063576578', '详情文章', NULL, 'bizArticleDetail', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, 'NOT_DELETE', '2026-11-19 02:04:49', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115223130685443', '2123115223063576578', '批量删除', NULL, 'bizArticleBatchDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 5, NULL, 'NOT_DELETE', '2026-11-19 02:04:49', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115223130685444', '2123115223063576578', '导入文章', NULL, 'bizArticleImport', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 6, NULL, 'NOT_DELETE', '2026-11-19 02:04:49', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115223193600001', '2123115223063576578', '导出文章', NULL, 'bizArticleExport', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 7, NULL, 'NOT_DELETE', '2026-11-19 02:04:49', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115322523107330', '0', '图文', 'graphic', '6tW284325P', 'MENU', '1548901111999773976', 'MENU', '/biz/graphic', 'biz/graphic/index', 'appstore-outlined', NULL, 'YES', 'YES', 'YES', 4, NULL, 'NOT_DELETE', '2026-11-19 02:05:13', '1543837863788879871', '2026-11-19 19:12:28', '1543837863788879871');
INSERT INTO `sys_resource` VALUES ('2123115322523107331', '2123115322523107330', '新增图文', NULL, 'bizGraphicAdd', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'NOT_DELETE', '2026-11-19 02:05:13', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115322611187713', '2123115322523107330', '编辑图文', NULL, 'bizGraphicEdit', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, NULL, 'NOT_DELETE', '2026-11-19 02:05:13', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115322611187714', '2123115322523107330', '删除图文', NULL, 'bizGraphicDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, NULL, 'NOT_DELETE', '2026-11-19 02:05:13', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115322611187715', '2123115322523107330', '详情图文', NULL, 'bizGraphicDetail', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, 'NOT_DELETE', '2026-11-19 02:05:13', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115322653130753', '2123115322523107330', '批量删除', NULL, 'bizGraphicBatchDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 5, NULL, 'NOT_DELETE', '2026-11-19 02:05:13', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115322653130754', '2123115322523107330', '导入图文', NULL, 'bizGraphicImport', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 6, NULL, 'NOT_DELETE', '2026-11-19 02:05:13', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123115322653130755', '2123115322523107330', '导出图文', NULL, 'bizGraphicExport', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 7, NULL, 'NOT_DELETE', '2026-11-19 02:05:13', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123258071297626113', '0', '留言', 'message', 'mTeqLKeTpe', 'MENU', '1548901111999773976', 'MENU', '/biz/message', 'biz/message/index', 'appstore-outlined', NULL, 'YES', 'YES', 'YES', 6, NULL, 'NOT_DELETE', '2026-11-19 11:32:27', '1543837863788879871', '2026-11-19 19:12:32', '1543837863788879871');
INSERT INTO `sys_resource` VALUES ('2123258071373123586', '2123258071297626113', '新增留言', NULL, 'bizMessageAdd', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'NOT_DELETE', '2026-11-19 11:32:27', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123258071373123587', '2123258071297626113', '编辑留言', NULL, 'bizMessageEdit', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, NULL, 'NOT_DELETE', '2026-11-19 11:32:27', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123258071373123588', '2123258071297626113', '删除留言', NULL, 'bizMessageDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, NULL, 'NOT_DELETE', '2026-11-19 11:32:27', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123258071448621057', '2123258071297626113', '详情留言', NULL, 'bizMessageDetail', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, 'NOT_DELETE', '2026-11-19 11:32:27', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123258071448621058', '2123258071297626113', '批量删除', NULL, 'bizMessageBatchDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 5, NULL, 'NOT_DELETE', '2026-11-19 11:32:27', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123258071448621059', '2123258071297626113', '导入留言', NULL, 'bizMessageImport', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 6, NULL, 'NOT_DELETE', '2026-11-19 11:32:27', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123258071494758402', '2123258071297626113', '导出留言', NULL, 'bizMessageExport', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 7, NULL, 'NOT_DELETE', '2026-11-19 11:32:27', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123310360926441473', '0', '文件中心', 'file', 'd549HWRcoH', 'MENU', '1548901111999773976', 'MENU', '/biz-file', 'biz/file/index', NULL, NULL, 'YES', 'YES', 'YES', 7, NULL, 'NOT_DELETE', '2026-11-19 15:00:14', '1543837863788879871', '2026-11-19 19:12:35', '1543837863788879871');
INSERT INTO `sys_resource` VALUES ('2123373538058280961', '0', '素材中心', 'resource', '1v5fTpRF39', 'MENU', '1548901111999773976', 'MENU', '/biz-material', 'biz/material/index', NULL, NULL, 'YES', 'YES', 'YES', 11, NULL, 'NOT_DELETE', '2026-11-19 19:11:17', '1543837863788879871', '2026-11-19 19:18:29', '1543837863788879871');
INSERT INTO `sys_resource` VALUES ('2123399270285258754', '0', '用户收藏', 'userfavorite', 'lP9u8SlY9u', 'MENU', '1548901111999773976', 'MENU', '/biz/userfavorite', 'biz/userfavorite/index', 'appstore-outlined', NULL, 'YES', 'YES', 'YES', 99, NULL, 'NOT_DELETE', '2026-11-19 20:53:32', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123399270612414466', '2123399270285258754', '新增用户收藏', NULL, 'bizUserFavoriteAdd', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'NOT_DELETE', '2026-11-19 20:53:32', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123399270612414467', '2123399270285258754', '编辑用户收藏', NULL, 'bizUserFavoriteEdit', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, NULL, 'NOT_DELETE', '2026-11-19 20:53:32', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123399270612414468', '2123399270285258754', '删除用户收藏', NULL, 'bizUserFavoriteDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, NULL, 'NOT_DELETE', '2026-11-19 20:53:32', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123399270675329026', '2123399270285258754', '详情用户收藏', NULL, 'bizUserFavoriteDetail', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 4, NULL, 'NOT_DELETE', '2026-11-19 20:53:32', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123399270675329027', '2123399270285258754', '批量删除', NULL, 'bizUserFavoriteBatchDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 5, NULL, 'NOT_DELETE', '2026-11-19 20:53:32', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123399270675329028', '2123399270285258754', '导入用户收藏', NULL, 'bizUserFavoriteImport', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 6, NULL, 'NOT_DELETE', '2026-11-19 20:53:32', '1543837863788879871', NULL, NULL);
INSERT INTO `sys_resource` VALUES ('2123399270742437889', '2123399270285258754', '导出用户收藏', NULL, 'bizUserFavoriteExport', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 7, NULL, 'NOT_DELETE', '2026-11-19 20:53:32', '1543837863788879871', NULL, NULL);

-- ----------------------------
-- Table structure for sys_role
-- ----------------------------
DROP TABLE IF EXISTS `sys_role`;
CREATE TABLE `sys_role`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `ORG_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '组织id',
  `NAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '名称',
  `CODE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '编码',
  `CATEGORY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序码',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '角色' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of sys_role
-- ----------------------------
INSERT INTO `sys_role` VALUES ('1570687866138206208', NULL, '超级管理员', 'superAdmin', 'GLOBAL', 1, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);
INSERT INTO `sys_role` VALUES ('1570687866138206209', NULL, '业务管理员', 'bizAdmin', 'GLOBAL', 2, NULL, 'NOT_DELETE', NULL, NULL, NULL, NULL);

-- ----------------------------
-- Table structure for sys_user
-- ----------------------------
DROP TABLE IF EXISTS `sys_user`;
CREATE TABLE `sys_user`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `AVATAR` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '头像',
  `SIGNATURE` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '签名',
  `ACCOUNT` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '账号',
  `PASSWORD` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '密码',
  `NAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '姓名',
  `NICKNAME` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '昵称',
  `GENDER` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '性别',
  `AGE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '年龄',
  `BIRTHDAY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '出生日期',
  `NATION` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '民族',
  `NATIVE_PLACE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '籍贯',
  `HOME_ADDRESS` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '家庭住址',
  `MAILING_ADDRESS` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '通信地址',
  `ID_CARD_TYPE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '证件类型',
  `ID_CARD_NUMBER` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '证件号码',
  `CULTURE_LEVEL` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '文化程度',
  `POLITICAL_OUTLOOK` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '政治面貌',
  `COLLEGE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '毕业院校',
  `EDUCATION` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '学历',
  `EDU_LENGTH` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '学制',
  `DEGREE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '学位',
  `PHONE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '手机',
  `EMAIL` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '邮箱',
  `HOME_TEL` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '家庭电话',
  `OFFICE_TEL` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '办公电话',
  `EMERGENCY_CONTACT` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '紧急联系人',
  `EMERGENCY_PHONE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '紧急联系人电话',
  `EMERGENCY_ADDRESS` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '紧急联系人地址',
  `EMP_NO` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '员工编号',
  `ENTRY_DATE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '入职日期',
  `ORG_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '机构id',
  `POSITION_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '职位id',
  `POSITION_LEVEL` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '职级',
  `DIRECTOR_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '主管id',
  `POSITION_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '兼任信息',
  `LAST_LOGIN_IP` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '上次登录ip',
  `LAST_LOGIN_ADDRESS` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '上次登录地点',
  `LAST_LOGIN_TIME` datetime NULL DEFAULT NULL COMMENT '上次登录时间',
  `LAST_LOGIN_DEVICE` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '上次登录设备',
  `LATEST_LOGIN_IP` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '最新登录ip',
  `LATEST_LOGIN_ADDRESS` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '最新登录地点',
  `LATEST_LOGIN_TIME` datetime NULL DEFAULT NULL COMMENT '最新登录时间',
  `LATEST_LOGIN_DEVICE` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '最新登录设备',
  `USER_STATUS` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '用户状态',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序码',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '用户' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of sys_user
-- ----------------------------
INSERT INTO `sys_user` VALUES ('1543837863788879871', 'data:image/jpg;base64,/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCABkAGQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDKooorrMAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACuivfC32Twja699s3+ewXyPKxtzn+LPPT0p/ghtUh1p7nSrBbyWOIho2lCAAkc5Jr1e4vdbTRIbiHSkk1FiPMtTOoCDnPzZwe351nKTTKirnlukeAdV1rS4dQtrizSGbdtWR2DDDFecKe4q9/wqzXP+frT/APv4/wD8RWnpurab4c/tTVL+ZzrM00itYA58pi27aMEgjJHzf1q/o11pfhuxv9Rn8Qw3s14qzCPIDA4JAChicktScpDSR5zoOhXOv6qllb8L1kl25Ea9z/gK3dT+G+s2t35enxm+h2gmYlIufTBfP41r/D2K8l8N6oLe/hsx5mPOaAMU+Xls7h29elbBGly6PZWFx4ss3a3kDPOlwEeRe65EnU+pz9KHJ3BRVjjdC8A32q3d7Bdy/YfspCMSgky5GcDDAdMHr3FU77wPr9jFcXD2J+zQhnMhljzsHOcBienavQ7mbTjpz2On+K9Os4i6srmRZJMDqCxf5skdT246VT8Wac+s6RNq1prsbQ21uyyJaglJiByCQ5A+mO/OaFN3DlVjyaiiitSAooooAKKKKAOm8CLcTeJYrSC8ntUmRhI8BAbAUkdQR1A7V6Po73l1pet2z6pKskF7LbxXUoBaNQq4J6A9TXC/DNIT4mklllRDHbsUDHBJ4zj6DNdxbapoXijRby3t7qO2lvARMhIDhsAZwevAHPtWM9zSOxBobXml6FrrwyHUryG8kZXCf65tiHopP6VY0DWdY1ez1L+1dLax8qMeXuidN+Q2fvdcYH51U0rwprWh2rWumeIIFgZzIQ9oCckAep7AVfOk+JZI2STxJAAwIIFgp4/76qXYaueXeCreC78X2EFzDHNExfdHIoZT8jHkGvTL3SIIrt0ttE8NGEY2mfCP07gRnHPvXAeEbeOz+I1tbRTeckUsqCTbt3YRhnGTXoeq2Qm1KWT+yvD0+cfvLx8Sngfe+Q/hz0xVTepMdin/AGZ/1A/Cn/ff/wBqrmPiVaabavpn9n29pDuEm/7Oirn7uM4/Gun/ALNH/QD8J/8Afz/7VWJ8Q9NsrPw/p80FhZW07yjzGtYwAfkJIBABIzRF6jex5vRRRWxmFFFFABRRRQA5HaNgyMVYdCDg02iigAooooAkguJrWdZreaSGVfuvGxVh24Ipbi4nu52nuZpJpWxukkYsxwMck1FRQAVYmv7y5t47ee7nlgiwI43kLKmBgYBOBxVeigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA/9k=', NULL, 'superAdmin', '207cf410532f92a47dee245ce9b11ff71f578ebd763eb3bbea44ebd043d018fb', '超管', NULL, '男', NULL, '1990-01-01', '汉', '', '', '', '身份证', '', NULL, NULL, NULL, NULL, NULL, NULL, 'eb77186abe605f8de5958df60ef4a279', 'superAdmin@foxmail.com', NULL, NULL, '', '', '', '0000', '2022-07-04', '1543842934270394368', '1543899639134019584', 'C1', NULL, NULL, '127.0.0.1', '内网IP|内网IP', '2026-11-20 15:00:39', 'PC', '127.0.0.1', '内网IP|内网IP', '2026-11-20 15:01:34', 'PC', 'ENABLE', 1, NULL, 'NOT_DELETE', NULL, NULL, '2026-11-20 15:01:34', '-1');
INSERT INTO `sys_user` VALUES ('1543837863788879873', 'data:image/jpg;base64,/9j/4AAQSkZJRgABAgAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCABkAGQDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwCeiiivzs/RQooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACtfw7of8Ab9/JbfaPI2RGTds3Z5AxjI9af4VisbjXoINQiEkUmVUEkAP2z6+mPeus0PSv7J8c38KLiF7YyRf7pdePwOR+FejgsH7VwnLWLdmjzsbjPZKcI6SSun8zmNM8Nf2jr97pf2vy/s2/955ed21gvTPHX1rIvrb7FqFza79/kytHuxjODjOK7bwz/wAj9rP/AG2/9Gim6NolvqHiPXLu+iV7WKeVAH6bixJP4D+dbfUY1IRVNWk5NfJGP16VOcnUd4qMXbzZyejaRPrWopaw5UHmSTGQi+tbGoeBdVt7nZZIbuLaD5hKR8+mC2a2fCqvNp2r/wBn3MdlbGY+W7xbmjXHXJI7evSrpGnyaXa2c3iS1ZoJNzTJNsZ19Mh+vvz9K1oYCjKinNavW90utrK/33sZV8wrRrtQei0tZvpe7t91rnLaP4NvNRubqG5k+yfZyFY7Q+WIzjg46Y79xVa78JazaRzzPaHyIgzFzIn3R3wGPbtXbXEtj9ha0svEdjbRl1YMXV346gsX5yf04qr4ksW1TTZdSttXQxQQEOtvkrKQOQSHx+nfvV1MuoKk+VNyWuklr/w3orkU8xruquZpRemsXp/w/q7Hm9FFFeAe+FFFFABRRRQA+KR4ZUljYq6MGUjsR0r1rS9X03V72CSGQNeC1LOqjhASuQT65A/WvO/DmnaZqN1Mmp3n2WNUyjeaqZOenzCu00ax8N6Hdvc22sxO7oYyJbqMjGQe2PSvcylVIe9dcr3u9dDw82dKfu2fMtrLTUoeGf8AkftZ/wC23/o0U/X9csLPRb6xsJf9KmuZEmUjDAliWPuOwrSsYvD2n6vdalFrEDTXG7er3MZUbmDHHfqPWs670DwreXk91Jrah5pGkYLdxYBJyccV1unVhQcKbjduXXo+xyKpSnXU6ilZKPTqu5y3hSCK58TWcU8SSxsX3I6hgfkbsa76702GO5dYNJ0ExjGPOwrdO4CGuR0K3trXx/DBZzedbo7hJNwbcPLPccGux1G082/kf+ztFmzj57lsSHgdfkP8+lZ5dTth5JrVSt+C8maZjU5sRFp6OKf4vzRW+wf9Qjw5/wB9/wD2uuf8eW1jbNYfYoLaLcJN/kIq5+7jOPxrf+wD/oE+HP8Avv8A+11leNrC1tdFspYbO0gleQbzboAD8pyAQBkZq8ZC+Gnp2/P0RGDnbEw17/l6s4SiiivmT6YKKKKACiiigAooooAKKKKAJIZ5beVZYJXikXo6MVI/EUTTzXMrSzyvLI3V3YsT+JqOind2t0FZXv1Cp5b26ngSGa5mkijxsR5CVXAwMA9OKgooTa2BpPVhRRRSGFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAFFFFABRRRQAUUUUAf/Z', NULL, 'bizAdmin', 'b7eb53ce42289cd168e21e37cc3b94333c3e2e691486548a06f5c5fae129f157', '业管', NULL, '男', NULL, '1995-01-01', '汉', '', '', '', '身份证', '', NULL, NULL, NULL, NULL, NULL, NULL, '9c8f683ccff14071f90f1f51ba83f069', 'bizAdmin@foxmail.com', NULL, NULL, '', '', '', '0001', '2022-07-04', '1543842934270394368', '1543899639134019584', 'C1', NULL, NULL, '127.0.0.1', '内网IP|内网IP', '2026-11-19 22:32:18', 'PC', '127.0.0.1', '内网IP|内网IP', '2026-11-20 13:17:44', 'APP', 'ENABLE', 2, NULL, 'NOT_DELETE', NULL, NULL, '2026-11-20 13:17:44', '-1');

-- ----------------------------
-- Table structure for sys_user_data_scope
-- ----------------------------
DROP TABLE IF EXISTS `sys_user_data_scope`;
CREATE TABLE `sys_user_data_scope`  (
  `USER_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '用户ID',
  `SCOPE_KEY` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '作用域KEY（orgId集合的MD5摘要）',
  `ORG_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '机构ID',
  PRIMARY KEY (`USER_ID`, `SCOPE_KEY`, `ORG_ID`) USING BTREE,
  INDEX `IDX_USER_SCOPE`(`USER_ID` ASC, `SCOPE_KEY` ASC) USING BTREE,
  INDEX `IDX_ORG_ID`(`ORG_ID` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '用户数据范围预计算' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of sys_user_data_scope
-- ----------------------------

-- ----------------------------
-- Table structure for sys_user_data_scope_map
-- ----------------------------
DROP TABLE IF EXISTS `sys_user_data_scope_map`;
CREATE TABLE `sys_user_data_scope_map`  (
  `USER_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '用户ID',
  `API_URL` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'API接口地址',
  `SCOPE_KEY` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '作用域KEY（orgId集合的MD5摘要）',
  PRIMARY KEY (`USER_ID`, `API_URL`) USING BTREE,
  INDEX `IDX_USER_SCOPE_KEY`(`USER_ID` ASC, `SCOPE_KEY` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '用户数据范围API映射' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of sys_user_data_scope_map
-- ----------------------------

-- ----------------------------
-- Table structure for sys_user_ext
-- ----------------------------
DROP TABLE IF EXISTS `sys_user_ext`;
CREATE TABLE `sys_user_ext`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `USER_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '用户id',
  `SOURCE_FROM_TYPE` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '来源类别',
  `PASSWORD_UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '密码修改日期',
  `ID_SOURCE_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '身份源ID',
  `ID_SOURCE_USER_ID` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '身份源用户ID',
  `OTP_SECRET_KEY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'OTP密钥',
  `HAS_BIND_OTP` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT 'OTP绑定状态',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '用户扩展' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of sys_user_ext
-- ----------------------------
INSERT INTO `sys_user_ext` VALUES ('2123234618670649346', '1543837863788879871', 'SYSTEM_ADD', '2026-11-19 09:59:23', NULL, NULL, '29d700dc8ab78b7e826a0c6e3803b77dc10f1ac046053cd22816856854fbd024002a8a4efa863ccad024ac0300bb40d2', 'NO', 'NOT_DELETE', '2026-11-19 09:59:16', '1543837863788879871', '2026-11-19 09:59:23', '1543837863788879871');

-- ----------------------------
-- Table structure for sys_user_password
-- ----------------------------
DROP TABLE IF EXISTS `sys_user_password`;
CREATE TABLE `sys_user_password`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `USER_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '用户id',
  `PASSWORD` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '密码',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '修改时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '修改用户',
  PRIMARY KEY (`ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '用户密码' ROW_FORMAT = DYNAMIC;

-- ----------------------------
-- Records of sys_user_password
-- ----------------------------
INSERT INTO `sys_user_password` VALUES ('2123234648597008386', '1543837863788879871', '207cf410532f92a47dee245ce9b11ff71f578ebd763eb3bbea44ebd043d018fb', 'NOT_DELETE', '2026-11-19 09:59:23', '1543837863788879871', NULL, NULL);

SET FOREIGN_KEY_CHECKS = 1;
