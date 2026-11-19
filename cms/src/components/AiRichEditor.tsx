import { useEffect, useRef } from 'react';
import { AiEditor } from 'aieditor';
import 'aieditor/style.css';
import { snowyUpload } from '../lib/snowy.ts';
import { editorInitialContent } from '../lib/richtext.tsx';

interface AiRichEditorProps {
  /** 当前正文（HTML 或旧 Markdown），仅在初始化与外部重置时写入编辑器 */
  value: string;
  /** 内容变化时回传 HTML */
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
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
}: AiRichEditorProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorInstance | null>(null);
  const onChangeRef = useRef(onChange);
  // 记录编辑器自己产出的内容，避免外部 value 回写时重复 setContent 造成光标跳动
  const lastContentRef = useRef<string>('');
  onChangeRef.current = onChange;

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
        upload: async (file, context) => {
          const { url } = await snowyUpload(file, (percent) =>
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

    return () => {
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
      style={style ?? { height: 560 }}
    />
  );
}
