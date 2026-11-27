package vip.xiaonuo.biz.modular.asset.vo;

import lombok.Getter;
import lombok.Setter;

/**
 * 网址采集实时进度事件
 *
 * @author domain-stream
 * @date 2026/11/27
 */
@Getter
@Setter
public class AssetCollectEventVo {

    /** progress：单个资源完成；done：全部完成；error：失败 */
    private String phase;

    /** 当前序号，从 1 开始 */
    private int index;

    /** 本次待采集总数 */
    private int total;

    /** 进度文案 */
    private String message;

    /** progress 事件中已入库的资源 */
    private BizAssetResourceVo resource;
}
