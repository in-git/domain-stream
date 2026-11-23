package vip.xiaonuo.biz.modular.asset.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import vip.xiaonuo.biz.modular.asset.param.BizAssetResourcePageParam;
import vip.xiaonuo.biz.modular.asset.vo.AssetTypeSiteVo;
import vip.xiaonuo.biz.modular.asset.vo.BizAssetResourceVo;

import java.util.List;

/**
 * 远端素材资源服务
 *
 * @author domain-stream
 * @date 2026/11/23
 */
public interface BizAssetResourceService {

    Page<BizAssetResourceVo> page(BizAssetResourcePageParam param);

    /** 获取站点树：类型 -> 站点；站点由已配置来源固定生成，数量基于全表统计 */
    List<AssetTypeSiteVo> siteTree();

    /** 把选中的远端素材下载并写入素材中心本地文件库 */
    void addToMaterial(List<String> ids);

    /** 手动采集：只发现元数据并入库，不下载文件，返回采集摘要 */
    String collectWithConfig(String extJson);

    /** 远程图片按需代理，不落地缓存 */
    byte[] proxy(String id, boolean full);

    /** 根据资源后缀推断代理响应的 Content-Type */
    String contentType(String id);
}
