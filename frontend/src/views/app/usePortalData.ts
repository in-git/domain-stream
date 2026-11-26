import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ArticleItem,
  MessageItem,
  MessageReply,
  PhotoItem,
  SectionId,
  VideoItem,
} from '../../data/content';
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
  type ReplyDraft,
} from '../../lib/api';
import { isSectionId, type ContentSection } from './constants';

/** 客户端视频分页大小，避免首页一次性拉全量 */
const VIDEO_PAGE_SIZE = 20;

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
  const [videoPageInfo, setVideoPageInfo] = useState({ current: 1, total: 0 });
  const [videoLoadingMore, setVideoLoadingMore] = useState(false);
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
  /** 分类快速切换时只应用最后一次请求结果 */
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
      if (section === 'profile' || section === 'settings') return;
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
        } else if (section === 'videos') {
          loaded = await loadWithCategories(
            section,
            () => portalApi.videoPage(videoCategory, 1, VIDEO_PAGE_SIZE),
            (page, names, categories) => {
              const items = page.records.map((row, i) => videoFromPortal(row, i, names));
              setVideos(items);
              setVideoPageInfo({ current: page.current, total: page.total });
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
        loaded = true;
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
      setVideoCategory(category);
      setVideoPageInfo({ current: 1, total: 0 });
      setErrors((prev) => ({ ...prev, videos: undefined }));
      try {
        const categories = categoriesPromiseRef.current
          ? await categoriesPromiseRef.current
          : [];
        const categoryCode = resolveCategoryCode(categories, category, 'VIDEO');
        const page = await portalApi.videoPage(categoryCode, 1, VIDEO_PAGE_SIZE);
        if (requestId !== videoCategoryRequestRef.current) return;
        const names = categoryNameMap(categories);
        setVideos(page.records.map((row, i) => videoFromPortal(row, i, names)));
        setVideoPageInfo({ current: page.current, total: page.total });
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

  /** 视频列表触底加载下一页，按当前分类追加，不重复拉全量 */
  const loadMoreVideos = useCallback(async () => {
    if (videoLoadingMoreRef.current) return;
    if (videoPageInfo.current * VIDEO_PAGE_SIZE >= videoPageInfo.total) return;
    videoLoadingMoreRef.current = true;
    setVideoLoadingMore(true);
    try {
      const categories = categoriesPromiseRef.current
        ? await categoriesPromiseRef.current
        : [];
      const categoryCode = resolveCategoryCode(categories, videoCategory, 'VIDEO');
      const nextCurrent = videoPageInfo.current + 1;
      const page = await portalApi.videoPage(categoryCode, nextCurrent, VIDEO_PAGE_SIZE);
      const names = categoryNameMap(categories);
      setVideos((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const appended = page.records
          .map((row, i) => videoFromPortal(row, prev.length + i, names))
          .filter((item) => !seen.has(item.id));
        return [...prev, ...appended];
      });
      setVideoPageInfo({ current: page.current, total: page.total });
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        videos: error instanceof Error ? error.message : '加载更多失败',
      }));
    } finally {
      videoLoadingMoreRef.current = false;
      setVideoLoadingMore(false);
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
    videoHasMore: videoPageInfo.current * VIDEO_PAGE_SIZE < videoPageInfo.total,
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
