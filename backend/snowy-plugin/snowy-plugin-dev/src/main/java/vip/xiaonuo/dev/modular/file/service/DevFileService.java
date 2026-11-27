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
package vip.xiaonuo.dev.modular.file.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.multipart.MultipartFile;
import vip.xiaonuo.dev.modular.file.entity.DevFile;
import vip.xiaonuo.dev.modular.file.param.DevFileDownloadParam;
import vip.xiaonuo.dev.modular.file.param.DevFileIdParam;
import vip.xiaonuo.dev.modular.file.param.DevFileListParam;
import vip.xiaonuo.dev.modular.file.param.DevFilePageParam;
import vip.xiaonuo.dev.modular.file.param.DevFileUrlListParam;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.List;

/**
 * 文件Service接口
 *
 * @author xuyuxiang
 * @date 2022/2/23 18:27
 **/
public interface DevFileService extends IService<DevFile> {

    /**
     * MultipartFile文件上传，返回文件id
     *
     * @author xuyuxiang
     * @date 2022/4/22 15:53
     **/
    String uploadReturnId(String engine, MultipartFile file);

    /**
     * MultipartFile文件上传，返回文件id，并指定库类型
     *
     * @author yubaoshan
     * @date 2026/11/19 18:00
     **/
    String uploadReturnId(String engine, MultipartFile file, String bizType);

    /**
     * MultipartFile文件上传，返回文件id，并指定库类型与通用分类编码
     *
     * @author domain-stream
     * @date 2026/11/23
     **/
    String uploadReturnId(String engine, MultipartFile file, String bizType, String categoryCode);

    /**
     * MultipartFile文件上传，返回文件id（带后缀校验）
     *
     * @author xuyuxiang
     * @date 2025/6/26 15:53
     **/
    String uploadReturnIdWithValidation(String engine, MultipartFile file, List<String> allowedExtensions);

    /**
     * MultipartFile文件上传，返回文件Url
     *
     * @author xuyuxiang
     * @date 2022/4/22 15:53
     **/
    String uploadReturnUrl(String engine, MultipartFile file);

    /**
     * MultipartFile文件上传，返回文件Url，并指定库类型
     *
     * @author yubaoshan
     * @date 2026/11/19 18:00
     **/
    String uploadReturnUrl(String engine, MultipartFile file, String bizType);

    /**
     * MultipartFile文件上传，返回文件Url，并指定库类型与通用分类编码
     *
     * @param categoryCode 通用分类编码（BIZ_CATEGORY.CODE），可为空
     * @author domain-stream
     * @date 2026/11/20
     **/
    String uploadReturnUrl(String engine, MultipartFile file, String bizType, String categoryCode);

    /**
     * MultipartFile文件上传，返回文件Url（带后缀校验）
     *
     * @author xuyuxiang
     * @date 2025/6/26 15:53
     **/
    String uploadReturnUrlWithValidation(String engine, MultipartFile file, List<String> allowedExtensions);

    /**
     * 文件分页列表接口
     *
     * @author xuyuxiang
     * @date 2022/6/21 15:44
     **/
    Page<DevFile> page(DevFilePageParam devFilePageParam);

    /**
     * 文件列表接口
     *
     * @author xuyuxiang
     * @date 2022/6/21 15:44
     **/
    List<DevFile> list(DevFileListParam devFileListParam);

    /**
     * 下载文件
     *
     * @author xuyuxiang
     * @date 2022/6/21 15:44
     **/
    void download(DevFileDownloadParam devFileDownloadParam, HttpServletResponse response) throws IOException;


    /**
     * 授权下载文件
     *
     * @author xuyuxiang
     * @date 2022/6/21 15:44
     **/
    void authDownload(DevFileIdParam devFileIdParam, HttpServletResponse response) throws IOException;


    /**
     * 删除文件
     *
     * @author xuyuxiang
     * @date 2022/8/4 10:36
     **/
    void delete(List<DevFileIdParam> devFileIdParamList);

    /**
     * 物理删除文件
     *
     * @author xuyuxiang
     * @date 2022/8/4 10:36
     **/
    void deleteAbsolute(DevFileIdParam devFileIdParam);

    /**
     * 调整文件所属库类型（用户文件 / 素材库）
     *
     * @author yubaoshan
     * @date 2026/11/19 18:00
     **/
    void updateBizType(List<String> ids, String bizType);

