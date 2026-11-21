-- ============================================================
-- 用户喜欢/点赞能力（增量迁移脚本）
-- ------------------------------------------------------------
-- 内容：
--   1. 新增 biz_user_like，记录登录用户对视频/图文/文章的喜欢状态
--   2. 复用 biz_video / biz_graphic / biz_article 现有 LIKE_COUNT 字段作为展示数量
--   3. 唯一索引保证同一用户对同一内容只有一条记录
--
-- 适用：已有数据库执行；全新库建议同步把本表结构合并进 snowy_mysql.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS `biz_user_like` (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `USER_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '点赞用户ID，关联 CLIENT_USER.ID',
  `TARGET_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '目标内容ID',
  `TARGET_TYPE` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '目标类型：IMAGE_TEXT-图文，ARTICLE-文章，VIDEO-视频',
  `STATUS` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT 'LIKED' COMMENT '喜欢状态：LIKED-已喜欢，UNLIKED-已取消',
  `LIKE_TIME` datetime NULL DEFAULT NULL COMMENT '首次喜欢时间',
  `REMARK` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '备注',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'NOT_DELETE' COMMENT '删除标志：NOT_DELETE正常/DELETED删除',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '更新时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '更新用户',
  PRIMARY KEY (`ID`) USING BTREE,
  UNIQUE INDEX `UK_USER_LIKE`(`USER_ID` ASC, `TARGET_TYPE` ASC, `TARGET_ID` ASC) USING BTREE,
  INDEX `IDX_LIKE_USER_TIME`(`USER_ID` ASC, `LIKE_TIME` ASC) USING BTREE,
  INDEX `IDX_LIKE_TARGET`(`TARGET_TYPE` ASC, `TARGET_ID` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '用户喜欢/点赞记录' ROW_FORMAT = DYNAMIC;
