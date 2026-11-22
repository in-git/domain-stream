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
package vip.xiaonuo.biz.modular.visitor.service.impl;

import cn.hutool.core.collection.CollectionUtil;
import cn.hutool.core.date.DateUtil;
import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;
import vip.xiaonuo.common.util.CommonIpAddressUtil;
import vip.xiaonuo.biz.modular.article.entity.BizArticle;
import vip.xiaonuo.biz.modular.article.mapper.BizArticleMapper;
import vip.xiaonuo.biz.modular.graphic.entity.BizGraphic;
import vip.xiaonuo.biz.modular.graphic.mapper.BizGraphicMapper;
import vip.xiaonuo.biz.modular.video.entity.BizVideo;
import vip.xiaonuo.biz.modular.video.mapper.BizVideoMapper;
import vip.xiaonuo.biz.modular.visitor.entity.BizVisitorEvent;
import vip.xiaonuo.biz.modular.visitor.mapper.BizVisitorEventMapper;
import vip.xiaonuo.biz.modular.visitor.param.BizVisitorTrackParam;
import vip.xiaonuo.biz.modular.visitor.result.BizVisitorDashboardResult;
import vip.xiaonuo.biz.modular.visitor.service.BizVisitorService;
import vip.xiaonuo.biz.modular.visitor.websocket.BizVisitorWebSocket;

import java.util.*;
import java.util.stream.Collectors;

/**
 * 访客统计Service接口实现类
 *
 * @author domain-stream
 * @date  2026/11/19
 **/
@Service
public class BizVisitorServiceImpl extends ServiceImpl<BizVisitorEventMapper, BizVisitorEvent> implements BizVisitorService {

    private static final String EVENT_PV = "PV";
    private static final String EVENT_CONTENT = "CONTENT_VIEW";

    @Resource
    private BizArticleMapper bizArticleMapper;
    @Resource
    private BizVideoMapper bizVideoMapper;
    @Resource
    private BizGraphicMapper bizGraphicMapper;

    @Override
    public void track(BizVisitorTrackParam param, String ip, String userAgent) {
        String type = param.getEventType();
        // 只写入关键事件（PV / 内容浏览），心跳不落库
        if (!EVENT_CONTENT.equals(type) && !EVENT_PV.equals(type)) {
            return;
        }
        BizVisitorEvent event = buildEvent(param, ip, userAgent);
        event.setEventType(type);
        this.save(event);
    }

    @Override
    public void heartbeat(BizVisitorTrackParam param, String ip, String userAgent) {
        // 保留旧 HTTP 心跳接口兼容，但不再写库；在线会话由 WebSocket 维护
    }

    private BizVisitorEvent buildEvent(BizVisitorTrackParam param, String ip, String userAgent) {
        BizVisitorEvent event = new BizVisitorEvent();
        event.setVisitorId(param.getVisitorId());
        event.setSessionId(StrUtil.blankToDefault(param.getSessionId(), param.getVisitorId()));
        event.setPageType(StrUtil.blankToDefault(param.getPageType(), "HOME"));
        event.setContentId(param.getContentId());
        event.setContentTitle(param.getContentTitle());
        event.setSource(StrUtil.blankToDefault(param.getSource(), "DIRECT"));
        event.setDevice(StrUtil.blankToDefault(param.getDevice(), "DESKTOP"));
        event.setDurationSec(param.getDurationSec() == null ? 0 : param.getDurationSec());
        event.setIp(StrUtil.maxLength(ip, 50));
        event.setUserAgent(StrUtil.maxLength(userAgent, 500));
        event.setCreateTime(new Date());
        return event;
    }

    @Override
    public BizVisitorDashboardResult dashboard() {
        Date now = new Date();
        Date start35 = DateUtil.offsetDay(now, -35);

        // 查询最近35天事件（逻辑删除由 @TableLogic 自动过滤）
        List<BizVisitorEvent> events = this.list(new LambdaQueryWrapper<BizVisitorEvent>()
                .ge(BizVisitorEvent::getCreateTime, start35)
                .orderByAsc(BizVisitorEvent::getCreateTime));

        BizVisitorDashboardResult result = new BizVisitorDashboardResult();
        result.setSnapshot(buildSnapshot(events, now));
        result.setSeries(buildSeries(events, now));
        result.setModuleStats(buildModuleStats());
        result.setSources(buildSources(events, now));
        result.setTopContent(buildTopContent(events, now));
        result.setLatestVisits(buildLatestVisits());
        result.setPeriodStats(buildPeriodStats(now));
        return result;
    }

