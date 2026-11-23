import type { ArticleItem, PhotoItem, UserProfile, VideoItem } from '../../data/content';
import { ProfileView, type UserBasicInfo } from './ProfileView';

interface ProfileSectionProps {
  isLoggedIn: boolean;
  accountEmail: string;
  profile: UserProfile;
  userInfo: UserBasicInfo;
  onLogout: () => void;
  onGoLogin: () => void;
  onGoRegister: () => void;
  onUpdateProfile: (profile: UserProfile) => void;
  videos: VideoItem[];
  articles: ArticleItem[];
  photos: PhotoItem[];
  savedIds: string[];
  onToggleSave: (id: string) => void;
  likedIds: string[];
  onToggleLike: (id: string) => void;
}

export function ProfileSection({
  isLoggedIn,
  accountEmail,
  profile,
  userInfo,
  onLogout,
  onGoLogin,
  onGoRegister,
  onUpdateProfile,
  videos,
  articles,
  photos,
  savedIds,
  onToggleSave,
  likedIds,
  onToggleLike,
}: ProfileSectionProps) {
  return (
    <ProfileView
      isLoggedIn={isLoggedIn}
      accountEmail={accountEmail}
      profile={profile}
      userInfo={userInfo}
      onGoLogin={onGoLogin}
      onGoRegister={onGoRegister}
      onLogout={onLogout}
      onUpdateProfile={onUpdateProfile}
      videos={videos}
      articles={articles}
      photos={photos}
      savedIds={savedIds}
      onToggleSave={onToggleSave}
      likedIds={likedIds}
      onToggleLike={onToggleLike}
    />
  );
}
