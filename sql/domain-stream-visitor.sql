-- ============================================================
-- domain-stream 首页访客统计 建表脚本
-- 模块：访客访问事件明细(BIZ_VISITOR_EVENT)
-- 用途：为 CMS 后台首页仪表盘提供 真实的 PV/UV/在线人数/趋势/来源/设备/模块分布/热门内容 数据源
-- 规范：遵循小诺 Snowy 框架数据库约定
--   - 表名/字段名大写，下划线分隔，BIZ_ 业务前缀
--   - 主键 ID varchar(20)（ASSIGN_ID 雪花ID）
--   - 审计字段 DELETE_FLAG / CREATE_TIME / CREATE_USER / UPDATE_TIME / UPDATE_USER
--   - 逻辑删除：正常 NOT_DELETE，删除 DELETED
-- 数据库：MySQL 5.7 / 8.0，utf8mb4
-- 说明：请在 MySQL 客户端（Navicat / DBeaver / 命令行）中执行本文件
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

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

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- 后端接口（snowy-plugin-biz / BizVisitorController）：
--   GET  /biz/visitor/dashboard   首页访客聚合数据（对齐 CMS DashboardPayload）
--   POST /biz/visitor/track       上报一次访问（PV/内容浏览）
--   POST /biz/visitor/heartbeat   上报心跳（维持在线人数）
-- ============================================================
