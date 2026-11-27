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
package vip.xiaonuo.dev.modular.file.service.impl;

import cn.hutool.core.collection.CollStreamUtil;
import cn.hutool.core.collection.CollUtil;
import cn.hutool.core.convert.Convert;
import cn.hutool.core.date.DateUtil;
import cn.hutool.core.img.ImgUtil;
import cn.hutool.core.io.FileUtil;
import cn.hutool.core.io.IoUtil;
import cn.hutool.core.util.BooleanUtil;
import cn.hutool.core.util.CharsetUtil;
import cn.hutool.core.util.NumberUtil;
import cn.hutool.core.util.ObjectUtil;
import cn.hutool.core.util.StrUtil;
import cn.hutool.core.util.URLUtil;
import cn.hutool.crypto.SecureUtil;
import cn.hutool.crypto.digest.HMac;
import cn.hutool.crypto.digest.HmacAlgorithm;
import cn.hutool.http.ContentType;
import cn.hutool.http.HttpUtil;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vip.xiaonuo.common.exception.CommonException;
import vip.xiaonuo.common.page.CommonPageRequest;
import vip.xiaonuo.common.pojo.CommonResult;
import vip.xiaonuo.common.prop.CommonProperties;
import vip.xiaonuo.common.util.CommonDownloadUtil;
import vip.xiaonuo.common.util.CommonResponseUtil;
import vip.xiaonuo.dev.modular.file.entity.DevFile;
import vip.xiaonuo.dev.modular.file.enums.DevFileBizTypeEnum;
import vip.xiaonuo.dev.modular.file.enums.DevFileBucketAuthEnum;
import vip.xiaonuo.dev.modular.file.enums.DevFileCategoryEnum;
import vip.xiaonuo.dev.modular.file.enums.DevFileEngineTypeEnum;
import vip.xiaonuo.dev.modular.file.mapper.DevFileMapper;
import vip.xiaonuo.dev.modular.file.param.DevFileDownloadParam;
import vip.xiaonuo.dev.modular.file.param.DevFileIdParam;
import vip.xiaonuo.dev.modular.file.param.DevFileListParam;
import vip.xiaonuo.dev.modular.file.param.DevFilePageParam;
import vip.xiaonuo.dev.modular.file.param.DevFileUrlListParam;
import vip.xiaonuo.dev.modular.file.service.DevFileService;
import vip.xiaonuo.dev.modular.file.util.*;

import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Iterator;
import java.util.List;

/**
 * 文件Service接口实现类
 *
 * @author xuyuxiang
 * @date 2022/2/23 18:43
 **/
@Slf4j
@Service
public class DevFileServiceImpl extends ServiceImpl<DevFileMapper, DevFile> implements DevFileService {

    @Resource
    private CommonProperties commonProperties;

    /** 补生成缩略图时读回的文件大小上限（KB），超过跳过，避免大文件整读进内存 */
    private static final long THUMBNAIL_MAX_SIZE_KB = 20 * 1024;

    /** 缩略图边长（像素），与上传时生成的缩略图一致 */
    private static final int THUMBNAIL_SIZE = 100;

    /** 文件下载签名密钥 */
    private static final String FILE_DOWNLOAD_SIGN_SECRET = "snowy_file_download_secret_key_2025";

    /** 缩略图文件名后缀（拼在源文件fileKey后，如 2026/11/22/123.webp -> 2026/11/22/123.webp_thumb.png） */
    private static final String THUMBNAIL_KEY_SUFFIX = "_thumb.png";

    /** 缩略图统一存到本地默认桶（与文件中心LOCAL引擎的固定桶一致） */
    private static final String THUMBNAIL_LOCAL_BUCKET = "defaultBucketName";

    @Override
    public String uploadReturnId(String engine, MultipartFile file) {
        return this.uploadReturnId(engine, file, DevFileBizTypeEnum.USER.getValue());
    }

    @Override
    public String uploadReturnId(String engine, MultipartFile file, String bizType) {
        return this.uploadReturnId(engine, file, bizType, null);
    }

    @Override
    public String uploadReturnId(String engine, MultipartFile file, String bizType, String categoryCode) {
        return this.storageFile(engine, file, true, false, bizType, categoryCode);
    }

    @Override
    public String uploadReturnIdWithValidation(String engine, MultipartFile file, List<String> allowedExtensions) {
        validateFileExtension(file, allowedExtensions);
        return this.storageFile(engine, file, true, true, DevFileBizTypeEnum.USER.getValue());
    }

    @Override
    public String uploadReturnUrl(String engine, MultipartFile file) {
        return this.uploadReturnUrl(engine, file, DevFileBizTypeEnum.USER.getValue());
    }

    @Override
    public String uploadReturnUrl(String engine, MultipartFile file, String bizType) {
        return this.uploadReturnUrl(engine, file, bizType, null);
    }

    @Override
    public String uploadReturnUrl(String engine, MultipartFile file, String bizType, String categoryCode) {
        return this.storageFile(engine, file, false, false, bizType, categoryCode);
    }

    @Override
    public String uploadReturnUrlWithValidation(String engine, MultipartFile file, List<String> allowedExtensions) {
        validateFileExtension(file, allowedExtensions);
        return this.storageFile(engine, file, false, false, DevFileBizTypeEnum.USER.getValue());
    }

    @Override
    public Page<DevFile> page(DevFilePageParam devFilePageParam) {
        QueryWrapper<DevFile> queryWrapper = new QueryWrapper<DevFile>().checkSqlInjection();
        boolean asc = "ASCEND".equals(devFilePageParam.getSortOrder());
        String sortField = devFilePageParam.getSortField();
        if ("name".equals(sortField)) {
            queryWrapper.orderBy(true, asc, "name");
        } else if ("sizeKb".equals(sortField)) {
            queryWrapper.orderBy(true, asc, "CAST(size_kb AS DECIMAL(18,2))");
        } else {
            queryWrapper.orderByDesc("create_time");
        }
        queryWrapper.orderByDesc("id");
        if(ObjectUtil.isNotEmpty(devFilePageParam.getEngine())) {
            queryWrapper.lambda().eq(DevFile::getEngine, devFilePageParam.getEngine());
        }
        if(ObjectUtil.isNotEmpty(devFilePageParam.getCategory())) {
            queryWrapper.lambda().eq(DevFile::getCategory, devFilePageParam.getCategory());
        }
        if(ObjectUtil.isNotEmpty(devFilePageParam.getCategoryCode())) {
            queryWrapper.lambda().eq(DevFile::getCategoryCode, devFilePageParam.getCategoryCode());
        }
        if(ObjectUtil.isNotEmpty(devFilePageParam.getBizType())) {
            queryWrapper.lambda().eq(DevFile::getBizType, devFilePageParam.getBizType());
        }
        if(ObjectUtil.isNotEmpty(devFilePageParam.getSearchKey())) {
            queryWrapper.lambda().like(DevFile::getName, devFilePageParam.getSearchKey());
        }
        return this.page(CommonPageRequest.defaultPage(), queryWrapper);
    }

