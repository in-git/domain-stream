import type { PhotoItem } from '../../data/content';
import { GalleryView } from './GalleryView';
import { PortalEmpty, PortalError, SectionSkeleton } from '../../components/PortalStates';

interface GallerySectionProps {
  photos: PhotoItem[];
  categories: string[];
  savedIds: string[];
  likedIds: string[];
  searchQuery: string;
  loading: boolean;
  error?: string;
  onRetry: () => void;
  onToggleSave: (id: string) => void;
  onToggleLike: (id: string) => void;
}

export function GallerySection({
  photos,
  categories,
  savedIds,
  likedIds,
  searchQuery,
  loading,
  error,
  onRetry,
  onToggleSave,
  onToggleLike,
}: GallerySectionProps) {
  return (
    <>
      {loading ? (
        <SectionSkeleton section="gallery" />
      ) : error ? (
        <PortalError section="gallery" message={error} onRetry={onRetry} />
      ) : photos.length === 0 ? (
        <PortalEmpty section="gallery" onRetry={onRetry} />
      ) : (
        <GalleryView
          photos={photos}
          categories={categories}
          savedIds={savedIds}
          likedIds={likedIds}
          searchQuery={searchQuery}
          onToggleSave={onToggleSave}
          onToggleLike={onToggleLike}
        />
      )}
    </>
  );
}
