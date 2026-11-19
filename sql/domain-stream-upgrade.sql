-- ============================================================
-- domain-stream 业务升级脚本（合并版）
-- 内容：
--   一、业务模块建表：通用分类(BIZ_CATEGORY)、文章(BIZ_ARTICLE)、视频(BIZ_VIDEO)、
--       图文(BIZ_GRAPHIC)、访客访问事件明细(BIZ_VISITOR_EVENT)、留言(BIZ_MESSAGE，
--       含 PARENT_ID 递归回复结构，无独立回复表)
--   二、素材库改造：DEV_FILE 增加素材分类字段并按后缀回填存量数据
-- 规范：遵循小诺 Snowy 框架数据库约定
--   - 分类关联：BIZ_ARTICLE/BIZ_VIDEO/BIZ_GRAPHIC 的 CATEGORY 字段存 BIZ_CATEGORY.CODE
--   - 分类模块：BIZ_CATEGORY.MODULE 区分 ARTICLE/VIDEO/GRAPHIC/IMAGE/COMMON(通用)
--   - 表名/字段名大写，下划线分隔，BIZ_ 业务前缀
--   - 主键 ID varchar(20)（ASSIGN_ID 雪花ID）
--   - 审计字段 DELETE_FLAG / CREATE_TIME / CREATE_USER / UPDATE_TIME / UPDATE_USER
--   - 逻辑删除：正常 NOT_DELETE，删除 DELETED
--   - 扩展字段 EXT_JSON，排序字段 SORT_CODE
-- 数据库：MySQL 5.7 / 8.0，utf8mb4
-- 注意：第一部分会 DROP 重建业务表（先备份业务数据）；第二部分如已加列请跳过
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 一、业务模块建表
-- ============================================================

-- ----------------------------
-- Table structure for BIZ_CATEGORY  通用分类（文章/视频/图文共用）
-- ----------------------------
DROP TABLE IF EXISTS `BIZ_CATEGORY`;
CREATE TABLE `BIZ_CATEGORY`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `PARENT_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT '0' COMMENT '父级ID，顶级为0',
  `NAME` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类名称',
  `CODE` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类编码，业务表CATEGORY字段关联此编码',
  `IMAGE` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类图片',
  `ICON` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类图标',
  `MODULE` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '适用模块：ARTICLE文章/VIDEO视频/GRAPHIC图文/IMAGE图片/COMMON通用',
  `DESCRIPTION` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '分类描述',
  `STATUS` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '状态：ENABLE启用/DISABLE禁用',
  `SORT_CODE` int(11) NULL DEFAULT NULL COMMENT '排序',
  `REMARK` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志：NOT_DELETE正常/DELETED删除',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '更新时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '更新用户',
  PRIMARY KEY (`ID`) USING BTREE,
  UNIQUE INDEX `UK_CATEGORY_CODE_MODULE` (`CODE`, `MODULE`) USING BTREE,
  INDEX `IDX_CATEGORY_PARENT` (`PARENT_ID`) USING BTREE,
  INDEX `IDX_CATEGORY_MODULE` (`MODULE`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '通用分类（文章/视频/图文）' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of BIZ_CATEGORY
-- ----------------------------

-- ----------------------------
-- Table structure for BIZ_ARTICLE  文章
-- ----------------------------
DROP TABLE IF EXISTS `BIZ_ARTICLE`;
CREATE TABLE `BIZ_ARTICLE`  (
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
  `VIEW_COUNT` int(11) NULL DEFAULT 0 COMMENT '浏览量',
  `LIKE_COUNT` int(11) NULL DEFAULT 0 COMMENT '点赞量',
  `COMMENT_COUNT` int(11) NULL DEFAULT 0 COMMENT '评论量',
  `IS_TOP` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '是否置顶：Y是/N否',
  `IS_RECOMMEND` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '是否推荐：Y是/N否',
  `SORT_CODE` int(11) NULL DEFAULT NULL COMMENT '排序',
  `REMARK` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志：NOT_DELETE正常/DELETED删除',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '更新时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '更新用户',
  PRIMARY KEY (`ID`) USING BTREE,
  INDEX `IDX_ARTICLE_CATEGORY` (`CATEGORY`) USING BTREE,
  INDEX `IDX_ARTICLE_STATUS` (`STATUS`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '文章' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of BIZ_ARTICLE
-- ----------------------------

-- ----------------------------
-- Table structure for BIZ_VIDEO  视频
-- ----------------------------
DROP TABLE IF EXISTS `BIZ_VIDEO`;
CREATE TABLE `BIZ_VIDEO`  (
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
  `VIEW_COUNT` int(11) NULL DEFAULT 0 COMMENT '播放量',
  `LIKE_COUNT` int(11) NULL DEFAULT 0 COMMENT '点赞量',
  `COMMENT_COUNT` int(11) NULL DEFAULT 0 COMMENT '评论量',
  `IS_TOP` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '是否置顶：Y是/N否',
  `IS_RECOMMEND` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '是否推荐：Y是/N否',
  `SORT_CODE` int(11) NULL DEFAULT NULL COMMENT '排序',
  `REMARK` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志：NOT_DELETE正常/DELETED删除',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '更新时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '更新用户',
  PRIMARY KEY (`ID`) USING BTREE,
  INDEX `IDX_VIDEO_CATEGORY` (`CATEGORY`) USING BTREE,
  INDEX `IDX_VIDEO_STATUS` (`STATUS`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '视频' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of BIZ_VIDEO
-- ----------------------------

-- ----------------------------
-- Table structure for BIZ_GRAPHIC  图文
-- ----------------------------
DROP TABLE IF EXISTS `BIZ_GRAPHIC`;
CREATE TABLE `BIZ_GRAPHIC`  (
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
  `VIEW_COUNT` int(11) NULL DEFAULT 0 COMMENT '浏览量',
  `LIKE_COUNT` int(11) NULL DEFAULT 0 COMMENT '点赞量',
  `COMMENT_COUNT` int(11) NULL DEFAULT 0 COMMENT '评论量',
  `IS_TOP` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '是否置顶：Y是/N否',
  `IS_RECOMMEND` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '是否推荐：Y是/N否',
  `SORT_CODE` int(11) NULL DEFAULT NULL COMMENT '排序',
  `REMARK` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '删除标志：NOT_DELETE正常/DELETED删除',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '更新时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '更新用户',
  PRIMARY KEY (`ID`) USING BTREE,
  INDEX `IDX_GRAPHIC_CATEGORY` (`CATEGORY`) USING BTREE,
  INDEX `IDX_GRAPHIC_STATUS` (`STATUS`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '图文' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of BIZ_GRAPHIC
-- ----------------------------

-- ----------------------------
-- Table structure for BIZ_VISITOR_EVENT  访客访问事件明细
-- ----------------------------
DROP TABLE IF EXISTS `BIZ_VISITOR_EVENT`;
CREATE TABLE `BIZ_VISITOR_EVENT`  (
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
  `DURATION_SEC` int(11) NULL DEFAULT 0 COMMENT '停留时长（秒）',
  `REMARK` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'NOT_DELETE' COMMENT '删除标志：NOT_DELETE正常/DELETED删除',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '访问发生时间（同时作为审计创建时间）',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '更新时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '更新用户',
  PRIMARY KEY (`ID`) USING BTREE,
  INDEX `IDX_VISITOR_CREATE_TIME` (`CREATE_TIME`) USING BTREE,
  INDEX `IDX_VISITOR_VISITOR_ID` (`VISITOR_ID`) USING BTREE,
  INDEX `IDX_VISITOR_EVENT_TYPE` (`EVENT_TYPE`) USING BTREE,
  INDEX `IDX_VISITOR_CONTENT_ID` (`CONTENT_ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '访客访问事件明细' ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for BIZ_MESSAGE  留言（单表递归：PARENT_ID 为空为顶级留言，否则为访客回复）
