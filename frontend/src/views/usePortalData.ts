import { useCallback, useRef, useState } from 'react';
import type {
  ArticleItem,
  MessageItem,
  MessageReply,
  PhotoItem,
  SectionId,
  VideoItem,
} from '../data/content';
import {
  articleFromPortal,
  categoriesForModule,
  categoryNameMap,
  graphicsToPhotos,
  messageFromPortal,
  portalApi,
  replyFromPortal,
  videoFromPortal,
  type PortalCategory,
  type PortalMessage,
  type ReplyDraft,
} from '../lib/api';
import { isSectionId, type ContentSection } from './constants';

/**
 * 门户内容数据：按板块懒加载（进入板块才请求，已加载不再重复），
 * 分类接口全站只请求一次，分类失败时降级用内容自身携带的分类。
 */
export function usePortalData(currentUserName: string, initialSection: string) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [replies, setReplies] = useState<MessageReply[]>([]);
  const [videoCategories, setVideoCategories] = useState<string[]>([]);
  const [articleCategories, setArticleCategories] = useState<string[]>([]);
  const [graphicCategories, setGraphicCategories] = useState<string[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loadedSections, setLoadedSections] = useState<Partial<Record<SectionId, boolean>>>({});
  const [loadingMap, setLoadingMap] = useState<Partial<Record<SectionId, boolean>>>(() => ({
    // 仅为内置板块初始化 loading：自定义模块没有数据源，不应进入加载态
    ...(isSectionId(initialSection) ? { [initialSection]: true } : {}),
  }));
  const [errors, setErrors] = useState<Partial<Record<ContentSection, string>>>({});
  const categoriesPromiseRef = useRef<Promise<PortalCategory[]> | null>(null);
  /** 与 loadingMap 同步的 ref，供 loadSection 内同步判断防重入 */
  const loadingMapRef = useRef<Partial<Record<SectionId, boolean>>>({});

  /** 分类接口全站只请求一次，失败时允许下次重试 */
  const getCategories = useCallback(() => {
    if (!categoriesPromiseRef.current) {
      categoriesPromiseRef.current = portalApi.categories().catch((error: unknown) => {
        categoriesPromiseRef.current = null;
        throw error;
      });
    }
    return categoriesPromiseRef.current;
  }, []);

  /** 分类失败降级为空（内容自身分类兜底），内容失败记录到该板块错误 */
  const loadWithCategories = useCallback(
    async <T,>(
      section: ContentSection,
      fetchContent: () => Promise<T>,
      apply: (rows: Awaited<T>, names: Map<string, string>, categories: PortalCategory[]) => void
    ) => {
      const [categoryResult, contentResult] = await Promise.allSettled([
        getCategories(),
        fetchContent(),
      ]);
      if (contentResult.status === 'rejected') {
        setErrors((prev) => ({
          ...prev,
          [section]: contentResult.reason?.message || '内容服务暂不可用',
        }));
        return;
      }
      const categories = categoryResult.status === 'fulfilled' ? categoryResult.value : [];
      apply(contentResult.value, categoryNameMap(categories), categories);
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

  /** 切换进入某板块时加载该板块数据；正在加载中的板块不会重复请求 */
  const loadSection = useCallback(
    async (rawSection: string) => {
      // 自定义模块没有数据源，直接忽略
      if (!isSectionId(rawSection)) return;
      const section = rawSection;
      if (section === 'profile') return;
      // 防重入：同一板块正在请求时直接返回，避免并发重复拉取
      if (loadingMapRef.current[section]) return;
      loadingMapRef.current[section] = true;
      setLoadingMap((prev) => ({ ...prev, [section]: true }));
      setErrors((prev) => ({ ...prev, [section]: undefined }));

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
          await loadWithCategories(section, portalApi.videos, (rows, names, categories) => {
            const items = rows.map((row, i) => videoFromPortal(row, i, names));
            setVideos(items);
            setVideoCategories(
              pickCategories(categoriesForModule(categories, 'VIDEO'), items.map((item) => item.category))
            );
          });
        } else if (section === 'articles') {
          await loadWithCategories(section, portalApi.articles, (rows, names, categories) => {
            const items = rows.map((row, i) => articleFromPortal(row, i, names));
            setArticles(items);
            setArticleCategories(
              pickCategories(categoriesForModule(categories, 'ARTICLE'), items.map((item) => item.category))
            );
          });
        } else if (section === 'gallery') {
          await loadWithCategories(section, portalApi.graphics, (rows, names, categories) => {
            const items = graphicsToPhotos(rows, names);
            setPhotos(items);
            setGraphicCategories(
              pickCategories(categoriesForModule(categories, 'GRAPHIC'), items.map((item) => item.album))
            );
          });
        }
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          [section]: error instanceof Error ? error.message : '数据加载失败',
        }));
      } finally {
        loadingMapRef.current[section] = false;
        setLoadingMap((prev) => ({ ...prev, [section]: false }));
        setLoadedSections((prev) => ({ ...prev, [section]: true }));
      }
    },
    [loadWithCategories, pickCategories]
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
    articleCategories,
    graphicCategories,
    loadedSections,
    loadingMap,
    errors,
    loadSection,
    addMessage,
    addReply,
  };
}