    /**
     * 本周/本月/本年统计：一次查询本年起的事件（只取必要列），在内存里按周期去重聚合
     */
    private BizVisitorDashboardResult.PeriodStats buildPeriodStats(Date now) {
        Date yearStart = DateUtil.beginOfYear(now);
        List<BizVisitorEvent> yearEvents = this.list(new LambdaQueryWrapper<BizVisitorEvent>()
                .select(BizVisitorEvent::getCreateTime, BizVisitorEvent::getVisitorId, BizVisitorEvent::getIp)
                .ge(BizVisitorEvent::getCreateTime, yearStart));

        // 本周起始（周一 00:00），Hutool dayOfWeek 周日=7，减去相应天数回到周一
        int dayOfWeek = DateUtil.dayOfWeek(DateUtil.beginOfDay(now)); // 1=周一 ... 7=周日
        Date weekStart = DateUtil.offsetDay(DateUtil.beginOfDay(now), -(dayOfWeek - 1));
        Date monthStart = DateUtil.beginOfMonth(now);

        BizVisitorDashboardResult.PeriodStats stats = new BizVisitorDashboardResult.PeriodStats();
        stats.setWeek(aggregatePeriod(yearEvents, weekStart, now));
        stats.setMonth(aggregatePeriod(yearEvents, monthStart, now));
        stats.setYear(aggregatePeriod(yearEvents, yearStart, now));
        return stats;
    }

    /** 统计 [from, to] 区间内的 PV / UV(按visitorId去重) / IP(按ip去重) */
    private BizVisitorDashboardResult.PeriodStat aggregatePeriod(List<BizVisitorEvent> events, Date from, Date to) {
        int pv = 0;
        Set<String> visitors = new HashSet<>();
        Set<String> ips = new HashSet<>();
        for (BizVisitorEvent e : events) {
            Date t = e.getCreateTime();
            if (t == null || t.before(from) || t.after(to)) continue;
            pv++;
            if (StrUtil.isNotBlank(e.getVisitorId())) visitors.add(e.getVisitorId());
            if (StrUtil.isNotBlank(e.getIp())) ips.add(e.getIp());
        }
        BizVisitorDashboardResult.PeriodStat stat = new BizVisitorDashboardResult.PeriodStat();
        stat.setPv(pv);
        stat.setUv(visitors.size());
        stat.setIp(ips.size());
        return stat;
    }

    /**
     * 最近访问记录：按IP聚合，同一IP只保留一条，展示它访问过的所有页面与访问次数。
     * 取最近500条事件在内存中聚合，避免同一IP在列表中重复出现。
     */
    private List<BizVisitorDashboardResult.LatestVisit> buildLatestVisits() {
        List<BizVisitorEvent> recent = this.list(new LambdaQueryWrapper<BizVisitorEvent>()
                .orderByDesc(BizVisitorEvent::getCreateTime)
                .last("LIMIT 500"));
        // 按IP分组，LinkedHashMap 保持首次出现（最新事件）的顺序
        Map<String, BizVisitorDashboardResult.LatestVisit> byIp = new LinkedHashMap<>();
        for (BizVisitorEvent e : recent) {
            String ip = StrUtil.isBlank(e.getIp()) ? "unknown-" + e.getId() : e.getIp();
            BizVisitorDashboardResult.LatestVisit v = byIp.get(ip);
            if (v == null) {
                v = new BizVisitorDashboardResult.LatestVisit();
                v.setId(e.getId());
                v.setIp(e.getIp());
                v.setRegion(StrUtil.isBlank(e.getIp()) ? null : CommonIpAddressUtil.getCityInfo(e.getIp()));
                v.setPageType(e.getPageType());
                v.setContentTitle(e.getContentTitle());
                v.setDevice(e.getDevice());
                v.setSource(e.getSource());
                v.setUserAgent(e.getUserAgent());
                v.setDurationSec(e.getDurationSec());
                v.setCreateTime(e.getCreateTime() == null ? null : DateUtil.formatDateTime(e.getCreateTime()));
                v.setPages(new ArrayList<>());
                v.setVisitCount(0);
                byIp.put(ip, v);
            }
            v.setVisitCount(v.getVisitCount() + 1);
            String pageLabel = buildVisitPageLabel(e);
            if (StrUtil.isNotBlank(pageLabel) && !v.getPages().contains(pageLabel)) {
                v.getPages().add(pageLabel);
            }
        }
        return new ArrayList<>(byIp.values());
    }