    @Override
    public List<DevFile> list(DevFileListParam devFileListParam) {
        QueryWrapper<DevFile> queryWrapper = new QueryWrapper<DevFile>().checkSqlInjection();
        if(ObjectUtil.isNotEmpty(devFileListParam.getEngine())) {
            queryWrapper.lambda().eq(DevFile::getEngine, devFileListParam.getEngine());
        }
        if(ObjectUtil.isNotEmpty(devFileListParam.getCategory())) {
            queryWrapper.lambda().eq(DevFile::getCategory, devFileListParam.getCategory());
        }
        if(ObjectUtil.isNotEmpty(devFileListParam.getCategoryCode())) {
            queryWrapper.lambda().eq(DevFile::getCategoryCode, devFileListParam.getCategoryCode());
        }
        if(ObjectUtil.isNotEmpty(devFileListParam.getBizType())) {
            queryWrapper.lambda().eq(DevFile::getBizType, devFileListParam.getBizType());
        }
        if(ObjectUtil.isNotEmpty(devFileListParam.getSearchKey())) {
            queryWrapper.lambda().like(DevFile::getName, devFileListParam.getSearchKey());
        }
        return this.list(queryWrapper);
    }

    @Override
    public void download(DevFileDownloadParam devFileDownloadParam, HttpServletResponse response) throws IOException {
        // 验证签名
        if (!verifyDownloadSign(devFileDownloadParam.getId(), devFileDownloadParam.getSign())) {
            CommonResponseUtil.renderError(response, "下载链接无效，请使用正确的下载地址");
            return;
        }
        DevFileIdParam devFileIdParam = new DevFileIdParam();
        devFileIdParam.setId(devFileDownloadParam.getId());
        unifiedDownload(devFileIdParam, response, false);
    }

    @Override
    public void authDownload(DevFileIdParam devFileIdParam, HttpServletResponse response) throws IOException {
        unifiedDownload(devFileIdParam, response, true);
    }

    // 统一下载
    private void unifiedDownload(DevFileIdParam devFileIdParam, HttpServletResponse response,  boolean isDownloadAuth)  throws IOException{
        DevFile devFile;
        try {
            devFile = this.queryEntity(devFileIdParam.getId());
        } catch (Exception e) {
            CommonResponseUtil.renderError(response, e.getMessage());
            return;
        }
        if (BooleanUtil.isTrue(devFile.getIsDownloadAuth()) && !isDownloadAuth){
            CommonResponseUtil.renderError(response, "该文件需要授权下载，请使用授权接口authDownload进行下载！");
            return;
        }
        String engine = devFile.getEngine();
        boolean knownEngine = Arrays.stream(DevFileEngineTypeEnum.values()).anyMatch(item -> item.getValue().equals(engine));
        if (knownEngine) {
            streamDownload(devFile, response);
        } else {
            String storagePath = devFile.getStoragePath();
            CommonDownloadUtil.download(devFile.getName(), HttpUtil.downloadBytes(storagePath), response);
        }
    }

    @Override
    public void streamForPlay(String id, String sign, jakarta.servlet.http.HttpServletRequest request,
                              HttpServletResponse response) throws IOException {
        log.debug(">>> 视频流式播放请求，id: {}，sign前缀: {}", id,
                StrUtil.isBlank(sign) ? "" : sign.substring(0, Math.min(12, sign.length())));
        try {
            doStreamForPlay(id, sign, request, response);
        } catch (Exception e) {
            // 客户端切换视频、拖动进度条或关闭页面会中断 Range 请求，
            // 这类断开不是服务端异常，静默处理即可
            if (isClientDisconnect(e)) {
                log.debug(">>> 视频流式播放连接已断开，id: {}，原因: {}", id, e.getMessage());
                return;
            }
            log.error(">>> 视频流式播放异常，id: {}", id, e);
            if (!response.isCommitted()) {
                CommonResponseUtil.renderError(response, "播放失败：" + e.getMessage());
            }
        }
    }

    private void doStreamForPlay(String id, String sign, jakarta.servlet.http.HttpServletRequest request,
                                 HttpServletResponse response) throws IOException {
        if (!verifyDownloadSign(id, sign)) {
            CommonResponseUtil.renderError(response, "播放链接无效，请使用正确的地址");
            return;
        }
        DevFile devFile;
        try {
            devFile = this.queryEntity(id);
        } catch (Exception e) {
            CommonResponseUtil.renderError(response, e.getMessage());
            return;
        }
        if (BooleanUtil.isTrue(devFile.getIsDownloadAuth())) {
            CommonResponseUtil.renderError(response, "该文件不允许公开播放");
            return;
        }

        boolean isLocal = DevFileEngineTypeEnum.LOCAL.getValue().equals(devFile.getEngine());
        File localFile = isLocal ? FileUtil.file(devFile.getStoragePath()) : null;
        Long fileSize;
        try {
            fileSize = isLocal
                    ? (FileUtil.isFile(localFile) ? localFile.length() : null)
                    : this.getFileSize(devFile.getEngine(), devFile.getBucket(), devFile.getFileKey());
        } catch (Exception e) {
            CommonResponseUtil.renderError(response, e.getMessage());
            return;
        }
        if (ObjectUtil.isNull(fileSize) || fileSize <= 0) {
            CommonResponseUtil.renderError(response, "找不到存储的文件，id值为：" + id);
            return;
        }

        String contentType = resolvePlayContentType(devFile.getSuffix());
        response.setContentType(contentType);
        response.setCharacterEncoding(CharsetUtil.UTF_8);
        response.setHeader("Accept-Ranges", "bytes");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Cache-Control", "public, max-age=3600");

        long start = 0;
        long end = fileSize - 1;
        String range = request.getHeader("Range");
        boolean partial = false;
        if (StrUtil.isNotBlank(range) && range.startsWith("bytes=")) {
            String rangeValue = StrUtil.removePrefix(range, "bytes=").split(",")[0].trim();
            String[] parts = rangeValue.split("-", 2);
            try {
                if (StrUtil.isNotBlank(parts[0])) {
                    start = Math.max(0, Long.parseLong(parts[0]));
                }
                if (parts.length > 1 && StrUtil.isNotBlank(parts[1])) {
                    end = Math.min(fileSize - 1, Long.parseLong(parts[1]));
                }
                if (start <= end && start < fileSize) {
                    partial = true;
                } else {
                    start = 0;
                    end = fileSize - 1;
                }
            } catch (NumberFormatException ignored) {
                start = 0;
                end = fileSize - 1;
            }
        }

        long contentLength = end - start + 1;
        response.setContentLengthLong(contentLength);
        if (partial) {
            response.setStatus(jakarta.servlet.http.HttpServletResponse.SC_PARTIAL_CONTENT);
            response.setHeader("Content-Range", "bytes " + start + "-" + end + "/" + fileSize);
        }

        OutputStream outputStream = response.getOutputStream();
        if (isLocal) {
            try (InputStream inputStream = FileUtil.getInputStream(localFile)) {
                if (start > 0) {
                    long skipped = 0;
                    while (skipped < start) {
                        long current = inputStream.skip(start - skipped);
                        if (current <= 0) {
                            break;
                        }
                        skipped += current;
                    }
                }
                writeRange(inputStream, outputStream, contentLength);
            }
        } else {
            // 对象存储：走完整流，按 Range 截取输出（避免整文件载入内存）
            writeObjectRange(devFile, outputStream, start, contentLength);
        }
    }