-- ----------------------------
-- 若历史库中存在已废弃的独立回复表，先清理
DROP TABLE IF EXISTS `BIZ_MESSAGE_REPLY`;
DROP TABLE IF EXISTS `BIZ_MESSAGE`;
CREATE TABLE `BIZ_MESSAGE`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `PARENT_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '父留言ID，顶级留言为空，访客回复指向被回复的留言或回复（单表递归）',
  `REPLY_TO_NICKNAME` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '被回复者昵称，用于前台展示「回复 @xxx」',
  `USER_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '留言用户ID',
  `CONTENT` varchar(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '留言内容',
  `STATUS` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'PENDING' COMMENT '状态：PENDING待审核/APPROVED已通过/REJECTED已拒绝',
  `REPLY` varchar(2000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '管理员回复内容',
  `REPLY_TIME` datetime NULL DEFAULT NULL COMMENT '回复时间',
  `REPLY_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '回复人',
  `IP` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '留言IP',
  `USER_AGENT` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '浏览器UA',
  `SORT_CODE` int(11) NULL DEFAULT NULL COMMENT '排序',
  `REMARK` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `EXT_JSON` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'NOT_DELETE' COMMENT '删除标志：NOT_DELETE正常/DELETED删除',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '更新时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '更新用户',
  PRIMARY KEY (`ID`) USING BTREE,
  INDEX `IDX_MESSAGE_PARENT_ID` (`PARENT_ID`) USING BTREE,
  INDEX `IDX_MESSAGE_STATUS` (`STATUS`) USING BTREE,
  INDEX `IDX_MESSAGE_CREATE_TIME` (`CREATE_TIME`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '留言' ROW_FORMAT = Dynamic;



-- ============================================================
-- 二、素材库改造：DEV_FILE 增加素材分类字段，并按后缀回填存量数据
-- 执行前请备份 DEV_FILE 表；CATEGORY 列已存在时跳过本段
-- ============================================================

ALTER TABLE `DEV_FILE`
  ADD COLUMN `CATEGORY` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '素材分类（IMAGE/VIDEO/AUDIO/DOC/OTHER）' AFTER `SUFFIX`;

-- 存量数据按后缀回填分类
UPDATE `DEV_FILE` SET `CATEGORY` = 'VIDEO' WHERE LOWER(`SUFFIX`) IN
  ('mp4', 'webm', 'mov', 'avi', 'mkv', 'flv', 'ogv', 'm4v', 'wmv', '3gp', 'mpg', 'mpeg', 'ts');

UPDATE `DEV_FILE` SET `CATEGORY` = 'AUDIO' WHERE LOWER(`SUFFIX`) IN
  ('mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac', 'wma', 'amr', 'opus', 'mid', 'midi');

UPDATE `DEV_FILE` SET `CATEGORY` = 'IMAGE' WHERE LOWER(`SUFFIX`) IN
  ('jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'ico', 'svg', 'psd', 'tif', 'tiff');

UPDATE `DEV_FILE` SET `CATEGORY` = 'DOC' WHERE LOWER(`SUFFIX`) IN
  ('pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv', 'json', 'xml',
   'yml', 'yaml', 'html', 'htm', 'wps', 'ofd');

UPDATE `DEV_FILE` SET `CATEGORY` = 'OTHER' WHERE `CATEGORY` IS NULL;

SET FOREIGN_KEY_CHECKS = 1;
