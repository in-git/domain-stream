-- ============================================================
-- 素材中心分类能力升级（增量迁移脚本）
-- ------------------------------------------------------------
-- 内容：
--   1. dev_file 新增 CATEGORY_CODE 字段，关联通用分类 BIZ_CATEGORY.CODE
--      （原有 CATEGORY 字段是按后缀推断的文件类型 IMAGE/VIDEO/...，不能复用）
--   2. biz_category.MODULE 注释新增 MATERIAL 素材模块
--   3. 可选：插入一个 MATERIAL 模块的示例分类
--
-- 适用：已有数据库执行；全新库请直接使用 snowy_mysql.sql（已包含以上变更）
-- 执行后需重启后端（MyBatis-Plus 实体与表字段映射在启动时加载）
-- ============================================================

-- 1. 文件表新增通用分类编码字段
ALTER TABLE `dev_file`
    ADD COLUMN `CATEGORY_CODE` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci
        NULL DEFAULT NULL COMMENT '通用分类编码，关联 BIZ_CATEGORY.CODE（素材中心分类）'
        AFTER `CATEGORY`;

-- 2. 通用分类表模块注释补充 MATERIAL
ALTER TABLE `biz_category`
    MODIFY COLUMN `MODULE` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci
        NULL DEFAULT NULL COMMENT '适用模块：ARTICLE文章/VIDEO视频/GRAPHIC图文/IMAGE图片/MATERIAL素材/COMMON通用';

-- 3. 索引：便于按分类编码检索素材
ALTER TABLE `dev_file`
    ADD INDEX `IDX_FILE_CATEGORY_CODE` (`CATEGORY_CODE` ASC);

-- 4. 可选：MATERIAL 模块示例分类（按需执行；ID 请按现有数据规则调整）
-- INSERT INTO `biz_category`
-- (`ID`, `PARENT_ID`, `NAME`, `CODE`, `MODULE`, `DESCRIPTION`, `STATUS`, `SORT_CODE`, `DELETE_FLAG`, `CREATE_TIME`, `CREATE_USER`)
-- VALUES
-- ('1784600000000000101', '0', '通用素材', 'MATERIAL_COMMON', 'MATERIAL', '素材中心默认分类', 'ENABLE', 1, 'NOT_DELETE', NOW(), '1543837863788879873');
