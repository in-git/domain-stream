-- ----------------------------
-- 业务字典：素材类型字典（ASSET_TYPE）
-- 1. DEV_DICT 增加 ASSET_TYPE 类型及图片/视频/SVG/图标字典项
-- 2. SYS_RESOURCE 增加「业务字典」菜单与新增/编辑/删除按钮
-- 3. 为业务角色与超级管理员补充资源/接口权限
-- 可重复执行：字典与资源均按固定 ID/存在性判断后插入
-- ----------------------------

-- 1. 字典类型：素材类型
INSERT INTO `dev_dict`
(`ID`, `PARENT_ID`, `DICT_LABEL`, `DICT_VALUE`, `DICT_COLOR`, `CODE`, `CATEGORY`, `SORT_CODE`, `EXT_JSON`, `DELETE_FLAG`, `CREATE_TIME`, `CREATE_USER`)
SELECT '2401010000000000001', '0', '素材类型', 'ASSET_TYPE', 'default', 'assetType', 'BIZ', 10, NULL, 'NOT_DELETE', NOW(), '1543837863788879871'
FROM DUAL
WHERE NOT EXISTS (
    SELECT 1 FROM `dev_dict`
    WHERE `CATEGORY` = 'BIZ' AND `PARENT_ID` = '0' AND `DICT_VALUE` = 'ASSET_TYPE' AND `DELETE_FLAG` = 'NOT_DELETE'
);

SET @ASSET_TYPE_ID := (
    SELECT `ID` FROM `dev_dict`
    WHERE `CATEGORY` = 'BIZ' AND `PARENT_ID` = '0' AND `DICT_VALUE` = 'ASSET_TYPE' AND `DELETE_FLAG` = 'NOT_DELETE'
    LIMIT 1
);

-- 2. 字典项：图片/视频/SVG/图标
INSERT INTO `dev_dict`
(`ID`, `PARENT_ID`, `DICT_LABEL`, `DICT_VALUE`, `DICT_COLOR`, `CODE`, `CATEGORY`, `SORT_CODE`, `EXT_JSON`, `DELETE_FLAG`, `CREATE_TIME`, `CREATE_USER`)
SELECT '2401010000000000002', @ASSET_TYPE_ID, '图片', 'IMAGE', 'blue', 'assetImage', 'BIZ', 10, NULL, 'NOT_DELETE', NOW(), '1543837863788879871'
FROM DUAL
WHERE @ASSET_TYPE_ID IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `dev_dict`
    WHERE `CATEGORY` = 'BIZ' AND `PARENT_ID` = @ASSET_TYPE_ID AND `DICT_VALUE` = 'IMAGE' AND `DELETE_FLAG` = 'NOT_DELETE'
  );

INSERT INTO `dev_dict`
(`ID`, `PARENT_ID`, `DICT_LABEL`, `DICT_VALUE`, `DICT_COLOR`, `CODE`, `CATEGORY`, `SORT_CODE`, `EXT_JSON`, `DELETE_FLAG`, `CREATE_TIME`, `CREATE_USER`)
SELECT '2401010000000000003', @ASSET_TYPE_ID, '视频', 'VIDEO', 'green', 'assetVideo', 'BIZ', 20, NULL, 'NOT_DELETE', NOW(), '1543837863788879871'
FROM DUAL
WHERE @ASSET_TYPE_ID IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `dev_dict`
    WHERE `CATEGORY` = 'BIZ' AND `PARENT_ID` = @ASSET_TYPE_ID AND `DICT_VALUE` = 'VIDEO' AND `DELETE_FLAG` = 'NOT_DELETE'
  );

INSERT INTO `dev_dict`
(`ID`, `PARENT_ID`, `DICT_LABEL`, `DICT_VALUE`, `DICT_COLOR`, `CODE`, `CATEGORY`, `SORT_CODE`, `EXT_JSON`, `DELETE_FLAG`, `CREATE_TIME`, `CREATE_USER`)
SELECT '2401010000000000004', @ASSET_TYPE_ID, 'SVG', 'SVG', 'orange', 'assetSvg', 'BIZ', 30, NULL, 'NOT_DELETE', NOW(), '1543837863788879871'
FROM DUAL
WHERE @ASSET_TYPE_ID IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `dev_dict`
    WHERE `CATEGORY` = 'BIZ' AND `PARENT_ID` = @ASSET_TYPE_ID AND `DICT_VALUE` = 'SVG' AND `DELETE_FLAG` = 'NOT_DELETE'
  );

