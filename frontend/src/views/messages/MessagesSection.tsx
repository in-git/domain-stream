import type { MessageItem, MessageReply } from '../../data/content';
import type { ReplyDraft } from '../../lib/api';
import MessagesView from './MessagesView';
import { PortalError, SectionSkeleton } from '../../components/PortalStates';

interface MessagesSectionProps {
  messages: MessageItem[];
  replies: MessageReply[];
  likedIds: string[];
  searchQuery: string;
  isLoggedIn: boolean;
  currentUser: {
    name: string;
    userId?: string;
    email?: string;
    avatar?: string;
  };
  loading: boolean;
  error?: string;
  onRetry: () => void;
  onRequireLogin: () => void;
  onToggleLike: (id: string) => void;
  onAddMessage: (message: MessageItem) => void;
  onAddReply: (draft: ReplyDraft) => Promise<void>;
}

export function MessagesSection({
  messages,
  replies,
  likedIds,
  searchQuery,
  isLoggedIn,
  currentUser,
  loading,
  error,
  onRetry,
  onRequireLogin,
  onToggleLike,
  onAddMessage,
  onAddReply,
}: MessagesSectionProps) {
  return (
    <>
      {loading ? (
        <SectionSkeleton section="messages" />
      ) : error ? (
        <PortalError section="messages" message={error} onRetry={onRetry} />
      ) : (
        <MessagesView
          messages={messages}
          likedIds={new Set(likedIds)}
          searchQuery={searchQuery}
          isLoggedIn={isLoggedIn}
          currentUser={currentUser}
          onRequireLogin={onRequireLogin}
          onToggleLike={onToggleLike}
          onAddMessage={onAddMessage}
          replies={replies}
          onAddReply={onAddReply}
        />
      )}
    </>
  );
}
