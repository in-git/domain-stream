package vip.xiaonuo.biz.modular.asset.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.date.DateUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import vip.xiaonuo.biz.modular.asset.entity.BizAssetResource;
import vip.xiaonuo.biz.modular.asset.enums.BizAssetCategoryEnum;
import vip.xiaonuo.biz.modular.asset.enums.BizAssetSourceEnum;
import vip.xiaonuo.biz.modular.asset.mapper.BizAssetResourceMapper;
import vip.xiaonuo.biz.modular.asset.param.BizAssetResourcePageParam;
import vip.xiaonuo.biz.modular.asset.service.BizAssetResourceService;
import vip.xiaonuo.biz.modular.asset.source.AssetItem;
import vip.xiaonuo.biz.modular.asset.source.AssetSource;
import vip.xiaonuo.biz.modular.asset.util.AssetHttpUtil;
import vip.xiaonuo.biz.modular.asset.util.ByteArrayMultipartFile;
import vip.xiaonuo.biz.modular.asset.vo.AssetSiteStatVo;
import vip.xiaonuo.biz.modular.asset.vo.AssetTypeSiteVo;
import vip.xiaonuo.biz.modular.asset.vo.BizAssetResourceVo;
import vip.xiaonuo.common.exception.CommonException;
import vip.xiaonuo.common.page.CommonPageRequest;
import vip.xiaonuo.dev.api.DevFileApi;

import java.net.URL;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * 远端素材资源服务实现：资源浏览不落地，用户加入素材中心时下载到本地文件库
 *
 * @author domain-stream
 * @date 2026/11/23
 */
@Slf4j
@Service
public class BizAssetResourceServiceImpl implements BizAssetResourceService {

    private static final String YES = "YES";
    private static final String NO = "NO";
    private static final String ACTIVE = "ACTIVE";

    /** 当前启用的素材来源，列表与站点筛选都只认这些值 */
    private static final List<String> SOURCE_VALUES = Arrays.stream(BizAssetSourceEnum.values())
            .map(BizAssetSourceEnum::getValue)
            .toList();

    /** 允许代理的远程域名，防止代理接口被当作任意 URL 抓取工具 */
    private static final List<String> ALLOWED_HOSTS = Arrays.asList(
            "api.iconify.design",
            "www.bing.com",
            "picsum.photos", "fastly.picsum.photos",
            "wallhaven.cc", "w0.wallhaven.cc", "w1.wallhaven.cc", "th.wallhaven.cc",
            "img.icons8.com", "api.icons8.com", "search.icons8.com"
    );

    /** 预览图内存缓存：列表频繁重复请求同一张远程图，缓存可避免反复超时 */
    private final ConcurrentMap<String, byte[]> previewCache = new ConcurrentHashMap<>();

    @Resource
    private BizAssetResourceMapper resourceMapper;

    @Resource
    private DevFileApi devFileApi;

    @Autowired
    private List<AssetSource> assetSources;

    @Override
    public Page<BizAssetResourceVo> page(BizAssetResourcePageParam param) {
        LambdaQueryWrapper<BizAssetResource> query = Wrappers.lambdaQuery();
        query.eq(BizAssetResource::getStatus, ACTIVE);
        query.in(BizAssetResource::getSource, SOURCE_VALUES);
        if (StrUtil.isNotBlank(param.getType())) {
            query.eq(BizAssetResource::getType, param.getType());
        }
        if (StrUtil.isNotBlank(param.getSource())) {
            query.eq(BizAssetResource::getSource, param.getSource());
        }
        if (StrUtil.isNotBlank(param.getInMaterial())) {
            query.eq(BizAssetResource::getInMaterial, param.getInMaterial());
        }
        if (StrUtil.isNotBlank(param.getTag())) {
            query.like(BizAssetResource::getTags, param.getTag());
        }
        if (StrUtil.isNotBlank(param.getKeyword())) {
            String keyword = param.getKeyword();
            query.and(w -> w.like(BizAssetResource::getTitle, keyword)
                    .or().like(BizAssetResource::getDescription, keyword)
                    .or().like(BizAssetResource::getTags, keyword)
                    .or().like(BizAssetResource::getSourceKey, keyword));
        }
        query.orderByDesc(BizAssetResource::getCreateTime);

        Page<BizAssetResource> sourcePage = resourceMapper.selectPage(CommonPageRequest.defaultPage(), query);
        Page<BizAssetResourceVo> result = new Page<>(sourcePage.getCurrent(), sourcePage.getSize(), sourcePage.getTotal());
        List<BizAssetResourceVo> records = new ArrayList<>();
        for (BizAssetResource row : sourcePage.getRecords()) {
            records.add(toVo(row));
        }
        result.setRecords(records);
        return result;
    }