    /** 单条访问事件的页面描述，如「首页」「视频·某某视频」 */
    private String buildVisitPageLabel(BizVisitorEvent e) {
        String type = e.getPageType();
        String label;
        if ("HOME".equals(type)) label = "首页";
        else if ("VIDEO".equals(type)) label = "视频";
        else if ("ARTICLE".equals(type)) label = "文章";
        else if ("GRAPHIC".equals(type)) label = "图文";
        else label = StrUtil.blankToDefault(type, "页面");
        return StrUtil.isBlank(e.getContentTitle()) ? label : label + "·" + e.getContentTitle();
    }

    @Override
    public Map<String, Object> liveSnapshot() {
        Date now = new Date();
        Date start35 = DateUtil.offsetDay(now, -35);
        List<BizVisitorEvent> events = this.list(new LambdaQueryWrapper<BizVisitorEvent>()
                .ge(BizVisitorEvent::getCreateTime, start35));

        BizVisitorDashboardResult.Snapshot s = buildSnapshot(events, now);
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("onlineNow", s.getOnlineNow());
        map.put("todayPV", s.getTodayPV());
        map.put("todayUV", s.getTodayUV());
        map.put("avgDurationSec", s.getAvgDurationSec());
        map.put("engagementRate", s.getEngagementRate());
        map.put("updatedAt", s.getUpdatedAt());
        return map;
    }

    /* ------------------------------------------------------------------ */
    /* 快照                                                                */
    /* ------------------------------------------------------------------ */
    private BizVisitorDashboardResult.Snapshot buildSnapshot(List<BizVisitorEvent> events, Date now) {
        Date todayStart = DateUtil.beginOfDay(now);
        Date tomorrowStart = DateUtil.offsetDay(todayStart, 1);
        Date yesterdayStart = DateUtil.offsetDay(todayStart, -1);
        long elapsedToday = now.getTime() - todayStart.getTime();

        Set<String> todayVisitors = new HashSet<>();
        Set<String> yesterdayVisitors = new HashSet<>();
        Set<String> todayIps = new HashSet<>();
        Set<String> yesterdayIps = new HashSet<>();
        int todayPV = 0;
        int yesterdayPV = 0;
        long durationSum = 0L;
        int durationCount = 0;
        int mobile = 0;
        int desktop = 0;
        int engaged = 0;

        for (BizVisitorEvent e : events) {
            Date t = e.getCreateTime();
            if (t == null) continue;
            String et = e.getEventType();
            boolean isView = EVENT_PV.equals(et) || EVENT_CONTENT.equals(et);

            // 今日
            if (!t.before(todayStart) && t.before(tomorrowStart)) {
                if (isView) {
                    todayPV++;
                    if (StrUtil.isNotBlank(e.getVisitorId())) todayVisitors.add(e.getVisitorId());
                    if (StrUtil.isNotBlank(e.getIp())) todayIps.add(e.getIp());
                    int d = e.getDurationSec() == null ? 0 : e.getDurationSec();
                    if (d > 0) { durationSum += d; durationCount++; }
                    if (d >= 120) engaged++;
                    String device = e.getDevice();
                    if ("MOBILE".equals(device) || "TABLET".equals(device)) mobile++;
                    else desktop++;
                }
            }

            // 昨日同时段（用于增长率）
            if (!t.before(yesterdayStart) && t.before(todayStart)) {
                long offset = t.getTime() - yesterdayStart.getTime();
                if (isView) {
                    if (offset <= elapsedToday) {
                        yesterdayPV++;
                        if (StrUtil.isNotBlank(e.getVisitorId())) yesterdayVisitors.add(e.getVisitorId());
                        if (StrUtil.isNotBlank(e.getIp())) yesterdayIps.add(e.getIp());
                    }
                }
            }
        }

        int avgDuration = durationCount == 0 ? 0 : (int) Math.round(durationSum * 1.0 / durationCount);
        double pvGrowth = yesterdayPV == 0 ? (todayPV > 0 ? 100.0 : 0.0)
                : Math.round((todayPV - yesterdayPV) * 1000.0 / yesterdayPV) / 10.0;
        double uvGrowth = yesterdayVisitors.isEmpty() ? (todayVisitors.isEmpty() ? 0.0 : 100.0)
                : Math.round((todayVisitors.size() - yesterdayVisitors.size()) * 1000.0 / yesterdayVisitors.size()) / 10.0;
        double engagement = todayPV == 0 ? 0.0 : Math.round(engaged * 1000.0 / todayPV) / 10.0;
        int mobileShare = (mobile + desktop) == 0 ? 60 : (int) Math.round(mobile * 100.0 / (mobile + desktop));

        BizVisitorDashboardResult.Snapshot s = new BizVisitorDashboardResult.Snapshot();
        s.setOnlineNow(BizVisitorWebSocket.onlineCount());
        s.setTodayPV(todayPV);
        s.setTodayUV(todayVisitors.size());
        s.setTodayIP(todayIps.size());
        s.setYesterdayPV(yesterdayPV);
        s.setYesterdayUV(yesterdayVisitors.size());
        s.setYesterdayIP(yesterdayIps.size());
        s.setPvGrowthPercent(pvGrowth);
        s.setUvGrowthPercent(uvGrowth);
        s.setAvgDurationSec(avgDuration);
        s.setEngagementRate(engagement);
        s.setMobileSharePercent(mobileShare);
        s.setDesktopSharePercent(100 - mobileShare);
        s.setUpdatedAt(DateUtil.formatDateTime(now));
        return s;
    }

