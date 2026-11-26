import { useCallback, useEffect, useMemo, useState } from 'react';
import { INITIAL_PROFILE, type UserProfile } from '../../types/content';
import type { UserBasicInfo } from '../profile/ProfileView';
import {
  authApi,
  cacheClientUser,
  getCachedClientUser,
  getSnowyToken,
  setSnowyToken,
  type SnowyClientUser,
} from '../../lib/snowyAuth';
import { currentRoute, navigate, subscribeRoute, type RouteInfo } from '../../lib/router';
import { likeApi } from '../../lib/api';
import {
  FAVORITES_KEY,
  LEGACY_FAVORITES_KEY,
  isFavoriteBuckets,
  type FavoriteBuckets,
} from './constants';
import { usePersistentState } from './usePersistentState';

/** 登录态、用户资料、收藏/点赞、主题、路由跳转等会话级状态与操作 */
export function useUserSession() {
  const [route, setRoute] = useState<RouteInfo>(() => currentRoute());
  // 打开登录弹窗前的页面，关闭弹窗时回到这里；直接访问 /login 时回到首页
  const [loginReturnPath, setLoginReturnPath] = useState('/');
  const [isDark, setIsDark] = usePersistentState<boolean>('lumina:dark', false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getSnowyToken());
  /** 退出登录二次确认弹窗开关 */
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(() => getCachedClientUser()?.id || '');
  const [accountEmail, setAccountEmail] = useState(() => {
    const cached = getCachedClientUser();
    return cached?.account || '';
  });
  const [userInfo, setUserInfo] = useState<UserBasicInfo>(() => {
    const cached = getCachedClientUser();
    return {
      email: cached?.email || '',
      phone: cached?.phone || '',
      gender: cached?.gender || '',
      birthday: cached?.birthday || '',
      latestLoginTime: cached?.latestLoginTime || '',
      latestLoginAddress: cached?.latestLoginAddress || '',
    };
  });
  // 换 key 以丢弃旧版本缓存里的示例资料（昵称、简介、常驻地区等静态描述）
  const [profile, setProfile] = usePersistentState<UserProfile>('lumina:profile:v2', INITIAL_PROFILE);

  /* 收藏按用户隔离存储：{ [userId]: 内容ID[] }，未登录时写入 guest 桶 */
  const [favoriteBuckets, setFavoriteBuckets] = usePersistentState<FavoriteBuckets>(
    FAVORITES_KEY,
    {},
    isFavoriteBuckets
  );
  const favoriteOwner = currentUserId || 'guest';
  const savedIds = useMemo(
    () => favoriteBuckets[favoriteOwner] ?? [],
    [favoriteBuckets, favoriteOwner]
  );
  const [storedLikedIds, setLikedIds] = usePersistentState<string[]>('lumina:liked', []);
  // 未登录不展示/不写入本地喜欢状态，避免旧游客数据被当成登录用户的喜欢
  const likedIds = useMemo(
    () => (isLoggedIn ? storedLikedIds : []),
    [isLoggedIn, storedLikedIds]
  );
  /** 喜欢数由后端 LIKE_COUNT 返回，切换后按 ID 覆盖本地展示值 */
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});

  const toggleIdInList = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string[]>>, id: string) => {
      setter((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    },
    []
  );

  /** 打开登录弹窗：记录来源页后切到 /login，由 App 在当前页面上层渲染弹窗 */
  const goLogin = useCallback(() => {
    setLoginReturnPath(window.location.pathname + window.location.search || '/');
    navigate('/login');
  }, []);

  /** 切换喜欢：未登录打开登录弹窗；已登录先乐观更新，再以服务端结果为准 */
  const toggleLike = useCallback(
    (id: string) => {
      if (!isLoggedIn) {
        goLogin();
        return;
      }
      toggleIdInList(setLikedIds, id);
      likeApi
        .toggle(id)
        .then((result) => {
          setLikedIds((prev) =>
            result.liked
              ? prev.includes(id) ? prev : [...prev, id]
              : prev.filter((item) => item !== id)
          );
          setLikeCounts((prev) => ({ ...prev, [id]: result.likeCount }));
        })
        .catch(() => {
          // 请求失败时回滚乐观状态，避免界面与数据库不一致
          toggleIdInList(setLikedIds, id);
        });
    },
    [goLogin, isLoggedIn, setLikedIds, toggleIdInList]
  );

  /** 关闭登录弹窗，回到打开前的页面 */
  const closeLogin = useCallback(() => {
    navigate(loginReturnPath, true);
  }, [loginReturnPath]);

  /** 切换收藏：未登录打开登录弹窗；已登录写入当前用户收藏桶 */
  const toggleFavorite = useCallback(
    (id: string) => {
      if (!isLoggedIn) {
        goLogin();
        return;
      }
      setFavoriteBuckets((prev) => {
        const owner = currentUserId || 'guest';
        const list = prev[owner] ?? [];
        const next = list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
        return { ...prev, [owner]: next };
      });
    },
    [currentUserId, goLogin, isLoggedIn, setFavoriteBuckets]
  );

  const applyUser = useCallback(
    (user: SnowyClientUser) => {
      setCurrentUserId(user.id || '');
      setAccountEmail(user.account || '');
      setUserInfo({
        email: user.email || '',
        phone: user.phone || '',
        gender: user.gender || '',
        birthday: user.birthday || '',
        latestLoginTime: user.latestLoginTime || '',
        latestLoginAddress: user.latestLoginAddress || '',
      });
      cacheClientUser(user);
      // 昵称是唯一对外展示名：不再回退到姓名或账号，避免把账户名当成昵称
      const displayNickname = user.nickname || user.name || '用户';
      setProfile((prev) => ({
        ...prev,
        name: displayNickname,
        handle: `@${displayNickname}`,
        bio: user.signature || '',
        avatar: user.avatar || prev.avatar,
      }));
      setIsLoggedIn(true);
      /* 未登录期间的收藏并入当前账号，避免登录后收藏“消失” */
      setFavoriteBuckets((prev) => {
        const guest = prev.guest ?? [];
        if (!user.id || !guest.length) return prev;
        return {
          ...prev,
          [user.id]: Array.from(new Set([...(prev[user.id] ?? []), ...guest])),
          guest: [],
        };
      });
    },
    [setFavoriteBuckets, setProfile]
  );

  /** 登录 / 三方回调成功后统一落地：保存 token → 拉用户信息 → 进入个人中心 */
  const handleAuthSuccess = useCallback(
    (token: string) => {
      setSnowyToken(token);
      setIsLoggedIn(true);
      authApi
        .getLoginUser(token)
        .then(applyUser)
        .catch(() => {
          // token 已保存，用户信息暂不可用时仍允许进入个人中心
        })
        .finally(() => navigate('/profile', true));
    },
    [applyUser]
  );

  useEffect(() => subscribeRoute(() => setRoute(currentRoute())), []);

  // 刷新页面时用已有 token 恢复登录态
  useEffect(() => {
    if (!getSnowyToken()) return undefined;
    let cancelled = false;
    authApi
      .getLoginUser()
      .then((user) => {
        if (!cancelled) applyUser(user);
      })
      .catch(() => {
        if (cancelled) return;
        setSnowyToken(null);
        setIsLoggedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, [applyUser]);

  /* 登录后以服务端喜欢记录为准；接口不可用时保留本地缓存，不影响浏览 */
  useEffect(() => {
    if (!isLoggedIn || !currentUserId) {
      setLikedIds([]);
      return undefined;
    }
    let cancelled = false;
    likeApi
      .mine()
      .then((ids) => {
        if (!cancelled) setLikedIds(ids);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentUserId, isLoggedIn, setLikedIds]);

  /* 旧版本把收藏存在全站共享的 lumina:saved，首次加载时并入 guest 桶后清理 */
  useEffect(() => {
    try {
      const legacy = window.localStorage.getItem(LEGACY_FAVORITES_KEY);
      if (!legacy) return;
      window.localStorage.removeItem(LEGACY_FAVORITES_KEY);
      const parsed: unknown = JSON.parse(legacy);
      if (!Array.isArray(parsed)) return;
      const ids = parsed.filter((item): item is string => typeof item === 'string');
      if (!ids.length) return;
      setFavoriteBuckets((prev) => ({
        ...prev,
        guest: Array.from(new Set([...(prev.guest ?? []), ...ids])),
      }));
    } catch {
      window.localStorage.removeItem(LEGACY_FAVORITES_KEY);
    }
  }, [setFavoriteBuckets]);

  /** 真正执行退出（供二次确认弹窗确认后调用） */
  const doLogout = useCallback(() => {
    void authApi.logout().finally(() => {
      setIsLoggedIn(false);
      setCurrentUserId('');
      setAccountEmail('');
      setUserInfo({});
      setProfile(INITIAL_PROFILE);
      setLikeCounts({});
      setLogoutConfirmOpen(false);
      navigate('/', true);
    });
  }, [setProfile]);

  /** 点击退出先弹出二次确认，不直接退出 */
  const handleLogout = useCallback(() => setLogoutConfirmOpen(true), []);

  const goRegister = useCallback(() => navigate('/register'), []);
  const goProfile = useCallback(() => {
    navigate('/profile');
    window.scrollTo({ top: 0 });
  }, []);
  const toggleTheme = useCallback(() => setIsDark((d) => !d), [setIsDark]);

  return {
    route,
    loginReturnPath,
    closeLogin,
    isDark,
    toggleTheme,
    isLoggedIn,
    currentUserId,
    accountEmail,
    userInfo,
    profile,
    setProfile,
    savedIds,
    toggleFavorite,
    likedIds,
    likeCounts,
    toggleLike,
    handleAuthSuccess,
    handleLogout,
    doLogout,
    logoutConfirmOpen,
    closeLogoutConfirm: () => setLogoutConfirmOpen(false),
    goLogin,
    goRegister,
    goProfile,
  };
}
