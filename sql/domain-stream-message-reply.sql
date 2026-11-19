-- ------------------------------------------------------------------
-- 留言回复表（增量迁移，可重复执行）
-- 用途：让前台任何登录访客都能回复任意一条已通过的留言（包括自己发布的
--       留言），回复默认即时展示；独立于 BIZ_MESSAGE.REPLY 的管理员回复。
-- 执行：在业务库直接执行本文件即可，无需重跑 domain-stream-modules.sql。
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `BIZ_MESSAGE_REPLY`  (
  `ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '主键',
  `MESSAGE_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT '所属留言ID',
  `PARENT_REPLY_ID` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '被回复的回复ID（可空）',
  `REPLY_TO_NICKNAME` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '被回复者昵称',
  `NICKNAME` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '回复人昵称',
  `AVATAR` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '回复人头像',
  `EMAIL` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '回复人邮箱',
  `CONTENT` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '回复内容',
  `DELETE_FLAG` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT 'NOT_DELETE' COMMENT '删除标志：NOT_DELETE正常/DELETED删除',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '更新时间',
  `UPDATE_USER` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL COMMENT '更新用户',
  PRIMARY KEY (`ID`) USING BTREE,
  INDEX `IDX_REPLY_MESSAGE_ID` (`MESSAGE_ID`) USING BTREE,
  INDEX `IDX_REPLY_CREATE_TIME` (`CREATE_TIME`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '留言回复' ROW_FORMAT = Dynamic;
