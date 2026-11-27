import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ArticleItem,
  MessageItem,
  MessageReply,
  PhotoItem,
  SectionId,
  VideoItem,
} from '../../types/content';
import {
  articleFromPortal,
  categoriesForModule,
  categoryNameMap,
  graphicsToPhotos,
  messageFromPortal,
  portalApi,
  favoriteApi,
  resolveCategoryCode,
  replyFromPortal,
  videoFromPortal,
  type PortalCategory,
  type PortalMessage,
  type PortalVideo,
  type ReplyDraft,
} from '../../lib/api';
import { isSectionId, type ContentSection } from './constants';

/** 客户端视频每次随机推荐的批次大小，看完一批再拉下一批 */
const VIDEO_BATCH_SIZE = 5;

/** 后端随机视频按主键去重；excludeIds 用于排除当前已加载的视频 */
function uniqueVideoRows(rows: PortalVideo[], excludeIds: string[] = []): PortalVideo[] {
  const seen = new Set(excludeIds);
  return rows.filter((row) => {
    if (!row.id || seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

/**
 * 门户内容数据：按板块懒加载（进入板块才请求，已加载不再重复），
 * 分类接口全站只请求一次，分类失败时降级用内容自身携带的分类。
 */
export function usePortalData(
  currentUserName: string,
  initialSection: string,
  likeCounts: Record<string, number>
) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [replies, setReplies] = useState<MessageReply[]>([]);
  const [videoCategories, setVideoCategories] = useState<string[]>([]);
  /** 当前视频分类（提升到数据层，切换时按分类请求后端；用于跨板块保持一致） */
  const [videoCategory, setVideoCategory] = useState<string>('全部');
  const [articleCategories, setArticleCategories] = useState<string[]>([]);
  const [graphicCategories, setGraphicCategories] = useState<string[]>([]);
  /** 当前图文分类（提升到数据层，切换时按分类请求后端；侧栏刷新时沿用） */
  const [graphicCategory, setGraphicCategory] = useState<string>('全部');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  /** 与 videos 同步的 ref，供加载更多时同步取得已加载 ID */
  const videosRef = useRef<VideoItem[]>([]);
  useEffect(() => {
    videosRef.current = videos;
  }, [videos]);
  const [videoPageInfo, setVideoPageInfo] = useState({
    current: 1,
    total: 0,
    // 后端 total 偶尔不可靠，用「本次是否返回数据」作为是否继续加载的依据
    hasMore: false,
  });
  const [videoLoadingMore, setVideoLoadingMore] = useState(false);
  /** 加载更多失败后暂停自动触底，避免失败即重试形成请求风暴 */
  const [videoLoadMoreError, setVideoLoadMoreError] = useState<string | undefined>(undefined);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loadedSections, setLoadedSections] = useState<Partial<Record<SectionId, boolean>>>({});
  /** 同步已加载状态，避免切回板块时重新拉取并触发骨架屏卸载播放器 */
  const loadedSectionsRef = useRef<Partial<Record<SectionId, boolean>>>({});
  const [loadingMap, setLoadingMap] = useState<Partial<Record<SectionId, boolean>>>(() => ({
    // 仅为内置板块初始化 loading：自定义模块没有数据源，不应进入加载态
    ...(isSectionId(initialSection) ? { [initialSection]: true } : {}),
  }));
  const [errors, setErrors] = useState<Partial<Record<ContentSection, string>>>({});
  const categoriesPromiseRef = useRef<Promise<PortalCategory[]> | null>(null);
  /** 分类/刷新/加载更多共用：请求发出时记下 id，过期响应一律丢弃 */
  const videoCategoryRequestRef = useRef(0);
  const videoLoadingMoreRef = useRef(false);
  const graphicCategoryRequestRef = useRef(0);
  /** 与 loadingMap 同步的 ref，供 loadSection 内同步判断防重入 */
  const loadingMapRef = useRef<Partial<Record<SectionId, boolean>>>({});

  /** 喜欢数以后端统计为准：切换喜欢后同步覆盖已加载内容的展示值 */
  useEffect(() => {
    if (!Object.keys(likeCounts).length) return;
    setVideos((prev) =>
      prev.map((item) =>
        likeCounts[item.id] === undefined ? item : { ...item, likeCount: likeCounts[item.id] }
      )
    );
    setArticles((prev) =>
      prev.map((item) =>
        likeCounts[item.id] === undefined ? item : { ...item, likes: likeCounts[item.id] }
      )
    );
    setPhotos((prev) =>
      prev.map((item) =>
        likeCounts[item.id] === undefined ? item : { ...item, likeCount: likeCounts[item.id] }
      )
    );
  }, [likeCounts]);

  /** 分类接口默认复用缓存；force 时重新请求（手动刷新需要拿到最新分类） */
  const getCategories = useCallback((force = false) => {
    if (force) categoriesPromiseRef.current = null;
    if (!categoriesPromiseRef.current) {
      categoriesPromiseRef.current = portalApi.categories().catch((error: unknown) => {
        categoriesPromiseRef.current = null;
        throw error;
      });
    }
    return categoriesPromiseRef.current;
  }, []);

  /** 分类失败降级为空（内容自身分类兜底），内容失败返回 false 让调用方不要标记已加载 */
  const loadWithCategories = useCallback(
    async <T,>(
      section: ContentSection,
      fetchContent: () => Promise<T>,
      apply: (rows: Awaited<T>, names: Map<string, string>, categories: PortalCategory[]) => void,
      force = false
    ): Promise<boolean> => {
      const [categoryResult, contentResult] = await Promise.allSettled([
        getCategories(force),
        fetchContent(),
      ]);
      if (contentResult.status === 'rejected') {
        setErrors((prev) => ({
          ...prev,
          [section]: contentResult.reason?.message || '内容服务暂不可用',
        }));
        return false;
      }
      const categories = categoryResult.status === 'fulfilled' ? categoryResult.value : [];
      apply(contentResult.value, categoryNameMap(categories), categories);
      return true;
    },
    [getCategories]
  );

  const pickCategories = useCallback(
    (fromApi: string[], fromContent: (string | undefined)[]) =>
      fromApi.length
        ? fromApi
        : Array.from(new Set(fromContent.map((item) => (item || '').trim()).filter(Boolean))),
    []
  );

  /** 进入板块时加载数据；force=true 供「重新加载 / 刷新内容」强制重新请求 */
  const loadSection = useCallback(
    async (rawSection: string, force = false) => {
      // 自定义模块没有数据源，直接忽略
      if (!isSectionId(rawSection)) return;
      const section = rawSection;
      if (section === 'profile' || section === 'settings' || section === 'sites') return;
      // 已成功加载过的板块不再重复请求，避免切回视频时把常驻播放器卸载重建
      if (!force && loadedSectionsRef.current[section]) return;
      // 防重入：同一板块正在请求时直接返回，避免并发重复拉取
      if (loadingMapRef.current[section]) return;
      loadingMapRef.current[section] = true;
      setLoadingMap((prev) => ({ ...prev, [section]: true }));
      setErrors((prev) => ({ ...prev, [section]: undefined }));
      if (force) loadedSectionsRef.current[section] = false;
      let loaded = false;

      try {
        if (section === 'messages') {
          /* 留言与回复同表存储（单表递归）：parentId 为空为顶级留言，否则沿
             parentId 链向上追溯到顶级留言后分组展示；父级缺失的回复直接丢弃 */
          const rows = await portalApi.messages();
          const byId = new Map(rows.map((row) => [String(row.id), row]));
          const rootIdOf = (row: PortalMessage): string => {
            let current: PortalMessage | undefined = row;
            while (current?.parentId) {
              const parent = byId.get(current.parentId);
              if (!parent) return '';
              current = parent;
            }
            return String(current?.id ?? '');
          };
          setMessages(rows.filter((row) => !row.parentId).map(messageFromPortal));
          setReplies(
            rows
              .filter((row) => !!row.parentId)
              .filter((row) => rootIdOf(row))
              .map((row) => replyFromPortal(row, rootIdOf(row)))
          );
          loaded = true;
        } else if (section === 'videos') {
          // 刷新/重新进入使正在进行的加载更多失效，避免旧响应污染新列表
          ++videoCategoryRequestRef.current;
          videoLoadingMoreRef.current = false;
          setVideoLoadingMore(false);
          setVideoLoadMoreError(undefined);
          loaded = await loadWithCategories(
            section,
            () => portalApi.videoRecommend(videoCategory, VIDEO_BATCH_SIZE),
            (page, names, categories) => {
              const rows = uniqueVideoRows(page.records);
              const items = rows.map((row, i) => videoFromPortal(row, i, names));
              setVideos(items);
              setVideoPageInfo({
                current: page.current,
                total: page.total,
                hasMore: rows.length > 0 && rows.length < page.total,
              });
              setVideoCategories(
                pickCategories(categoriesForModule(categories, 'VIDEO'), items.map((item) => item.category))
              );
            },
            force
          );
        } else if (section === 'articles') {
          loaded = await loadWithCategories(
            section,
            portalApi.articles,
            (rows, names, categories) => {
              const items = rows.map((row, i) => articleFromPortal(row, i, names));
              setArticles(items);
              setArticleCategories(
                pickCategories(categoriesForModule(categories, 'ARTICLE'), items.map((item) => item.category))
              );
            },
            force
          );
        } else if (section === 'gallery') {
          const [graphics, favoriteCounts] = await Promise.all([
            portalApi.graphics(graphicCategory),
            favoriteApi.counts('IMAGE_TEXT').catch(() => ({})),
          ]);
          loaded = await loadWithCategories(
            section,
            () => Promise.resolve(graphics),
            (rows, names, categories) => {
              const items = graphicsToPhotos(rows, names, favoriteCounts);
              setPhotos(items);
              setGraphicCategories(
                pickCategories(categoriesForModule(categories, 'GRAPHIC'), items.map((item) => item.album))
              );
            },
            force
          );
        }
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          [section]: error instanceof Error ? error.message : '数据加载失败',
        }));
      } finally {
        loadingMapRef.current[section] = false;
        setLoadingMap((prev) => ({ ...prev, [section]: false }));
        if (loaded) {
          loadedSectionsRef.current[section] = true;
          setLoadedSections((prev) => ({ ...prev, [section]: true }));
        }
      }
    },
    [loadWithCategories, pickCategories, videoCategory, graphicCategory]
  );

  /** 切换视频分类：按分类重新请求后端，只替换视频列表，不重拉分类字典、不触发全屏骨架屏 */
  const loadVideosByCategory = useCallback(
    async (category: string) => {
      const requestId = ++videoCategoryRequestRef.current;
      videoLoadingMoreRef.current = false;
      setVideoLoadingMore(false);
      setVideoLoadMoreError(undefined);
      setVideoCategory(category);
      setVideoPageInfo({ current: 1, total: 0, hasMore: false });
      setErrors((prev) => ({ ...prev, videos: undefined }));
      try {
        const categories = categoriesPromiseRef.current
          ? await categoriesPromiseRef.current
          : [];
        const categoryCode = resolveCategoryCode(categories, category, 'VIDEO');
        const page = await portalApi.videoRecommend(categoryCode, VIDEO_BATCH_SIZE);
        if (requestId !== videoCategoryRequestRef.current) return;
        const names = categoryNameMap(categories);
        const rows = uniqueVideoRows(page.records);
        setVideos(rows.map((row, i) => videoFromPortal(row, i, names)));
        setVideoPageInfo({
          current: page.current,
          total: page.total,
          hasMore: rows.length > 0 && rows.length < page.total,
        });
      } catch (error) {
        if (requestId !== videoCategoryRequestRef.current) return;
        setErrors((prev) => ({
          ...prev,
          videos: error instanceof Error ? error.message : '分类加载失败',
        }));
      }
    },
    []
  );

  /** 视频列表继续观看下一批随机推荐：把已加载 ID 交给后端排除，避免重复 */
  const loadMoreVideos = useCallback(async () => {
    if (videoLoadingMoreRef.current) return;
    if (!videoPageInfo.hasMore) return;
    const requestId = videoCategoryRequestRef.current;
    videoLoadingMoreRef.current = true;
    setVideoLoadingMore(true);
    setVideoLoadMoreError(undefined);
    try {
      const categories = categoriesPromiseRef.current
        ? await categoriesPromiseRef.current
        : [];
      const categoryCode = resolveCategoryCode(categories, videoCategory, 'VIDEO');
      const loadedIds = videosRef.current.map((item) => item.id);
      const page = await portalApi.videoRecommend(categoryCode, VIDEO_BATCH_SIZE, loadedIds);
      if (requestId !== videoCategoryRequestRef.current) return;
      const names = categoryNameMap(categories);
      const rows = uniqueVideoRows(page.records, loadedIds);
      setVideos((prev) => [
        ...prev,
        ...rows.map((row, i) => videoFromPortal(row, prev.length + i, names)),
      ]);
      setVideoPageInfo({
        current: page.current,
        total: page.total,
        hasMore: rows.length > 0 && rows.length < page.total,
      });
    } catch (error) {
      if (requestId !== videoCategoryRequestRef.current) return;
      setVideoLoadMoreError(error instanceof Error ? error.message : '加载更多失败');
    } finally {
      // 分类切换/刷新时已提前重置，这里只处理仍属于当前批次的结果
      if (requestId === videoCategoryRequestRef.current) {
        videoLoadingMoreRef.current = false;
        setVideoLoadingMore(false);
      }
    }
  }, [videoCategory, videoPageInfo]);

  /** 切换图文分类：按分类重新请求后端，只替换图文列表，不重拉分类字典、不触发全屏骨架屏 */
  const loadGraphicsByCategory = useCallback(
    async (category: string) => {
      const requestId = ++graphicCategoryRequestRef.current;
      setGraphicCategory(category);
      setErrors((prev) => ({ ...prev, gallery: undefined }));
      try {
        const categories = categoriesPromiseRef.current
          ? await categoriesPromiseRef.current
          : [];
        const categoryCode = resolveCategoryCode(categories, category, 'GRAPHIC');
        const [rows, favoriteCounts] = await Promise.all([
          portalApi.graphics(categoryCode),
          favoriteApi.counts('IMAGE_TEXT').catch(() => ({})),
        ]);
        if (requestId !== graphicCategoryRequestRef.current) return;
        const names = categoryNameMap(categories);
        setPhotos(graphicsToPhotos(rows, names, favoriteCounts));
      } catch (error) {
        if (requestId !== graphicCategoryRequestRef.current) return;
        setErrors((prev) => ({
          ...prev,
          gallery: error instanceof Error ? error.message : '分类加载失败',
        }));
      }
    },
    []
  );

  const addMessage = useCallback(async (message: MessageItem) => {
    const realId = await portalApi.addMessage({
      userId: message.userId,
      content: message.content,
    });
    setMessages((prev) => [
      { ...message, id: realId, createdAt: new Date().toISOString(), status: 'APPROVED' },
      ...prev,
    ]);
  }, []);

  /** 提交回复：先乐观插到评论区，后端失败则回滚并向上抛错 */
  const addReply = useCallback(
    async (draft: ReplyDraft) => {
      const optimistic: MessageReply = {
        id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        messageId: draft.messageId,
        // 回复提交只带用户 ID，乐观列表先用当前登录用户昵称占位
        nickname: currentUserName,
        userId: draft.userId,
        content: draft.content,
        createdAt: new Date().toISOString(),
        replyToNickname: draft.replyToNickname,
      };
      setReplies((prev) => [...prev, optimistic]);
      try {
        const realId = await portalApi.addReply(draft);
        setReplies((prev) =>
          prev.map((item) => (item.id === optimistic.id ? { ...item, id: realId } : item))
        );
      } catch (err) {
        setReplies((prev) => prev.filter((item) => item.id !== optimistic.id));
        throw err;
      }
    },
    [currentUserName]
  );

  return {
    videos,
    articles,
    photos,
    messages,
    replies,
    videoCategories,
    videoCategory,
    loadVideosByCategory,
    videoPageInfo,
    videoLoadingMore,
    videoLoadMoreError,
    videoHasMore: videoPageInfo.hasMore,
    loadMoreVideos,
    articleCategories,
    graphicCategories,
    graphicCategory,
    loadGraphicsByCategory,
    loadedSections,
    loadingMap,
    errors,
    loadSection,
    addMessage,
    addReply,
  };
}
