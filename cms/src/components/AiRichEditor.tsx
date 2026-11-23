import { useEffect, useRef } from 'react';
import { AiEditor } from 'aieditor';
import 'aieditor/style.css';
import { convertToWebp } from '../lib/api.ts';
import { snowyUpload } from '../lib/snowy.ts';
import { editorInitialContent } from '../lib/richtext.tsx';

type AiUploadType = 'image' | 'video' | 'audio' | 'attachment';

type AiUploadResult = {
  url: string;
  alt?: string;
  title?: string;
  poster?: string;
  name?: string;
  mimeType?: string;
  size?: number;
};

interface AiRichEditorProps {
  /** 当前正文（HTML 或旧 Markdown），仅在初始化与外部重置时写入编辑器 */
  value: string;
  /** 内容变化时回传 HTML */
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  /**
   * 自定义媒体上传策略，可区分图片与视频。
   * 传入后可实现「延迟上传」：插入时先返回本地 blob 预览地址，
   * 由调用方在保存表单时统一上传并替换地址。不传则直接上传文件服务。
   */
  uploadMedia?: (
    file: File,
    type: AiUploadType,
    onProgress?: (percent: number) => void
  ) => Promise<string | AiUploadResult>;
  /** 兼容旧调用方：仅接管图片上传 */
  uploadImage?: (file: File) => Promise<string>;
}

type EditorInstance = InstanceType<typeof AiEditor>;

/**
 * AiEditor 富文本包装组件。
 * AiEditor 基于 Web Component，内部 DOM 不参与 React 协调，因此按官方推荐用
 * useRef + useEffect 命令式挂载/销毁，并以 onChange + getHTML 与 React 通信。
 */
export function AiRichEditor({
  value,
  onChange,
  placeholder = '输入正文内容，支持标题、列表、图片、表格等富文本排版...',
  className,
  style,
  uploadMedia,
  uploadImage,
}: AiRichEditorProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorInstance | null>(null);
  const onChangeRef = useRef(onChange);
  const uploadMediaRef = useRef(uploadMedia);
  const uploadImageRef = useRef(uploadImage);
  // 记录编辑器自己产出的内容，避免外部 value 回写时重复 setContent 造成光标跳动
  const lastContentRef = useRef<string>('');
  onChangeRef.current = onChange;
  uploadMediaRef.current = uploadMedia;
  uploadImageRef.current = uploadImage;

  useEffect(() => {
    if (!mountRef.current) return;
    const initial = editorInitialContent(value);
    lastContentRef.current = initial;

    const editor = new AiEditor({
      element: mountRef.current,
      content: initial,
      placeholder,
      locale: 'zh-CN',
      theme: 'light',
      // 未接入大模型服务时关闭默认 AI 侧栏，避免挤占正文编辑区
      aiChat: false,
      uploader: {
        accept: { image: 'image/*', video: 'video/*' },
        upload: async (file, context) => {
          // 图片统一转 WebP（含粘贴、拖拽、工具栏选择）
          const mediaFile = file.type.startsWith('image/') ? await convertToWebp(file) : file;
          const custom = uploadMediaRef.current;
          if (custom) {
            const result = await custom(mediaFile, context.type as AiUploadType, context.onProgress);
            return result;
          }
          const customImage = uploadImageRef.current;
          // 兼容旧调用方：仅图片走延迟上传
          if (customImage) return customImage(mediaFile);
          const { url } = await snowyUpload(mediaFile, (percent) =>
            context.onProgress(percent)
          );
          return url;
        },
      },
      onUpdate: (instance) => {
        const html = instance.getHTML();
        lastContentRef.current = html;
        onChangeRef.current(html);
      },
    });
    editorRef.current = editor;

    const handlePaste = async (event: ClipboardEvent) => {
      const imageFiles = Array.from(event.clipboardData?.items ?? [])
        .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
        .map((item) => item.getAsFile())
        .filter((file): file is File => !!file);
      if (!imageFiles.length) return;

      // 阻止 AIEditor 默认把剪贴板图片写成 base64，统一走 WebP + 本地暂存/上传流程
      event.preventDefault();
      event.stopPropagation();

      try {
        for (const file of imageFiles) {
          const webpFile = await convertToWebp(file);
          const custom = uploadMediaRef.current;
          const result = custom
            ? await custom(webpFile, 'image')
            : (await snowyUpload(webpFile)).url;
          const src = typeof result === 'string' ? result : result.url;
          editor.editor
            .chain()
            .focus()
            .insertContent({ type: 'image', attrs: { src, alt: '粘贴图片' } })
            .run();
        }
      } catch (error) {
        console.error('粘贴图片处理失败', error);
      }
    };
    mountRef.current.addEventListener('paste', handlePaste, true);

    return () => {
      mountRef.current?.removeEventListener('paste', handlePaste, true);
      editor.destroy();
      editorRef.current = null;
    };
    // 编辑器只初始化一次；外部内容变化由下方 effect 处理
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    // 仅当外部确实改了内容（非编辑器自身回写）才重置
    if (value !== lastContentRef.current) {
      const next = editorInitialContent(value);
      lastContentRef.current = next;
      editor.setContent(next, false);
    }
  }, [value]);

  return (
    <div
      ref={mountRef}
      className={className}
      style={style ?? { height: '100%' }}
    />
  );
}