    /**
     * 更新文件通用分类编码
     *
     * @author domain-stream
     * @date 2026/11/23
     **/
    void updateCategoryCode(List<String> ids, String categoryCode);

    /**
     * 获取文件详情
     *
     * @author xuyuxiang
     * @date 2022/4/24 21:18
     */
    DevFile detail(DevFileIdParam devFileIdParam);

    /**
     * 根据文件url集合获取文件集合
     *
     * @author yubaoshan
     * @date 2024/6/9 23:52
     **/
    List<DevFile> getFileListByUrlList(DevFileUrlListParam devFileUrlListParam);

    /**
     * 获取文件详情
     *
     * @author xuyuxiang
     * @date 2022/4/24 21:18
     */
    DevFile queryEntity(String id);

    /**
     * 根据文件ids获得文件列表
     *
     * @author yubaoshan
     * @date 2025/8/25 21:18
     */
    List<DevFile> getFileListByIds(List<String> ids);

    /**
     * 登记对象存储中已存在的对象为底座文件（只登记不上传），校验桶、对象存在与大小，返回文件id
     *
     * @author yubaoshan
     * @date 2026/10/13 14:00
     */
    String registerExistingFile(String engine, String bucket, String objectKey, String fileName, Long sizeBytes);

    /**
     * 按流存储文件（不整读进内存），下载需鉴权，返回文件id
     *
     * @author yubaoshan
     * @date 2026/10/13 14:00
     */
    String uploadStreamReturnId(String engine, InputStream inputStream, String fileName, Long size);

    /**
     * 为没有缩略图的图片文件补生成缩略图，非图片、已有缩略图或文件过大时跳过
     *
     * @author yubaoshan
     * @date 2026/10/14 15:00
     */
    void generateThumbnail(String fileId);

    /**
     * 把缩略图写入本地磁盘，返回可公开访问的缩略图URL（不再用数据库base64字段存储图片本体）
     *
     * @author wuwenlong
     * @date 2026/11/22
     */
    String storageThumbnailToDisk(String fileId, String bucketName, String fileKey, String suffix, byte[] imageBytes);

    /**
     * 公开输出缩略图到响应流
     *
     * @author wuwenlong
     * @date 2026/11/22
     */
    void thumbnail(String id, String sign, HttpServletResponse response) throws IOException;

    /**
     * 新建一条底座文件记录指向源记录的同一存储对象（名称用新的），源对象不在目标引擎或大小不符时返回null
     *
     * @author yubaoshan
     * @date 2026/10/14 16:00
     */
    String registerSharedFile(String sourceFileId, String targetEngine, String fileName, Long sizeBytes);

    /**
     * 根据存储引擎、桶名和文件键读取文件实际字节数，文件不存在返回null
     *
     * @author yubaoshan
     * @date 2026/10/13 23:50
     */
    Long getFileSize(String engine, String bucket, String fileKey);

    /**
     * 检测图片记录对应的物理文件是否仍然存在，返回失效记录。
     * 只检查指定库的 IMAGE 记录；存储信息不完整的记录也视为失效。
     *
     * @author domain-stream
     * @date 2026/11/25
     */
    List<DevFile> checkInvalidImages(String bizType);

    /**
     * 再次校验后删除已失效的图片记录（物理对象已不存在，不再调用存储删除）。
     * 返回实际删除数量。
     *
     * @author domain-stream
     * @date 2026/11/25
     */
    int deleteInvalidImages(List<DevFileIdParam> devFileIdParamList);

    /**
     * 根据存储引擎、桶名和文件键把文件边读边写入输出流（不整读进内存，不关闭输出流）
     *
     * @author yubaoshan
     * @date 2026/10/13 23:50
     */
    void writeFileToStream(String engine, String bucket, String fileKey, OutputStream outputStream);

    /**
     * 公开流式播放文件（支持 HTTP Range），供前台 video/audio 标签使用
     *
     * @author wuwenlong
     * @date  2026/11/19
     */
    void streamForPlay(String id, String sign, jakarta.servlet.http.HttpServletRequest request,
                       HttpServletResponse response) throws IOException;

    /**
     * 根据文件url集合批量删除文件记录
     *
     * @author domain-stream
     * @date 2026/11/27
     */
    default void deleteByUrls(List<String> urls) {
        if (urls == null || urls.isEmpty()) return;
        LambdaQueryWrapper<DevFile> wrapper = new LambdaQueryWrapper<>();
        wrapper.in(DevFile::getDownloadPath, urls);
        this.remove(wrapper);
    }
}
