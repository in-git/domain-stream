/**
 * 图文实时预览
 * ------------------------------------------------------------------
 * 按客户端「图文笔记」详情页的形式还原：顶部导航、作者行、
 * 3:4 图片横向轮播、标题 / 正文、底部互动栏。
 * 桌面预览时图片与内容左右分栏（与前端 NoteDetail 一致），
 * 平板 / 手机预览时上下堆叠。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Share2,
  Star,
} from 'lucide-react';
import { MediaImage } from '../../../components/MediaImage.tsx';
import type { PreviewDevice } from '../../../components/EditorWorkspace.tsx';
import type { ContentStatus } from '../../../types/cms.ts';

interface ImageTextPreviewProps {
  device: PreviewDevice;
  images: string[];
  title: string;
  body: string;
  category: string;
  status: ContentStatus;
  /** 作者昵称，缺省显示「编辑者」 */
  author?: string;
}

export function ImageTextPreview({
  device,
  images,
  title,
  body,
  category,
  status,
  author,
}: ImageTextPreviewProps) {
  const total = images.length;
  const [active, setActive] = useState(0);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  // 桌面预览才使用左右分栏，平板/手机保持上下堆叠
  const sideBySide = device === 'desktop';

  // 图片被删除后索引可能越界，回到第一张
  useEffect(() => {
    if (active > total - 1) setActive(0);
  }, [active, total]);

  // 缩略图轨道跟随当前图片横向滚动，图片再多也不会挤在一起
  useEffect(() => {
    thumbRefs.current[active]?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }, [active]);

  const goPrev = () => setActive((i) => (total ? (i - 1 + total) % total : 0));
  const goNext = () => setActive((i) => (total ? (i + 1) % total : 0));

  const authorName = author || '编辑者';
  const paragraphs = useMemo(
    () => (body || '暂无图文配文，客户端将不展示描述区域。').split('\n').filter(Boolean),
    [body]
  );

  return (
    <div className="min-h-full flex flex-col bg-white text-[#1D1D1F]">
      {/* 顶部导航：返回 + 作者 + 更多，贴近客户端详情页 */}
      <header className="sticky top-0 z-10 shrink-0 h-12 px-3 flex items-center gap-2 bg-white/92 backdrop-blur-xl border-b border-black/[0.06]">
        <button
          type="button"
          aria-label="返回"
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#1D1D1F] hover:bg-black/[0.04]"
        >
          <ChevronLeft className="w-[18px] h-[18px]" />
        </button>
        <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#FF2E4D] to-[#FF8A5B] flex items-center justify-center text-[11px] font-semibold text-white shrink-0">
          {authorName.slice(0, 1)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium truncate leading-tight">{authorName}</p>
          <p className="text-[10px] text-[#86868B] truncate leading-tight">
            {status === 'published' ? '已发布' : '草稿'} · 刚刚
          </p>
        </div>
        <button
          type="button"
          aria-label="更多"
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#1D1D1F] hover:bg-black/[0.04]"
        >
          <MoreHorizontal className="w-[18px] h-[18px]" />
        </button>
      </header>

      <div className={`flex-1 min-h-0 ${sideBySide ? 'flex items-stretch' : 'flex flex-col'}`}>
        {/* 图片区：严格保持 3:4，与后端生成的 1080×1440 一致；
            用 max-h 约束高度，避免容器被拉高后 object-cover 横向裁掉正文 */}
        <div
          className={`relative shrink-0 bg-[#F2F2F7] flex items-center justify-center ${
            sideBySide ? 'w-[50%]' : 'w-full'
          }`}
        >
          <div
            className={`relative w-full max-w-full overflow-hidden ${
              sideBySide
                ? 'aspect-[3/4] max-h-full'
                : 'aspect-[3/4]'
            }`}
            style={sideBySide ? { width: 'auto', height: '100%' } : undefined}
          >
            {total > 0 && (
              <div
                className="absolute inset-0 flex transition-transform duration-300 ease-out"
                style={{ transform: `translateX(-${active * 100}%)` }}
              >
                {images.map((url, idx) => (
                  <div key={`${url}-slide-${idx}`} className="w-full shrink-0 relative">
                    <MediaImage
                      src={url}
                      alt={`图文预览第 ${idx + 1} 张`}
                      fallbackLabel="暂无图片"
                      className="absolute inset-0 w-full h-full object-contain bg-[#F2F2F7]"
                    />
                  </div>
                ))}
              </div>
            )}

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="上一张"
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md text-white flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="下一张"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/35 hover:bg-black/55 backdrop-blur-md text-white flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute right-2.5 top-2.5 px-2 py-0.5 rounded-full bg-black/45 backdrop-blur-md text-[10px] font-medium text-white tabular-nums">
                  {active + 1}/{total}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent px-2 pb-2 pt-6">
                  <div
                    className="flex items-center gap-1.5 overflow-x-auto [&::-webkit-scrollbar]:hidden"
                    style={{ scrollbarWidth: 'none' }}
                  >
                    {images.map((url, idx) => (
                      <button
                        key={`${url}-thumb-${idx}`}
                        ref={(node) => { thumbRefs.current[idx] = node; }}
                        type="button"
                        onClick={() => setActive(idx)}
                        aria-label={`第 ${idx + 1} 张图片`}
                        aria-current={idx === active}
                        className={`relative h-10 w-8 shrink-0 overflow-hidden rounded-md ring-2 transition-all ${
                          idx === active
                            ? 'ring-white opacity-100'
                            : 'ring-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <MediaImage
                          src={url}
                          alt=""
                          fallbackLabel=""
                          className="w-full h-full object-cover bg-[#F2F2F7]"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {total === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-[12px] text-[#AEAEB2]">
                尚未添加图片
              </div>
            )}
          </div>
        </div>

        {/* 内容区：标题 + 正文 + 标签，长文可滚动 */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3.5">
            <h3
              className={`font-semibold leading-snug ${
                sideBySide ? 'text-[17px]' : 'text-[16px]'
              }`}
            >
              {title || '未命名图文'}
            </h3>

            <div className="mt-2 space-y-2">
              {paragraphs.map((line, index) => (
                <p
                  key={`para-${index}`}
                  // break-words 处理无空格长串，overflow-wrap:anywhere 兜底超长链接
                  className="text-[13px] leading-[1.85] text-[#3A3A3C] whitespace-pre-wrap break-words [overflow-wrap:anywhere] min-w-0"
                >
                  {line}
                </p>
              ))}
            </div>

            {category && (
              <p className="mt-3 text-[12px] text-[#0071E3]">#{category}</p>
            )}

            <p className="mt-3 text-[11px] text-[#AEAEB2]">刚刚 · 站点访客可见</p>
          </div>

          {/* 底部互动栏：与客户端一致的点赞 / 收藏 / 分享 */}
          <div className="shrink-0 h-12 px-2 flex items-center border-t border-black/[0.06] bg-white">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 px-1 text-[11px] text-[#86868B]">
                <Heart className="w-3.5 h-3.5" />
                <span className="tabular-nums">0</span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11px] text-[#6E6E73]">
                <Star className="w-3.5 h-3.5" />
                收藏
              </span>
              <span className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11px] text-[#6E6E73]">
                <MessageCircle className="w-3.5 h-3.5" />
                评论
              </span>
              <span className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-[11px] text-[#6E6E73]">
                <Share2 className="w-3.5 h-3.5" />
                分享
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImageTextPreview;
