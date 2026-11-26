import type { ReactNode } from 'react';

interface ContentSectionProps {
  children: ReactNode;
  'aria-label'?: string;
  'aria-labelledby'?: string;
  className?: string;
}

/**
 * 文章 / 图文 / 留言等内容板块的通用外壳。
 * 内外边距由外层布局统一提供，组件本身不再做负边距补偿。
 */
export function ContentSection({
  children,
  className = '',
  ...ariaProps
}: ContentSectionProps) {
  return (
    <section {...ariaProps} className={`space-y-0 ${className}`}>
      {children}
    </section>
  );
}
