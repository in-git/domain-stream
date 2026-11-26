import type { ArticleItem } from '../../types/content';
import { ArticlesView } from './ArticlesView';
import { PortalEmpty, PortalError, SectionSkeleton } from '../../components/PortalStates';

interface ArticlesSectionProps {
  articles: ArticleItem[];
  categories: string[];
  savedIds: string[];
  likedIds: string[];
  searchQuery: string;
  loading: boolean;
  error?: string;
  onRetry: () => void;
  onRefresh?: () => void;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
  externalSelectedId?: string | null;
  onClearExternalSelection?: () => void;
}

export function ArticlesSection({
  articles,
  categories,
  savedIds,
  likedIds,
  searchQuery,
  loading,
  error,
  onRetry,
  onRefresh,
  onToggleSave,
  onToggleLike,
  externalSelectedId,
  onClearExternalSelection,
}: ArticlesSectionProps) {
  return (
    <>
      {loading ? (
        <SectionSkeleton section="articles" />
      ) : error ? (
        <PortalError section="articles" message={error} onRetry={onRetry} />
      ) : articles.length === 0 ? (
        <PortalEmpty section="articles" onRetry={onRetry} />
      ) : (
        <ArticlesView
          articles={articles}
          categories={categories}
          savedIds={savedIds}
          likedIds={likedIds}
          searchQuery={searchQuery}
          onToggleSave={onToggleSave}
          onToggleLike={onToggleLike}
          onReadArticle={() => {}}
          onRefresh={onRefresh}
          externalSelectedId={externalSelectedId}
          onClearExternalSelection={onClearExternalSelection}
        />
      )}
    </>
  );
}
