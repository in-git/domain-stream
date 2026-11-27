package vip.xiaonuo.biz.modular.asset.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import vip.xiaonuo.biz.modular.asset.param.BizAssetCollectUrlParam;
import vip.xiaonuo.biz.modular.asset.param.BizAssetResourcePageParam;
import vip.xiaonuo.biz.modular.asset.vo.AssetCollectEventVo;
import vip.xiaonuo.biz.modular.asset.vo.BizAssetResourceVo;

import java.util.List;
import java.util.function.Consumer;

/**
 * 远端素材资源服务
 *
 * @author domain-stream
 * @date 2026/11/23
 */
public interface BizAssetResourceService {

    Page<BizAssetResourceVo> page(BizAssetResourcePageParam param);

    /** 把选中的远端素材下载并写入素材中心本地文件库 */
    void addToMaterial(List<String> ids);

    /** 从资源库删除记录（逻辑删除，不删除已加入素材中心的文件） */
    void delete(List<String> ids);

    /** 按用户输入的网址采集资源：下载后写入素材中心，并在素材资源库登记 */
    String collectUrl(BizAssetCollectUrlParam param);

    /** 流式采集：网页地址会抽取真实资源直链，逐个入库并推送进度 */
    void collectUrlStream(BizAssetCollectUrlParam param, Consumer<AssetCollectEventVo> emitter);

    /** 远程图片按需代理，不落地缓存 */
    byte[] proxy(String id, boolean full);

    /** 根据资源后缀推断代理响应的 Content-Type */
    String contentType(String id);
}