    @Override
    public List<AssetTypeSiteVo> siteTree() {
        List<BizAssetResource> all = resourceMapper.selectList(Wrappers.<BizAssetResource>lambdaQuery()
                .eq(BizAssetResource::getStatus, ACTIVE)
                .select(BizAssetResource::getType, BizAssetResource::getSource));

        Map<String, TreeSet<String>> sourceSetByType = new LinkedHashMap<>();
        for (BizAssetSourceEnum source : BizAssetSourceEnum.values()) {
            sourceSetByType.computeIfAbsent(source.getType(), key -> new TreeSet<>()).add(source.getValue());
        }
        for (BizAssetResource row : all) {
            if (StrUtil.isBlank(row.getType()) || StrUtil.isBlank(row.getSource())) continue;
            if (!SOURCE_VALUES.contains(row.getSource())) continue;
            sourceSetByType.computeIfAbsent(row.getType(), key -> new TreeSet<>()).add(row.getSource());
        }

        List<AssetTypeSiteVo> tree = new ArrayList<>();
        for (Map.Entry<String, TreeSet<String>> entry : sourceSetByType.entrySet()) {
            String type = entry.getKey();
            AssetTypeSiteVo typeNode = new AssetTypeSiteVo();
            typeNode.setValue(type);
            typeNode.setLabel(type);
            typeNode.setAssetCount(count(type, null));

            List<AssetSiteStatVo> sites = new ArrayList<>();
            for (String source : entry.getValue()) {
                AssetSiteStatVo siteNode = new AssetSiteStatVo();
                siteNode.setValue(source);
                siteNode.setLabel(source);
                siteNode.setAssetCount(count(type, source));
                sites.add(siteNode);
            }
            typeNode.setSites(sites);
            tree.add(typeNode);
        }
        return tree;
    }

    private int count(String type, String source) {
        LambdaQueryWrapper<BizAssetResource> query = Wrappers.lambdaQuery();
        query.eq(BizAssetResource::getStatus, ACTIVE);
        query.in(BizAssetResource::getSource, SOURCE_VALUES);
        if (StrUtil.isNotBlank(type)) query.eq(BizAssetResource::getType, type);
        if (StrUtil.isNotBlank(source)) query.eq(BizAssetResource::getSource, source);
        Long count = resourceMapper.selectCount(query);
        return count == null ? 0 : count.intValue();
    }

    @Override
    public void addToMaterial(List<String> ids) {
        if (CollUtil.isEmpty(ids)) {
            throw new CommonException("请选择要加入素材中心的素材");
        }
        List<BizAssetResource> resources = resourceMapper.selectBatchIds(ids);
        if (resources.size() != ids.size()) {
            throw new CommonException("部分素材不存在，请刷新后重试");
        }

        int success = 0;
        int fail = 0;
        for (BizAssetResource resource : resources) {
            if (YES.equals(resource.getInMaterial()) && isLocalMaterial(resource.getMaterialFileId())) {
                success++;
                continue;
            }
            try {
                byte[] bytes = this.proxy(resource.getId(), true);
                if (bytes.length == 0) {
                    throw new CommonException("下载内容为空");
                }
                String categoryCode = BizAssetCategoryEnum.ICON.getValue().equals(resource.getType())
                        ? BizAssetCategoryEnum.ICON.getValue()
                        : BizAssetCategoryEnum.WALLPAPER.getValue();
                String suffix = StrUtil.blankToDefault(resource.getSuffix(), "jpg");
                String safeKey = StrUtil.blankToDefault(resource.getSourceKey(), IdWorker.getIdStr())
                        .replaceAll("[^a-zA-Z0-9_-]", "_");
                String fileName = safeKey + StrUtil.DOT + suffix;

                String fileId = devFileApi.uploadAssetReturnId(
                        null,
                        new ByteArrayMultipartFile(bytes, "file", fileName, contentType(resource.getId())),
                        "MATERIAL",
                        categoryCode);

                resource.setInMaterial(YES);
                resource.setMaterialFileId(fileId);
                resourceMapper.updateById(resource);
                success++;
            } catch (Exception e) {
                fail++;
                log.warn("素材 {} 加入素材中心失败：{}", resource.getSourceKey(), e.getMessage());
            }
        }

        if (success == 0) {
            throw new CommonException("加入素材中心失败，远程素材下载异常，请稍后重试");
        }
        if (fail > 0) {
            log.warn("加入素材中心完成，成功 {} 条，失败 {} 条", success, fail);
        }
    }