INSERT INTO `dev_dict`
(`ID`, `PARENT_ID`, `DICT_LABEL`, `DICT_VALUE`, `DICT_COLOR`, `CODE`, `CATEGORY`, `SORT_CODE`, `EXT_JSON`, `DELETE_FLAG`, `CREATE_TIME`, `CREATE_USER`)
SELECT '2401010000000000005', @ASSET_TYPE_ID, '图标', 'ICON', 'purple', 'assetIcon', 'BIZ', 40, NULL, 'NOT_DELETE', NOW(), '1543837863788879871'
FROM DUAL
WHERE @ASSET_TYPE_ID IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM `dev_dict`
    WHERE `CATEGORY` = 'BIZ' AND `PARENT_ID` = @ASSET_TYPE_ID AND `DICT_VALUE` = 'ICON' AND `DELETE_FLAG` = 'NOT_DELETE'
  );

-- 3. 业务字典管理菜单
INSERT INTO `sys_resource`
(`ID`, `PARENT_ID`, `TITLE`, `NAME`, `CODE`, `CATEGORY`, `MODULE`, `MENU_TYPE`, `PATH`, `COMPONENT`, `ICON`, `COLOR`, `VISIBLE`, `DISPLAY_LAYOUT`, `KEEP_LIVE`, `SORT_CODE`, `EXT_JSON`, `DELETE_FLAG`, `CREATE_TIME`, `CREATE_USER`)
SELECT '2350010000000000101', '0', '业务字典', 'businessDict', 'businessDict', 'MENU', '1548901111999773976', 'MENU', '/biz-business-dict', 'biz/business-dict/index', 'read-outlined', NULL, 'YES', 'YES', 'YES', 16, NULL, 'NOT_DELETE', NOW(), '1543837863788879871'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `sys_resource` WHERE `ID` = '2350010000000000101');

-- 4. 业务字典菜单按钮
INSERT INTO `sys_resource`
(`ID`, `PARENT_ID`, `TITLE`, `NAME`, `CODE`, `CATEGORY`, `MODULE`, `MENU_TYPE`, `PATH`, `COMPONENT`, `ICON`, `COLOR`, `VISIBLE`, `DISPLAY_LAYOUT`, `KEEP_LIVE`, `SORT_CODE`, `EXT_JSON`, `DELETE_FLAG`, `CREATE_TIME`, `CREATE_USER`)
SELECT '2350010000000000102', '2350010000000000101', '新增业务字典', NULL, 'bizBusinessDictAdd', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, NULL, 'NOT_DELETE', NOW(), '1543837863788879871'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `sys_resource` WHERE `ID` = '2350010000000000102');

INSERT INTO `sys_resource`
(`ID`, `PARENT_ID`, `TITLE`, `NAME`, `CODE`, `CATEGORY`, `MODULE`, `MENU_TYPE`, `PATH`, `COMPONENT`, `ICON`, `COLOR`, `VISIBLE`, `DISPLAY_LAYOUT`, `KEEP_LIVE`, `SORT_CODE`, `EXT_JSON`, `DELETE_FLAG`, `CREATE_TIME`, `CREATE_USER`)
SELECT '2350010000000000103', '2350010000000000101', '编辑业务字典', NULL, 'bizBusinessDictEdit', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 2, NULL, 'NOT_DELETE', NOW(), '1543837863788879871'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `sys_resource` WHERE `ID` = '2350010000000000103');

INSERT INTO `sys_resource`
(`ID`, `PARENT_ID`, `TITLE`, `NAME`, `CODE`, `CATEGORY`, `MODULE`, `MENU_TYPE`, `PATH`, `COMPONENT`, `ICON`, `COLOR`, `VISIBLE`, `DISPLAY_LAYOUT`, `KEEP_LIVE`, `SORT_CODE`, `EXT_JSON`, `DELETE_FLAG`, `CREATE_TIME`, `CREATE_USER`)
SELECT '2350010000000000104', '2350010000000000101', '删除业务字典', NULL, 'bizBusinessDictDelete', 'BUTTON', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 3, NULL, 'NOT_DELETE', NOW(), '1543837863788879871'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `sys_resource` WHERE `ID` = '2350010000000000104');

