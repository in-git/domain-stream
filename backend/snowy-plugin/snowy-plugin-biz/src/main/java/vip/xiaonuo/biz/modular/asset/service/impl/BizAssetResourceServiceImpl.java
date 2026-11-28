package vip.xiaonuo.biz.modular.asset.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.date.DateUtil;
import cn.hutool.core.img.ImgUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.http.HttpRequest;
import cn.hutool.http.HttpResponse;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import jakarta.annotation.Resource;
import javax.imageio.ImageIO;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import vip.xiaonuo.biz.modular.asset.entity.BizAssetResource;
import vip.xiaonuo.biz.modular.asset.enums.BizAssetCategoryEnum;
import vip.xiaonuo.biz.modular.asset.mapper.BizAssetResourceMapper;
import vip.xiaonuo.biz.modular.asset.param.BizAssetCollectUrlParam;
import vip.xiaonuo.biz.modular.asset.param.BizAssetResourcePageParam;
import vip.xiaonuo.biz.modular.asset.service.BizAssetResourceService;
import vip.xiaonuo.biz.modular.asset.util.AssetHttpUtil;
import vip.xiaonuo.biz.modular.asset.util.AssetPageRenderer;
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
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Queue;
import java.util.Set;
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

    private static final int DEEP_PAGE_TIMEOUT = 20000;

    /** 页面中需要继续跟踪的链接 */
    private static final Pattern HREF_PATTERN = Pattern.compile(
            "<a\\b[^>]*\\bhref\\s*=\\s*[\"']([^\"']+)[\"']",
            Pattern.CASE_INSENSITIVE);

    /** 这些后缀是资源或静态文件，不再当成可继续爬取的页面 */
    private static final List<String> NON_PAGE_SUFFIXES = Arrays.asList(
            ".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg", ".ico",
            ".mp4", ".webm", ".mov", ".m4v", ".mp3", ".wav",
            ".css", ".js", ".json", ".xml", ".pdf", ".zip", ".rar", ".doc", ".docx");

    /** 从网页中抽取常见图片/视频直链，Bing 这类 th?id=...jpg&w=3840 链接也能命中 */
    private static final Pattern MEDIA_URL_PATTERN = Pattern.compile(
            "https?://[^\"'<>\\s]+?\\.(?:jpg|jpeg|png|webp|gif|bmp|svg|mp4|webm|mov|m4v)(?:[?&][^\"'<>\\s]*)?",
            Pattern.CASE_INSENSITIVE);

    /** 页面中的相对资源路径，按当前页面地址解析成绝对 URL 后再入库 */
    private static final Pattern RELATIVE_MEDIA_PATTERN = Pattern.compile(
            "[\"']((?!/{2}|https?:)[^\"']+?\\.(?:jpg|jpeg|png|webp|gif|bmp|svg|mp4|webm|mov|m4v)(?:[?&][^\"']*)?)[\"']",
            Pattern.CASE_INSENSITIVE);

    /** 已知文件后缀 */
    private static final List<String> KNOWN_SUFFIXES = Arrays.asList(
            "jpg", "jpeg", "png", "webp", "gif", "bmp", "svg", "mp4", "webm", "mov", "m4v");

    /**
     * 不影响图片身份的查询参数：尺寸/质量/格式等变换参数、追踪参数、签名与缓存参数。
     * 采集时同一张图常以 w=480 / w=1280、带 token 等不同地址出现，去掉后才能识别为同一条。
     */
    private static final Set<String> MEDIA_QUERY_IGNORED_KEYS = Set.of(
            "w", "h", "width", "height",
            "q", "quality", "fm", "format", "fit", "crop", "auto", "dpr",
            "size", "resize", "thumbnail", "thumb", "maxwidth", "maxheight", "minwidth", "minheight",
            "bg", "blur", "sharp",
            "ixlib", "ixid",
            "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
            "fbclid", "gclid",
            "v", "t", "ts", "_", "cb", "cache", "cachebuster", "timestamp",
            "expires", "exp", "sign", "signature", "token", "policy", "auth_key");

    /** 取图片宽度/高度参数，用于在同图多尺寸中选最大的一张 */
    private static final Pattern WIDTH_PARAM_PATTERN = Pattern.compile(
            "[?&](?:w|width)=(\\d+)", Pattern.CASE_INSENSITIVE);
    private static final Pattern HEIGHT_PARAM_PATTERN = Pattern.compile(
            "[?&](?:h|height)=(\\d+)", Pattern.CASE_INSENSITIVE);

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
    public void addToMaterial(List<String> ids, String categoryCode) {
        if (CollUtil.isEmpty(ids)) {
            throw new CommonException("请选择要加入素材中心的素材");
        }
        String targetCategoryCode = StrUtil.trim(categoryCode);
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
                String uploadCategoryCode = StrUtil.isNotBlank(targetCategoryCode)
                        ? targetCategoryCode
                        : (BizAssetCategoryEnum.ICON.getValue().equals(resource.getType())
                        ? BizAssetCategoryEnum.ICON.getValue()
                        : BizAssetCategoryEnum.WALLPAPER.getValue());
                String suffix = StrUtil.blankToDefault(resource.getSuffix(), "jpg");
                byte[] uploadBytes = bytes;
                String uploadSuffix = suffix;
                String uploadContentType = contentType(resource.getId());
                // 采集图片统一转 WebP 后再落素材中心；GIF/SVG/WebP 保持原样
                if (isConvertibleImageSuffix(suffix)) {
                    uploadBytes = convertToWebP(bytes);
                    uploadSuffix = "webp";
                    uploadContentType = "image/webp";
                }

                String safeKey = StrUtil.blankToDefault(resource.getSourceKey(), IdWorker.getIdStr())
                        .replaceAll("[^a-zA-Z0-9_-]", "_");
                String fileName = safeKey + StrUtil.DOT + uploadSuffix;

                String fileId = devFileApi.uploadAssetReturnId(
                        null,
                        new ByteArrayMultipartFile(uploadBytes, "file", fileName, uploadContentType),
                        "MATERIAL",
                        uploadCategoryCode);

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

    /** 只有会丢失动图/矢量信息的格式不转换，普通位图统一转 WebP */
    private boolean isConvertibleImageSuffix(String suffix) {
        String lower = StrUtil.blankToDefault(suffix, "").toLowerCase(Locale.ROOT);
        return "jpg".equals(lower) || "jpeg".equals(lower) || "png".equals(lower) || "bmp".equals(lower);
    }

    /** 用 ImageIO 的 WebP Writer 编码，失败时保持原图入库流程不被静默吞掉 */
    private byte[] convertToWebP(byte[] bytes) {
        try {
            BufferedImage source = ImgUtil.toBufferedImage(ImgUtil.toImage(bytes));
            // webp-imageio 不支持 TYPE_CUSTOM，重绘成标准 INT 类型后再编码
            int imageType = source.getColorModel().hasAlpha()
                    ? BufferedImage.TYPE_INT_ARGB
                    : BufferedImage.TYPE_INT_RGB;
            BufferedImage image = new BufferedImage(source.getWidth(), source.getHeight(), imageType);
            Graphics2D graphics = image.createGraphics();
            try {
                graphics.drawImage(source, 0, 0, null);
            } finally {
                graphics.dispose();
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            if (!ImageIO.write(image, "webp", out)) {
                throw new CommonException("WebP 编码器不支持当前图像类型");
            }
            return out.toByteArray();
        } catch (CommonException e) {
            throw e;
        } catch (Exception e) {
            throw new CommonException("图片转 WebP 失败：" + e.getMessage());
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

        boolean deep = isDeepSearch(param);
        DeepCollectResult deepResult = deep ? resolveDeepMediaUrls(url, fetched, type, null) : null;
        List<String> mediaUrls = deep
                ? deepResult.mediaUrls
                : resolveRenderedMediaUrls(url, fetched, type);
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
        String deepInfo = deepResult == null ? "" : "，深度搜索扫描 " + deepResult.scannedPages + " 个页面";
        return "采集完成：从网页发现 " + mediaUrls.size() + " 个资源" + deepInfo + "，成功 " + success + " 个，已登记到素材资源库，可在列表中手动加入素材中心";
    }

    @Override
    public void collectUrlStream(BizAssetCollectUrlParam param, Consumer<AssetCollectEventVo> emitter) {
        try {
            String url = validateCollectUrl(param);
            String type = normalizeCollectType(param.getType());
            HttpFetchResult fetched = fetchUrl(url, 60000);
            boolean htmlPage = isHtml(fetched);
            boolean deep = isDeepSearch(param);
            DeepCollectResult deepResult = null;
            List<String> mediaUrls;
            if (htmlPage) {
                if (deep) {
                    deepResult = resolveDeepMediaUrls(url, fetched, type, emitter);
                    mediaUrls = deepResult.mediaUrls;
                } else {
                    emit(emitter, "progress", 0, 0, "正在渲染页面，等待动态内容加载", null);
                    mediaUrls = resolveRenderedMediaUrls(url, fetched, type);
                }
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
            String deepInfo = deepResult == null ? "" : "，深度搜索扫描 " + deepResult.scannedPages + " 个页面";
            emit(emitter, "done", mediaUrls.size(), mediaUrls.size(),
                    "采集完成：成功 " + success + " 个，失败 " + fail + " 个" + deepInfo, null);
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

    /**
     * 优先用无头浏览器渲染页面后再解析媒体地址，兼容图片由 JS / 接口动态加载的站点；
     * 浏览器不可用或渲染失败时回退静态 HTML 解析。
     */
    private List<String> resolveRenderedMediaUrls(String url, HttpFetchResult fetched, String type) {
        Map<String, String> chosen = new LinkedHashMap<>();
        AssetPageRenderer.Rendered rendered = AssetPageRenderer.render(url);
        if (rendered != null && StrUtil.isNotBlank(rendered.html())) {
            HttpFetchResult renderedPage = new HttpFetchResult(
                    rendered.html().getBytes(StandardCharsets.UTF_8), "text/html; charset=utf-8");
            collectMediaUrls(url, renderedPage, type, chosen);
            for (String mediaUrl : rendered.networkMediaUrls()) {
                offerMediaUrl(url, mediaUrl, type, chosen);
            }
        } else {
            collectMediaUrls(url, fetched, type, chosen);
        }
        return new ArrayList<>(chosen.values());
    }

    /** 把当前页面里的资源按规范 ID 收集到 chosen，高分地址（如 4K）会替换低分地址 */
    private void collectMediaUrls(String baseUrl, HttpFetchResult fetched, String type, Map<String, String> chosen) {
        String html = new String(fetched.bytes, StandardCharsets.UTF_8).replace("&amp;", "&");
        Matcher absolute = MEDIA_URL_PATTERN.matcher(html);
        while (absolute.find()) {
            offerMediaUrl(baseUrl, absolute.group().trim(), type, chosen);
        }
        Matcher relative = RELATIVE_MEDIA_PATTERN.matcher(html);
        while (relative.find()) {
            offerMediaUrl(baseUrl, relative.group(1).trim(), type, chosen);
        }
    }

    /** 相对路径按页面地址解析成绝对 URL，再按规范 ID 去重入库 */
    private void offerMediaUrl(String baseUrl, String candidate, String type, Map<String, String> chosen) {
        if (StrUtil.isBlank(candidate)) return;
        String url = candidate;
        if (!StrUtil.startWithAnyIgnoreCase(url, "http://", "https://")) {
            try {
                url = URI.create(baseUrl).resolve(url).toString();
            } catch (Exception e) {
                return;
            }
        }
        if (!StrUtil.startWithAnyIgnoreCase(url, "http://", "https://")) return;
        if (!matchesCollectType(url, type)) return;
        String key = canonicalMediaKey(url);
        String current = chosen.get(key);
        if (current == null || mediaScore(url) > mediaScore(current)) {
            chosen.put(key, url);
        }
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
            URI uri = URI.create(url);
            // 协议与域名不区分大小写，统一小写避免同一图被当成两条
            String origin = StrUtil.blankToDefault(uri.getScheme(), "").toLowerCase(Locale.ROOT)
                    + "://" + StrUtil.blankToDefault(uri.getAuthority(), "").toLowerCase(Locale.ROOT);
            String query = uri.getQuery();
            if (StrUtil.isNotBlank(query)) {
                List<String> parts = new ArrayList<>();
                for (String part : query.split("&")) {
                    if (part.startsWith("id=") && part.length() > 3) {
                        return "id:" + URLDecoder.decode(part.substring(3), StandardCharsets.UTF_8);
                    }
                    int eq = part.indexOf('=');
                    String key = (eq >= 0 ? part.substring(0, eq) : part).toLowerCase(Locale.ROOT);
                    // 尺寸/质量/追踪/签名参数不影响图片身份，去掉后避免同一资源被重复采集
                    if (MEDIA_QUERY_IGNORED_KEYS.contains(key)) {
                        continue;
                    }
                    parts.add(part);
                }
                // 参数顺序不影响图片身份，排序后再拼接，避免同图不同顺序被当成两条
                Collections.sort(parts);
                return origin + uri.getPath()
                        + (parts.isEmpty() ? "" : "?" + String.join("&", parts));
            }
            return origin + uri.getPath();
        } catch (Exception ignored) {
            // 非标准查询串直接按完整网址去重
            return url;
        }
    }

    private int mediaScore(String url) {
        String lower = url.toLowerCase(Locale.ROOT);
        // 归一化查询参数后，同一张图的不同尺寸会落到同一个 key，这里选分辨率最大的地址
        int score = paramNumber(WIDTH_PARAM_PATTERN, lower) / 160
                + paramNumber(HEIGHT_PARAM_PATTERN, lower) / 160;
        if (lower.contains("uhd")) score += 1;
        return score;
    }

    private int paramNumber(Pattern pattern, String url) {
        Matcher matcher = pattern.matcher(url);
        if (!matcher.find()) return 0;
        try {
            return Integer.parseInt(matcher.group(1));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private boolean isDeepSearch(BizAssetCollectUrlParam param) {
        return param != null && Boolean.TRUE.equals(param.getDeepSearch());
    }

    /**
     * 深度搜索：从入口页开始按站内链接广度优先抓取。
     * 页面按规范化 URL 去重，资源按规范资源 ID 去重，同一资源只保留质量最高的地址。
     */
    private DeepCollectResult resolveDeepMediaUrls(String startUrl, HttpFetchResult firstPage,
                                                   String type, Consumer<AssetCollectEventVo> emitter) {
        Queue<String> queue = new ArrayDeque<>();
        Set<String> visitedPages = new HashSet<>();
        Set<String> queuedPages = new HashSet<>();
        Map<String, String> chosen = new LinkedHashMap<>();

        queue.add(startUrl);
        queuedPages.add(canonicalPageKey(startUrl));

        int scanned = 0;
        while (!queue.isEmpty()) {
            String pageUrl = queue.poll();
            if (!visitedPages.add(canonicalPageKey(pageUrl))) {
                continue;
            }
            HttpFetchResult page = scanned == 0 ? firstPage : fetchUrlQuietly(pageUrl);
            if (page == null || !isHtml(page)) {
                continue;
            }

            collectMediaUrls(pageUrl, page, type, chosen);
            for (String link : extractInternalLinks(pageUrl, page)) {
                String key = canonicalPageKey(link);
                if (!visitedPages.contains(key) && queuedPages.add(key)) {
                    queue.add(link);
                }
            }
            scanned++;
            if (emitter != null) {
                emit(emitter, "progress", 0, 0,
                        "深度搜索：已扫描 " + scanned + " 个页面，发现 " + chosen.size() + " 个资源", null);
            }
        }
        return new DeepCollectResult(new ArrayList<>(chosen.values()), scanned);
    }

    /** 内链抓取失败不能中断整站采集 */
    private HttpFetchResult fetchUrlQuietly(String url) {
        try {
            return fetchUrl(url, DEEP_PAGE_TIMEOUT);
        } catch (Exception e) {
            log.warn("深度搜索页面抓取失败：{}，{}", url, e.getMessage());
            return null;
        }
    }

    /** 只跟踪同站 http/https 页面链接，排除静态资源和锚点 */
    private List<String> extractInternalLinks(String baseUrl, HttpFetchResult fetched) {
        URI base;
        try {
            base = URI.create(baseUrl);
        } catch (Exception e) {
            return Collections.emptyList();
        }
        String host = StrUtil.blankToDefault(base.getHost(), "").toLowerCase(Locale.ROOT);
        if (StrUtil.isBlank(host)) {
            return Collections.emptyList();
        }

        String html = new String(fetched.bytes, StandardCharsets.UTF_8).replace("&amp;", "&");
        Matcher matcher = HREF_PATTERN.matcher(html);
        List<String> links = new ArrayList<>();
        while (matcher.find()) {
            String href = matcher.group(1).trim();
            if (StrUtil.isBlank(href) || href.startsWith("#")) continue;
            String lower = href.toLowerCase(Locale.ROOT);
            if (lower.startsWith("javascript:") || lower.startsWith("mailto:")
                    || lower.startsWith("tel:") || lower.startsWith("data:")) {
                continue;
            }
            try {
                URI resolved = base.resolve(href);
                String scheme = StrUtil.blankToDefault(resolved.getScheme(), "").toLowerCase(Locale.ROOT);
                if (!"http".equals(scheme) && !"https".equals(scheme)) continue;
                if (!host.equals(StrUtil.blankToDefault(resolved.getHost(), "").toLowerCase(Locale.ROOT))) continue;
                String path = StrUtil.blankToDefault(resolved.getPath(), "").toLowerCase(Locale.ROOT);
                if (hasNonPageSuffix(path)) continue;
                links.add(resolved.toString());
            } catch (Exception ignored) {
                // 非法 href 直接跳过
            }
        }
        return links;
    }

    private boolean hasNonPageSuffix(String path) {
        for (String suffix : NON_PAGE_SUFFIXES) {
            if (path.endsWith(suffix)) return true;
        }
        return false;
    }

    /** 页面 URL 去重键：忽略锚点与常见追踪参数，保留分页等有效查询参数 */
    private String canonicalPageKey(String rawUrl) {
        try {
            URI uri = URI.create(rawUrl);
            String query = uri.getQuery();
            if (StrUtil.isNotBlank(query)) {
                List<String> parts = new ArrayList<>();
                for (String part : query.split("&")) {
                    String lower = part.toLowerCase(Locale.ROOT);
                    if (lower.startsWith("utm_") || lower.startsWith("fbclid=") || lower.startsWith("gclid=")) {
                        continue;
                    }
                    parts.add(part);
                }
                query = parts.isEmpty() ? "" : String.join("&", parts);
            }
            String scheme = StrUtil.blankToDefault(uri.getScheme(), "http").toLowerCase(Locale.ROOT);
            String host = StrUtil.blankToDefault(uri.getHost(), "").toLowerCase(Locale.ROOT);
            String path = StrUtil.blankToDefault(uri.getPath(), "/");
            return scheme + "://" + host + (uri.getPort() > 0 ? ":" + uri.getPort() : "")
                    + path + (StrUtil.isNotBlank(query) ? "?" + query : "");
        } catch (Exception e) {
            return rawUrl;
        }
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

        // 逻辑删除的记录仍占用唯一索引，这里连已删除数据一起查，命中后复用之
        BizAssetResource entity = resourceMapper.selectBySourceKeyIncludeDeleted(sourceKey, legacySourceKey);
        boolean created = entity == null;
        if (created) {
            entity = new BizAssetResource();
            entity.setId(IdWorker.getIdStr());
        } else if (!"NOT_DELETE".equals(entity.getDeleteFlag())) {
            resourceMapper.restoreById(entity.getId());
            entity.setDeleteFlag("NOT_DELETE");
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
            try {
                resourceMapper.insert(entity);
            } catch (DuplicateKeyException e) {
                // 并发采集兜底：另一请求已插入同源记录，回查后改为更新
                BizAssetResource existing = resourceMapper.selectBySourceKeyIncludeDeleted(sourceKey, legacySourceKey);
                if (existing == null) {
                    throw e;
                }
                entity.setId(existing.getId());
                entity.setDeleteFlag("NOT_DELETE");
                resourceMapper.restoreById(existing.getId());
                resourceMapper.updateById(entity);
            }
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

    /** 深度搜索结果：资源地址 + 实际扫描的页面数 */
    private static class DeepCollectResult {
        private final List<String> mediaUrls;
        private final int scannedPages;

        private DeepCollectResult(List<String> mediaUrls, int scannedPages) {
            this.mediaUrls = mediaUrls;
            this.scannedPages = scannedPages;
        }
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