    /* ------------------------------------------------------------------ */
    /* 趋势序列                                                            */
    /* ------------------------------------------------------------------ */
    private BizVisitorDashboardResult.Series buildSeries(List<BizVisitorEvent> events, Date now) {
        List<BizVisitorEvent> viewEvents = events.stream()
                .filter(e -> EVENT_PV.equals(e.getEventType()) || EVENT_CONTENT.equals(e.getEventType()))
                .collect(Collectors.toList());

        BizVisitorDashboardResult.Series series = new BizVisitorDashboardResult.Series();
        series.setRealtime(buildHourly(viewEvents, now, 12));
        series.setWeek(buildDaily(viewEvents, now, 7, true));
        series.setMonth(buildDaily(viewEvents, now, 14, false));
        return series;
    }

    /** 按小时聚合（实时） */
    private List<BizVisitorDashboardResult.TrafficPoint> buildHourly(List<BizVisitorEvent> events, Date now, int hours) {
        Date from = DateUtil.offsetHour(DateUtil.beginOfHour(now), -(hours - 1));
        Map<String, Set<String>> uvMap = new LinkedHashMap<>();
        Map<String, Integer> pvMap = new LinkedHashMap<>();
        Map<String, Long> staySum = new LinkedHashMap<>();
        Map<String, Integer> stayCnt = new LinkedHashMap<>();
        for (int i = 0; i < hours; i++) {
            String label = DateUtil.format(DateUtil.offsetHour(DateUtil.beginOfHour(now), -(hours - 1 - i)), "HH:mm");
            uvMap.put(label, new HashSet<>());
            pvMap.put(label, 0);
            staySum.put(label, 0L);
            stayCnt.put(label, 0);
        }
        for (BizVisitorEvent e : events) {
            Date t = e.getCreateTime();
            if (t == null || t.before(from) || t.after(now)) continue;
            String label = DateUtil.format(DateUtil.beginOfHour(t), "HH:mm");
            if (!pvMap.containsKey(label)) continue;
            pvMap.put(label, pvMap.get(label) + 1);
            if (StrUtil.isNotBlank(e.getVisitorId())) uvMap.get(label).add(e.getVisitorId());
            int d = e.getDurationSec() == null ? 0 : e.getDurationSec();
            if (d > 0) { staySum.put(label, staySum.get(label) + d); stayCnt.put(label, stayCnt.get(label) + 1); }
        }
        List<BizVisitorDashboardResult.TrafficPoint> points = new ArrayList<>();
        for (String label : pvMap.keySet()) {
            points.add(point(label, uvMap.get(label).size(), pvMap.get(label),
                    stayCnt.get(label) == 0 ? 0 : (int) Math.round(staySum.get(label) * 1.0 / stayCnt.get(label))));
        }
        return points;
    }

