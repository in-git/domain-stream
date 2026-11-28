package vip.xiaonuo.biz.modular.asset.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;
import vip.xiaonuo.biz.modular.asset.entity.BizAssetResource;

/**
 * 远端素材资源 Mapper
 *
 * @author domain-stream
 * @date 2026/11/23
 */
public interface BizAssetResourceMapper extends BaseMapper<BizAssetResource> {

    /**
     * 按来源键查询，包含逻辑删除的数据。
     * 逻辑删除的行仍占用 SOURCE_KEY 唯一索引，重复采集时需要复用它，否则插入会触发唯一键冲突。
     *
     * @author wuwenlong
     * @date 2026/11/28 19:20
     */
    @Select("SELECT * FROM `biz_asset_resource` "
            + "WHERE `SOURCE_KEY` IN (#{sourceKey}, #{legacySourceKey}) LIMIT 1")
    BizAssetResource selectBySourceKeyIncludeDeleted(@Param("sourceKey") String sourceKey,
                                                     @Param("legacySourceKey") String legacySourceKey);

    /**
     * 恢复逻辑删除的采集记录，避免再次采集中断
     *
     * @author wuwenlong
     * @date 2026/11/28 19:20
     */
    @Update("UPDATE `biz_asset_resource` SET `DELETE_FLAG` = 'NOT_DELETE' WHERE `ID` = #{id}")
    int restoreById(@Param("id") String id);
}