-- 5. 业务角色授予菜单与按钮
INSERT IGNORE INTO `sys_relation` (`ID`, `OBJECT_ID`, `TARGET_ID`, `CATEGORY`, `EXT_JSON`)
VALUES (
    '2401020000000000001',
    '1570687866138206209',
    '2350010000000000101',
    'SYS_ROLE_HAS_RESOURCE',
    '{"menuId":"2350010000000000101","buttonInfo":["2350010000000000102","2350010000000000103","2350010000000000104"]}'
);

-- 6. 业务角色接口权限
INSERT IGNORE INTO `sys_relation` (`ID`, `OBJECT_ID`, `TARGET_ID`, `CATEGORY`, `EXT_JSON`) VALUES
('2401030000000000001', '1570687866138206209', '/biz/business-dict/type/list', 'SYS_ROLE_HAS_PERMISSION', '{"apiUrl":"/biz/business-dict/type/list","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}'),
('2401030000000000002', '1570687866138206209', '/biz/business-dict/type/add', 'SYS_ROLE_HAS_PERMISSION', '{"apiUrl":"/biz/business-dict/type/add","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}'),
('2401030000000000003', '1570687866138206209', '/biz/business-dict/type/edit', 'SYS_ROLE_HAS_PERMISSION', '{"apiUrl":"/biz/business-dict/type/edit","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}'),
('2401030000000000004', '1570687866138206209', '/biz/business-dict/type/delete', 'SYS_ROLE_HAS_PERMISSION', '{"apiUrl":"/biz/business-dict/type/delete","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}'),
('2401030000000000005', '1570687866138206209', '/biz/business-dict/item/list', 'SYS_ROLE_HAS_PERMISSION', '{"apiUrl":"/biz/business-dict/item/list","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}'),
('2401030000000000006', '1570687866138206209', '/biz/business-dict/item/add', 'SYS_ROLE_HAS_PERMISSION', '{"apiUrl":"/biz/business-dict/item/add","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}'),
('2401030000000000007', '1570687866138206209', '/biz/business-dict/item/edit', 'SYS_ROLE_HAS_PERMISSION', '{"apiUrl":"/biz/business-dict/item/edit","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}'),
('2401030000000000008', '1570687866138206209', '/biz/business-dict/item/delete', 'SYS_ROLE_HAS_PERMISSION', '{"apiUrl":"/biz/business-dict/item/delete","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}');

-- 7. 超级管理员接口权限
INSERT IGNORE INTO `sys_relation` (`ID`, `OBJECT_ID`, `TARGET_ID`, `CATEGORY`, `EXT_JSON`) VALUES
('2401040000000000001', '1543837863788879871', '/biz/business-dict/type/list', 'SYS_USER_HAS_PERMISSION', '{"apiUrl":"/biz/business-dict/type/list","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}'),
('2401040000000000002', '1543837863788879871', '/biz/business-dict/type/add', 'SYS_USER_HAS_PERMISSION', '{"apiUrl":"/biz/business-dict/type/add","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}'),
('2401040000000000003', '1543837863788879871', '/biz/business-dict/type/edit', 'SYS_USER_HAS_PERMISSION', '{"apiUrl":"/biz/business-dict/type/edit","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}'),
('2401040000000000004', '1543837863788879871', '/biz/business-dict/type/delete', 'SYS_USER_HAS_PERMISSION', '{"apiUrl":"/biz/business-dict/type/delete","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}'),
('2401040000000000005', '1543837863788879871', '/biz/business-dict/item/list', 'SYS_USER_HAS_PERMISSION', '{"apiUrl":"/biz/business-dict/item/list","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}'),
('2401040000000000006', '1543837863788879871', '/biz/business-dict/item/add', 'SYS_USER_HAS_PERMISSION', '{"apiUrl":"/biz/business-dict/item/add","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}'),
('2401040000000000007', '1543837863788879871', '/biz/business-dict/item/edit', 'SYS_USER_HAS_PERMISSION', '{"apiUrl":"/biz/business-dict/item/edit","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}'),
('2401040000000000008', '1543837863788879871', '/biz/business-dict/item/delete', 'SYS_USER_HAS_PERMISSION', '{"apiUrl":"/biz/business-dict/item/delete","scopeCategory":"SCOPE_ALL","scopeDefineOrgIdList":[]}');
