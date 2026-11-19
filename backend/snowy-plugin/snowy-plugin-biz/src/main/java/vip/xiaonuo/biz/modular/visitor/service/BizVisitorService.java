/*
 * Copyright [2022] [https://www.xiaonuo.vip]
 *
 * Snowy采用APACHE LICENSE 2.0开源协议，您在使用过程中，需要注意以下几点：
 *
 * 1.请不要删除和修改根目录下的LICENSE文件。
 * 2.请不要删除和修改Snowy源码头部的版权声明。
 * 3.本项目代码可免费商业使用，商业使用请保留源码和相关描述文件的项目出处，作者声明等。
 * 4.分发源码时候，请注明软件出处 https://www.xiaonuo.vip
 * 5.不可二次分发开源参与同类竞品，如有想法可联系团队xiaonuobase@qq.com商议合作。
 * 6.若您的项目无法满足以上几点，需要更多功能代码，获取Snowy商业授权许可，请在官网购买授权，地址为 https://www.xiaonuo.vip
 */
package vip.xiaonuo.biz.modular.visitor.service;

import com.baomidou.mybatisplus.extension.service.IService;
import vip.xiaonuo.biz.modular.visitor.entity.BizVisitorEvent;
import vip.xiaonuo.biz.modular.visitor.param.BizVisitorTrackParam;
import vip.xiaonuo.biz.modular.visitor.result.BizVisitorDashboardResult;

import java.util.Map;

/**
 * 访客统计Service接口
 *
 * @author domain-stream
 * @date  2026/11/19
 **/
public interface BizVisitorService extends IService<BizVisitorEvent> {

    /**
     * 上报一次访问事件
     */
    void track(BizVisitorTrackParam param, String ip, String userAgent);

    /**
     * 心跳上报（维持在线会话）
     */
    void heartbeat(BizVisitorTrackParam param, String ip, String userAgent);

    /**
     * 首页访客聚合数据
     */
    BizVisitorDashboardResult dashboard();

    /**
     * 轻量计数器（供 SSE 推送最新快照）
     */
    Map<String, Object> liveSnapshot();
}
