import { useCallback, useEffect, useMemo, useState } from 'react';
import { INITIAL_PROFILE, type UserProfile } from '../data/content';
import type { UserBasicInfo } from './profile/ProfileView';
import {
  authApi,
  cacheClientUser,
  getCachedClientUser,
  getSnowyToken,
  setSnowyToken,
  type SnowyClientUser,
} from '../lib/snowyAuth';
import { currentRoute, navigate, subscribeRoute, type RouteInfo } from '../lib/router';
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
  const [isDark, setIsDark] = usePersistentState<boolean>('lumina:dark', false);
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!getSnowyToken());
  const [currentUserId, setCurrentUserId] = useState(() => getCachedClientUser()?.id || '');
  const [accountEmail, setAccountEmail] = useState(() => {
    const cached = getCachedClientUser();
    return cached?.account || cached?.email || '';
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
  const [likedIds, setLikedIds] = usePersistentState<string[]>('lumina:liked', []);

  const toggleIdInList = useCallback(
    (setter: React.Dispatch<React.SetStateAction<string[]>>, id: string) => {
      setter((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
    },
    []
  );

  const toggleLike = useCallback(
    (id: string) => toggleIdInList(setLikedIds, id),
    [setLikedIds, toggleIdInList]
  );

  /** 切换收藏：写入当前用户（未登录为 guest）对应的收藏桶 */
  const toggleFavorite = useCallback(
    (id: string) => {
      setFavoriteBuckets((prev) => {
        const owner = currentUserId || 'guest';
        const list = prev[owner] ?? [];
        const next = list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
        return { ...prev, [owner]: next };
      });
    },
    [currentUserId, setFavoriteBuckets]
  );

  const applyUser = useCallback(
    (user: SnowyClientUser) => {
      setCurrentUserId(user.id || '');
      setAccountEmail(user.account || user.email || '');
      setUserInfo({
        email: user.email || '',
        phone: user.phone || '',
        gender: user.gender || '',
        birthday: user.birthday || '',
        latestLoginTime: user.latestLoginTime || '',
        latestLoginAddress: user.latestLoginAddress || '',
      });
      cacheClientUser(user);
      setProfile((prev) => ({
        ...prev,
        name: user.nickname || user.name || user.account,
        handle: user.account ? `@${user.account}` : '',
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

  const handleLogout = useCallback(() => {
    void authApi.logout().finally(() => {
      setIsLoggedIn(false);
      setCurrentUserId('');
      setAccountEmail('');
      setUserInfo({});
      setProfile(INITIAL_PROFILE);
      navigate('/', true);
    });
  }, [setProfile]);

  const goLogin = useCallback(() => navigate('/login'), []);
  const goRegister = useCallback(() => navigate('/register'), []);
  const goProfile = useCallback(() => {
    navigate('/profile');
    window.scrollTo({ top: 0 });
  }, []);
  const toggleTheme = useCallback(() => setIsDark((d) => !d), [setIsDark]);

  return {
    route,
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
    toggleLike,
    handleAuthSuccess,
    handleLogout,
    goLogin,
    goRegister,
    goProfile,
  };
}
