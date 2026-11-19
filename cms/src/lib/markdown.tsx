/** 轻量 Markdown 渲染：供文章编辑预览与阅读页共用 */
export function renderMarkdownBlocks(markdown: string, compact = false) {
  const lines = markdown.split('\n');
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} className="h-3" />;
    if (trimmed.startsWith('### ')) {
      return (
        <h3
          key={idx}
          className={`font-semibold text-[#1D1D1F] mt-5 mb-2 ${
            compact ? 'text-[15px]' : 'text-[17px]'
          }`}
        >
          {trimmed.slice(4)}
        </h3>
      );
    }
    if (trimmed.startsWith('## ')) {
      return (
        <h2
          key={idx}
          className={`font-semibold text-[#1D1D1F] mt-6 mb-2.5 ${
            compact ? 'text-[17px]' : 'text-[20px]'
          }`}
        >
          {trimmed.slice(3)}
        </h2>
      );
    }
    if (trimmed.startsWith('> ')) {
      return (
        <blockquote
          key={idx}
          className={`my-3 px-4 py-3 rounded-xl bg-[#F5F5F7] text-[#424245] italic ${
            compact ? 'text-[13px]' : 'text-[14px]'
          }`}
        >
          {trimmed.slice(2)}
        </blockquote>
      );
    }
    if (trimmed.startsWith('- ')) {
      return (
        <li
          key={idx}
          className={`ml-5 list-disc text-[#1D1D1F] leading-relaxed my-1 ${
            compact ? 'text-[14px]' : 'text-[15px]'
          }`}
        >
          {trimmed.slice(2)}
        </li>
      );
    }
    if (trimmed === '---') {
      return <hr key={idx} className="my-5 border-[#E5E5EA]" />;
    }
    return (
      <p
        key={idx}
        className={`text-[#1D1D1F] leading-[1.75] my-1.5 ${
          compact ? 'text-[14px]' : 'text-[15px]'
        }`}
      >
        {trimmed}
      </p>
    );
  });
}
