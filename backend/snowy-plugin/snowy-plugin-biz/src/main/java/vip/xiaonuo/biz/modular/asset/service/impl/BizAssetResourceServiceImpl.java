package vip.xiaonuo.biz.modular.asset.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.date.DateUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vip.xiaonuo.biz.modular.asset.entity.BizAssetResource;
import vip.xiaonuo.biz.modular.asset.enums.BizAssetCategoryEnum;
import vip.xiaonuo.biz.modular.asset.mapper.BizAssetResourceMapper;
import vip.xiaonuo.biz.modular.asset.param.BizAssetCollectUrlParam;
import vip.xiaonuo.biz.modular.asset.param.BizAssetResourcePageParam;
import vip.xiaonuo.biz.modular.asset.service.BizAssetResourceService;
import vip.xiaonuo.biz.modular.asset.util.AssetHttpUtil;
import vip.xiaonuo.biz.modular.asset.util.ByteArrayMultipartFile;
import vip.xiaonuo.biz.modular.asset.vo.AssetCollectEventVo;
import vip.xiaonuo.biz.modular.asset.vo.BizAssetResourceVo;
import vip.xiaonuo.common.exception.CommonException;
import vip.xiaonuo.common.page.CommonPageRequest;
import vip.xiaonuo.dev.api.DevFileApi;