    /**
     * 按内容长度输出输入流
     */
    private void writeRange(InputStream inputStream, OutputStream outputStream, long length) throws IOException {
        byte[] buffer = new byte[8192];
        long remaining = length;
        while (remaining > 0) {
            int read = inputStream.read(buffer, 0, (int) Math.min(buffer.length, remaining));
            if (read < 0) {
                break;
            }
            try {
                outputStream.write(buffer, 0, read);
            } catch (IOException e) {
                // 浏览器停止接收视频分片后，继续写入会触发 Connection reset / Broken pipe
                if (isClientDisconnect(e)) {
                    log.debug(">>> 视频流式播放写入中断，原因: {}", e.getMessage());
                    return;
                }
                throw e;
            }
            remaining -= read;
        }
    }

    /**
     * 对象存储按 Range 输出
     */
    private void writeObjectRange(DevFile devFile, OutputStream outputStream, long start, long length) throws IOException {
        java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream();
        this.writeFileToStream(devFile.getEngine(), devFile.getBucket(), devFile.getFileKey(), buffer);
        byte[] bytes = buffer.toByteArray();
        int from = (int) Math.min(start, bytes.length);
        int to = (int) Math.min(from + length, bytes.length);
        if (from < to) {
            try {
                outputStream.write(bytes, from, to - from);
            } catch (IOException e) {
                if (isClientDisconnect(e)) {
                    log.debug(">>> 视频流式播放对象存储写入中断，原因: {}", e.getMessage());
                    return;
                }
                throw e;
            }
        }
    }

