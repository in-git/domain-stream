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
package vip.xiaonuo.dev.modular.file.controller;

import cn.hutool.core.io.FileUtil;
import cn.hutool.core.util.StrUtil;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vip.xiaonuo.common.annotation.CommonLog;
import vip.xiaonuo.common.exception.CommonException;
import vip.xiaonuo.common.pojo.CommonResult;
import vip.xiaonuo.dev.modular.file.enums.DevFileBizTypeEnum;
import vip.xiaonuo.dev.modular.file.service.DevFileService;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.RandomAccessFile;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 大文件分片上传控制器
 *
 * <p>流程：init（领取 uploadId）→ upload（逐片上传，可断点续传）→ complete（合并入库）。
 * 分片暂存于应用临时目录，合并后包装成 MultipartFile 走 DevFileService 现有入库逻辑，
 * 因此文件中心记录、下载地址签名、素材分类等与整文件上传完全一致。</p>
 *
 * @author domain-stream
 * @date 2026/11/21
 **/
@Tag(name = "分片上传控制器")
@RestController
@RequestMapping("/dev/file/chunk")
public class DevFileChunkController {

    /** 本地引擎标识，与 DevFileEngineTypeEnum.LOCAL 一致 */
    private static final String ENGINE_LOCAL = "LOCAL";

    /** 分片临时目录（系统临时目录下独立子目录） */
    private static final String TEMP_ROOT = System.getProperty("java.io.tmpdir") + File.separator + "domain-stream-chunks";

    @Resource
    private DevFileService devFileService;

    /** init 阶段记录的任务元数据（进程内），用于校验分片总数与文件名 */
    private final Map<String, ChunkTask> tasks = new java.util.concurrent.ConcurrentHashMap<>();

    /**
     * 初始化分片上传：由「文件名+大小+最后修改时间+库类型」生成稳定 fingerprint，
     * 同一文件重复上传返回同一 uploadId 并带回已上传分片，实现秒传/断点续传。
     */
    @Operation(summary = "初始化分片上传")
    @PostMapping("/init")
    public CommonResult<Map<String, Object>> init(
            @RequestParam String fileName,
            @RequestParam long fileSize,
            @RequestParam long lastModified,
            @RequestParam int totalChunks,
            @RequestParam(defaultValue = "USER") String bizType,
            @RequestParam(required = false) String categoryCode) {
        String safeName = StrUtil.isBlank(fileName) ? "file" : fileName;
        String fingerprint = UUID.nameUUIDFromBytes(
                (safeName + "|" + fileSize + "|" + lastModified + "|" + bizType).getBytes(java.nio.charset.StandardCharsets.UTF_8)
        ).toString();
        String uploadId = fingerprint;
        File dir = taskDir(uploadId);
        if (!dir.exists()) FileUtil.mkdir(dir);
        tasks.computeIfAbsent(uploadId, k -> new ChunkTask(safeName, fileSize, totalChunks, bizType, categoryCode));

        List<Integer> uploaded = new ArrayList<>();
        File[] parts = dir.listFiles((d, n) -> n.endsWith(".part"));
        if (parts != null) {
            for (File p : parts) {
                String n = p.getName().replace(".part", "");
                try {
                    uploaded.add(Integer.parseInt(n));
                } catch (NumberFormatException ignored) {
                }
            }
            uploaded.sort(Integer::compare);
        }
        Map<String, Object> result = new HashMap<>();
        result.put("uploadId", uploadId);
        result.put("uploaded", uploaded);
        return CommonResult.data(result);
    }

    /**
     * 上传单个分片。分片按 index 落盘为 {uploadId}/{index}.part，重复上传覆盖。
     */
    @Operation(summary = "上传分片")
    @PostMapping("/upload")
    public CommonResult<Boolean> upload(
            @RequestParam String uploadId,
            @RequestParam int index,
            @RequestParam("file") MultipartFile file) {
        ChunkTask task = tasks.get(uploadId);
        if (task == null) {
            throw new CommonException("分片任务不存在或已过期，请重新初始化上传");
        }
        if (index < 0 || index >= task.totalChunks) {
            throw new CommonException("分片序号越界");
        }
        File dir = taskDir(uploadId);
        if (!dir.exists()) FileUtil.mkdir(dir);
        File part = new File(dir, index + ".part");
        if (part.exists()) FileUtil.del(part);
        try (InputStream in = file.getInputStream()) {
            FileUtil.writeFromStream(in, part);
        } catch (IOException e) {
            throw new CommonException("分片写入失败：" + e.getMessage());
        }
        return CommonResult.data(true);
    }

