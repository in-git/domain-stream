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
package vip.xiaonuo.biz.modular.profile.service.impl;

import cn.hutool.core.util.StrUtil;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vip.xiaonuo.auth.core.pojo.SaBaseClientLoginUser;
import vip.xiaonuo.auth.core.util.StpClientLoginUserUtil;
import vip.xiaonuo.auth.core.util.StpClientUtil;
import vip.xiaonuo.biz.modular.profile.entity.BizUserProfile;
import vip.xiaonuo.biz.modular.profile.mapper.BizUserProfileMapper;
import vip.xiaonuo.biz.modular.profile.param.BizUserProfileUpdateParam;
import vip.xiaonuo.biz.modular.profile.service.BizUserProfileService;
import vip.xiaonuo.common.exception.CommonException;

/**
 * C端用户资料服务实现
 *
 * @author domain-stream
 * @date 2026/11/24
 **/
@Service
public class BizUserProfileServiceImpl implements BizUserProfileService {

    @Resource
    private BizUserProfileMapper bizUserProfileMapper;

    @Override
    public BizUserProfile getCurrent() {
        String userId = currentUserId();
        return bizUserProfileMapper.selectOne(
                new LambdaQueryWrapper<BizUserProfile>().eq(BizUserProfile::getId, userId));
    }

    @Transactional(rollbackFor = Exception.class)
    @Override
    public void update(BizUserProfileUpdateParam param) {
        String userId = currentUserId();

        LambdaUpdateWrapper<BizUserProfile> updateWrapper = new LambdaUpdateWrapper<BizUserProfile>()
                .eq(BizUserProfile::getId, userId);
        // 昵称同时写入 name 与 nickname：name 是平台姓名，nickname 是对外展示名，
        // 保持两者一致可避免任何回退逻辑显示到账号名。
        updateWrapper.set(BizUserProfile::getName, param.getNickname());
        updateWrapper.set(BizUserProfile::getNickname, param.getNickname());
        // 简介写入 signature 字段（前端以 bio 展示），允许传空串清空
        updateWrapper.set(BizUserProfile::getSignature, param.getBio() == null ? "" : param.getBio());
        bizUserProfileMapper.update(null, updateWrapper);

        refreshLoginUserCache(param.getNickname(), param.getBio());
    }

    /** 获取当前C端登录用户id，未登录直接抛出异常 */
    private String currentUserId() {
        Object loginId = StpClientUtil.getLoginIdDefaultNull();
        if (loginId == null) {
            throw new CommonException("请先登录后再操作");
        }
        return String.valueOf(loginId);
    }

    /**
     * 同步刷新C端登录会话中的用户昵称与简介。
     * 评论、留言等地方的昵称来自登录用户缓存，仅更新数据库会导致展示仍是旧值。
     */
    private void refreshLoginUserCache(String nickname, String bio) {
        SaBaseClientLoginUser cached = StpClientLoginUserUtil.getClientLoginUser();
        if (cached != null) {
            if (StrUtil.isNotBlank(nickname)) {
                cached.setName(nickname);
                cached.setNickname(nickname);
            }
            cached.setSignature(bio == null ? "" : bio);
            StpClientUtil.getTokenSession().set("loginUser", cached);
        }
    }
}