    /**
     * 判断是否为客户端主动断开连接导致的异常
     */
    private boolean isClientDisconnect(Throwable e) {
        Throwable current = e;
        while (current != null) {
            String className = current.getClass().getName();
            String message = current.getMessage();
            if (className.contains("ClientAbortException") ||
                    className.contains("AsyncRequestNotUsableException") ||
                    StrUtil.containsAnyIgnoreCase(message,
                            "Connection reset by peer",
                            "Connection reset",
                            "Broken pipe",
                            "Connection aborted",
                            "Socket closed")) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    /**
     * 根据后缀推断播放 Content-Type
     */
    private String resolvePlayContentType(String suffix) {
        if (StrUtil.isBlank(suffix)) {
            return "video/mp4";
        }
        String ext = suffix.toLowerCase().replace(".", "");
        return switch (ext) {
            case "mp4" -> "video/mp4";
            case "webm" -> "video/webm";
            case "mov" -> "video/quicktime";
            case "ogg", "ogv" -> "video/ogg";
            case "m4v" -> "video/x-m4v";
            case "mp3" -> "audio/mpeg";
            case "wav" -> "audio/wav";
            default -> "application/octet-stream";
        };
    }

    /**
     * 边读存储边输出文件并带上实际大小（前端据此显示进度），本地文件按存储路径读取，响应头与CommonDownloadUtil一致
     *
     * @author yubaoshan
     * @date 2026/10/14 01:30
     */
    private void streamDownload(DevFile devFile, HttpServletResponse response) throws IOException {
        boolean isLocal = DevFileEngineTypeEnum.LOCAL.getValue().equals(devFile.getEngine());
        File localFile = isLocal ? FileUtil.file(devFile.getStoragePath()) : null;
        Long fileSize;
        try {
            // 先取实际大小，文件不存在时还未写响应头，能正常返回错误信息
            fileSize = isLocal ? (FileUtil.isFile(localFile) ? localFile.length() : null)
                    : this.getFileSize(devFile.getEngine(), devFile.getBucket(), devFile.getFileKey());
        } catch (Exception e) {
            CommonResponseUtil.renderError(response, e.getMessage());
            return;
        }
        if (ObjectUtil.isNull(fileSize)) {
            CommonResponseUtil.renderError(response, "找不到存储的文件，id值为：" + devFile.getId());
            return;
        }
        response.setHeader("Content-Disposition", "attachment;filename=" + URLUtil.encode(devFile.getName()));
        response.setContentLengthLong(fileSize);
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
        response.setContentType("application/octet-stream;charset=UTF-8");
        OutputStream outputStream = response.getOutputStream();
        try {
            if (isLocal) {
                try (InputStream inputStream = FileUtil.getInputStream(localFile)) {
                    IoUtil.copy(inputStream, outputStream);
                }
            } else {
                this.writeFileToStream(devFile.getEngine(), devFile.getBucket(), devFile.getFileKey(), outputStream);
            }
        } catch (Exception e) {
            // 已开始输出文件内容时无法再返回错误信息，前端会因内容长度不足判定失败
            if (response.isCommitted()) {
                log.warn(">>> 文件下载中断，文件id：{}，原因：{}", devFile.getId(), e.getMessage());
                return;
            }
            // 已取得字节输出流，不能再用字符流输出，改回JSON后直接写字节
            response.resetBuffer();
            response.setContentLengthLong(-1);
            response.setCharacterEncoding(CharsetUtil.UTF_8);
            response.setContentType(ContentType.JSON.toString());
            outputStream.write(JSONUtil.toJsonStr(CommonResult.error(e.getMessage())).getBytes(StandardCharsets.UTF_8));
        }
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void delete(List<DevFileIdParam> devFileIdParamList) {
        this.removeByIds(CollStreamUtil.toList(devFileIdParamList, DevFileIdParam::getId));
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void updateBizType(List<String> ids, String bizType) {
        if (CollUtil.isEmpty(ids)) {
            throw new CommonException("请选择文件");
        }
        if (!DevFileBizTypeEnum.MATERIAL.getValue().equalsIgnoreCase(bizType)
                && !DevFileBizTypeEnum.USER.getValue().equalsIgnoreCase(bizType)) {
            throw new CommonException("不支持的库类型：{}", bizType);
        }
        LambdaUpdateWrapper<DevFile> updateWrapper = Wrappers.lambdaUpdate();
        updateWrapper.in(DevFile::getId, ids)
                .set(DevFile::getBizType, bizType.toUpperCase());
        this.update(updateWrapper);
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void updateCategoryCode(List<String> ids, String categoryCode) {
        if (CollUtil.isEmpty(ids)) {
            throw new CommonException("请选择文件");
        }
        LambdaUpdateWrapper<DevFile> updateWrapper = Wrappers.lambdaUpdate();
        updateWrapper.in(DevFile::getId, ids)
                .set(DevFile::getCategoryCode, categoryCode);
        this.update(updateWrapper);
    }

    @Override
    public void deleteAbsolute(DevFileIdParam devFileIdParam) {
        DevFile devFile = this.queryEntity(devFileIdParam.getId());
        // 按内容复用后多条记录可能共用一个存储对象，还有其他记录在用时只删本条记录，不删对象
        if (countOtherReferences(devFile) > 0) {
            this.baseMapper.deleteAbsoluteById(devFile.getId());
            return;
        }
        try {
            // 存储引擎
            String engine = devFile.getEngine();
            // 存储桶名称
            String bucketName = devFile.getBucket();
            // 文件key
            String fileKey = devFile.getFileKey();
            // 根据存储引擎删除文件
            if (DevFileEngineTypeEnum.LOCAL.getValue().equals(engine)) {
                DevFileLocalUtil.deleteFile(bucketName, fileKey);
            } else if (DevFileEngineTypeEnum.ALIYUN.getValue().equals(engine)) {
                DevFileAliyunUtil.deleteFile(bucketName, fileKey);
            } else if (DevFileEngineTypeEnum.TENCENT.getValue().equals(engine)) {
                DevFileTencentUtil.deleteFile(bucketName, fileKey);
            } else if (DevFileEngineTypeEnum.MINIO.getValue().equals(engine)) {
                DevFileMinIoUtil.deleteFile(bucketName, fileKey);
            } else if (DevFileEngineTypeEnum.RUSTFS.getValue().equals(engine)) {
                DevFileRustFsUtil.deleteFile(bucketName, fileKey);
            } else if (DevFileEngineTypeEnum.FTP.getValue().equals(engine)) {
                DevFileFtpUtil.deleteFile(bucketName, fileKey);
            } else {
                log.error("未知存储引擎：{}", engine);
            }
        } catch (Exception e) {
            log.error("文件删除失败：{}，路径：{}", devFile.getName(), devFile.getStoragePath(), e);
            throw new CommonException("文件删除失败"); // 触发事务回滚
        }
        // 同步删除本地磁盘上的缩略图文件（存在才删，避免误报）
        String thumbKey = devFile.getFileKey() + THUMBNAIL_KEY_SUFFIX;
        try {
            java.io.File thumbFile = DevFileLocalUtil.getFileByBucketNameAndKey(THUMBNAIL_LOCAL_BUCKET, thumbKey);
            if (FileUtil.exist(thumbFile)) {
                DevFileLocalUtil.deleteFile(THUMBNAIL_LOCAL_BUCKET, thumbKey);
            }
        } catch (Exception ignored) {
            // 缩略图不存在或删除失败不影响主文件删除流程
        }
        this.baseMapper.deleteAbsoluteById(devFile.getId());
    }

    /**
     * 存储文件
     *
     * @author xuyuxiang
     * @date 2022/6/16 16:24
     **/
    private String storageFile(String engine, MultipartFile file, boolean returnFileId, Boolean isDownloadAuth,
                               String bizType) {
        return this.storageFile(engine, file, returnFileId, isDownloadAuth, bizType, null);
    }

    private String storageFile(String engine, MultipartFile file, boolean returnFileId, Boolean isDownloadAuth,
                               String bizType, String categoryCode) {

        // 如果引擎为空，默认使用本地
        if(ObjectUtil.isEmpty(engine)) {
            engine = DevFileEngineTypeEnum.LOCAL.getValue();
        }

        // 生成id
        String fileId = IdWorker.getIdStr();

        // 存储桶名称
        String bucketName;

        String fileKey = genFileKey(fileId, file);

        // 定义存储的url，本地文件返回文件实际路径，其他引擎返回网络地址
        String storageUrl;

        // 根据引擎类型执行不同方法
        if(engine.equals(DevFileEngineTypeEnum.LOCAL.getValue())) {

            // 使用固定名称defaultBucketName
            bucketName = "defaultBucketName";
            storageUrl = DevFileLocalUtil.storageFileWithReturnUrl(bucketName, fileKey, file);
        } else if(engine.equals(DevFileEngineTypeEnum.ALIYUN.getValue())) {

            // 使用阿里云默认配置的bucketName
            bucketName = DevFileAliyunUtil.getDefaultBucketName();
            storageUrl = DevFileAliyunUtil.storageFileWithReturnUrl(bucketName, fileKey, file);
        } else if(engine.equals(DevFileEngineTypeEnum.TENCENT.getValue())) {

            // 使用腾讯云默认配置的bucketName
            bucketName = DevFileTencentUtil.getDefaultBucketName();
            storageUrl = DevFileTencentUtil.storageFileWithReturnUrl(bucketName, fileKey, file);
        } else if(engine.equals(DevFileEngineTypeEnum.MINIO.getValue())) {

            // 使用MINIO默认配置的bucketName
            bucketName = DevFileMinIoUtil.getDefaultBucketName();
            storageUrl = DevFileMinIoUtil.storageFileWithReturnUrl(bucketName, fileKey, file);
        } else if(engine.equals(DevFileEngineTypeEnum.RUSTFS.getValue())) {

            // 使用RUSTFS默认配置的bucketName
            bucketName = DevFileRustFsUtil.getDefaultBucketName();
            storageUrl = DevFileRustFsUtil.storageFileWithReturnUrl(bucketName, fileKey, file);
        } else if(engine.equals(DevFileEngineTypeEnum.FTP.getValue())) {

            // 使用FTP默认配置的bucketName
            bucketName = DevFileFtpUtil.getDefaultBucketName();
            storageUrl = DevFileFtpUtil.storageFileWithReturnUrl(bucketName, fileKey, file);
        } else {
            throw new CommonException("不支持的文件引擎：{}", engine);
        }

        // 将文件信息保存到数据库
        DevFile devFile = new DevFile();

        // 设置文件id
        devFile.setId(fileId);

        // 设置存储引擎类型
        devFile.setEngine(engine);
        devFile.setBucket(bucketName);
        devFile.setFileKey(fileKey);
        devFile.setName(file.getOriginalFilename());
        String suffix = ObjectUtil.isNotEmpty(file.getOriginalFilename())?StrUtil.subAfter(file.getOriginalFilename(),
                StrUtil.DOT, true):null;
        devFile.setSuffix(suffix);
        devFile.setCategory(DevFileCategoryEnum.inferBySuffix(suffix));
        devFile.setCategoryCode(ObjectUtil.isNotEmpty(categoryCode) ? categoryCode : null);
        devFile.setBizType(DevFileBizTypeEnum.normalize(bizType));
        devFile.setSizeKb(Convert.toStr(NumberUtil.div(new BigDecimal(file.getSize()), BigDecimal.valueOf(1024))
                .setScale(0,  RoundingMode.HALF_UP )));
        devFile.setSizeInfo(FileUtil.readableFileSize(file.getSize()));
        devFile.setObjName(ObjectUtil.isNotEmpty(devFile.getSuffix())?fileId + StrUtil.DOT + devFile.getSuffix():null);
        // 如果是图片，则压缩生成缩略图并落盘（不再存base64到数据库）
        if(ObjectUtil.isNotEmpty(suffix)) {
            if(isPic(suffix)) {
                try {
                    BufferedImage thumbImage = ImgUtil.toBufferedImage(ImgUtil.scale(ImgUtil.toImage(file.getBytes()),
                            THUMBNAIL_SIZE, THUMBNAIL_SIZE, null));
                    ByteArrayOutputStream thumbOut = new ByteArrayOutputStream();
                    ImageIO.write(thumbImage, "png", thumbOut);
                    devFile.setThumbnail(this.storageThumbnailToDisk(fileId, bucketName, fileKey,
                            suffix, thumbOut.toByteArray()));
                } catch (Exception ignored) {
                }
            }
        }
        // 存储路径
        devFile.setStoragePath(storageUrl);

        // 定义下载地址
        String downloadUrl;
        String apiUrl = commonProperties.getBackendUrl();
        if(ObjectUtil.isEmpty(apiUrl)) {
            throw new CommonException("后端域名地址未正确配置：snowy.config.common.backend-url为空");
        }
        if (BooleanUtil.isTrue(isDownloadAuth)){
            downloadUrl= apiUrl + "/dev/file/authDownload?id=" + fileId + "&token=";
        }else {
            // 公开文件使用带签名的 download 接口
            String sign = generateDownloadSign(fileId);
            downloadUrl= apiUrl + "/dev/file/download?id=" + fileId + "&sign=" + sign;
        }
        devFile.setDownloadPath(downloadUrl);

//        // 下载路径，注意：本地文件下载地址设置为下载接口地址 + 文件id
//        if(engine.equals(DevFileEngineTypeEnum.LOCAL.getValue())) {
//            String apiUrl = commonProperties.getBackendUrl();
//            if(ObjectUtil.isEmpty(apiUrl)) {
//                throw new CommonException("后端域名地址未正确配置：snowy.config.common.backend-url为空");
//            }
//            downloadUrl= apiUrl + "/dev/file/download?id=" + fileId;
//            devFile.setDownloadPath(downloadUrl);
//        } else {
//            // 阿里云、腾讯云、MINIO可以直接使用存储地址（公网）作为下载地址
//            downloadUrl= storageUrl;
//            devFile.setDownloadPath(devFile.getStoragePath());
//        }

        devFile.setIsDownloadAuth(isDownloadAuth);

        this.save(devFile);

        // 如果是返回id则返回文件id
        if(returnFileId) {
            return fileId;
        } else {
            // 否则返回下载地址
            return downloadUrl;
        }
    }

    /**
     * 生成文件的key，格式如 2021/10/11/1377109572375810050.docx
     *
     * @author xuyuxiang
     * @date 2022/4/22 15:58
     **/
    public String genFileKey(String fileId, MultipartFile file) {

        // 获取文件原始名称
        String originalFileName = file.getOriginalFilename();

        // 获取文件后缀
        String fileSuffix = FileUtil.getSuffix(originalFileName);

        // 生成文件的对象名称，格式如:1377109572375810050.docx
        String fileObjectName = fileId + StrUtil.DOT + fileSuffix;

        // 获取日期文件夹，格式如，2021/10/11/
        String dateFolderPath = DateUtil.thisYear() + StrUtil.SLASH +
                (DateUtil.thisMonth() + 1) + StrUtil.SLASH +
                DateUtil.thisDayOfMonth() + StrUtil.SLASH;

        // 返回
        return dateFolderPath + fileObjectName;
    }

    @Override
    public DevFile detail(DevFileIdParam devFileIdParam) {
        return this.queryEntity(devFileIdParam.getId());
    }

    @Override
    public List<DevFile> getFileListByUrlList(DevFileUrlListParam devFileUrlListParam) {
        LambdaQueryWrapper<DevFile> lambdaQueryWrapper = new LambdaQueryWrapper<>();
        // 只查询部分字段
        lambdaQueryWrapper.select(DevFile::getId, DevFile::getSuffix, DevFile::getDownloadPath, DevFile::getName, DevFile::getThumbnail,
                        DevFile::getSizeKb, DevFile::getSizeInfo, DevFile::getObjName)
                .in(DevFile::getDownloadPath, devFileUrlListParam.getUrlList());
        return this.list(lambdaQueryWrapper);
    }

    @Override
    public DevFile queryEntity(String id) {
        DevFile devFile = this.getById(id);
        if(ObjectUtil.isEmpty(devFile)) {
            throw new CommonException("文件不存在，id值为：{}", id);
        }
        return devFile;
    }

    @Override
    public List<DevFile> getFileListByIds(List<String> ids) {
        return list(Wrappers.<DevFile>lambdaQuery().in(DevFile::getId,ids));
    }

    @Override
    public String registerExistingFile(String engine, String bucket, String objectKey, String fileName, Long sizeBytes) {
        if (StrUtil.hasBlank(objectKey, fileName)) {
            throw new CommonException("登记已存在对象时对象键与文件名不能为空");
        }
        if (ObjectUtil.isNull(sizeBytes) || sizeBytes < 0) {
            throw new CommonException("登记已存在对象时文件大小不能为空且不能为负数");
        }
        // 只登记不上传需要按引擎核对对象，目前只有RUSTFS提供了取对象大小的能力
        if (!DevFileEngineTypeEnum.RUSTFS.getValue().equals(engine)) {
            throw new CommonException("登记已存在对象暂只支持RUSTFS存储引擎，当前引擎：{}", engine);
        }
        // 下载地址依赖后端域名，先校验再写库
        String backendUrl = getBackendUrl();
        String defaultBucketName = DevFileRustFsUtil.getDefaultBucketName();
        String bucketName = StrUtil.blankToDefault(bucket, defaultBucketName);
        if (!bucketName.equals(defaultBucketName)) {
            throw new CommonException("对象所在桶（{}）与中台RUSTFS默认桶（{}）不一致", bucketName, defaultBucketName);
        }
        Long actualSize = DevFileRustFsUtil.getFileSize(bucketName, objectKey);
        if (ObjectUtil.isNull(actualSize)) {
            throw new CommonException("对象存储中不存在该对象：{}", objectKey);
        }
        if (!actualSize.equals(sizeBytes)) {
            throw new CommonException("对象实际大小（{}字节）与登记大小（{}字节）不一致", actualSize, sizeBytes);
        }
        String fileId = IdWorker.getIdStr();
        DevFile devFile = buildAuthDevFile(fileId, engine, bucketName, objectKey, fileName, sizeBytes,
                DevFileRustFsUtil.getFileAuthUrl(bucketName, objectKey), backendUrl);
        this.save(devFile);
        return fileId;
    }

    @Override
    public String uploadStreamReturnId(String engine, InputStream inputStream, String fileName, Long size) {
        if (ObjectUtil.isNull(inputStream)) {
            throw new CommonException("待存储的文件流不能为空");
        }
        // 无论成功失败都由本方法关闭文件流
        try {
            if (StrUtil.isBlank(fileName)) {
                throw new CommonException("待存储的文件名不能为空");
            }
            if (ObjectUtil.isNull(size) || size < 0) {
                throw new CommonException("待存储的文件大小不能为空且不能为负数");
            }
            // 引擎为空时与storageFile一致使用本地
            String engineValue = ObjectUtil.isEmpty(engine) ? DevFileEngineTypeEnum.LOCAL.getValue() : engine;
            // 下载地址依赖后端域名，先校验再写存储
            String backendUrl = getBackendUrl();
            String fileId = IdWorker.getIdStr();
            String fileKey = genFileKeyByName(fileId, fileName);
            String bucketName;
            String storageUrl;
            // 存储路径格式与storageFile一致
            if (engineValue.equals(DevFileEngineTypeEnum.LOCAL.getValue())) {
                bucketName = "defaultBucketName";
                storageUrl = DevFileLocalUtil.storageFileWithReturnUrl(bucketName, fileKey, inputStream);
            } else if (engineValue.equals(DevFileEngineTypeEnum.ALIYUN.getValue())) {
                // 按已知长度流式写入，对象设为私有，下载走后端按桶名与文件键经SDK读取
                bucketName = DevFileAliyunUtil.getDefaultBucketName();
                DevFileAliyunUtil.storageFile(bucketName, fileKey, inputStream, size);
                DevFileAliyunUtil.setFileAcl(bucketName, fileKey, DevFileBucketAuthEnum.PRIVATE);
                storageUrl = DevFileAliyunUtil.getFileAuthUrl(bucketName, fileKey);
            } else if (engineValue.equals(DevFileEngineTypeEnum.TENCENT.getValue())) {
                // 按已知长度流式写入，对象设为私有，下载走后端按桶名与文件键经SDK读取
                bucketName = DevFileTencentUtil.getDefaultBucketName();
                DevFileTencentUtil.storageFile(bucketName, fileKey, inputStream, size);
                DevFileTencentUtil.setFileAcl(bucketName, fileKey, DevFileBucketAuthEnum.PRIVATE);
                storageUrl = DevFileTencentUtil.getFileAuthUrl(bucketName, fileKey);
            } else if (engineValue.equals(DevFileEngineTypeEnum.MINIO.getValue())) {
                // 按已知长度流式写入；MINIO没有对象级权限，setFileAcl会覆盖整桶策略，这里不设公开可读，权限随桶策略
                bucketName = DevFileMinIoUtil.getDefaultBucketName();
                DevFileMinIoUtil.storageFile(bucketName, fileKey, inputStream, size);
                storageUrl = DevFileMinIoUtil.getFileAuthUrl(bucketName, fileKey);
            } else if (engineValue.equals(DevFileEngineTypeEnum.RUSTFS.getValue())) {
                // 按已知长度流式写入，对象保持私有，下载走后端按桶名与文件键读取
                bucketName = DevFileRustFsUtil.getDefaultBucketName();
                DevFileRustFsUtil.storageFile(bucketName, fileKey, inputStream, size);
                storageUrl = DevFileRustFsUtil.getFileAuthUrl(bucketName, fileKey);
            } else if (engineValue.equals(DevFileEngineTypeEnum.FTP.getValue())) {
                bucketName = DevFileFtpUtil.getDefaultBucketName();
                DevFileFtpUtil.storageFile(bucketName, fileKey, inputStream);
                storageUrl = DevFileFtpUtil.getFileAuthUrl(bucketName, fileKey);
            } else {
                throw new CommonException("不支持的文件引擎：{}", engineValue);
            }
            DevFile devFile = buildAuthDevFile(fileId, engineValue, bucketName, fileKey, fileName, size, storageUrl, backendUrl);
            this.save(devFile);
            return fileId;
        } finally {
            IoUtil.close(inputStream);
        }
    }

    @Override
    public void generateThumbnail(String fileId) {
        DevFile devFile = this.getById(fileId);
        if (ObjectUtil.isNull(devFile) || StrUtil.isNotBlank(devFile.getThumbnail())
                || StrUtil.isBlank(devFile.getSuffix()) || !isPic(devFile.getSuffix())) {
            return;
        }
        if (Convert.toLong(devFile.getSizeKb(), 0L) > THUMBNAIL_MAX_SIZE_KB) {
            return;
        }
        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        writeFileToStream(devFile.getEngine(), devFile.getBucket(), devFile.getFileKey(), outputStream);
        BufferedImage image = readSubsampledImage(outputStream.toByteArray(), THUMBNAIL_SIZE);
        if (ObjectUtil.isNull(image)) {
            return;
        }
        BufferedImage thumbImage = ImgUtil.toBufferedImage(ImgUtil.scale(image, THUMBNAIL_SIZE, THUMBNAIL_SIZE, null));
        ByteArrayOutputStream thumbOut = new ByteArrayOutputStream();
        try {
            ImageIO.write(thumbImage, "png", thumbOut);
        } catch (IOException e) {
            log.error("生成缩略图字节失败，文件id：{}，原因：{}", fileId, e.getMessage());
            return;
        }
        String thumbnail = this.storageThumbnailToDisk(fileId, devFile.getBucket(), devFile.getFileKey(),
                devFile.getSuffix(), thumbOut.toByteArray());
        // 只在仍无缩略图时写入，不覆盖其他途径已生成的结果
        this.update(new LambdaUpdateWrapper<DevFile>().eq(DevFile::getId, fileId).isNull(DevFile::getThumbnail)
                .set(DevFile::getThumbnail, thumbnail));
    }

    @Override
    public String registerSharedFile(String sourceFileId, String targetEngine, String fileName, Long sizeBytes) {
        if (StrUtil.hasBlank(sourceFileId, targetEngine, fileName) || ObjectUtil.isNull(sizeBytes) || sizeBytes < 0) {
            return null;
        }
        DevFile source = this.getById(sourceFileId);
        // 只复用目标引擎里的对象，数据随默认引擎收敛，不跨引擎混用
        if (ObjectUtil.isNull(source) || !targetEngine.equals(source.getEngine()) || StrUtil.isBlank(source.getFileKey())) {
            return null;
        }
        Long actualSize;
        try {
            actualSize = this.getFileSize(source.getEngine(), source.getBucket(), source.getFileKey());
        } catch (Exception e) {
            log.warn(">>> 复用已有存储对象前核对失败，源文件id：{}，原因：{}", sourceFileId, e.getMessage());
            return null;
        }
        if (!sizeBytes.equals(actualSize)) {
            return null;
        }
        String fileId = IdWorker.getIdStr();
        DevFile devFile = buildAuthDevFile(fileId, source.getEngine(), source.getBucket(), source.getFileKey(), fileName,
                sizeBytes, source.getStoragePath(), getBackendUrl());
        // 内容相同缩略图也相同，图片直接沿用源记录的缩略图
        if (ObjectUtil.isNotEmpty(devFile.getSuffix()) && isPic(devFile.getSuffix())) {
            devFile.setThumbnail(source.getThumbnail());
        }
        devFile.setExtJson(JSONUtil.createObj().set("sharedFrom", sourceFileId).toString());
        this.save(devFile);
        return fileId;
    }

    /**
     * 统计与本条记录共用同一存储对象的其他未删除记录数
     *
     * @author yubaoshan
     * @date 2026/10/14 16:00
     */
    private long countOtherReferences(DevFile devFile) {
        if (StrUtil.isBlank(devFile.getFileKey())) {
            return 0;
        }
        QueryWrapper<DevFile> queryWrapper = new QueryWrapper<DevFile>().checkSqlInjection();
        queryWrapper.lambda().eq(DevFile::getEngine, devFile.getEngine())
                .eq(DevFile::getFileKey, devFile.getFileKey())
                .ne(DevFile::getId, devFile.getId());
        if (ObjectUtil.isNull(devFile.getBucket())) {
            queryWrapper.lambda().isNull(DevFile::getBucket);
        } else {
            queryWrapper.lambda().eq(DevFile::getBucket, devFile.getBucket());
        }
        return this.count(queryWrapper);
    }

    /**
     * 按目标边长抽样解码图片，内存只占缩小后的尺寸，没有对应解码器时返回null
     *
     * @author yubaoshan
     * @date 2026/10/14 15:00
     */
    private static BufferedImage readSubsampledImage(byte[] bytes, int targetSize) {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = ObjectUtil.isNull(input) ? null : ImageIO.getImageReaders(input);
            if (ObjectUtil.isNull(readers) || !readers.hasNext()) {
                return null;
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                // 抽样后短边仍保留目标边长的两倍以上，缩放后缩略图不糊
                int step = Math.max(1, Math.min(reader.getWidth(0), reader.getHeight(0)) / (targetSize * 2));
                ImageReadParam readParam = reader.getDefaultReadParam();
                readParam.setSourceSubsampling(step, step, 0, 0);
                return reader.read(0, readParam);
            } finally {
                reader.dispose();
            }
        } catch (IOException e) {
            throw new CommonException("解码图片失败：{}", e.getMessage());
        }
    }

    @Override
    public List<DevFile> checkInvalidImages(String bizType) {
        String normalizedBizType = normalizeBizType(bizType);
        List<DevFile> invalidFiles = new ArrayList<>();
        LambdaQueryWrapper<DevFile> queryWrapper = Wrappers.lambdaQuery();
        queryWrapper.eq(DevFile::getCategory, DevFileCategoryEnum.IMAGE.getValue())
                .eq(DevFile::getBizType, normalizedBizType)
                .orderByAsc(DevFile::getId);

        int pageNo = 1;
        int pageSize = 200;
        while (true) {
            Page<DevFile> page = this.page(new Page<>(pageNo, pageSize, false), queryWrapper);
            List<DevFile> records = page.getRecords();
            for (DevFile file : records) {
                if (StrUtil.hasBlank(file.getEngine(), file.getBucket(), file.getFileKey())) {
                    invalidFiles.add(file);
                    continue;
                }
                try {
                    if (getFileSize(file.getEngine(), file.getBucket(), file.getFileKey()) == null) {
                        invalidFiles.add(file);
                    }
                } catch (Exception e) {
                    // 网络/配置异常不能当成文件丢失，跳过并记日志，避免误删
                    log.warn("检测图片物理文件失败，id={}，原因={}", file.getId(), e.getMessage());
                }
            }
            if (records.size() < pageSize) break;
            pageNo++;
        }
        return invalidFiles;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int deleteInvalidImages(List<DevFileIdParam> devFileIdParamList) {
        if (CollUtil.isEmpty(devFileIdParamList)) {
            throw new CommonException("请选择要清理的文件");
        }
        List<String> ids = CollStreamUtil.toList(devFileIdParamList, DevFileIdParam::getId);
        List<DevFile> files = this.listByIds(ids);
        List<String> invalidIds = new ArrayList<>();
        for (DevFile file : files) {
            if (StrUtil.hasBlank(file.getEngine(), file.getBucket(), file.getFileKey())) {
                invalidIds.add(file.getId());
                continue;
            }
            try {
                // 复查一次，期间被恢复的文件不清理
                if (getFileSize(file.getEngine(), file.getBucket(), file.getFileKey()) == null) {
                    invalidIds.add(file.getId());
                }
            } catch (Exception e) {
                log.warn("复查图片物理文件失败，id={}，原因={}", file.getId(), e.getMessage());
            }
        }
        if (!invalidIds.isEmpty()) {
            this.removeByIds(invalidIds);
        }
        return invalidIds.size();
    }

    private String normalizeBizType(String bizType) {
        String value = StrUtil.blankToDefault(bizType, DevFileBizTypeEnum.USER.getValue()).toUpperCase();
        if (!DevFileBizTypeEnum.MATERIAL.getValue().equalsIgnoreCase(value)
                && !DevFileBizTypeEnum.USER.getValue().equalsIgnoreCase(value)) {
            throw new CommonException("不支持的库类型：{}", bizType);
        }
        return value;
    }

    @Override
    public Long getFileSize(String engine, String bucket, String fileKey) {
        DevFileEngineTypeEnum engineType = resolveEngineType(engine, bucket, fileKey);
        switch (engineType) {
            case LOCAL:
                return DevFileLocalUtil.getFileSize(bucket, fileKey);
            case ALIYUN:
                return DevFileAliyunUtil.getFileSize(bucket, fileKey);
            case TENCENT:
                return DevFileTencentUtil.getFileSize(bucket, fileKey);
            case MINIO:
                return DevFileMinIoUtil.getFileSize(bucket, fileKey);
            case RUSTFS:
                return DevFileRustFsUtil.getFileSize(bucket, fileKey);
            case FTP:
                return DevFileFtpUtil.getFileSize(bucket, fileKey);
            default:
                throw new CommonException("不支持的存储引擎：{}", engine);
        }
    }

    @Override
    public void writeFileToStream(String engine, String bucket, String fileKey, OutputStream outputStream) {
        DevFileEngineTypeEnum engineType = resolveEngineType(engine, bucket, fileKey);
        if (ObjectUtil.isNull(outputStream)) {
            throw new CommonException("待写入的输出流不能为空");
        }
        switch (engineType) {
            case LOCAL:
                DevFileLocalUtil.writeFileToStream(bucket, fileKey, outputStream);
                break;
            case ALIYUN:
                DevFileAliyunUtil.writeFileToStream(bucket, fileKey, outputStream);
                break;
            case TENCENT:
                DevFileTencentUtil.writeFileToStream(bucket, fileKey, outputStream);
                break;
            case MINIO:
                DevFileMinIoUtil.writeFileToStream(bucket, fileKey, outputStream);
                break;
            case RUSTFS:
                DevFileRustFsUtil.writeFileToStream(bucket, fileKey, outputStream);
                break;
            case FTP:
                DevFileFtpUtil.writeFileToStream(bucket, fileKey, outputStream);
                break;
            default:
                throw new CommonException("不支持的存储引擎：{}", engine);
        }
    }

    /**
     * 校验文件存储信息完整，并按引擎值忽略大小写匹配存储引擎枚举
     *
     * @author yubaoshan
     * @date 2026/10/13 23:50
     */
    private DevFileEngineTypeEnum resolveEngineType(String engine, String bucket, String fileKey) {
        if (StrUtil.isEmpty(engine) || StrUtil.isEmpty(bucket) || StrUtil.isEmpty(fileKey)) {
            throw new CommonException("文件存储信息不完整");
        }
        return Arrays.stream(DevFileEngineTypeEnum.values())
                .filter(item -> item.getValue().equalsIgnoreCase(engine))
                .findFirst()
                .orElseThrow(() -> new CommonException("不支持的存储引擎：{}", engine));
    }

    /**
     * 组装需鉴权下载的底座文件记录，字段口径与storageFile一致，不生成缩略图
     *
     * @author yubaoshan
     * @date 2026/10/13 14:00
     */
    private DevFile buildAuthDevFile(String fileId, String engine, String bucketName, String fileKey, String fileName,
                                     long size, String storageUrl, String backendUrl) {
        DevFile devFile = new DevFile();
        devFile.setId(fileId);
        devFile.setEngine(engine);
        devFile.setBucket(bucketName);
        devFile.setFileKey(fileKey);
        devFile.setName(fileName);
        String suffix = ObjectUtil.isNotEmpty(fileName) ? StrUtil.subAfter(fileName, StrUtil.DOT, true) : null;
        devFile.setSuffix(suffix);
        devFile.setCategory(DevFileCategoryEnum.inferBySuffix(suffix));
        devFile.setBizType(DevFileBizTypeEnum.USER.getValue());
        devFile.setSizeKb(Convert.toStr(NumberUtil.div(new BigDecimal(size), BigDecimal.valueOf(1024))
                .setScale(0, RoundingMode.HALF_UP)));
        devFile.setSizeInfo(FileUtil.readableFileSize(size));
        devFile.setObjName(ObjectUtil.isNotEmpty(suffix) ? fileId + StrUtil.DOT + suffix : null);
        devFile.setStoragePath(storageUrl);
        devFile.setDownloadPath(backendUrl + "/dev/file/authDownload?id=" + fileId + "&token=");
        devFile.setIsDownloadAuth(true);
        return devFile;
    }

    /**
     * 获取后端域名地址，未配置时报错
     *
     * @author yubaoshan
     * @date 2026/10/13 14:00
     */
    private String getBackendUrl() {
        String apiUrl = commonProperties.getBackendUrl();
        if (ObjectUtil.isEmpty(apiUrl)) {
            throw new CommonException("后端域名地址未正确配置：snowy.config.common.backend-url为空");
        }
        return apiUrl;
    }

    /**
     * 按文件名生成文件的key，格式与genFileKey一致，如 2021/10/11/1377109572375810050.docx
     *
     * @author yubaoshan
     * @date 2026/10/13 14:00
     */
    private String genFileKeyByName(String fileId, String fileName) {
        String fileObjectName = fileId + StrUtil.DOT + FileUtil.getSuffix(fileName);
        String dateFolderPath = DateUtil.thisYear() + StrUtil.SLASH +
                (DateUtil.thisMonth() + 1) + StrUtil.SLASH +
                DateUtil.thisDayOfMonth() + StrUtil.SLASH;
        return dateFolderPath + fileObjectName;
    }

    /**
     * 根据文件后缀判断是否图片
     *
     * @author xuyuxiang
     * @date 2020/7/6 15:31
     */
    private static boolean isPic(String fileSuffix) {
        fileSuffix = fileSuffix.toLowerCase();
        return ImgUtil.IMAGE_TYPE_GIF.equals(fileSuffix)
                || ImgUtil.IMAGE_TYPE_JPG.equals(fileSuffix)
                || ImgUtil.IMAGE_TYPE_JPEG.equals(fileSuffix)
                || ImgUtil.IMAGE_TYPE_BMP.equals(fileSuffix)
                || ImgUtil.IMAGE_TYPE_PNG.equals(fileSuffix)
                || "webp".equals(fileSuffix)
                || ImgUtil.IMAGE_TYPE_PSD.equals(fileSuffix);
    }

    @Override
    public String storageThumbnailToDisk(String fileId, String bucketName, String fileKey, String suffix, byte[] imageBytes) {
        // 缩略图统一落盘到本地存储（与文件中心LOCAL引擎同一目录规则），fileKey加固定后缀区分
        String thumbKey = fileKey + THUMBNAIL_KEY_SUFFIX;
        DevFileLocalUtil.storageFile(THUMBNAIL_LOCAL_BUCKET, thumbKey, imageBytes);
        String sign = generateDownloadSign(fileId);
        return getBackendUrl() + "/dev/file/thumbnail?id=" + fileId + "&sign=" + sign;
    }

    @Override
    public void thumbnail(String id, String sign, HttpServletResponse response) throws IOException {
        if (!verifyDownloadSign(id, sign)) {
            CommonResponseUtil.renderError(response, "缩略图链接无效，请使用正确的地址");
            return;
        }
        DevFile devFile;
        try {
            devFile = this.queryEntity(id);
        } catch (Exception e) {
            CommonResponseUtil.renderError(response, e.getMessage());
            return;
        }
        if (BooleanUtil.isTrue(devFile.getIsDownloadAuth())) {
            CommonResponseUtil.renderError(response, "该文件不允许公开访问缩略图");
            return;
        }
        String thumbKey = devFile.getFileKey() + THUMBNAIL_KEY_SUFFIX;
        response.setContentType("image/png");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Cache-Control", "public, max-age=86400");
        try {
            DevFileLocalUtil.writeFileToStream(THUMBNAIL_LOCAL_BUCKET, thumbKey, response.getOutputStream());
        } catch (Exception e) {
            log.error("读取缩略图失败，id：{}，原因：{}", id, e.getMessage());
            if (!response.isCommitted()) {
                CommonResponseUtil.renderError(response, "缩略图不存在");
            }
        }
    }

    /**
     * 生成文件下载签名
     *
     * @param fileId 文件ID
     * @return 签名字符串
     */
    private String generateDownloadSign(String fileId) {
        HMac hmac = SecureUtil.hmac(HmacAlgorithm.HmacSHA256, FILE_DOWNLOAD_SIGN_SECRET);
        String sign = hmac.digestHex(fileId);
        return cn.hutool.core.codec.Base64.encode(sign);
    }

    /**
     * 验证文件下载签名
     *
     * @param fileId 文件ID
     * @param sign 签名字符串
     * @return 是否有效
     */
    public boolean verifyDownloadSign(String fileId, String sign) {
        if (StrUtil.isEmpty(sign)) {
            return false;
        }
        try {
            String decoded = cn.hutool.core.codec.Base64.decodeStr(sign);
            HMac hmac = SecureUtil.hmac(HmacAlgorithm.HmacSHA256, FILE_DOWNLOAD_SIGN_SECRET);
            String expectedSign = hmac.digestHex(fileId);
            return expectedSign.equals(decoded);
        } catch (Exception e) {
            log.error("验证文件下载签名异常，fileId: {}", fileId, e);
            return false;
        }
    }

    /**
     * 验证文件后缀名
     *
     * @param file 上传的文件
     * @param allowedExtensions 允许的后缀列表（不含点号，如：jpg, png）
     */
    private void validateFileExtension(MultipartFile file, List<String> allowedExtensions) {
        if (file == null || file.isEmpty()) {
            throw new CommonException("上传文件不能为空");
        }

        String originalFileName = file.getOriginalFilename();
        if (StrUtil.isEmpty(originalFileName)) {
            throw new CommonException("文件名不能为空");
        }

        // 获取文件后缀（小写）
        String fileSuffix = FileUtil.getSuffix(originalFileName).toLowerCase();
        if (StrUtil.isEmpty(fileSuffix)) {
            throw new CommonException("文件必须有后缀名");
        }

        // 校验后缀是否在白名单中
        if (CollUtil.isEmpty(allowedExtensions) || !allowedExtensions.contains(fileSuffix)) {
            throw new CommonException("不允许上传该文件类型，仅支持：{}",
                CollUtil.isEmpty(allowedExtensions) ? "无" : String.join("、", allowedExtensions));
        }
    }
}