import java.net.URI;
import java.net.URL;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 网址采集素材资源服务实现：采集时写入素材中心，列表按资源类型浏览
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

    /** 数据库兼容字段值：列表仅展示网址采集的记录 */
    private static final String COLLECTED_SOURCE = "URL";

    /** 网址采集允许的资源类型 */
    private static final List<String> COLLECT_TYPES = Arrays.asList("IMAGE", "VIDEO", "SVG", "ICON");

    private static final int DEFAULT_COLLECT_LIMIT = 20;
    private static final int MAX_COLLECT_LIMIT = 50;

    /** 从网页中抽取常见图片/视频直链，Bing 这类 th?id=...jpg&w=3840 链接也能命中 */
    private static final Pattern MEDIA_URL_PATTERN = Pattern.compile(
            "https?://[^\"'<>\\s]+?\\.(?:jpg|jpeg|png|webp|gif|bmp|svg|mp4|webm|mov|m4v)(?:[?&][^\"'<>\\s]*)?",
            Pattern.CASE_INSENSITIVE);

    /** 已知文件后缀 */
    private static final List<String> KNOWN_SUFFIXES = Arrays.asList(
            "jpg", "jpeg", "png", "webp", "gif", "bmp", "svg", "mp4", "webm", "mov", "m4v");

    /** 预览图内存缓存：列表频繁重复请求同一张远程图，缓存可避免反复超时 */
    private final ConcurrentMap<String, byte[]> previewCache = new ConcurrentHashMap<>();

    @Resource
    private BizAssetResourceMapper resourceMapper;

    @Resource
    private DevFileApi devFileApi;

    @Override
    public Page<BizAssetResourceVo> page(BizAssetResourcePageParam param) {
        LambdaQueryWrapper<BizAssetResource> query = Wrappers.lambdaQuery();
        query.eq(BizAssetResource::getStatus, ACTIVE);
        query.eq(BizAssetResource::getSource, COLLECTED_SOURCE);
        if (StrUtil.isNotBlank(param.getType())) {
            query.eq(BizAssetResource::getType, param.getType());
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
                    .or().like(BizAssetResource::getTags, keyword));
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

    @Override
    public void delete(List<String> ids) {
        if (CollUtil.isEmpty(ids)) {
            return;
        }
        // MyBatis-Plus 逻辑删除，只清资源库记录，不动已加入素材中心的文件
        resourceMapper.deleteBatchIds(ids);
        ids.forEach(id -> {
            previewCache.remove(id + ":preview");
            previewCache.remove(id + ":full");
        });
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

    @Override
    public String collectUrl(BizAssetCollectUrlParam param) {
        String url = validateCollectUrl(param);
        String type = normalizeCollectType(param.getType());
        HttpFetchResult fetched = fetchUrl(url, 60000);
        if (!isHtml(fetched)) {
            BizAssetResourceVo vo = saveCollected(url, type, param.getName(), url, fetched);
            return "采集完成：" + vo.getTitle() + "（" + type + "），已登记到素材资源库，可在列表中手动加入素材中心";
        }

        List<String> mediaUrls = resolveMediaUrls(url, fetched, type, resolveCollectLimit(param.getLimit()));
        if (mediaUrls.isEmpty()) {
            throw new CommonException("网页中未找到可采集的" + type + "资源");
        }
        int success = 0;
        for (String mediaUrl : mediaUrls) {
            try {
                saveCollected(mediaUrl, type, null, url, null);
                success++;
            } catch (Exception e) {
                log.warn("网页资源采集失败：{}，{}", mediaUrl, e.getMessage());
            }
        }
        if (success == 0) {
            throw new CommonException("网页资源采集失败，请稍后重试");
        }
        return "采集完成：从网页发现 " + mediaUrls.size() + " 个资源，成功 " + success + " 个，已登记到素材资源库，可在列表中手动加入素材中心";
    }

    @Override
    public void collectUrlStream(BizAssetCollectUrlParam param, Consumer<AssetCollectEventVo> emitter) {
        try {
            String url = validateCollectUrl(param);
            String type = normalizeCollectType(param.getType());
            HttpFetchResult fetched = fetchUrl(url, 60000);
            boolean htmlPage = isHtml(fetched);
            List<String> mediaUrls;
            if (htmlPage) {
                mediaUrls = resolveMediaUrls(url, fetched, type, resolveCollectLimit(param.getLimit()));
                if (mediaUrls.isEmpty()) {
                    emit(emitter, "error", 0, 0, "网页中未找到可采集的" + type + "资源", null);
                    return;
                }
            } else {
                mediaUrls = Collections.singletonList(url);
            }

            int success = 0;
            int fail = 0;
            for (int i = 0; i < mediaUrls.size(); i++) {
                String mediaUrl = mediaUrls.get(i);
                try {
                    BizAssetResourceVo vo = saveCollected(mediaUrl, type, null, url,
                            htmlPage ? null : fetched);
                    success++;
                    emit(emitter, "progress", i + 1, mediaUrls.size(), "已采集：" + vo.getTitle(), vo);
                } catch (Exception e) {
                    fail++;
                    emit(emitter, "progress", i + 1, mediaUrls.size(),
                            "第 " + (i + 1) + " 个资源采集失败：" + e.getMessage(), null);
                }
            }
            emit(emitter, "done", mediaUrls.size(), mediaUrls.size(),
                    "采集完成：成功 " + success + " 个，失败 " + fail + " 个", null);
        } catch (CommonException e) {
            emit(emitter, "error", 0, 0, e.getMessage(), null);
        } catch (Exception e) {
            emit(emitter, "error", 0, 0, "采集失败：" + e.getMessage(), null);
        }
    }

    private String validateCollectUrl(BizAssetCollectUrlParam param) {
        if (param == null || StrUtil.isBlank(param.getUrl())) {
            throw new CommonException("请输入资源网址");
        }
        String url = StrUtil.trim(param.getUrl());
        if (!StrUtil.startWithAnyIgnoreCase(url, "http://", "https://")) {
            throw new CommonException("资源网址必须以 http:// 或 https:// 开头");
        }
        return url;
    }

    private HttpFetchResult fetchUrl(String url, int timeout) {
        HttpRequest request = HttpRequest.get(url)
                .header("User-Agent", "Mozilla/5.0 (compatible; domain-stream-asset/1.0)")
                .header("Accept", "*/*")
                .setFollowRedirects(true)
                .timeout(timeout);
        AssetHttpUtil.applyProxy(request);
        try (HttpResponse response = request.execute()) {
            if (!response.isOk()) {
                throw new CommonException("网址请求失败：" + response.getStatus());
            }
            return new HttpFetchResult(response.bodyBytes(),
                    StrUtil.blankToDefault(response.header("Content-Type"), ""));
        } catch (CommonException e) {
            throw e;
        } catch (Exception e) {
            throw new CommonException("网址内容获取失败：" + e.getMessage());
        }
    }

    private boolean isHtml(HttpFetchResult fetched) {
        String contentType = StrUtil.blankToDefault(fetched.contentType, "").toLowerCase(Locale.ROOT);
        if (contentType.contains("text/html")) return true;
        int length = Math.min(fetched.bytes.length, 256);
        String head = new String(fetched.bytes, 0, length, StandardCharsets.UTF_8).toLowerCase(Locale.ROOT);
        return head.contains("<!doctype html") || head.contains("<html");
    }

    private List<String> resolveMediaUrls(String baseUrl, HttpFetchResult fetched, String type, int limit) {
        String html = new String(fetched.bytes, StandardCharsets.UTF_8).replace("&amp;", "&");
        Matcher matcher = MEDIA_URL_PATTERN.matcher(html);
        Map<String, String> chosen = new LinkedHashMap<>();
        while (matcher.find()) {
            String candidate = matcher.group().trim();
            if (!StrUtil.startWithAnyIgnoreCase(candidate, "http://", "https://")) continue;
            if (!matchesCollectType(candidate, type)) continue;
            String key = canonicalMediaKey(candidate);
            String current = chosen.get(key);
            if (current == null || mediaScore(candidate) > mediaScore(current)) {
                chosen.put(key, candidate);
            }
        }
        List<String> result = new ArrayList<>(chosen.values());
        return result.size() <= limit ? result : new ArrayList<>(result.subList(0, limit));
    }

    private boolean matchesCollectType(String url, String type) {
        String lower = url.toLowerCase(Locale.ROOT);
        if ("VIDEO".equals(type)) {
            return lower.contains(".mp4") || lower.contains(".webm") || lower.contains(".mov") || lower.contains(".m4v");
        }
        if ("SVG".equals(type) || "ICON".equals(type)) {
            return lower.contains(".svg");
        }
        return lower.contains(".jpg") || lower.contains(".jpeg") || lower.contains(".png")
                || lower.contains(".webp") || lower.contains(".gif") || lower.contains(".bmp");
    }

    private String canonicalMediaKey(String url) {
        try {
            String query = URI.create(url).getQuery();
            if (StrUtil.isNotBlank(query)) {
                for (String part : query.split("&")) {
                    if (part.startsWith("id=") && part.length() > 3) {
                        return "id:" + URLDecoder.decode(part.substring(3), StandardCharsets.UTF_8);
                    }
                }
            }
        } catch (Exception ignored) {
            // 非标准查询串直接按完整网址去重
        }
        return url;
    }

    private int mediaScore(String url) {
        String lower = url.toLowerCase(Locale.ROOT);
        int score = 0;
        if (lower.contains("w=3840") || lower.contains("h=2160")) score += 4;
        else if (lower.contains("w=2000")) score += 2;
        if (lower.contains("uhd")) score += 1;
        return score;
    }

    private int resolveCollectLimit(Integer rawLimit) {
        if (rawLimit == null || rawLimit <= 0) return DEFAULT_COLLECT_LIMIT;
        return Math.min(rawLimit, MAX_COLLECT_LIMIT);
    }

    private BizAssetResourceVo saveCollected(String url, String type, String customName, String homepage,
                                              HttpFetchResult prefetched) {
        HttpFetchResult fetched = prefetched == null ? fetchUrl(url, 60000) : prefetched;
        byte[] bytes = fetched.bytes;
        String responseContentType = fetched.contentType;
        if (bytes.length == 0) {
            throw new CommonException("网址返回内容为空");
        }
        if (isHtml(fetched)) {
            throw new CommonException("资源地址返回的是网页，不是可下载资源");
        }
        long maxBytes = "VIDEO".equals(type) ? 500L * 1024 * 1024 : 50L * 1024 * 1024;
        if (bytes.length > maxBytes) {
            throw new CommonException("资源超过大小限制（" + (maxBytes / 1024 / 1024) + "MB）");
        }

        String suffix = resolveSuffix(url, responseContentType, type);
        String title = StrUtil.blankToDefault(StrUtil.trim(customName), titleFromAssetUrl(url));
        // 按规范资源标识去重：同一张 Bing 图的 w=3840 / w=480 地址应视为同一条
        String sourceKey = "url:" + md5Hex(canonicalMediaKey(url));
        String legacySourceKey = "url:" + md5Hex(url);

        // 同时兼容历史数据，命中旧地址记录时顺手迁移为新的规范去重键
        BizAssetResource entity = findBySourceKey(sourceKey, legacySourceKey);
        boolean created = entity == null;
        if (created) {
            entity = new BizAssetResource();
            entity.setId(IdWorker.getIdStr());
        }
        entity.setSource(COLLECTED_SOURCE);
        entity.setSourceKey(sourceKey);
        entity.setType(type);
        entity.setTitle(title);
        String description = "通过网址采集：" + homepage;
        if (!url.equals(homepage)) description += "；资源地址：" + url;
        entity.setDescription(description);
        entity.setTags(type.toLowerCase(Locale.ROOT) + ",url,采集");
        entity.setLicense("");
        entity.setAuthor("");
        entity.setHomepage(homepage);
        entity.setPreviewUrl(url);
        entity.setImageUrl(url);
        entity.setSuffix(suffix);
        entity.setInMaterial(NO);
        entity.setMaterialFileId(null);
        entity.setStatus(ACTIVE);
        entity.setDownloads(0);
        if (created) {
            resourceMapper.insert(entity);
        } else {
            resourceMapper.updateById(entity);
        }
        previewCache.clear();
        return toVo(entity);
    }

    private String titleFromAssetUrl(String url) {
        try {
            String query = URI.create(url).getQuery();
            if (StrUtil.isNotBlank(query)) {
                for (String part : query.split("&")) {
                    if (part.startsWith("id=") && part.length() > 3) {
                        String decoded = URLDecoder.decode(part.substring(3), StandardCharsets.UTF_8);
                        int dot = decoded.lastIndexOf('.');
                        if (dot > 0) decoded = decoded.substring(0, dot);
                        String name = decoded.replaceFirst("(?i)^OHR\\.", "")
                                .replaceFirst("(?i)_ZH-CN\\d+_UHD$", "");
                        return StrUtil.isNotBlank(name) ? name.replace('_', ' ') : titleFromUrl(url);
                    }
                }
            }
        } catch (Exception ignored) {
            // 回退到通用网址标题推断
        }
        return titleFromUrl(url);
    }

    private void emit(Consumer<AssetCollectEventVo> emitter, String phase, int index, int total,
                      String message, BizAssetResourceVo resource) {
        AssetCollectEventVo event = new AssetCollectEventVo();
        event.setPhase(phase);
        event.setIndex(index);
        event.setTotal(total);
        event.setMessage(message);
        event.setResource(resource);
        emitter.accept(event);
    }

    private static class HttpFetchResult {
        private final byte[] bytes;
        private final String contentType;

        private HttpFetchResult(byte[] bytes, String contentType) {
            this.bytes = bytes;
            this.contentType = contentType;
        }
    }

    private String normalizeCollectType(String rawType) {
        String type = StrUtil.blankToDefault(StrUtil.trim(rawType), "IMAGE").toUpperCase(Locale.ROOT);
        if (!COLLECT_TYPES.contains(type)) {
            throw new CommonException("不支持的资源类型：" + rawType);
        }
        return type;
    }

    private String resolveSuffix(String url, String contentType, String type) {
        String lowerUrl = url.toLowerCase(Locale.ROOT);
        String path = lowerUrl;
        try {
            path = URI.create(url).getPath().toLowerCase(Locale.ROOT);
        } catch (Exception ignored) {
            // 保留原始 URL 字符串继续推断
        }
        int slash = path.lastIndexOf('/');
        if (slash >= 0 && slash < path.length() - 1) {
            String last = path.substring(slash + 1);
            int dot = last.lastIndexOf('.');
            if (dot >= 0 && dot < last.length() - 1) {
                String ext = last.substring(dot + 1).replaceAll("[^a-z0-9]", "");
                if (KNOWN_SUFFIXES.contains(ext)) return ext;
            }
        }
        String ct = StrUtil.blankToDefault(contentType, "").toLowerCase(Locale.ROOT);
        if (ct.contains("svg")) return "svg";
        if (ct.contains("png")) return "png";
        if (ct.contains("webp")) return "webp";
        if (ct.contains("jpeg") || ct.contains("jpg")) return "jpg";
        if (ct.contains("gif")) return "gif";
        if (ct.contains("mp4")) return "mp4";
        if (ct.contains("webm")) return "webm";
        if (ct.contains("quicktime")) return "mov";
        return switch (type) {
            case "VIDEO" -> "mp4";
            case "SVG", "ICON" -> "svg";
            default -> "jpg";
        };
    }

    private String titleFromUrl(String url) {
        try {
            String path = URI.create(url).getPath();
            String decoded = URLDecoder.decode(path == null ? "" : path, StandardCharsets.UTF_8);
            int slash = decoded.lastIndexOf('/');
            String last = slash >= 0 ? decoded.substring(slash + 1) : decoded;
            if (StrUtil.isNotBlank(last)) {
                int dot = last.lastIndexOf('.');
                return dot > 0 ? last.substring(0, dot) : last;
            }
        } catch (Exception ignored) {
            // 回退到来源主机
        }
        try {
            return new URL(url).getHost();
        } catch (Exception e) {
            return "网址素材";
        }
    }

    private String md5Hex(String input) {
        try {
            byte[] digest = MessageDigest.getInstance("MD5").digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (Exception e) {
            return Integer.toHexString(input.hashCode());
        }
    }

    private String safeFileName(String name) {
        String safe = StrUtil.blankToDefault(name, "asset").replaceAll("[^a-zA-Z0-9_.-]", "_");
        if (safe.length() > 60) safe = safe.substring(0, 60);
        return safe;
    }

    private String categoryCode(String type) {
        if ("ICON".equals(type) || "SVG".equals(type)) return BizAssetCategoryEnum.ICON.getValue();
        if ("VIDEO".equals(type)) return "VIDEO";
        return BizAssetCategoryEnum.WALLPAPER.getValue();
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
        if (StrUtil.isBlank(url) || !COLLECTED_SOURCE.equals(resource.getSource())) {
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
        long maxBytes = full ? 200L * 1024 * 1024 : 15L * 1024 * 1024;
        if (bytes == null || bytes.length > maxBytes) {
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
        return mimeBySuffix(suffix);
    }

    private String mimeBySuffix(String suffix) {
        String value = StrUtil.blankToDefault(suffix, "").toLowerCase(Locale.ROOT);
        return switch (value) {
            case "svg" -> "image/svg+xml; charset=utf-8";
            case "png" -> "image/png";
            case "webp" -> "image/webp";
            case "gif" -> "image/gif";
            case "mp4" -> "video/mp4";
            case "webm" -> "video/webm";
            case "mov" -> "video/quicktime";
            default -> "image/jpeg";
        };
    }

    private BizAssetResource findBySourceKey(String... sourceKeys) {
        List<String> keys = new ArrayList<>();
        for (String key : sourceKeys) {
            if (StrUtil.isNotBlank(key) && !keys.contains(key)) {
                keys.add(key);
            }
        }
        if (keys.isEmpty()) return null;
        LambdaQueryWrapper<BizAssetResource> query = Wrappers.lambdaQuery();
        query.in(BizAssetResource::getSourceKey, keys)
                .orderByAsc(BizAssetResource::getId)
                .last("limit 1");
        return resourceMapper.selectOne(query);
    }

    private BizAssetResourceVo toVo(BizAssetResource row) {
        BizAssetResourceVo vo = new BizAssetResourceVo();
        vo.setId(row.getId());
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