    /** 按天聚合（近7天 / 近14天） */
    private List<BizVisitorDashboardResult.TrafficPoint> buildDaily(List<BizVisitorEvent> events, Date now, int days, boolean weekdayLabel) {
        Date todayStart = DateUtil.beginOfDay(now);
        Map<String, Set<String>> uvMap = new LinkedHashMap<>();
        Map<String, Integer> pvMap = new LinkedHashMap<>();
        Map<String, Long> staySum = new LinkedHashMap<>();
        Map<String, Integer> stayCnt = new LinkedHashMap<>();
        List<String> labels = new ArrayList<>();
        for (int i = 0; i < days; i++) {
            Date day = DateUtil.offsetDay(todayStart, -(days - 1 - i));
            String label = weekdayLabel ? weekday(day) : DateUtil.format(day, "MM-dd");
            if (i == days - 1) label = "今日";
            labels.add(label);
            uvMap.put(label, new HashSet<>());
            pvMap.put(label, 0);
            staySum.put(label, 0L);
            stayCnt.put(label, 0);
        }
        for (BizVisitorEvent e : events) {
            Date t = e.getCreateTime();
            if (t == null || t.after(now)) continue;
            String label = DateUtil.format(DateUtil.beginOfDay(t), "yyyy-MM-dd");
            Date day = DateUtil.parse(label);
            String dayLabel;
            int idx = (int) ((todayStart.getTime() - day.getTime()) / 86400000L);
            if (idx < 0 || idx >= days) continue;
            dayLabel = labels.get(idx);
            pvMap.put(dayLabel, pvMap.get(dayLabel) + 1);
            if (StrUtil.isNotBlank(e.getVisitorId())) uvMap.get(dayLabel).add(e.getVisitorId());
            int d = e.getDurationSec() == null ? 0 : e.getDurationSec();
            if (d > 0) { staySum.put(dayLabel, staySum.get(dayLabel) + d); stayCnt.put(dayLabel, stayCnt.get(dayLabel) + 1); }
        }
        List<BizVisitorDashboardResult.TrafficPoint> points = new ArrayList<>();
        for (String label : labels) {
            points.add(point(label, uvMap.get(label).size(), pvMap.get(label),
                    stayCnt.get(label) == 0 ? 0 : (int) Math.round(staySum.get(label) * 1.0 / stayCnt.get(label))));
        }
        return points;
    }

    private String weekday(Date date) {
        String[] names = {"周日", "周一", "周二", "周三", "周四", "周五", "周六"};
        return names[DateUtil.dayOfWeek(date) - 1];
    }

    private BizVisitorDashboardResult.TrafficPoint point(String label, int uv, int pv, int avgStaySec) {
        BizVisitorDashboardResult.TrafficPoint p = new BizVisitorDashboardResult.TrafficPoint();
        p.setLabel(label);
        p.setUv(uv);
        p.setPv(pv);
        p.setAvgStaySec(avgStaySec);
        return p;
    }

    /* ------------------------------------------------------------------ */
    /* 来源分布                                                            */
    /* ------------------------------------------------------------------ */
    private List<BizVisitorDashboardResult.TrafficSource> buildSources(List<BizVisitorEvent> events, Date now) {
        Date todayStart = DateUtil.beginOfDay(now);
        Map<String, Integer> counts = new LinkedHashMap<>();
        counts.put("DIRECT", 0);
        counts.put("SEARCH", 0);
        counts.put("SOCIAL", 0);
        counts.put("RSS", 0);
        int total = 0;
        for (BizVisitorEvent e : events) {
            Date t = e.getCreateTime();
            if (t == null || t.before(todayStart)) continue;
            if (!(EVENT_PV.equals(e.getEventType()) || EVENT_CONTENT.equals(e.getEventType()))) continue;
            String src = e.getSource();
            if (src == null || !counts.containsKey(src)) src = "DIRECT";
            counts.put(src, counts.get(src) + 1);
            total++;
        }
        String[] names = {"直接访问与书签", "搜索引擎自然流量", "社交分享与专栏引用", "RSS 与邮件订阅"};
        String[] keys = {"DIRECT", "SEARCH", "SOCIAL", "RSS"};
        List<BizVisitorDashboardResult.TrafficSource> list = new ArrayList<>();
        for (int i = 0; i < keys.length; i++) {
            int visits = counts.get(keys[i]);
            BizVisitorDashboardResult.TrafficSource s = new BizVisitorDashboardResult.TrafficSource();
            s.setName(names[i]);
            s.setVisits(visits);
            s.setPercentage(total == 0 ? 0 : (int) Math.round(visits * 100.0 / total));
            list.add(s);
        }
        return list;
    }

