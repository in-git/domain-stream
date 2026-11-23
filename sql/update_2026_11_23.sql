-- ------------------------------------------------------------
-- Domain Stream 增量更新脚本（唯一维护文件）
-- 更新时间：2026-11-23
-- 包含：
--   1. 素材资源库：表、菜单、按钮、bizAdmin 权限、旧方案清理
--   2. 数据导出：清理旧版本可能写入的导出按钮与接口权限
--      导出数据库 / 导出文件资源不设置权限限制，登录用户均可使用
--   3. 通用评论：文章 / 视频 / 图文，支持无限层级回复
--
-- 说明：本文件可重复执行；后续所有需要更新的 SQL 继续追加到本文件。
-- ------------------------------------------------------------

-- ============================================================
-- 1. 素材资源库
-- ============================================================

CREATE TABLE IF NOT EXISTS `BIZ_ASSET_RESOURCE` (
  `ID` varchar(20) NOT NULL COMMENT '主键',
  `SOURCE` varchar(50) NULL DEFAULT NULL COMMENT '来源：ICONIFY/ICONS8/BING/PICSUM/WALLHAVEN',
  `SOURCE_KEY` varchar(300) NULL DEFAULT NULL COMMENT '来源唯一标识',
  `TYPE` varchar(20) NULL DEFAULT NULL COMMENT '类型：ICON/WALLPAPER',
  `TITLE` varchar(500) NULL DEFAULT NULL COMMENT '标题',
  `DESCRIPTION` varchar(1000) NULL DEFAULT NULL COMMENT '描述',
  `TAGS` varchar(500) NULL DEFAULT NULL COMMENT '标签，逗号分隔',
  `CATEGORY` varchar(100) NULL DEFAULT NULL COMMENT '分类（兼容旧数据，前台已不使用）',
  `LICENSE` varchar(200) NULL DEFAULT NULL COMMENT '许可',
  `AUTHOR` varchar(255) NULL DEFAULT NULL COMMENT '作者',
  `HOMEPAGE` varchar(1000) NULL DEFAULT NULL COMMENT '来源主页',
  `PREVIEW_URL` varchar(1000) NULL DEFAULT NULL COMMENT '远程预览地址',
  `IMAGE_URL` varchar(1000) NULL DEFAULT NULL COMMENT '远程原图地址',
  `SUFFIX` varchar(20) NULL DEFAULT NULL COMMENT '后缀',
  `IN_MATERIAL` varchar(10) NULL DEFAULT 'NO' COMMENT '是否已加入素材中心：YES/NO',
  `MATERIAL_FILE_ID` varchar(20) NULL DEFAULT NULL COMMENT '素材中心文件ID',
  `STATUS` varchar(20) NULL DEFAULT 'ACTIVE' COMMENT '状态：ACTIVE/HIDDEN',
  `DOWNLOADS` int NULL DEFAULT 0 COMMENT '下载次数',
  `DELETE_FLAG` varchar(255) NULL DEFAULT 'NOT_DELETE' COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '更新时间',
  `UPDATE_USER` varchar(20) NULL DEFAULT NULL COMMENT '更新用户',
  PRIMARY KEY (`ID`),
  UNIQUE INDEX `UK_ASSET_RESOURCE_KEY`(`SOURCE_KEY` ASC) USING BTREE,
  INDEX `IDX_ASSET_RESOURCE_TYPE`(`TYPE` ASC, `STATUS` ASC) USING BTREE,
  INDEX `IDX_ASSET_RESOURCE_MATERIAL`(`IN_MATERIAL` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '远端素材资源（加入素材中心时下载到本地）' ROW_FORMAT = DYNAMIC;

-- 素材分类：与素材中心 categoryCode 对齐（兼容保留，前台筛选已不使用）
INSERT IGNORE INTO `biz_category` (`ID`, `PARENT_ID`, `NAME`, `CODE`, `IMAGE`, `ICON`, `MODULE`, `DESCRIPTION`, `STATUS`, `SORT_CODE`, `REMARK`, `EXT_JSON`, `DELETE_FLAG`, `CREATE_TIME`, `CREATE_USER`)
VALUES ('2350010000000000041', '0', '图标', 'ICON', NULL, NULL, 'MATERIAL', '图标素材', 'ENABLE', 1, NULL, NULL, 'NOT_DELETE', NOW(), '1543837863788879871');

INSERT IGNORE INTO `biz_category` (`ID`, `PARENT_ID`, `NAME`, `CODE`, `IMAGE`, `ICON`, `MODULE`, `DESCRIPTION`, `STATUS`, `SORT_CODE`, `REMARK`, `EXT_JSON`, `DELETE_FLAG`, `CREATE_TIME`, `CREATE_USER`)
VALUES ('2350010000000000042', '0', '壁纸', 'WALLPAPER', NULL, NULL, 'MATERIAL', '壁纸素材', 'ENABLE', 2, NULL, NULL, 'NOT_DELETE', NOW(), '1543837863788879871');

-- 清理旧方案遗留的按钮与接口权限
DELETE FROM `sys_resource` WHERE `ID` IN ('2350010000000000011', '2350010000000000012', '2350010000000000013');
DELETE FROM `sys_relation` WHERE `TARGET_ID` LIKE '/biz/asset-candidate/%';
DELETE FROM `dev_job` WHERE `ID` = '2350010000000000051' OR `CODE` = 'assetResourceCollect';
DELETE FROM `sys_relation` WHERE `TARGET_ID` IN ('/biz/asset-resource/categories', '/biz/asset-resource/sites', '/biz/asset-resource/collect');

-- CMS 菜单：path 与前端路由 /biz-asset-resource 对应
INSERT IGNORE INTO `sys_resource` (`ID`, `PARENT_ID`, `TITLE`, `NAME`, `CODE`, `CATEGORY`, `MODULE`, `MENU_TYPE`, `PATH`, `COMPONENT`, `ICON`, `COLOR`, `VISIBLE`, `DISPLAY_LAYOUT`, `KEEP_LIVE`, `SORT_CODE`, `EXT_JSON`, `DELETE_FLAG`, `CREATE_TIME`, `CREATE_USER`)
VALUES ('2350010000000000001', '0', '素材资源库', 'assetResource', 'assetResource', 'MENU', '1548901111999773976', 'MENU', '/biz-asset-resource', 'biz/asset-resource/index', 'appstore-outlined', NULL, 'YES', 'YES', 'YES', 12, NULL, 'NOT_DELETE', NOW(), '1543837863788879871');

UPDATE `sys_resource`
SET `TITLE` = '素材资源库', `NAME` = 'assetResource', `CODE` = 'assetResource',
    `PATH` = '/biz-asset-resource', `COMPONENT` = 'biz/asset-resource/index',
    `ICON` = 'appstore-outlined', `DELETE_FLAG` = 'NOT_DELETE'
WHERE `ID` = '2350010000000000001';

-- 按钮权限：加入素材中心、采集素材
INSERT IGNORE INTO `sys_resource` (`ID`, `PARENT_ID`, `TITLE`, `NAME`, `CODE`, `CATEGORY`, `MODULE`, `MENU_TYPE`, `PATH`, `COMPONENT`, `ICON`, `COLOR`, `VISIBLE`, `DISPLAY_LAYOUT`, `KEEP_LIVE`, `SORT_CODE`, `EXT_JSON`, `DELETE_FLAG`, `CREATE_TIME`, `CREATE_USER`)
VALUES
('2350010000000000014', '2350010000000000001', '加入素材中心', NULL, 'bizAssetResourceAdd', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'NOT_DELETE', NOW(), '1543837863788879871'),
('2350010000000000015', '2350010000000000001', '采集素材', NULL, 'bizAssetResourceCollect', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, NULL, 'NOT_DELETE', NOW(), '1543837863788879871');

UPDATE `sys_resource`
SET `TITLE` = '加入素材中心', `CODE` = 'bizAssetResourceAdd', `PARENT_ID` = '2350010000000000001',
    `CATEGORY` = 'BUTTON', `DELETE_FLAG` = 'NOT_DELETE'
WHERE `ID` = '2350010000000000014';

UPDATE `sys_resource`
SET `TITLE` = '采集素材', `CODE` = 'bizAssetResourceCollect', `PARENT_ID` = '2350010000000000001',
    `CATEGORY` = 'BUTTON', `DELETE_FLAG` = 'NOT_DELETE'
WHERE `ID` = '2350010000000000015';

-- 角色 bizAdmin（业务管理员）获得菜单及其按钮
INSERT IGNORE INTO `sys_relation` (`ID`, `OBJECT_ID`, `TARGET_ID`, `CATEGORY`, `EXT_JSON`)
VALUES ('2350010000000000021', '1570687866138206209', '2350010000000000001', 'SYS_ROLE_HAS_RESOURCE',
'{"menuId":"2350010000000000001","buttonInfo":["2350010000000000014","2350010000000000015"]}');

UPDATE `sys_relation`
SET `EXT_JSON` = '{"menuId":"2350010000000000001","buttonInfo":["2350010000000000014","2350010000000000015"]}'
WHERE `ID` = '2350010000000000021';

-- 角色 bizAdmin 获得新增接口权限
INSERT IGNORE INTO `sys_relation` (`ID`, `OBJECT_ID`, `TARGET_ID`, `CATEGORY`, `EXT_JSON`)
VALUES
('2350010000000000031', '1570687866138206209', '/biz/asset-resource/page', 'SYS_ROLE_HAS_PERMISSION', '{"apiUrl":"/biz/asset-resource/page","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}'),
('2350010000000000032', '1570687866138206209', '/biz/asset-resource/add-to-material', 'SYS_ROLE_HAS_PERMISSION', '{"apiUrl":"/biz/asset-resource/add-to-material","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}'),
('2350010000000000033', '1570687866138206209', '/biz/asset-resource/media', 'SYS_ROLE_HAS_PERMISSION', '{"apiUrl":"/biz/asset-resource/media","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}');

-- ============================================================
-- 2. 数据导出：不做权限限制（清理旧版本可能写入的权限）
-- ============================================================

DELETE FROM `sys_resource`
WHERE `ID` IN ('2350010000000000071', '2350010000000000072')
   OR `CODE` IN ('bizExportDatabase', 'bizExportFiles');

DELETE FROM `sys_relation`
WHERE `ID` IN ('2350010000000000073', '2350010000000000074', '2350010000000000075', '2350010000000000076')
   OR `TARGET_ID` IN ('2350010000000000071', '2350010000000000072', '/biz/export/database', '/biz/export/files');

-- ============================================================
-- 3. 通用评论：文章 / 视频 / 图文，支持无限层级回复
-- ============================================================

CREATE TABLE IF NOT EXISTS `biz_comment` (
  `ID` varchar(20) NOT NULL COMMENT '主键',
  `TARGET_TYPE` varchar(20) NULL DEFAULT NULL COMMENT '内容类型：ARTICLE/VIDEO/IMAGE_TEXT',
  `TARGET_ID` varchar(20) NULL DEFAULT NULL COMMENT '内容ID',
  `USER_ID` varchar(20) NULL DEFAULT NULL COMMENT '评论用户ID',
  `CONTENT` varchar(500) NULL DEFAULT NULL COMMENT '评论内容',
  `ROOT_ID` varchar(20) NULL DEFAULT NULL COMMENT '根评论ID',
  `PARENT_ID` varchar(20) NULL DEFAULT NULL COMMENT '父评论ID，顶级为空',
  `PATH` varchar(1000) NULL DEFAULT NULL COMMENT '物化路径，如 /id1/id2/',
  `REPLY_TO_USER_ID` varchar(20) NULL DEFAULT NULL COMMENT '被回复用户ID',
  `REPLY_TO_NICKNAME` varchar(100) NULL DEFAULT NULL COMMENT '被回复用户昵称',
  `STATUS` varchar(20) NULL DEFAULT 'APPROVED' COMMENT 'APPROVED/PENDING/REJECTED',
  `IS_OFFICIAL` varchar(10) NULL DEFAULT 'NO' COMMENT '是否官方回复：YES/NO',
  `LIKE_COUNT` int NULL DEFAULT 0 COMMENT '点赞数',
  `IP` varchar(50) NULL DEFAULT NULL COMMENT '评论IP',
  `USER_AGENT` varchar(500) NULL DEFAULT NULL COMMENT '浏览器UA',
  `SORT_CODE` int NULL DEFAULT NULL COMMENT '排序',
  `REMARK` varchar(500) NULL DEFAULT NULL COMMENT '备注',
  `EXT_JSON` longtext NULL COMMENT '扩展信息',
  `DELETE_FLAG` varchar(255) NULL DEFAULT 'NOT_DELETE' COMMENT '删除标志',
  `CREATE_TIME` datetime NULL DEFAULT NULL COMMENT '创建时间',
  `CREATE_USER` varchar(20) NULL DEFAULT NULL COMMENT '创建用户',
  `UPDATE_TIME` datetime NULL DEFAULT NULL COMMENT '更新时间',
  `UPDATE_USER` varchar(20) NULL DEFAULT NULL COMMENT '更新用户',
  PRIMARY KEY (`ID`),
  INDEX `IDX_COMMENT_TARGET`(`TARGET_TYPE`, `TARGET_ID`, `STATUS`, `CREATE_TIME`) USING BTREE,
  INDEX `IDX_COMMENT_PARENT`(`PARENT_ID`) USING BTREE,
  INDEX `IDX_COMMENT_ROOT`(`ROOT_ID`) USING BTREE,
  INDEX `IDX_COMMENT_PATH`(`PATH`(255)) USING BTREE,
  INDEX `IDX_COMMENT_USER`(`USER_ID`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci COMMENT = '内容评论（无限层级回复）' ROW_FORMAT = DYNAMIC;

-- CMS 评论管理菜单
INSERT IGNORE INTO `sys_resource` (`ID`, `PARENT_ID`, `TITLE`, `NAME`, `CODE`, `CATEGORY`, `MODULE`, `MENU_TYPE`, `PATH`, `COMPONENT`, `ICON`, `COLOR`, `VISIBLE`, `DISPLAY_LAYOUT`, `KEEP_LIVE`, `SORT_CODE`, `EXT_JSON`, `DELETE_FLAG`, `CREATE_TIME`, `CREATE_USER`)
VALUES ('2350010000000000081', '0', '评论管理', 'comment', 'comment', 'MENU', '1548901111999773976', 'MENU', '/biz-comment', 'biz/comment/index', 'message-outlined', NULL, 'YES', 'YES', 'YES', 13, NULL, 'NOT_DELETE', NOW(), '1543837863788879871');

UPDATE `sys_resource`
SET `TITLE` = '评论管理', `NAME` = 'comment', `CODE` = 'comment',
    `PATH` = '/biz-comment', `COMPONENT` = 'biz/comment/index',
    `ICON` = 'message-outlined', `DELETE_FLAG` = 'NOT_DELETE'
WHERE `ID` = '2350010000000000081';

-- 评论按钮权限
INSERT IGNORE INTO `sys_resource` (`ID`, `PARENT_ID`, `TITLE`, `NAME`, `CODE`, `CATEGORY`, `MODULE`, `MENU_TYPE`, `PATH`, `COMPONENT`, `ICON`, `COLOR`, `VISIBLE`, `DISPLAY_LAYOUT`, `KEEP_LIVE`, `SORT_CODE`, `EXT_JSON`, `DELETE_FLAG`, `CREATE_TIME`, `CREATE_USER`)
VALUES
('2350010000000000082', '2350010000000000081', '审核评论', NULL, 'bizCommentAudit', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'NOT_DELETE', NOW(), '1543837863788879871'),
('2350010000000000083', '2350010000000000081', '删除评论', NULL, 'bizCommentDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, NULL, 'NOT_DELETE', NOW(), '1543837863788879871'),
('2350010000000000084', '2350010000000000081', '评论详情', NULL, 'bizCommentDetail', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, NULL, 'NOT_DELETE', NOW(), '1543837863788879871');

UPDATE `sys_resource` SET `TITLE`='审核评论', `CODE`='bizCommentAudit', `PARENT_ID`='2350010000000000081', `CATEGORY`='BUTTON', `DELETE_FLAG`='NOT_DELETE' WHERE `ID`='2350010000000000082';
UPDATE `sys_resource` SET `TITLE`='删除评论', `CODE`='bizCommentDelete', `PARENT_ID`='2350010000000000081', `CATEGORY`='BUTTON', `DELETE_FLAG`='NOT_DELETE' WHERE `ID`='2350010000000000083';
UPDATE `sys_resource` SET `TITLE`='评论详情', `CODE`='bizCommentDetail', `PARENT_ID`='2350010000000000081', `CATEGORY`='BUTTON', `DELETE_FLAG`='NOT_DELETE' WHERE `ID`='2350010000000000084';

-- bizAdmin 获得评论菜单与按钮
INSERT IGNORE INTO `sys_relation` (`ID`, `OBJECT_ID`, `TARGET_ID`, `CATEGORY`, `EXT_JSON`)
VALUES ('2350010000000000085', '1570687866138206209', '2350010000000000081', 'SYS_ROLE_HAS_RESOURCE',
'{"menuId":"2350010000000000081","buttonInfo":["2350010000000000082","2350010000000000083","2350010000000000084"]}');

UPDATE `sys_relation`
SET `EXT_JSON` = '{"menuId":"2350010000000000081","buttonInfo":["2350010000000000082","2350010000000000083","2350010000000000084"]}'
WHERE `ID` = '2350010000000000085';

INSERT IGNORE INTO `sys_relation` (`ID`, `OBJECT_ID`, `TARGET_ID`, `CATEGORY`, `EXT_JSON`)
VALUES
('2350010000000000086', '1570687866138206209', '/biz/comment/page', 'SYS_ROLE_HAS_PERMISSION', '{"apiUrl":"/biz/comment/page","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}'),
('2350010000000000087', '1570687866138206209', '/biz/comment/detail', 'SYS_ROLE_HAS_PERMISSION', '{"apiUrl":"/biz/comment/detail","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}'),
('2350010000000000088', '1570687866138206209', '/biz/comment/audit', 'SYS_ROLE_HAS_PERMISSION', '{"apiUrl":"/biz/comment/audit","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}'),
('2350010000000000089', '1570687866138206209', '/biz/comment/delete', 'SYS_ROLE_HAS_PERMISSION', '{"apiUrl":"/biz/comment/delete","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}');

-- ------------------------------------------------------------
-- 4. 客户端配置：是否允许评论（默认允许，兼容已有 CLIENT_CONFIG）
-- ------------------------------------------------------------

UPDATE `dev_config`
SET `CONFIG_VALUE` = JSON_SET(CAST(`CONFIG_VALUE` AS JSON), '$.allowComment', 'YES')
WHERE `CONFIG_KEY` = 'CLIENT_CONFIG'
  AND `DELETE_FLAG` = 'NOT_DELETE'
  AND JSON_VALID(`CONFIG_VALUE`)
  AND NOT JSON_CONTAINS_PATH(CAST(`CONFIG_VALUE` AS JSON), 'one', '$.allowComment');

