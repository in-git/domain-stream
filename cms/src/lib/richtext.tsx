/** 富文本正文兼容层：旧正文为 Markdown，新正文由 AiEditor 产出 HTML。 */
import { renderMarkdownBlocks } from './markdown.tsx';

const HTML_TAG_RE = /<\/?[a-zA-Z][^>]*>/;

/** 粗略判断正文是否已是 HTML（Markdown 里出现的比较符不会命中标签规则） */
export function isHtmlContent(content: string): boolean {
  return HTML_TAG_RE.test(content);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 把旧版 Markdown 正文转成 HTML，供富文本编辑器初始化 */
export function markdownToHtml(markdown: string): string {
  if (!markdown.trim()) return '';
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  const closeList = () => {
    if (listType) {
      out.push(`</${listType}>`);
      listType = null;
    }
  };
  for (const raw of lines) {
    const text = raw.trim();
    if (!text) {
      closeList();
      continue;
    }
    if (/^-{3,}$/.test(text)) {
      closeList();
      out.push('<hr>');
      continue;
    }
    if (text.startsWith('### ')) {
      closeList();
      out.push(`<h3>${escapeHtml(text.slice(4))}</h3>`);
      continue;
    }
    if (text.startsWith('## ')) {
      closeList();
      out.push(`<h2>${escapeHtml(text.slice(3))}</h2>`);
      continue;
    }
    if (text.startsWith('# ')) {
      closeList();
      out.push(`<h1>${escapeHtml(text.slice(2))}</h1>`);
      continue;
    }
    if (text.startsWith('> ')) {
      closeList();
      out.push(`<blockquote><p>${escapeHtml(text.slice(2))}</p></blockquote>`);
      continue;
    }
    const listMatch = text.match(/^([-*+]|\d+\.)\s+(.*)$/);
    if (listMatch) {
      const want = /^\d+\./.test(listMatch[1]) ? 'ol' : 'ul';
      if (listType !== want) {
        closeList();
        out.push(`<${want}>`);
        listType = want;
      }
      out.push(`<li>${escapeHtml(listMatch[2])}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${escapeHtml(text)}</p>`);
  }
  closeList();
  return out.join('');
}

/** 取得编辑器初始内容：HTML 原样使用，Markdown 先转换 */
export function editorInitialContent(content: string): string {
  return isHtmlContent(content) ? content : markdownToHtml(content);
}

/** 从正文（HTML 或 Markdown）提取纯文本，用于字数、摘要、空内容校验 */
export function plainText(content: string): string {
  if (!content) return '';
  const stripped = isHtmlContent(content)
    ? content
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, ' ')
        .replace(/<[^>]*>/g, '')
    : content;
  return stripped
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'strike', 'mark', 'sub', 'sup',
  'blockquote', 'ul', 'ol', 'li', 'code', 'pre', 'a', 'img',
  'video', 'source',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'span', 'div',
]);
const ALLOWED_ATTRS = new Set([
  'href', 'src', 'alt', 'title', 'width', 'height', 'colspan', 'rowspan',
  'target', 'rel', 'class', 'style', 'id',
  'controls', 'poster', 'preload', 'playsinline', 'muted', 'loop', 'autoplay',
]);
const DROP_TAGS = new Set([
  'script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button',
  'svg', 'math', 'link', 'meta', 'audio',
]);

function cleanNode(node: Element) {
  for (const child of Array.from(node.children)) {
    const tag = child.tagName.toLowerCase();
    if (DROP_TAGS.has(tag)) {
      child.remove();
      continue;
    }
    cleanNode(child);
    if (!ALLOWED_TAGS.has(tag)) {
      child.replaceWith(...Array.from(child.childNodes));
      continue;
    }
    for (const attr of Array.from(child.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      const compact = value.replace(/[\s\u0000-\u001f]/g, '').toLowerCase();
      const dangerousScheme = /^(javascript|vbscript):/.test(compact);
      const dangerousData =
        compact.startsWith('data:') &&
        !(tag === 'img' && compact.startsWith('data:image/'));
      if (
        name.startsWith('on') ||
        dangerousScheme ||
        dangerousData ||
        (!ALLOWED_ATTRS.has(name) && !name.startsWith('data-'))
      ) {
        child.removeAttribute(attr.name);
      }
    }
    const style = child.getAttribute('style');
    if (style) {
      const cleaned = style.replace(
        /(expression|behavior|url\s*\(\s*['"]?\s*javascript:)[^;)]*/gi,
        ''
      );
      if (cleaned.trim()) child.setAttribute('style', cleaned);
      else child.removeAttribute('style');
    }
  }
}

/** 清洗 HTML，去掉脚本、事件属性与危险协议后再渲染 */
export function sanitizeRichHtml(html: string): string {
  if (typeof DOMParser === 'undefined') return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  cleanNode(doc.body);
  return doc.body.innerHTML;
}

/** 正文渲染：HTML 走富文本样式，旧 Markdown 走原轻量渲染 */
export function renderRichContent(content: string, compact = false) {
  if (!content.trim()) return null;
  if (!isHtmlContent(content)) return renderMarkdownBlocks(content, compact);
  const html = sanitizeRichHtml(content);
  if (!html) return null;
  return (
    <div
      className={`rich-content${compact ? ' rich-content--compact' : ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