    /* ------------------------------------------------------------------ */
    /* 热门内容                                                            */
    /* ------------------------------------------------------------------ */
    private List<BizVisitorDashboardResult.TopContent> buildTopContent(List<BizVisitorEvent> events, Date now) {
        Date start14 = DateUtil.offsetDay(DateUtil.beginOfDay(now), -13);
        Map<String, Long> views = new HashMap<>();
        Map<String, String> titles = new HashMap<>();
        Map<String, String> types = new HashMap<>();
        Map<String, Date> latest = new HashMap<>();
        for (BizVisitorEvent e : events) {
            Date t = e.getCreateTime();
            if (t == null || t.before(start14)) continue;
            if (StrUtil.isBlank(e.getContentId())) continue;
            if (!(EVENT_PV.equals(e.getEventType()) || EVENT_CONTENT.equals(e.getEventType()))) continue;
            String id = e.getContentId();
            views.put(id, views.getOrDefault(id, 0L) + 1);
            titles.putIfAbsent(id, StrUtil.blankToDefault(e.getContentTitle(), "未命名内容"));
            types.putIfAbsent(id, pageTypeToModule(e.getPageType()));
            Date l = latest.get(id);
            if (l == null || t.after(l)) latest.put(id, t);
        }
        return views.entrySet().stream()
                .sorted((a, b) -> Long.compare(b.getValue(), a.getValue()))
                .limit(6)
                .map(entry -> {
                    BizVisitorDashboardResult.TopContent tc = new BizVisitorDashboardResult.TopContent();
                    tc.setId(entry.getKey());
                    tc.setTitle(titles.get(entry.getKey()));
                    tc.setType(types.getOrDefault(entry.getKey(), "article"));
                    tc.setViews(entry.getValue().intValue());
                    tc.setMetricLabel("浏览 " + entry.getValue());
                    Date l = latest.get(entry.getKey());
                    tc.setUpdatedAt(l == null ? DateUtil.formatDateTime(new Date()) : DateUtil.formatDateTime(l));
                    return tc;
                })
                .collect(Collectors.toList());
    }

    private String pageTypeToModule(String pageType) {
        if ("VIDEO".equals(pageType)) return "video";
        if ("GRAPHIC".equals(pageType)) return "imagetext";
        return "article";
    }

    /* ------------------------------------------------------------------ */
    /* 三大模块统计                                                        */
    /* ------------------------------------------------------------------ */
    private BizVisitorDashboardResult.ModuleStats buildModuleStats() {
        BizVisitorDashboardResult.ModuleStats stats = new BizVisitorDashboardResult.ModuleStats();
        stats.setVideos(moduleStat(
                bizVideoMapper.selectList(new LambdaQueryWrapper<BizVideo>()),
                v -> v.getStatus(), v -> v.getViewCount()));
        stats.setArticles(moduleStat(
                bizArticleMapper.selectList(new LambdaQueryWrapper<BizArticle>()),
                a -> a.getStatus(), a -> a.getViewCount()));
        stats.setImagetexts(moduleStat(
                bizGraphicMapper.selectList(new LambdaQueryWrapper<BizGraphic>()),
                g -> g.getStatus(), g -> g.getViewCount()));
        return stats;
    }

    private <T> BizVisitorDashboardResult.ModuleStat moduleStat(List<T> list,
                                                                java.util.function.Function<T, String> statusGetter,
                                                                java.util.function.Function<T, Integer> viewsGetter) {
        BizVisitorDashboardResult.ModuleStat ms = new BizVisitorDashboardResult.ModuleStat();
        if (CollectionUtil.isEmpty(list)) {
            ms.setCount(0); ms.setPublished(0); ms.setTotalViews(0);
            return ms;
        }
        int published = 0;
        int totalViews = 0;
        for (T item : list) {
            String status = statusGetter.apply(item);
            if ("PUBLISHED".equals(status)) published++;
            Integer v = viewsGetter.apply(item);
            totalViews += v == null ? 0 : v;
        }
        ms.setCount(list.size());
        ms.setPublished(published);
        ms.setTotalViews(totalViews);
        return ms;
    }
}