    /** 判断素材中心文件是否已经是本地文件库记录 */
    private boolean isLocalMaterial(String fileId) {
        if (StrUtil.isBlank(fileId)) {
            return false;
        }
        try {
            JSONObject fileInfo = devFileApi.getFileInfoById(fileId);
            return fileInfo != null && !"REMOTE".equalsIgnoreCase(fileInfo.getStr("engine"));
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * 清理历史 Bing 重复数据：旧 sourceKey 带市场前缀，同一张壁纸会被存成多条。
     * 保留已加入素材中心的记录；否则保留最早的一条。
     */
    private void deduplicateBing() {
        List<BizAssetResource> rows = resourceMapper.selectList(Wrappers.<BizAssetResource>lambdaQuery()
                .eq(BizAssetResource::getSource, BizAssetSourceEnum.BING.getValue()));
        Map<String, BizAssetResource> keep = new LinkedHashMap<>();
        for (BizAssetResource row : rows) {
            String key = normalizeBingKey(row.getSourceKey());
            if (StrUtil.isBlank(key)) continue;
            BizAssetResource current = keep.get(key);
            if (current == null || (!YES.equals(current.getInMaterial()) && YES.equals(row.getInMaterial()))) {
                keep.put(key, row);
            }
        }
        for (BizAssetResource row : rows) {
            String key = normalizeBingKey(row.getSourceKey());
            BizAssetResource keeper = keep.get(key);
            if (keeper != null && !keeper.getId().equals(row.getId())) {
                resourceMapper.deleteById(row);
            } else if (keeper != null && !key.equals(row.getSourceKey())) {
                row.setSourceKey(key);
                resourceMapper.updateById(row);
            }
        }
    }

    private String normalizeBingKey(String sourceKey) {
        if (StrUtil.isBlank(sourceKey)) return "";
        return sourceKey.replaceFirst("^bing:[^:]+:", "bing:");
    }

    @Override
    public String collectWithConfig(String extJson) {
        JSONObject config = StrUtil.isBlank(extJson) ? new JSONObject() : JSONUtil.parseObj(extJson);
        previewCache.clear();
        deduplicateBing();
        String sources = config.getStr("sources", String.join(",", SOURCE_VALUES));
        int added = 0;
        int updated = 0;
        int skipped = 0;
        int okSources = 0;
        List<String> emptySources = new ArrayList<>();
        List<String> failedSources = new ArrayList<>();
        for (String name : sources.split(",")) {
            AssetSource source = findSource(name.trim());
            if (source == null) {
                log.warn("未找到素材来源：{}", name);
                failedSources.add(name.trim());
                continue;
            }
            List<AssetItem> items;
            try {
                items = source.fetch(config);
            } catch (Exception e) {
                log.error("素材来源 {} 发现失败：{}", source.source(), e.getMessage(), e);
                failedSources.add(name.trim());
                continue;
            }
            if (CollUtil.isEmpty(items)) {
                skipped++;
                emptySources.add(name.trim());
                continue;
            }
            okSources++;
            for (AssetItem item : items) {
                try {
                    BizAssetResource existing = findBySourceKey(item.getSourceKey());
                    if (existing != null) {
                        existing.setTitle(item.getTitle());
                        existing.setDescription(item.getDescription());
                        existing.setTags(item.getTags());
                        existing.setLicense(item.getLicense());
                        existing.setAuthor(item.getAuthor());
                        existing.setHomepage(item.getHomepage());
                        existing.setPreviewUrl(item.getPreviewUrl());
                        existing.setImageUrl(item.getImageUrl());
                        resourceMapper.updateById(existing);
                        updated++;
                    } else {
                        BizAssetResource entity = new BizAssetResource();
                        entity.setId(IdWorker.getIdStr());
                        entity.setSource(item.getSource());
                        entity.setSourceKey(item.getSourceKey());
                        entity.setType(item.getType());
                        entity.setTitle(item.getTitle());
                        entity.setDescription(item.getDescription());
                        entity.setTags(item.getTags());
                        entity.setLicense(item.getLicense());
                        entity.setAuthor(item.getAuthor());
                        entity.setHomepage(item.getHomepage());
                        entity.setPreviewUrl(item.getPreviewUrl());
                        entity.setImageUrl(item.getImageUrl());
                        entity.setSuffix(item.getSuffix());
                        entity.setInMaterial(NO);
                        entity.setStatus(ACTIVE);
                        entity.setDownloads(0);
                        resourceMapper.insert(entity);
                        added++;
                    }
                } catch (Exception e) {
                    log.warn("素材 {} 保存失败：{}", item.getSourceKey(), e.getMessage());
                }
            }
        }
        StringBuilder summary = new StringBuilder("采集完成，新增 ")
                .append(added).append(" 条，更新 ").append(updated)
                .append(" 条；有数据 ").append(okSources).append(" 个站点");
        if (!emptySources.isEmpty()) {
            summary.append("，无数据 ").append(emptySources.size())
                    .append(" 个（").append(String.join("、", emptySources)).append("）");
        }
        if (!failedSources.isEmpty()) {
            summary.append("，失败 ").append(failedSources.size())
                    .append(" 个（").append(String.join("、", failedSources)).append("）");
        }
        log.info("远端素材{}", summary);
        return summary.toString();
    }

    @Override
    public byte[] proxy(String id, boolean full) {
        String cacheKey = id + (full ? ":full" : ":preview");
        if (!full) {
            byte[] cached = previewCache.get(cacheKey);
            if (cached != null) return cached;
        }
        BizAssetResource resource = resourceMapper.selectById(id);
        if (resource == null || !ACTIVE.equals(resource.getStatus())) {
            throw new CommonException("素材不存在");
        }
        String url = full ? resource.getImageUrl() : resource.getPreviewUrl();
        if (StrUtil.isBlank(url) || !isAllowed(url)) {
            throw new CommonException("素材地址不允许访问");
        }

        byte[] bytes = null;
        for (int attempt = 0; attempt < 2 && bytes == null; attempt++) {
            HttpRequest request = HttpRequest.get(url)
                    .header("User-Agent", "domain-stream-asset/1.0")
                    .header("Accept", "image/*")
                    .setFollowRedirects(true)
                    .timeout(10000);
            AssetHttpUtil.applyProxy(request);
            try (HttpResponse response = request.execute()) {
                if (!response.isOk()) {
                    throw new CommonException("远程素材请求失败：" + response.getStatus());
                }
                byte[] body = response.bodyBytes();
                if (body.length == 0) {
                    throw new CommonException("远程素材内容为空");
                }
                bytes = body;
            } catch (Exception e) {
                if (attempt == 1) {
                    log.warn("远程素材 {} 获取失败：{}", url, e.getMessage());
                    if (e instanceof CommonException commonException) throw commonException;
                    throw new CommonException("远程素材请求失败：" + e.getMessage());
                }
            }
        }
        if (bytes == null || bytes.length > 15 * 1024 * 1024) {
            throw new CommonException("远程素材超过大小限制");
        }
        if (!full) {
            previewCache.put(cacheKey, bytes);
        }
        return bytes;
    }

    @Override
    public String contentType(String id) {
        BizAssetResource resource = resourceMapper.selectById(id);
        String suffix = resource == null ? "" : StrUtil.blankToDefault(resource.getSuffix(), "").toLowerCase();
        if ("svg".equals(suffix)) return "image/svg+xml; charset=utf-8";
        if ("png".equals(suffix)) return "image/png";
        if ("webp".equals(suffix)) return "image/webp";
        if ("jpeg".equals(suffix)) return "image/jpeg";
        return "image/jpeg";
    }

    private AssetSource findSource(String sourceName) {
        return assetSources.stream().filter(s -> s.source().equalsIgnoreCase(sourceName)).findFirst().orElse(null);
    }

    private BizAssetResource findBySourceKey(String sourceKey) {
        if (StrUtil.isBlank(sourceKey)) return null;
        LambdaQueryWrapper<BizAssetResource> query = Wrappers.lambdaQuery();
        query.eq(BizAssetResource::getSourceKey, sourceKey).last("limit 1");
        return resourceMapper.selectOne(query);
    }

    private boolean isAllowed(String url) {
        try {
            URL parsed = new URL(url);
            String host = parsed.getHost().toLowerCase();
            if (!"https".equalsIgnoreCase(parsed.getProtocol())) return false;
            return ALLOWED_HOSTS.stream().anyMatch(host::equals);
        } catch (Exception e) {
            return false;
        }
    }

    private BizAssetResourceVo toVo(BizAssetResource row) {
        BizAssetResourceVo vo = new BizAssetResourceVo();
        vo.setId(row.getId());
        vo.setSource(row.getSource());
        vo.setSourceKey(row.getSourceKey());
        vo.setType(row.getType());
        vo.setTitle(row.getTitle());
        vo.setDescription(row.getDescription());
        vo.setTags(row.getTags());
        vo.setLicense(row.getLicense());
        vo.setAuthor(row.getAuthor());
        vo.setHomepage(row.getHomepage());
        vo.setInMaterial(row.getInMaterial());
        vo.setMaterialFileId(row.getMaterialFileId());
        vo.setCreateTime(row.getCreateTime() == null ? "" : DateUtil.formatDateTime(row.getCreateTime()));
        vo.setPreviewUrl("/biz/asset-resource/media?id=" + row.getId());
        vo.setImageUrl("/biz/asset-resource/media?id=" + row.getId() + "&full=true");
        vo.setRemotePreviewUrl(row.getPreviewUrl());
        vo.setRemoteImageUrl(row.getImageUrl());
        return vo;
    }
}
