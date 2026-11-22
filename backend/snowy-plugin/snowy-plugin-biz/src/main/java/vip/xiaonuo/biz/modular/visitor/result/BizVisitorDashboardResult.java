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
package vip.xiaonuo.biz.modular.visitor.result;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * 首页访客聚合数据结果（字段对齐 CMS 前端 DashboardPayload）
 *
 * @author domain-stream
 * @date  2026/11/19
 **/
@Getter
@Setter
public class BizVisitorDashboardResult {

    /** 实时快照 */
    private Snapshot snapshot;

    /** 趋势序列 */
    private Series series;

    /** 三大模块统计 */
    private ModuleStats moduleStats;

    /** 来源分布 */
    private List<TrafficSource> sources;

    /** 热门内容 */
    private List<TopContent> topContent;

    /** 最新访问记录 */
    private List<LatestVisit> latestVisits;

    /** 本周/本月/本年周期统计 */
    private PeriodStats periodStats;

    /** 周期统计（PV/UV/IP） */
    @Getter
    @Setter
    public static class PeriodStats {
        private PeriodStat week;
        private PeriodStat month;
        private PeriodStat year;
    }

    /** 单个周期的 PV/UV/IP */
    @Getter
    @Setter
    public static class PeriodStat {
        private Integer pv;
        private Integer uv;
        private Integer ip;
    }

    @Getter
    @Setter
    public static class Snapshot {
        private Integer onlineNow;
        private Integer todayPV;
        private Integer todayUV;
        private Integer todayIP;
        private Integer yesterdayPV;
        private Integer yesterdayUV;
        private Integer yesterdayIP;
        private Double pvGrowthPercent;
        private Double uvGrowthPercent;
        private Integer avgDurationSec;
        private Double engagementRate;
        private Integer mobileSharePercent;
        private Integer desktopSharePercent;
        private String updatedAt;
    }

    /** 最新访问记录条目 */
    @Getter
    @Setter
    public static class LatestVisit {
        private String id;
        private String ip;
        /** IP 归属地（离线 ip2region 查询） */
        private String region;
        private String pageType;
        private String contentTitle;
        private String device;
        private String source;
        private String userAgent;
        private Integer durationSec;
        private String createTime;
        /** 该IP访问过的页面（去重，形如「首页」「视频·标题」） */
        private java.util.List<String> pages;
        /** 该IP的访问次数 */
        private Integer visitCount;
    }

    @Getter
    @Setter
    public static class Series {
        private List<TrafficPoint> realtime;
        private List<TrafficPoint> week;
        private List<TrafficPoint> month;
    }

    @Getter
    @Setter
    public static class TrafficPoint {
        private String label;
        private Integer uv;
        private Integer pv;
        private Integer avgStaySec;
    }

    @Getter
    @Setter
    public static class ModuleStats {
        private ModuleStat videos;
        private ModuleStat imagetexts;
        private ModuleStat articles;
    }

    @Getter
    @Setter
    public static class ModuleStat {
        private Integer count;
        private Integer published;
        private Integer totalViews;
    }

    @Getter
    @Setter
    public static class TrafficSource {
        private String name;
        private Integer visits;
        private Integer percentage;
    }

    @Getter
    @Setter
    public static class TopContent {
        private String id;
        private String type;
        private String title;
        private Integer views;
        private String metricLabel;
        private String updatedAt;
    }
}