    /**
     * 合并全部分片并入库，返回文件下载地址。合并完成后清理临时分片目录。
     */
    @Operation(summary = "合并分片并入库")
    @CommonLog("合并分片文件")
    @PostMapping("/complete")
    public CommonResult<String> complete(
            @RequestParam String uploadId,
            @RequestParam String fileName,
            @RequestParam int totalChunks,
            @RequestParam(defaultValue = "USER") String bizType,
            @RequestParam(required = false) String categoryCode) {
        ChunkTask task = tasks.get(uploadId);
        if (task == null) {
            throw new CommonException("分片任务不存在或已过期，请重新初始化上传");
        }
        File dir = taskDir(uploadId);
        File merged = new File(dir, "merged-" + fileName);
        try (RandomAccessFile out = new RandomAccessFile(merged, "rw")) {
            out.setLength(0);
            for (int i = 0; i < totalChunks; i++) {
                File part = new File(dir, i + ".part");
                if (!part.exists()) {
                    throw new CommonException("分片缺失，第 " + (i + 1) + " 片尚未上传");
                }
                try (InputStream in = Files.newInputStream(part.toPath())) {
                    byte[] buf = new byte[8192];
                    int len;
                    while ((len = in.read(buf)) > 0) {
                        out.write(buf, 0, len);
                    }
                }
            }
        } catch (IOException e) {
            throw new CommonException("分片合并失败：" + e.getMessage());
        }

        String url;
        try {
            MultipartFile wrapper = new MergedMultipartFile(merged, fileName);
            String normalizedBiz = DevFileBizTypeEnum.normalize(bizType);
            url = devFileService.uploadReturnUrl(ENGINE_LOCAL, wrapper, normalizedBiz, categoryCode);
        } finally {
            FileUtil.del(dir);
            tasks.remove(uploadId);
        }
        return CommonResult.data(url);
    }

    /** 取消/清理一个未完成的分片任务 */
    @Operation(summary = "取消分片上传")
    @PostMapping("/cancel")
    public CommonResult<Boolean> cancel(@RequestParam String uploadId) {
        FileUtil.del(taskDir(uploadId));
        tasks.remove(uploadId);
        return CommonResult.data(true);
    }

    private File taskDir(String uploadId) {
        // uploadId 由服务端生成（UUID），此处仍做白名单校验防止路径穿越
        String safe = uploadId.replaceAll("[^A-Za-z0-9_-]", "");
        return new File(TEMP_ROOT, safe);
    }

    /** init 阶段的任务元数据 */
    private static class ChunkTask {
        final String fileName;
        final long fileSize;
        final int totalChunks;
        final String bizType;
        final String categoryCode;

        ChunkTask(String fileName, long fileSize, int totalChunks, String bizType, String categoryCode) {
            this.fileName = fileName;
            this.fileSize = fileSize;
            this.totalChunks = totalChunks;
            this.bizType = bizType;
            this.categoryCode = categoryCode;
        }
    }

    /** 把合并后的本地文件包装成 MultipartFile，复用现有入库逻辑 */
    private static class MergedMultipartFile implements MultipartFile {
        private final File file;
        private final String originalName;

        MergedMultipartFile(File file, String originalName) {
            this.file = file;
            this.originalName = originalName;
        }

        @Override public String getName() { return "file"; }
        @Override public String getOriginalFilename() { return originalName; }
        @Override public String getContentType() {
            try {
                String type = Files.probeContentType(file.toPath());
                return type == null ? "application/octet-stream" : type;
            } catch (IOException e) {
                return "application/octet-stream";
            }
        }
        @Override public boolean isEmpty() { return file.length() == 0; }
        @Override public long getSize() { return file.length(); }
        @Override public byte[] getBytes() throws IOException { return Files.readAllBytes(file.toPath()); }
        @Override public InputStream getInputStream() throws IOException { return Files.newInputStream(file.toPath()); }
        @Override public void transferTo(File dest) throws IOException { FileUtil.copy(file, dest, true); }
    }
}
